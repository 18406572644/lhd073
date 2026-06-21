import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'
import ArchivesPage from '@/pages/ArchivesPage.vue'
import TrendsPage from '@/pages/TrendsPage.vue'
import SearchPage from '@/pages/SearchPage.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardPage,
  },
  {
    path: '/archives',
    name: 'archives',
    component: ArchivesPage,
  },
  {
    path: '/trends',
    name: 'trends',
    component: TrendsPage,
  },
  {
    path: '/search',
    name: 'search',
    component: SearchPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
