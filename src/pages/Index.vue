<template>
  <Layout>

    <div class="text-center">
      <h1 class="font-bold text-6xl text-green-500">Fussball Export</h1>

      <div class="mt-5 text-xl">
        <label for="key">
          API Key
          <input class="border mt-2 w-full" id="key" name="key" type="text" v-model="apiKey" placeholder=""/>
        </label>

        <div class="mt-3">
          <label>
            Football League
            <v-select :options="leagueOptions" v-model="selectedLeague"></v-select>
          </label>
        </div>

        <div class="mt-5" v-if="selectedLeague.code && apiKey">
          <button class="bg-teal-500 focus:outline-none rounded hover:bg-teal-600 text-white p-2 px-5"
                  @click="!isLoading && downloadData()">Exportieren
          </button>
        </div>

        <div v-if="isLoading" class="mt-5">
          <div class="h-1 bg-green-400 my-5" style="transition: 1s width; border-radius: 2px" :style="`width: ${progressPercentage}%`"></div>
          <div class="my-4 font-bold text-green-500" v-text="`${progressPercentage}%`"></div>
          <div class="lds-ripple">
            <div></div>
            <div></div>
          </div>
        </div>
        <div v-if="hasError" class="bg-red-500 text-white p-3 mt-5">
          Fehler beim Exportieren! (API Key überprüfen)
        </div>
      </div>

      <a href="https://www.api-football.com/coverage" class="block mb-3 mt-10 italic text-gray-700">
        CSV Export von 400+ Ligen & Cups.
      </a>
    </div>

  </Layout>
</template>

<script>
  import download from 'downloadjs'
  import { parse } from 'json2csv'
  import { store } from '../state/store'
  import { leagues } from '../api/leagues.json'
  import { getFootballData } from '../api/footballApi'
  import { createProgress } from '../api/footballProgress'

  const leagueOptionData = leagues
    .sort((a, b) => (b.season - a.season))
    .map(league => ({
      code: league.league_id,
      label: `${league.season} - ${league.country} - ${league.name} (${league.league_id})`,
    }))

  export default {
    metaInfo: {
      title: 'Fusball Export'
    },
    data () {
      return {
        progress: 0,
        hasError: false,
        isLoading: false,
        selectedLeague: '',
      }
    },
    computed: {
      apiKey: {
        get () {
          return store.state.apiKey
        },
        set (newValue) {
          return store.commit('setApiKey', newValue)
        }
      },
      progressPercentage () {
        return Math.round(this.progress * 100, 10)
      },
      leagueOptions () {
        return leagueOptionData
      }
    },
    methods: {
      downloadData () {
        this.hasError = false
        this.isLoading = true

        /*
           Liga
           Heimmanschaft
           Gastmanschaft
           Gesamtes Spiel Tore
           Erste Halbzeit Tore
           Zweite Halbzeit Tore
           Gesamtes Spiel Ecken
           Erste Halbzeit Ecken
           Zweite Halbzeit Ecken
           Gesamtes Spiel Karten
           Erste Halbzeit Karten
           Zweite Halbzeit Karten
         */
        this.progress = 0
        const progress = createProgress()

        const handle = setInterval(() => {
          this.progress = progress.get()
        }, 50)

        getFootballData(progress)(this.apiKey.trim())(this.selectedLeague.code)
          .then(fixtures => {
            this.isLoading = false
            this.progress = 0

            clearInterval(handle)

            if (fixtures) {
              const csv = parse(fixtures, {
                fields: [
                  { value: 'fixture_id', label: 'ID' },
                  { value: 'league.name', label: 'Liga' },
                  { value: 'homeTeam.team_name', label: 'Heimmannschaft' },
                  { value: 'awayTeam.team_name', label: 'Gastmannschaft' },

                  { value: 'goalsHomeTeam', label: 'Gesamtes Spiel Heim Tore' },
                  { value: 'goalsAwayTeam', label: 'Gesamtes Spiel Auswärts Tore' },
                  { value: 'firstHalfGoals.home', label: 'Erste Halbzeit Heim Tore' },
                  { value: 'firstHalfGoals.away', label: 'Erste Halbzeit Auswärts Tore' },
                  { value: 'secondHalfGoals.home', label: 'Zweite Halbzeit Heim Tore' },
                  { value: 'secondHalfGoals.away', label: 'Zweite Halbzeit Auswärts Tore' },

                  { value: 'cornerKicks.home', label: 'Heim Ecken' },
                  { value: 'cornerKicks.away', label: 'Gast Ecken' },
                  { value: 'yellowAndRedCards.home', label: 'Heim Karten' },
                  { value: 'yellowAndRedCards.away', label: 'Gast Karten' },
                ]
              })
              download(csv, `export_${(new Date()).toISOString().replace('.','_')}.csv`, 'text/csv')
            }
          })
          .catch((e) => {
            console.log(e)
            this.hasError = true
            this.isLoading = false
          })
      },
    }
  }
</script>

<style>
  .home-links a {
    margin-right: 1rem

  }
</style>
