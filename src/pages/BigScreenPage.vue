<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart, LineChart, HeatmapChart, GaugeChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  RadarComponent,
} from 'echarts/components'
import { useHealthStore } from '@/stores/health'
import { useFamilyStore } from '@/stores/family'
import { useLifestyleStore } from '@/stores/lifestyle'
import { DISEASE_LABELS, RELATION_LABELS, type DiseaseType } from '@/types'

use([
  CanvasRenderer,
  RadarChart,
  LineChart,
  HeatmapChart,
  GaugeChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent,
  RadarComponent,
])

const router = useRouter()
const healthStore = useHealthStore()
const familyStore = useFamilyStore()
const lifestyleStore = useLifestyleStore()

const currentView = ref(0)
const autoPlay = ref(true)
const autoPlayInterval = ref(15000)
let timer: ReturnType<typeof setInterval> | null = null

const views = [
  { key: 'overview', label: '全景总览' },
  { key: 'radar', label: '健康雷达' },
  { key: 'trend', label: '指标趋势' },
  { key: 'heatmap', label: '风险热力图' },
  { key: 'compliance', label: '达标率' },
]

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

const currentTime = computed(() => {
  const d = now.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const familyHealthScore = computed(() => {
  if (!familyStore.portrait) return 85
  return familyStore.portrait.healthScore
})

const overallRiskLevel = computed(() => {
  if (!familyStore.portrait) return 'low'
  return familyStore.portrait.overallLevel
})

const radarDimensions = ['心血管', '代谢系统', '肝功能', '肾功能', '内分泌', '骨骼肌肉']

function getMemberHealthVector(member: { diseases: { diseaseType: DiseaseType; severity: string }[] }) {
  const sevMap: Record<string, number> = { mild: 30, moderate: 55, severe: 80 }
  const dimMap: Record<string, number[]> = {
    cardiovascular: [0], metabolic: [1], fatty_liver: [2], kidney_disease: [3],
    diabetes: [1], hyperlipidemia: [1], hypertension: [0], stroke: [0],
    gout: [5], thyroid_disease: [4], cancer: [4],
  }
  const scores = [100, 100, 100, 100, 100, 100]
  for (const d of member.diseases) {
    const dims = dimMap[d.diseaseType]
    const penalty = sevMap[d.severity] ?? 30
    if (dims) {
      for (const dim of dims) {
        scores[dim] = Math.max(10, scores[dim] - penalty)
      }
    }
  }
  return scores
}

const radarOption = computed(() => {
  const members = familyStore.members.length > 0
    ? familyStore.members
    : [{ name: '本人', diseases: [], relation: 'self' as const }]

  const seriesData = members.slice(0, 6).map(m => ({
    value: getMemberHealthVector(m as any),
    name: m.name,
    areaStyle: { opacity: 0.1 },
    lineStyle: { width: 2 },
    symbol: 'circle',
    symbolSize: 4,
  }))

  const colors = ['#00d4ff', '#4fc3f7', '#81d4fa', '#29b6f6', '#039be5', '#0277bd']

  return {
    color: colors,
    tooltip: { trigger: 'item' },
    legend: {
      data: members.slice(0, 6).map(m => m.name),
      bottom: 10,
      textStyle: { color: '#8aa4c8', fontSize: 13 },
      pageTextStyle: { color: '#8aa4c8' },
    },
    radar: {
      indicator: radarDimensions.map(d => ({ name: d, max: 100 })),
      center: ['50%', '48%'],
      radius: '62%',
      splitNumber: 4,
      axisName: { color: '#8aa4c8', fontSize: 13 },
      splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)', 'rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.1)' } },
    },
    series: [{ type: 'radar', data: seriesData }],
  }
})

const coreIndicatorIds = ['sbp', 'dbp', 'glu', 'tc', 'tg', 'bmi']
const coreIndicatorNames: Record<string, string> = {
  sbp: '收缩压', dbp: '舒张压', glu: '血糖', tc: '总胆固醇', tg: '甘油三酯', bmi: 'BMI',
}
const coreIndicatorColors: Record<string, string> = {
  sbp: '#ff6b6b', dbp: '#ffa726', glu: '#66bb6a', tc: '#42a5f5', tg: '#ab47bc', bmi: '#26c6da',
}

const trendOption = computed(() => {
  const fiveYearsAgo = new Date().getFullYear() - 5
  const years = healthStore.yearGroups
    .filter(yg => yg.year >= fiveYearsAgo)
    .sort((a, b) => a.year - b.year)

  if (years.length === 0) {
    const dummyYears = [new Date().getFullYear() - 4, new Date().getFullYear() - 3, new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()]
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: Object.values(coreIndicatorNames), textStyle: { color: '#8aa4c8', fontSize: 12 }, top: 5 },
      grid: { left: 60, right: 40, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: dummyYears.map(String), axisLabel: { color: '#8aa4c8' }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
      yAxis: { type: 'value', axisLabel: { color: '#8aa4c8' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
      series: coreIndicatorIds.map(id => ({
        name: coreIndicatorNames[id],
        type: 'line',
        data: dummyYears.map(() => null),
        smooth: true,
        lineStyle: { width: 2, color: coreIndicatorColors[id] },
        itemStyle: { color: coreIndicatorColors[id] },
        connectNulls: true,
      })),
    }
  }

  const yearLabels = years.map(y => String(y.year))

  const seriesData = coreIndicatorIds.map(id => {
    const data = years.map(yg => {
      const allValues: number[] = []
      for (const r of yg.records) {
        const iv = r.indicators.find(i => i.indicatorId === id)
        if (iv) allValues.push(iv.value)
      }
      return allValues.length > 0 ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length * 10) / 10 : null
    })
    return {
      name: coreIndicatorNames[id],
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: coreIndicatorColors[id] },
      itemStyle: { color: coreIndicatorColors[id] },
      connectNulls: true,
    }
  })

  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,22,40,0.9)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#e0e8f0' } },
    legend: { data: coreIndicatorIds.map(id => coreIndicatorNames[id]), textStyle: { color: '#8aa4c8', fontSize: 12 }, top: 5, pageTextStyle: { color: '#8aa4c8' } },
    grid: { left: 60, right: 40, top: 50, bottom: 40 },
    xAxis: { type: 'category', data: yearLabels, axisLabel: { color: '#8aa4c8' }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8aa4c8' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
    series: seriesData,
  }
})

const abnormalAlerts = computed(() => {
  return healthStore.recentAbnormals.map(a => {
    const ind = healthStore.getIndicator(a.indicatorId)
    return {
      name: ind?.name || a.indicatorId,
      direction: a.direction,
      value: a.value,
      unit: ind?.unit || '',
      date: a.record.date,
      note: a.note,
    }
  })
})

const exerciseCompliance = computed(() => {
  const records = lifestyleStore.records.exercises
  if (records.length === 0) return 0
  const totalDays = Math.max(records.length, 1)
  const uniqueDays = new Set(records.map(r => r.date)).size
  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)
  const recentRecords = records.filter(r => new Date(r.date) >= last30Days)
  if (recentRecords.length === 0) return Math.min(Math.round(uniqueDays / 30 * 100), 100)
  const recentUniqueDays = new Set(recentRecords.map(r => r.date)).size
  return Math.min(Math.round(recentUniqueDays / 30 * 100), 100)
})

const dietCompliance = computed(() => {
  const records = lifestyleStore.records.diets
  if (records.length === 0) return 0
  const healthyCount = records.filter(r => r.healthLevel === 'healthy').length
  return Math.round(healthyCount / records.length * 100)
})

const sleepCompliance = computed(() => {
  const records = lifestyleStore.records.sleeps
  if (records.length === 0) return 0
  const goodCount = records.filter(r => r.quality === 'excellent' || r.quality === 'good').length
  return Math.round(goodCount / records.length * 100)
})

function gaugeOption(value: number, label: string, color: string) {
  return {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      center: ['50%', '60%'],
      radius: '90%',
      progress: { show: true, width: 14, itemStyle: { color } },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.08)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      title: { offsetCenter: [0, '30%'], fontSize: 14, color: '#8aa4c8' },
      detail: { valueAnimation: true, offsetCenter: [0, '-5%'], fontSize: 28, fontWeight: 'bold', formatter: '{value}%', color },
      data: [{ value, name: label }],
    }],
  }
}

const exerciseGaugeOption = computed(() => gaugeOption(exerciseCompliance.value, '运动达标率', '#00e676'))
const dietGaugeOption = computed(() => gaugeOption(dietCompliance.value, '饮食达标率', '#ff9800'))
const sleepGaugeOption = computed(() => gaugeOption(sleepCompliance.value, '睡眠达标率', '#7c4dff'))

const diseaseTypes: DiseaseType[] = ['hypertension', 'diabetes', 'cardiovascular', 'hyperlipidemia', 'fatty_liver', 'cancer', 'stroke', 'gout', 'kidney_disease', 'thyroid_disease']

const heatmapOption = computed(() => {
  const members = familyStore.members.length > 0 ? familyStore.members : []
  const memberNames = members.length > 0 ? members.map(m => m.name) : ['暂无成员']

  if (members.length === 0) {
    return {
      tooltip: { position: 'top' },
      grid: { top: 30, bottom: 60, left: 100, right: 60 },
      xAxis: { type: 'category', data: diseaseTypes.map(d => DISEASE_LABELS[d]), axisLabel: { color: '#8aa4c8', fontSize: 11, rotate: 30 }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
      yAxis: { type: 'category', data: memberNames, axisLabel: { color: '#8aa4c8' }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
      visualMap: { min: 0, max: 3, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#0a1628', '#1a3a5c', '#e6a23c', '#f56c6c'] }, textStyle: { color: '#8aa4c8' } },
      series: [{ type: 'heatmap', data: [], label: { show: false } }],
    }
  }

  const data: [number, number, number][] = []
  for (let mi = 0; mi < members.length; mi++) {
    for (let di = 0; di < diseaseTypes.length; di++) {
      const disease = members[mi].diseases.find(d => d.diseaseType === diseaseTypes[di])
      const severityMap: Record<string, number> = { mild: 1, moderate: 2, severe: 3 }
      data.push([di, mi, disease ? (severityMap[disease.severity] ?? 1) : 0])
    }
  }

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const m = members[params.value[1]]
        const d = DISEASE_LABELS[diseaseTypes[params.value[0]]]
        const sev = params.value[2]
        const sevText = sev === 3 ? '重度' : sev === 2 ? '中度' : sev === 1 ? '轻度' : '无'
        return `${m.name} - ${d}: ${sevText}`
      },
    },
    grid: { top: 20, bottom: 70, left: 100, right: 50 },
    xAxis: {
      type: 'category',
      data: diseaseTypes.map(d => DISEASE_LABELS[d]),
      axisLabel: { color: '#8aa4c8', fontSize: 11, rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: memberNames,
      axisLabel: { color: '#8aa4c8', fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
      splitLine: { show: false },
    },
    visualMap: {
      min: 0, max: 3, calculable: true, orient: 'horizontal', left: 'center', bottom: 5,
      inRange: { color: ['#0d2137', '#1a4a6e', '#e6a23c', '#f56c6c'] },
      textStyle: { color: '#8aa4c8', fontSize: 12 },
      formatter: (val: number) => val === 0 ? '无' : val === 1 ? '轻度' : val === 2 ? '中度' : '重度',
    },
    series: [{
      type: 'heatmap',
      data,
      label: {
        show: true,
        formatter: (params: any) => {
          const v = params.value[2]
          return v === 0 ? '' : v === 1 ? '轻' : v === 2 ? '中' : '重'
        },
        color: '#e0e8f0',
        fontSize: 12,
      },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      itemStyle: { borderColor: '#0a1628', borderWidth: 2, borderRadius: 3 },
    }],
  }
})

const geneticRiskBarOption = computed(() => {
  const risks = familyStore.geneticRisks
  if (risks.length === 0) {
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 30, top: 20, bottom: 30 },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#8aa4c8', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } } },
      yAxis: { type: 'category', data: ['暂无数据'], axisLabel: { color: '#8aa4c8' }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#1a4a6e', borderRadius: [0, 4, 4, 0] }, barWidth: '50%' }],
    }
  }

  const sorted = [...risks].sort((a, b) => b.riskScore - a.riskScore)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(10,22,40,0.9)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#e0e8f0' } },
    grid: { left: 100, right: 40, top: 10, bottom: 30 },
    xAxis: {
      type: 'value', max: 100,
      axisLabel: { color: '#8aa4c8', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(r => r.diseaseName),
      axisLabel: { color: '#8aa4c8', fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    },
    series: [{
      type: 'bar',
      data: sorted.map(r => ({
        value: r.riskScore,
        itemStyle: {
          color: r.riskLevel === 'high' ? '#f56c6c' : r.riskLevel === 'medium' ? '#e6a23c' : '#00e676',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barWidth: '55%',
      label: { show: true, position: 'right', formatter: '{c}%', color: '#8aa4c8', fontSize: 12 },
    }],
  }
})

const totalMembers = computed(() => familyStore.members.length || 1)
const totalDiseases = computed(() => familyStore.diseaseNameList.length)
const highRiskCount = computed(() => familyStore.highRiskDiseases.length)
const abnormalCount = computed(() => healthStore.totalAbnormals)
const totalYears = computed(() => healthStore.totalYears)

const scoreColor = computed(() => {
  const s = familyHealthScore.value
  if (s >= 80) return '#00e676'
  if (s >= 60) return '#ff9800'
  return '#f56c6c'
})

function startAutoPlay() {
  stopAutoPlay()
  if (autoPlay.value) {
    timer = setInterval(() => {
      currentView.value = (currentView.value + 1) % views.length
    }, autoPlayInterval.value)
  }
}

function stopAutoPlay() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value
  if (autoPlay.value) {
    startAutoPlay()
  } else {
    stopAutoPlay()
  }
}

function switchView(idx: number) {
  currentView.value = idx
  if (autoPlay.value) {
    startAutoPlay()
  }
}

onMounted(() => {
  familyStore.loadFromStorage(healthStore.password)
  if (familyStore.members.length > 0 && !familyStore.hasAnalyzed) {
    familyStore.runAnalysis()
  }
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
  if (clockTimer) clearInterval(clockTimer)
})

function exitBigScreen() {
  router.push('/')
}

function enterFullscreen() {
  const el = document.documentElement as any
  if (el.requestFullscreen) el.requestFullscreen()
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
}
</script>

<template>
  <div class="bigscreen">
    <header class="bs-header">
      <div class="bs-header-left">
        <div class="bs-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="8" stroke="#00d4ff" stroke-width="2" fill="rgba(0,212,255,0.1)" />
            <path d="M16 8v16M8 16h16M11 11l10 10M21 11L11 21" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            <circle cx="16" cy="16" r="4" fill="#00d4ff" opacity="0.8" />
          </svg>
        </div>
        <div>
          <h1 class="bs-title">家庭健康全景可视化大屏</h1>
          <p class="bs-subtitle">Family Health Panoramic Dashboard</p>
        </div>
      </div>
      <div class="bs-header-center">
        <div class="bs-view-tabs">
          <button
            v-for="(v, idx) in views"
            :key="v.key"
            class="bs-tab"
            :class="{ active: currentView === idx }"
            @click="switchView(idx)"
          >
            {{ v.label }}
          </button>
        </div>
      </div>
      <div class="bs-header-right">
        <div class="bs-time">{{ currentTime }}</div>
        <div class="bs-actions">
          <button class="bs-btn" @click="toggleAutoPlay" :title="autoPlay ? '暂停轮播' : '开启轮播'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <template v-if="autoPlay"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></template>
              <template v-else><polygon points="5,3 19,12 5,21" /></template>
            </svg>
          </button>
          <button class="bs-btn" @click="enterFullscreen" title="全屏">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button class="bs-btn" @click="exitBigScreen" title="退出大屏">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="bs-body">
      <template v-if="currentView === 0">
        <div class="bs-grid overview-grid">
          <div class="bs-panel">
            <div class="bs-panel-header">
              <span class="bs-panel-dot" />
              <span class="bs-panel-title">全家健康评分</span>
            </div>
            <div class="bs-score-wrap">
              <div class="bs-score-ring" :style="{ '--score-color': scoreColor, '--score-pct': familyHealthScore + '%' }">
                <span class="bs-score-num" :style="{ color: scoreColor }">{{ familyHealthScore }}</span>
              </div>
              <div class="bs-score-label" :style="{ color: scoreColor }">
                {{ overallRiskLevel === 'high' ? '需重点关注' : overallRiskLevel === 'medium' ? '有改善空间' : '健康状态良好' }}
              </div>
            </div>
            <div class="bs-mini-stats">
              <div class="bs-mini-stat">
                <span class="bs-mini-stat-val">{{ totalMembers }}</span>
                <span class="bs-mini-stat-label">家庭成员</span>
              </div>
              <div class="bs-mini-stat">
                <span class="bs-mini-stat-val" style="color:#f56c6c">{{ highRiskCount }}</span>
                <span class="bs-mini-stat-label">高风险项</span>
              </div>
              <div class="bs-mini-stat">
                <span class="bs-mini-stat-val" style="color:#e6a23c">{{ totalDiseases }}</span>
                <span class="bs-mini-stat-label">疾病类型</span>
              </div>
              <div class="bs-mini-stat">
                <span class="bs-mini-stat-val" style="color:#f56c6c">{{ abnormalCount }}</span>
                <span class="bs-mini-stat-label">异常指标</span>
              </div>
            </div>
          </div>

          <div class="bs-panel span-2">
            <div class="bs-panel-header">
              <span class="bs-panel-dot" />
              <span class="bs-panel-title">家庭成员健康雷达图</span>
            </div>
            <div class="bs-chart"><VChart :option="radarOption" autoresize /></div>
          </div>

          <div class="bs-panel span-2">
            <div class="bs-panel-header">
              <span class="bs-panel-dot green" />
              <span class="bs-panel-title">核心指标趋势（近5年）</span>
            </div>
            <div class="bs-chart"><VChart :option="trendOption" autoresize /></div>
          </div>

          <div class="bs-panel">
            <div class="bs-panel-header">
              <span class="bs-panel-dot orange" />
              <span class="bs-panel-title">异常预警</span>
            </div>
            <div class="bs-alert-scroll">
              <div v-if="abnormalAlerts.length === 0" class="bs-alert-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <span>所有指标正常</span>
              </div>
              <div v-else class="bs-alert-list">
                <div v-for="(alert, idx) in abnormalAlerts" :key="idx" class="bs-alert-item">
                  <div class="bs-alert-indicator">
                    <span class="bs-alert-dot" />
                    <span class="bs-alert-name">{{ alert.name }}</span>
                    <span class="bs-alert-dir" :class="alert.direction === '偏高' ? 'up' : 'down'">{{ alert.direction }}</span>
                  </div>
                  <div class="bs-alert-detail">
                    {{ alert.value }} {{ alert.unit }} · {{ alert.date }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bs-panel">
            <div class="bs-panel-header">
              <span class="bs-panel-dot purple" />
              <span class="bs-panel-title">运动/饮食/睡眠达标率</span>
            </div>
            <div class="bs-gauges">
              <div class="bs-gauge-item">
                <VChart :option="exerciseGaugeOption" autoresize />
              </div>
              <div class="bs-gauge-item">
                <VChart :option="dietGaugeOption" autoresize />
              </div>
              <div class="bs-gauge-item">
                <VChart :option="sleepGaugeOption" autoresize />
              </div>
            </div>
          </div>

          <div class="bs-panel span-2">
            <div class="bs-panel-header">
              <span class="bs-panel-dot red" />
              <span class="bs-panel-title">疾病风险热力图</span>
            </div>
            <div class="bs-chart"><VChart :option="heatmapOption" autoresize /></div>
          </div>

          <div class="bs-panel">
            <div class="bs-panel-header">
              <span class="bs-panel-dot" />
              <span class="bs-panel-title">遗传风险评估</span>
            </div>
            <div class="bs-chart"><VChart :option="geneticRiskBarOption" autoresize /></div>
          </div>
        </div>
      </template>

      <template v-else-if="currentView === 1">
        <div class="bs-grid focus-grid">
          <div class="bs-panel span-full">
            <div class="bs-panel-header">
              <span class="bs-panel-dot" />
              <span class="bs-panel-title">家庭成员健康雷达图 — 详细视图</span>
            </div>
            <div class="bs-chart-focus"><VChart :option="radarOption" autoresize /></div>
          </div>
        </div>
      </template>

      <template v-else-if="currentView === 2">
        <div class="bs-grid focus-grid">
          <div class="bs-panel span-full">
            <div class="bs-panel-header">
              <span class="bs-panel-dot green" />
              <span class="bs-panel-title">核心指标趋势（近5年）— 详细视图</span>
            </div>
            <div class="bs-chart-focus"><VChart :option="trendOption" autoresize /></div>
          </div>
        </div>
      </template>

      <template v-else-if="currentView === 3">
        <div class="bs-grid focus-grid">
          <div class="bs-panel span-full">
            <div class="bs-panel-header">
              <span class="bs-panel-dot red" />
              <span class="bs-panel-title">疾病风险热力图 — 详细视图</span>
            </div>
            <div class="bs-chart-focus"><VChart :option="heatmapOption" autoresize /></div>
          </div>
        </div>
      </template>

      <template v-else-if="currentView === 4">
        <div class="bs-grid focus-grid">
          <div class="bs-panel span-2">
            <div class="bs-panel-header">
              <span class="bs-panel-dot purple" />
              <span class="bs-panel-title">运动/饮食/睡眠达标率 — 详细视图</span>
            </div>
            <div class="bs-gauges-focus">
              <div class="bs-gauge-item-lg">
                <VChart :option="exerciseGaugeOption" autoresize />
              </div>
              <div class="bs-gauge-item-lg">
                <VChart :option="dietGaugeOption" autoresize />
              </div>
              <div class="bs-gauge-item-lg">
                <VChart :option="sleepGaugeOption" autoresize />
              </div>
            </div>
          </div>
          <div class="bs-panel">
            <div class="bs-panel-header">
              <span class="bs-panel-dot" />
              <span class="bs-panel-title">遗传风险评估</span>
            </div>
            <div class="bs-chart-focus"><VChart :option="geneticRiskBarOption" autoresize /></div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bigscreen {
  width: 100vw;
  height: 100vh;
  background: #0a1628;
  color: #e0e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
}

.bs-header {
  height: 72px;
  background: linear-gradient(180deg, rgba(0,212,255,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0,212,255,0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
}

.bs-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bs-logo {
  display: flex;
  align-items: center;
}

.bs-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #00d4ff, #4fc3f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bs-subtitle {
  font-size: 11px;
  color: rgba(138,164,200,0.6);
  margin: 2px 0 0;
  letter-spacing: 1px;
}

.bs-header-center {
  display: flex;
  align-items: center;
}

.bs-view-tabs {
  display: flex;
  gap: 4px;
  background: rgba(0,212,255,0.06);
  border-radius: 8px;
  padding: 3px;
}

.bs-tab {
  padding: 6px 18px;
  border: none;
  background: transparent;
  color: #8aa4c8;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 500;
}

.bs-tab:hover {
  color: #e0e8f0;
  background: rgba(0,212,255,0.08);
}

.bs-tab.active {
  background: rgba(0,212,255,0.18);
  color: #00d4ff;
  font-weight: 600;
}

.bs-header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.bs-time {
  font-size: 14px;
  color: #8aa4c8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.bs-actions {
  display: flex;
  gap: 6px;
}

.bs-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(0,212,255,0.2);
  background: rgba(0,212,255,0.06);
  color: #8aa4c8;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.bs-btn:hover {
  background: rgba(0,212,255,0.15);
  color: #00d4ff;
  border-color: rgba(0,212,255,0.4);
}

.bs-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.bs-grid {
  display: grid;
  gap: 16px;
}

.overview-grid {
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(280px, auto);
}

.focus-grid {
  grid-template-columns: repeat(3, 1fr);
}

.bs-panel {
  background: rgba(13,33,55,0.85);
  border: 1px solid rgba(0,212,255,0.12);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s ease;
  position: relative;
  overflow: hidden;
}

.bs-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent);
}

.bs-panel:hover {
  border-color: rgba(0,212,255,0.25);
}

.span-2 {
  grid-column: span 2;
}

.span-full {
  grid-column: 1 / -1;
}

.bs-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.bs-panel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00d4ff;
  box-shadow: 0 0 6px rgba(0,212,255,0.5);
}

.bs-panel-dot.green {
  background: #00e676;
  box-shadow: 0 0 6px rgba(0,230,118,0.5);
}

.bs-panel-dot.orange {
  background: #ff9800;
  box-shadow: 0 0 6px rgba(255,152,0,0.5);
}

.bs-panel-dot.purple {
  background: #7c4dff;
  box-shadow: 0 0 6px rgba(124,77,255,0.5);
}

.bs-panel-dot.red {
  background: #f56c6c;
  box-shadow: 0 0 6px rgba(245,108,108,0.5);
}

.bs-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #8aa4c8;
  letter-spacing: 1px;
}

.bs-chart {
  flex: 1;
  min-height: 240px;
}

.bs-chart-focus {
  flex: 1;
  min-height: 500px;
}

.bs-score-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0 12px;
}

.bs-score-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(var(--score-color) var(--score-pct), rgba(255,255,255,0.06) var(--score-pct));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.bs-score-ring::before {
  content: '';
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #0d2137;
  position: absolute;
}

.bs-score-num {
  position: relative;
  font-size: 36px;
  font-weight: 700;
  z-index: 1;
}

.bs-score-label {
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
  letter-spacing: 1px;
}

.bs-mini-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: auto;
}

.bs-mini-stat {
  background: rgba(0,212,255,0.04);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid rgba(0,212,255,0.08);
}

.bs-mini-stat-val {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #00d4ff;
  line-height: 1.2;
}

.bs-mini-stat-label {
  font-size: 11px;
  color: #8aa4c8;
  margin-top: 2px;
}

.bs-alert-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.bs-alert-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: #00e676;
  font-size: 14px;
}

.bs-alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bs-alert-item {
  padding: 10px 12px;
  background: rgba(245,108,108,0.06);
  border-radius: 8px;
  border-left: 3px solid #f56c6c;
}

.bs-alert-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.bs-alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
}

.bs-alert-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e8f0;
}

.bs-alert-dir {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.bs-alert-dir.up {
  background: rgba(245,108,108,0.15);
  color: #f56c6c;
}

.bs-alert-dir.down {
  background: rgba(255,152,0,0.15);
  color: #ff9800;
}

.bs-alert-detail {
  font-size: 12px;
  color: #8aa4c8;
}

.bs-gauges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.bs-gauge-item {
  flex: 1;
  min-height: 100px;
}

.bs-gauges-focus {
  display: flex;
  gap: 20px;
  flex: 1;
}

.bs-gauge-item-lg {
  flex: 1;
  min-height: 200px;
}

.bs-alert-scroll::-webkit-scrollbar {
  width: 4px;
}

.bs-alert-scroll::-webkit-scrollbar-track {
  background: rgba(0,212,255,0.03);
}

.bs-alert-scroll::-webkit-scrollbar-thumb {
  background: rgba(0,212,255,0.2);
  border-radius: 2px;
}

@media (min-width: 2560px) {
  .bs-title { font-size: 28px; }
  .bs-panel { padding: 24px; }
  .bs-panel-title { font-size: 16px; }
  .bs-score-ring { width: 160px; height: 160px; }
  .bs-score-ring::before { width: 128px; height: 128px; }
  .bs-score-num { font-size: 48px; }
  .bs-mini-stat-val { font-size: 28px; }
  .overview-grid { grid-auto-rows: minmax(360px, auto); }
}
</style>
