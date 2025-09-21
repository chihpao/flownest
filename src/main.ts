import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from '@/router'
import { useAuth } from '@/stores/useAuth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

useAuth(pinia).init()

app.mount('#app')

