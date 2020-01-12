<template>
  <Layout>

    <div class="text-center">
      <h1 class="font-bold text-6xl text-green-500">Fussball Export</h1>

      <div class="mt-5 text-xl">
        <label for="key">
          API Key
          <input class="border mt-2 w-full" id="key" name="key" type="text" v-model="apiKey" placeholder=""/>
        </label>

        <div class="mt-5">
          <button class="bg-teal-500 focus:outline-none rounded hover:bg-teal-600 text-white p-2 px-5"
                  @click="downloadData">Exportieren</button>
        </div>

        <div v-if="isLoading" class="mt-5">
          <div class="lds-ripple"><div></div><div></div></div>
        </div>
        <div v-if="hasError" class="bg-red-500 text-white p-3 mt-5">
          Fehler beim Exportieren! (API Key überprüfen)
        </div>
      </div>

      <p class="mb-3 mt-10 italic text-gray-700">
        CSV Export von folgenden Ligen: <span class="font-bold">Belgien 1 Liga, Deutschland 1 Liga, Deutschland 2 Liga, England 1 Liga, England 2 Liga, Frankreich 1 Liga, Frankreich 2 Liga, Österreich 1 Liga, Italien 1 Liga, Italien 2 Liga, Portugal 1 Liga, Schweiz 1 Liga, Spanien 1 Liga, Spanien 2 Liga</span>
      </p>
    </div>


  </Layout>
</template>

<script>
  import { parse } from 'json2csv'
  import download from 'downloadjs'
  import { store } from '../state/store'

  export default {
    metaInfo: {
      title: 'Fusball Export'
    },
    data () {
      return {
        hasError: false,
        isLoading: false,
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
    },
    methods: {
      downloadData () {
        const componentScope = this
        this.hasError = false
        this.isLoading = true

        let isSuccessful = false

        const xhr = new XMLHttpRequest()

        xhr.withCredentials = true

        xhr.addEventListener('readystatechange', function () {
          if (this.readyState === this.DONE) {
            isSuccessful = true
            componentScope.isLoading = false

            if (this.responseText.trim()) {
              const data = JSON.parse(this.responseText).api.fixtures
              const csv = parse(data, {
                fields: ['league_id', 'round', 'venue']
              })
              download(csv, 'export.csv', 'text/csv')
            }
          }
        })

        xhr.onerror = e => console.log(e)

        xhr.open('GET', 'https://api-football-v1.p.rapidapi.com/v2/fixtures/league/2/Regular_Season_-_11')

        xhr.setRequestHeader('x-rapidapi-host', 'api-football-v1.p.rapidapi.com')

        xhr.setRequestHeader('x-rapidapi-key', this.apiKey.trim())

        xhr.send(null)

        setTimeout(() => {
          if (!isSuccessful) {
            xhr.abort()
            this.hasError = true
            this.isLoading = false
          }
        }, 3000)
      },
    }
  }
</script>

<style>
  .home-links a {
    margin-right: 1rem

  }
</style>
