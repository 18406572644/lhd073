export interface IndicatorItem {
  id: string
  name: string
  category: string
  unit: string
  normalRange: { min: number; max: number }
  description: string
}

export interface IndicatorValue {
  indicatorId: string
  value: number
  isAbnormal: boolean
  healthNote: string
}

export interface PhotoRecord {
  id: string
  recordId: string
  dataUrl: string
  fileName: string
}

export interface ExamRecord {
  id: string
  year: number
  date: string
  photos: PhotoRecord[]
  indicators: IndicatorValue[]
  notes: string
}

export interface ApiResponse<T> {
  code: number
  data: T
}

export interface OcrIndicatorResult {
  id: string
  indicatorId: string
  name: string
  rawText: string
  value: number | null
  unit: string
  normalRange: string
  confidence: number
  isLowConfidence: boolean
  isAbnormal: boolean
  healthNote: string
  isEdited: boolean
}

export interface OcrPhotoItem {
  id: string
  file: File | null
  dataUrl: string
  fileName: string
  status: 'pending' | 'recognizing' | 'success' | 'failed'
  results: OcrIndicatorResult[]
  error?: string
  progress: number
}

export interface OcrTemplateMatch {
  hospital: string
  confidence: number
}

export interface OcrBatchResult {
  totalPhotos: number
  successCount: number
  failedCount: number
  totalIndicators: number
  lowConfidenceCount: number
  abnormalCount: number
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskFactor {
  name: string
  value: string | number
  weight: number
  description: string
}

export interface RiskAssessment {
  id: string
  name: string
  description: string
  icon: string
  level: RiskLevel
  score: number
  probability: number
  factors: RiskFactor[]
  suggestions: string[]
  model: string
}

export interface LifestyleData {
  age: number
  gender: 'male' | 'female'
  smoking: boolean
  smokingYears?: number
  cigarettesPerDay?: number
  alcohol: 'none' | 'occasional' | 'moderate' | 'heavy'
  exercise: 'none' | 'rare' | 'weekly' | 'daily'
  exerciseMinutesPerWeek?: number
  sleepHours: number
  stress: 'low' | 'medium' | 'high'
  familyHistory: {
    hypertension: boolean
    diabetes: boolean
    cardiovascular: boolean
    fattyLiver: boolean
    hyperlipidemia: boolean
  }
  diet: 'healthy' | 'moderate' | 'unhealthy'
}

export interface RiskAssessmentInput {
  lifestyle: LifestyleData
  indicators: Map<string, number>
}

export type FamilyRelation = 'self' | 'father' | 'mother' | 'paternal_grandfather' | 'paternal_grandmother' | 'maternal_grandfather' | 'maternal_grandmother' | 'sibling' | 'child' | 'spouse'

export type DiseaseType = 'hypertension' | 'diabetes' | 'cardiovascular' | 'hyperlipidemia' | 'fatty_liver' | 'cancer' | 'stroke' | 'gout' | 'kidney_disease' | 'thyroid_disease'

export interface FamilyDiseaseRecord {
  diseaseType: DiseaseType
  diagnosedAge?: number
  severity: 'mild' | 'moderate' | 'severe'
  notes: string
}

export interface FamilyMember {
  id: string
  name: string
  relation: FamilyRelation
  gender: 'male' | 'female'
  age: number
  isDeceased: boolean
  deceasedAge?: number
  diseases: FamilyDiseaseRecord[]
  healthNotes: string
}

export interface GeneticRiskItem {
  diseaseType: DiseaseType
  diseaseName: string
  riskLevel: RiskLevel
  riskScore: number
  affectedMembers: string[]
  inheritancePattern: string
  description: string
  suggestions: string[]
}

export interface FamilyHealthPortrait {
  totalMembers: number
  diseaseDistribution: Record<DiseaseType, number>
  topRisks: GeneticRiskItem[]
  healthScore: number
  overallLevel: RiskLevel
}

export const DISEASE_LABELS: Record<DiseaseType, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  cardiovascular: '心血管疾病',
  hyperlipidemia: '高血脂',
  fatty_liver: '脂肪肝',
  cancer: '恶性肿瘤',
  stroke: '脑卒中',
  gout: '痛风',
  kidney_disease: '肾脏疾病',
  thyroid_disease: '甲状腺疾病',
}

export const RELATION_LABELS: Record<FamilyRelation, string> = {
  self: '本人',
  father: '父亲',
  mother: '母亲',
  paternal_grandfather: '祖父',
  paternal_grandmother: '祖母',
  maternal_grandfather: '外祖父',
  maternal_grandmother: '外祖母',
  sibling: '兄弟姐妹',
  child: '子女',
  spouse: '配偶',
}

export const SEVERITY_LABELS: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
}

export type ExerciseType = 'running' | 'walking' | 'cycling' | 'swimming' | 'yoga' | 'strength' | 'hiit' | 'other'

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  running: '跑步',
  walking: '步行',
  cycling: '骑行',
  swimming: '游泳',
  yoga: '瑜伽',
  strength: '力量训练',
  hiit: 'HIIT',
  other: '其他',
}

export interface ExerciseRecord {
  id: string
  date: string
  type: ExerciseType
  duration: number
  calories: number
  feeling: 'great' | 'good' | 'normal' | 'tired' | 'sore'
  notes: string
}

export const EXERCISE_FEELING_LABELS: Record<string, string> = {
  great: '非常棒',
  good: '还不错',
  normal: '一般',
  tired: '有点累',
  sore: '肌肉酸痛',
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export type DietHealthLevel = 'healthy' | 'moderate' | 'unhealthy'

export const DIET_HEALTH_LABELS: Record<DietHealthLevel, string> = {
  healthy: '健康',
  moderate: '一般',
  unhealthy: '不健康',
}

export interface DietRecord {
  id: string
  date: string
  mealType: MealType
  foodItems: string
  healthLevel: DietHealthLevel
  calories?: number
  notes: string
}

export type SleepQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor'

export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  excellent: '非常好',
  good: '良好',
  fair: '一般',
  poor: '较差',
  very_poor: '很差',
}

export interface SleepRecord {
  id: string
  date: string
  duration: number
  quality: SleepQuality
  bedTime?: string
  wakeTime?: string
  notes: string
}

export type VitalSignType = 'weight' | 'blood_pressure' | 'heart_rate' | 'blood_sugar' | 'bmi' | 'body_fat'

export const VITAL_SIGN_TYPE_LABELS: Record<VitalSignType, string> = {
  weight: '体重',
  blood_pressure: '血压',
  heart_rate: '心率',
  blood_sugar: '血糖',
  bmi: 'BMI',
  body_fat: '体脂率',
}

export const VITAL_SIGN_UNITS: Record<VitalSignType, string> = {
  weight: 'kg',
  blood_pressure: 'mmHg',
  heart_rate: '次/分',
  blood_sugar: 'mmol/L',
  bmi: 'kg/m²',
  body_fat: '%',
}

export interface VitalSignRecord {
  id: string
  date: string
  type: VitalSignType
  value: number
  value2?: number
  notes: string
}

export interface LifestyleRecords {
  exercises: ExerciseRecord[]
  diets: DietRecord[]
  sleeps: SleepRecord[]
  vitalSigns: VitalSignRecord[]
}
