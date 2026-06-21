import type { IndicatorItem, ExamRecord, ApiResponse, LifestyleRecords, ExerciseRecord, DietRecord, SleepRecord, VitalSignRecord } from '@/types'

const INDICATOR_LIST: IndicatorItem[] = [
  { id: 'wbc', name: '白细胞', category: '血常规', unit: '10^9/L', normalRange: { min: 3.5, max: 9.5 }, description: '白细胞计数，反映免疫状态' },
  { id: 'rbc', name: '红细胞', category: '血常规', unit: '10^12/L', normalRange: { min: 4.3, max: 5.8 }, description: '红细胞计数，反映携氧能力' },
  { id: 'hgb', name: '血红蛋白', category: '血常规', unit: 'g/L', normalRange: { min: 130, max: 175 }, description: '血红蛋白含量，诊断贫血' },
  { id: 'plt', name: '血小板', category: '血常规', unit: '10^9/L', normalRange: { min: 125, max: 350 }, description: '血小板计数，反映凝血功能' },
  { id: 'alt', name: '谷丙转氨酶', category: '肝功能', unit: 'U/L', normalRange: { min: 0, max: 40 }, description: 'ALT，肝脏损伤指标' },
  { id: 'ast', name: '谷草转氨酶', category: '肝功能', unit: 'U/L', normalRange: { min: 0, max: 40 }, description: 'AST，肝脏及心肌指标' },
  { id: 'tbil', name: '总胆红素', category: '肝功能', unit: 'μmol/L', normalRange: { min: 3.4, max: 17.1 }, description: '总胆红素，黄疸指标' },
  { id: 'alb', name: '白蛋白', category: '肝功能', unit: 'g/L', normalRange: { min: 40, max: 55 }, description: '白蛋白，营养及肝功指标' },
  { id: 'cr', name: '肌酐', category: '肾功能', unit: 'μmol/L', normalRange: { min: 57, max: 111 }, description: '肌酐，肾脏滤过功能' },
  { id: 'bun', name: '尿素氮', category: '肾功能', unit: 'mmol/L', normalRange: { min: 2.6, max: 7.5 }, description: '尿素氮，肾脏排泄功能' },
  { id: 'ua', name: '尿酸', category: '肾功能', unit: 'μmol/L', normalRange: { min: 149, max: 416 }, description: '尿酸，痛风风险指标' },
  { id: 'glu', name: '空腹血糖', category: '血糖血脂', unit: 'mmol/L', normalRange: { min: 3.9, max: 6.1 }, description: '空腹血糖，糖尿病筛查' },
  { id: 'hba1c', name: '糖化血红蛋白', category: '血糖血脂', unit: '%', normalRange: { min: 4.0, max: 6.0 }, description: 'HbA1c，近3月血糖控制' },
  { id: 'tc', name: '总胆固醇', category: '血糖血脂', unit: 'mmol/L', normalRange: { min: 2.8, max: 5.17 }, description: '总胆固醇，心血管风险' },
  { id: 'tg', name: '甘油三酯', category: '血糖血脂', unit: 'mmol/L', normalRange: { min: 0.56, max: 1.7 }, description: '甘油三酯，血脂指标' },
  { id: 'hdl', name: '高密度脂蛋白', category: '血糖血脂', unit: 'mmol/L', normalRange: { min: 1.04, max: 1.55 }, description: 'HDL-C，好胆固醇' },
  { id: 'ldl', name: '低密度脂蛋白', category: '血糖血脂', unit: 'mmol/L', normalRange: { min: 0, max: 3.37 }, description: 'LDL-C，坏胆固醇' },
  { id: 'sbp', name: '收缩压', category: '血压', unit: 'mmHg', normalRange: { min: 90, max: 140 }, description: '收缩压（高压）' },
  { id: 'dbp', name: '舒张压', category: '血压', unit: 'mmHg', normalRange: { min: 60, max: 90 }, description: '舒张压（低压）' },
  { id: 'hr', name: '心率', category: '血压', unit: '次/分', normalRange: { min: 60, max: 100 }, description: '静息心率' },
  { id: 'bmi', name: '体质指数', category: '体格', unit: 'kg/m²', normalRange: { min: 18.5, max: 24.0 }, description: 'BMI，肥胖评估' },
  { id: 'wt', name: '体重', category: '体格', unit: 'kg', normalRange: { min: 40, max: 100 }, description: '体重' },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function fetchIndicators(): Promise<ApiResponse<IndicatorItem[]>> {
  await delay(300)
  return { code: 0, data: [...INDICATOR_LIST] }
}

export async function fetchRecords(password: string): Promise<ApiResponse<ExamRecord[]>> {
  await delay(200)
  const { loadEncryptedRecords } = await import('@/utils/crypto')
  const records = loadEncryptedRecords<ExamRecord[]>(password)
  return { code: 0, data: records || [] }
}

export async function saveRecords(records: ExamRecord[], password: string): Promise<ApiResponse<{ success: boolean }>> {
  await delay(200)
  const { saveEncryptedRecords } = await import('@/utils/crypto')
  saveEncryptedRecords(records, password)
  return { code: 0, data: { success: true } }
}

export async function deleteRecord(id: string, records: ExamRecord[], password: string): Promise<ApiResponse<{ success: boolean }>> {
  await delay(200)
  const filtered = records.filter(r => r.id !== id)
  const { saveEncryptedRecords } = await import('@/utils/crypto')
  saveEncryptedRecords(filtered, password)
  return { code: 0, data: { success: true } }
}

export function isAbnormalValue(indicator: IndicatorItem, value: number): boolean {
  return value < indicator.normalRange.min || value > indicator.normalRange.max
}

export function getAbnormalDirection(indicator: IndicatorItem, value: number): 'high' | 'low' | 'normal' {
  if (value > indicator.normalRange.max) return 'high'
  if (value < indicator.normalRange.min) return 'low'
  return 'normal'
}

const LIFESTYLE_STORAGE_KEY = 'health_lifestyle_records'

async function loadLifestyleRecords(password: string): Promise<LifestyleRecords | null> {
  try {
    const { loadEncryptedData } = await import('@/utils/crypto')
    return loadEncryptedData<LifestyleRecords>(LIFESTYLE_STORAGE_KEY, password)
  } catch (e) {
    console.error('Failed to load lifestyle records:', e)
    return null
  }
}

async function saveLifestyleRecords(records: LifestyleRecords, password: string): Promise<void> {
  try {
    const { saveEncryptedData } = await import('@/utils/crypto')
    saveEncryptedData(LIFESTYLE_STORAGE_KEY, records, password)
  } catch (e) {
    console.error('Failed to save lifestyle records:', e)
  }
}

function getDefaultLifestyleRecords(): LifestyleRecords {
  return {
    exercises: [],
    diets: [],
    sleeps: [],
    vitalSigns: [],
  }
}

export async function fetchLifestyleRecords(password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  const records = await loadLifestyleRecords(password)
  return { code: 0, data: records || getDefaultLifestyleRecords() }
}

export async function saveLifestyleData(records: LifestyleRecords, password: string): Promise<ApiResponse<{ success: boolean }>> {
  await delay(200)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: { success: true } }
}

export async function addExerciseRecord(record: ExerciseRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.exercises.push(record)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function updateExerciseRecord(record: ExerciseRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  const idx = records.exercises.findIndex(r => r.id === record.id)
  if (idx >= 0) {
    records.exercises[idx] = record
  }
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function deleteExerciseRecord(id: string, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.exercises = records.exercises.filter(r => r.id !== id)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function addDietRecord(record: DietRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.diets.push(record)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function updateDietRecord(record: DietRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  const idx = records.diets.findIndex(r => r.id === record.id)
  if (idx >= 0) {
    records.diets[idx] = record
  }
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function deleteDietRecord(id: string, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.diets = records.diets.filter(r => r.id !== id)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function addSleepRecord(record: SleepRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.sleeps.push(record)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function updateSleepRecord(record: SleepRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  const idx = records.sleeps.findIndex(r => r.id === record.id)
  if (idx >= 0) {
    records.sleeps[idx] = record
  }
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function deleteSleepRecord(id: string, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.sleeps = records.sleeps.filter(r => r.id !== id)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function addVitalSignRecord(record: VitalSignRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.vitalSigns.push(record)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function updateVitalSignRecord(record: VitalSignRecord, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  const idx = records.vitalSigns.findIndex(r => r.id === record.id)
  if (idx >= 0) {
    records.vitalSigns[idx] = record
  }
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}

export async function deleteVitalSignRecord(id: string, records: LifestyleRecords, password: string): Promise<ApiResponse<LifestyleRecords>> {
  await delay(200)
  records.vitalSigns = records.vitalSigns.filter(r => r.id !== id)
  await saveLifestyleRecords(records, password)
  return { code: 0, data: records }
}
