import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IndicatorItem, ExamRecord, PhotoRecord } from '@/types'
import { fetchIndicators, fetchRecords, saveRecords, deleteRecord, isAbnormalValue } from '@/api/mock'
import { hasPassword, setPassword, verifyPassword, cacheIndicators, loadCachedIndicators } from '@/utils/crypto'

export const useHealthStore = defineStore('health', () => {
  const indicators = ref<IndicatorItem[]>([])
  const records = ref<ExamRecord[]>([])
  const isAuthenticated = ref(false)
  const password = ref('')
  const loading = ref(false)

  const yearGroups = computed(() => {
    const map = new Map<number, ExamRecord[]>()
    for (const r of records.value) {
      const list = map.get(r.year) || []
      list.push(r)
      map.set(r.year, list)
    }
    const years = Array.from(map.keys()).sort((a, b) => b - a)
    return years.map(y => ({ year: y, records: map.get(y)! }))
  })

  const recentAbnormals = computed(() => {
    const abnormals: Array<{ record: ExamRecord; indicatorId: string; value: number; direction: string; note: string }> = []
    const sorted = [...records.value].sort((a, b) => b.date.localeCompare(a.date))
    for (const r of sorted) {
      for (const iv of r.indicators) {
        if (iv.isAbnormal) {
          const ind = indicators.value.find(i => i.id === iv.indicatorId)
          if (ind) {
            const dir = iv.value > ind.normalRange.max ? '偏高' : '偏低'
            abnormals.push({ record: r, indicatorId: iv.indicatorId, value: iv.value, direction: dir, note: iv.healthNote })
          }
        }
      }
    }
    return abnormals.slice(0, 10)
  })

  const latestRecord = computed(() => {
    if (records.value.length === 0) return null
    return [...records.value].sort((a, b) => b.date.localeCompare(a.date))[0]
  })

  const totalYears = computed(() => yearGroups.value.length)
  const totalAbnormals = computed(() => recentAbnormals.value.length)

  async function initIndicators() {
    const cached = loadCachedIndicators<IndicatorItem[]>()
    if (cached && cached.length > 0) {
      indicators.value = cached
    }
    const res = await fetchIndicators()
    indicators.value = res.data
    cacheIndicators(res.data)
  }

  async function login(pwd: string): Promise<boolean> {
    if (!hasPassword()) {
      setPassword(pwd)
      password.value = pwd
      isAuthenticated.value = true
      await initIndicators()
      await loadAllRecords(pwd)
      return true
    }
    if (verifyPassword(pwd)) {
      password.value = pwd
      isAuthenticated.value = true
      await initIndicators()
      await loadAllRecords(pwd)
      return true
    }
    return false
  }

  async function loadAllRecords(pwd?: string) {
    loading.value = true
    const p = pwd || password.value
    const res = await fetchRecords(p)
    records.value = res.data
    loading.value = false
  }

  async function addRecord(record: ExamRecord) {
    records.value.push(record)
    await saveRecords(records.value, password.value)
  }

  async function updateRecord(record: ExamRecord) {
    const idx = records.value.findIndex(r => r.id === record.id)
    if (idx >= 0) {
      records.value[idx] = record
    }
    await saveRecords(records.value, password.value)
  }

  async function removeRecord(id: string) {
    await deleteRecord(id, records.value, password.value)
    records.value = records.value.filter(r => r.id !== id)
  }

  async function addPhoto(recordId: string, photo: PhotoRecord) {
    const rec = records.value.find(r => r.id === recordId)
    if (rec) {
      rec.photos.push(photo)
      await saveRecords(records.value, password.value)
    }
  }

  async function removePhoto(recordId: string, photoId: string) {
    const rec = records.value.find(r => r.id === recordId)
    if (rec) {
      rec.photos = rec.photos.filter(p => p.id !== photoId)
      await saveRecords(records.value, password.value)
    }
  }

  function getIndicator(id: string): IndicatorItem | undefined {
    return indicators.value.find(i => i.id === id)
  }

  function getIndicatorValues(indicatorId: string) {
    return records.value
      .filter(r => r.indicators.some(iv => iv.indicatorId === indicatorId))
      .map(r => {
        const iv = r.indicators.find(iv2 => iv2.indicatorId === indicatorId)!
        return { date: r.date, value: iv.value, isAbnormal: iv.isAbnormal, healthNote: iv.healthNote, recordId: r.id }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  function checkAbnormal(indicatorId: string, value: number): boolean {
    const ind = getIndicator(indicatorId)
    if (!ind) return false
    return isAbnormalValue(ind, value)
  }

  function searchIndicators(query: string) {
    const q = query.toLowerCase()
    return indicators.value.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  }

  return {
    indicators,
    records,
    isAuthenticated,
    password,
    loading,
    yearGroups,
    recentAbnormals,
    latestRecord,
    totalYears,
    totalAbnormals,
    login,
    loadAllRecords,
    addRecord,
    updateRecord,
    removeRecord,
    addPhoto,
    removePhoto,
    getIndicator,
    getIndicatorValues,
    checkAbnormal,
    searchIndicators,
    initIndicators,
  }
})
