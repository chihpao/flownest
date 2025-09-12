import { createRouter, createWebHistory } from 'vue-router'

const Welcome = () => import('@/pages/WelcomePage.vue')
const Setup   = () => import('@/pages/FocusSetupPage.vue')
const Timer   = () => import('@/pages/FocusTimerPage.vue')
const Done    = () => import('@/pages/DonePage.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Welcome },
    { path: '/setup', component: Setup },
    { path: '/timer', component: Timer },
    { path: '/done', component: Done },
  ],
})
export default router
