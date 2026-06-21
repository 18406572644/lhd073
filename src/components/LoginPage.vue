<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { hasPassword } from '@/utils/crypto'
import { useHealthStore } from '@/stores/health'
import { HeartPulse } from 'lucide-vue-next'

const store = useHealthStore()
const message = useMessage()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const isSetupMode = computed(() => !hasPassword())

const canSubmit = computed(() => {
  if (!password.value) return false
  if (isSetupMode.value && password.value !== confirmPassword.value) return false
  return true
})

async function handleSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  const ok = await store.login(password.value)
  loading.value = false
  if (!ok) {
    message.error('密码错误，请重试')
    password.value = ''
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-bg"></div>
    <NCard class="login-card" :bordered="false">
      <div class="login-header">
        <div class="login-icon">
          <NIcon :size="36" color="#4A90D9">
            <HeartPulse />
          </NIcon>
        </div>
        <h1 class="login-title">家庭体检报告归档</h1>
        <p class="login-subtitle">{{ isSetupMode ? '首次使用，请设置密码' : '请输入密码以解锁数据' }}</p>
      </div>

      <div class="login-form">
        <NInput
          v-model:value="password"
          type="password"
          :placeholder="isSetupMode ? '设置密码' : '输入密码'"
          size="large"
          @keyup.enter="handleSubmit"
        />
        <NInput
          v-if="isSetupMode"
          v-model:value="confirmPassword"
          type="password"
          placeholder="确认密码"
          size="large"
          @keyup.enter="handleSubmit"
        />
        <NButton
          type="primary"
          block
          size="large"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isSetupMode ? '设置密码并进入' : '解锁' }}
        </NButton>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #F0F7FF 0%, #E8F4FD 50%, #B3D9F2 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(74, 144, 217, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(74, 144, 217, 0.06) 0%, transparent 50%);
}

.login-card {
  width: 420px;
  max-width: 90vw;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(74, 144, 217, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8F4FD, #B3D9F2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #8899aa;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
