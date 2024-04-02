import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import TelosCloudPage from '../views/TelosCloudPage.vue'
import TelosCloudRedirectPage from '../views/TelosCloudRedirectPage.vue'


const routes: Array<RouteRecordRaw> = [
  {
    // el home redirige a la página principal telos-cloud
    path: '/',
    redirect: '/telos-cloud-redirect'
  },
  {
    path: '/telos-cloud-no-creation',
    name: 'telos-cloud-no-creation',
    component: TelosCloudPage
  },
  {
    path: '/telos-cloud-redirect',
    name: 'telos-cloud-redirect',
    component: TelosCloudRedirectPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
