<script setup lang="ts">
import { ref, computed, onMounted, nextTick, h } from 'vue'
import {
  NCard, NGrid, NGi, NButton, NIcon, NTag, NEmpty, NSpace, NModal,
  NForm, NFormItem, NInput, NInputNumber, NRadioGroup, NRadio, NSelect,
  NSwitch, NDivider, NAlert, NTabs, NTabPane, NTooltip, NPopconfirm, NSpin,
} from 'naive-ui'
import {
  Users, Heart, AlertTriangle, Plus, Trash2, Edit3, Activity,
  GitBranch, ShieldAlert, CheckCircle2, ChevronRight, Info, Dna,
  UserPlus, TrendingUp,
} from 'lucide-vue-next'
import { useFamilyStore } from '@/stores/family'
import { useHealthStore } from '@/stores/health'
import type { FamilyMember, FamilyRelation, FamilyDiseaseRecord, DiseaseType } from '@/types'
import { DISEASE_LABELS, RELATION_LABELS, SEVERITY_LABELS } from '@/types'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TreeChart, PieChart, BarChart, GaugeChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, TreeChart, PieChart, BarChart, GaugeChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const familyStore = useFamilyStore()
const healthStore = useHealthStore()

const activeTab = ref('tree')
const showModal = ref(false)
const editingMember = ref<FamilyMember | null>(null)
const isAnalyzing = ref(false)

const formDefaults = () => ({
  name: '',
  relation: 'father' as FamilyRelation,
  gender: 'male' as 'male' | 'female',
  age: 50,
  isDeceased: false,
  deceasedAge: undefined as number | undefined,
  diseases: [] as FamilyDiseaseRecord[],
  healthNotes: '',
})

const form = ref(formDefaults())

const showDiseaseModal = ref(false)
const diseaseFormMemberId = ref('')
const diseaseForm = ref<FamilyDiseaseRecord>({
  diseaseType: 'hypertension',
  diagnosedAge: undefined,
  severity: 'moderate',
  notes: '',
})

const relationOptions = Object.entries(RELATION_LABELS).map(([value, label]) => ({ label, value }))
const diseaseOptions = Object.entries(DISEASE_LABELS).map(([value, label]) => ({ label, value }))
const severityOptions = Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ label, value }))

onMounted(() => {
  familyStore.loadFromStorage(healthStore.password)
})

function openAddModal() {
  editingMember.value = null
  form.value = formDefaults()
  showModal.value = true
}

function openEditModal(member: FamilyMember) {
  editingMember.value = member
  form.value = {
    name: member.name,
    relation: member.relation,
    gender: member.gender,
    age: member.age,
    isDeceased: member.isDeceased,
    deceasedAge: member.deceasedAge,
    diseases: [...member.diseases],
    healthNotes: member.healthNotes,
  }
  showModal.value = true
}

function handleSaveMember() {
  if (!form.value.name.trim()) return
  if (editingMember.value) {
    familyStore.updateMember(editingMember.value.id, { ...form.value }, healthStore.password)
  } else {
    familyStore.addMember({ ...form.value }, healthStore.password)
  }
  showModal.value = false
}

function handleDeleteMember(id: string) {
  familyStore.removeMember(id, healthStore.password)
}

function openDiseaseModal(memberId: string) {
  diseaseFormMemberId.value = memberId
  diseaseForm.value = { diseaseType: 'hypertension', diagnosedAge: undefined, severity: 'moderate', notes: '' }
  showDiseaseModal.value = true
}

function handleAddDisease() {
  familyStore.addDiseaseToMember(diseaseFormMemberId.value, { ...diseaseForm.value }, healthStore.password)
  showDiseaseModal.value = false
}

function handleRemoveDisease(memberId: string, diseaseType: DiseaseType) {
  familyStore.removeDiseaseFromMember(memberId, diseaseType, healthStore.password)
}

async function handleAnalyze() {
  isAnalyzing.value = true
  await nextTick()
  setTimeout(() => {
    familyStore.runAnalysis()
    isAnalyzing.value = false
    activeTab.value = 'portrait'
  }, 600)
}

const familyTreeData = computed(() => {
  const genMap = new Map<string, FamilyMember[]>()
  const genOrder: Record<string, number> = {
    paternal_grandfather: 0, paternal_grandmother: 0,
    maternal_grandfather: 0, maternal_grandmother: 0,
    father: 1, mother: 1, spouse: 1,
    self: 2, sibling: 2, child: 3,
  }

  for (const m of familyStore.members) {
    const gen = genOrder[m.relation] ?? 2
    if (!genMap.has(String(gen))) genMap.set(String(gen), [])
    genMap.get(String(gen))!.push(m)
  }

  function buildNode(member: FamilyMember, depth: number = 0): any {
    const diseaseTags = member.diseases.map(d => DISEASE_LABELS[d.diseaseType])
    const hasHighRisk = member.diseases.some(d => d.severity === 'severe')
    const hasMedRisk = member.diseases.some(d => d.severity === 'moderate')
    const itemStyle: any = {}
    if (hasHighRisk) {
      itemStyle.color = '#F56C6C'
      itemStyle.borderColor = '#E74C3C'
    } else if (hasMedRisk) {
      itemStyle.color = '#E6A23C'
      itemStyle.borderColor = '#D48806'
    } else if (member.diseases.length > 0) {
      itemStyle.color = '#409EFF'
      itemStyle.borderColor = '#2E6DB4'
    } else {
      itemStyle.color = '#67C23A'
      itemStyle.borderColor = '#529B2E'
    }

    return {
      name: member.name,
      value: `${RELATION_LABELS[member.relation]}${diseaseTags.length > 0 ? '\n' + diseaseTags.join('、') : '\n健康'}`,
      itemStyle,
      label: {
        fontSize: 13,
        fontWeight: 'bold' as const,
        color: '#333',
      },
      symbol: 'roundRect',
      symbolSize: [140, 60],
      children: [],
    }
  }

  function findChildren(parentGen: string): any[] {
    const childRelations: Record<string, string> = {
      '0': '1',
      '1': '2',
      '2': '3',
    }
    const childGen = childRelations[parentGen]
    if (!childGen) return []
    return (genMap.get(childGen) || []).map(m => buildNode(m, parseInt(parentGen) + 1))
  }

  const roots = (genMap.get('0') || genMap.get('1') || genMap.get('2') || familyStore.members).map(m => {
    const node = buildNode(m, genOrder[m.relation])
    return node
  })

  if (roots.length === 0) return null

  const grandparents = (genMap.get('0') || []).map(m => {
    const node = buildNode(m, 0)
    const children = (genMap.get('1') || []).filter(c =>
      m.relation.startsWith('paternal') && c.relation === 'father' ||
      m.relation.startsWith('maternal') && c.relation === 'mother'
    ).map(c => {
      const childNode = buildNode(c, 1)
      const selfAndSiblings = (genMap.get('2') || []).map(s => buildNode(s, 2))
      if (c.relation === 'father' || c.relation === 'mother') {
        childNode.children = selfAndSiblings
      }
      return childNode
    })
    node.children = children
    return node
  })

  if (grandparents.length > 0) {
    const paternalGP = grandparents.filter(g => {
      const m = familyStore.members.find(fm => fm.name === g.name)
      return m && m.relation.startsWith('paternal')
    })
    const maternalGP = grandparents.filter(g => {
      const m = familyStore.members.find(fm => fm.name === g.name)
      return m && m.relation.startsWith('maternal')
    })

    const root: any = {
      name: '家族',
      itemStyle: { color: '#4A90D9', borderColor: '#2E6DB4' },
      label: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
      symbol: 'roundRect',
      symbolSize: [100, 50],
      children: [],
    }

    if (paternalGP.length > 0) {
      const paternal = {
        name: '父系',
        itemStyle: { color: '#6AADE4', borderColor: '#4A90D9' },
        label: { fontSize: 13, fontWeight: 'bold', color: '#333' },
        symbol: 'roundRect',
        symbolSize: [100, 50],
        children: paternalGP,
      }
      root.children.push(paternal)
    }

    if (maternalGP.length > 0) {
      const maternal = {
        name: '母系',
        itemStyle: { color: '#6AADE4', borderColor: '#4A90D9' },
        label: { fontSize: 13, fontWeight: 'bold', color: '#333' },
        symbol: 'roundRect',
        symbolSize: [100, 50],
        children: maternalGP,
      }
      root.children.push(maternal)
    }

    const directMembers = (genMap.get('1') || []).filter(m =>
      !familyStore.members.some(gm =>
        gm.relation.startsWith('paternal') && m.relation === 'father' ||
        gm.relation.startsWith('maternal') && m.relation === 'mother'
      )
    )
    for (const dm of directMembers) {
      root.children.push(buildNode(dm, 1))
    }

    const selfAndSiblings = (genMap.get('2') || []).map(m => buildNode(m, 2))
    if (selfAndSiblings.length > 0 && !paternalGP.length && !maternalGP.length) {
      root.children.push(...selfAndSiblings)
    }

    const children = (genMap.get('3') || []).map(m => buildNode(m, 3))
    const selfNode = selfAndSiblings.find(s => {
      const sm = familyStore.members.find(fm => fm.name === s.name)
      return sm && sm.relation === 'self'
    })
    if (selfNode && children.length > 0) {
      selfNode.children = children
    }

    return root
  }

  const gen1 = (genMap.get('1') || []).map(m => {
    const node = buildNode(m, 1)
    node.children = (genMap.get('2') || []).map(s => buildNode(s, 2))
    return node
  })

  const gen2 = (genMap.get('2') || []).filter(m => !genMap.get('1')?.length).map(m => buildNode(m, 2))

  if (gen1.length > 0) {
    return {
      name: '家族',
      itemStyle: { color: '#4A90D9', borderColor: '#2E6DB4' },
      label: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
      symbol: 'roundRect',
      symbolSize: [100, 50],
      children: gen1,
    }
  }

  if (gen2.length > 0) {
    return {
      name: '家族',
      itemStyle: { color: '#4A90D9', borderColor: '#2E6DB4' },
      label: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
      symbol: 'roundRect',
      symbolSize: [100, 50],
      children: gen2,
    }
  }

  return null
})

const treeOption = computed(() => {
  const data = familyTreeData.value
  if (!data) return {}
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `<b>${params.name}</b><br/>${params.value || ''}`
      },
    },
    series: [
      {
        type: 'tree',
        data: [data],
        top: '5%',
        left: '12%',
        bottom: '5%',
        right: '12%',
        symbolSize: [140, 60],
        symbol: 'roundRect',
        orient: 'vertical',
        label: {
          position: 'inside',
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 12,
          rich: {},
        },
        leaves: {
          label: {
            position: 'inside',
            verticalAlign: 'middle',
          },
        },
        lineStyle: {
          color: '#B3D9F2',
          width: 2,
          curveness: 0.5,
        },
        expandAndCollapse: false,
        animationDuration: 550,
        animationDurationUpdate: 750,
        initialTreeDepth: -1,
      },
    ],
  }
})

const pieOption = computed(() => {
  const data = familyStore.diseaseNameList.map(d => ({
    name: d.name,
    value: d.count,
  }))
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { fontSize: 12, color: '#666' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{c}人',
          fontSize: 12,
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
        color: ['#F56C6C', '#E6A23C', '#409EFF', '#67C23A', '#909399', '#9B59B6', '#1ABC9C', '#F39C12', '#E74C3C', '#3498DB'],
      },
    ],
  }
})

const barOption = computed(() => {
  const risks = familyStore.geneticRisks
  if (risks.length === 0) return {}
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: risks.map(r => r.diseaseName),
      axisLabel: { color: '#666', fontSize: 11 },
      axisLine: { lineStyle: { color: '#d0d7de' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#666', formatter: '{value}%' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#eef2f7' } },
    },
    series: [
      {
        type: 'bar',
        data: risks.map(r => ({
          value: r.riskScore,
          itemStyle: {
            color: r.riskLevel === 'high' ? '#F56C6C' : r.riskLevel === 'medium' ? '#E6A23C' : '#67C23A',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: '#666',
          fontSize: 12,
        },
      },
    ],
  }
})

const gaugeOption = computed(() => {
  const score = familyStore.portrait?.healthScore ?? 100
  const level = familyStore.portrait?.overallLevel ?? 'low'
  const colorMap: Record<string, string> = { high: '#F56C6C', medium: '#E6A23C', low: '#67C23A' }
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        center: ['50%', '65%'],
        radius: '100%',
        progress: { show: true, width: 20, itemStyle: { color: colorMap[level] } },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[0.4, '#F56C6C'], [0.7, '#E6A23C'], [1, '#67C23A']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { length: '60%', width: 6, itemStyle: { color: '#4A90D9' } },
        anchor: { show: false },
        title: { offsetCenter: [0, '-10%'], fontSize: 14, color: '#666' },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '5%'],
          fontSize: 32,
          fontWeight: 'bold',
          formatter: '{value}',
          color: colorMap[level],
        },
        data: [{ value: score, name: '家族健康评分' }],
      },
    ],
  }
})

const getRiskLevelColor = (level: string) => {
  if (level === 'high') return '#F56C6C'
  if (level === 'medium') return '#E6A23C'
  return '#67C23A'
}

const getRiskLevelText = (level: string) => {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

const getRiskLevelBg = (level: string) => {
  if (level === 'high') return '#FEF0F0'
  if (level === 'medium') return '#FDF6EC'
  return '#F0F9EB'
}

const levelTagType: Record<string, 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
}
</script>

<template>
  <div class="family-health-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <NIcon :size="28" color="#4A90D9"><Dna /></NIcon>
          家庭健康画像与遗传分析
        </h1>
        <p class="page-subtitle">构建家族健康树，分析遗传风险，生成家庭健康画像</p>
      </div>
      <NSpace>
        <NButton type="primary" @click="openAddModal">
          <template #icon><NIcon :size="16"><UserPlus /></NIcon></template>
          添加家庭成员
        </NButton>
        <NButton
          type="primary"
          ghost
          @click="handleAnalyze"
          :loading="isAnalyzing"
          :disabled="familyStore.members.length === 0"
        >
          <template #icon><NIcon :size="16"><Activity /></NIcon></template>
          生成健康画像
        </NButton>
      </NSpace>
    </div>

    <NAlert v-if="familyStore.members.length === 0" type="info" style="margin-bottom: 20px;">
      请先添加家庭成员及其病史信息，然后点击"生成健康画像"进行遗传分析。
    </NAlert>

    <NTabs v-model:value="activeTab" type="line" animated>
      <NTabPane name="tree" tab="家族健康树">
        <NCard :bordered="false">
          <div v-if="familyStore.members.length === 0" class="empty-state">
            <NEmpty description="暂无家庭成员，请点击右上角添加">
              <template #icon>
                <NIcon :size="48" color="#B3D9F2"><GitBranch /></NIcon>
              </template>
            </NEmpty>
          </div>
          <div v-else>
            <div class="tree-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#67C23A;"></span>健康</span>
              <span class="legend-item"><span class="legend-dot" style="background:#409EFF;"></span>轻度患病</span>
              <span class="legend-item"><span class="legend-dot" style="background:#E6A23C;"></span>中度患病</span>
              <span class="legend-item"><span class="legend-dot" style="background:#F56C6C;"></span>重度患病</span>
            </div>
            <div style="height: 480px;">
              <v-chart :option="treeOption" autoresize />
            </div>
          </div>
        </NCard>

        <NCard :bordered="false" style="margin-top: 16px;">
          <div class="card-section-title">
            <NIcon :size="18" color="#4A90D9"><Users /></NIcon>
            家庭成员列表
          </div>
          <div v-if="familyStore.members.length === 0" class="empty-inline">
            <NEmpty description="暂无家庭成员" />
          </div>
          <div v-else class="member-list">
            <div v-for="member in familyStore.members" :key="member.id" class="member-card">
              <div class="member-header">
                <div class="member-avatar" :class="member.gender">
                  {{ member.name.charAt(0) }}
                </div>
                <div class="member-info">
                  <div class="member-name">
                    {{ member.name }}
                    <NTag size="small" :type="member.relation === 'self' ? 'info' : 'default'" round>
                      {{ RELATION_LABELS[member.relation] }}
                    </NTag>
                    <NTag v-if="member.isDeceased" size="small" type="default" round>已故</NTag>
                  </div>
                  <div class="member-meta">
                    {{ member.gender === 'male' ? '男' : '女' }} · {{ member.age }}岁
                    <template v-if="member.isDeceased && member.deceasedAge">
                      · 享年{{ member.deceasedAge }}岁
                    </template>
                  </div>
                </div>
                <NSpace>
                  <NButton size="small" quaternary @click="openDiseaseModal(member.id)">
                    <template #icon><NIcon :size="14"><Plus /></NIcon></template>
                    添加病史
                  </NButton>
                  <NButton size="small" quaternary @click="openEditModal(member)">
                    <template #icon><NIcon :size="14"><Edit3 /></NIcon></template>
                  </NButton>
                  <NPopconfirm @positive-click="handleDeleteMember(member.id)">
                    <template #trigger>
                      <NButton size="small" quaternary type="error">
                        <template #icon><NIcon :size="14"><Trash2 /></NIcon></template>
                      </NButton>
                    </template>
                    确定删除该家庭成员吗？
                  </NPopconfirm>
                </NSpace>
              </div>
              <div v-if="member.diseases.length > 0" class="disease-tags">
                <NTag
                  v-for="d in member.diseases"
                  :key="d.diseaseType"
                  :type="d.severity === 'severe' ? 'error' : d.severity === 'moderate' ? 'warning' : 'info'"
                  size="small"
                  round
                  closable
                  @close="handleRemoveDisease(member.id, d.diseaseType)"
                  style="margin: 2px 4px 2px 0;"
                >
                  {{ DISEASE_LABELS[d.diseaseType] }}
                  <template v-if="d.diagnosedAge">（{{ d.diagnosedAge }}岁确诊）</template>
                  · {{ SEVERITY_LABELS[d.severity] }}
                </NTag>
              </div>
              <div v-else class="disease-tags">
                <span class="no-disease">暂无病史记录</span>
              </div>
              <div v-if="member.healthNotes" class="member-notes">
                <NIcon :size="12" color="#8899aa"><Info /></NIcon>
                {{ member.healthNotes }}
              </div>
            </div>
          </div>
        </NCard>
      </NTabPane>

      <NTabPane name="portrait" tab="家庭健康画像" :disabled="!familyStore.hasAnalyzed">
        <template v-if="!familyStore.hasAnalyzed">
          <NCard :bordered="false">
            <div class="empty-state">
              <NEmpty description="请先添加家庭成员，然后点击「生成健康画像」">
                <template #icon>
                  <NIcon :size="48" color="#B3D9F2"><Heart /></NIcon>
                </template>
              </NEmpty>
            </div>
          </NCard>
        </template>

        <template v-else>
          <NGrid :cols="3" :x-gap="16" :y-gap="16" style="margin-bottom: 16px;">
            <NGi>
              <NCard :bordered="false" class="gauge-card">
                <div class="gauge-title">家族健康评分</div>
                <div style="height: 180px;">
                  <v-chart :option="gaugeOption" autoresize />
                </div>
                <div class="gauge-level" :style="{ color: getRiskLevelColor(familyStore.portrait?.overallLevel ?? 'low') }">
                  {{ getRiskLevelText(familyStore.portrait?.overallLevel ?? 'low') }}
                </div>
              </NCard>
            </NGi>

            <NGi :span="2">
              <NCard :bordered="false" class="stats-card">
                <div class="stats-title">家族概况</div>
                <div class="stats-row">
                  <div class="stat-item" style="border-left-color: #4A90D9;">
                    <div class="stat-label">家庭成员</div>
                    <div class="stat-value" style="color: #4A90D9;">{{ familyStore.portrait?.totalMembers ?? 0 }}</div>
                  </div>
                  <div class="stat-item" style="border-left-color: #F56C6C;">
                    <div class="stat-label">高风险疾病</div>
                    <div class="stat-value" style="color: #F56C6C;">{{ familyStore.highRiskDiseases.length }}</div>
                  </div>
                  <div class="stat-item" style="border-left-color: #E6A23C;">
                    <div class="stat-label">中风险疾病</div>
                    <div class="stat-value" style="color: #E6A23C;">{{ familyStore.mediumRiskDiseases.length }}</div>
                  </div>
                  <div class="stat-item" style="border-left-color: #67C23A;">
                    <div class="stat-label">疾病类型</div>
                    <div class="stat-value" style="color: #67C23A;">{{ familyStore.diseaseNameList.length }}</div>
                  </div>
                </div>

                <div style="height: 200px; margin-top: 8px;">
                  <v-chart :option="pieOption" autoresize />
                </div>
              </NCard>
            </NGi>
          </NGrid>

          <NCard :bordered="false" style="margin-bottom: 16px;">
            <div class="card-section-title">
              <NIcon :size="18" color="#E6A23C"><ShieldAlert /></NIcon>
              重点关注风险
            </div>

            <div v-if="familyStore.highRiskDiseases.length === 0 && familyStore.mediumRiskDiseases.length === 0" class="no-risk">
              <NIcon :size="20" color="#67C23A"><CheckCircle2 /></NIcon>
              <span>暂无需要重点关注的遗传风险</span>
            </div>

            <div v-else class="risk-alerts">
              <div
                v-for="risk in [...familyStore.highRiskDiseases, ...familyStore.mediumRiskDiseases]"
                :key="risk.diseaseType"
                class="risk-alert-card"
                :style="{ borderLeftColor: getRiskLevelColor(risk.riskLevel), background: getRiskLevelBg(risk.riskLevel) }"
              >
                <div class="risk-alert-header">
                  <div class="risk-alert-left">
                    <NIcon :size="20" :color="getRiskLevelColor(risk.riskLevel)"><AlertTriangle /></NIcon>
                    <span class="risk-alert-name">{{ risk.diseaseName }}</span>
                    <NTag :type="levelTagType[risk.riskLevel]" size="small" round>{{ getRiskLevelText(risk.riskLevel) }}</NTag>
                  </div>
                  <div class="risk-alert-score" :style="{ color: getRiskLevelColor(risk.riskLevel) }">
                    {{ risk.riskScore }}分
                  </div>
                </div>
                <div class="risk-alert-desc">{{ risk.description }}</div>
                <div class="risk-alert-members">
                  患病成员：{{ risk.affectedMembers.join('、') }}
                </div>
                <div class="risk-alert-pattern">遗传模式：{{ risk.inheritancePattern }}</div>
              </div>
            </div>
          </NCard>

          <NCard :bordered="false" style="margin-bottom: 16px;">
            <div class="card-section-title">
              <NIcon :size="18" color="#4A90D9"><TrendingUp /></NIcon>
              遗传风险评分
            </div>
            <div style="height: 320px;">
              <v-chart :option="barOption" autoresize />
            </div>
          </NCard>

          <NCard :bordered="false">
            <div class="card-section-title">
              <NIcon :size="18" color="#4A90D9"><Heart /></NIcon>
              各项遗传风险详情与建议
            </div>

            <div v-if="familyStore.geneticRisks.length === 0" class="no-risk">
              <NIcon :size="20" color="#67C23A"><CheckCircle2 /></NIcon>
              <span>家族中暂无已知遗传性疾病</span>
            </div>

            <div v-else class="risk-detail-list">
              <div
                v-for="risk in familyStore.geneticRisks"
                :key="risk.diseaseType"
                class="risk-detail-card"
              >
                <div class="risk-detail-header">
                  <div class="risk-detail-left">
                    <div class="risk-icon-wrap" :style="{ background: getRiskLevelBg(risk.riskLevel) }">
                      <NIcon :size="20" :color="getRiskLevelColor(risk.riskLevel)"><AlertTriangle /></NIcon>
                    </div>
                    <div>
                      <div class="risk-detail-name">{{ risk.diseaseName }}</div>
                      <div class="risk-detail-pattern">{{ risk.inheritancePattern }}</div>
                    </div>
                  </div>
                  <div class="risk-detail-right">
                    <NTag :type="levelTagType[risk.riskLevel]" round>{{ getRiskLevelText(risk.riskLevel) }}</NTag>
                    <span class="risk-detail-score" :style="{ color: getRiskLevelColor(risk.riskLevel) }">{{ risk.riskScore }}分</span>
                  </div>
                </div>

                <div class="risk-detail-desc">{{ risk.description }}</div>

                <div class="risk-detail-members">
                  <span class="label">患病成员：</span>
                  <span>{{ risk.affectedMembers.join('、') }}</span>
                </div>

                <NDivider style="margin: 12px 0;" />

                <div class="risk-detail-suggestions">
                  <div class="suggestions-label">
                    <NIcon :size="14" color="#4A90D9"><CheckCircle2 /></NIcon>
                    预防建议
                  </div>
                  <div class="suggestions-list">
                    <div v-for="(sug, idx) in risk.suggestions" :key="idx" class="suggestion-item">
                      <div class="suggestion-bullet">
                        <ChevronRight :size="12" />
                      </div>
                      <span>{{ sug }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </NCard>
        </template>
      </NTabPane>
    </NTabs>

    <NModal v-model:show="showModal" preset="card" title="添加家庭成员" style="width: 520px;" :mask-closable="false">
      <NForm label-placement="left" label-width="100px">
        <NFormItem label="姓名">
          <NInput v-model:value="form.name" placeholder="请输入姓名" />
        </NFormItem>
        <NFormItem label="亲属关系">
          <NSelect v-model:value="form.relation" :options="relationOptions" />
        </NFormItem>
        <NFormItem label="性别">
          <NRadioGroup v-model:value="form.gender">
            <NRadio value="male">男</NRadio>
            <NRadio value="female">女</NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="年龄">
          <NInputNumber v-model:value="form.age" :min="0" :max="120" style="width: 100%;" />
        </NFormItem>
        <NFormItem label="是否在世">
          <NSwitch v-model:value="form.isDeceased" />
        </NFormItem>
        <NFormItem v-if="form.isDeceased" label="享年">
          <NInputNumber v-model:value="form.deceasedAge" :min="0" :max="120" placeholder="去世时年龄" style="width: 100%;" />
        </NFormItem>
        <NFormItem label="健康备注">
          <NInput v-model:value="form.healthNotes" type="textarea" placeholder="其他健康信息备注" :rows="2" />
        </NFormItem>
      </NForm>
      <template #action>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSaveMember">{{ editingMember ? '保存' : '添加' }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showDiseaseModal" preset="card" title="添加病史" style="width: 460px;" :mask-closable="false">
      <NForm label-placement="left" label-width="100px">
        <NFormItem label="疾病类型">
          <NSelect v-model:value="diseaseForm.diseaseType" :options="diseaseOptions" />
        </NFormItem>
        <NFormItem label="确诊年龄">
          <NInputNumber v-model:value="diseaseForm.diagnosedAge" :min="0" :max="120" placeholder="确诊时年龄（选填）" style="width: 100%;" />
        </NFormItem>
        <NFormItem label="严重程度">
          <NSelect v-model:value="diseaseForm.severity" :options="severityOptions" />
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="diseaseForm.notes" type="textarea" placeholder="补充说明（选填）" :rows="2" />
        </NFormItem>
      </NForm>
      <template #action>
        <NSpace justify="end">
          <NButton @click="showDiseaseModal = false">取消</NButton>
          <NButton type="primary" @click="handleAddDisease">确认添加</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.family-health-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 600;
  color: #1a6fb5;
  margin: 0;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #8899aa;
  font-size: 13px;
}

.empty-state {
  padding: 80px 20px;
  background: #fff;
  border-radius: 8px;
}

.card-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a6fb5;
  margin-bottom: 16px;
}

.tree-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 10px 16px;
  background: #f9fbfd;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  padding: 16px;
  background: #f9fbfd;
  border-radius: 10px;
  border: 1px solid #eef2f7;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.member-avatar.male {
  background: linear-gradient(135deg, #4A90D9, #6AADE4);
}

.member-avatar.female {
  background: linear-gradient(135deg, #E891B9, #F0B5D1);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.member-meta {
  font-size: 12px;
  color: #8899aa;
  margin-top: 2px;
}

.disease-tags {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eef2f7;
}

.no-disease {
  font-size: 12px;
  color: #bbb;
}

.member-notes {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #8899aa;
  line-height: 1.5;
}

.gauge-card {
  text-align: center;
}

.gauge-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.gauge-level {
  font-size: 18px;
  font-weight: 600;
  margin-top: -10px;
}

.stats-card {
  height: 100%;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.stat-item {
  flex: 1;
  padding: 10px 14px;
  background: #f9fbfd;
  border-radius: 8px;
  border-left: 3px solid;
}

.stat-label {
  font-size: 12px;
  color: #8899aa;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.risk-alerts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.risk-alert-card {
  padding: 16px;
  border-radius: 10px;
  border-left: 4px solid;
}

.risk-alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.risk-alert-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-alert-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.risk-alert-score {
  font-size: 20px;
  font-weight: 700;
}

.risk-alert-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 6px;
}

.risk-alert-members {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.risk-alert-pattern {
  font-size: 12px;
  color: #4A90D9;
}

.no-risk {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #f0f9eb;
  border-radius: 8px;
  color: #67C23A;
  font-size: 13px;
}

.risk-detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk-detail-card {
  padding: 20px;
  background: #f9fbfd;
  border-radius: 10px;
  border: 1px solid #eef2f7;
}

.risk-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.risk-detail-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.risk-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.risk-detail-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.risk-detail-pattern {
  font-size: 12px;
  color: #8899aa;
  margin-top: 2px;
}

.risk-detail-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.risk-detail-score {
  font-size: 22px;
  font-weight: 700;
}

.risk-detail-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-top: 12px;
}

.risk-detail-members {
  margin-top: 10px;
  font-size: 13px;
  color: #555;
}

.risk-detail-members .label {
  font-weight: 600;
  color: #333;
}

.suggestions-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: #f0f7ff;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.suggestion-bullet {
  color: #4A90D9;
  display: flex;
  align-items: center;
  margin-top: 3px;
  flex-shrink: 0;
}

.empty-inline {
  padding: 30px 0;
}
</style>
