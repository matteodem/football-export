import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import { isFunction } from 'lodash/fp'

let vuexLocalPlugin = null

if (process.isClient) {
  vuexLocalPlugin = new VuexPersistence({
    storage: global.localStorage,
  }).plugin
}

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
  plugins: ([vuexLocalPlugin]).filter(isFunction),
})
