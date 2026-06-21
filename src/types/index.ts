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
