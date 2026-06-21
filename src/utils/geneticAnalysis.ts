import type { FamilyMember, GeneticRiskItem, FamilyHealthPortrait, DiseaseType, RiskLevel, FamilyRelation } from '@/types'
import { DISEASE_LABELS, RELATION_LABELS } from '@/types'

interface InheritanceWeight {
  relation: FamilyRelation
  weight: number
}

const INHERITANCE_WEIGHTS: InheritanceWeight[] = [
  { relation: 'self', weight: 0 },
  { relation: 'father', weight: 0.35 },
  { relation: 'mother', weight: 0.35 },
  { relation: 'paternal_grandfather', weight: 0.12 },
  { relation: 'paternal_grandmother', weight: 0.12 },
  { relation: 'maternal_grandfather', weight: 0.12 },
  { relation: 'maternal_grandmother', weight: 0.12 },
  { relation: 'sibling', weight: 0.25 },
  { relation: 'child', weight: 0.1 },
  { relation: 'spouse', weight: 0.05 },
]

const SEVERITY_MULTIPLIER: Record<string, number> = {
  mild: 0.6,
  moderate: 1.0,
  severe: 1.5,
}

const DISEASE_INFO: Record<DiseaseType, { inheritance: string; description: string; suggestions: string[] }> = {
  hypertension: {
    inheritance: '多基因遗传',
    description: '高血压具有明显的家族聚集性，父母一方患病子女风险增加25%-30%，双方患病风险增加45%-50%',
    suggestions: ['定期监测血压，建议每日测量', '减少钠盐摄入，每日不超过6g', '坚持有氧运动，每周至少150分钟', '保持健康体重，BMI控制在24以下', '限制酒精摄入'],
  },
  diabetes: {
    inheritance: '多基因遗传',
    description: '2型糖尿病遗传度约30%-70%，父母一方患病子女风险约40%，双方患病风险可达60%-70%',
    suggestions: ['定期检测空腹血糖和糖化血红蛋白', '控制碳水化合物摄入，选择低GI食物', '保持规律运动，改善胰岛素敏感性', '维持健康体重，避免腹型肥胖', '注意多饮多尿等早期症状'],
  },
  cardiovascular: {
    inheritance: '多基因遗传',
    description: '冠心病等心血管疾病遗传度约40%-60%，家族早发心血管病史显著增加后代风险',
    suggestions: ['定期检查血脂、心电图', '控制血压和血糖在正常范围', '戒烟限酒，避免二手烟', '增加膳食纤维摄入', '学会缓解压力，保持心理健康'],
  },
  hyperlipidemia: {
    inheritance: '多基因/常染色体显性',
    description: '家族性高胆固醇血症为常染色体显性遗传，杂合子发病率约1/500，纯合子更严重',
    suggestions: ['定期检查血脂四项', '限制饱和脂肪酸和反式脂肪摄入', '增加可溶性膳食纤维', '保持规律有氧运动', '必要时遵医嘱服用降脂药物'],
  },
  fatty_liver: {
    inheritance: '多基因遗传',
    description: '非酒精性脂肪肝遗传度约30%-50%，与代谢综合征密切相关',
    suggestions: ['控制体重，减少内脏脂肪', '限制果糖和精制碳水摄入', '增加有氧运动和力量训练', '避免过量饮酒', '定期复查肝功能和肝脏超声'],
  },
  cancer: {
    inheritance: '部分类型单基因/多基因遗传',
    description: '约5%-10%的癌症与遗传性基因突变直接相关，如BRCA1/2与乳腺癌',
    suggestions: ['根据家族癌症类型进行针对性筛查', '保持健康生活方式', '避免已知致癌因素', '关注异常体征和症状', '考虑遗传咨询和基因检测'],
  },
  stroke: {
    inheritance: '多基因遗传',
    description: '脑卒中与高血压、糖尿病等遗传风险因素密切相关，家族史使风险增加30%-75%',
    suggestions: ['严格控制血压和血糖', '治疗房颤等心脏病', '健康饮食，减少钠盐摄入', '戒烟限酒', '定期检查颈动脉超声'],
  },
  gout: {
    inheritance: '多基因遗传',
    description: '痛风遗传度约30%，与尿酸代谢基因变异有关，家族聚集性明显',
    suggestions: ['限制高嘌呤食物摄入', '多饮水促进尿酸排泄', '限制酒精特别是啤酒', '控制体重，避免快速减重', '定期检测血尿酸水平'],
  },
  kidney_disease: {
    inheritance: '多基因/部分单基因遗传',
    description: '部分肾病如多囊肾为常染色体显性遗传，糖尿病肾病有家族聚集性',
    suggestions: ['定期检查肾功能和尿常规', '控制血压和血糖', '避免肾毒性药物', '适量饮水，不过量摄入蛋白质', '注意浮肿和尿量变化'],
  },
  thyroid_disease: {
    inheritance: '多基因遗传',
    description: '自身免疫性甲状腺疾病有较强遗传倾向，家族风险增加10-20倍',
    suggestions: ['定期检查甲状腺功能', '注意甲状腺结节变化', '保持适当碘摄入', '关注代谢和体重变化', '出现颈部肿大或不适及时就诊'],
  },
}

function getWeight(relation: FamilyRelation): number {
  return INHERITANCE_WEIGHTS.find(w => w.relation === relation)?.weight ?? 0.1
}

function computeDiseaseRisk(members: FamilyMember[], diseaseType: DiseaseType): GeneticRiskItem {
  const affectedMembers: string[] = []
  let totalWeight = 0

  for (const member of members) {
    const hasDisease = member.diseases.some(d => d.diseaseType === diseaseType)
    if (hasDisease) {
      const relationWeight = getWeight(member.relation)
      const disease = member.diseases.find(d => d.diseaseType === diseaseType)!
      const severityMult = SEVERITY_MULTIPLIER[disease.severity] ?? 1.0
      const earlyOnsetBonus = disease.diagnosedAge && disease.diagnosedAge < 50 ? 1.3 : 1.0
      totalWeight += relationWeight * severityMult * earlyOnsetBonus
      affectedMembers.push(`${member.name}（${RELATION_LABELS[member.relation]}）`)
    }
  }

  const baseRisk = 5
  const riskScore = Math.min(Math.round(baseRisk + totalWeight * 100), 95)
  const info = DISEASE_INFO[diseaseType]

  let riskLevel: RiskLevel = 'low'
  if (riskScore >= 50) riskLevel = 'high'
  else if (riskScore >= 25) riskLevel = 'medium'

  return {
    diseaseType,
    diseaseName: DISEASE_LABELS[diseaseType],
    riskLevel,
    riskScore,
    affectedMembers,
    inheritancePattern: info.inheritance,
    description: info.description,
    suggestions: info.suggestions,
  }
}

export function analyzeGeneticRisks(members: FamilyMember[]): GeneticRiskItem[] {
  const diseaseTypes: DiseaseType[] = [
    'hypertension', 'diabetes', 'cardiovascular', 'hyperlipidemia',
    'fatty_liver', 'cancer', 'stroke', 'gout', 'kidney_disease', 'thyroid_disease',
  ]

  const results: GeneticRiskItem[] = []
  const diseasesInFamily = new Set<DiseaseType>()

  for (const member of members) {
    for (const d of member.diseases) {
      diseasesInFamily.add(d.diseaseType)
    }
  }

  for (const dt of diseaseTypes) {
    if (diseasesInFamily.has(dt)) {
      results.push(computeDiseaseRisk(members, dt))
    }
  }

  return results.sort((a, b) => b.riskScore - a.riskScore)
}

export function computeFamilyHealthPortrait(members: FamilyMember[], risks: GeneticRiskItem[]): FamilyHealthPortrait {
  const totalMembers = members.length

  const diseaseDistribution: Record<DiseaseType, number> = {
    hypertension: 0, diabetes: 0, cardiovascular: 0, hyperlipidemia: 0,
    fatty_liver: 0, cancer: 0, stroke: 0, gout: 0,
    kidney_disease: 0, thyroid_disease: 0,
  }

  for (const member of members) {
    const seen = new Set<DiseaseType>()
    for (const d of member.diseases) {
      if (!seen.has(d.diseaseType)) {
        diseaseDistribution[d.diseaseType]++
        seen.add(d.diseaseType)
      }
    }
  }

  const topRisks = risks.slice(0, 5)

  let healthScore = 100
  for (const risk of risks) {
    if (risk.riskLevel === 'high') healthScore -= risk.riskScore * 0.3
    else if (risk.riskLevel === 'medium') healthScore -= risk.riskScore * 0.15
    else healthScore -= risk.riskScore * 0.05
  }
  healthScore = Math.max(Math.round(healthScore), 5)

  let overallLevel: RiskLevel = 'low'
  if (healthScore <= 40) overallLevel = 'high'
  else if (healthScore <= 70) overallLevel = 'medium'

  return {
    totalMembers,
    diseaseDistribution,
    topRisks,
    healthScore,
    overallLevel,
  }
}
