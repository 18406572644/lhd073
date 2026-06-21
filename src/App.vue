<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { useHealthStore } from '@/stores/health'
import LoginPage from '@/components/LoginPage.vue'
import AppLayout from '@/components/AppLayout.vue'

const store = useHealthStore()

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
      <LoginPage v-if="!store.isAuthenticated" />
      <AppLayout v-else />
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
