import jsPDF from 'jspdf'
import type { IndicatorItem, ExamRecord, IndicatorValue, PdfExportConfig } from '@/types'
import type { HealthReport, KeyIndicatorTrend } from './reportGenerator'

const MARGIN = 20
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BLUE_R = 74
const BLUE_G = 144
const BLUE_B = 217
const LIGHT_BLUE_R = 240
const LIGHT_BLUE_G = 247
const LIGHT_BLUE_B = 255
const FONT_SIZE_BASE = 12
const GREEN_R = 103
const GREEN_G = 194
const GREEN_B = 58
const RED_R = 208
const RED_G = 48
const RED_B = 80
const ORANGE_R = 230
const ORANGE_G = 126
const ORANGE_B = 34

function getIndicatorById(indicators: IndicatorItem[], id: string): IndicatorItem | undefined {
  return indicators.find(i => i.id === id)
}

function formatDate(dateStr: string): { display: string; sortKey: string } {
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { display: `${yyyy}年${mm}月${dd}日`, sortKey: `${yyyy}-${mm}-${dd}` }
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function todayDisplay(): string {
  const d = new Date()
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

function checkY(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN - 20) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function renderCnText(doc: jsPDF, text: string, x: number, y: number, fontSize: number, colorR = 0, colorG = 0, colorB = 0): number {
  if (!text) return y
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const scale = 2
  const fontFamily = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.font = `${fontSize * scale}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  canvas.width = Math.ceil(metrics.width + 4)
  canvas.height = Math.ceil(fontSize * scale * 1.4)
  const ctx2 = canvas.getContext('2d')!
  ctx2.fillStyle = `rgb(${colorR}, ${colorG}, ${colorB})`
  ctx2.textBaseline = 'top'
  ctx2.font = `${fontSize * scale}px ${fontFamily}`
  ctx2.fillText(text, 2, 2)
  const dataUrl = canvas.toDataURL('image/png')
  const mmWidth = (canvas.width / scale) * 0.352778
  const mmHeight = (canvas.height / scale) * 0.352778
  doc.addImage(dataUrl, 'PNG', x, y - mmHeight * 0.7, mmWidth, mmHeight)
  return y + mmHeight * 0.6
}

function getCnTextWidth(text: string, fontSize: number): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const scale = 2
  ctx.font = `${fontSize * scale}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
  const metrics = ctx.measureText(text)
  return (metrics.width / scale) * 0.352778
}

function renderCnTextCentered(doc: jsPDF, text: string, centerX: number, y: number, fontSize: number, colorR = 0, colorG = 0, colorB = 0): number {
  const w = getCnTextWidth(text, fontSize)
  return renderCnText(doc, text, centerX - w / 2, y, fontSize, colorR, colorG, colorB)
}

function wrapCnText(text: string, fontSize: number, maxWidth: number): string[] {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const scale = 2
  ctx.font = `${fontSize * scale}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
  const words = text.split('')
  const lines: string[] = []
  let cur = ''
  for (const ch of words) {
    const test = cur + ch
    const metrics = ctx.measureText(test)
    const mmWidth = (metrics.width / scale) * 0.352778
    if (mmWidth > maxWidth) {
      lines.push(cur)
      cur = ch
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function drawSectionHeader(doc: jsPDF, text: string, y: number, colorR = BLUE_R, colorG = BLUE_G, colorB = BLUE_B): number {
  doc.setFillColor(colorR, colorG, colorB)
  doc.rect(MARGIN, y - 1, 4, 10, 'F')
  y = renderCnText(doc, text, MARGIN + 10, y + 1, 14, colorR, colorG, colorB)
  y += 2
  doc.setDrawColor(colorR, colorG, colorB)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6
  return y
}

function renderHealthScore(doc: jsPDF, score: number, level: HealthReport['overallLevel'], y: number): number {
  const centerX = MARGIN + CONTENT_WIDTH / 2
  const scoreColors: Record<HealthReport['overallLevel'], [number, number, number]> = {
    excellent: [GREEN_R, GREEN_G, GREEN_B],
    good: [BLUE_R, BLUE_G, BLUE_B],
    fair: [ORANGE_R, ORANGE_G, ORANGE_B],
    poor: [RED_R, RED_G, RED_B],
  }
  const levelLabels: Record<HealthReport['overallLevel'], string> = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    poor: '较差',
  }
  const [cr, cg, cb] = scoreColors[level]

  const radius = 30
  const cy = y + radius + 5

  doc.setDrawColor(cr, cg, cb)
  doc.setLineWidth(4)
  doc.circle(centerX, cy, radius, 'S')

  doc.setDrawColor(240, 240, 240)
  doc.setLineWidth(0.5)

  y = renderCnTextCentered(doc, String(score), centerX, cy - 5, 28, cr, cg, cb)
  y = renderCnTextCentered(doc, levelLabels[level], centerX, cy + 15, 12, cr, cg, cb)

  return cy + radius + 15
}

function renderTrendChart(doc: jsPDF, trend: KeyIndicatorTrend, x: number, y: number, w: number, h: number): void {
  const padding = { top: 10, right: 10, bottom: 18, left: 25 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom
  const cx = x + padding.left
  const cy = y + padding.top

  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.2)
  doc.rect(x, y, w, h, 'S')

  const points = trend.points
  if (points.length < 2) return

  const values = points.map(p => p.value)
  const minVal = Math.min(...values, trend.normalRange.min)
  const maxVal = Math.max(...values, trend.normalRange.max)
  const valRange = maxVal - minVal || 1

  const titleText = `${trend.indicatorName} (${trend.unit})`
  renderCnText(doc, titleText, x + 4, y + 3, 8, BLUE_R, BLUE_G, BLUE_B)

  const xStep = chartW / (points.length - 1 || 1)
  const minY = trend.normalRange.min
  const maxY = trend.normalRange.max
  const normMinY = cy + chartH - ((minY - minVal) / valRange) * chartH
  const normMaxY = cy + chartH - ((maxY - minVal) / valRange) * chartH

  doc.setDrawColor(GREEN_R, GREEN_G, GREEN_B)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([2, 2], 0)
  doc.line(cx, normMinY, cx + chartW, normMinY)
  doc.line(cx, normMaxY, cx + chartW, normMaxY)
  doc.setLineDashPattern([], 0)

  doc.setTextColor(GREEN_R, GREEN_G, GREEN_B)
  doc.setFontSize(6)
  doc.text(String(trend.normalRange.min), x + 2, normMinY + 1)
  doc.text(String(trend.normalRange.max), x + 2, normMaxY + 1)

  const coords = points.map((p, i) => ({
    x: cx + i * xStep,
    y: cy + chartH - ((p.value - minVal) / valRange) * chartH,
  }))

  doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
  doc.setLineWidth(1.2)
  for (let i = 1; i < coords.length; i++) {
    doc.line(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y)
  }

  for (let i = 0; i < coords.length; i++) {
    const c = coords[i]
    const p = points[i]
    if (p.isAbnormal) {
      doc.setFillColor(RED_R, RED_G, RED_B)
    } else {
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
    }
    doc.circle(c.x, c.y, 1.5, 'F')
  }

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(6)
  const startLabel = points[0].date.slice(5)
  const endLabel = points[points.length - 1].date.slice(5)
  doc.text(startLabel, cx, y + h - 4)
  doc.text(endLabel, cx + chartW - 12, y + h - 4)
}

function renderHeader(doc: jsPDF, config: PdfExportConfig, pageNum: number, totalPages: number): void {
  if (config.headerFooter.headerText) {
    renderCnText(doc, config.headerFooter.headerText, MARGIN, 10, 9, 120, 120, 120)
  }

  const dateStr = todayDisplay()
  if (config.headerFooter.showGenerateDate) {
    const dateW = getCnTextWidth(dateStr, 9)
    renderCnText(doc, dateStr, PAGE_WIDTH - MARGIN - dateW, 10, 9, 120, 120, 120)
  }
}

function renderFooter(doc: jsPDF, config: PdfExportConfig, pageNum: number, totalPages: number): void {
  const footerY = PAGE_HEIGHT - 10

  if (config.headerFooter.showPageNumber) {
    const pageText = `第 ${pageNum} / ${totalPages} 页`
    const pageW = getCnTextWidth(pageText, 8)
    renderCnText(doc, pageText, PAGE_WIDTH - MARGIN - pageW, footerY, 8, 120, 120, 120)
  }

  if (config.headerFooter.footerText) {
    renderCnText(doc, config.headerFooter.footerText, MARGIN, footerY, 8, 120, 120, 120)
  }

  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, footerY - 4, PAGE_WIDTH - MARGIN, footerY - 4)
}

function applyHeadersFooters(doc: jsPDF, config: PdfExportConfig): void {
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    if (i > 1 || !config.cover.familyName) {
      renderHeader(doc, config, i, totalPages)
    }
    renderFooter(doc, config, i, totalPages)
  }
}

function renderCoverPage(doc: jsPDF, config: PdfExportConfig, report: HealthReport): void {
  if (!config.cover.familyName && !config.cover.logoDataUrl && config.cover.subtitle === '家庭健康档案') {
    return
  }

  const centerX = PAGE_WIDTH / 2
  let y = PAGE_HEIGHT / 2 - 60

  if (config.cover.logoDataUrl) {
    try {
      const logoSize = 30
      doc.addImage(config.cover.logoDataUrl, 'PNG', centerX - logoSize / 2, y - logoSize - 10, logoSize, logoSize)
    } catch {
    }
  }

  if (config.cover.familyName) {
    y = renderCnTextCentered(doc, config.cover.familyName, centerX, y, 26, BLUE_R, BLUE_G, BLUE_B)
    y += 6
  }

  if (config.cover.subtitle) {
    y = renderCnTextCentered(doc, config.cover.subtitle, centerX, y, 16, 80, 80, 80)
    y += 10
  }

  doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 30, y, PAGE_WIDTH - MARGIN - 30, y)
  y += 12

  y = renderCnTextCentered(doc, report.basicInfo.reportTitle, centerX, y, 18, 0, 0, 0)
  y += 8
  y = renderCnTextCentered(doc, 'HEALTH ANALYSIS REPORT', centerX, y, 11, 150, 150, 150)
  y += 20
  y = renderCnTextCentered(doc, `生成日期：${report.basicInfo.generateDate}`, centerX, y, 11, 100, 100, 100)
  y += 6
  y = renderCnTextCentered(doc, `报告范围：${report.basicInfo.dateRange}`, centerX, y, 11, 100, 100, 100)
  y += 6
  y = renderCnTextCentered(doc, `体检记录：${report.basicInfo.recordCount} 份`, centerX, y, 11, 100, 100, 100)

  doc.addPage()
}

function renderSimpleTemplate(
  doc: jsPDF,
  report: HealthReport,
  trends: KeyIndicatorTrend[],
  indicators: IndicatorItem[],
  config: PdfExportConfig
): number {
  let y = MARGIN

  y = drawSectionHeader(doc, '一、健康总评', y)
  y = renderHealthScore(doc, report.healthScore, report.overallLevel, y)
  y += 4

  const summaryItems = [
    `参与分析的体检记录：${report.basicInfo.recordCount} 份`,
    `异常指标数量：${report.abnormalSummary.length} 项`,
    `健康建议：${report.suggestions.filter(s => s.priority === 'high').length} 条高优先级`,
  ]
  for (const item of summaryItems) {
    y = checkY(doc, y, 7)
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
    doc.circle(MARGIN + 3, y + 2, 1.2, 'F')
    y = renderCnText(doc, item, MARGIN + 10, y, 11, 60, 60, 60)
    y += 2
  }

  y += 4
  y = drawSectionHeader(doc, '二、异常指标汇总', y, RED_R, RED_G, RED_B)

  if (report.abnormalSummary.length === 0) {
    y = checkY(doc, y, 20)
    doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 15, 'F')
    y = renderCnTextCentered(doc, '恭喜！当前报告周期内未发现异常指标', PAGE_WIDTH / 2, y + 4, 12, GREEN_R, GREEN_G, GREEN_B)
    y += 20
  } else {
    const abnColWidths = [35, 18, 15, 35, 15, 28]
    const abnColX = [MARGIN]
    for (let i = 1; i < abnColWidths.length; i++) {
      abnColX.push(abnColX[i - 1] + abnColWidths[i - 1])
    }
    const abnHeaders = ['指标名称', '最新值', '单位', '正常范围', '次数', '状态']

    y = checkY(doc, y, 12)
    doc.setFillColor(RED_R, RED_G, RED_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
    for (let i = 0; i < abnHeaders.length; i++) {
      renderCnText(doc, abnHeaders[i], abnColX[i] + 2, y + 2, 8, 255, 255, 255)
    }
    y += 7

    const displayAbnormals = report.abnormalSummary.slice(0, 15)
    for (let i = 0; i < displayAbnormals.length; i++) {
      const abn = displayAbnormals[i]
      y = checkY(doc, y, 10)

      if (i % 2 === 0) {
        doc.setFillColor(255, 240, 240)
        doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
      }

      const dirText = abn.direction === 'high' ? '↑偏高' : '↓偏低'
      const rangeText = `${abn.normalRange.min}-${abn.normalRange.max}`

      renderCnText(doc, abn.indicatorName, abnColX[0] + 2, y + 2, 8, 0, 0, 0)
      doc.setTextColor(RED_R, RED_G, RED_B)
      doc.setFontSize(8)
      doc.text(String(abn.latestValue), abnColX[1] + 2, y + 6)
      doc.setTextColor(0, 0, 0)
      doc.text(abn.unit, abnColX[2] + 2, y + 6)
      doc.setFontSize(7)
      doc.text(rangeText, abnColX[3] + 2, y + 6)
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.text(String(abn.count), abnColX[4] + 4, y + 6)
      renderCnText(doc, dirText, abnColX[5] + 2, y + 2, 8, RED_R, RED_G, RED_B)

      y += 8
    }
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN, y - displayAbnormals.length * 8, CONTENT_WIDTH, displayAbnormals.length * 8 + 7, 'S')

    if (report.abnormalSummary.length > 15) {
      y = checkY(doc, y, 10)
      y = renderCnText(doc, `...还有 ${report.abnormalSummary.length - 15} 项异常指标，详细版报告请查看完整版`, MARGIN + 4, y, 9, 150, 150, 150)
      y += 6
    }
  }

  if (config.sections.suggestions) {
    y += 4
    y = drawSectionHeader(doc, '三、重要健康建议', y, ORANGE_R, ORANGE_G, ORANGE_B)

    const highPriority = report.suggestions.filter(s => s.priority === 'high').slice(0, 5)
    if (highPriority.length === 0) {
      const anySuggestion = report.suggestions.slice(0, 3)
      for (let si = 0; si < anySuggestion.length; si++) {
        const sug = anySuggestion[si]
        y = checkY(doc, y, 18)
        doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
        doc.rect(MARGIN, y, 3, 14, 'F')
        y = renderCnText(doc, sug.title, MARGIN + 8, y + 2, 10, BLUE_R, BLUE_G, BLUE_B)
        y += 2
        const contentLines = wrapCnText(sug.content, 9, CONTENT_WIDTH - 16)
        for (let li = 0; li < contentLines.length && li < 2; li++) {
          y = renderCnText(doc, contentLines[li], MARGIN + 8, y, 9, 70, 70, 70)
        }
        y += 4
      }
    } else {
      for (let si = 0; si < highPriority.length; si++) {
        const sug = highPriority[si]
        y = checkY(doc, y, 20)
        doc.setFillColor(RED_R, RED_G, RED_B)
        doc.rect(MARGIN, y, 3, 16, 'F')
        doc.setFillColor(255, 248, 248)
        doc.rect(MARGIN + 3, y, CONTENT_WIDTH - 3, 16, 'F')
        y = renderCnText(doc, sug.title, MARGIN + 8, y + 2, 10, RED_R, RED_G, RED_B)
        y += 2
        const contentLines = wrapCnText(sug.content, 9, CONTENT_WIDTH - 16)
        for (let li = 0; li < contentLines.length && li < 2; li++) {
          y = renderCnText(doc, contentLines[li], MARGIN + 8, y, 9, 70, 70, 70)
        }
        y += 4
      }
    }
  }

  return y
}

function renderMedicalTemplate(
  doc: jsPDF,
  report: HealthReport,
  trends: KeyIndicatorTrend[],
  indicators: IndicatorItem[],
  config: PdfExportConfig
): number {
  let y = MARGIN

  y = drawSectionHeader(doc, '一、重点异常指标', y, RED_R, RED_G, RED_B)

  if (report.abnormalSummary.length === 0) {
    y = checkY(doc, y, 20)
    doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 15, 'F')
    y = renderCnTextCentered(doc, '当前报告周期内未发现异常指标', PAGE_WIDTH / 2, y + 4, 12, GREEN_R, GREEN_G, GREEN_B)
    y += 20
  } else {
    const importantAbnormals = report.abnormalSummary.filter(a => a.count >= 2 || a.trend === 'worsening')
    const displayAbnormals = importantAbnormals.length > 0 ? importantAbnormals : report.abnormalSummary

    const abnColWidths = [30, 16, 12, 30, 12, 12, 20, 28]
    const abnColX = [MARGIN]
    for (let i = 1; i < abnColWidths.length; i++) {
      abnColX.push(abnColX[i - 1] + abnColWidths[i - 1])
    }
    const abnHeaders = ['指标名称', '最新值', '单位', '正常范围', '次数', '趋势', '持续时间', '就诊建议']

    y = checkY(doc, y, 12)
    doc.setFillColor(RED_R, RED_G, RED_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
    for (let i = 0; i < abnHeaders.length; i++) {
      renderCnText(doc, abnHeaders[i], abnColX[i] + 2, y + 2.5, 7.5, 255, 255, 255)
    }
    y += 8

    for (let i = 0; i < displayAbnormals.length && i < 20; i++) {
      const abn = displayAbnormals[i]
      y = checkY(doc, y, 12)

      if (i % 2 === 0) {
        doc.setFillColor(255, 240, 240)
        doc.rect(MARGIN, y, CONTENT_WIDTH, 10, 'F')
      }

      const dirText = abn.direction === 'high' ? '↑' : '↓'
      const trendText = abn.trend === 'improving' ? '好转' : abn.trend === 'worsening' ? '加重' : '稳定'
      const trendColor = abn.trend === 'improving' ? [GREEN_R, GREEN_G, GREEN_B] : abn.trend === 'worsening' ? [RED_R, RED_G, RED_B] : [ORANGE_R, ORANGE_G, ORANGE_B]
      const rangeText = `${abn.normalRange.min}-${abn.normalRange.max}`
      const durationText = abn.firstDate !== abn.lastDate ? `${abn.firstDate.slice(2)}起` : '单次'

      const medicalAdvice = abn.count >= 3 ? '建议复查' : abn.trend === 'worsening' ? '尽快就医' : '持续观察'

      renderCnText(doc, abn.indicatorName, abnColX[0] + 2, y + 2, 7.5, 0, 0, 0)
      doc.setTextColor(RED_R, RED_G, RED_B)
      doc.setFontSize(7.5)
      doc.text(`${dirText}${abn.latestValue}`, abnColX[1] + 2, y + 6.5)
      doc.setTextColor(0, 0, 0)
      doc.text(abn.unit, abnColX[2] + 2, y + 6.5)
      doc.setFontSize(6.5)
      doc.text(rangeText, abnColX[3] + 2, y + 6.5)
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(7.5)
      doc.text(String(abn.count), abnColX[4] + 4, y + 6.5)
      renderCnText(doc, trendText, abnColX[5] + 2, y + 2, 7.5, trendColor[0], trendColor[1], trendColor[2])
      renderCnText(doc, durationText, abnColX[6] + 2, y + 2, 7, 80, 80, 80)
      renderCnText(doc, medicalAdvice, abnColX[7] + 2, y + 2, 7.5, RED_R, RED_G, RED_B)

      y += 10
    }
    doc.setDrawColor(RED_R, RED_G, RED_B)
    doc.setLineWidth(0.3)
    doc.rect(MARGIN, y - displayAbnormals.length * 10, CONTENT_WIDTH, Math.min(displayAbnormals.length, 20) * 10 + 8, 'S')
  }

  if (config.sections.comparison && report.compareChanges.length > 0) {
    doc.addPage()
    y = MARGIN
    y = drawSectionHeader(doc, '二、与上次体检对比（就医参考）', y)

    const importantChanges = report.compareChanges.filter(c => c.statusChange !== 'both_normal').slice(0, 15)

    if (importantChanges.length > 0) {
      const changeColWidths = [35, 22, 22, 24, 24, 28]
      const changeColX = [MARGIN]
      for (let i = 1; i < changeColWidths.length; i++) {
        changeColX.push(changeColX[i - 1] + changeColWidths[i - 1])
      }
      const changeHeaders = ['指标名称', '上次', '本次', '变化值', '变化率', '状态']

      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
      doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
      for (let i = 0; i < changeHeaders.length; i++) {
        renderCnText(doc, changeHeaders[i], changeColX[i] + 2, y + 2, 8, 255, 255, 255)
      }
      y += 7

      for (let i = 0; i < importantChanges.length; i++) {
        const chg = importantChanges[i]
        y = checkY(doc, y, 10)

        if (i % 2 === 0) {
          doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
          doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
        }

        let statusChangeText = '-'
        let statusChangeColor: [number, number, number] = [120, 120, 120]
        switch (chg.statusChange) {
          case 'normal_to_abnormal': statusChangeText = '新异常'; statusChangeColor = [RED_R, RED_G, RED_B]; break
          case 'abnormal_to_normal': statusChangeText = '已恢复'; statusChangeColor = [GREEN_R, GREEN_G, GREEN_B]; break
          case 'both_abnormal': statusChangeText = '持续异常'; statusChangeColor = [ORANGE_R, ORANGE_G, ORANGE_B]; break
          case 'both_normal': statusChangeText = '均正常'; break
        }

        const changeSymbol = chg.direction === 'up' ? '+' : chg.direction === 'down' ? '-' : ''
        const changeText = chg.previousValue !== null ? `${changeSymbol}${chg.changeValue.toFixed(1)}` : '-'
        const changePercentText = chg.previousValue !== null ? `${changeSymbol}${chg.changePercent.toFixed(1)}%` : '-'
        const changeColor = chg.direction === 'up' ? [RED_R, RED_G, RED_B] : chg.direction === 'down' ? [GREEN_R, GREEN_G, GREEN_B] : [120, 120, 120]

        renderCnText(doc, chg.indicatorName, changeColX[0] + 2, y + 1.5, 8, 0, 0, 0)
        doc.setFontSize(8)
        doc.setTextColor(chg.isPreviousAbnormal ? RED_R : 0, chg.isPreviousAbnormal ? RED_G : 0, chg.isPreviousAbnormal ? RED_B : 0)
        doc.text(chg.previousValue !== null ? String(chg.previousValue) : '-', changeColX[1] + 2, y + 5.5)
        doc.setTextColor(chg.isCurrentAbnormal ? RED_R : 0, chg.isCurrentAbnormal ? RED_G : 0, chg.isCurrentAbnormal ? RED_B : 0)
        doc.text(String(chg.currentValue), changeColX[2] + 2, y + 5.5)
        doc.setTextColor(changeColor[0], changeColor[1], changeColor[2])
        doc.text(changeText, changeColX[3] + 2, y + 5.5)
        doc.text(changePercentText, changeColX[4] + 2, y + 5.5)
        doc.setTextColor(0, 0, 0)
        renderCnText(doc, statusChangeText, changeColX[5] + 2, y + 1.5, 8, statusChangeColor[0], statusChangeColor[1], statusChangeColor[2])

        y += 8
      }
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, y - importantChanges.length * 8, CONTENT_WIDTH, importantChanges.length * 8 + 7, 'S')
    }
  }

  if (config.sections.trends && trends.length > 0) {
    doc.addPage()
    y = MARGIN
    y = drawSectionHeader(doc, '三、异常指标趋势（重点关注）', y)

    const abnormalTrends = trends.filter(t => t.points.some(p => p.isAbnormal))
    const displayTrends = abnormalTrends.length > 0 ? abnormalTrends : trends.slice(0, 4)

    const chartW = CONTENT_WIDTH
    const chartH = 48
    for (let i = 0; i < displayTrends.length && i < 4; i++) {
      y = checkY(doc, y, chartH + 6)
      renderTrendChart(doc, displayTrends[i], MARGIN, y, chartW, chartH)
      y += chartH + 6
    }
  }

  if (config.sections.suggestions) {
    doc.addPage()
    y = MARGIN
    y = drawSectionHeader(doc, '四、就诊建议（供医生参考）', y, RED_R, RED_G, RED_B)

    const categoryIcons: Record<string, string> = {
      lifestyle: '生活方式',
      diet: '饮食建议',
      exercise: '运动建议',
      medical: '就医建议',
      monitoring: '监测建议',
    }
    const priorityColors: Record<string, [number, number, number]> = {
      high: [RED_R, RED_G, RED_B],
      medium: [ORANGE_R, ORANGE_G, ORANGE_B],
      low: [BLUE_R, BLUE_G, BLUE_B],
    }
    const priorityLabels: Record<string, string> = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    }

    const medicalSuggestions = report.suggestions.filter(s => s.category === 'medical' || s.priority === 'high')
    const otherSuggestions = report.suggestions.filter(s => s.category !== 'medical' && s.priority !== 'high')
    const allSuggestions = [...medicalSuggestions, ...otherSuggestions].slice(0, 10)

    for (let si = 0; si < allSuggestions.length; si++) {
      const sug = allSuggestions[si]
      y = checkY(doc, y, 28)

      const [pr, pg, pb] = priorityColors[sug.priority]
      doc.setFillColor(pr, pg, pb)
      doc.rect(MARGIN, y, 3, 20, 'F')

      doc.setFillColor(248, 250, 253)
      doc.rect(MARGIN + 3, y, CONTENT_WIDTH - 3, 20, 'F')

      y = renderCnText(doc, sug.title, MARGIN + 8, y + 2, 11, pr, pg, pb)
      const catText = `【${categoryIcons[sug.category] || '建议'} · ${priorityLabels[sug.priority]}】`
      const catW = getCnTextWidth(catText, 8)
      renderCnText(doc, catText, MARGIN + CONTENT_WIDTH - catW - 6, y + 1, 8, 130, 130, 130)
      y += 4

      const contentLines = wrapCnText(sug.content, 9, CONTENT_WIDTH - 16)
      for (let li = 0; li < contentLines.length && li < 3; li++) {
        y = renderCnText(doc, contentLines[li], MARGIN + 8, y, 9, 70, 70, 70)
      }
      y += 5
    }
  }

  return y
}

function renderDetailedTemplate(
  doc: jsPDF,
  report: HealthReport,
  trends: KeyIndicatorTrend[],
  indicators: IndicatorItem[],
  config: PdfExportConfig,
  records: ExamRecord[]
): number {
  let y = MARGIN

  y = drawSectionHeader(doc, '一、健康总评', y)
  y = renderHealthScore(doc, report.healthScore, report.overallLevel, y)
  y += 4

  const summaryItems = [
    `参与分析的体检记录：${report.basicInfo.recordCount} 份`,
    `涉及体检系统：${report.systemAnalysis.length} 个`,
    `异常指标数量：${report.abnormalSummary.length} 项`,
    `健康建议：${report.suggestions.length} 条`,
  ]
  for (const item of summaryItems) {
    y = checkY(doc, y, 7)
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
    doc.circle(MARGIN + 3, y + 2, 1.2, 'F')
    y = renderCnText(doc, item, MARGIN + 10, y, 11, 60, 60, 60)
    y += 2
  }

  y += 4
  y = drawSectionHeader(doc, '二、异常指标汇总', y)

  if (report.abnormalSummary.length === 0) {
    y = checkY(doc, y, 20)
    doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 15, 'F')
    y = renderCnTextCentered(doc, '恭喜！当前报告周期内未发现异常指标', PAGE_WIDTH / 2, y + 4, 12, GREEN_R, GREEN_G, GREEN_B)
    y += 20
  } else {
    const abnColWidths = [35, 18, 15, 35, 15, 15, 28]
    const abnColX = [MARGIN]
    for (let i = 1; i < abnColWidths.length; i++) {
      abnColX.push(abnColX[i - 1] + abnColWidths[i - 1])
    }
    const abnHeaders = ['指标名称', '最新值', '单位', '正常范围', '次数', '趋势', '状态']

    y = checkY(doc, y, 12)
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
    for (let i = 0; i < abnHeaders.length; i++) {
      renderCnText(doc, abnHeaders[i], abnColX[i] + 2, y + 2, 8, 255, 255, 255)
    }
    y += 7

    for (let i = 0; i < report.abnormalSummary.length; i++) {
      const abn = report.abnormalSummary[i]
      y = checkY(doc, y, 10)

      if (i % 2 === 0) {
        doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
        doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
      }

      const dirText = abn.direction === 'high' ? '↑偏高' : '↓偏低'
      const trendText = abn.trend === 'improving' ? '好转' : abn.trend === 'worsening' ? '加重' : '稳定'
      const trendR = abn.trend === 'improving' ? GREEN_R : abn.trend === 'worsening' ? RED_R : ORANGE_R
      const trendG = abn.trend === 'improving' ? GREEN_G : abn.trend === 'worsening' ? RED_G : ORANGE_G
      const trendB = abn.trend === 'improving' ? GREEN_B : abn.trend === 'worsening' ? RED_B : ORANGE_B
      const rangeText = `${abn.normalRange.min}-${abn.normalRange.max}`

      renderCnText(doc, abn.indicatorName, abnColX[0] + 2, y + 2, 8, 0, 0, 0)
      doc.setTextColor(RED_R, RED_G, RED_B)
      doc.setFontSize(8)
      doc.text(String(abn.latestValue), abnColX[1] + 2, y + 6)
      doc.setTextColor(0, 0, 0)
      doc.text(abn.unit, abnColX[2] + 2, y + 6)
      doc.setFontSize(7)
      doc.text(rangeText, abnColX[3] + 2, y + 6)
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.text(String(abn.count), abnColX[4] + 4, y + 6)
      renderCnText(doc, trendText, abnColX[5] + 2, y + 2, 8, trendR, trendG, trendB)
      renderCnText(doc, dirText, abnColX[6] + 2, y + 2, 8, RED_R, RED_G, RED_B)

      y += 8
    }
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN, y - report.abnormalSummary.length * 8, CONTENT_WIDTH, report.abnormalSummary.length * 8 + 7, 'S')
  }

  if (config.sections.trends && trends.length > 0) {
    y += 6
    y = drawSectionHeader(doc, '三、关键指标趋势图', y)

    const visibleTrends = trends.slice(0, 8)
    const chartW = (CONTENT_WIDTH - 6) / 2
    const chartH = 42
    for (let i = 0; i < visibleTrends.length; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const chartX = MARGIN + col * (chartW + 6)
      const chartY = y + row * (chartH + 6)

      if (i % 2 === 0) {
        y = checkY(doc, y, chartH + 6)
      }
      renderTrendChart(doc, visibleTrends[i], chartX, chartY, chartW, chartH)
    }
    y += Math.ceil(visibleTrends.length / 2) * (chartH + 6)
  }

  if (config.sections.indicators) {
    doc.addPage()
    y = MARGIN

    y = drawSectionHeader(doc, '四、各系统指标分析', y)

    for (let si = 0; si < report.systemAnalysis.length; si++) {
      const sys = report.systemAnalysis[si]
      y = checkY(doc, y, 40)

      const rateColor = sys.abnormalRate >= 30 ? [RED_R, RED_G, RED_B] : sys.abnormalRate > 0 ? [ORANGE_R, ORANGE_G, ORANGE_B] : [GREEN_R, GREEN_G, GREEN_B]
      doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 2, 2, 'F')
      y = renderCnText(doc, `${sys.category}（${sys.abnormalCount}/${sys.totalCount}项异常）`, MARGIN + 6, y + 3, 11, BLUE_R, BLUE_G, BLUE_B)
      const rateText = `异常率: ${sys.abnormalRate.toFixed(1)}%`
      const rateW = getCnTextWidth(rateText, 10)
      renderCnText(doc, rateText, MARGIN + CONTENT_WIDTH - rateW - 6, y + 4, 10, rateColor[0], rateColor[1], rateColor[2])
      y += 12

      const sysColWidths = [42, 22, 12, 38, 20, 38]
      const sysColX = [MARGIN + 2]
      for (let i = 1; i < sysColWidths.length; i++) {
        sysColX.push(sysColX[i - 1] + sysColWidths[i - 1])
      }
      const sysHeaders = ['指标名称', '数值', '单位', '正常范围', '状态', '提示']

      doc.setFillColor(235, 245, 255)
      doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
      for (let i = 0; i < sysHeaders.length; i++) {
        renderCnText(doc, sysHeaders[i], sysColX[i], y + 2, 8, 80, 80, 80)
      }
      y += 7

      for (let indIdx = 0; indIdx < sys.indicators.length; indIdx++) {
        const ind = sys.indicators[indIdx]
        y = checkY(doc, y, 8)

        if (indIdx % 2 === 1) {
          doc.setFillColor(250, 252, 255)
          doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
        }

        const vColor = ind.isAbnormal ? [RED_R, RED_G, RED_B] : [0, 0, 0]
        const statusText = ind.isAbnormal ? (ind.direction === 'high' ? '↑偏高' : '↓偏低') : '正常'
        const statusColor = ind.isAbnormal ? [RED_R, RED_G, RED_B] : [GREEN_R, GREEN_G, GREEN_B]

        renderCnText(doc, ind.name, sysColX[0], y + 1.5, 8, 0, 0, 0)
        doc.setTextColor(vColor[0], vColor[1], vColor[2])
        doc.setFontSize(8)
        doc.text(String(ind.value), sysColX[1], y + 5.5)
        doc.setTextColor(0, 0, 0)
        doc.text(ind.unit, sysColX[2], y + 5.5)
        doc.setFontSize(7)
        doc.text(`${ind.normalRange.min}-${ind.normalRange.max}`, sysColX[3], y + 5.5)
        renderCnText(doc, statusText, sysColX[4], y + 1.5, 8, statusColor[0], statusColor[1], statusColor[2])

        if (ind.healthNote) {
          const noteLines = wrapCnText(ind.healthNote, 7, sysColWidths[5] - 2)
          for (let li = 0; li < noteLines.length && li < 2; li++) {
            renderCnText(doc, noteLines[li], sysColX[5], y + 1.5 + li * 3.5, 7, 100, 100, 100)
          }
        }

        y += 7
      }

      doc.setDrawColor(220, 235, 250)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, y - sys.indicators.length * 7 - 7, CONTENT_WIDTH, sys.indicators.length * 7 + 7, 'S')
      y += 6
    }
  }

  if (config.sections.comparison && report.compareChanges.length > 0) {
    doc.addPage()
    y = MARGIN
    y = drawSectionHeader(doc, '五、与上次体检对比', y)

    const changeColWidths = [40, 25, 25, 28, 28, 22]
    const changeColX = [MARGIN]
    for (let i = 1; i < changeColWidths.length; i++) {
      changeColX.push(changeColX[i - 1] + changeColWidths[i - 1])
    }
    const changeHeaders = ['指标名称', '上次', '本次', '变化值', '变化率', '状态变化']

    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
    for (let i = 0; i < changeHeaders.length; i++) {
      renderCnText(doc, changeHeaders[i], changeColX[i] + 2, y + 2, 8, 255, 255, 255)
    }
    y += 7

    const importantChanges = report.compareChanges.filter(c => c.statusChange !== 'both_normal').slice(0, 15)
    const normalChanges = report.compareChanges.filter(c => c.statusChange === 'both_normal').slice(0, 15)
    const showChanges = [...importantChanges, ...normalChanges].slice(0, 25)

    for (let i = 0; i < showChanges.length; i++) {
      const chg = showChanges[i]
      y = checkY(doc, y, 8)

      if (i % 2 === 0) {
        doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
        doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
      }

      let statusChangeText = '-'
      let statusChangeColor: [number, number, number] = [120, 120, 120]
      switch (chg.statusChange) {
        case 'normal_to_abnormal': statusChangeText = '新异常'; statusChangeColor = [RED_R, RED_G, RED_B]; break
        case 'abnormal_to_normal': statusChangeText = '已恢复'; statusChangeColor = [GREEN_R, GREEN_G, GREEN_B]; break
        case 'both_abnormal': statusChangeText = '持续异常'; statusChangeColor = [ORANGE_R, ORANGE_G, ORANGE_B]; break
        case 'both_normal': statusChangeText = '均正常'; break
      }

      const changeSymbol = chg.direction === 'up' ? '+' : chg.direction === 'down' ? '-' : ''
      const changeText = chg.previousValue !== null ? `${changeSymbol}${chg.changeValue.toFixed(1)}` : '-'
      const changePercentText = chg.previousValue !== null ? `${changeSymbol}${chg.changePercent.toFixed(1)}%` : '-'
      const changeColor = chg.direction === 'up' ? [RED_R, RED_G, RED_B] : chg.direction === 'down' ? [GREEN_R, GREEN_G, GREEN_B] : [120, 120, 120]

      renderCnText(doc, chg.indicatorName, changeColX[0] + 2, y + 1.5, 8, 0, 0, 0)
      doc.setFontSize(8)
      doc.setTextColor(chg.isPreviousAbnormal ? RED_R : 0, chg.isPreviousAbnormal ? RED_G : 0, chg.isPreviousAbnormal ? RED_B : 0)
      doc.text(chg.previousValue !== null ? String(chg.previousValue) : '-', changeColX[1] + 2, y + 5.5)
      doc.setTextColor(chg.isCurrentAbnormal ? RED_R : 0, chg.isCurrentAbnormal ? RED_G : 0, chg.isCurrentAbnormal ? RED_B : 0)
      doc.text(String(chg.currentValue), changeColX[2] + 2, y + 5.5)
      doc.setTextColor(changeColor[0], changeColor[1], changeColor[2])
      doc.text(changeText, changeColX[3] + 2, y + 5.5)
      doc.text(changePercentText, changeColX[4] + 2, y + 5.5)
      doc.setTextColor(0, 0, 0)
      renderCnText(doc, statusChangeText, changeColX[5] + 2, y + 1.5, 8, statusChangeColor[0], statusChangeColor[1], statusChangeColor[2])

      y += 7
    }
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN, y - showChanges.length * 7, CONTENT_WIDTH, showChanges.length * 7 + 7, 'S')
    y += 8
  }

  if (config.sections.suggestions) {
    doc.addPage()
    y = MARGIN
    y = drawSectionHeader(doc, '六、健康建议提示', y)

    const categoryIcons: Record<string, string> = {
      lifestyle: '生活方式',
      diet: '饮食建议',
      exercise: '运动建议',
      medical: '就医建议',
      monitoring: '监测建议',
    }
    const priorityColors: Record<string, [number, number, number]> = {
      high: [RED_R, RED_G, RED_B],
      medium: [ORANGE_R, ORANGE_G, ORANGE_B],
      low: [BLUE_R, BLUE_G, BLUE_B],
    }
    const priorityLabels: Record<string, string> = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    }

    for (let si = 0; si < report.suggestions.length; si++) {
      const sug = report.suggestions[si]
      y = checkY(doc, y, 25)

      const [pr, pg, pb] = priorityColors[sug.priority]
      doc.setFillColor(pr, pg, pb)
      doc.rect(MARGIN, y, 3, 18, 'F')

      doc.setFillColor(248, 250, 253)
      doc.rect(MARGIN + 3, y, CONTENT_WIDTH - 3, 18, 'F')

      y = renderCnText(doc, sug.title, MARGIN + 8, y + 2, 10, pr, pg, pb)
      const catText = `【${categoryIcons[sug.category] || '建议'} · ${priorityLabels[sug.priority]}】`
      const catW = getCnTextWidth(catText, 8)
      renderCnText(doc, catText, MARGIN + CONTENT_WIDTH - catW - 6, y + 1, 8, 130, 130, 130)
      y += 3

      const contentLines = wrapCnText(sug.content, 9, CONTENT_WIDTH - 16)
      for (let li = 0; li < contentLines.length && li < 3; li++) {
        y = renderCnText(doc, contentLines[li], MARGIN + 8, y, 9, 70, 70, 70)
      }
      y += 5
    }
  }

  if (config.sections.photos && records.length > 0) {
    const allPhotos = records.flatMap(r => r.photos)
    if (allPhotos.length > 0) {
      doc.addPage()
      y = MARGIN

      y = drawSectionHeader(doc, '七、体检单照片', y)

      const imgW = (CONTENT_WIDTH - 6) / 2
      const imgH = imgW * 0.75
      const gap = 6
      let photoIdx = 0

      for (const record of records) {
        for (const photo of record.photos) {
          if (photoIdx > 0 && photoIdx % 4 === 0) {
            doc.addPage()
            y = MARGIN
            y = drawSectionHeader(doc, '七、体检单照片（续）', y)
          }

          const col = photoIdx % 2
          const row = Math.floor((photoIdx % 4) / 2)
          const imgX = MARGIN + col * (imgW + gap)
          const imgY = y + row * (imgH + gap)

          try {
            doc.addImage(photo.dataUrl, 'JPEG', imgX, imgY, imgW, imgH)
          } catch {
            try {
              doc.addImage(photo.dataUrl, 'PNG', imgX, imgY, imgW, imgH)
            } catch {
            }
          }
          photoIdx++
        }
      }
    }
  }

  return y
}

export async function generatePdfArchive(records: ExamRecord[], indicators: IndicatorItem[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const sorted = [...records].sort((a, b) => {
    const da = formatDate(a.date).sortKey
    const db = formatDate(b.date).sortKey
    return db.localeCompare(da)
  })

  let y = MARGIN + 40

  y = renderCnTextCentered(doc, '家庭体检报告档案', PAGE_WIDTH / 2, y, 24, 0, 0, 0)

  y += 8
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  y = renderCnTextCentered(doc, `生成日期: ${dateStr}`, PAGE_WIDTH / 2, y, FONT_SIZE_BASE, 100, 100, 100)

  y += 6
  doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 30, y, PAGE_WIDTH - MARGIN - 30, y)

  y += 10
  y = renderCnText(doc, `体检记录总数: ${records.length}`, MARGIN, y, FONT_SIZE_BASE, 0, 0, 0)

  if (records.length > 0) {
    const years = records.map(r => r.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    y += 5
    const rangeText = minYear === maxYear ? `记录年份: ${minYear}` : `记录年份范围: ${minYear} - ${maxYear}`
    y = renderCnText(doc, rangeText, MARGIN, y, FONT_SIZE_BASE, 0, 0, 0)
  }

  const colWidths = [40, 25, 20, 40, 45]
  const colX = [MARGIN]
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1])
  }
  const headers = ['指标名称', '数值', '单位', '正常范围', '状态']

  for (const record of sorted) {
    doc.addPage()
    y = MARGIN

    const { display: dateDisplay } = formatDate(record.date)
    y = renderCnText(doc, `体检报告 - ${dateDisplay}`, MARGIN, y, 16, 0, 0, 0)

    y += 2
    doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 8

    if (record.notes) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const scale = 2
      const fs = 10 * scale
      ctx.font = `${fs}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
      const noteText = `备注: ${record.notes}`
      const words = noteText.split('')
      const maxCharsPerLine = Math.floor(CONTENT_WIDTH / (fs * 0.352778 / 1.6))
      const lines: string[] = []
      let cur = ''
      for (const ch of words) {
        if (cur.length >= maxCharsPerLine) {
          lines.push(cur)
          cur = ''
        }
        cur += ch
      }
      if (cur) lines.push(cur)
      for (const ln of lines) {
        y = renderCnText(doc, ln, MARGIN, y, 10, 80, 80, 80)
        y += 1
      }
      y += 3
    }

    const grouped = new Map<string, IndicatorValue[]>()
    for (const iv of record.indicators) {
      const indicator = getIndicatorById(indicators, iv.indicatorId)
      const category = indicator?.category ?? '其他'
      const list = grouped.get(category) ?? []
      list.push(iv)
      grouped.set(category, list)
    }

    for (const [category, values] of grouped) {
      y = checkY(doc, y, 30)
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, 7, 'F')
      y = renderCnText(doc, category, MARGIN + 2, y + 1, 11, 255, 255, 255)
      y += 3

      y = checkY(doc, y, 12)
      doc.setFillColor(230, 230, 230)
      doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
      for (let i = 0; i < headers.length; i++) {
        y = renderCnText(doc, headers[i], colX[i] + 2, y + 2, 9, 50, 50, 50)
      }
      y += 4

      let rowIdx = 0
      for (const iv of values) {
        const indicator = getIndicatorById(indicators, iv.indicatorId)
        if (!indicator) continue

        const rowH = 7
        y = checkY(doc, y, rowH)

        if (rowIdx % 2 === 0) {
          doc.setFillColor(LIGHT_BLUE_R, LIGHT_BLUE_G, LIGHT_BLUE_B)
          doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F')
        }

        y = renderCnText(doc, indicator.name, colX[0] + 2, y + 1.5, 9, 0, 0, 0)

        const valueColorR = iv.isAbnormal ? 200 : 0
        const valueColorG = iv.isAbnormal ? 0 : 0
        const valueColorB = iv.isAbnormal ? 0 : 0
        doc.setTextColor(valueColorR, valueColorG, valueColorB)
        doc.setFontSize(9)
        doc.text(String(iv.value), colX[1] + 2, y + 6)

        doc.setTextColor(0, 0, 0)
        doc.text(indicator.unit, colX[2] + 2, y + 6)

        const rangeStr = `${indicator.normalRange.min} - ${indicator.normalRange.max}`
        doc.text(rangeStr, colX[3] + 2, y + 6)

        if (iv.isAbnormal) {
          const status = iv.value > indicator.normalRange.max ? '↑偏高' : '↓偏低'
          y = renderCnText(doc, status, colX[4] + 2, y + 1.5, 9, 200, 0, 0)
        } else {
          y = renderCnText(doc, '正常', colX[4] + 2, y + 1.5, 9, 0, 0, 0)
        }

        y += rowH - 4
        rowIdx++
      }

      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, y - rowIdx * 7 + 4, CONTENT_WIDTH, rowIdx * 7, 'S')
      y += 6
    }

    const abnormalWithNotes = record.indicators.filter(iv => iv.isAbnormal && iv.healthNote)
    if (abnormalWithNotes.length > 0) {
      y = checkY(doc, y, 15)
      y += 4
      y = renderCnText(doc, '健康备注', MARGIN, y, 12, BLUE_R, BLUE_G, BLUE_B)
      y += 2
      doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
      doc.setLineWidth(0.3)
      doc.line(MARGIN, y, MARGIN + 40, y)
      y += 6

      for (const iv of abnormalWithNotes) {
        const indicator = getIndicatorById(indicators, iv.indicatorId)
        if (!indicator) continue
        y = checkY(doc, y, 12)
        const status = iv.value > indicator.normalRange.max ? '↑偏高' : '↓偏低'
        const headerLine = `${indicator.name} (${iv.value} ${indicator.unit}, ${status})`
        y = renderCnText(doc, headerLine, MARGIN + 2, y, 9, 200, 0, 0)
        y += 4
        const scale = 2
        const fs = 10 * scale
        const maxCharsPerLine = Math.floor((CONTENT_WIDTH - 4) / (fs * 0.352778 / 1.6))
        const words = iv.healthNote.split('')
        const lines: string[] = []
        let cur = ''
        for (const ch of words) {
          if (cur.length >= maxCharsPerLine) {
            lines.push(cur)
            cur = ''
          }
          cur += ch
        }
        if (cur) lines.push(cur)
        for (const ln of lines) {
          y = renderCnText(doc, ln, MARGIN + 4, y, 10, 80, 80, 80)
          y += 1
        }
        y += 3
      }
    }

    if (record.photos.length > 0) {
      doc.addPage()
      y = MARGIN

      y = renderCnText(doc, '体检单照片', MARGIN, y, 14, 0, 0, 0)
      y += 2
      doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
      doc.setLineWidth(0.5)
      doc.line(MARGIN, y, MARGIN + 40, y)
      y += 8

      const imgW = (CONTENT_WIDTH - 6) / 2
      const imgH = imgW * 0.75
      const gap = 6
      let photoIdx = 0

      for (const photo of record.photos) {
        if (photoIdx > 0 && photoIdx % 4 === 0) {
          doc.addPage()
          y = MARGIN
          y = renderCnText(doc, '体检单照片', MARGIN, y, 14, 0, 0, 0)
          y += 10
        }

        const col = photoIdx % 2
        const row = Math.floor((photoIdx % 4) / 2)
        const imgX = MARGIN + col * (imgW + gap)
        const imgY = y + row * (imgH + gap)

        try {
          doc.addImage(photo.dataUrl, 'JPEG', imgX, imgY, imgW, imgH)
        } catch {
          try {
            doc.addImage(photo.dataUrl, 'PNG', imgX, imgY, imgW, imgH)
          } catch {
          }
        }
        photoIdx++
      }
    }
  }

  const filename = `体检档案_${todayStamp()}.pdf`
  doc.save(filename)
}

export async function generateHealthReportPdf(
  report: HealthReport,
  trends: KeyIndicatorTrend[],
  indicators: IndicatorItem[],
  config: PdfExportConfig
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  renderCoverPage(doc, config, report)

  let y = MARGIN
  const records = report.basicInfo.targetRecords

  switch (config.template) {
    case 'simple':
      y = renderSimpleTemplate(doc, report, trends, indicators, config)
      break
    case 'medical':
      y = renderMedicalTemplate(doc, report, trends, indicators, config)
      break
    case 'detailed':
    default:
      y = renderDetailedTemplate(doc, report, trends, indicators, config, records)
      break
  }

  y += 6
  y = drawSectionHeader(doc, '声明', y)
  y = checkY(doc, y, 30)
  doc.setFillColor(250, 250, 250)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 25, 'F')

  const disclaimerLines = [
    '本报告基于您录入的体检数据自动生成，仅供参考，不作为诊断依据。',
    '如有异常指标或身体不适，请及时咨询专业医生并进行进一步检查。',
    `报告生成时间：${report.basicInfo.generateDate}`,
  ]
  for (const line of disclaimerLines) {
    y = renderCnText(doc, line, MARGIN + 6, y + 3, 8, 120, 120, 120)
    y += 1
  }

  applyHeadersFooters(doc, config)

  const templateSuffix = config.template === 'simple' ? '简约版' : config.template === 'medical' ? '就医版' : '详细版'
  const filename = `健康分析报告_${templateSuffix}_${todayStamp()}.pdf`
  doc.save(filename)
}