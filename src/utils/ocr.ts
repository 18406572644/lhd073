import type { IndicatorItem, OcrIndicatorResult, OcrPhotoItem, OcrTemplateMatch } from '@/types'
import { isAbnormalValue } from '@/api/mock'

const HOSPITAL_TEMPLATES = [
  {
    name: '北京协和医院',
    keywords: ['协和', '北京协和', 'PUMCH', '中国医学科学院'],
    patterns: {
      indicatorLine: /^([\u4e00-\u9fa5a-zA-Z]+)\s+([\d.]+)\s*([\u4e00-\u9fa5/^]+)\s*([\d.]+\s*[-~]\s*[\d.]+)/,
      valueColumn: 1,
      unitColumn: 2,
      rangeColumn: 3,
    },
  },
  {
    name: '上海瑞金医院',
    keywords: ['瑞金', '上海瑞金', '瑞金医院', '上海交通大学医学院'],
    patterns: {
      indicatorLine: /([\u4e00-\u9fa5a-zA-Z]+)\s*:\s*([\d.]+)\s*([\u4e00-\u9fa5/^]+)\s*\(([\d.]+\s*[-~]\s*[\d.]+)\)/,
      valueColumn: 1,
      unitColumn: 2,
      rangeColumn: 3,
    },
  },
  {
    name: '广州中山医院',
    keywords: ['中山', '中山大学', '中山医院', '中山一院'],
    patterns: {
      indicatorLine: /([\u4e00-\u9fa5a-zA-Z]+)\s+([\d.]+)\s+([\u4e00-\u9fa5/^]+)\s+参考值\s*:\s*([\d.]+\s*[-~]\s*[\d.]+)/,
      valueColumn: 1,
      unitColumn: 2,
      rangeColumn: 3,
    },
  },
  {
    name: '华西医院',
    keywords: ['华西', '四川大学华西', '华西医院'],
    patterns: {
      indicatorLine: /\|\s*([\u4e00-\u9fa5a-zA-Z]+)\s*\|\s*([\d.]+)\s*\|\s*([\u4e00-\u9fa5/^]+)\s*\|\s*([\d.]+\s*[-~]\s*[\d.]+)\s*\|/,
      valueColumn: 1,
      unitColumn: 2,
      rangeColumn: 3,
    },
  },
]

const INDICATOR_ALIASES: Record<string, string[]> = {
  wbc: ['白细胞', '白细胞计数', 'WBC', '白细胞数'],
  rbc: ['红细胞', '红细胞计数', 'RBC', '红细胞数'],
  hgb: ['血红蛋白', 'HGB', 'Hb', '血色素'],
  plt: ['血小板', '血小板计数', 'PLT', '血小板数'],
  alt: ['谷丙转氨酶', 'ALT', '丙氨酸氨基转移酶', 'GPT'],
  ast: ['谷草转氨酶', 'AST', '天门冬氨酸氨基转移酶', 'GOT'],
  tbil: ['总胆红素', 'TBIL', 'T-BIL', '胆红素总量'],
  alb: ['白蛋白', 'ALB', '清蛋白'],
  cr: ['肌酐', 'Cr', 'CRE', '血肌酐'],
  bun: ['尿素氮', 'BUN', '尿素'],
  ua: ['尿酸', 'UA', '血尿酸'],
  glu: ['空腹血糖', '血糖', 'GLU', '葡萄糖'],
  hba1c: ['糖化血红蛋白', 'HbA1c', '糖化', '糖化血红蛋白%'],
  tc: ['总胆固醇', 'TC', '胆固醇'],
  tg: ['甘油三酯', 'TG', '三酰甘油'],
  hdl: ['高密度脂蛋白', 'HDL', 'HDL-C', '高密度脂蛋白胆固醇'],
  ldl: ['低密度脂蛋白', 'LDL', 'LDL-C', '低密度脂蛋白胆固醇'],
  sbp: ['收缩压', '高压', 'SBP', '上压'],
  dbp: ['舒张压', '低压', 'DBP', '下压'],
  hr: ['心率', 'HR', '脉搏', 'P'],
  bmi: ['体质指数', 'BMI', '体重指数'],
  wt: ['体重', 'WT', 'Weight'],
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function matchHospitalTemplate(text: string): OcrTemplateMatch | null {
  let bestMatch: OcrTemplateMatch | null = null
  let highestConfidence = 0

  for (const template of HOSPITAL_TEMPLATES) {
    let matchCount = 0
    for (const keyword of template.keywords) {
      if (text.includes(keyword)) {
        matchCount++
      }
    }
    const confidence = matchCount / template.keywords.length
    if (confidence > highestConfidence && confidence > 0.3) {
      highestConfidence = confidence
      bestMatch = { hospital: template.name, confidence }
    }
  }

  if (!bestMatch) {
    return { hospital: '通用模板', confidence: 0.5 }
  }
  return bestMatch
}

function parseValueFromString(text: string): number | null {
  const match = text.match(/[\d.]+/)
  if (match) {
    const value = parseFloat(match[0])
    if (!isNaN(value)) return value
  }
  return null
}

function parseRangeFromString(text: string): { min: number; max: number } | null {
  const match = text.match(/([\d.]+)\s*[-~]\s*([\d.]+)/)
  if (match) {
    const min = parseFloat(match[1])
    const max = parseFloat(match[2])
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max }
    }
  }
  return null
}

function findIndicatorByName(name: string, indicators: IndicatorItem[]): IndicatorItem | null {
  const nameLower = name.toLowerCase().trim()
  for (const ind of indicators) {
    if (ind.name.toLowerCase() === nameLower) return ind
    const aliases = INDICATOR_ALIASES[ind.id] || []
    for (const alias of aliases) {
      if (alias.toLowerCase() === nameLower) return ind
    }
    if (ind.name.toLowerCase().includes(nameLower) || nameLower.includes(ind.name.toLowerCase())) {
      return ind
    }
  }
  return null
}

function calculateConfidence(
  rawText: string,
  parsedValue: number | null,
  indicatorMatch: IndicatorItem | null,
  rangeMatch: boolean,
  templateConfidence: number
): number {
  let confidence = 0.5

  if (parsedValue !== null) confidence += 0.15
  if (indicatorMatch) confidence += 0.2
  if (rangeMatch) confidence += 0.1
  confidence += templateConfidence * 0.05

  if (rawText.length > 50) confidence -= 0.1
  if (rawText.length < 3) confidence -= 0.05

  if (indicatorMatch && parsedValue !== null) {
    const range = indicatorMatch.normalRange
    const midPoint = (range.min + range.max) / 2
    const rangeWidth = range.max - range.min || 1
    const deviation = Math.abs(parsedValue - midPoint) / rangeWidth
    if (deviation > 2) confidence -= 0.1
  }

  return Math.min(Math.max(confidence, 0.1), 0.99)
}

export function simulateOcrText(): string {
  const hospitalIndex = Math.floor(Math.random() * HOSPITAL_TEMPLATES.length)
  const hospital = HOSPITAL_TEMPLATES[hospitalIndex]

  const sampleReports = [
    `${hospital.name}体检报告
姓名：张三 性别：男 年龄：35岁
体检日期：2024-01-15

【血常规】
白细胞 6.8 10^9/L 3.5-9.5
红细胞 5.2 10^12/L 4.3-5.8
血红蛋白 155 g/L 130-175
血小板 220 10^9/L 125-350

【肝功能】
谷丙转氨酶 35 U/L 0-40
谷草转氨酶 28 U/L 0-40
总胆红素 12.5 μmol/L 3.4-17.1
白蛋白 48 g/L 40-55

【肾功能】
肌酐 85 μmol/L 57-111
尿素氮 5.2 mmol/L 2.6-7.5
尿酸 380 μmol/L 149-416

【血糖血脂】
空腹血糖 5.8 mmol/L 3.9-6.1
糖化血红蛋白 5.6 % 4.0-6.0
总胆固醇 4.8 mmol/L 2.8-5.17
甘油三酯 1.2 mmol/L 0.56-1.7
高密度脂蛋白 1.4 mmol/L 1.04-1.55
低密度脂蛋白 2.8 mmol/L 0-3.37`,

    `${hospital.name}检验报告单
姓名：李四 年龄：42岁
科室：体检中心 日期：2024-03-20

检验项目 结果 单位 参考值
白细胞: 8.2 10^9/L (3.5-9.5)
红细胞: 5.5 10^12/L (4.3-5.8)
血红蛋白: 148 g/L (130-175)
血小板: 198 10^9/L (125-350)
谷丙转氨酶: 45 U/L (0-40) ↑
谷草转氨酶: 32 U/L (0-40)
总胆红素: 15.2 μmol/L (3.4-17.1)
白蛋白: 45 g/L (40-55)
肌酐: 92 μmol/L (57-111)
尿素氮: 6.8 mmol/L (2.6-7.5)
尿酸: 450 μmol/L (149-416) ↑
空腹血糖: 7.2 mmol/L (3.9-6.1) ↑
总胆固醇: 6.2 mmol/L (2.8-5.17) ↑
甘油三酯: 2.1 mmol/L (0.56-1.7) ↑`,
  ]

  return sampleReports[Math.floor(Math.random() * sampleReports.length)]
}

export async function recognizeIndicators(
  imageData: string,
  indicators: IndicatorItem[],
  onProgress?: (progress: number) => void
): Promise<{ results: OcrIndicatorResult[]; template: OcrTemplateMatch | null; rawText: string }> {
  for (let i = 1; i <= 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 80))
    if (onProgress) onProgress(i * 10)
  }

  const rawText = simulateOcrText()
  const template = matchHospitalTemplate(rawText)
  const templateConfidence = template?.confidence || 0.5

  const lines = rawText.split('\n')
  const results: OcrIndicatorResult[] = []
  const foundIndicators = new Set<string>()

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('【') || trimmedLine.includes('姓名') || trimmedLine.includes('日期') || trimmedLine.includes('检验项目')) {
      continue
    }

    for (const ind of indicators) {
      if (foundIndicators.has(ind.id)) continue

      const aliases = INDICATOR_ALIASES[ind.id] || [ind.name]
      let matched = false
      let matchedAlias = ''

      for (const alias of aliases) {
        if (trimmedLine.includes(alias) || trimmedLine.toLowerCase().includes(alias.toLowerCase())) {
          matched = true
          matchedAlias = alias
          break
        }
      }

      if (matched) {
        const parsedValue = parseValueFromString(trimmedLine)
        const rangeMatch = parseRangeFromString(trimmedLine) !== null
        const confidence = calculateConfidence(trimmedLine, parsedValue, ind, rangeMatch, templateConfidence)

        let isAbnormal = false
        if (parsedValue !== null) {
          isAbnormal = isAbnormalValue(ind, parsedValue)
        }

        const result: OcrIndicatorResult = {
          id: generateId(),
          indicatorId: ind.id,
          name: ind.name,
          rawText: trimmedLine,
          value: parsedValue,
          unit: ind.unit,
          normalRange: `${ind.normalRange.min} - ${ind.normalRange.max}`,
          confidence,
          isLowConfidence: confidence < 0.7,
          isAbnormal,
          healthNote: '',
          isEdited: false,
        }

        results.push(result)
        foundIndicators.add(ind.id)
        break
      }
    }
  }

  const randomLowConfidence = Math.floor(Math.random() * 3)
  for (let i = 0; i < randomLowConfidence && i < results.length; i++) {
    const idx = Math.floor(Math.random() * results.length)
    results[idx].confidence = 0.5 + Math.random() * 0.15
    results[idx].isLowConfidence = true
  }

  return { results, template, rawText }
}

export function createOcrPhotoItem(file: File, dataUrl: string): OcrPhotoItem {
  return {
    id: generateId(),
    file,
    dataUrl,
    fileName: file.name,
    status: 'pending',
    results: [],
    progress: 0,
  }
}

export function mergeOcrResultsToIndicators(ocrResults: OcrIndicatorResult[]): { indicatorId: string; value: number; isAbnormal: boolean; healthNote: string }[] {
  return ocrResults
    .filter(r => r.value !== null)
    .map(r => ({
      indicatorId: r.indicatorId,
      value: r.value!,
      isAbnormal: r.isAbnormal,
      healthNote: r.healthNote,
    }))
}

export function calculateBatchStats(photos: OcrPhotoItem[]): { totalPhotos: number; successCount: number; failedCount: number; totalIndicators: number; lowConfidenceCount: number; abnormalCount: number } {
  const successCount = photos.filter(p => p.status === 'success').length
  const failedCount = photos.filter(p => p.status === 'failed').length
  const allResults = photos.flatMap(p => p.results)
  const totalIndicators = allResults.length
  const lowConfidenceCount = allResults.filter(r => r.isLowConfidence).length
  const abnormalCount = allResults.filter(r => r.isAbnormal).length

  return {
    totalPhotos: photos.length,
    successCount,
    failedCount,
    totalIndicators,
    lowConfidenceCount,
    abnormalCount,
  }
}
