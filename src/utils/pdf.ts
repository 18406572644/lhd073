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

export async function generatePdfArchive(records: ExamRecord[], indicators: IndicatorItem[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')

  const sorted = [...records].sort((a, b) => {
    const da = formatDate(a.date).sortKey
    const db = formatDate(b.date).sortKey
    return db.localeCompare(da)
  })

  let y = 0

  y = MARGIN + 40
  doc.setFontSize(28)
  doc.setTextColor(0, 0, 0)
  const title = '家庭体检报告档案'
  const titleWidth = doc.getTextWidth(title)
  doc.text(title, (PAGE_WIDTH - titleWidth) / 2, y)

  y += 15
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const subtitle = `生成日期: ${dateStr}`
  const subWidth = doc.getTextWidth(subtitle)
  doc.text(subtitle, (PAGE_WIDTH - subWidth) / 2, y)

  y += 10
  doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 30, y, PAGE_WIDTH - MARGIN - 30, y)

  y += 15
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(`体检记录总数: ${records.length}`, MARGIN, y)

  if (records.length > 0) {
    const years = records.map(r => r.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    y += 8
    const rangeText = minYear === maxYear ? `记录年份: ${minYear}` : `记录年份范围: ${minYear} - ${maxYear}`
    doc.text(rangeText, MARGIN, y)
  }

  for (const record of sorted) {
    doc.addPage()
    y = MARGIN

    const { display: dateDisplay } = formatDate(record.date)
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text(`体检报告 - ${dateDisplay}`, MARGIN, y)

    y += 2
    doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 8

    if (record.notes) {
      doc.setFontSize(10)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(`备注: ${record.notes}`, CONTENT_WIDTH)
      doc.text(lines, MARGIN, y)
      y += lines.length * 5 + 4
    }

    const grouped = new Map<string, IndicatorValue[]>()
    for (const iv of record.indicators) {
      const indicator = getIndicatorById(indicators, iv.indicatorId)
      const category = indicator?.category ?? '其他'
      const list = grouped.get(category) ?? []
      list.push(iv)
      grouped.set(category, list)
    }

    const colWidths = [40, 25, 20, 40, 45]
    const colX = [MARGIN]
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1])
    }
    const headers = ['指标名称', '数值', '单位', '正常范围', '状态']

    for (const [category, values] of grouped) {
      y = checkY(doc, y, 30)
      doc.setFontSize(11)
      doc.setTextColor(BLUE_R, BLUE_G, BLUE_B)
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B)
      doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(category, MARGIN + 2, y)
      y += 6

      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(230, 230, 230)
      doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F')
      doc.setTextColor(50, 50, 50)
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], colX[i] + 2, y + 5)
      }
      y += 7

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

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
        doc.text(indicator.name, colX[0] + 2, y + 5)

        if (iv.isAbnormal) {
          doc.setTextColor(200, 0, 0)
        } else {
          doc.setTextColor(0, 0, 0)
        }
        doc.text(String(iv.value), colX[1] + 2, y + 5)

        doc.setTextColor(0, 0, 0)
        doc.text(indicator.unit, colX[2] + 2, y + 5)

        const rangeStr = `${indicator.normalRange.min} - ${indicator.normalRange.max}`
        doc.text(rangeStr, colX[3] + 2, y + 5)

        if (iv.isAbnormal) {
          doc.setTextColor(200, 0, 0)
          const status = iv.value > indicator.normalRange.max ? '↑偏高' : '↓偏低'
          doc.text(status, colX[4] + 2, y + 5)
        } else {
          doc.setTextColor(0, 0, 0)
          doc.text('正常', colX[4] + 2, y + 5)
        }

        y += rowH
        rowIdx++
      }

      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, y - rowIdx * 7, CONTENT_WIDTH, rowIdx * 7, 'S')
      y += 4
    }

    const abnormalWithNotes = record.indicators.filter(iv => iv.isAbnormal && iv.healthNote)
    if (abnormalWithNotes.length > 0) {
      y = checkY(doc, y, 15)
      y += 4
      doc.setFontSize(12)
      doc.setTextColor(BLUE_R, BLUE_G, BLUE_B)
      doc.text('健康备注', MARGIN, y)
      y += 2
      doc.setDrawColor(BLUE_R, BLUE_G, BLUE_B)
      doc.setLineWidth(0.3)
      doc.line(MARGIN, y, MARGIN + 40, y)
      y += 6

      for (const iv of abnormalWithNotes) {
        const indicator = getIndicatorById(indicators, iv.indicatorId)
        if (!indicator) continue
        y = checkY(doc, y, 12)
        doc.setFontSize(9)
        doc.setTextColor(200, 0, 0)
        const status = iv.value > indicator.normalRange.max ? '↑偏高' : '↓偏低'
        doc.text(`${indicator.name} (${iv.value} ${indicator.unit}, ${status})`, MARGIN + 2, y)
        y += 5
        doc.setTextColor(80, 80, 80)
        const noteLines = doc.splitTextToSize(iv.healthNote, CONTENT_WIDTH - 4)
        doc.text(noteLines, MARGIN + 4, y)
        y += noteLines.length * 4 + 3
      }
    }

    if (record.photos.length > 0) {
      doc.addPage()
      y = MARGIN

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('体检单照片', MARGIN, y)
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
          doc.setFontSize(14)
          doc.setTextColor(0, 0, 0)
          doc.text('体检单照片', MARGIN, y)
          y += 10
        }

        const col = photoIdx % 2
        const row = Math.floor((photoIdx % 4) / 2)
        const imgX = MARGIN + col * (imgW + gap)
        const imgY = y + row * (imgH + gap)

        doc.addImage(photo.dataUrl, 'JPEG', imgX, imgY, imgW, imgH)
        photoIdx++
      }
    }
  }

  const filename = `体检档案_${todayStamp()}.pdf`
  doc.save(filename)
}
