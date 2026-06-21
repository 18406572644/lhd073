import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  LifestyleRecords,
  ExerciseRecord,
  DietRecord,
  SleepRecord,
  VitalSignRecord,
  VitalSignType,
} from '@/types'
import {
  fetchLifestyleRecords,
  addExerciseRecord,
  updateExerciseRecord,
  deleteExerciseRecord,
  addDietRecord,
  updateDietRecord,
  deleteDietRecord,
  addSleepRecord,
  updateSleepRecord,
  deleteSleepRecord,
  addVitalSignRecord,
  updateVitalSignRecord,
  deleteVitalSignRecord,
} from '@/api/mock'

export const useLifestyleStore = defineStore('lifestyle', () => {
  const records = ref<LifestyleRecords>({
    exercises: [],
    diets: [],
    sleeps: [],
    vitalSigns: [],
  })
  const password = ref('')
  const loading = ref(false)

  const sortedExercises = computed(() =>
    [...records.value.exercises].sort((a, b) => b.date.localeCompare(a.date))
  )

  const sortedDiets = computed(() =>
    [...records.value.diets].sort((a, b) => b.date.localeCompare(a.date))
  )

  const sortedSleeps = computed(() =>
    [...records.value.sleeps].sort((a, b) => b.date.localeCompare(a.date))
  )

  const sortedVitalSigns = computed(() =>
    [...records.value.vitalSigns].sort((a, b) => b.date.localeCompare(a.date))
  )

  function getVitalSignsByType(type: VitalSignType) {
    return records.value.vitalSigns
      .filter(v => v.type === type)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  function getExerciseByDateRange(startDate: string, endDate: string) {
    return records.value.exercises.filter(
      e => e.date >= startDate && e.date <= endDate
    )
  }

  function getTotalExerciseMinutesByDate(date: string): number {
    return records.value.exercises
      .filter(e => e.date === date)
      .reduce((sum, e) => sum + e.duration, 0)
  }

  function getTotalCaloriesByDate(date: string): number {
    return records.value.exercises
      .filter(e => e.date === date)
      .reduce((sum, e) => sum + e.calories, 0)
  }

  function getSleepByDate(date: string): SleepRecord | undefined {
    return records.value.sleeps.find(s => s.date === date)
  }

  function getVitalSignLatest(type: VitalSignType): VitalSignRecord | undefined {
    const filtered = records.value.vitalSigns.filter(v => v.type === type)
    if (filtered.length === 0) return undefined
    return filtered.sort((a, b) => b.date.localeCompare(a.date))[0]
  }

  async function loadRecords(pwd: string) {
    loading.value = true
    password.value = pwd
    const res = await fetchLifestyleRecords(pwd)
    records.value = res.data
    loading.value = false
  }

  async function addExercise(record: ExerciseRecord) {
    const res = await addExerciseRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function updateExercise(record: ExerciseRecord) {
    const res = await updateExerciseRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function removeExercise(id: string) {
    const res = await deleteExerciseRecord(id, records.value, password.value)
    records.value = res.data
  }

  async function addDiet(record: DietRecord) {
    const res = await addDietRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function updateDiet(record: DietRecord) {
    const res = await updateDietRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function removeDiet(id: string) {
    const res = await deleteDietRecord(id, records.value, password.value)
    records.value = res.data
  }

  async function addSleep(record: SleepRecord) {
    const res = await addSleepRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function updateSleep(record: SleepRecord) {
    const res = await updateSleepRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function removeSleep(id: string) {
    const res = await deleteSleepRecord(id, records.value, password.value)
    records.value = res.data
  }

  async function addVitalSign(record: VitalSignRecord) {
    const res = await addVitalSignRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function updateVitalSign(record: VitalSignRecord) {
    const res = await updateVitalSignRecord(record, records.value, password.value)
    records.value = res.data
  }

  async function removeVitalSign(id: string) {
    const res = await deleteVitalSignRecord(id, records.value, password.value)
    records.value = res.data
  }

  return {
    records,
    loading,
    sortedExercises,
    sortedDiets,
    sortedSleeps,
    sortedVitalSigns,
    getVitalSignsByType,
    getExerciseByDateRange,
    getTotalExerciseMinutesByDate,
    getTotalCaloriesByDate,
    getSleepByDate,
    getVitalSignLatest,
    loadRecords,
    addExercise,
    updateExercise,
    removeExercise,
    addDiet,
    updateDiet,
    removeDiet,
    addSleep,
    updateSleep,
    removeSleep,
    addVitalSign,
    updateVitalSign,
    removeVitalSign,
  }
})
