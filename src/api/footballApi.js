import { flow, split, toNumber, add, map, reduce, get } from 'lodash/fp'
import { store } from '../state/store'

const footballEndpoint = 'https://api-football-v1.p.rapidapi.com/v2'

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
  const result = await callEndpoint(apiKey)(`/fixtures/id/${fixtureId}`)
  const data = getFirstFixtureStatistics(result)

  await wait(100)

  return data
}

const wait = milliSeconds => new Promise(resolve => setTimeout(resolve, milliSeconds))

const getCachedStatisticData = fixtureId => async createCacheableData => {
  const storeData = store.state.fixtureStatistics[fixtureId]

  if (storeData) {
    return storeData
  }

  const data = await createCacheableData()

  store.commit('addFixtureStatistic', { id: fixtureId, data })

  return data
}

const enhanceFixture = apiKey => async fixture => {
  const data = { ...fixture }

  if (fixture.status === 'Not Started') {
    return data
  }

  data.firstHalfGoals = data.score.halftime ? getSumOfScore(data.score.halftime) : 0
  data.secondHalfGoals = 0

  if (data.score.fulltime) {
    data.secondHalfGoals = getSumOfScore(fixture.score.fulltime) - data.firstHalfGoals
  }

  data.allGoals = data.firstHalfGoals + data.secondHalfGoals

  const statisticData = await getCachedStatisticData(fixture.fixture_id)(async () => {
    const statistics = await getFixtureDataStatistics(apiKey)(fixture.fixture_id)

    if (statistics) {
      const statisticData = {}
      const homeCorners = toNumber(statistics['Corner Kicks'].home)
      const awayCorners = toNumber(statistics['Corner Kicks'].away)

      statisticData.allCorners = homeCorners + awayCorners

      statisticData.allCards = addNumbers([
        statistics['Yellow Cards'].home,
        statistics['Yellow Cards'].away,
        statistics['Red Cards'].home,
        statistics['Red Cards'].away,
      ])

      return statisticData
    }

    return null
  })

  return {
    ...data,
    ...(statisticData || {}),
  }
}

export const getFootballData = progress => apiKey => async (leagueId) => {
  const callWithKey = callEndpoint(apiKey)

  const { fixtures } = await callWithKey(`/fixtures/league/${leagueId}`)

  let enhancendFixtures = []

  for (const [index, fixture] of fixtures.entries()) {
    progress.set((index + 1) / fixtures.length)

    enhancendFixtures = [
      ...enhancendFixtures,
      await enhanceFixture(apiKey)(fixture),
    ]
  }

  return enhancendFixtures
}
