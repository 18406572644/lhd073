<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  NInput,
  NCard,
  NSpace,
  NSelect,
  NButton,
  NDataTable,
  NTag,
  NEmpty,
  NPagination,
} from 'naive-ui'
import { useHealthStore } from '@/stores/health'
import type { DataTableColumns } from 'naive-ui'

const store = useHealthStore()

const searchQuery = ref('')
const yearFilter = ref<number[]>([])
const categoryFilter = ref<string[]>([])
const statusFilter = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = ref(15)
const sortKey = ref<string | null>(null)
const sortOrder = ref<'ascend' | 'descend' | false>(false)

const yearOptions = computed(() => {
  const years = Array.from(new Set(store.records.map(r => r.year))).sort((a, b) => b - a)
  return years.map(y => ({ label: `${y}年`, value: y }))
})

const categoryOptions = computed(() => {
  const cats = Array.from(new Set(store.indicators.map(i => i.category))).sort()
  return cats.map(c => ({ label: c, value: c }))
})

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '异常', value: 'abnormal' },
]

interface TableRow {
  indicatorName: string
  category: string
  value: number
  unit: string
  normalRange: string
  isAbnormal: boolean
  date: string
  year: number
  healthNote: string
}

const allRows = computed<TableRow[]>(() => {
  const rows: TableRow[] = []
  for (const record of store.records) {
    for (const iv of record.indicators) {
      const ind = store.getIndicator(iv.indicatorId)
      if (!ind) continue
      rows.push({
        indicatorName: ind.name,
        category: ind.category,
        value: iv.value,
        unit: ind.unit,
        normalRange: `${ind.normalRange.min} - ${ind.normalRange.max}`,
        isAbnormal: iv.isAbnormal,
        date: record.date,
        year: record.year,
        healthNote: iv.healthNote,
      })
    }
  }
  return rows
})

const filteredRows = computed<TableRow[]>(() => {
  let result = allRows.value

  if (searchQuery.value.trim()) {
    const matched = store.searchIndicators(searchQuery.value.trim())
    const matchedNames = new Set(matched.map(i => i.name))
    result = result.filter(row => matchedNames.has(row.indicatorName))
  }

  if (yearFilter.value.length > 0) {
    result = result.filter(row => yearFilter.value.includes(row.year))
  }

  if (categoryFilter.value.length > 0) {
    result = result.filter(row => categoryFilter.value.includes(row.category))
  }

  if (statusFilter.value === 'normal') {
    result = result.filter(row => !row.isAbnormal)
  } else if (statusFilter.value === 'abnormal') {
    result = result.filter(row => row.isAbnormal)
  }

  return result
})

const sortedRows = computed<TableRow[]>(() => {
  if (!sortKey.value || !sortOrder.value) return filteredRows.value
  const data = [...filteredRows.value]
  const key = sortKey.value as keyof TableRow
  const dir = sortOrder.value === 'ascend' ? 1 : -1
  data.sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
  return data
})

const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

const paginatedRows = computed<TableRow[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedRows.value.slice(start, start + pageSize.value)
})

function onSorterChange(sorter: any) {
  if (!sorter || sorter.order === false) {
    sortKey.value = null
    sortOrder.value = false
  } else {
    sortKey.value = sorter.columnKey as string
    sortOrder.value = sorter.order as 'ascend' | 'descend'
  }
}

function resetFilters() {
  searchQuery.value = ''
  yearFilter.value = []
  categoryFilter.value = []
  statusFilter.value = null
  currentPage.value = 1
}

function onPageChange(page: number) {
  currentPage.value = page
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

const columns: DataTableColumns<TableRow> = [
  {
    title: '指标名称',
    key: 'indicatorName',
    sorter: true,
    width: 120,
  },
  {
    title: '分类',
    key: 'category',
    sorter: true,
    width: 100,
  },
  {
    title: '数值',
    key: 'value',
    sorter: true,
    width: 80,
    render: (row: TableRow) =>
      h('span', {
        style: { color: row.isAbnormal ? '#d03050' : '#333', fontWeight: row.isAbnormal ? '600' : '400' },
      }, String(row.value)),
  },
  {
    title: '单位',
    key: 'unit',
    width: 70,
  },
  {
    title: '正常范围',
    key: 'normalRange',
    width: 120,
  },
  {
    title: '状态',
    key: 'isAbnormal',
    sorter: true,
    width: 80,
    render: (row: TableRow) =>
      row.isAbnormal
        ? h(NTag, { type: 'error', size: 'small' }, () => '异常')
        : h(NTag, { type: 'success', size: 'small' }, () => '正常'),
  },
  {
    title: '日期',
    key: 'date',
    sorter: true,
    width: 110,
  },
  {
    title: '健康备注',
    key: 'healthNote',
    ellipsis: { tooltip: true },
  },
]

function rowProps(row: TableRow) {
  return {
    style: row.isAbnormal ? 'background-color: #FEF0F0;' : '',
  }
}
</script>

<template>
  <div style="padding: 24px; background: #f0f7ff; min-height: 100%; box-sizing: border-box;">
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 22px; font-weight: 600; color: #1a6fb5; margin: 0;">检索筛选</h1>
      <p style="margin: 6px 0 0; color: #7eb8e0; font-size: 14px;">快速查找体检指标数据</p>
    </div>

    <NInput
      v-model:value="searchQuery"
      placeholder="搜索指标名称..."
      clearable
      size="large"
      style="margin-bottom: 16px;"
    >
      <template #prefix>
        <span style="color: #a0aec0;">🔍</span>
      </template>
    </NInput>

    <NCard :bordered="false" size="small" style="margin-bottom: 16px;">
      <NSpace align="center" :wrap="true">
        <span style="font-size: 13px; color: #666; white-space: nowrap;">年份：</span>
        <NSelect
          v-model:value="yearFilter"
          multiple
          :options="yearOptions"
          placeholder="选择年份"
          style="min-width: 180px;"
          size="small"
        />
        <span style="font-size: 13px; color: #666; white-space: nowrap;">分类：</span>
        <NSelect
          v-model:value="categoryFilter"
          multiple
          :options="categoryOptions"
          placeholder="选择分类"
          style="min-width: 180px;"
          size="small"
        />
        <span style="font-size: 13px; color: #666; white-space: nowrap;">状态：</span>
        <NSelect
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="选择状态"
          style="min-width: 120px;"
          size="small"
        />
        <NButton size="small" @click="resetFilters">重置筛选</NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false" style="margin-bottom: 16px;">
      <NDataTable
        v-if="paginatedRows.length > 0"
        :columns="columns"
        :data="paginatedRows"
        :bordered="false"
        size="small"
        :row-props="rowProps"
        :single-sort="true"
        @update:sorter="onSorterChange"
      />
      <NEmpty v-else description="未找到匹配的指标数据" />
    </NCard>

    <NSpace v-if="totalRows > 0" justify="end">
      <NPagination
        :page="currentPage"
        :page-count="totalPages"
        :page-size="pageSize"
        :page-sizes="[10, 15, 20, 50]"
        show-size-picker
        @update:page="onPageChange"
        @update:page-size="onPageSizeChange"
      />
    </NSpace>
  </div>
</template>
