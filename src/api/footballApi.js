import { flow, split, toNumber, add, map, reduce, get, take } from 'lodash/fp'
import { store } from '../state/store'

const footballEndpoint = 'https://api-football-v1.p.rapidapi.com/v2'

const leagueIds = [
  656, // 2019 / 2020 - Belgium - Jupiler Pro League (1)
  754, // 2019 / 2020 - Germany - Bundesliga 1
  755, // 2019 / 2020 - Germany - Bundesliga 2
  581, // 2019 / 2020 - England - League One
  582, // 2019 / 2020 - England - League Two
  577, // 2019 / 2020 - Austria - League One
  891, // 2019 / 2020 - Italy - Serie A
  902, // 2019 / 2020 - Italy - Serie B
  766, // 2019 / 2020 - Portugal - League One
  576, // 2019 / 2020 - Switzerland - League One
  775, // 2019 / 2020 - Spain - League One
  1265, // 2019 / 2020 - Spain - League Two
]

const callEndpoint = apiKey => url => new Promise((resolve, reject) => {
  let isSuccessful = false
  const xhr = new XMLHttpRequest()

  xhr.withCredentials = true

  xhr.addEventListener('readystatechange', function () {
    if (this.readyState === this.DONE) {
      isSuccessful = true
      const text = this.responseText.trim()
      const response = JSON.parse(text || {})

      if (response.api) {
        resolve(response.api)
      } else {
        reject()
      }
    }
  })

  xhr.onerror = e => reject(e)

  xhr.open('GET', `${footballEndpoint}${url}`)

  xhr.setRequestHeader('x-rapidapi-host', 'api-football-v1.p.rapidapi.com')
  xhr.setRequestHeader('x-rapidapi-key', apiKey)
  xhr.send(null)

  setTimeout(() => {
    if (!isSuccessful) {
      xhr.abort()
      reject()
    }
  }, 3000)
})

const addNumbers = flow(map(toNumber), reduce(add)(0))

const getSumOfScore = flow(split('-'), addNumbers)

const getFirstFixtureStatistics = get('fixtures.0.statistics')

const getFixtureDataStatistics = apiKey => async fixtureId => {
  const storeData = store.state.fixtureStatistics[fixtureId]

  if (storeData) {
    return storeData
  }

  const result = await callEndpoint(apiKey)(`/fixtures/id/${fixtureId}`)
  const data = getFirstFixtureStatistics(result)

  await wait(250)

  console.log(fixtureId, data)
  store.commit('addFixtureStatistic', { id: fixtureId, data })

  return data
}

const wait = milliSeconds => new Promise(resolve => setTimeout(resolve, milliSeconds))

const enhanceFixture = apiKey => async fixture => {
  const data = { ...fixture }

  data.firstHalfGoals = data.score.halftime ? getSumOfScore(data.score.halftime) : 0
  data.secondHalfGoals = 0

  if (data.score.fulltime) {
    data.secondHalfGoals = getSumOfScore(fixture.score.fulltime) - data.firstHalfGoals
  }

  data.allGoals = data.firstHalfGoals + data.secondHalfGoals

  const statistics = await getFixtureDataStatistics(apiKey)(fixture.fixture_id)

  if (statistics) {
    const homeCorners = toNumber(statistics['Corner Kicks'].home)
    const awayCorners = toNumber(statistics['Corner Kicks'].away)

    data.allCorners = homeCorners + awayCorners

    data.allCards = addNumbers([
      statistics['Yellow Cards'].home,
      statistics['Yellow Cards'].away,
      statistics['Red Cards'].home,
      statistics['Red Cards'].away,
    ])
  }

  await wait(250)

  return data
}

export const getFootballData = progress => apiKey => async (leagueId) => {
  const callWithKey = callEndpoint(apiKey)

  const { fixtures } = await callWithKey(`/fixtures/league/${leagueId}`)

  let enhancendFixtures = []

  for (const [index, fixture] of fixtures.entries()) {
    progress.set((index + 1) / fixtures.length)
    enhancendFixtures = [
      ...enhancendFixtures,
      fixture,
      //await enhanceFixture(apiKey)(fixture)
    ]
  }

  return enhancendFixtures
}
