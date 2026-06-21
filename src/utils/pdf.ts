import jsPDF from 'jspdf'
import type { IndicatorItem, ExamRecord, IndicatorValue } from '@/types'

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

function checkY(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN) {
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
