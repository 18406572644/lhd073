<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NGrid,
  NGi,
  NButton,
  NIcon,
  NTag,
  NEmpty,
  NSpace,
  NSpin,
} from 'naive-ui'
import { Calendar, FolderOpen, AlertTriangle, Plus, TrendingUp, Search, FileDown } from 'lucide-vue-next'
import { useHealthStore } from '@/stores/health'
import { generatePdfArchive } from '@/utils/pdf'
import { useMessage } from 'naive-ui'

const router = useRouter()
const store = useHealthStore()
const message = useMessage()

const today = new Date()
const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

const latestDate = computed(() => store.latestRecord?.date || '暂无记录')
const totalYears = computed(() => store.totalYears)
const abnormalCount = computed(() => store.totalAbnormals)

const abnormals = computed(() => store.recentAbnormals.slice(0, 8))

const exporting = computed(() => false)
let pdfLoading = false

async function handleExportPdf() {
  if (pdfLoading) return
  pdfLoading = true
  try {
    await generatePdfArchive(store.records, store.indicators)
    message.success('PDF档案包已生成')
  } catch {
    message.error('PDF生成失败')
  }
  pdfLoading = false
}
</script>

<template>
  <div style="padding: 24px; min-height: 100%;">
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0;">健康概览</h1>
        <p style="margin: 6px 0 0; color: #8899aa; font-size: 14px;">{{ todayStr }}</p>
      </div>
      <NButton type="primary" @click="handleExportPdf" :loading="pdfLoading">
        <template #icon>
          <NIcon :size="18"><FileDown /></NIcon>
        </template>
        导出PDF档案包
      </NButton>
    </div>

    <NGrid :cols="3" :x-gap="16" :y-gap="16" style="margin-bottom: 24px;">
      <NGi>
        <NCard :bordered="false" hoverable style="border-top: 4px solid #4A90D9;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F4FD; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <NIcon :size="24" color="#4A90D9"><Calendar /></NIcon>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 13px; color: #8899aa; margin-bottom: 4px; white-space: nowrap;">最近体检</div>
              <div style="font-size: 20px; font-weight: 600; color: #1a1a2e; white-space: nowrap;">{{ latestDate }}</div>
            </div>
          </div>
        </NCard>
      </NGi>
      <NGi>
        <NCard :bordered="false" hoverable style="border-top: 4px solid #4A90D9;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F4FD; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <NIcon :size="24" color="#4A90D9"><FolderOpen /></NIcon>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 13px; color: #8899aa; margin-bottom: 4px; white-space: nowrap;">归档年份</div>
              <div style="font-size: 20px; font-weight: 600; color: #1a1a2e; white-space: nowrap;">{{ totalYears }}年</div>
            </div>
          </div>
        </NCard>
      </NGi>
      <NGi>
        <NCard :bordered="false" hoverable style="border-top: 4px solid #4A90D9;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #FEF0F0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <NIcon :size="24" color="#E74C3C"><AlertTriangle /></NIcon>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 13px; color: #8899aa; margin-bottom: 4px; white-space: nowrap;">异常指标</div>
              <div :style="{ fontSize: '20px', fontWeight: 600, color: abnormalCount > 0 ? '#E74C3C' : '#1a1a2e', whiteSpace: 'nowrap' }">{{ abnormalCount }}</div>
            </div>
          </div>
        </NCard>
      </NGi>
    </NGrid>

    <NCard :bordered="false" style="margin-bottom: 24px;">
      <template #header>
        <span style="font-weight: 600; color: #1a6fb5;">异常指标提醒</span>
      </template>
      <div v-if="abnormals.length > 0">
        <div
          v-for="(item, idx) in abnormals"
          :key="idx"
          style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer;"
          @click="router.push('/trends')"
        >
          <div style="width: 3px; height: 36px; background: #E74C3C; border-radius: 2px; margin-right: 12px; flex-shrink: 0;"></div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-weight: 600; color: #333;">{{ store.getIndicator(item.indicatorId)?.name || item.indicatorId }}</span>
              <NTag :type="item.direction === '偏高' ? 'error' : 'warning'" size="small">{{ item.direction }}</NTag>
              <span style="color: #999; font-size: 12px;">{{ item.record.date }}</span>
            </div>
            <div style="font-size: 13px; color: #666;">
              数值: {{ item.value }} {{ store.getIndicator(item.indicatorId)?.unit || '' }}
              <span v-if="item.note" style="margin-left: 8px; color: #4A90D9;">备注: {{ item.note }}</span>
            </div>
          </div>
        </div>
      </div>
      <NEmpty v-else description="所有指标正常" style="padding: 24px 0;">
        <template #icon>
          <span style="font-size: 24px; color: #67C23A;">✓</span>
        </template>
      </NEmpty>
    </NCard>

    <NCard :bordered="false">
      <template #header>
        <span style="font-weight: 600; color: #1a6fb5;">快捷操作</span>
      </template>
      <NSpace :size="16">
        <NButton type="primary" size="large" @click="router.push('/archives')">
          <template #icon>
            <NIcon :size="18"><Plus /></NIcon>
          </template>
          录入体检数据
        </NButton>
        <NButton type="primary" size="large" ghost @click="router.push('/trends')">
          <template #icon>
            <NIcon :size="18"><TrendingUp /></NIcon>
          </template>
          查看趋势图表
        </NButton>
        <NButton type="primary" size="large" ghost @click="router.push('/search')">
          <template #icon>
            <NIcon :size="18"><Search /></NIcon>
          </template>
          检索指标
        </NButton>
      </NSpace>
    </NCard>
  </div>
</template>
