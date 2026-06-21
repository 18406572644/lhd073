<script setup lang="ts">
import { ref, computed, watch, h, onMounted, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NSelect,
  NCard,
  NButton,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NDataTable,
  NGrid,
  NGi,
  NProgress,
  NEmpty,
  NIcon,
  NDivider,
  NAlert,
  NButtonGroup,
  NModal,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NCheckbox,
  NCheckboxGroup,
  NSwitch,
  NUpload,
  NUploadDragger,
  type DataTableColumns,
  type SelectOption,
  type FormInst,
  type UploadCustomRequestOptions,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, GaugeChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
} from 'echarts/components'
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity,
  ArrowLeftRight,
  Lightbulb,
  Download,
  RefreshCw,
  Calendar,
  Gauge,
  Settings,
  Upload,
  X,
} from 'lucide-vue-next'
import { useHealthStore } from '@/stores/health'
import {
  generateHealthReport,
  getKeyIndicatorTrends,
  type ReportTimeDimension,
  type HealthReport,
  type KeyIndicatorTrend,
  type AbnormalIndicatorSummary,
  type SystemAnalysisItem,
  type CompareChangeItem,
  type HealthSuggestion,
} from '@/utils/reportGenerator'
import { generateHealthReportPdf } from '@/utils/pdf'
import {
  type ReportTemplateType,
  type PdfExportConfig,
  type ReportSectionKey,
  DEFAULT_PDF_COVER_CONFIG,
  DEFAULT_PDF_SECTION_CONFIG,
  DEFAULT_PDF_HEADER_FOOTER_CONFIG,
  REPORT_TEMPLATE_OPTIONS,
  REPORT_SECTION_OPTIONS,
} from '@/types'

use([
  CanvasRenderer,
  LineChart,
  GaugeChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
  TitleComponent,
  ToolboxComponent,
])

const store = useHealthStore()
const message = useMessage()

const selectedDimension = ref<ReportTimeDimension>('year')
const selectedYear = ref<number>(new Date().getFullYear())
const selectedQuarter = ref<number>(Math.floor(new Date().getMonth() / 3) + 1)
const selectedRecordId = ref<string | null>(null)
const isGenerating = ref(false)
const isExporting = ref(false)
const generatedReport = ref<HealthReport | null>(null)
const keyTrends = ref<KeyIndicatorTrend[]>([])

const showExportModal = ref(false)
const pdfConfigFormRef = ref<FormInst | null>(null)
const pdfConfig = ref<PdfExportConfig>({
  template: 'detailed',
  cover: { ...DEFAULT_PDF_COVER_CONFIG },
  sections: { ...DEFAULT_PDF_SECTION_CONFIG },
  headerFooter: { ...DEFAULT_PDF_HEADER_FOOTER_CONFIG },
})
const logoPreviewUrl = ref<string | null>(null)
const activeTab = ref<string>('template')

function openExportModal() {
  if (!generatedReport.value) {
    message.warning('请先生成报告')
    return
  }
  pdfConfig.value = {
    template: 'detailed',
    cover: { ...DEFAULT_PDF_COVER_CONFIG },
    sections: { ...DEFAULT_PDF_SECTION_CONFIG },
    headerFooter: { ...DEFAULT_PDF_HEADER_FOOTER_CONFIG },
  }
  logoPreviewUrl.value = null
  activeTab.value = 'template'
  showExportModal.value = true
}

function closeExportModal() {
  showExportModal.value = false
}

function handleLogoUpload({ file }: UploadCustomRequestOptions) {
  const fileObj = file.file as File
  if (!fileObj) return
  if (!fileObj.type.startsWith('image/')) {
    message.error('请上传图片文件')
    return
  }
  if (fileObj.size > 2 * 1024 * 1024) {
    message.error('图片大小不能超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    logoPreviewUrl.value = dataUrl
    pdfConfig.value.cover.logoDataUrl = dataUrl
    message.success('Logo 上传成功')
  }
  reader.readAsDataURL(fileObj)
}

function removeLogo() {
  logoPreviewUrl.value = null
  pdfConfig.value.cover.logoDataUrl = null
}

function onTemplateChange(value: ReportTemplateType) {
  if (value === 'simple') {
    pdfConfig.value.sections = {
      photos: false,
      indicators: false,
      trends: false,
      lifestyle: false,
      risk: false,
      comparison: false,
      suggestions: true,
    }
  } else if (value === 'medical') {
    pdfConfig.value.sections = {
      photos: false,
      indicators: false,
      trends: true,
      lifestyle: false,
      risk: false,
      comparison: true,
      suggestions: true,
    }
  } else {
    pdfConfig.value.sections = { ...DEFAULT_PDF_SECTION_CONFIG }
  }
}

async function confirmExportPdf() {
  isExporting.value = true
  try {
    await generateHealthReportPdf(
      generatedReport.value!,
      keyTrends.value,
      store.indicators,
      pdfConfig.value
    )
    message.success('PDF 导出成功')
    showExportModal.value = false
  } catch (e) {
    console.error(e)
    message.error('PDF 导出失败')
  } finally {
    isExporting.value = false
  }
}

const dimensionOptions = [
  { label: '单次报告', value: 'single' },
  { label: '季度报告', value: 'quarter' },
  { label: '年度报告', value: 'year' },
  { label: '综合报告', value: 'all' },
]

const availableYears = computed<SelectOption[]>(() => {
  return store.yearGroups.map(g => ({
    label: `${g.year}年`,
    value: g.year,
  }))
})

const quarterOptions: SelectOption[] = [
  { label: '第一季度 (1-3月)', value: 1 },
  { label: '第二季度 (4-6月)', value: 2 },
  { label: '第三季度 (7-9月)', value: 3 },
  { label: '第四季度 (10-12月)', value: 4 },
]

const recordOptions = computed<SelectOption[]>(() => {
  return store.records
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(r => {
      const abnormalCount = r.indicators.filter(iv => iv.isAbnormal).length
      return {
        label: `${r.date}${abnormalCount > 0 ? ` (${abnormalCount}项异常)` : ''}`,
        value: r.id,
      }
    })
})

const hasData = computed(() => store.records.length > 0)

function generateReport() {
  if (!hasData.value) {
    message.warning('暂无体检记录，请先添加体检档案')
    return
  }

  isGenerating.value = true

  try {
    const options: { year?: number; quarter?: number; recordId?: string } = {}
    if (selectedDimension.value === 'single' && selectedRecordId.value) {
      options.recordId = selectedRecordId.value
    } else if (selectedDimension.value === 'quarter') {
      options.year = selectedYear.value
      options.quarter = selectedQuarter.value
    } else if (selectedDimension.value === 'year') {
      options.year = selectedYear.value
    }

    generatedReport.value = generateHealthReport(
      store.records,
      store.indicators,
      selectedDimension.value,
      options
    )

    keyTrends.value = getKeyIndicatorTrends(
      generatedReport.value.basicInfo.targetRecords,
      store.indicators
    )

    if (generatedReport.value.basicInfo.recordCount === 0) {
      message.warning('所选时间范围内暂无体检记录')
    } else {
      message.success('报告生成成功')
    }
  } catch (e) {
    console.error(e)
    message.error('报告生成失败')
  } finally {
    isGenerating.value = false
  }
}

async function handleExportPdf() {
  openExportModal()
}

const overallLevelInfo = computed(() => {
  const map = {
    excellent: { label: '优秀', color: '#67C23A', bgColor: '#f0f9eb', description: '您的健康状况非常好，请继续保持！' },
    good: { label: '良好', color: '#4A90D9', bgColor: '#e8f4fd', description: '您的健康状况良好，继续保持健康生活方式。' },
    fair: { label: '一般', color: '#E67E22', bgColor: '#fdf6ec', description: '部分指标需要关注，建议针对性改善。' },
    poor: { label: '较差', color: '#D03050', bgColor: '#fef0f0', description: '建议尽快就医咨询，重视健康管理。' },
  }
  return generatedReport.value ? map[generatedReport.value.overallLevel] : null
})

const gaugeChartOption = computed(() => {
  if (!generatedReport.value) return {}
  const score = generatedReport.value.healthScore
  let color = '#4A90D9'
  if (score >= 90) color = '#67C23A'
  else if (score >= 75) color = '#4A90D9'
  else if (score >= 60) color = '#E67E22'
  else color = '#D03050'

  return {
    series: [
      {
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: '90%',
        center: ['50%', '60%'],
        progress: {
          show: true,
          width: 18,
          itemStyle: {
            color: color,
          },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[1, '#e8f0f8']],
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: {
          offsetCenter: [0, '-10%'],
          fontSize: 14,
          color: '#888',
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '10%'],
          fontSize: 42,
          fontWeight: 'bold' as const,
          color: color,
          formatter: '{value}',
        },
        data: [{ value: score, name: '健康分数' }],
      },
    ],
  }
})

function getTrendChartOption(trend: KeyIndicatorTrend) {
  const dates = trend.points.map(p => p.date)
  const values = trend.points.map(p => p.value)
  const abnormalData = trend.points
    .map((p, i) => p.isAbnormal ? { coord: [dates[i], p.value], value: p.value } as const : null)
    .filter(Boolean)

  return {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.dataIndex ? dates[p.dataIndex] : ''}<br/>${trend.indicatorName}: ${p.value} ${trend.unit}`
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: dates,
      axisLabel: { color: '#888', fontSize: 10, rotate: dates.length > 4 ? 30 : 0 },
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#888', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        type: 'line' as const,
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#4A90D9', width: 2 },
        itemStyle: { color: '#4A90D9' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(74,144,217,0.25)' },
              { offset: 1, color: 'rgba(74,144,217,0.02)' },
            ],
          },
        },
        markPoint: {
          data: abnormalData,
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: '#D03050' },
          label: { show: false },
        },
        markLine: {
          silent: true,
          symbol: 'none' as const,
          data: [
            {
              yAxis: trend.normalRange.min,
              lineStyle: { color: '#67C23A', type: 'dashed' as const, width: 1 },
              label: {
                formatter: `下限 ${trend.normalRange.min}`,
                position: 'insideEndTop' as const,
                color: '#67C23A',
                fontSize: 10,
              },
            },
            {
              yAxis: trend.normalRange.max,
              lineStyle: { color: '#67C23A', type: 'dashed' as const, width: 1 },
              label: {
                formatter: `上限 ${trend.normalRange.max}`,
                position: 'insideEndTop' as const,
                color: '#67C23A',
                fontSize: 10,
              },
            },
          ],
        },
      },
    ],
  }
}

const abnormalColumns = computed<DataTableColumns<AbnormalIndicatorSummary>>(() => [
  {
    title: '指标名称',
    key: 'indicatorName',
    width: 100,
    render: (row) => h('span', { style: { fontWeight: '500' } }, row.indicatorName),
  },
  {
    title: '所属分类',
    key: 'category',
    width: 90,
    render: (row) => h(NTag, { size: 'small', type: 'info' }, () => row.category),
  },
  {
    title: '最新值',
    key: 'latestValue',
    width: 80,
    render: (row) => {
      const text = `${row.latestValue} ${row.unit}`
      return h('span', { style: { color: '#D03050', fontWeight: '600' } }, text)
    },
  },
  {
    title: '正常范围',
    key: 'range',
    width: 110,
    render: (row) => `${row.normalRange.min} ~ ${row.normalRange.max} ${row.unit}`,
  },
  {
    title: '异常次数',
    key: 'count',
    width: 80,
    render: (row) => {
      const type = row.count >= 3 ? 'error' : row.count >= 2 ? 'warning' : 'info'
      return h(NTag, { size: 'small', type }, () => `${row.count}次`)
    },
  },
  {
    title: '趋势',
    key: 'trend',
    width: 80,
    render: (row) => {
      const map: Record<string, { text: string; type: any }> = {
        improving: { text: '好转', type: 'success' },
        worsening: { text: '加重', type: 'error' },
        stable: { text: '稳定', type: 'info' },
      }
      const info = map[row.trend]
      return h(NTag, { size: 'small', type: info.type }, () => info.text)
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      const text = row.direction === 'high' ? '↑ 偏高' : '↓ 偏低'
      return h(NTag, { size: 'small', type: 'error' }, () => text)
    },
  },
])

const systemColumns = computed(() => {
  const cols: DataTableColumns<any> = [
    { title: '指标名称', key: 'name', width: 100 },
    {
      title: '数值',
      key: 'value',
      width: 90,
      render: (row: any) => {
        const text = `${row.value} ${row.unit}`
        const color = row.isAbnormal ? '#D03050' : '#333'
        return h('span', { style: { color, fontWeight: row.isAbnormal ? '600' : '400' } }, text)
      },
    },
    {
      title: '正常范围',
      key: 'range',
      width: 120,
      render: (row: any) => `${row.normalRange.min} ~ ${row.normalRange.max} ${row.unit}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (row: any) => {
        if (row.isAbnormal) {
          const text = row.direction === 'high' ? '↑偏高' : '↓偏低'
          return h(NTag, { size: 'small', type: 'error' }, () => text)
        }
        return h(NTag, { size: 'small', type: 'success' }, () => '正常')
      },
    },
    { title: '健康提示', key: 'healthNote', ellipsis: { tooltip: true } },
  ]
  return cols
})

const compareColumns = computed<DataTableColumns<CompareChangeItem>>(() => [
  { title: '指标名称', key: 'indicatorName', width: 100 },
  {
    title: '上次',
    key: 'previousValue',
    width: 90,
    render: (row) => {
      const text = row.previousValue !== null ? `${row.previousValue} ${row.unit}` : '-'
      const color = row.isPreviousAbnormal ? '#D03050' : '#666'
      return h('span', { style: { color } }, text)
    },
  },
  {
    title: '本次',
    key: 'currentValue',
    width: 90,
    render: (row) => {
      const text = `${row.currentValue} ${row.unit}`
      const color = row.isCurrentAbnormal ? '#D03050' : '#333'
      return h('span', { style: { color, fontWeight: row.isCurrentAbnormal ? '600' : '400' } }, text)
    },
  },
  {
    title: '变化值',
    key: 'changeValue',
    width: 100,
    render: (row) => {
      if (row.previousValue === null) return '-'
      const symbol = row.direction === 'up' ? '+' : row.direction === 'down' ? '-' : ''
      const text = `${symbol}${row.changeValue.toFixed(2)} ${row.unit}`
      const color = row.direction === 'up' ? '#D03050' : row.direction === 'down' ? '#67C23A' : '#999'
      return h('span', { style: { color } }, text)
    },
  },
  {
    title: '变化率',
    key: 'changePercent',
    width: 90,
    render: (row) => {
      if (row.previousValue === null) return '-'
      const symbol = row.direction === 'up' ? '+' : row.direction === 'down' ? '-' : ''
      const text = `${symbol}${row.changePercent.toFixed(1)}%`
      const color = row.direction === 'up' ? '#D03050' : row.direction === 'down' ? '#67C23A' : '#999'
      return h('span', { style: { color } }, text)
    },
  },
  {
    title: '状态变化',
    key: 'statusChange',
    width: 100,
    render: (row) => {
      const map: Record<string, { text: string; type: any }> = {
        normal_to_abnormal: { text: '新异常', type: 'error' },
        abnormal_to_normal: { text: '已恢复', type: 'success' },
        both_abnormal: { text: '持续异常', type: 'warning' },
        both_normal: { text: '均正常', type: 'info' },
      }
      const info = map[row.statusChange]
      return h(NTag, { size: 'small', type: info.type }, () => info.text)
    },
  },
])

const categoryIconMap: Record<HealthSuggestion['category'], any> = {
  lifestyle: Activity,
  diet: Lightbulb,
  exercise: TrendingUp,
  medical: AlertTriangle,
  monitoring: Gauge,
}

const categoryLabelMap: Record<HealthSuggestion['category'], string> = {
  lifestyle: '生活方式',
  diet: '饮食建议',
  exercise: '运动建议',
  medical: '就医建议',
  monitoring: '监测建议',
}

const priorityLabelMap: Record<HealthSuggestion['priority'], string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

const priorityTypeMap: Record<HealthSuggestion['priority'], any> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
}

watch([selectedDimension], () => {
  if (selectedDimension.value === 'single' && store.records.length > 0) {
    const sorted = [...store.records].sort((a, b) => b.date.localeCompare(a.date))
    selectedRecordId.value = sorted[0].id
  } else if (selectedDimension.value === 'year' && store.yearGroups.length > 0) {
    selectedYear.value = store.yearGroups[0].year
  }
  generatedReport.value = null
})

onMounted(() => {
  if (hasData.value) {
    nextTick(() => {
      generateReport()
    })
  }
})
</script>

<template>
  <div style="padding: 24px; background: #f0f7ff; min-height: 100%;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0; display: flex; align-items: center; gap: 10px;">
          <NIcon :size="28" color="#4A90D9"><FileText /></NIcon>
          健康报告自动生成
        </h1>
        <p style="margin: 8px 0 0; color: #888; font-size: 14px;">根据体检记录自动生成结构化健康分析报告，支持多时间维度</p>
      </div>
      <NSpace>
        <NButton
          type="primary"
          :loading="isGenerating"
          :disabled="!hasData"
          @click="generateReport"
        >
          <template #icon>
            <NIcon><RefreshCw /></NIcon>
          </template>
          生成报告
        </NButton>
        <NButton
          :disabled="!generatedReport"
          :loading="isExporting"
          @click="handleExportPdf"
        >
          <template #icon>
            <NIcon><Download /></NIcon>
          </template>
          导出 PDF
        </NButton>
      </NSpace>
    </div>

    <NCard :bordered="false" style="margin-bottom: 20px;">
      <template #header>
        <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
          <NIcon :size="18"><Calendar /></NIcon>
          报告配置
        </span>
      </template>
      <NGrid :cols="4" :x-gap="16" :y-gap="12">
        <NGi>
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">时间维度</div>
          <NButtonGroup>
            <NButton
              v-for="opt in dimensionOptions"
              :key="opt.value"
              :type="selectedDimension === opt.value ? 'primary' : 'default'"
              @click="selectedDimension = opt.value as ReportTimeDimension"
              style="flex: 1;"
            >
              {{ opt.label }}
            </NButton>
          </NButtonGroup>
        </NGi>
        <NGi v-if="selectedDimension === 'year' || selectedDimension === 'quarter'">
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">选择年份</div>
          <NSelect
            v-model:value="selectedYear"
            :options="availableYears"
            placeholder="选择年份"
          />
        </NGi>
        <NGi v-if="selectedDimension === 'quarter'">
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">选择季度</div>
          <NSelect
            v-model:value="selectedQuarter"
            :options="quarterOptions"
            placeholder="选择季度"
          />
        </NGi>
        <NGi v-if="selectedDimension === 'single'">
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">选择体检记录</div>
          <NSelect
            v-model:value="selectedRecordId"
            :options="recordOptions"
            placeholder="选择体检记录"
            filterable
          />
        </NGi>
        <NGi v-if="selectedDimension === 'all'" :span="3">
          <NAlert type="info" style="margin-top: 2px;">
            综合报告模式：分析全部体检记录，生成纵向对比报告
          </NAlert>
        </NGi>
      </NGrid>
    </NCard>

    <NEmpty v-if="!hasData" description="暂无体检记录，请先在体检档案中添加数据" style="padding: 80px 0;" />

    <template v-else-if="generatedReport && generatedReport.basicInfo.recordCount > 0">
      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; font-size: 16px;">
            {{ generatedReport.basicInfo.reportTitle }}
          </span>
        </template>
        <NDescriptions :column="3" bordered size="small" label-placement="left">
          <NDescriptionsItem label="报告标题">{{ generatedReport.basicInfo.reportTitle }}</NDescriptionsItem>
          <NDescriptionsItem label="生成日期">{{ generatedReport.basicInfo.generateDate }}</NDescriptionsItem>
          <NDescriptionsItem label="记录数量">{{ generatedReport.basicInfo.recordCount }} 份</NDescriptionsItem>
          <NDescriptionsItem label="报告范围" :span="2">{{ generatedReport.basicInfo.dateRange }}</NDescriptionsItem>
          <NDescriptionsItem label="时间维度">
            <NTag type="info" size="small">
              {{ dimensionOptions.find(o => o.value === generatedReport.basicInfo.timeDimension)?.label }}
            </NTag>
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><Gauge /></NIcon>
            一、健康总评
          </span>
        </template>
        <NGrid :cols="3" :x-gap="16" :y-gap="12">
          <NGi :span="1">
            <div style="height: 220px;">
              <VChart :option="gaugeChartOption" autoresize style="height: 100%; width: 100%;" />
            </div>
          </NGi>
          <NGi :span="2">
            <NCard :bordered="false" :style="{ backgroundColor: overallLevelInfo?.bgColor || '#f8f9fa', height: '220px' }">
              <div style="display: flex; flex-direction: column; height: 100%; justify-content: center; gap: 16px;">
                <div>
                  <span style="font-size: 14px; color: #666;">健康等级：</span>
                  <span
                    style="font-size: 28px; font-weight: 700; margin-left: 12px;"
                    :style="{ color: overallLevelInfo?.color || '#4A90D9' }"
                  >
                    {{ overallLevelInfo?.label }}
                  </span>
                </div>
                <div style="font-size: 15px; color: #555; line-height: 1.8;">
                  {{ overallLevelInfo?.description }}
                </div>
                <NDivider style="margin: 4px 0;" />
                <NGrid :cols="2" :x-gap="12" :y-gap="8">
                  <NGi>
                    <div style="font-size: 13px; color: #888;">参与分析记录</div>
                    <div style="font-size: 20px; font-weight: 600; color: #333; margin-top: 4px;">
                      {{ generatedReport.basicInfo.recordCount }} <span style="font-size: 13px; font-weight: 400; color: #888;">份</span>
                    </div>
                  </NGi>
                  <NGi>
                    <div style="font-size: 13px; color: #888;">涉及体检系统</div>
                    <div style="font-size: 20px; font-weight: 600; color: #333; margin-top: 4px;">
                      {{ generatedReport.systemAnalysis.length }} <span style="font-size: 13px; font-weight: 400; color: #888;">个</span>
                    </div>
                  </NGi>
                  <NGi>
                    <div style="font-size: 13px; color: #888;">异常指标数量</div>
                    <div style="font-size: 20px; font-weight: 600; color: #333; margin-top: 4px;">
                      <span :style="{ color: generatedReport.abnormalSummary.length > 0 ? '#D03050' : '#67C23A' }">
                        {{ generatedReport.abnormalSummary.length }}
                      </span>
                      <span style="font-size: 13px; font-weight: 400; color: #888;">项</span>
                    </div>
                  </NGi>
                  <NGi>
                    <div style="font-size: 13px; color: #888;">健康建议</div>
                    <div style="font-size: 20px; font-weight: 600; color: #333; margin-top: 4px;">
                      {{ generatedReport.suggestions.length }} <span style="font-size: 13px; font-weight: 400; color: #888;">条</span>
                    </div>
                  </NGi>
                </NGrid>
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </NCard>

      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><AlertTriangle /></NIcon>
            二、异常指标汇总
          </span>
        </template>
        <template v-if="generatedReport.abnormalSummary.length === 0">
          <NAlert type="success" style="margin: 12px 0;">
            恭喜！当前报告周期内未发现异常指标，请继续保持健康的生活方式。
          </NAlert>
        </template>
        <NDataTable
          v-else
          :columns="abnormalColumns"
          :data="generatedReport.abnormalSummary"
          :bordered="false"
          size="small"
          :max-height="360"
        />
      </NCard>

      <NCard v-if="keyTrends.length > 0" :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><TrendingUp /></NIcon>
            三、关键指标趋势图
          </span>
        </template>
        <NGrid :cols="2" :x-gap="16" :y-gap="16">
          <NGi v-for="trend in keyTrends.slice(0, 6)" :key="trend.indicatorId">
            <NCard :bordered="false" size="small" style="background: #fafcff;">
              <div style="font-size: 13px; font-weight: 600; color: #4A90D9; margin-bottom: 4px;">
                {{ trend.indicatorName }}
              </div>
              <div style="height: 180px;">
                <VChart :option="getTrendChartOption(trend)" autoresize style="height: 100%; width: 100%;" />
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </NCard>

      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><Activity /></NIcon>
            四、各系统指标分析
          </span>
        </template>
        <NGrid :cols="1" :y-gap="16">
          <NGi v-for="sys in generatedReport.systemAnalysis" :key="sys.category">
            <NCard :bordered="false" size="small" style="background: #fafcff;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 15px; font-weight: 600; color: #1a6fb5;">
                  {{ sys.category }}
                </span>
                <NSpace>
                  <NTag type="success" size="small">{{ sys.normalCount }} 正常</NTag>
                  <NTag v-if="sys.abnormalCount > 0" type="error" size="small">{{ sys.abnormalCount }} 异常</NTag>
                  <NTag type="info" size="small">异常率 {{ sys.abnormalRate.toFixed(1) }}%</NTag>
                </NSpace>
              </div>
              <NProgress
                type="line"
                :percentage="100 - sys.abnormalRate"
                :indicator-placement="'inside'"
                processing
                :color="sys.abnormalRate >= 30 ? '#D03050' : sys.abnormalRate > 0 ? '#E67E22' : '#67C23A'"
                :rail-color="'#e8f0f8'"
                style="margin-bottom: 12px;"
              />
              <NDataTable
                :columns="systemColumns"
                :data="sys.indicators"
                :bordered="false"
                size="small"
                :max-height="240"
              />
            </NCard>
          </NGi>
        </NGrid>
      </NCard>

      <NCard v-if="generatedReport.compareChanges.length > 0" :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><ArrowLeftRight /></NIcon>
            五、与上次体检对比变化
          </span>
        </template>
        <div style="margin-bottom: 12px; color: #666; font-size: 13px;">
          对比区间：{{ generatedReport.compareChanges[0].previousDate }} → {{ generatedReport.compareChanges[0].currentDate }}
        </div>
        <NDataTable
          :columns="compareColumns"
          :data="generatedReport.compareChanges"
          :bordered="false"
          size="small"
          :max-height="400"
        />
      </NCard>

      <NCard :bordered="false" style="margin-bottom: 20px;">
        <template #header>
          <span style="font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
            <NIcon :size="18"><Lightbulb /></NIcon>
            六、健康建议提示
          </span>
        </template>
        <NGrid :cols="1" :y-gap="12">
          <NGi v-for="(sug, idx) in generatedReport.suggestions" :key="idx">
            <NCard :bordered="false" size="small" style="background: #f8fafc;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div
                  :style="{
                    width: '4px',
                    borderRadius: '2px',
                    alignSelf: 'stretch',
                    minHeight: '50px',
                    backgroundColor: sug.priority === 'high' ? '#D03050' : sug.priority === 'medium' ? '#E67E22' : '#4A90D9',
                  }"
                />
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 14px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 6px;">
                      <NIcon :size="16" :color="sug.priority === 'high' ? '#D03050' : sug.priority === 'medium' ? '#E67E22' : '#4A90D9'">
                        <component :is="categoryIconMap[sug.category]" />
                      </NIcon>
                      {{ sug.title }}
                    </span>
                    <NSpace>
                      <NTag :type="priorityTypeMap[sug.priority]" size="small">{{ priorityLabelMap[sug.priority] }}</NTag>
                      <NTag type="info" size="small">{{ categoryLabelMap[sug.category] }}</NTag>
                    </NSpace>
                  </div>
                  <div style="color: #555; font-size: 14px; line-height: 1.7;">
                    {{ sug.content }}
                  </div>
                </div>
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </NCard>

      <NCard :bordered="false">
        <NAlert type="info" show-icon>
          <template #header>声明</template>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8; color: #666;">
            <li>本报告基于您录入的体检数据自动生成，仅供参考，不作为诊断依据。</li>
            <li>如有异常指标或身体不适，请及时咨询专业医生并进行进一步检查。</li>
            <li>报告生成时间：{{ generatedReport.basicInfo.generateDate }}</li>
          </ul>
        </NAlert>
      </NCard>
    </template>

    <NEmpty
      v-else-if="hasData && (!generatedReport || generatedReport.basicInfo.recordCount === 0)"
      :description="generatedReport ? '所选时间范围内暂无体检记录，请选择其他时间范围' : '请点击上方「生成报告」按钮生成报告'"
      style="padding: 80px 0;"
    />

    <NModal
      v-model:show="showExportModal"
      preset="dialog"
      title="PDF 导出设置"
      :mask-closable="false"
      :content-style="{ width: '680px', maxWidth: '90vw', maxHeight: '85vh' }"
      :body-style="{ padding: '0 0 16px 0', maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }"
      positive-text="确认导出"
      negative-text="取消"
      :loading="isExporting"
      @positive-click="confirmExportPdf"
      @negative-click="closeExportModal"
    >
      <div style="padding: 0 24px; box-sizing: border-box; width: 100%;">
        <NTabs v-model:value="activeTab" type="line" style="width: 100%;">
          <NTabPane name="template" tab="报告模板">
            <div style="padding: 16px 0; width: 100%; box-sizing: border-box;">
              <NGrid :cols="1" :y-gap="16" style="width: 100%;">
                <NGi v-for="opt in REPORT_TEMPLATE_OPTIONS" :key="opt.value">
                  <div
                    :style="{
                      padding: '16px',
                      borderRadius: '8px',
                      border: pdfConfig.template === opt.value ? '2px solid #4A90D9' : '1px solid #e0e0e0',
                      backgroundColor: pdfConfig.template === opt.value ? '#f0f7ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      width: '100%',
                    }"
                    @click="pdfConfig.template = opt.value as ReportTemplateType; onTemplateChange(opt.value as ReportTemplateType)"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 16px; font-weight: 600; color: #333;">{{ opt.label }}</span>
                      <NCheckbox :checked="pdfConfig.template === opt.value" @update:checked="() => { pdfConfig.template = opt.value as ReportTemplateType; onTemplateChange(opt.value as ReportTemplateType); }" />
                    </div>
                    <div style="font-size: 13px; color: #666; line-height: 1.6; word-break: break-all;">{{ opt.description }}</div>
                  </div>
                </NGi>
              </NGrid>
            </div>
          </NTabPane>

          <NTabPane name="cover" tab="自定义封面">
            <div style="padding: 16px 0; width: 100%; box-sizing: border-box;">
              <NForm label-placement="left" label-width="100px" style="width: 100%;">
                <NFormItem label="家庭名称" label-placement="left">
                  <NInput
                    v-model:value="pdfConfig.cover.familyName"
                    placeholder="例如：王家健康档案"
                    clearable
                    style="width: 100%;"
                  />
                </NFormItem>
                <NFormItem label="副标题" label-placement="left">
                  <NInput
                    v-model:value="pdfConfig.cover.subtitle"
                    placeholder="例如：2024年度健康总结"
                    clearable
                    style="width: 100%;"
                  />
                </NFormItem>
                <NFormItem label="头像/Logo" label-placement="left">
                  <div v-if="logoPreviewUrl" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #f9f9f9;">
                      <img :src="logoPreviewUrl" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </div>
                    <NSpace>
                      <NButton size="small" @click="removeLogo">
                        <template #icon>
                          <NIcon><X /></NIcon>
                        </template>
                        移除
                      </NButton>
                    </NSpace>
                  </div>
                  <NUpload
                    v-else
                    :custom-request="handleLogoUpload"
                    :show-file-list="false"
                    accept="image/*"
                    style="width: 100%;"
                  >
                    <NUploadDragger style="padding: 20px; width: 100%; box-sizing: border-box;">
                      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <NIcon :size="28" color="#999"><Upload /></NIcon>
                        <div style="font-size: 14px; color: #666;">点击或拖拽上传头像/Logo</div>
                        <div style="font-size: 12px; color: #999;">支持 JPG、PNG 格式，大小不超过 2MB</div>
                      </div>
                    </NUploadDragger>
                  </NUpload>
                </NFormItem>
              </NForm>
            </div>
          </NTabPane>

          <NTabPane name="sections" tab="章节选择">
            <div style="padding: 16px 0; width: 100%; box-sizing: border-box;">
              <div style="font-size: 13px; color: #666; margin-bottom: 12px;">勾选需要包含在 PDF 报告中的章节：</div>
              <NGrid :cols="1" :y-gap="12" style="width: 100%;">
                <NGi v-for="opt in REPORT_SECTION_OPTIONS" :key="opt.value">
                  <div style="display: flex; align-items: flex-start; gap: 8px; width: 100%; box-sizing: border-box;">
                    <NCheckbox
                      :checked="pdfConfig.sections[opt.value]"
                      @update:checked="(v: boolean) => { pdfConfig.sections[opt.value] = v }"
                    />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 14px; font-weight: 500; color: #333; word-break: break-all;">{{ opt.label }}</div>
                      <div style="font-size: 12px; color: #999; margin-top: 2px; word-break: break-all;">{{ opt.description }}</div>
                    </div>
                  </div>
                </NGi>
              </NGrid>
            </div>
          </NTabPane>

          <NTabPane name="headerFooter" tab="页眉页脚">
            <div style="padding: 16px 0; width: 100%; box-sizing: border-box;">
              <NForm label-placement="left" label-width="120px" style="width: 100%;">
                <NFormItem label="页眉文字" label-placement="left">
                  <NInput
                    v-model:value="pdfConfig.headerFooter.headerText"
                    placeholder="例如：XX 家庭健康档案"
                    clearable
                    style="width: 100%;"
                  />
                </NFormItem>
                <NFormItem label="显示页码" label-placement="left">
                  <NSwitch v-model:value="pdfConfig.headerFooter.showPageNumber" />
                </NFormItem>
                <NFormItem label="显示生成日期" label-placement="left">
                  <NSwitch v-model:value="pdfConfig.headerFooter.showGenerateDate" />
                </NFormItem>
                <NFormItem label="页脚文字" label-placement="left">
                  <NInput
                    v-model:value="pdfConfig.headerFooter.footerText"
                    placeholder="例如：机密文件 请勿外传"
                    clearable
                    style="width: 100%;"
                  />
                </NFormItem>
              </NForm>
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </NModal>
  </div>
</template>
