// examples/demo/src/router/index.ts
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/telos-cloud-local'
  },
  {
    path: '/telos-cloud-local',
    name: 'telos-cloud-local',
    component: () => import('@/views/local/TelosCloudPage.vue')
  },
  {
    path: '/telos-cloud-redirect',
    name: 'telos-cloud-redirect',
    component: () => import('@/views/redirect/TelosCloudPage.vue')
  },
  {
    path: '/telos-cloud-iframe',
    name: 'telos-cloud-iframe',
    component: () => import('@/views/iframe/TelosCloudPage.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/telos-cloud-local'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
