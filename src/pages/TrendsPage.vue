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
  type DataTableColumns,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent } from 'echarts/components'
import { useHealthStore } from '@/stores/health'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent])

const store = useHealthStore()
const message = useMessage()

const selectedIndicatorId = ref<string | null>(null)
const showNoteModal = ref(false)
const editingNote = ref('')
const editingRecordId = ref('')
const editingIndicatorId = ref('')

const indicatorOptions = computed(() => {
  const categoryMap = new Map<string, { label: string; value: string }[]>()
  for (const ind of store.indicators) {
    const list = categoryMap.get(ind.category) || []
    list.push({ label: `${ind.name} (${ind.unit})`, value: ind.id })
    categoryMap.set(ind.category, list)
  }
  return Array.from(categoryMap.entries()).map(([category, options]) => ({
    label: category,
    key: category,
    children: options,
  }))
})

const indicatorValues = computed(() => {
  if (!selectedIndicatorId.value) return []
  return store.getIndicatorValues(selectedIndicatorId.value)
})

const currentIndicator = computed(() => {
  if (!selectedIndicatorId.value) return undefined
  return store.getIndicator(selectedIndicatorId.value)
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
</script>

<template>
  <div style="padding: 24px; background: #f0f7ff; min-height: 100%;">
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0;">指标趋势</h1>
      <p style="margin: 6px 0 0; color: #888; font-size: 14px;">追踪体检指标历年变化</p>
    </div>

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
