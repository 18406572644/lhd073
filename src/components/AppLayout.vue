<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NConfigProvider, NMenu, NIcon, NButton, NAvatar, lightTheme } from 'naive-ui'
import { LayoutDashboard, FolderOpen, TrendingUp, Search, LogOut, Plus, Scan, ShieldCheck, Dna, HeartPulse, FileText, Share2 } from 'lucide-vue-next'
import { useHealthStore } from '@/stores/health'

const router = useRouter()
const route = useRoute()
const store = useHealthStore()

const themeOverrides = {
  common: {
    primaryColor: '#4A90D9',
    primaryColorHover: '#6AADE4',
    primaryColorPressed: '#2E6DB4',
    primaryColorSuppl: '#4A90D9',
  },
  Menu: {
    itemTextColorActive: '#4A90D9',
    itemColorActive: '#E8F4FD',
    itemBorderRadius: '8px',
  },
}

const menuOptions = [
  {
    label: '仪表盘',
    key: '/',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(LayoutDashboard) }),
  },
  {
    label: '风险评估',
    key: '/risk',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(ShieldCheck) }),
  },
  {
    label: '家族健康画像',
    key: '/family',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(Dna) }),
  },
  {
    label: '生活方式记录',
    key: '/lifestyle',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(HeartPulse) }),
  },
  {
    label: 'OCR 智能识别',
    key: '/ocr',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(Scan) }),
  },
  {
    label: '体检档案',
    key: '/archives',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(FolderOpen) }),
  },
  {
    label: '指标趋势',
    key: '/trends',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(TrendingUp) }),
  },
  {
    label: '检索筛选',
    key: '/search',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(Search) }),
  },
  {
    label: '健康报告',
    key: '/report',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(FileText) }),
  },
  {
    label: '分享管理',
    key: '/share-management',
    icon: () => h(NIcon, { size: 20 }, { default: () => h(Share2) }),
  },
]

const activeKey = computed(() => route.path)

function handleMenuUpdate(key: string) {
  router.push(key)
}

function handleLogout() {
  store.isAuthenticated = false
  store.password = ''
}
</script>

<template>
  <NConfigProvider :theme="lightTheme" :theme-overrides="themeOverrides">
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <NIcon :size="28" color="#4A90D9">
              <Plus />
            </NIcon>
          </div>
          <span class="sidebar-title">体检档案</span>
        </div>
        <NMenu
          :value="activeKey"
          :options="menuOptions"
          @update:value="handleMenuUpdate"
          class="sidebar-menu"
        />
      </aside>
      <div class="main-area">
        <header class="top-bar">
          <span class="greeting">您好，欢迎使用体检报告管理系统</span>
          <NButton text @click="handleLogout" class="logout-btn">
            <template #icon>
              <NIcon :size="18"><LogOut /></NIcon>
            </template>
            退出登录
          </NButton>
        </header>
        <main class="content">
          <router-view />
        </main>
      </div>
    </div>
  </NConfigProvider>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: #F0F7FF;
  border-right: 1px solid #E8F4FD;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid #E8F4FD;
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #E8F4FD;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

.sidebar-menu {
  flex: 1;
  padding: 12px 8px;
}

.sidebar-menu :deep(.n-menu-item-content) {
  padding-left: 12px !important;
}

.sidebar-menu :deep(.n-menu-item-content--selected::before) {
  border-left: 3px solid #4A90D9;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F5F7FA;
}

.top-bar {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #E8F4FD;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.greeting {
  font-size: 14px;
  color: #5a6a7a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  color: #8899aa;
  font-size: 14px;
}

.logout-btn:hover {
  color: #4A90D9;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
