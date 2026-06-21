import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FamilyMember, FamilyHealthPortrait, GeneticRiskItem, DiseaseType, FamilyDiseaseRecord, FamilyRelation } from '@/types'
import { DISEASE_LABELS } from '@/types'
import { encryptData, decryptData } from '@/utils/crypto'
import { analyzeGeneticRisks, computeFamilyHealthPortrait } from '@/utils/geneticAnalysis'

const STORAGE_KEY_FAMILY = 'health_family_encrypted'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export const useFamilyStore = defineStore('family', () => {
  const members = ref<FamilyMember[]>([])
  const portrait = ref<FamilyHealthPortrait | null>(null)
  const geneticRisks = ref<GeneticRiskItem[]>([])
  const hasAnalyzed = ref(false)

  const loadFromStorage = (password: string) => {
    const encrypted = localStorage.getItem(STORAGE_KEY_FAMILY)
    if (!encrypted) return
    const decrypted = decryptData(encrypted, password)
    if (!decrypted) return
    try {
      const data = JSON.parse(decrypted) as FamilyMember[]
      members.value = data
    } catch {
      members.value = []
    }
  }

  const saveToStorage = (password: string) => {
    const json = JSON.stringify(members.value)
    const encrypted = encryptData(json, password)
    localStorage.setItem(STORAGE_KEY_FAMILY, encrypted)
  }

  const addMember = (member: Omit<FamilyMember, 'id'>, password: string) => {
    const newMember: FamilyMember = { ...member, id: generateId() }
    members.value.push(newMember)
    saveToStorage(password)
    hasAnalyzed.value = false
  }

  const updateMember = (id: string, updates: Partial<FamilyMember>, password: string) => {
    const idx = members.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      members.value[idx] = { ...members.value[idx], ...updates }
      saveToStorage(password)
      hasAnalyzed.value = false
    }
  }

  const removeMember = (id: string, password: string) => {
    members.value = members.value.filter(m => m.id !== id)
    saveToStorage(password)
    hasAnalyzed.value = false
  }

  const addDiseaseToMember = (memberId: string, disease: FamilyDiseaseRecord, password: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      member.diseases.push(disease)
      saveToStorage(password)
      hasAnalyzed.value = false
    }
  }

  const removeDiseaseFromMember = (memberId: string, diseaseType: DiseaseType, password: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      member.diseases = member.diseases.filter(d => d.diseaseType !== diseaseType)
      saveToStorage(password)
      hasAnalyzed.value = false
    }
  }

  const runAnalysis = () => {
    geneticRisks.value = analyzeGeneticRisks(members.value)
    portrait.value = computeFamilyHealthPortrait(members.value, geneticRisks.value)
    hasAnalyzed.value = true
  }

  const getMemberByRelation = (relation: FamilyRelation): FamilyMember | undefined => {
    return members.value.find(m => m.relation === relation)
  }

  const selfMember = computed(() => members.value.find(m => m.relation === 'self'))

  const diseaseDistribution = computed(() => {
    const dist: Record<DiseaseType, number> = {
      hypertension: 0, diabetes: 0, cardiovascular: 0, hyperlipidemia: 0,
      fatty_liver: 0, cancer: 0, stroke: 0, gout: 0,
      kidney_disease: 0, thyroid_disease: 0,
    }
    for (const member of members.value) {
      const seen = new Set<DiseaseType>()
      for (const d of member.diseases) {
        if (!seen.has(d.diseaseType)) {
          dist[d.diseaseType]++
          seen.add(d.diseaseType)
        }
      }
    }
    return dist
  })

  const diseaseNameList = computed(() => {
    return (Object.entries(diseaseDistribution.value) as [DiseaseType, number][])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, name: DISEASE_LABELS[type], count }))
  })

  const highRiskDiseases = computed(() => {
    return geneticRisks.value.filter(r => r.riskLevel === 'high')
  })

  const mediumRiskDiseases = computed(() => {
    return geneticRisks.value.filter(r => r.riskLevel === 'medium')
  })

  return {
    members,
    portrait,
    geneticRisks,
    hasAnalyzed,
    loadFromStorage,
    saveToStorage,
    addMember,
    updateMember,
    removeMember,
    addDiseaseToMember,
    removeDiseaseFromMember,
    runAnalysis,
    getMemberByRelation,
    selfMember,
    diseaseDistribution,
    diseaseNameList,
    highRiskDiseases,
    mediumRiskDiseases,
  }
})
