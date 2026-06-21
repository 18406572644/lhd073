<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NSelect,
  NCard,
  NEmpty,
  NDataTable,
  NTag,
  NButton,
  NModal,
  NInput,
  NSpace,
  NTabs,
  NTabPane,
  NIcon,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent } from 'echarts/components'
import { TrendingUp, Activity } from 'lucide-vue-next'
import { useHealthStore } from '@/stores/health'
import { useLifestyleStore } from '@/stores/lifestyle'
import { VITAL_SIGN_TYPE_LABELS, VITAL_SIGN_UNITS, type VitalSignType } from '@/types'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent])

const store = useHealthStore()
const lifestyleStore = useLifestyleStore()
const message = useMessage()

const activeTab = ref('indicator')
const selectedIndicatorId = ref<string | null>(null)
const showNoteModal = ref(false)
const editingNote = ref('')
const editingRecordId = ref('')
const editingIndicatorId = ref('')

const indicatorOptions = computed<SelectOption[]>(() => {
  const categoryMap = new Map<string, { label: string; value: string }[]>()
  for (const ind of store.indicators) {
    const list = categoryMap.get(ind.category) || []
    list.push({ label: `${ind.name} (${ind.unit})`, value: ind.id })
    categoryMap.set(ind.category, list)
  }
  return Array.from(categoryMap.entries()).map(([category, options]) => ({
    label: category,
    type: 'group' as const,
    key: category,
    children: options,
  }))
})

const lifestyleOptions: SelectOption[] = [
  {
    label: '运动',
    type: 'group',
    key: 'exercise',
    children: [
      { label: '运动时长 (分钟/天)', value: 'exercise_duration' },
      { label: '消耗卡路里 (千卡/天)', value: 'exercise_calories' },
    ],
  },
  {
    label: '睡眠',
    type: 'group',
    key: 'sleep',
    children: [
      { label: '睡眠时长 (小时)', value: 'sleep_duration' },
    ],
  },
  {
    label: '日常监测',
    type: 'group',
    key: 'vitals',
    children: [
      { label: '体重 (kg)', value: 'vital_weight' },
      { label: '血压 - 收缩压 (mmHg)', value: 'vital_bp_systolic' },
      { label: '血压 - 舒张压 (mmHg)', value: 'vital_bp_diastolic' },
      { label: '心率 (次/分)', value: 'vital_heart_rate' },
      { label: '血糖 (mmol/L)', value: 'vital_blood_sugar' },
      { label: 'BMI (kg/m²)', value: 'vital_bmi' },
      { label: '体脂率 (%)', value: 'vital_body_fat' },
    ],
  },
]

const selectedLifestyleMetric = ref<string | null>(null)
const selectedCompareIndicatorId = ref<string | null>(null)

const indicatorValues = computed(() => {
  if (!selectedIndicatorId.value) return []
  return store.getIndicatorValues(selectedIndicatorId.value)
})

const currentIndicator = computed(() => {
  if (!selectedIndicatorId.value) return undefined
  return store.getIndicator(selectedIndicatorId.value)
})

function getLifestyleDataByDate(): { date: string; value: number }[] {
  if (!selectedLifestyleMetric.value) return []

  const metric = selectedLifestyleMetric.value
  const dateMap = new Map<string, number>()

  if (metric === 'exercise_duration') {
    for (const e of lifestyleStore.records.exercises) {
      const current = dateMap.get(e.date) || 0
      dateMap.set(e.date, current + e.duration)
    }
  } else if (metric === 'exercise_calories') {
    for (const e of lifestyleStore.records.exercises) {
      const current = dateMap.get(e.date) || 0
      dateMap.set(e.date, current + e.calories)
    }
  } else if (metric === 'sleep_duration') {
    for (const s of lifestyleStore.records.sleeps) {
      dateMap.set(s.date, s.duration)
    }
  } else if (metric.startsWith('vital_')) {
    const vitalType = metric.replace('vital_', '') as string
    if (vitalType === 'bp_systolic') {
      for (const v of lifestyleStore.records.vitalSigns) {
        if (v.type === 'blood_pressure') {
          dateMap.set(v.date, v.value)
        }
      }
    } else if (vitalType === 'bp_diastolic') {
      for (const v of lifestyleStore.records.vitalSigns) {
        if (v.type === 'blood_pressure' && v.value2 !== undefined) {
          dateMap.set(v.date, v.value2)
        }
      }
    } else {
      const typeMap: Record<string, VitalSignType> = {
        weight: 'weight',
        heart_rate: 'heart_rate',
        blood_sugar: 'blood_sugar',
        bmi: 'bmi',
        body_fat: 'body_fat',
      }
      const type = typeMap[vitalType]
      if (type) {
        for (const v of lifestyleStore.records.vitalSigns) {
          if (v.type === type) {
            dateMap.set(v.date, v.value)
          }
        }
      }
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function getLifestyleMetricLabel(): string {
  if (!selectedLifestyleMetric.value) return ''
  for (const group of lifestyleOptions) {
    if (group.type === 'group') {
      const children = group.children as Array<{ label: string; value: string }> | undefined
      const found = children?.find(c => c.value === selectedLifestyleMetric.value)
      if (found) return found.label
    }
  }
  return selectedLifestyleMetric.value
}

const compareChartOption = computed(() => {
  if (!selectedCompareIndicatorId.value || !selectedLifestyleMetric.value) return {}

  const ind = store.getIndicator(selectedCompareIndicatorId.value)
  if (!ind) return {}

  const examValues = store.getIndicatorValues(selectedCompareIndicatorId.value)
  const lifestyleData = getLifestyleDataByDate()

  if (examValues.length === 0 && lifestyleData.length === 0) return {}

  const allDates = new Set<string>()
  examValues.forEach(v => allDates.add(v.date))
  lifestyleData.forEach(v => allDates.add(v.date))
  const sortedDates = Array.from(allDates).sort()

  const examData = sortedDates.map(date => {
    const found = examValues.find(v => v.date === date)
    return found ? found.value : null
  })

  const lifestyleDataMapped = sortedDates.map(date => {
    const found = lifestyleData.find(v => v.date === date)
    return found ? found.value : null
  })

  const lifestyleLabel = getLifestyleMetricLabel()

  return {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross' as const },
    },
    legend: {
      data: [ind.name, lifestyleLabel],
      top: 10,
    },
    grid: {
      left: 60,
      right: 60,
      top: 50,
      bottom: 60,
    },
    xAxis: {
      type: 'category' as const,
      data: sortedDates,
      axisLabel: { color: '#666', rotate: 30 },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: ind.name,
        nameTextStyle: { color: '#4A90D9' },
        axisLabel: { color: '#4A90D9' },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { lineStyle: { color: '#4A90D9' } },
      },
      {
        type: 'value' as const,
        name: lifestyleLabel,
        nameTextStyle: { color: '#E67E22' },
        axisLabel: { color: '#E67E22' },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#E67E22' } },
      },
    ],
    dataZoom: [
      {
        type: 'inside' as const,
        start: 0,
        end: 100,
      },
      {
        type: 'slider' as const,
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
      },
    ],
    series: [
      {
        name: ind.name,
        type: 'line' as const,
        data: examData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#4A90D9', width: 2 },
        itemStyle: { color: '#4A90D9' },
        yAxisIndex: 0,
        connectNulls: true,
      },
      {
        name: lifestyleLabel,
        type: 'line' as const,
        data: lifestyleDataMapped,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 6,
        lineStyle: { color: '#E67E22', width: 2, type: 'dashed' as const },
        itemStyle: { color: '#E67E22' },
        yAxisIndex: 1,
        connectNulls: true,
      },
    ],
  }
})

const chartOption = computed(() => {
  if (!currentIndicator.value || indicatorValues.value.length === 0) return {}
  const ind = currentIndicator.value
  const values = indicatorValues.value
  const dates = values.map(v => v.date)
  const data = values.map(v => v.value)
  const abnormalData = values
    .map((v, i) => v.isAbnormal ? { coord: [dates[i], v.value], value: v.value } as const : null)
    .filter(Boolean)

  return {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p.dataIndex
        const v = values[idx]
        const status = v.isAbnormal
          ? (v.value > ind.normalRange.max ? '偏高' : '偏低')
          : '正常'
        return `${v.date}<br/>${ind.name}: ${v.value} ${ind.unit}<br/>状态: ${status}`
      },
    },
    grid: {
      left: 60,
      right: 30,
      top: 30,
      bottom: 60,
    },
    xAxis: {
      type: 'category' as const,
      data: dates,
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    dataZoom: [
      {
        type: 'inside' as const,
        start: 0,
        end: 100,
      },
      {
        type: 'slider' as const,
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
      },
    ],
    series: [
      {
        type: 'line' as const,
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#4A90D9', width: 2 },
        itemStyle: { color: '#4A90D9' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(74,144,217,0.3)' },
              { offset: 1, color: 'rgba(74,144,217,0.02)' },
            ],
          },
        },
        markPoint: {
          data: abnormalData,
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: '#d03050' },
          label: { show: false },
        },
        markLine: {
          silent: true,
          symbol: 'none' as const,
          data: [
            {
              yAxis: ind.normalRange.min,
              lineStyle: { color: '#67C23A', type: 'dashed' as const, width: 1 },
              label: { formatter: `下限 ${ind.normalRange.min}`, position: 'insideEndTop' as const, color: '#67C23A', fontSize: 11 },
            },
            {
              yAxis: ind.normalRange.max,
              lineStyle: { color: '#67C23A', type: 'dashed' as const, width: 1 },
              label: { formatter: `上限 ${ind.normalRange.max}`, position: 'insideEndTop' as const, color: '#67C23A', fontSize: 11 },
            },
          ],
        },
      },
    ],
  }
})

function getStatus(indicatorId: string, value: number): string {
  const ind = store.getIndicator(indicatorId)
  if (!ind) return '正常'
  if (value > ind.normalRange.max) return '偏高'
  if (value < ind.normalRange.min) return '偏低'
  return '正常'
}

function openNoteModal(recordId: string, indicatorId: string, currentNote: string) {
  editingRecordId.value = recordId
  editingIndicatorId.value = indicatorId
  editingNote.value = currentNote
  showNoteModal.value = true
}

async function saveNote() {
  const record = store.records.find(r => r.id === editingRecordId.value)
  if (!record) return
  const iv = record.indicators.find(iv => iv.indicatorId === editingIndicatorId.value)
  if (!iv) return
  iv.healthNote = editingNote.value
  try {
    await store.updateRecord(record)
    message.success('备注已保存')
  } catch {
    message.error('保存失败')
  }
  showNoteModal.value = false
}

const tableColumns = computed<DataTableColumns<any>>(() => {
  if (!currentIndicator.value) return []
  const ind = currentIndicator.value
  return [
    { title: '日期', key: 'date', width: 120 },
    {
      title: '指标值',
      key: 'value',
      width: 100,
      render: (row: any) => h('span', {
        style: { color: row.isAbnormal ? '#d03050' : '#333', fontWeight: row.isAbnormal ? '600' : '400' }
      }, `${row.value} ${ind.unit}`),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (row: any) => {
        const status = getStatus(row.indicatorId, row.value)
        if (row.isAbnormal) {
          return h(NTag, { type: 'error', size: 'small' }, () => status)
        }
        return h(NTag, { type: 'success', size: 'small' }, () => '正常')
      },
    },
    { title: '健康备注', key: 'healthNote', ellipsis: { tooltip: true } },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (row: any) => h(NButton, {
        size: 'small',
        type: row.healthNote ? 'default' : 'primary',
        onClick: () => openNoteModal(row.recordId, row.indicatorId, row.healthNote),
      }, () => row.healthNote ? '编辑备注' : '添加备注'),
    },
  ]
})

const tableData = computed(() => {
  if (!selectedIndicatorId.value) return []
  return indicatorValues.value.map(v => ({
    ...v,
    indicatorId: selectedIndicatorId.value!,
  }))
})

const hasCompareData = computed(() => {
  if (!selectedCompareIndicatorId.value || !selectedLifestyleMetric.value) return false
  const examValues = store.getIndicatorValues(selectedCompareIndicatorId.value)
  const lifestyleData = getLifestyleDataByDate()
  return examValues.length > 0 || lifestyleData.length > 0
})
</script>

<template>
  <div style="padding: 24px; background: #f0f7ff; min-height: 100%;">
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0;">指标趋势</h1>
      <p style="margin: 6px 0 0; color: #888; font-size: 14px;">追踪体检指标变化，关联分析生活方式数据</p>
    </div>

    <NCard :bordered="false" style="margin-bottom: 16px;">
      <NTabs v-model:value="activeTab" size="large">
        <NTabPane name="indicator" tab="体检指标趋势">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><TrendingUp /></NIcon>
              体检指标趋势
            </span>
          </template>
        </NTabPane>
        <NTabPane name="compare" tab="生活方式关联分析">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><Activity /></NIcon>
              生活方式关联分析
            </span>
          </template>
        </NTabPane>
      </NTabs>
    </NCard>

    <template v-if="activeTab === 'indicator'">
      <NCard :bordered="false" style="margin-bottom: 16px;">
        <NSelect
          v-model:value="selectedIndicatorId"
          :options="indicatorOptions"
          placeholder="选择体检指标"
          filterable
          consistent-menu-width
        />
      </NCard>

      <template v-if="selectedIndicatorId && indicatorValues.length > 0">
        <NCard :bordered="false" style="margin-bottom: 16px; height: 500px;">
          <VChart :option="chartOption" autoresize style="height: 100%; width: 100%;" />
        </NCard>

        <NCard :bordered="false">
          <template #header>
            <span style="color: #1a6fb5; font-weight: 600;">健康备注</span>
          </template>
          <NDataTable
            :columns="tableColumns"
            :data="tableData"
            :bordered="false"
            size="small"
          />
        </NCard>
      </template>

      <NEmpty v-else-if="selectedIndicatorId && indicatorValues.length === 0" description="该指标暂无历史数据" style="padding: 80px 0;" />
      <NEmpty v-else description="请选择体检指标" style="padding: 80px 0;" />
    </template>

    <template v-else-if="activeTab === 'compare'">
      <NCard :bordered="false" style="margin-bottom: 16px;">
        <NSpace :size="16" vertical>
          <div style="display: flex; gap: 16px;">
            <div style="flex: 1;">
              <div style="font-size: 13px; color: #666; margin-bottom: 6px;">体检指标</div>
              <NSelect
                v-model:value="selectedCompareIndicatorId"
                :options="indicatorOptions"
                placeholder="选择体检指标"
                filterable
                clearable
              />
            </div>
            <div style="flex: 1;">
              <div style="font-size: 13px; color: #666; margin-bottom: 6px;">生活方式指标</div>
              <NSelect
                v-model:value="selectedLifestyleMetric"
                :options="lifestyleOptions"
                placeholder="选择生活方式指标"
                filterable
                clearable
              />
            </div>
          </div>
        </NSpace>
      </NCard>

      <template v-if="hasCompareData">
        <NCard :bordered="false" style="margin-bottom: 16px; height: 500px;">
          <VChart :option="compareChartOption" autoresize style="height: 100%; width: 100%;" />
        </NCard>

        <NCard :bordered="false">
          <template #header>
            <span style="color: #1a6fb5; font-weight: 600;">关联分析说明</span>
          </template>
          <div style="color: #666; font-size: 14px; line-height: 1.8;">
            <p>• 图表使用双Y轴展示，左侧为体检指标数值，右侧为生活方式指标数值</p>
            <p>• 可以直观对比两者的变化趋势，分析生活方式对健康指标的影响</p>
            <p>• 例如：运动时长与体重变化的关系、睡眠质量与血压的关系等</p>
            <p>• 数据来自您在「生活方式记录」和「体检档案」中录入的数据</p>
          </div>
        </NCard>
      </template>

      <NEmpty v-else description="请选择体检指标和生活方式指标进行关联分析" style="padding: 80px 0;" />
    </template>

    <NModal v-model:show="showNoteModal" preset="card" title="健康备注" style="width: 480px;" :mask-closable="false">
      <NInput
        v-model:value="editingNote"
        type="textarea"
        :rows="4"
        placeholder="输入健康备注"
      />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showNoteModal = false">取消</NButton>
          <NButton type="primary" @click="saveNote">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
