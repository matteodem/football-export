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

const getSumOfScore = flow(split('-'), ([home, away]) => {
  return {
    home,
    away,
    all: addNumbers([home, away]),
  }
})

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

  if (data && Object.keys((data || {})).length > 0) {
    store.commit('addFixtureStatistic', { id: fixtureId, data })
  }

  return data
}

const enhanceFixture = apiKey => async fixture => {
  const data = { ...fixture }

  if (fixture.status === 'Not Started') {
    return data
  }

  data.firstHalfGoals = data.score.halftime ? getSumOfScore(data.score.halftime) : null
  const fullTimeScore = fixture.score.fulltime ? getSumOfScore(fixture.score.fulltime) : null

  data.secondHalfGoals = null

  if (fullTimeScore && data.firstHalfGoals) {
    data.secondHalfGoals = {
      home: fullTimeScore.home - data.firstHalfGoals.home,
      away: fullTimeScore.away - data.firstHalfGoals.away,
      all: fullTimeScore.all - data.firstHalfGoals.all,
    }
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

      statisticData.yellowAndRedCards = {
        home: addNumbers([statistics['Yellow Cards'].home, statistics['Red Cards'].home]),
        away: addNumbers([statistics['Yellow Cards'].away, statistics['Red Cards'].away]),
      }

      statisticData.cornerKicks = statistics['Corner Kicks']
      statisticData.yellowCards = statistics['Yellow Cards']
      statisticData.redCards = statistics['Red Cards']

      return statisticData
    }

    return null
  })

  return {
    ...data,
    ...(statisticData || {}),
  }
}

const switchAwayAndHomeKeys = field => fixture => ({
  home: get(`${field}.away`)(fixture),
  away: get(`${field}.home`)(fixture),
})

const reverseFixture = fixture => {
  const { goalsHomeTeam, goalsAwayTeam } = fixture

  return Object.assign({}, fixture, {
    homeTeam: fixture.awayTeam,
    awayTeam: fixture.homeTeam,
    goalsHomeTeam: goalsAwayTeam,
    goalsAwayTeam: goalsHomeTeam,
    firstHalfGoals: switchAwayAndHomeKeys('firstHalfGoals')(fixture),
    secondHalfGoals: switchAwayAndHomeKeys('secondHalfGoals')(fixture),
    cornerKicks: switchAwayAndHomeKeys('cornerKicks')(fixture),
    yellowAndRedCards: switchAwayAndHomeKeys('yellowAndRedCards')(fixture),
  })
}

const reduceFixture = (fixtures, fixture) => {
  return [
    ...fixtures,
    fixture,
    reverseFixture(fixture)
  ]
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

  return reduce(reduceFixture)([])(enhancendFixtures)
}
