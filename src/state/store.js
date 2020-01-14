import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
})

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    apiKey: '',
    fixtureStatistics: {},
  },
  mutations: {
    setApiKey (state, key) {
      state.apiKey = key
    },
    addFixtureStatistic (state, { id, data }) {
      state.fixtureStatistics[id] = data
    },
  },
  plugins: [vuexLocal.plugin],
})
