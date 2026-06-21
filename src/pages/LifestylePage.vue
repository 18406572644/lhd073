<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import {
  NTabs,
  NTabPane,
  NCard,
  NButton,
  NIcon,
  NInput,
  NSelect,
  NDatePicker,
  NModal,
  NSpace,
  NForm,
  NFormItem,
  NDataTable,
  NTag,
  NEmpty,
  NInputNumber,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui'
import {
  Dumbbell,
  UtensilsCrossed,
  Moon,
  HeartPulse,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-vue-next'
import { useLifestyleStore } from '@/stores/lifestyle'
import {
  EXERCISE_TYPE_LABELS,
  EXERCISE_FEELING_LABELS,
  MEAL_TYPE_LABELS,
  DIET_HEALTH_LABELS,
  SLEEP_QUALITY_LABELS,
  VITAL_SIGN_TYPE_LABELS,
  VITAL_SIGN_UNITS,
  type ExerciseRecord,
  type DietRecord,
  type SleepRecord,
  type VitalSignRecord,
  type ExerciseType,
  type MealType,
  type DietHealthLevel,
  type SleepQuality,
  type VitalSignType,
} from '@/types'

const store = useLifestyleStore()
const message = useMessage()
const dialog = useDialog()

const activeTab = ref('exercise')

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function getTodayTimestamp(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

function dateStrToTs(dateStr: string): number {
  return new Date(dateStr).getTime()
}

function tsToDateStr(ts: number): string {
  return new Date(ts).toISOString().split('T')[0]
}

const showExerciseModal = ref(false)
const editingExercise = ref<ExerciseRecord | null>(null)
const exerciseForm = ref({
  date: getTodayTimestamp() as number | null,
  type: 'running' as ExerciseType,
  duration: 30,
  calories: 200,
  feeling: 'good' as ExerciseRecord['feeling'],
  notes: '',
})

const exerciseTypeOptions: SelectOption[] = Object.entries(EXERCISE_TYPE_LABELS).map(
  ([value, label]) => ({ label, value })
)

const exerciseFeelingOptions: SelectOption[] = Object.entries(EXERCISE_FEELING_LABELS).map(
  ([value, label]) => ({ label, value })
)

function openAddExercise() {
  editingExercise.value = null
  exerciseForm.value = {
    date: getTodayTimestamp(),
    type: 'running',
    duration: 30,
    calories: 200,
    feeling: 'good',
    notes: '',
  }
  showExerciseModal.value = true
}

function openEditExercise(record: ExerciseRecord) {
  editingExercise.value = record
  exerciseForm.value = {
    date: dateStrToTs(record.date),
    type: record.type,
    duration: record.duration,
    calories: record.calories,
    feeling: record.feeling,
    notes: record.notes,
  }
  showExerciseModal.value = true
}

async function saveExercise() {
  if (!exerciseForm.value.date || !exerciseForm.value.type || !exerciseForm.value.duration) {
    message.warning('请填写必填项')
    return
  }
  const dateStr = tsToDateStr(exerciseForm.value.date as number)
  try {
    if (editingExercise.value) {
      await store.updateExercise({
        ...editingExercise.value,
        date: dateStr,
        type: exerciseForm.value.type,
        duration: exerciseForm.value.duration,
        calories: exerciseForm.value.calories,
        feeling: exerciseForm.value.feeling,
        notes: exerciseForm.value.notes,
      })
      message.success('更新成功')
    } else {
      await store.addExercise({
        id: generateId(),
        date: dateStr,
        type: exerciseForm.value.type,
        duration: exerciseForm.value.duration,
        calories: exerciseForm.value.calories,
        feeling: exerciseForm.value.feeling,
        notes: exerciseForm.value.notes,
      })
      message.success('添加成功')
    }
    showExerciseModal.value = false
  } catch {
    message.error('保存失败')
  }
}

function confirmDeleteExercise(id: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条运动记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await store.removeExercise(id)
        message.success('删除成功')
      } catch {
        message.error('删除失败')
      }
    },
  })
}

const exerciseColumns = computed<DataTableColumns<ExerciseRecord>>(() => [
  {
    title: '日期',
    key: 'date',
    width: 120,
  },
  {
    title: '运动类型',
    key: 'type',
    width: 100,
    render: (row) => EXERCISE_TYPE_LABELS[row.type] || row.type,
  },
  {
    title: '时长(分钟)',
    key: 'duration',
    width: 100,
  },
  {
    title: '消耗(千卡)',
    key: 'calories',
    width: 100,
  },
  {
    title: '感受',
    key: 'feeling',
    width: 100,
    render: (row) => {
      const label = EXERCISE_FEELING_LABELS[row.feeling] || row.feeling
      const type =
        row.feeling === 'great' || row.feeling === 'good'
          ? 'success'
          : row.feeling === 'normal'
            ? 'default'
            : 'warning'
      return h(NTag, { type, size: 'small' }, () => label)
    },
  },
  { title: '备注', key: 'notes', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => openEditExercise(row),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Edit2)),
            default: () => '编辑',
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            ghost: true,
            onClick: () => confirmDeleteExercise(row.id),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Trash2)),
            default: () => '删除',
          }
        ),
      ]),
  },
])

const showDietModal = ref(false)
const editingDiet = ref<DietRecord | null>(null)
const dietForm = ref({
  date: getTodayTimestamp() as number | null,
  mealType: 'lunch' as MealType,
  foodItems: '',
  healthLevel: 'moderate' as DietHealthLevel,
  calories: undefined as number | undefined,
  notes: '',
})

const mealTypeOptions: SelectOption[] = Object.entries(MEAL_TYPE_LABELS).map(
  ([value, label]) => ({ label, value })
)

const dietHealthOptions: SelectOption[] = Object.entries(DIET_HEALTH_LABELS).map(
  ([value, label]) => ({ label, value })
)

function openAddDiet() {
  editingDiet.value = null
  dietForm.value = {
    date: getTodayTimestamp(),
    mealType: 'lunch',
    foodItems: '',
    healthLevel: 'moderate',
    calories: undefined,
    notes: '',
  }
  showDietModal.value = true
}

function openEditDiet(record: DietRecord) {
  editingDiet.value = record
  dietForm.value = {
    date: dateStrToTs(record.date),
    mealType: record.mealType,
    foodItems: record.foodItems,
    healthLevel: record.healthLevel,
    calories: record.calories,
    notes: record.notes,
  }
  showDietModal.value = true
}

async function saveDiet() {
  if (!dietForm.value.date || !dietForm.value.mealType || !dietForm.value.foodItems) {
    message.warning('请填写必填项')
    return
  }
  const dateStr = tsToDateStr(dietForm.value.date as number)
  try {
    if (editingDiet.value) {
      await store.updateDiet({
        ...editingDiet.value,
        date: dateStr,
        mealType: dietForm.value.mealType,
        foodItems: dietForm.value.foodItems,
        healthLevel: dietForm.value.healthLevel,
        calories: dietForm.value.calories,
        notes: dietForm.value.notes,
      })
      message.success('更新成功')
    } else {
      await store.addDiet({
        id: generateId(),
        date: dateStr,
        mealType: dietForm.value.mealType,
        foodItems: dietForm.value.foodItems,
        healthLevel: dietForm.value.healthLevel,
        calories: dietForm.value.calories,
        notes: dietForm.value.notes,
      })
      message.success('添加成功')
    }
    showDietModal.value = false
  } catch {
    message.error('保存失败')
  }
}

function confirmDeleteDiet(id: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条饮食记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await store.removeDiet(id)
        message.success('删除成功')
      } catch {
        message.error('删除失败')
      }
    },
  })
}

const dietColumns = computed<DataTableColumns<DietRecord>>(() => [
  {
    title: '日期',
    key: 'date',
    width: 120,
  },
  {
    title: '餐次',
    key: 'mealType',
    width: 80,
    render: (row) => MEAL_TYPE_LABELS[row.mealType] || row.mealType,
  },
  {
    title: '食物内容',
    key: 'foodItems',
    ellipsis: { tooltip: true },
  },
  {
    title: '健康程度',
    key: 'healthLevel',
    width: 100,
    render: (row) => {
      const label = DIET_HEALTH_LABELS[row.healthLevel] || row.healthLevel
      const type =
        row.healthLevel === 'healthy'
          ? 'success'
          : row.healthLevel === 'moderate'
            ? 'default'
            : 'error'
      return h(NTag, { type, size: 'small' }, () => label)
    },
  },
  {
    title: '热量(千卡)',
    key: 'calories',
    width: 100,
    render: (row) => row.calories || '-',
  },
  { title: '备注', key: 'notes', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => openEditDiet(row),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Edit2)),
            default: () => '编辑',
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            ghost: true,
            onClick: () => confirmDeleteDiet(row.id),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Trash2)),
            default: () => '删除',
          }
        ),
      ]),
  },
])

const showSleepModal = ref(false)
const editingSleep = ref<SleepRecord | null>(null)
const sleepForm = ref({
  date: getTodayTimestamp() as number | null,
  duration: 7,
  quality: 'good' as SleepQuality,
  bedTime: '',
  wakeTime: '',
  notes: '',
})

const sleepQualityOptions: SelectOption[] = Object.entries(SLEEP_QUALITY_LABELS).map(
  ([value, label]) => ({ label, value })
)

function openAddSleep() {
  editingSleep.value = null
  sleepForm.value = {
    date: getTodayTimestamp(),
    duration: 7,
    quality: 'good',
    bedTime: '',
    wakeTime: '',
    notes: '',
  }
  showSleepModal.value = true
}

function openEditSleep(record: SleepRecord) {
  editingSleep.value = record
  sleepForm.value = {
    date: dateStrToTs(record.date),
    duration: record.duration,
    quality: record.quality,
    bedTime: record.bedTime || '',
    wakeTime: record.wakeTime || '',
    notes: record.notes,
  }
  showSleepModal.value = true
}

async function saveSleep() {
  if (!sleepForm.value.date || !sleepForm.value.duration || !sleepForm.value.quality) {
    message.warning('请填写必填项')
    return
  }
  const dateStr = tsToDateStr(sleepForm.value.date as number)
  try {
    if (editingSleep.value) {
      await store.updateSleep({
        ...editingSleep.value,
        date: dateStr,
        duration: sleepForm.value.duration,
        quality: sleepForm.value.quality,
        bedTime: sleepForm.value.bedTime || undefined,
        wakeTime: sleepForm.value.wakeTime || undefined,
        notes: sleepForm.value.notes,
      })
      message.success('更新成功')
    } else {
      await store.addSleep({
        id: generateId(),
        date: dateStr,
        duration: sleepForm.value.duration,
        quality: sleepForm.value.quality,
        bedTime: sleepForm.value.bedTime || undefined,
        wakeTime: sleepForm.value.wakeTime || undefined,
        notes: sleepForm.value.notes,
      })
      message.success('添加成功')
    }
    showSleepModal.value = false
  } catch {
    message.error('保存失败')
  }
}

function confirmDeleteSleep(id: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条睡眠记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await store.removeSleep(id)
        message.success('删除成功')
      } catch {
        message.error('删除失败')
      }
    },
  })
}

const sleepColumns = computed<DataTableColumns<SleepRecord>>(() => [
  {
    title: '日期',
    key: 'date',
    width: 120,
  },
  {
    title: '睡眠时长(小时)',
    key: 'duration',
    width: 120,
  },
  {
    title: '睡眠质量',
    key: 'quality',
    width: 100,
    render: (row) => {
      const label = SLEEP_QUALITY_LABELS[row.quality] || row.quality
      const type =
        row.quality === 'excellent' || row.quality === 'good'
          ? 'success'
          : row.quality === 'fair'
            ? 'default'
            : 'warning'
      return h(NTag, { type, size: 'small' }, () => label)
    },
  },
  {
    title: '入睡时间',
    key: 'bedTime',
    width: 100,
    render: (row) => row.bedTime || '-',
  },
  {
    title: '起床时间',
    key: 'wakeTime',
    width: 100,
    render: (row) => row.wakeTime || '-',
  },
  { title: '备注', key: 'notes', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => openEditSleep(row),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Edit2)),
            default: () => '编辑',
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            ghost: true,
            onClick: () => confirmDeleteSleep(row.id),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Trash2)),
            default: () => '删除',
          }
        ),
      ]),
  },
])

const showVitalSignModal = ref(false)
const editingVitalSign = ref<VitalSignRecord | null>(null)
const vitalSignForm = ref({
  date: getTodayTimestamp() as number | null,
  type: 'weight' as VitalSignType,
  value: 60,
  value2: undefined as number | undefined,
  notes: '',
})

const vitalSignTypeOptions: SelectOption[] = Object.entries(VITAL_SIGN_TYPE_LABELS).map(
  ([value, label]) => ({ label, value })
)

const isBloodPressure = computed(() => vitalSignForm.value.type === 'blood_pressure')

function openAddVitalSign() {
  editingVitalSign.value = null
  vitalSignForm.value = {
    date: getTodayTimestamp(),
    type: 'weight',
    value: 60,
    value2: undefined,
    notes: '',
  }
  showVitalSignModal.value = true
}

function openEditVitalSign(record: VitalSignRecord) {
  editingVitalSign.value = record
  vitalSignForm.value = {
    date: dateStrToTs(record.date),
    type: record.type,
    value: record.value,
    value2: record.value2,
    notes: record.notes,
  }
  showVitalSignModal.value = true
}

async function saveVitalSign() {
  if (!vitalSignForm.value.date || !vitalSignForm.value.type || !vitalSignForm.value.value) {
    message.warning('请填写必填项')
    return
  }
  const dateStr = tsToDateStr(vitalSignForm.value.date as number)
  try {
    if (editingVitalSign.value) {
      await store.updateVitalSign({
        ...editingVitalSign.value,
        date: dateStr,
        type: vitalSignForm.value.type,
        value: vitalSignForm.value.value,
        value2: vitalSignForm.value.value2,
        notes: vitalSignForm.value.notes,
      })
      message.success('更新成功')
    } else {
      await store.addVitalSign({
        id: generateId(),
        date: dateStr,
        type: vitalSignForm.value.type,
        value: vitalSignForm.value.value,
        value2: vitalSignForm.value.value2,
        notes: vitalSignForm.value.notes,
      })
      message.success('添加成功')
    }
    showVitalSignModal.value = false
  } catch {
    message.error('保存失败')
  }
}

function confirmDeleteVitalSign(id: string) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条监测记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await store.removeVitalSign(id)
        message.success('删除成功')
      } catch {
        message.error('删除失败')
      }
    },
  })
}

const vitalSignColumns = computed<DataTableColumns<VitalSignRecord>>(() => [
  {
    title: '日期',
    key: 'date',
    width: 120,
  },
  {
    title: '指标类型',
    key: 'type',
    width: 100,
    render: (row) => VITAL_SIGN_TYPE_LABELS[row.type] || row.type,
  },
  {
    title: '数值',
    key: 'value',
    width: 140,
    render: (row) => {
      const unit = VITAL_SIGN_UNITS[row.type] || ''
      if (row.type === 'blood_pressure' && row.value2) {
        return `${row.value}/${row.value2} ${unit}`
      }
      return `${row.value} ${unit}`
    },
  },
  { title: '备注', key: 'notes', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => openEditVitalSign(row),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Edit2)),
            default: () => '编辑',
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            ghost: true,
            onClick: () => confirmDeleteVitalSign(row.id),
          },
          {
            icon: () => h(NIcon, { size: 16 }, () => h(Trash2)),
            default: () => '删除',
          }
        ),
      ]),
  },
])
</script>

<template>
  <div style="padding: 24px; min-height: 100%;">
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0;">生活方式记录</h1>
        <p style="margin: 6px 0 0; color: #8899aa; font-size: 14px;">记录运动、饮食、睡眠和日常健康指标</p>
      </div>
    </div>

    <NCard :bordered="false">
      <NTabs v-model:value="activeTab" size="large">
        <NTabPane name="exercise" tab="运动记录">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><Dumbbell /></NIcon>
              运动记录
            </span>
          </template>
          <div style="padding: 16px 0;">
            <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
              <NButton type="primary" @click="openAddExercise">
                <template #icon>
                  <NIcon :size="18"><Plus /></NIcon>
                </template>
                添加记录
              </NButton>
            </div>
            <NDataTable
              v-if="store.sortedExercises.length > 0"
              :columns="exerciseColumns"
              :data="store.sortedExercises"
              :bordered="false"
              size="small"
            />
            <NEmpty v-else description="暂无运动记录，点击右上角添加第一条记录" style="padding: 60px 0;" />
          </div>
        </NTabPane>

        <NTabPane name="diet" tab="饮食记录">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><UtensilsCrossed /></NIcon>
              饮食记录
            </span>
          </template>
          <div style="padding: 16px 0;">
            <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
              <NButton type="primary" @click="openAddDiet">
                <template #icon>
                  <NIcon :size="18"><Plus /></NIcon>
                </template>
                添加记录
              </NButton>
            </div>
            <NDataTable
              v-if="store.sortedDiets.length > 0"
              :columns="dietColumns"
              :data="store.sortedDiets"
              :bordered="false"
              size="small"
            />
            <NEmpty v-else description="暂无饮食记录，点击右上角添加第一条记录" style="padding: 60px 0;" />
          </div>
        </NTabPane>

        <NTabPane name="sleep" tab="睡眠记录">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><Moon /></NIcon>
              睡眠记录
            </span>
          </template>
          <div style="padding: 16px 0;">
            <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
              <NButton type="primary" @click="openAddSleep">
                <template #icon>
                  <NIcon :size="18"><Plus /></NIcon>
                </template>
                添加记录
              </NButton>
            </div>
            <NDataTable
              v-if="store.sortedSleeps.length > 0"
              :columns="sleepColumns"
              :data="store.sortedSleeps"
              :bordered="false"
              size="small"
            />
            <NEmpty v-else description="暂无睡眠记录，点击右上角添加第一条记录" style="padding: 60px 0;" />
          </div>
        </NTabPane>

        <NTabPane name="vitals" tab="日常监测">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 6px;">
              <NIcon :size="18"><HeartPulse /></NIcon>
              日常监测
            </span>
          </template>
          <div style="padding: 16px 0;">
            <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
              <NButton type="primary" @click="openAddVitalSign">
                <template #icon>
                  <NIcon :size="18"><Plus /></NIcon>
                </template>
                添加记录
              </NButton>
            </div>
            <NDataTable
              v-if="store.sortedVitalSigns.length > 0"
              :columns="vitalSignColumns"
              :data="store.sortedVitalSigns"
              :bordered="false"
              size="small"
            />
            <NEmpty v-else description="暂无监测记录，点击右上角添加第一条记录" style="padding: 60px 0;" />
          </div>
        </NTabPane>
      </NTabs>
    </NCard>

    <NModal v-model:show="showExerciseModal" preset="card" title="运动记录" style="width: 500px;" :mask-closable="false">
      <NForm label-placement="top">
        <NFormItem label="日期" required>
          <NDatePicker v-model:value="exerciseForm.date" type="date" value-format="yyyy-MM-dd" style="width: 100%;" />
        </NFormItem>
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="运动类型" required style="flex: 1;">
            <NSelect v-model:value="exerciseForm.type" :options="exerciseTypeOptions" />
          </NFormItem>
          <NFormItem label="时长(分钟)" required style="flex: 1;">
            <NInputNumber v-model:value="exerciseForm.duration" :min="1" :max="1000" style="width: 100%;" />
          </NFormItem>
        </NSpace>
        <NFormItem label="消耗卡路里(千卡)">
          <NInputNumber v-model:value="exerciseForm.calories" :min="0" :max="10000" style="width: 100%;" />
        </NFormItem>
        <NFormItem label="运动感受">
          <NSelect v-model:value="exerciseForm.feeling" :options="exerciseFeelingOptions" />
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="exerciseForm.notes" type="textarea" :rows="3" placeholder="记录运动感受..." />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showExerciseModal = false">取消</NButton>
          <NButton type="primary" @click="saveExercise">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showDietModal" preset="card" title="饮食记录" style="width: 500px;" :mask-closable="false">
      <NForm label-placement="top">
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="日期" required style="flex: 1;">
            <NDatePicker v-model:value="dietForm.date" type="date" value-format="yyyy-MM-dd" style="width: 100%;" />
          </NFormItem>
          <NFormItem label="餐次" required style="flex: 1;">
            <NSelect v-model:value="dietForm.mealType" :options="mealTypeOptions" />
          </NFormItem>
        </NSpace>
        <NFormItem label="食物内容" required>
          <NInput v-model:value="dietForm.foodItems" placeholder="例如：米饭、青菜、鸡胸肉..." />
        </NFormItem>
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="健康程度" style="flex: 1;">
            <NSelect v-model:value="dietForm.healthLevel" :options="dietHealthOptions" />
          </NFormItem>
          <NFormItem label="热量(千卡)" style="flex: 1;">
            <NInputNumber v-model:value="dietForm.calories" :min="0" :max="10000" style="width: 100%;" />
          </NFormItem>
        </NSpace>
        <NFormItem label="备注">
          <NInput v-model:value="dietForm.notes" type="textarea" :rows="3" placeholder="记录饮食感受..." />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showDietModal = false">取消</NButton>
          <NButton type="primary" @click="saveDiet">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showSleepModal" preset="card" title="睡眠记录" style="width: 500px;" :mask-closable="false">
      <NForm label-placement="top">
        <NFormItem label="日期" required>
          <NDatePicker v-model:value="sleepForm.date" type="date" value-format="yyyy-MM-dd" style="width: 100%;" />
        </NFormItem>
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="睡眠时长(小时)" required style="flex: 1;">
            <NInputNumber v-model:value="sleepForm.duration" :min="0" :max="24" :step="0.5" style="width: 100%;" />
          </NFormItem>
          <NFormItem label="睡眠质量" required style="flex: 1;">
            <NSelect v-model:value="sleepForm.quality" :options="sleepQualityOptions" />
          </NFormItem>
        </NSpace>
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="入睡时间" style="flex: 1;">
            <NInput v-model:value="sleepForm.bedTime" placeholder="例如：23:00" />
          </NFormItem>
          <NFormItem label="起床时间" style="flex: 1;">
            <NInput v-model:value="sleepForm.wakeTime" placeholder="例如：07:00" />
          </NFormItem>
        </NSpace>
        <NFormItem label="备注">
          <NInput v-model:value="sleepForm.notes" type="textarea" :rows="3" placeholder="记录睡眠情况..." />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSleepModal = false">取消</NButton>
          <NButton type="primary" @click="saveSleep">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showVitalSignModal" preset="card" title="日常监测" style="width: 500px;" :mask-closable="false">
      <NForm label-placement="top">
        <NSpace :size="16" style="width: 100%;">
          <NFormItem label="日期" required style="flex: 1;">
            <NDatePicker v-model:value="vitalSignForm.date" type="date" value-format="yyyy-MM-dd" style="width: 100%;" />
          </NFormItem>
          <NFormItem label="指标类型" required style="flex: 1;">
            <NSelect v-model:value="vitalSignForm.type" :options="vitalSignTypeOptions" />
          </NFormItem>
        </NSpace>
        <NSpace v-if="isBloodPressure" :size="16" style="width: 100%;">
          <NFormItem label="收缩压(高压)" required style="flex: 1;">
            <NInputNumber v-model:value="vitalSignForm.value" :min="40" :max="250" style="width: 100%;" />
          </NFormItem>
          <NFormItem label="舒张压(低压)" required style="flex: 1;">
            <NInputNumber v-model:value="vitalSignForm.value2" :min="30" :max="180" style="width: 100%;" />
          </NFormItem>
        </NSpace>
        <NFormItem v-else :label="`数值 (${VITAL_SIGN_UNITS[vitalSignForm.type] || ''})`" required>
          <NInputNumber v-model:value="vitalSignForm.value" :min="0" :max="1000" style="width: 100%;" />
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="vitalSignForm.notes" type="textarea" :rows="3" placeholder="记录测量情况..." />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showVitalSignModal = false">取消</NButton>
          <NButton type="primary" @click="saveVitalSign">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
