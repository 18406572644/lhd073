<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NMenu,
  NButton,
  NSpace,
  NModal,
  NCard,
  NDatePicker,
  NInput,
  NInputNumber,
  NUpload,
  NImage,
  NImageGroup,
  NDataTable,
  NCollapse,
  NCollapseItem,
  NTag,
  NPopconfirm,
  NEmpty,
  NGrid,
  NGi,
  NScrollbar,
  NDescriptions,
  NDescriptionsItem,
} from 'naive-ui'
import { useHealthStore } from '@/stores/health'
import type { ExamRecord, IndicatorValue, PhotoRecord } from '@/types'

const store = useHealthStore()
const message = useMessage()

const selectedYear = ref<number | null>(null)
const selectedRecordId = ref<string | null>(null)
const showFormModal = ref(false)
const isEditing = ref(false)
const formLoading = ref(false)

const formDate = ref<number | null>(null)
const formNotes = ref('')
const formPhotos = ref<PhotoRecord[]>([])
const formIndicators = ref<IndicatorValue[]>([])
const formRecordId = ref('')

const yearMenuOptions = computed(() =>
  store.yearGroups.map(g => ({
    label: `${g.year}年 (${g.records.length}条)`,
    key: g.year,
  }))
)

const selectedRecord = computed(() => {
  if (!selectedRecordId.value) return null
  return store.records.find(r => r.id === selectedRecordId.value) || null
})

const indicatorCategories = computed(() => {
  const cats = new Set(store.indicators.map(i => i.category))
  return Array.from(cats)
})

const indicatorsByCategory = computed(() => {
  const map = new Map<string, typeof store.indicators>()
  for (const cat of indicatorCategories.value) {
    map.set(cat, store.indicators.filter(i => i.category === cat))
  }
  return map
})

function getFormIndicatorValue(indicatorId: string): number | null {
  const iv = formIndicators.value.find(v => v.indicatorId === indicatorId)
  return iv ? iv.value : null
}

function getFormHealthNote(indicatorId: string): string {
  const iv = formIndicators.value.find(v => v.indicatorId === indicatorId)
  return iv ? iv.healthNote : ''
}

function onIndicatorInput(indicatorId: string, value: number | null) {
  const idx = formIndicators.value.findIndex(v => v.indicatorId === indicatorId)
  const ind = store.getIndicator(indicatorId)
  if (!ind) return
  if (value === null) {
    if (idx >= 0) formIndicators.value.splice(idx, 1)
    return
  }
  const isAbnormal = store.checkAbnormal(indicatorId, value)
  if (idx >= 0) {
    formIndicators.value[idx].value = value
    formIndicators.value[idx].isAbnormal = isAbnormal
  } else {
    formIndicators.value.push({ indicatorId, value, isAbnormal, healthNote: '' })
  }
}

function onHealthNoteInput(indicatorId: string, note: string) {
  const idx = formIndicators.value.findIndex(v => v.indicatorId === indicatorId)
  if (idx >= 0) {
    formIndicators.value[idx].healthNote = note
  }
}

function getAbnormalDirection(indicatorId: string, value: number): string {
  const ind = store.getIndicator(indicatorId)
  if (!ind) return ''
  if (value > ind.normalRange.max) return '偏高'
  if (value < ind.normalRange.min) return '偏低'
  return ''
}

function isIndicatorAbnormalInForm(indicatorId: string): boolean {
  const iv = formIndicators.value.find(v => v.indicatorId === indicatorId)
  return iv ? iv.isAbnormal : false
}

function onYearSelect(key: number) {
  selectedYear.value = key
  selectedRecordId.value = null
}

function onRecordClick(record: ExamRecord) {
  selectedRecordId.value = record.id
}

function openNewForm() {
  isEditing.value = false
  formRecordId.value = ''
  formDate.value = Date.now()
  formNotes.value = ''
  formPhotos.value = []
  formIndicators.value = []
  showFormModal.value = true
}

function openEditForm(record: ExamRecord) {
  isEditing.value = true
  formRecordId.value = record.id
  formDate.value = new Date(record.date).getTime()
  formNotes.value = record.notes
  formPhotos.value = [...record.photos]
  formIndicators.value = record.indicators.map(iv => ({ ...iv }))
  showFormModal.value = true
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2)
}

async function handleSubmit() {
  if (!formDate.value) {
    message.warning('请选择体检日期')
    return
  }
  formLoading.value = true
  const dateStr = new Date(formDate.value).toISOString().slice(0, 10)
  const year = new Date(formDate.value).getFullYear()
  const record: ExamRecord = {
    id: isEditing.value ? formRecordId.value : generateId(),
    year,
    date: dateStr,
    photos: formPhotos.value,
    indicators: formIndicators.value,
    notes: formNotes.value,
  }
  try {
    if (isEditing.value) {
      await store.updateRecord(record)
      message.success('记录已更新')
    } else {
      await store.addRecord(record)
      message.success('记录已创建')
    }
    showFormModal.value = false
    selectedYear.value = year
    selectedRecordId.value = record.id
  } catch {
    message.error('保存失败')
  }
  formLoading.value = false
}

async function handleDelete(id: string) {
  try {
    await store.removeRecord(id)
    message.success('记录已删除')
    selectedRecordId.value = null
  } catch {
    message.error('删除失败')
  }
}

function handleUpload({ file }: { file: { file: File } }) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    const photo: PhotoRecord = {
      id: generateId(),
      recordId: formRecordId.value || generateId(),
      dataUrl,
      fileName: file.file.name,
    }
    formPhotos.value.push(photo)
  }
  reader.readAsDataURL(file.file)
}

function removeFormPhoto(photoId: string) {
  formPhotos.value = formPhotos.value.filter(p => p.id !== photoId)
}

const detailColumns = [
  { title: '指标名称', key: 'name', width: 120 },
  {
    title: '数值',
    key: 'value',
    width: 80,
    render: (row: any) => h('span', {
      style: { color: row.isAbnormal ? '#d03050' : '#333', fontWeight: row.isAbnormal ? '600' : '400' }
    }, String(row.value)),
  },
  { title: '单位', key: 'unit', width: 60 },
  { title: '正常范围', key: 'range', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row: any) => {
      if (row.isAbnormal) {
        const dir = getAbnormalDirection(row.indicatorId, row.value)
        return h(NTag, { type: 'error', size: 'small' }, () => dir === '偏高' ? '↑偏高' : '↓偏低')
      }
      return h(NTag, { type: 'success', size: 'small' }, () => '正常')
    },
  },
  { title: '健康提示', key: 'healthNote' },
]

const detailData = computed(() => {
  if (!selectedRecord.value) return []
  return selectedRecord.value.indicators.map(iv => {
    const ind = store.getIndicator(iv.indicatorId)
    return {
      name: ind?.name || iv.indicatorId,
      value: iv.value,
      unit: ind?.unit || '',
      range: ind ? `${ind.normalRange.min} - ${ind.normalRange.max}` : '',
      healthNote: iv.healthNote,
      indicatorId: iv.indicatorId,
      isAbnormal: iv.isAbnormal,
    }
  })
})

const currentYearRecords = computed(() => {
  if (selectedYear.value === null) return []
  const group = store.yearGroups.find(g => g.year === selectedYear.value)
  return group ? group.records : []
})
</script>

<template>
  <div style="display: flex; height: 100%; background: #f0f7ff;">
    <div style="width: 280px; background: #fff; border-right: 1px solid #e0efff; display: flex; flex-direction: column; flex-shrink: 0;">
      <div style="padding: 16px;">
        <NButton type="primary" block @click="openNewForm">新建档案</NButton>
      </div>
      <NScrollbar style="flex: 1;">
        <NMenu
          :value="selectedYear"
          :options="yearMenuOptions"
          @update:value="onYearSelect"
        />
      </NScrollbar>
    </div>

    <div style="flex: 1; overflow: auto; padding: 24px;">
      <template v-if="!selectedRecord">
        <div v-if="selectedYear && currentYearRecords.length > 0">
          <NCard
            v-for="record in currentYearRecords"
            :key="record.id"
            :bordered="false"
            style="margin-bottom: 12px; cursor: pointer;"
            hoverable
            @click="onRecordClick(record)"
          >
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; color: #1a6fb5;">{{ record.date }}</span>
              <NSpace>
                <NTag v-if="record.indicators.filter(iv => iv.isAbnormal).length > 0" type="error" size="small">
                  {{ record.indicators.filter(iv => iv.isAbnormal).length }}项异常
                </NTag>
                <NTag type="info" size="small">{{ record.indicators.length }}项指标</NTag>
                <NTag v-if="record.photos.length" type="info" size="small">{{ record.photos.length }}张照片</NTag>
              </NSpace>
            </div>
            <div v-if="record.notes" style="margin-top: 8px; color: #666; font-size: 13px;">{{ record.notes }}</div>
          </NCard>
        </div>
        <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%;">
          <NEmpty description="选择年份查看档案" />
        </div>
      </template>

      <template v-else>
        <NCard :bordered="false" style="margin-bottom: 16px;">
          <template #header>
            <span style="font-size: 18px; font-weight: 600; color: #1a6fb5;">{{ selectedRecord!.date }} 体检记录</span>
          </template>
          <template #header-extra>
            <NSpace>
              <NButton type="primary" size="small" @click="openEditForm(selectedRecord!)">编辑</NButton>
              <NPopconfirm @positive-click="handleDelete(selectedRecord!.id)">
                <template #trigger>
                  <NButton type="error" size="small">删除</NButton>
                </template>
                确定要删除这条体检记录吗？
              </NPopconfirm>
            </NSpace>
          </template>
          <NDescriptions :column="1" label-placement="left" bordered>
            <NDescriptionsItem label="体检日期">{{ selectedRecord!.date }}</NDescriptionsItem>
            <NDescriptionsItem label="备注">{{ selectedRecord!.notes || '无' }}</NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <NCard v-if="selectedRecord!.photos.length > 0" :bordered="false" style="margin-bottom: 16px;">
          <template #header>
            <span style="color: #1a6fb5;">体检照片</span>
          </template>
          <NImageGroup>
            <NSpace>
              <NImage
                v-for="photo in selectedRecord!.photos"
                :key="photo.id"
                :src="photo.dataUrl"
                :width="120"
                :height="120"
                object-fit="cover"
                style="border-radius: 8px; border: 1px solid #e0efff;"
              />
            </NSpace>
          </NImageGroup>
        </NCard>

        <NCard v-if="selectedRecord!.indicators.length > 0" :bordered="false">
          <template #header>
            <span style="color: #1a6fb5;">检查指标</span>
          </template>
          <NDataTable
            :columns="detailColumns"
            :data="detailData"
            :bordered="false"
            size="small"
          />
        </NCard>
      </template>
    </div>

    <NModal v-model:show="showFormModal" preset="card" title="新建体检记录" style="width: 720px; max-height: 85vh;" :mask-closable="false">
      <NScrollbar style="max-height: 65vh; padding-right: 8px;">
        <NCard :bordered="false" size="small" style="margin-bottom: 12px;">
          <NGrid :cols="1" :y-gap="12">
            <NGi>
              <div style="margin-bottom: 4px; color: #333; font-size: 13px;">体检日期</div>
              <NDatePicker v-model:value="formDate" type="date" style="width: 100%;" />
            </NGi>
            <NGi>
              <div style="margin-bottom: 4px; color: #333; font-size: 13px;">备注</div>
              <NInput v-model:value="formNotes" type="textarea" :rows="3" placeholder="输入备注信息" />
            </NGi>
          </NGrid>
        </NCard>

        <NCard :bordered="false" size="small" style="margin-bottom: 12px;">
          <div style="margin-bottom: 8px; color: #333; font-size: 13px; font-weight: 600;">体检照片</div>
          <NUpload
            :custom-request="handleUpload"
            :show-file-list="false"
            accept="image/*"
            multiple
          >
            <NButton size="small">上传照片</NButton>
          </NUpload>
          <div v-if="formPhotos.length" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
            <div v-for="photo in formPhotos" :key="photo.id" style="position: relative;">
              <NImage :src="photo.dataUrl" :width="80" :height="80" object-fit="cover" style="border-radius: 6px; border: 1px solid #e0efff;" />
              <NButton
                size="tiny"
                type="error"
                circle
                style="position: absolute; top: -6px; right: -6px;"
                @click="removeFormPhoto(photo.id)"
              >×</NButton>
            </div>
          </div>
        </NCard>

        <NCard :bordered="false" size="small">
          <div style="margin-bottom: 8px; color: #333; font-size: 13px; font-weight: 600;">检查指标</div>
          <NCollapse>
            <NCollapseItem
              v-for="category in indicatorCategories"
              :key="category"
              :title="category"
              :name="category"
            >
              <NGrid :cols="1" :y-gap="8">
                <NGi v-for="ind in indicatorsByCategory.get(category)" :key="ind.id">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="min-width: 80px; font-size: 13px; color: #333;">{{ ind.name }}</span>
                    <NInputNumber
                      :value="getFormIndicatorValue(ind.id)"
                      @update:value="(v: number | null) => onIndicatorInput(ind.id, v)"
                      :placeholder="`${ind.normalRange.min}-${ind.normalRange.max}`"
                      size="small"
                      :style="{ width: '120px', '--n-border': isIndicatorAbnormalInForm(ind.id) ? '1px solid #d03050' : undefined }"
                    />
                    <span style="font-size: 12px; color: #999;">{{ ind.unit }}</span>
                    <span style="font-size: 11px; color: #bbb;">({{ ind.normalRange.min }}-{{ ind.normalRange.max }})</span>
                    <NTag v-if="isIndicatorAbnormalInForm(ind.id) && getFormIndicatorValue(ind.id) !== null" type="error" size="small">
                      {{ getAbnormalDirection(ind.id, getFormIndicatorValue(ind.id)!) === '偏高' ? '↑偏高' : '↓偏低' }}
                    </NTag>
                    <NInput
                      :value="getFormHealthNote(ind.id)"
                      @update:value="(v: string) => onHealthNoteInput(ind.id, v)"
                      placeholder="健康提示"
                      size="small"
                      style="width: 120px;"
                    />
                  </div>
                </NGi>
              </NGrid>
            </NCollapseItem>
          </NCollapse>
        </NCard>
      </NScrollbar>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showFormModal = false">取消</NButton>
          <NButton type="primary" :loading="formLoading" @click="handleSubmit">{{ isEditing ? '保存' : '创建' }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
