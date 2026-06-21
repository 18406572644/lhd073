import type { IndicatorItem, ExamRecord, IndicatorValue } from '@/types'

export type ReportTimeDimension = 'single' | 'quarter' | 'year' | 'all'

export interface ReportBasicInfo {
  reportTitle: string
  generateDate: string
  recordCount: number
  dateRange: string
  timeDimension: ReportTimeDimension
  targetRecords: ExamRecord[]
}

export interface AbnormalIndicatorSummary {
  indicatorId: string
  indicatorName: string
  category: string
  unit: string
  normalRange: { min: number; max: number }
  latestValue: number
  direction: 'high' | 'low'
  count: number
  firstDate: string
  lastDate: string
  healthNote: string
  trend: 'improving' | 'worsening' | 'stable'
}

export interface SystemAnalysisItem {
  category: string
  totalCount: number
  abnormalCount: number
  normalCount: number
  abnormalRate: number
  indicators: {
    indicatorId: string
    name: string
    unit: string
    value: number
    normalRange: { min: number; max: number }
    isAbnormal: boolean
    direction: 'high' | 'low' | 'normal'
    healthNote: string
  }[]
}

export interface CompareChangeItem {
  indicatorId: string
  indicatorName: string
  unit: string
  previousValue: number | null
  currentValue: number
  changeValue: number
  changePercent: number
  previousDate: string
  currentDate: string
  direction: 'up' | 'down' | 'unchanged'
  isPreviousAbnormal: boolean
  isCurrentAbnormal: boolean
  statusChange: 'normal_to_abnormal' | 'abnormal_to_normal' | 'both_normal' | 'both_abnormal'
}

export interface HealthSuggestion {
  category: 'lifestyle' | 'diet' | 'exercise' | 'medical' | 'monitoring'
  priority: 'high' | 'medium' | 'low'
  title: string
  content: string
  relatedIndicators: string[]
}

export interface HealthReport {
  basicInfo: ReportBasicInfo
  abnormalSummary: AbnormalIndicatorSummary[]
  systemAnalysis: SystemAnalysisItem[]
  compareChanges: CompareChangeItem[]
  suggestions: HealthSuggestion[]
  healthScore: number
  overallLevel: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface TrendPoint {
  date: string
  value: number
  isAbnormal: boolean
}

export interface KeyIndicatorTrend {
  indicatorId: string
  indicatorName: string
  unit: string
  normalRange: { min: number; max: number }
  points: TrendPoint[]
}

function getIndicatorById(indicators: IndicatorItem[], id: string): IndicatorItem | undefined {
  return indicators.find(i => i.id === id)
}

function sortRecordsByDate(records: ExamRecord[]): ExamRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date))
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

function getDirection(indicator: IndicatorItem, value: number): 'high' | 'low' | 'normal' {
  if (value > indicator.normalRange.max) return 'high'
  if (value < indicator.normalRange.min) return 'low'
  return 'normal'
}

export function filterRecordsByDimension(
  records: ExamRecord[],
  dimension: ReportTimeDimension,
  options?: { year?: number; quarter?: number; recordId?: string }
): ExamRecord[] {
  const sorted = sortRecordsByDate(records)

  switch (dimension) {
    case 'single':
      if (options?.recordId) {
        const r = records.find(rec => rec.id === options.recordId)
        return r ? [r] : []
      }
      return sorted.length > 0 ? [sorted[sorted.length - 1]] : []

    case 'quarter': {
      const targetYear = options?.year || new Date().getFullYear()
      const targetQuarter = options?.quarter || Math.floor(new Date().getMonth() / 3) + 1
      return sorted.filter(r => {
        const d = new Date(r.date)
        const q = Math.floor(d.getMonth() / 3) + 1
        return d.getFullYear() === targetYear && q === targetQuarter
      })
    }

    case 'year': {
      const targetYear = options?.year || new Date().getFullYear()
      return sorted.filter(r => r.year === targetYear)
    }

    case 'all':
    default:
      return sorted
  }
}

export function generateBasicInfo(
  records: ExamRecord[],
  dimension: ReportTimeDimension,
  options?: { year?: number; quarter?: number; recordId?: string }
): ReportBasicInfo {
  const targetRecords = filterRecordsByDimension(records, dimension, options)
  const now = new Date()
  const generateDate = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`

  let dateRange = '无数据'
  if (targetRecords.length > 0) {
    const sorted = sortRecordsByDate(targetRecords)
    const first = sorted[0].date
    const last = sorted[sorted.length - 1].date
    dateRange = first === last ? formatDateDisplay(first) : `${formatDateDisplay(first)} 至 ${formatDateDisplay(last)}`
  }

  let reportTitle = '健康分析报告'
  switch (dimension) {
    case 'single':
      reportTitle = '单次体检健康分析报告'
      break
    case 'quarter': {
      const y = options?.year || new Date().getFullYear()
      const q = options?.quarter || Math.floor(new Date().getMonth() / 3) + 1
      reportTitle = `${y}年第${q}季度健康分析报告`
      break
    }
    case 'year': {
      const y = options?.year || new Date().getFullYear()
      reportTitle = `${y}年度健康分析报告`
      break
    }
    case 'all':
      reportTitle = '综合健康分析报告'
      break
  }

  return {
    reportTitle,
    generateDate,
    recordCount: targetRecords.length,
    dateRange,
    timeDimension: dimension,
    targetRecords,
  }
}

export function generateAbnormalSummary(
  targetRecords: ExamRecord[],
  indicators: IndicatorItem[]
): AbnormalIndicatorSummary[] {
  const abnormalMap = new Map<string, {
    values: { value: number; date: string; note: string }[]
  }>()

  const sorted = sortRecordsByDate(targetRecords)

  for (const record of sorted) {
    for (const iv of record.indicators) {
      const indicator = getIndicatorById(indicators, iv.indicatorId)
      if (!indicator) continue
      if (iv.isAbnormal) {
        const existing = abnormalMap.get(iv.indicatorId)
        if (existing) {
          existing.values.push({ value: iv.value, date: record.date, note: iv.healthNote })
        } else {
          abnormalMap.set(iv.indicatorId, {
            values: [{ value: iv.value, date: record.date, note: iv.healthNote }],
          })
        }
      }
    }
  }

  const result: AbnormalIndicatorSummary[] = []

  for (const [indicatorId, data] of abnormalMap.entries()) {
    const indicator = getIndicatorById(indicators, indicatorId)
    if (!indicator) continue

    const latest = data.values[data.values.length - 1]
    const direction = latest.value > indicator.normalRange.max ? 'high' : 'low'

    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (data.values.length >= 2) {
      const firstVal = data.values[0].value
      const lastVal = latest.value
      const range = indicator.normalRange.max - indicator.normalRange.min
      const delta = lastVal - firstVal

      if (direction === 'high') {
        if (delta < -range * 0.05) trend = 'improving'
        else if (delta > range * 0.05) trend = 'worsening'
      } else {
        if (delta > range * 0.05) trend = 'improving'
        else if (delta < -range * 0.05) trend = 'worsening'
      }
    }

    result.push({
      indicatorId,
      indicatorName: indicator.name,
      category: indicator.category,
      unit: indicator.unit,
      normalRange: indicator.normalRange,
      latestValue: latest.value,
      direction,
      count: data.values.length,
      firstDate: data.values[0].date,
      lastDate: latest.date,
      healthNote: latest.note || indicator.description,
      trend,
    })
  }

  result.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count
    return b.latestValue - a.latestValue
  })

  return result
}

export function generateSystemAnalysis(
  targetRecords: ExamRecord[],
  indicators: IndicatorItem[]
): SystemAnalysisItem[] {
  const sorted = sortRecordsByDate(targetRecords)
  if (sorted.length === 0) return []

  const latestRecord = sorted[sorted.length - 1]

  const categoryMap = new Map<string, typeof latestRecord.indicators>()
  for (const iv of latestRecord.indicators) {
    const indicator = getIndicatorById(indicators, iv.indicatorId)
    if (!indicator) continue
    const list = categoryMap.get(indicator.category) || []
    list.push(iv)
    categoryMap.set(indicator.category, list)
  }

  const result: SystemAnalysisItem[] = []

  for (const [category, values] of categoryMap.entries()) {
    const analysisIndicators = values.map(iv => {
      const indicator = getIndicatorById(indicators, iv.indicatorId)!
      return {
        indicatorId: iv.indicatorId,
        name: indicator.name,
        unit: indicator.unit,
        value: iv.value,
        normalRange: indicator.normalRange,
        isAbnormal: iv.isAbnormal,
        direction: getDirection(indicator, iv.value),
        healthNote: iv.healthNote,
      }
    })

    const abnormalCount = analysisIndicators.filter(i => i.isAbnormal).length
    const totalCount = analysisIndicators.length

    result.push({
      category,
      totalCount,
      abnormalCount,
      normalCount: totalCount - abnormalCount,
      abnormalRate: totalCount > 0 ? (abnormalCount / totalCount) * 100 : 0,
      indicators: analysisIndicators,
    })
  }

  result.sort((a, b) => b.abnormalRate - a.abnormalRate)

  return result
}

export function generateCompareChanges(
  targetRecords: ExamRecord[],
  indicators: IndicatorItem[]
): CompareChangeItem[] {
  const sorted = sortRecordsByDate(targetRecords)
  if (sorted.length < 2) return []

  const current = sorted[sorted.length - 1]
  const previous = sorted[sorted.length - 2]

  const result: CompareChangeItem[] = []

  for (const currentIv of current.indicators) {
    const indicator = getIndicatorById(indicators, currentIv.indicatorId)
    if (!indicator) continue

    const previousIv = previous.indicators.find(iv => iv.indicatorId === currentIv.indicatorId)
    const previousValue = previousIv ? previousIv.value : null

    const changeValue = previousValue !== null ? currentIv.value - previousValue : 0
    const changePercent = previousValue !== null && previousValue !== 0
      ? (changeValue / Math.abs(previousValue)) * 100
      : 0

    let direction: 'up' | 'down' | 'unchanged' = 'unchanged'
    if (changeValue > 0) direction = 'up'
    else if (changeValue < 0) direction = 'down'

    const isPreviousAbnormal = previousIv ? previousIv.isAbnormal : false
    const isCurrentAbnormal = currentIv.isAbnormal

    let statusChange: CompareChangeItem['statusChange'] = 'both_normal'
    if (!isPreviousAbnormal && isCurrentAbnormal) statusChange = 'normal_to_abnormal'
    else if (isPreviousAbnormal && !isCurrentAbnormal) statusChange = 'abnormal_to_normal'
    else if (isPreviousAbnormal && isCurrentAbnormal) statusChange = 'both_abnormal'

    result.push({
      indicatorId: currentIv.indicatorId,
      indicatorName: indicator.name,
      unit: indicator.unit,
      previousValue,
      currentValue: currentIv.value,
      changeValue,
      changePercent,
      previousDate: previous.date,
      currentDate: current.date,
      direction,
      isPreviousAbnormal,
      isCurrentAbnormal,
      statusChange,
    })
  }

  result.sort((a, b) => {
    const priority: Record<CompareChangeItem['statusChange'], number> = {
      normal_to_abnormal: 0,
      abnormal_to_normal: 1,
      both_abnormal: 2,
      both_normal: 3,
    }
    return priority[a.statusChange] - priority[b.statusChange]
  })

  return result
}

export function generateHealthSuggestions(
  abnormalSummary: AbnormalIndicatorSummary[],
  systemAnalysis: SystemAnalysisItem[],
  compareChanges: CompareChangeItem[]
): HealthSuggestion[] {
  const suggestions: HealthSuggestion[] = []

  const categorySuggestions: Record<string, (abnormals: AbnormalIndicatorSummary[]) => HealthSuggestion[]> = {
    血常规: (abnormals) => [
      {
        category: 'medical',
        priority: 'high' as const,
        title: '血液系统关注建议',
        content: `您的血常规指标有${abnormals.length}项持续异常，建议尽快到血液科就诊复查，必要时进行进一步检查以明确原因。`,
        relatedIndicators: abnormals.map(a => a.indicatorId),
      },
    ],
    肝功能: (abnormals) => [
      {
        category: 'lifestyle' as const,
        priority: 'high' as const,
        title: '肝脏养护建议',
        content: '肝功能指标异常，建议避免饮酒、熬夜，减少油腻食物摄入。保持规律作息，避免服用可能损伤肝脏的药物。',
        relatedIndicators: abnormals.map(a => a.indicatorId),
      },
      {
        category: 'medical' as const,
        priority: 'medium' as const,
        title: '肝功能复查建议',
        content: '建议1-2个月后复查肝功能，如持续异常需消化内科进一步检查，排除脂肪肝、肝炎等疾病可能。',
        relatedIndicators: abnormals.map(a => a.indicatorId),
      },
    ],
    肾功能: (abnormals) => [
      {
        category: 'diet' as const,
        priority: 'high' as const,
        title: '肾脏保护饮食建议',
        content: '肾功能指标异常时，建议控制蛋白质摄入，减少盐分，多饮水（每日1500-2000ml），避免高嘌呤食物。',
        relatedIndicators: abnormals.map(a => a.indicatorId),
      },
      {
        category: 'medical' as const,
        priority: 'high' as const,
        title: '肾功能复查建议',
        content: '建议到肾内科就诊评估，定期监测肾功能变化，关注尿液检查结果。',
        relatedIndicators: abnormals.map(a => a.indicatorId),
      },
    ],
    血糖血脂: (abnormals) => {
      const sug: HealthSuggestion[] = []
      const hasGlu = abnormals.some(a => a.indicatorId === 'glu' || a.indicatorId === 'hba1c')
      const hasLipid = abnormals.some(a => ['tc', 'tg', 'hdl', 'ldl'].includes(a.indicatorId))

      if (hasGlu) {
        sug.push({
          category: 'diet' as const,
          priority: 'high' as const,
          title: '血糖管理饮食建议',
          content: '血糖异常需严格控制碳水化合物摄入，减少精制糖和主食，增加膳食纤维。建议少食多餐，避免餐后血糖骤升。',
          relatedIndicators: ['glu', 'hba1c'],
        })
        sug.push({
          category: 'monitoring' as const,
          priority: 'high' as const,
          title: '血糖监测建议',
          content: '建议定期监测空腹血糖和餐后血糖，每3个月复查糖化血红蛋白。如持续升高需内分泌科就诊。',
          relatedIndicators: ['glu', 'hba1c'],
        })
      }
      if (hasLipid) {
        sug.push({
          category: 'diet' as const,
          priority: 'high' as const,
          title: '血脂调节饮食建议',
          content: '减少动物内脏、肥肉、油炸食品摄入，增加深海鱼类、坚果、全谷物。烹饪方式建议蒸、煮、凉拌。',
          relatedIndicators: ['tc', 'tg', 'hdl', 'ldl'],
        })
        sug.push({
          category: 'exercise' as const,
          priority: 'medium' as const,
          title: '改善血脂运动建议',
          content: '建议每周进行150分钟中等强度有氧运动，如快走、慢跑、游泳等，有助于调节血脂水平。',
          relatedIndicators: ['tc', 'tg', 'hdl', 'ldl'],
        })
      }
      return sug
    },
    血压: (abnormals) => [
      {
        category: 'lifestyle' as const,
        priority: 'high' as const,
        title: '血压管理生活建议',
        content: '血压异常需严格限盐（每日<5g），戒烟限酒，保持情绪稳定，避免熬夜和过度劳累。',
        relatedIndicators: ['sbp', 'dbp', 'hr'],
      },
      {
        category: 'monitoring' as const,
        priority: 'high' as const,
        title: '血压监测建议',
        content: '建议每日早晚各测量一次血压并记录，持续监测血压变化趋势。如血压持续升高需心血管科就诊。',
        relatedIndicators: ['sbp', 'dbp', 'hr'],
      },
      {
        category: 'exercise' as const,
        priority: 'medium' as const,
        title: '血压调节运动建议',
        content: '可选择低强度有氧运动如散步、太极拳等，避免剧烈运动。运动前后注意监测血压。',
        relatedIndicators: ['sbp', 'dbp', 'hr'],
      },
    ],
    体格: (abnormals) => {
      const sug: HealthSuggestion[] = []
      const hasBmi = abnormals.some(a => a.indicatorId === 'bmi')
      if (hasBmi) {
        const bmiAbnormal = abnormals.find(a => a.indicatorId === 'bmi')!
        if (bmiAbnormal.direction === 'high') {
          sug.push({
            category: 'diet' as const,
            priority: 'high' as const,
            title: '减重饮食建议',
            content: 'BMI偏高提示超重或肥胖，建议控制每日总热量摄入，减少高糖高脂食物，增加蔬菜和优质蛋白摄入。',
            relatedIndicators: ['bmi', 'wt'],
          })
          sug.push({
            category: 'exercise' as const,
            priority: 'high' as const,
            title: '减重运动建议',
            content: '建议每周累计运动150分钟以上，结合有氧运动（如快走、跑步）和力量训练，循序渐进增加运动量。',
            relatedIndicators: ['bmi', 'wt'],
          })
        } else {
          sug.push({
            category: 'diet' as const,
            priority: 'medium' as const,
            title: '增重营养建议',
            content: 'BMI偏低提示体重不足，建议适当增加每日热量摄入，保证优质蛋白质（鸡蛋、牛奶、瘦肉）摄入，少食多餐。',
            relatedIndicators: ['bmi', 'wt'],
          })
        }
      }
      return sug
    },
  }

  const abnormalByCategory = new Map<string, AbnormalIndicatorSummary[]>()
  for (const abn of abnormalSummary) {
    const list = abnormalByCategory.get(abn.category) || []
    list.push(abn)
    abnormalByCategory.set(abn.category, list)
  }

  for (const [category, abnormals] of abnormalByCategory.entries()) {
    const generator = categorySuggestions[category]
    if (generator) {
      suggestions.push(...generator(abnormals))
    }
  }

  const worseningItems = abnormalSummary.filter(a => a.trend === 'worsening')
  if (worseningItems.length > 0) {
    suggestions.push({
      category: 'medical',
      priority: 'high',
      title: '异常指标加重关注',
      content: `有${worseningItems.length}项异常指标呈加重趋势（${worseningItems.map(w => w.indicatorName).join('、')}），建议尽早就医评估。`,
      relatedIndicators: worseningItems.map(w => w.indicatorId),
    })
  }

  const newAbnormals = compareChanges.filter(c => c.statusChange === 'normal_to_abnormal')
  if (newAbnormals.length > 0) {
    suggestions.push({
      category: 'monitoring',
      priority: 'high',
      title: '新增异常指标关注',
      content: `与上次体检相比，有${newAbnormals.length}项指标新出现异常（${newAbnormals.map(n => n.indicatorName).join('、')}），建议关注并复查确认。`,
      relatedIndicators: newAbnormals.map(n => n.indicatorId),
    })
  }

  const improvedItems = compareChanges.filter(c => c.statusChange === 'abnormal_to_normal')
  if (improvedItems.length > 0) {
    suggestions.push({
      category: 'lifestyle',
      priority: 'low',
      title: '指标改善鼓励',
      content: `好消息！${improvedItems.length}项指标已恢复正常（${improvedItems.map(i => i.indicatorName).join('、')}），请继续保持良好的生活习惯。`,
      relatedIndicators: improvedItems.map(i => i.indicatorId),
    })
  }

  if (abnormalSummary.length === 0) {
    suggestions.push({
      category: 'lifestyle',
      priority: 'low',
      title: '保持健康生活方式',
      content: '您的体检指标全部正常，请继续保持规律作息、均衡饮食、适度运动的健康生活方式，定期体检监测健康状况。',
      relatedIndicators: [],
    })
  }

  if (!suggestions.some(s => s.category === 'exercise' && s.priority === 'low')) {
    const hasExerciseHigh = suggestions.some(s => s.category === 'exercise')
    if (!hasExerciseHigh) {
      suggestions.push({
        category: 'exercise',
        priority: 'low',
        title: '日常运动建议',
        content: '建议每周进行至少150分钟中等强度有氧运动，如快走、慢跑、游泳、骑行等，有助于维持心血管健康和新陈代谢。',
        relatedIndicators: [],
      })
    }
  }

  suggestions.sort((a, b) => {
    const priorityMap: Record<HealthSuggestion['priority'], number> = { high: 0, medium: 1, low: 2 }
    return priorityMap[a.priority] - priorityMap[b.priority]
  })

  return suggestions
}

export function calculateHealthScore(
  abnormalSummary: AbnormalIndicatorSummary[],
  systemAnalysis: SystemAnalysisItem[]
): { score: number; level: HealthReport['overallLevel'] } {
  let score = 100

  for (const abn of abnormalSummary) {
    if (abn.count >= 3) score -= 8
    else if (abn.count >= 2) score -= 5
    else score -= 3

    if (abn.trend === 'worsening') score -= 3
    else if (abn.trend === 'improving') score += 1
  }

  for (const sys of systemAnalysis) {
    if (sys.abnormalRate >= 50) score -= 5
    else if (sys.abnormalRate >= 30) score -= 3
  }

  score = Math.max(0, Math.min(100, score))

  let level: HealthReport['overallLevel'] = 'good'
  if (score >= 90) level = 'excellent'
  else if (score >= 75) level = 'good'
  else if (score >= 60) level = 'fair'
  else level = 'poor'

  return { score, level }
}

export function getKeyIndicatorTrends(
  targetRecords: ExamRecord[],
  indicators: IndicatorItem[]
): KeyIndicatorTrend[] {
  const sorted = sortRecordsByDate(targetRecords)
  const result: KeyIndicatorTrend[] = []

  const keyIndicatorIds = ['glu', 'tc', 'tg', 'sbp', 'dbp', 'bmi', 'alt', 'cr', 'ua', 'hba1c', 'hdl', 'ldl']

  for (const id of keyIndicatorIds) {
    const indicator = getIndicatorById(indicators, id)
    if (!indicator) continue

    const points: TrendPoint[] = []
    for (const record of sorted) {
      const iv = record.indicators.find(iv => iv.indicatorId === id)
      if (iv) {
        points.push({
          date: record.date,
          value: iv.value,
          isAbnormal: iv.isAbnormal,
        })
      }
    }

    if (points.length >= 2) {
      result.push({
        indicatorId: id,
        indicatorName: indicator.name,
        unit: indicator.unit,
        normalRange: indicator.normalRange,
        points,
      })
    }
  }

  return result
}

export function generateHealthReport(
  records: ExamRecord[],
  indicators: IndicatorItem[],
  dimension: ReportTimeDimension,
  options?: { year?: number; quarter?: number; recordId?: string }
): HealthReport {
  const basicInfo = generateBasicInfo(records, dimension, options)
  const targetRecords = basicInfo.targetRecords

  const abnormalSummary = generateAbnormalSummary(targetRecords, indicators)
  const systemAnalysis = generateSystemAnalysis(targetRecords, indicators)
  const compareChanges = generateCompareChanges(targetRecords, indicators)
  const suggestions = generateHealthSuggestions(abnormalSummary, systemAnalysis, compareChanges)
  const { score, level } = calculateHealthScore(abnormalSummary, systemAnalysis)

  return {
    basicInfo,
    abnormalSummary,
    systemAnalysis,
    compareChanges,
    suggestions,
    healthScore: score,
    overallLevel: level,
  }
}
