import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    apiKey: ''
  },
  mutations: {
    setApiKey (state, key) {
      state.apiKey = key
    }
  }
})
