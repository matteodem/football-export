// This is the main.js file. Import global CSS and scripts here.
// The Client API can be used here. Learn more: gridsome.org/docs/client-api

import './styles/main.scss'
import 'tailwindcss/dist/tailwind.css'
import 'vue-select/dist/vue-select.css'
import DefaultLayout from '~/layouts/Default.vue'
import vSelect from 'vue-select'

export default function (Vue, { router, head, isClient }) {
  // Set default layout as a global component
  Vue.component('Layout', DefaultLayout)
  Vue.component('v-select', vSelect)
}
