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
