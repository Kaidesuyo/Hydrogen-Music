import { createApp } from 'vue'
import App from './App.vue'
import router from './router/router.js'
import pinia from './store/pinia'
import { init } from './utils/initApp'
import lazy from './utils/lazy'
import './style.scss'
import 'normalize.css'
import './assets/css/common.css'
import './assets/css/fonts.css'
const app = createApp(App)
app.use(router)
app.use(pinia)
app.directive('lazy', lazy)
app.mount('#app')
init()