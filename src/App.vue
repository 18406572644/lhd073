<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, NDialogProvider, NLoadingBarProvider } from 'naive-ui'
import { useHealthStore } from '@/stores/health'
import LoginPage from '@/components/LoginPage.vue'
import AppLayout from '@/components/AppLayout.vue'
import SharePreviewPage from '@/pages/SharePreviewPage.vue'
import BigScreenPage from '@/pages/BigScreenPage.vue'

const store = useHealthStore()
const route = useRoute()

const isSharePage = computed(() => route.name === 'share-preview')
const isStandalonePage = computed(() => route.meta?.standalone === true)

const themeOverrides = {
  common: {
    primaryColor: '#4A90D9',
    primaryColorHover: '#6AADE4',
    primaryColorPressed: '#2E6DB4',
    primaryColorSuppl: '#4A90D9',
  },
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NLoadingBarProvider>
          <SharePreviewPage v-if="isSharePage" />
          <BigScreenPage v-else-if="isStandalonePage && store.isAuthenticated" />
          <LoginPage v-else-if="!store.isAuthenticated" />
          <AppLayout v-else />
        </NLoadingBarProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  background: #F5F7FA;
}
</style>
