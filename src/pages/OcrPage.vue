<script setup lang="ts">
import { ref, computed, h, watch } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import {
  NUpload,
  NButton,
  NSpace,
  NCard,
  NImage,
  NDataTable,
  NTag,
  NProgress,
  NEmpty,
  NGrid,
  NGi,
  NInputNumber,
  NInput,
  NDescriptions,
  NDescriptionsItem,
  NIcon,
  NBadge,
  NDatePicker,
  NModal,
  NScrollbar,
  NAlert,
  NSwitch,
  NText,
} from 'naive-ui'
import {
  Upload,
  Scan,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit3,
  Save,
  Trash2,
  Eye,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'
import { useHealthStore } from '@/stores/health'
import type { OcrPhotoItem, OcrIndicatorResult, OcrTemplateMatch, ExamRecord, PhotoRecord, IndicatorValue } from '@/types'
import {
  recognizeIndicators,
  createOcrPhotoItem,
  mergeOcrResultsToIndicators,
  calculateBatchStats,
} from '@/utils/ocr'
import { isAbnormalValue } from '@/api/mock'

const store = useHealthStore()
const message = useMessage()
const dialog = useDialog()

const photos = ref<OcrPhotoItem[]>([])
const selectedPhotoId = ref<string | null>(null)
const isRecognizing = ref(false)
const showSaveModal = ref(false)
const saveLoading = ref(false)
const expandedPhotos = ref<Set<string>>(new Set())
const showRawText = ref(false)
const currentRawText = ref('')
const currentTemplate = ref<OcrTemplateMatch | null>(null)

const formDate = ref<number | null>(Date.now())
const formNotes = ref('')

const selectedPhoto = computed(() => {
  if (!selectedPhotoId.value) return null
  return photos.value.find(p => p.id === selectedPhotoId.value) || null
})

const batchStats = computed(() => calculateBatchStats(photos.value))

const allResults = computed(() => {
  if (!selectedPhoto.value) return []
  return selectedPhoto.value.results
})

const lowConfidenceResults = computed(() =>
  allResults.value.filter(r => r.isLowConfidence)
)

const abnormalResults = computed(() =>
  allResults.value.filter(r => r.isAbnormal)
)

const canRecognize = computed(() =>
  photos.value.some(p => p.status === 'pending') && !isRecognizing.value
)

const canSave = computed(() =>
  photos.value.some(p => p.status === 'success' && p.results.length > 0)
)

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'heic', 'heif']

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext && IMAGE_EXTENSIONS.includes(ext)) return true
  return false
}

function handleUpload({ file }: { file: { file: File } }) {
  const f = file.file
  if (!isImageFile(f)) {
    message.warning(`文件 ${f.name} 不是图片格式，已自动跳过`)
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    const photo = createOcrPhotoItem(f, dataUrl)
    photos.value.push(photo)
    if (!selectedPhotoId.value) {
      selectedPhotoId.value = photo.id
    }
  }
  reader.onerror = () => {
    message.error(`文件 ${f.name} 读取失败`)
  }
  reader.readAsDataURL(f)
}

async function handleRecognize() {
  if (!canRecognize.value) return
  isRecognizing.value = true

  const pendingPhotos = photos.value.filter(p => p.status === 'pending')

  for (const photo of pendingPhotos) {
    photo.status = 'recognizing'
    photo.progress = 0

    try {
      const { results, template, rawText } = await recognizeIndicators(
        photo.dataUrl,
        store.indicators,
        (progress) => {
          photo.progress = progress
        }
      )
      photo.results = results
      photo.status = 'success'
      if (selectedPhotoId.value === photo.id) {
        currentTemplate.value = template
        currentRawText.value = rawText
      }
      message.success(`成功识别 ${photo.fileName}，共 ${results.length} 项指标`)
    } catch (error) {
      photo.status = 'failed'
      photo.error = error instanceof Error ? error.message : '识别失败'
      message.error(`识别 ${photo.fileName} 失败: ${photo.error}`)
    }
  }

  isRecognizing.value = false
}

async function handleReRecognize(photo: OcrPhotoItem) {
  photo.status = 'recognizing'
  photo.progress = 0

  try {
    const { results, template, rawText } = await recognizeIndicators(
      photo.dataUrl,
      store.indicators,
      (progress) => {
        photo.progress = progress
      }
    )
    photo.results = results
    photo.status = 'success'
    photo.error = undefined
    if (selectedPhotoId.value === photo.id) {
      currentTemplate.value = template
      currentRawText.value = rawText
    }
    message.success(`重新识别成功，共 ${results.length} 项指标`)
  } catch (error) {
    photo.status = 'failed'
    photo.error = error instanceof Error ? error.message : '识别失败'
    message.error(`重新识别失败: ${photo.error}`)
  }
}

function selectPhoto(photoId: string) {
  selectedPhotoId.value = photoId
  const photo = photos.value.find(p => p.id === photoId)
  if (photo && photo.status === 'success') {
    showRawText.value = false
  }
}

function togglePhotoExpand(photoId: string) {
  if (expandedPhotos.value.has(photoId)) {
    expandedPhotos.value.delete(photoId)
  } else {
    expandedPhotos.value.add(photoId)
  }
  expandedPhotos.value = new Set(expandedPhotos.value)
}

function removePhoto(photoId: string) {
  const idx = photos.value.findIndex(p => p.id === photoId)
  if (idx >= 0) {
    photos.value.splice(idx, 1)
    if (selectedPhotoId.value === photoId) {
      selectedPhotoId.value = photos.value[0]?.id || null
    }
    message.success('已移除照片')
  }
}

function onResultValueChange(result: OcrIndicatorResult, value: number | null) {
  if (value === null) {
    result.value = null
    result.isAbnormal = false
  } else {
    result.value = value
    const ind = store.getIndicator(result.indicatorId)
    if (ind) {
      result.isAbnormal = isAbnormalValue(ind, value)
    }
  }
  result.isEdited = true
}

function onResultNoteChange(result: OcrIndicatorResult, note: string) {
  result.healthNote = note
  result.isEdited = true
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'success'
  if (confidence >= 0.7) return 'info'
  if (confidence >= 0.5) return 'warning'
  return 'error'
}

function getConfidenceText(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

function getAbnormalDirection(indicatorId: string, value: number): string {
  const ind = store.getIndicator(indicatorId)
  if (!ind) return ''
  if (value > ind.normalRange.max) return '偏高'
  if (value < ind.normalRange.min) return '偏低'
  return ''
}

function showAllRawText() {
  if (selectedPhoto.value) {
    showRawText.value = true
  }
}

function openSaveModal() {
  if (!canSave.value) {
    message.warning('没有可保存的识别结果')
    return
  }
  showSaveModal.value = true
}

function clearAll() {
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有已上传的照片和识别结果吗？',
    positiveText: '确定清空',
    negativeText: '取消',
    onPositiveClick: () => {
      photos.value = []
      selectedPhotoId.value = null
      currentTemplate.value = null
      currentRawText.value = ''
      message.success('已清空')
    },
  })
}

async function handleSaveToSystem() {
  if (!formDate.value) {
    message.warning('请选择体检日期')
    return
  }

  const validResults = photos.value.filter(p => p.status === 'success')
  if (validResults.length === 0) {
    message.warning('没有可保存的识别结果')
    return
  }

  saveLoading.value = true

  try {
    const mergedResults: OcrIndicatorResult[] = []
    const seenIndicators = new Set<string>()

    for (const photo of validResults) {
      for (const result of photo.results) {
        if (!seenIndicators.has(result.indicatorId) && result.value !== null) {
          mergedResults.push(result)
          seenIndicators.add(result.indicatorId)
        }
      }
    }

    const indicators: IndicatorValue[] = mergeOcrResultsToIndicators(mergedResults)

    const photoRecords: PhotoRecord[] = validResults.map(p => ({
      id: generateId(),
      recordId: '',
      dataUrl: p.dataUrl,
      fileName: p.fileName,
    }))

    const dateStr = new Date(formDate.value).toISOString().slice(0, 10)
    const year = new Date(formDate.value).getFullYear()

    const record: ExamRecord = {
      id: generateId(),
      year,
      date: dateStr,
      photos: photoRecords.map(p => ({ ...p, recordId: '' })),
      indicators,
      notes: formNotes.value,
    }

    record.photos = record.photos.map(p => ({ ...p, recordId: record.id }))

    await store.addRecord(record)

    message.success(`成功录入系统！共 ${indicators.length} 项指标，${photoRecords.length} 张照片`)

    showSaveModal.value = false
    photos.value = []
    selectedPhotoId.value = null
    currentTemplate.value = null
    currentRawText.value = ''
    formNotes.value = ''
  } catch (error) {
    message.error('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

const resultColumns = [
  {
    title: '指标名称',
    key: 'name',
    width: 120,
    render: (row: OcrIndicatorResult) => h('div', { style: 'display: flex; align-items: center; gap: 4px;' }, [
      h(NText, { depth: row.isEdited ? 1 : 3, style: row.isEdited ? 'font-weight: 600;' : '' }, () => row.name),
      row.isEdited ? h(NIcon, { size: 14, color: '#18a058' }, () => h(Edit3)) : null,
    ]),
  },
  {
    title: '识别数值',
    key: 'value',
    width: 160,
    render: (row: OcrIndicatorResult) => h(NInputNumber, {
      value: row.value,
      onUpdateValue: (v: number | null) => onResultValueChange(row, v),
      placeholder: '未识别',
      size: 'small',
      style: {
        width: '100%',
        '--n-border': row.isAbnormal ? '1px solid #d03050' : row.isLowConfidence ? '1px solid #f0a020' : undefined,
      },
    }),
  },
  { title: '单位', key: 'unit', width: 70 },
  { title: '正常范围', key: 'normalRange', width: 100 },
  {
    title: '置信度',
    key: 'confidence',
    width: 100,
    render: (row: OcrIndicatorResult) => h('div', { style: 'display: flex; align-items: center; gap: 4px;' }, [
      h(NProgress, {
        type: getConfidenceColor(row.confidence) as any,
        percentage: Math.round(row.confidence * 100),
        showIndicator: false,
        size: 'small',
        style: 'flex: 1;',
      }),
      h(NText, { depth: 3, style: 'font-size: 12px; min-width: 40px;' }, () => getConfidenceText(row.confidence)),
    ]),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row: OcrIndicatorResult) => {
      if (row.isLowConfidence) {
        return h(NTag, { type: 'warning', size: 'small' }, () => h('span', { style: 'display: flex; align-items: center; gap: 2px;' }, [
          h(NIcon, { size: 12 }, () => h(AlertTriangle)),
          '待确认',
        ]))
      }
      if (row.isAbnormal) {
        const dir = getAbnormalDirection(row.indicatorId, row.value!)
        return h(NTag, { type: 'error', size: 'small' }, () => (dir === '偏高' ? '↑偏高' : '↓偏低'))
      }
      return h(NTag, { type: 'success', size: 'small' }, () => '正常')
    },
  },
  {
    title: '健康提示',
    key: 'healthNote',
    width: 140,
    render: (row: OcrIndicatorResult) => h(NInput, {
      value: row.healthNote,
      onUpdateValue: (v: string) => onResultNoteChange(row, v),
      placeholder: '添加备注',
      size: 'small',
    }),
  },
]

watch(selectedPhoto, (newPhoto) => {
  if (newPhoto && newPhoto.status === 'success' && currentRawText.value === '') {
    showRawText.value = false
  }
})
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%; background: #f0f7ff;">
    <div style="padding: 16px 24px; background: #fff; border-bottom: 1px solid #e0efff; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
          <NIcon size={24}><Scan /></NIcon>
          体检报告 OCR 智能识别
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #999;">
          支持多家医院体检报告格式，自动识别指标名称、数值和参考范围
        </p>
      </div>
      <NSpace>
        <NButton v-if="photos.length > 0" @click="clearAll">
          <template #icon><NIcon><Trash2 /></NIcon></template>
          清空全部
        </NButton>
        <NButton type="primary" :disabled="!canRecognize" :loading="isRecognizing" @click="handleRecognize">
          <template #icon><NIcon><Zap /></NIcon></template>
          {{ isRecognizing ? '识别中...' : '开始识别' }}
        </NButton>
        <NButton type="success" :disabled="!canSave" @click="openSaveModal">
          <template #icon><NIcon><Save /></NIcon></template>
          一键录入系统
        </NButton>
      </NSpace>
    </div>

    <div style="flex: 1; display: flex; overflow: hidden;">
      <div style="width: 280px; background: #fff; border-right: 1px solid #e0efff; display: flex; flex-direction: column; flex-shrink: 0;">
        <div style="padding: 16px;">
          <NUpload
            :custom-request="handleUpload"
            :show-file-list="false"
            accept="image/jpg,image/jpeg,image/png,image/gif,image/bmp,image/webp,image/tiff,image/tif,image/heic,image/heif"
            multiple
            draggable
            :max="100"
          >
            <div style="border: 2px dashed #b3d9f2; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.3s;">
              <NIcon size={32} color="#4A90D9" style="margin-bottom: 8px;"><Upload /></NIcon>
              <div style="font-size: 14px; color: #1a6fb5; font-weight: 500;">点击或拖拽上传</div>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">支持多选（Ctrl+A全选文件夹内图片）</div>
            </div>
          </NUpload>
        </div>

        <div v-if="photos.length > 0" style="padding: 0 16px 8px;">
          <NAlert type="info" :bordered="false" size="small">
            <template #icon><FileText /></template>
            共 {{ batchStats.totalPhotos }} 张，成功 {{ batchStats.successCount }} 张，识别 {{ batchStats.totalIndicators }} 项指标
          </NAlert>
        </div>

        <NScrollbar style="flex: 1;">
          <div style="padding: 0 16px 16px;">
            <div
              v-for="photo in photos"
              :key="photo.id"
              :style="{
                marginBottom: '12px',
                border: selectedPhotoId === photo.id ? '2px solid #4A90D9' : '1px solid #e0efff',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fafbfc',
                cursor: 'pointer',
              }"
              @click="selectPhoto(photo.id)"
            >
              <div style="position: relative;">
                <NImage
                  :src="photo.dataUrl"
                  :width="246"
                  :height="160"
                  object-fit="cover"
                />
                <div style="position: absolute; top: 8px; right: 8px;">
                  <NBadge
                    v-if="photo.status === 'success'"
                    :value="photo.results.length"
                    type="success"
                    :max="99"
                  >
                    <NIcon size={20} color="#18a058" style="background: #fff; border-radius: 50%; padding: 2px;"><CheckCircle /></NIcon>
                  </NBadge>
                  <NIcon v-else-if="photo.status === 'recognizing'" size={20} color="#2080f0" style="background: #fff; border-radius: 50%; padding: 2px;"><Scan /></NIcon>
                  <NIcon v-else-if="photo.status === 'failed'" size={20} color="#d03050" style="background: #fff; border-radius: 50%; padding: 2px;"><XCircle /></NIcon>
                </div>
                <div v-if="photo.status === 'recognizing'" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 8px; background: rgba(0,0,0,0.6);">
                  <NProgress :percentage="photo.progress" color="#4A90D9" :show-indicator="false" />
                </div>
              </div>
              <div style="padding: 8px;">
                <div style="font-size: 12px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px;">
                  {{ photo.fileName }}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <NTag v-if="photo.status === 'success'" type="success" size="small">识别成功</NTag>
                  <NTag v-else-if="photo.status === 'recognizing'" type="info" size="small">识别中</NTag>
                  <NTag v-else-if="photo.status === 'failed'" type="error" size="small">识别失败</NTag>
                  <NTag v-else type="default" size="small">待识别</NTag>
                  <NSpace size="small">
                    <NButton
                      v-if="photo.status === 'success' || photo.status === 'failed'"
                      size="tiny"
                      text
                      @click.stop="handleReRecognize(photo)"
                    >
                      重新识别
                    </NButton>
                    <NButton
                      size="tiny"
                      text
                      type="error"
                      @click.stop="removePhoto(photo.id)"
                    >
                      移除
                    </NButton>
                  </NSpace>
                </div>
                <div v-if="photo.status === 'success' && photo.results.filter(r => r.isLowConfidence).length > 0" style="margin-top: 4px;">
                  <NTag type="warning" size="small">
                    <NIcon size={12} style="margin-right: 2px;"><AlertTriangle /></NIcon>
                    {{ photo.results.filter(r => r.isLowConfidence).length }} 项待确认
                  </NTag>
                </div>
                <div v-if="photo.status === 'success' && photo.results.filter(r => r.isAbnormal).length > 0" style="margin-top: 4px;">
                  <NTag type="error" size="small">
                    {{ photo.results.filter(r => r.isAbnormal).length }} 项异常
                  </NTag>
                </div>
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>

      <div style="flex: 1; overflow: auto; padding: 24px;">
        <template v-if="!selectedPhoto">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
            <NEmpty description="上传体检报告照片开始识别">
              <template #icon>
                <NIcon size={48} color="#b3d9f2"><Scan /></NIcon>
              </template>
            </NEmpty>
          </div>
        </template>

        <template v-else>
          <div v-if="selectedPhoto.status === 'pending'">
            <NAlert type="info" show-icon>
              该照片尚未识别，请点击「开始识别」按钮进行智能识别
            </NAlert>
          </div>

          <div v-else-if="selectedPhoto.status === 'recognizing'">
            <NCard :bordered="false">
              <div style="text-align: center; padding: 40px;">
                <NIcon size={48} color="#4A90D9" style="margin-bottom: 16px; animation: pulse 1.5s infinite;"><Scan /></NIcon>
                <div style="font-size: 16px; color: #333; margin-bottom: 16px;">正在智能识别中...</div>
                <NProgress :percentage="selectedPhoto.progress" color="#4A90D9" style="max-width: 300px; margin: 0 auto;" />
              </div>
            </NCard>
          </div>

          <div v-else-if="selectedPhoto.status === 'failed'">
            <NCard :bordered="false">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <NIcon size={20} color="#d03050"><XCircle /></NIcon>
                  <span style="color: #d03050;">识别失败：{{ selectedPhoto.error || '未知错误' }}</span>
                </div>
                <NButton size="small" type="primary" @click="handleReRecognize(selectedPhoto)">重新识别</NButton>
              </div>
            </NCard>
          </div>

          <div v-else-if="selectedPhoto.status === 'success'">
            <NCard :bordered="false" style="margin-bottom: 16px;">
              <template #header>
                <span style="font-size: 16px; font-weight: 600; color: #1a6fb5; display: flex; align-items: center; gap: 8px;">
                  <NIcon><FileText /></NIcon>
                  识别结果 - {{ selectedPhoto.fileName }}
                </span>
              </template>
              <template #header-extra>
                <NSpace>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <NText depth="3" style="font-size: 13px;">显示原始文本</NText>
                    <NSwitch v-model:value="showRawText" size="small" />
                  </div>
                  <NButton size="small" @click="handleReRecognize(selectedPhoto)">
                    <template #icon><NIcon><Scan /></NIcon></template>
                    重新识别
                  </NButton>
                </NSpace>
              </template>

              <NDescriptions :column="3" label-placement="left" bordered size="small" style="margin-bottom: 16px;">
                <NDescriptionsItem label="识别指标数">
                  <NTag type="info">{{ allResults.length }} 项</NTag>
                </NDescriptionsItem>
                <NDescriptionsItem label="低置信度">
                  <NTag v-if="lowConfidenceResults.length > 0" type="warning">
                    <NIcon size={12} style="margin-right: 2px;"><AlertTriangle /></NIcon>
                    {{ lowConfidenceResults.length }} 项待确认
                  </NTag>
                  <NTag v-else type="success">0 项</NTag>
                </NDescriptionsItem>
                <NDescriptionsItem label="异常指标">
                  <NTag v-if="abnormalResults.length > 0" type="error">{{ abnormalResults.length }} 项</NTag>
                  <NTag v-else type="success">0 项</NTag>
                </NDescriptionsItem>
              </NDescriptions>

              <div v-if="showRawText" style="margin-bottom: 16px;">
                <NCard :bordered="false" size="small" style="background: #f5f7fa;">
                  <div style="font-size: 13px; color: #666; margin-bottom: 8px; font-weight: 500;">原始识别文本</div>
                  <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #333; background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #e0efff; max-height: 200px; overflow: auto;">{{ currentRawText }}</pre>
                </NCard>
              </div>

              <NAlert
                v-if="lowConfidenceResults.length > 0"
                type="warning"
                show-icon
                style="margin-bottom: 16px;"
              >
                <template #icon><AlertTriangle /></template>
                检测到 {{ lowConfidenceResults.length }} 项低置信度识别结果，请仔细核对后再录入系统
              </NAlert>

              <NDataTable
                :columns="resultColumns"
                :data="allResults"
                :bordered="false"
                size="small"
                :row-class-name="(row: OcrIndicatorResult) => row.isLowConfidence ? 'low-confidence-row' : ''"
              />
            </NCard>
          </div>
        </template>
      </div>
    </div>

    <NModal v-model:show="showSaveModal" preset="card" title="确认录入系统" style="width: 560px;" :mask-closable="false">
      <NCard :bordered="false" size="small">
        <NDescriptions :column="1" label-placement="left" bordered size="small" style="margin-bottom: 16px;">
          <NDescriptionsItem label="体检照片">
            <NTag type="info">{{ batchStats.successCount }} 张</NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="识别指标">
            <NTag type="info">{{ batchStats.totalIndicators }} 项</NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="待确认项">
            <NTag :type="batchStats.lowConfidenceCount > 0 ? 'warning' : 'success'">
              {{ batchStats.lowConfidenceCount }} 项
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="异常项">
            <NTag :type="batchStats.abnormalCount > 0 ? 'error' : 'success'">
              {{ batchStats.abnormalCount }} 项
            </NTag>
          </NDescriptionsItem>
        </NDescriptions>

        <NGrid :cols="1" :y-gap="12">
          <NGi>
            <div style="margin-bottom: 4px; color: #333; font-size: 13px;">体检日期 *</div>
            <NDatePicker v-model:value="formDate" type="date" style="width: 100%;" />
          </NGi>
          <NGi>
            <div style="margin-bottom: 4px; color: #333; font-size: 13px;">备注</div>
            <NInput v-model:value="formNotes" type="textarea" :rows="3" placeholder="输入备注信息（可选）" />
          </NGi>
        </NGrid>
      </NCard>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSaveModal = false">取消</NButton>
          <NButton type="primary" :loading="saveLoading" @click="handleSaveToSystem">
            确认录入
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.low-confidence-row {
  background-color: #fff7e6 !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
