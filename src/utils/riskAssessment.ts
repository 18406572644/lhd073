import type { RiskAssessment, RiskLevel, RiskFactor, LifestyleData } from '@/types'

function getRiskLevel(score: number, thresholds: { low: number; medium: number }): RiskLevel {
  if (score <= thresholds.low) return 'low'
  if (score <= thresholds.medium) return 'medium'
  return 'high'
}

function clampProbability(p: number): number {
  return Math.max(0.5, Math.min(95, p))
}

function getIndicator(indicators: Map<string, number>, key: string): number | undefined {
  return indicators.get(key)
}

function assessCardiovascular(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const age = lifestyle.age
  if (age >= 65) {
    score += 30
    factors.push({ name: '年龄', value: `${age}岁`, weight: 30, description: '65岁以上心血管风险显著增加' })
  } else if (age >= 55) {
    score += 20
    factors.push({ name: '年龄', value: `${age}岁`, weight: 20, description: '55-64岁心血管风险增加' })
  } else if (age >= 45) {
    score += 10
    factors.push({ name: '年龄', value: `${age}岁`, weight: 10, description: '45岁以上应关注心血管健康' })
  }

  if (lifestyle.gender === 'male') {
    score += 8
    factors.push({ name: '性别', value: '男性', weight: 8, description: '男性心血管风险普遍高于女性' })
  }

  if (lifestyle.smoking) {
    const smokingScore = Math.min(25, 10 + (lifestyle.smokingYears || 0) * 0.5 + (lifestyle.cigarettesPerDay || 0) * 0.3)
    score += smokingScore
    factors.push({ name: '吸烟', value: '是', weight: smokingScore, description: '吸烟是心血管疾病的主要危险因素' })
  }

  const sbp = getIndicator(indicators, 'sbp')
  if (sbp !== undefined) {
    if (sbp >= 160) {
      score += 25
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 25, description: '重度高血压' })
    } else if (sbp >= 140) {
      score += 15
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 15, description: '轻度高血压' })
    } else if (sbp >= 130) {
      score += 8
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 8, description: '血压正常偏高' })
    }
  }

  const tchol = getIndicator(indicators, 'tc')
  if (tchol !== undefined) {
    if (tchol >= 6.2) {
      score += 20
      factors.push({ name: '总胆固醇', value: `${tchol} mmol/L`, weight: 20, description: '胆固醇过高' })
    } else if (tchol >= 5.2) {
      score += 12
      factors.push({ name: '总胆固醇', value: `${tchol} mmol/L`, weight: 12, description: '胆固醇边缘升高' })
    }
  }

  const hdl = getIndicator(indicators, 'hdl')
  if (hdl !== undefined && hdl < 1.04) {
    score += 15
    factors.push({ name: '高密度脂蛋白', value: `${hdl} mmol/L`, weight: 15, description: '好胆固醇偏低' })
  }

  const ldl = getIndicator(indicators, 'ldl')
  if (ldl !== undefined) {
    if (ldl >= 4.14) {
      score += 20
      factors.push({ name: '低密度脂蛋白', value: `${ldl} mmol/L`, weight: 20, description: '坏胆固醇过高' })
    } else if (ldl >= 3.37) {
      score += 10
      factors.push({ name: '低密度脂蛋白', value: `${ldl} mmol/L`, weight: 10, description: '坏胆固醇边缘升高' })
    }
  }

  const glu = getIndicator(indicators, 'glu')
  if (glu !== undefined && glu >= 7.0) {
    score += 18
    factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 18, description: '糖尿病会显著增加心血管风险' })
  } else if (glu !== undefined && glu >= 6.1) {
    score += 10
    factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 10, description: '空腹血糖受损' })
  }

  const bmi = getIndicator(indicators, 'bmi')
  if (bmi !== undefined) {
    if (bmi >= 30) {
      score += 15
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 15, description: '肥胖' })
    } else if (bmi >= 25) {
      score += 8
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 8, description: '超重' })
    }
  }

  if (lifestyle.exercise === 'none') {
    score += 10
    factors.push({ name: '运动', value: '缺乏运动', weight: 10, description: '缺乏运动增加心血管风险' })
  } else if (lifestyle.exercise === 'rare') {
    score += 5
    factors.push({ name: '运动', value: '偶尔运动', weight: 5, description: '运动量不足' })
  }

  if (lifestyle.familyHistory.cardiovascular) {
    score += 12
    factors.push({ name: '家族史', value: '有', weight: 12, description: '直系亲属有心血管疾病史' })
  }

  if (lifestyle.alcohol === 'heavy') {
    score += 10
    factors.push({ name: '饮酒', value: '大量饮酒', weight: 10, description: '大量饮酒损害心血管' })
  } else if (lifestyle.alcohol === 'moderate') {
    score += 4
    factors.push({ name: '饮酒', value: '适量饮酒', weight: 4, description: '适量饮酒需注意' })
  }

  const level = getRiskLevel(score, { low: 20, medium: 50 })
  const baseProbability = level === 'low' ? 5 : level === 'medium' ? 20 : 45
  const probability = clampProbability(baseProbability + (score - (level === 'low' ? 10 : level === 'medium' ? 35 : 60)) * 0.5)

  const suggestions: string[] = []
  if (lifestyle.smoking) suggestions.push('立即戒烟，戒烟后1年心血管风险可降低50%')
  if (sbp !== undefined && sbp >= 140) suggestions.push('定期监测血压，遵医嘱服用降压药物')
  if (tchol !== undefined && tchol >= 5.2 || ldl !== undefined && ldl >= 3.37) suggestions.push('控制饮食中胆固醇摄入，必要时考虑降脂治疗')
  if (bmi !== undefined && bmi >= 25) suggestions.push('通过饮食控制和运动减轻体重，目标BMI控制在24以下')
  if (lifestyle.exercise === 'none' || lifestyle.exercise === 'rare') suggestions.push('每周至少进行150分钟中等强度有氧运动，如快走、游泳、骑行')
  suggestions.push('限制饱和脂肪和反式脂肪摄入，增加蔬果和全谷物比例')
  suggestions.push('保持健康心态，避免长期精神紧张和过度压力')
  suggestions.push('每年进行一次心血管相关体检，包括血脂、血压、心电图检查')

  return {
    id: 'cardiovascular',
    name: '心血管疾病',
    description: '基于Framingham风险评分模型评估冠心病、心肌梗死等心血管事件风险',
    icon: 'Heart',
    level,
    score,
    probability,
    factors,
    suggestions,
    model: 'Framingham Risk Score (改良版)',
  }
}

function assessDiabetes(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const age = lifestyle.age
  if (age >= 65) {
    score += 25
    factors.push({ name: '年龄', value: `${age}岁`, weight: 25, description: '65岁以上糖尿病风险显著增加' })
  } else if (age >= 45) {
    score += 15
    factors.push({ name: '年龄', value: `${age}岁`, weight: 15, description: '45岁以上糖尿病风险增加' })
  }

  const bmi = getIndicator(indicators, 'bmi')
  if (bmi !== undefined) {
    if (bmi >= 30) {
      score += 25
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 25, description: '肥胖是2型糖尿病的主要危险因素' })
    } else if (bmi >= 25) {
      score += 15
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 15, description: '超重增加糖尿病风险' })
    } else if (bmi >= 23) {
      score += 8
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 8, description: '体重正常偏高' })
    }
  }

  const glu = getIndicator(indicators, 'glu')
  if (glu !== undefined) {
    if (glu >= 7.0) {
      score += 40
      factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 40, description: '已达糖尿病诊断标准' })
    } else if (glu >= 6.1) {
      score += 25
      factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 25, description: '空腹血糖受损（糖尿病前期）' })
    } else if (glu >= 5.6) {
      score += 12
      factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 12, description: '血糖处于正常偏高范围' })
    }
  }

  const hba1c = getIndicator(indicators, 'hba1c')
  if (hba1c !== undefined) {
    if (hba1c >= 6.5) {
      score += 40
      factors.push({ name: '糖化血红蛋白', value: `${hba1c}%`, weight: 40, description: '已达糖尿病诊断标准' })
    } else if (hba1c >= 5.7) {
      score += 25
      factors.push({ name: '糖化血红蛋白', value: `${hba1c}%`, weight: 25, description: '糖尿病前期' })
    }
  }

  const tg = getIndicator(indicators, 'tg')
  if (tg !== undefined && tg >= 1.7) {
    score += 12
    factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 12, description: '高甘油三酯与胰岛素抵抗相关' })
  }

  const hdl = getIndicator(indicators, 'hdl')
  if (hdl !== undefined) {
    if (lifestyle.gender === 'male' && hdl < 1.04) {
      score += 10
      factors.push({ name: '高密度脂蛋白', value: `${hdl} mmol/L`, weight: 10, description: 'HDL-C偏低，与胰岛素抵抗相关' })
    } else if (lifestyle.gender === 'female' && hdl < 1.3) {
      score += 10
      factors.push({ name: '高密度脂蛋白', value: `${hdl} mmol/L`, weight: 10, description: 'HDL-C偏低，与胰岛素抵抗相关' })
    }
  }

  const sbp = getIndicator(indicators, 'sbp')
  if (sbp !== undefined && sbp >= 140) {
    score += 10
    factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 10, description: '高血压常与糖尿病共存' })
  }

  if (lifestyle.familyHistory.diabetes) {
    score += 15
    factors.push({ name: '家族史', value: '有', weight: 15, description: '直系亲属有糖尿病史' })
  }

  if (lifestyle.exercise === 'none') {
    score += 12
    factors.push({ name: '运动', value: '缺乏运动', weight: 12, description: '久坐生活方式增加糖尿病风险' })
  } else if (lifestyle.exercise === 'rare') {
    score += 6
    factors.push({ name: '运动', value: '偶尔运动', weight: 6, description: '运动量不足' })
  }

  if (lifestyle.diet === 'unhealthy') {
    score += 12
    factors.push({ name: '饮食习惯', value: '不健康', weight: 12, description: '高糖高脂饮食增加糖尿病风险' })
  } else if (lifestyle.diet === 'moderate') {
    score += 5
    factors.push({ name: '饮食习惯', value: '一般', weight: 5, description: '饮食习惯需改善' })
  }

  if (lifestyle.sleepHours < 6) {
    score += 8
    factors.push({ name: '睡眠', value: `${lifestyle.sleepHours}小时/天`, weight: 8, description: '睡眠不足影响糖代谢' })
  }

  const level = getRiskLevel(score, { low: 20, medium: 45 })
  const baseProbability = level === 'low' ? 3 : level === 'medium' ? 18 : 40
  const probability = clampProbability(baseProbability + (score - (level === 'low' ? 10 : level === 'medium' ? 32 : 58)) * 0.4)

  const suggestions: string[] = []
  if (bmi !== undefined && bmi >= 25) suggestions.push('减重5-10%可显著降低糖尿病风险，建议通过均衡饮食和规律运动实现')
  if (glu !== undefined && glu >= 6.1 || hba1c !== undefined && hba1c >= 5.7) suggestions.push('每3-6个月检测一次血糖和糖化血红蛋白')
  if (lifestyle.exercise === 'none' || lifestyle.exercise === 'rare') suggestions.push('每周至少150分钟中等强度有氧运动，配合每周2-3次力量训练')
  if (lifestyle.diet === 'unhealthy' || lifestyle.diet === 'moderate') suggestions.push('减少精制糖和精制碳水摄入，增加膳食纤维摄入（每日25-30g）')
  suggestions.push('选择低升糖指数（GI）食物，避免含糖饮料')
  suggestions.push('保持充足睡眠，每晚7-8小时')
  if (lifestyle.familyHistory.diabetes) suggestions.push('有家族史者建议更早开始定期筛查血糖')
  suggestions.push('控制血压和血脂，减少代谢综合征风险')

  return {
    id: 'diabetes',
    name: '2型糖尿病',
    description: '基于ADA糖尿病风险评分和FINDRISC模型评估2型糖尿病发病风险',
    icon: 'Droplets',
    level,
    score,
    probability,
    factors,
    suggestions,
    model: 'FINDRISC + ADA Risk Score (改良版)',
  }
}

function assessHyperlipidemia(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const age = lifestyle.age
  if (age >= 60) {
    score += 15
    factors.push({ name: '年龄', value: `${age}岁`, weight: 15, description: '60岁以上血脂代谢能力下降' })
  } else if (age >= 45) {
    score += 10
    factors.push({ name: '年龄', value: `${age}岁`, weight: 10, description: '45岁以上应关注血脂健康' })
  }

  const tc = getIndicator(indicators, 'tc')
  if (tc !== undefined) {
    if (tc >= 6.22) {
      score += 35
      factors.push({ name: '总胆固醇', value: `${tc} mmol/L`, weight: 35, description: '重度高胆固醇血症' })
    } else if (tc >= 5.72) {
      score += 25
      factors.push({ name: '总胆固醇', value: `${tc} mmol/L`, weight: 25, description: '中度高胆固醇血症' })
    } else if (tc >= 5.18) {
      score += 15
      factors.push({ name: '总胆固醇', value: `${tc} mmol/L`, weight: 15, description: '边缘升高' })
    }
  }

  const tg = getIndicator(indicators, 'tg')
  if (tg !== undefined) {
    if (tg >= 5.64) {
      score += 35
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 35, description: '重度高甘油三酯血症' })
    } else if (tg >= 2.26) {
      score += 25
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 25, description: '中度高甘油三酯血症' })
    } else if (tg >= 1.7) {
      score += 15
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 15, description: '边缘升高' })
    }
  }

  const ldl = getIndicator(indicators, 'ldl')
  if (ldl !== undefined) {
    if (ldl >= 4.92) {
      score += 35
      factors.push({ name: '低密度脂蛋白', value: `${ldl} mmol/L`, weight: 35, description: '重度高LDL-C血症' })
    } else if (ldl >= 4.14) {
      score += 25
      factors.push({ name: '低密度脂蛋白', value: `${ldl} mmol/L`, weight: 25, description: '中度高LDL-C血症' })
    } else if (ldl >= 3.37) {
      score += 15
      factors.push({ name: '低密度脂蛋白', value: `${ldl} mmol/L`, weight: 15, description: '边缘升高' })
    }
  }

  const hdl = getIndicator(indicators, 'hdl')
  if (hdl !== undefined && hdl < 1.04) {
    score += 20
    factors.push({ name: '高密度脂蛋白', value: `${hdl} mmol/L`, weight: 20, description: 'HDL-C降低，好胆固醇不足' })
  }

  const bmi = getIndicator(indicators, 'bmi')
  if (bmi !== undefined) {
    if (bmi >= 28) {
      score += 18
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 18, description: '肥胖与血脂异常密切相关' })
    } else if (bmi >= 24) {
      score += 10
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 10, description: '超重可能影响血脂代谢' })
    }
  }

  if (lifestyle.smoking) {
    score += 12
    factors.push({ name: '吸烟', value: '是', weight: 12, description: '吸烟降低HDL-C水平，损伤血管内皮' })
  }

  if (lifestyle.alcohol === 'heavy') {
    score += 15
    factors.push({ name: '饮酒', value: '大量饮酒', weight: 15, description: '大量饮酒显著升高甘油三酯' })
  } else if (lifestyle.alcohol === 'moderate') {
    score += 6
    factors.push({ name: '饮酒', value: '适量饮酒', weight: 6, description: '过量酒精影响血脂代谢' })
  }

  if (lifestyle.diet === 'unhealthy') {
    score += 15
    factors.push({ name: '饮食习惯', value: '不健康', weight: 15, description: '高脂高糖饮食是血脂异常的重要诱因' })
  } else if (lifestyle.diet === 'moderate') {
    score += 7
    factors.push({ name: '饮食习惯', value: '一般', weight: 7, description: '饮食结构需优化' })
  }

  if (lifestyle.exercise === 'none') {
    score += 10
    factors.push({ name: '运动', value: '缺乏运动', weight: 10, description: '缺乏运动不利于血脂调节' })
  } else if (lifestyle.exercise === 'rare') {
    score += 5
    factors.push({ name: '运动', value: '偶尔运动', weight: 5, description: '运动量不足' })
  }

  if (lifestyle.familyHistory.hyperlipidemia) {
    score += 15
    factors.push({ name: '家族史', value: '有', weight: 15, description: '家族性高脂血症史' })
  }

  if (lifestyle.familyHistory.diabetes) {
    score += 8
    factors.push({ name: '糖尿病家族史', value: '有', weight: 8, description: '糖尿病常伴发血脂异常' })
  }

  const level = getRiskLevel(score, { low: 20, medium: 45 })
  const baseProbability = level === 'low' ? 5 : level === 'medium' ? 25 : 50
  const probability = clampProbability(baseProbability + (score - (level === 'low' ? 10 : level === 'medium' ? 32 : 58)) * 0.5)

  const suggestions: string[] = []
  if (tc !== undefined && tc >= 5.18 || ldl !== undefined && ldl >= 3.37) suggestions.push('限制饱和脂肪摄入（<总热量7%），减少动物内脏、蛋黄、肥肉摄入')
  if (tg !== undefined && tg >= 1.7) suggestions.push('减少精制糖和甜食摄入，限制饮酒，增加Omega-3脂肪酸摄入')
  if (bmi !== undefined && bmi >= 24) suggestions.push('减轻体重，每减重10kg可使LDL-C降低5-8%')
  if (lifestyle.smoking) suggestions.push('戒烟可提高HDL-C水平，降低心血管风险')
  if (lifestyle.alcohol === 'heavy' || lifestyle.alcohol === 'moderate') suggestions.push('限制饮酒或戒酒，男性每日酒精不超过25g，女性不超过15g')
  suggestions.push('增加可溶性膳食纤维摄入（如燕麦、豆类、水果），每日25-30g')
  suggestions.push('每周至少150分钟中等强度有氧运动，如快走、慢跑、游泳')
  suggestions.push('选择植物油（橄榄油、茶籽油）替代动物油')
  suggestions.push('定期监测血脂，每年至少检查一次血脂四项')

  return {
    id: 'hyperlipidemia',
    name: '高血脂症',
    description: '基于中国成人血脂异常防治指南评估高胆固醇、高甘油三酯等血脂异常风险',
    icon: 'Activity',
    level,
    score,
    probability,
    factors,
    suggestions,
    model: '中国成人血脂异常防治指南 (2023版)',
  }
}

function assessFattyLiver(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const age = lifestyle.age
  if (age >= 60) {
    score += 10
    factors.push({ name: '年龄', value: `${age}岁`, weight: 10, description: '老年人脂肪肝发病率较高' })
  } else if (age >= 40) {
    score += 6
    factors.push({ name: '年龄', value: `${age}岁`, weight: 6, description: '40岁以上应关注肝脏健康' })
  }

  if (lifestyle.gender === 'male') {
    score += 8
    factors.push({ name: '性别', value: '男性', weight: 8, description: '男性脂肪肝发病率高于女性' })
  }

  const bmi = getIndicator(indicators, 'bmi')
  if (bmi !== undefined) {
    if (bmi >= 30) {
      score += 30
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 30, description: '重度肥胖是脂肪肝最主要危险因素' })
    } else if (bmi >= 28) {
      score += 25
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 25, description: '肥胖显著增加脂肪肝风险' })
    } else if (bmi >= 25) {
      score += 15
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 15, description: '超重增加脂肪肝风险' })
    } else if (bmi >= 24) {
      score += 8
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 8, description: '体重偏高' })
    }
  }

  const wt = getIndicator(indicators, 'wt')
  if (bmi === undefined && wt !== undefined && lifestyle.gender === 'male' && wt >= 85) {
    score += 12
    factors.push({ name: '体重', value: `${wt} kg`, weight: 12, description: '体重超标' })
  } else if (bmi === undefined && wt !== undefined && lifestyle.gender === 'female' && wt >= 75) {
    score += 12
    factors.push({ name: '体重', value: `${wt} kg`, weight: 12, description: '体重超标' })
  }

  const alt = getIndicator(indicators, 'alt')
  if (alt !== undefined) {
    if (alt > 80) {
      score += 30
      factors.push({ name: '谷丙转氨酶(ALT)', value: `${alt} U/L`, weight: 30, description: '肝功能显著异常' })
    } else if (alt > 60) {
      score += 20
      factors.push({ name: '谷丙转氨酶(ALT)', value: `${alt} U/L`, weight: 20, description: '肝功能中度异常' })
    } else if (alt > 40) {
      score += 12
      factors.push({ name: '谷丙转氨酶(ALT)', value: `${alt} U/L`, weight: 12, description: '肝功能轻度异常' })
    }
  }

  const ast = getIndicator(indicators, 'ast')
  if (ast !== undefined && ast > 40) {
    if (alt !== undefined && alt > 40) {
      score += 8
      factors.push({ name: '谷草转氨酶(AST)', value: `${ast} U/L`, weight: 8, description: 'AST也升高，提示肝脏损伤' })
    } else {
      score += 10
      factors.push({ name: '谷草转氨酶(AST)', value: `${ast} U/L`, weight: 10, description: '肝功能异常' })
    }
  }

  const tg = getIndicator(indicators, 'tg')
  if (tg !== undefined) {
    if (tg >= 5.6) {
      score += 25
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 25, description: '严重高甘油三酯血症' })
    } else if (tg >= 2.3) {
      score += 18
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 18, description: '高甘油三酯血症' })
    } else if (tg >= 1.7) {
      score += 10
      factors.push({ name: '甘油三酯', value: `${tg} mmol/L`, weight: 10, description: '甘油三酯边缘升高' })
    }
  }

  const glu = getIndicator(indicators, 'glu')
  if (glu !== undefined) {
    if (glu >= 7.0) {
      score += 20
      factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 20, description: '糖尿病显著增加脂肪肝风险' })
    } else if (glu >= 6.1) {
      score += 12
      factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 12, description: '血糖偏高' })
    }
  }

  const hba1c = getIndicator(indicators, 'hba1c')
  if (hba1c !== undefined && hba1c >= 5.7) {
    score += 8
    factors.push({ name: '糖化血红蛋白', value: `${hba1c}%`, weight: 8, description: '血糖控制不佳' })
  }

  if (lifestyle.alcohol === 'heavy') {
    score += 30
    factors.push({ name: '饮酒', value: '大量饮酒', weight: 30, description: '酒精性脂肪肝的直接原因' })
  } else if (lifestyle.alcohol === 'moderate') {
    score += 15
    factors.push({ name: '饮酒', value: '适量饮酒', weight: 15, description: '中等量饮酒增加脂肪肝风险' })
  } else if (lifestyle.alcohol === 'occasional') {
    score += 5
    factors.push({ name: '饮酒', value: '偶尔饮酒', weight: 5, description: '偶尔饮酒需注意量' })
  }

  if (lifestyle.diet === 'unhealthy') {
    score += 18
    factors.push({ name: '饮食习惯', value: '不健康', weight: 18, description: '高脂高糖饮食是脂肪肝重要诱因' })
  } else if (lifestyle.diet === 'moderate') {
    score += 8
    factors.push({ name: '饮食习惯', value: '一般', weight: 8, description: '饮食结构需优化' })
  }

  if (lifestyle.exercise === 'none') {
    score += 15
    factors.push({ name: '运动', value: '缺乏运动', weight: 15, description: '久坐生活方式促进脂肪肝发展' })
  } else if (lifestyle.exercise === 'rare') {
    score += 8
    factors.push({ name: '运动', value: '偶尔运动', weight: 8, description: '运动量不足' })
  }

  if (lifestyle.familyHistory.fattyLiver) {
    score += 10
    factors.push({ name: '家族史', value: '有', weight: 10, description: '家族中有脂肪肝患者' })
  }

  if (lifestyle.stress === 'high') {
    score += 6
    factors.push({ name: '压力水平', value: '高压力', weight: 6, description: '长期压力影响代谢' })
  }

  const level = getRiskLevel(score, { low: 20, medium: 45 })
  const baseProbability = level === 'low' ? 8 : level === 'medium' ? 30 : 55
  const probability = clampProbability(baseProbability + (score - (level === 'low' ? 10 : level === 'medium' ? 32 : 58)) * 0.5)

  const suggestions: string[] = []
  if (bmi !== undefined && bmi >= 24) suggestions.push('减重是治疗脂肪肝最有效的方法，建议6-12个月减重5-10%')
  if (lifestyle.alcohol === 'heavy' || lifestyle.alcohol === 'moderate') suggestions.push('戒酒或严格限酒，酒精性脂肪肝患者需完全戒酒')
  if (tg !== undefined && tg >= 1.7) suggestions.push('减少精制糖和碳水化合物摄入，避免含糖饮料和甜食')
  if (alt !== undefined && alt > 40 || ast !== undefined && ast > 40) suggestions.push('定期监测肝功能，必要时就医进行进一步检查（如肝脏B超、肝弹性检测）')
  if (lifestyle.exercise === 'none' || lifestyle.exercise === 'rare') suggestions.push('每周至少150分钟中等强度有氧运动，配合力量训练')
  suggestions.push('调整饮食结构：增加蛋白质（鱼、瘦肉、豆类）、膳食纤维和抗氧化食物摄入')
  suggestions.push('避免高脂、高糖、加工食品，采用地中海饮食模式')
  suggestions.push('控制总热量摄入，每日减少500-750大卡热量')
  suggestions.push('避免使用可能损伤肝脏的药物和保健品')
  suggestions.push('保证充足睡眠，每晚7-8小时，避免熬夜')

  return {
    id: 'fattyLiver',
    name: '脂肪肝',
    description: '基于代谢综合征相关指标评估非酒精性和酒精性脂肪肝风险',
    icon: 'Flame',
    level,
    score,
    probability,
    factors,
    suggestions,
    model: 'NAFLD风险评分 + 临床指南 (改良版)',
  }
}

function assessHypertension(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const age = lifestyle.age
  if (age >= 65) {
    score += 25
    factors.push({ name: '年龄', value: `${age}岁`, weight: 25, description: '65岁以上高血压患病率显著增加' })
  } else if (age >= 55) {
    score += 18
    factors.push({ name: '年龄', value: `${age}岁`, weight: 18, description: '55岁以上高血压风险增加' })
  } else if (age >= 45) {
    score += 10
    factors.push({ name: '年龄', value: `${age}岁`, weight: 10, description: '45岁以上应关注血压健康' })
  }

  if (lifestyle.gender === 'male') {
    score += 6
    factors.push({ name: '性别', value: '男性', weight: 6, description: '中青年男性高血压患病率高于女性' })
  }

  const sbp = getIndicator(indicators, 'sbp')
  const dbp = getIndicator(indicators, 'dbp')
  if (sbp !== undefined) {
    if (sbp >= 180) {
      score += 40
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 40, description: '3级高血压（重度）' })
    } else if (sbp >= 160) {
      score += 30
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 30, description: '2级高血压（中度）' })
    } else if (sbp >= 140) {
      score += 20
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 20, description: '1级高血压（轻度）' })
    } else if (sbp >= 130) {
      score += 12
      factors.push({ name: '收缩压', value: `${sbp} mmHg`, weight: 12, description: '正常高值血压' })
    }
  }
  if (dbp !== undefined) {
    if (dbp >= 110) {
      score += 40
      factors.push({ name: '舒张压', value: `${dbp} mmHg`, weight: 40, description: '3级高血压（重度）' })
    } else if (dbp >= 100) {
      score += 30
      factors.push({ name: '舒张压', value: `${dbp} mmHg`, weight: 30, description: '2级高血压（中度）' })
    } else if (dbp >= 90) {
      score += 20
      factors.push({ name: '舒张压', value: `${dbp} mmHg`, weight: 20, description: '1级高血压（轻度）' })
    } else if (dbp >= 85) {
      score += 8
      factors.push({ name: '舒张压', value: `${dbp} mmHg`, weight: 8, description: '正常高值' })
    }
  }

  const bmi = getIndicator(indicators, 'bmi')
  if (bmi !== undefined) {
    if (bmi >= 28) {
      score += 20
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 20, description: '肥胖是高血压的重要危险因素' })
    } else if (bmi >= 24) {
      score += 12
      factors.push({ name: 'BMI', value: `${bmi} kg/m²`, weight: 12, description: '超重增加高血压风险' })
    }
  }

  if (lifestyle.familyHistory.hypertension) {
    score += 15
    factors.push({ name: '家族史', value: '有', weight: 15, description: '父母有高血压史' })
  }

  if (lifestyle.smoking) {
    score += 10
    factors.push({ name: '吸烟', value: '是', weight: 10, description: '吸烟损伤血管内皮，升高血压' })
  }

  if (lifestyle.alcohol === 'heavy') {
    score += 18
    factors.push({ name: '饮酒', value: '大量饮酒', weight: 18, description: '大量饮酒显著升高血压' })
  } else if (lifestyle.alcohol === 'moderate') {
    score += 8
    factors.push({ name: '饮酒', value: '适量饮酒', weight: 8, description: '饮酒增加高血压风险' })
  }

  if (lifestyle.diet === 'unhealthy') {
    score += 15
    factors.push({ name: '饮食习惯', value: '不健康', weight: 15, description: '高盐低钾饮食增加高血压风险' })
  } else if (lifestyle.diet === 'moderate') {
    score += 7
    factors.push({ name: '饮食习惯', value: '一般', weight: 7, description: '饮食中可能含盐过多' })
  }

  if (lifestyle.exercise === 'none') {
    score += 10
    factors.push({ name: '运动', value: '缺乏运动', weight: 10, description: '久坐生活方式增加高血压风险' })
  } else if (lifestyle.exercise === 'rare') {
    score += 5
    factors.push({ name: '运动', value: '偶尔运动', weight: 5, description: '运动量不足' })
  }

  if (lifestyle.stress === 'high') {
    score += 10
    factors.push({ name: '压力水平', value: '高压力', weight: 10, description: '长期精神紧张促进高血压发生' })
  } else if (lifestyle.stress === 'medium') {
    score += 5
    factors.push({ name: '压力水平', value: '中等压力', weight: 5, description: '需注意压力调节' })
  }

  if (lifestyle.sleepHours < 6) {
    score += 8
    factors.push({ name: '睡眠', value: `${lifestyle.sleepHours}小时/天`, weight: 8, description: '睡眠不足升高血压' })
  }

  const glu = getIndicator(indicators, 'glu')
  if (glu !== undefined && glu >= 7.0) {
    score += 12
    factors.push({ name: '空腹血糖', value: `${glu} mmol/L`, weight: 12, description: '糖尿病常与高血压共存' })
  }

  const tc = getIndicator(indicators, 'tc')
  if (tc !== undefined && tc >= 5.2) {
    score += 8
    factors.push({ name: '总胆固醇', value: `${tc} mmol/L`, weight: 8, description: '高胆固醇损伤血管' })
  }

  const level = getRiskLevel(score, { low: 20, medium: 45 })
  const baseProbability = level === 'low' ? 8 : level === 'medium' ? 28 : 55
  const probability = clampProbability(baseProbability + (score - (level === 'low' ? 10 : level === 'medium' ? 32 : 58)) * 0.5)

  const suggestions: string[] = []
  if (sbp !== undefined && sbp >= 140 || dbp !== undefined && dbp >= 90) suggestions.push('定期监测血压，遵医嘱服用降压药物，不可自行停药')
  if (bmi !== undefined && bmi >= 24) suggestions.push('减轻体重，每减重10kg可使收缩压降低5-20mmHg')
  if (lifestyle.smoking) suggestions.push('戒烟，戒烟后血压可明显改善')
  if (lifestyle.alcohol === 'heavy' || lifestyle.alcohol === 'moderate') suggestions.push('限制饮酒或戒酒，男性每日酒精不超过25g，女性不超过15g')
  suggestions.push('限制钠盐摄入，每日不超过5g（约一啤酒盖），减少腌制食品和加工食品')
  suggestions.push('增加钾摄入，多吃新鲜蔬菜和水果（如香蕉、土豆、菠菜）')
  if (lifestyle.exercise === 'none' || lifestyle.exercise === 'rare') suggestions.push('每周至少150分钟中等强度有氧运动，如快走、慢跑、游泳')
  suggestions.push('学习压力管理技巧，如冥想、深呼吸、瑜伽等放松训练')
  suggestions.push('保证充足睡眠，每晚7-8小时，规律作息')
  suggestions.push('采用DASH饮食模式，富含蔬果、全谷物、低脂乳制品')

  return {
    id: 'hypertension',
    name: '高血压',
    description: '基于中国高血压防治指南评估高血压发病和进展风险',
    icon: 'Gauge',
    level,
    score,
    probability,
    factors,
    suggestions,
    model: '中国高血压防治指南 (2023版)',
  }
}

export function runAllRiskAssessments(lifestyle: LifestyleData, indicators: Map<string, number>): RiskAssessment[] {
  return [
    assessCardiovascular(lifestyle, indicators),
    assessHypertension(lifestyle, indicators),
    assessDiabetes(lifestyle, indicators),
    assessHyperlipidemia(lifestyle, indicators),
    assessFattyLiver(lifestyle, indicators),
  ]
}

export function getRiskLevelText(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }
  return map[level]
}

export function getRiskLevelColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: '#67C23A',
    medium: '#E6A23C',
    high: '#F56C6C',
  }
  return map[level]
}

export function getRiskLevelBgColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: '#f0f9eb',
    medium: '#fdf6ec',
    high: '#fef0f0',
  }
  return map[level]
}

export const defaultLifestyleData: LifestyleData = {
  age: 40,
  gender: 'male',
  smoking: false,
  smokingYears: 0,
  cigarettesPerDay: 0,
  alcohol: 'none',
  exercise: 'weekly',
  exerciseMinutesPerWeek: 150,
  sleepHours: 7,
  stress: 'medium',
  familyHistory: {
    hypertension: false,
    diabetes: false,
    cardiovascular: false,
    fattyLiver: false,
    hyperlipidemia: false,
  },
  diet: 'moderate',
}
