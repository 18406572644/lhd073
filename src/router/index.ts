import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'
import ArchivesPage from '@/pages/ArchivesPage.vue'
import TrendsPage from '@/pages/TrendsPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import OcrPage from '@/pages/OcrPage.vue'
import RiskAssessmentPage from '@/pages/RiskAssessmentPage.vue'
import FamilyHealthPage from '@/pages/FamilyHealthPage.vue'
import LifestylePage from '@/pages/LifestylePage.vue'
import ReportPage from '@/pages/ReportPage.vue'
import SharePreviewPage from '@/pages/SharePreviewPage.vue'
import ShareManagementPage from '@/pages/ShareManagementPage.vue'

const mainRoutes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardPage,
  },
  {
    path: '/risk',
    name: 'risk',
    component: RiskAssessmentPage,
  },
  {
    path: '/family',
    name: 'family',
    component: FamilyHealthPage,
  },
  {
    path: '/lifestyle',
    name: 'lifestyle',
    component: LifestylePage,
  },
  {
    path: '/ocr',
    name: 'ocr',
    component: OcrPage,
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
  {
    path: '/report',
    name: 'report',
    component: ReportPage,
  },
  {
    path: '/share-management',
    name: 'share-management',
    component: ShareManagementPage,
  },
]

const routes = [
  {
    path: '/share/:shareId',
    name: 'share-preview',
    component: SharePreviewPage,
    meta: { noAuth: true },
  },
  ...mainRoutes,
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
