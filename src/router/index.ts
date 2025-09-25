import { createRouter, createWebHistory } from 'vue-router'

const Welcome  = () => import('@/pages/WelcomePage.vue')
const Setup    = () => import('@/pages/FocusSetupPage.vue')
const Timer    = () => import('@/pages/FocusTimerPage.vue')
const Done     = () => import('@/pages/DonePage.vue')
const Wall     = () => import('@/pages/WallPage.vue')
const Chat     = () => import('@/pages/ChatPage.vue')
const Author   = () => import('@/pages/AuthorPage.vue')
const Login    = () => import('@/pages/LoginView.vue')
const NotFound = () => import('@/pages/NotFoundPage.vue')
const DevTools = () => import('@/views/DevToolsView.vue')

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',      name: 'welcome', component: Welcome },
    { path: '/setup', name: 'setup',   component: Setup   },
    { path: '/timer', name: 'timer',   component: Timer   },
    { path: '/done',  name: 'done',    component: Done    },
    { path: '/wall',  name: 'wall',    component: Wall    },
    { path: '/chat',  name: 'chat',    component: Chat    },
    { path: '/u/:uid', name: 'author', component: Author },
    { path: '/login', name: 'login',   component: Login   },
    ...(import.meta.env.DEV ? [{ path: '/dev', name: 'dev', component: DevTools }] : []),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }, 
  ],
})
