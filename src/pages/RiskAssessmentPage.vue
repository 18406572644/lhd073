<script setup lang="ts">import { ref, computed, h } from 'vue';
import { useHealthStore } from '@/stores/health';
import { NCard, NGrid, NGi, NForm, NFormItem, NInputNumber, NRadioGroup, NRadio, NSelect, NSwitch, NButton, NIcon, NTag, NProgress, NEmpty, NSpace, NTooltip, NDivider, NTabs, NTabPane, NAlert } from 'naive-ui';
import { Heart, Droplets, Activity, Flame, Gauge, ShieldCheck, User, Cigarette, Wine, Dumbbell, Moon, Brain, UtensilsCrossed, AlertTriangle, CheckCircle2, Info, ChevronRight, RefreshCw } from 'lucide-vue-next';
import type { LifestyleData, RiskAssessment, RiskLevel } from '@/types';
import { runAllRiskAssessments, getRiskLevelText, getRiskLevelColor, getRiskLevelBgColor, defaultLifestyleData } from '@/utils/riskAssessment';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { GaugeChart, PieChart, BarChart, RadarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, RadarComponent } from 'echarts/components';
use([
 CanvasRenderer,
 GaugeChart,
 PieChart,
 BarChart,
 RadarChart,
 TitleComponent,
 TooltipComponent,
 LegendComponent,
 GridComponent,
 RadarComponent,
]);
const store = useHealthStore();
const lifestyle = ref<LifestyleData>({ ...defaultLifestyleData, familyHistory: { ...defaultLifestyleData.familyHistory } });
const assessments = ref<RiskAssessment[]>([]);
const hasAssessed = ref(false);
const isAssessing = ref(false);
const activeTab = ref('overview');
const selectedRisk = ref<RiskAssessment | null>(null);
const indicatorMap = computed(() => {
 const map = new Map<string, number>();
 if (store.latestRecord) {
 for (const iv of store.latestRecord.indicators) {
 map.set(iv.indicatorId, iv.value);
 }
 }
 return map;
});
const availableIndicators = computed(() => {
 const ids = new Set(['sbp', 'dbp', 'tc', 'tg', 'hdl', 'ldl', 'glu', 'hba1c', 'bmi', 'wt', 'alt', 'ast']);
 return store.indicators.filter(i => ids.has(i.id));
});
function runAssessment() {
 isAssessing.value = true;
 setTimeout(() => {
 assessments.value = runAllRiskAssessments(lifestyle.value, indicatorMap.value);
 hasAssessed.value = true;
 isAssessing.value = false;
 if (assessments.value.length > 0) {
 selectedRisk.value = assessments.value[0];
 }
 }, 500);
}
function resetForm() {
 lifestyle.value = { ...defaultLifestyleData, familyHistory: { ...defaultLifestyleData.familyHistory } };
}
const overallRiskScore = computed(() => {
 if (assessments.value.length === 0)
 return 0;
 const levelWeights: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
 let totalWeight = 0;
 let weightedScore = 0;
 for (const a of assessments.value) {
 const w = levelWeights[a.level];
 totalWeight += w;
 weightedScore += a.probability * w;
 }
 return Math.round(weightedScore / totalWeight);
});
const overallRiskLevel = computed((): RiskLevel => {
 const score = overallRiskScore.value;
 if (score <= 15)
 return 'low';
 if (score <= 35)
 return 'medium';
 return 'high';
});
const riskSummary = computed(() => {
 const counts = { low: 0, medium: 0, high: 0 };
 for (const a of assessments.value) {
 counts[a.level]++;
 }
 return counts;
});
const gaugeOption = computed(() => ({
 series: [
 {
 type: 'gauge',
 startAngle: 180,
 endAngle: 0,
 min: 0,
 max: 100,
 center: ['50%', '65%'],
 radius: '100%',
 progress: {
 show: true,
 width: 20,
 itemStyle: {
 color: getRiskLevelColor(overallRiskLevel.value),
 },
 },
 axisLine: {
 lineStyle: {
 width: 20,
 color: [
 [0.2, '#67C23A'],
 [0.45, '#E6A23C'],
 [1, '#F56C6C'],
 ],
 },
 },
 axisTick: { show: false },
 splitLine: { show: false },
 axisLabel: { show: false },
 pointer: {
 length: '60%',
 width: 6,
 itemStyle: { color: '#4A90D9' },
 },
 anchor: { show: false },
 title: {
 offsetCenter: [0, '-10%'],
 fontSize: 14,
 color: '#666',
 },
 detail: {
 valueAnimation: true,
 offsetCenter: [0, '5%'],
 fontSize: 32,
 fontWeight: 'bold',
 formatter: '{value}%',
 color: getRiskLevelColor(overallRiskLevel.value),
 },
 data: [
 {
 value: overallRiskScore.value,
 name: '综合健康风险指数',
 },
 ],
 },
 ],
}));
const radarOption = computed(() => {
 const maxScore = 100;
 return {
 tooltip: {},
 radar: {
 indicator: assessments.value.map(a => ({
 name: a.name,
 max: maxScore,
 })),
 radius: '65%',
 center: ['50%', '55%'],
 splitNumber: 4,
 axisName: {
 color: '#666',
 fontSize: 12,
 },
 splitArea: {
 areaStyle: {
 color: ['#f5f7fa', '#e8f4fd', '#f5f7fa', '#e8f4fd'],
 },
 },
 axisLine: {
 lineStyle: { color: '#d0d7de' },
 },
 splitLine: {
 lineStyle: { color: '#d0d7de' },
 },
 },
 series: [
 {
 type: 'radar',
 data: [
 {
 value: assessments.value.map(a => Math.min(a.probability, 100)),
 name: '风险概率',
 areaStyle: {
 color: 'rgba(74, 144, 217, 0.2)',
 },
 lineStyle: {
 color: '#4A90D9',
 width: 2,
 },
 itemStyle: {
 color: '#4A90D9',
 },
 },
 ],
 },
 ],
 };
});
const barOption = computed(() => ({
 tooltip: {
 trigger: 'axis',
 axisPointer: { type: 'shadow' },
 },
 grid: {
 left: '3%',
 right: '4%',
 bottom: '3%',
 top: '10%',
 containLabel: true,
 },
 xAxis: {
 type: 'category',
 data: assessments.value.map(a => a.name),
 axisLabel: {
 color: '#666',
 fontSize: 11,
 },
 axisLine: { lineStyle: { color: '#d0d7de' } },
 },
 yAxis: {
 type: 'value',
 max: 100,
 axisLabel: {
 color: '#666',
 formatter: '{value}%',
 },
 axisLine: { show: false },
 splitLine: { lineStyle: { color: '#eef2f7' } },
 },
 series: [
 {
 type: 'bar',
 data: assessments.value.map(a => ({
 value: Math.round(a.probability * 10) / 10,
 itemStyle: {
 color: getRiskLevelColor(a.level),
 borderRadius: [4, 4, 0, 0],
 },
 })),
 barWidth: '40%',
 label: {
 show: true,
 position: 'top',
 formatter: '{c}%',
 color: '#666',
 fontSize: 12,
 },
 },
 ],
}));
const iconMap: Record<string, any> = {
 Heart,
 Droplets,
 Activity,
 Flame,
 Gauge,
};
function getIcon(iconName: string) {
 return iconMap[iconName] || ShieldCheck;
}
const genderOptions = [
 { label: '男', value: 'male' },
 { label: '女', value: 'female' },
];
const alcoholOptions = [
 { label: '不饮酒', value: 'none' },
 { label: '偶尔', value: 'occasional' },
 { label: '适量', value: 'moderate' },
 { label: '大量', value: 'heavy' },
];
const exerciseOptions = [
 { label: '不运动', value: 'none' },
 { label: '偶尔', value: 'rare' },
 { label: '每周', value: 'weekly' },
 { label: '每天', value: 'daily' },
];
const stressOptions = [
 { label: '低', value: 'low' },
 { label: '中', value: 'medium' },
 { label: '高', value: 'high' },
];
const dietOptions = [
 { label: '健康', value: 'healthy' },
 { label: '一般', value: 'moderate' },
 { label: '不健康', value: 'unhealthy' },
];
const levelTagType: Record<RiskLevel, 'success' | 'warning' | 'error'> = {
 low: 'success',
 medium: 'warning',
 high: 'error',
};
</script>

<template>
  <div class="risk-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <NIcon :size="28" color="#4A90D9"><ShieldCheck /></NIcon>
          智能健康风险评估
        </h1>
        <p class="page-subtitle">基于体检数据和生活方式，综合评估多种慢性病风险</p>
      </div>
      <div v-if="hasAssessed">
        <NButton type="primary" ghost @click="runAssessment" :loading="isAssessing">
          <template #icon><NIcon :size="16"><RefreshCw /></NIcon></template>
          重新评估
        </NButton>
      </div>
    </div>

    <NTabs v-model:value="activeTab" type="line" animated>
      <NTabPane name="overview" tab="评估总览">
        <div v-if="!hasAssessed" class="empty-state">
          <NEmpty description="请先填写基本信息和生活方式数据，然后点击开始评估">
            <template #icon>
              <NIcon :size="48" color="#B3D9F2"><ShieldCheck /></NIcon>
            </template>
          </NEmpty>
        </div>

        <template v-else>
          <NGrid :cols="3" :x-gap="16" :y-gap="16" style="margin-bottom: 20px;">
            <NGi :span="1">
              <NCard :bordered="false" class="risk-gauge-card">
                <div class="gauge-title">综合健康风险</div>
                <div style="height: 180px;">
                  <v-chart :option="gaugeOption" autoresize />
                </div>
                <div class="gauge-level" :style="{ color: getRiskLevelColor(overallRiskLevel) }">
                  {{ getRiskLevelText(overallRiskLevel) }}
                </div>
              </NCard>
            </NGi>

            <NGi :span="2">
              <NCard :bordered="false" class="stats-card">
                <div class="stats-title">风险分布概览</div>
                <div class="stats-row">
                  <div class="stat-item" :style="{ borderLeftColor: getRiskLevelColor('low') }">
                    <div class="stat-label">低风险</div>
                    <div class="stat-value" :style="{ color: getRiskLevelColor('low') }">{{ riskSummary.low }}</div>
                  </div>
                  <div class="stat-item" :style="{ borderLeftColor: getRiskLevelColor('medium') }">
                    <div class="stat-label">中风险</div>
                    <div class="stat-value" :style="{ color: getRiskLevelColor('medium') }">{{ riskSummary.medium }}</div>
                  </div>
                  <div class="stat-item" :style="{ borderLeftColor: getRiskLevelColor('high') }">
                    <div class="stat-label">高风险</div>
                    <div class="stat-value" :style="{ color: getRiskLevelColor('high') }">{{ riskSummary.high }}</div>
                  </div>
                </div>

                <div style="height: 200px; margin-top: 8px;">
                  <v-chart :option="barOption" autoresize />
                </div>
              </NCard>
            </NGi>
          </NGrid>

          <NCard :bordered="false" style="margin-bottom: 20px;">
            <div class="card-section-title">各项风险详情</div>
            <NGrid :cols="5" :x-gap="12" :y-gap="12">
              <NGi v-for="risk in assessments" :key="risk.id">
                <div
                  class="risk-card"
                  :class="{ 'risk-card-selected': selectedRisk?.id === risk.id }"
                  :style="{ borderTopColor: getRiskLevelColor(risk.level) }"
                  @click="selectedRisk = risk"
                >
                  <div class="risk-card-header">
                    <div class="risk-icon-wrapper" :style="{ background: getRiskLevelBgColor(risk.level) }">
                      <NIcon :size="22" :color="getRiskLevelColor(risk.level)">
                        <component :is="getIcon(risk.icon)" />
                      </NIcon>
                    </div>
                    <NTag :type="levelTagType[risk.level]" size="small" round>
                      {{ getRiskLevelText(risk.level) }}
                    </NTag>
                  </div>
                  <div class="risk-card-name">{{ risk.name }}</div>
                  <div class="risk-card-prob">
                    <span class="risk-prob-value" :style="{ color: getRiskLevelColor(risk.level) }">{{ risk.probability.toFixed(1) }}</span>
                    <span class="risk-prob-unit">%</span>
                  </div>
                  <NProgress
                    :percentage="Math.min(risk.probability, 100)"
                    :color="getRiskLevelColor(risk.level)"
                    :stroke-width="4"
                    :show-indicator="false"
                  />
                </div>
              </NGi>
            </NGrid>
          </NCard>

          <NCard v-if="selectedRisk" :bordered="false">
            <div class="detail-header">
              <div class="detail-header-left">
                <div class="risk-icon-wrapper large" :style="{ background: getRiskLevelBgColor(selectedRisk.level) }">
                  <NIcon :size="28" :color="getRiskLevelColor(selectedRisk.level)">
                    <component :is="getIcon(selectedRisk.icon)" />
                  </NIcon>
                </div>
                <div>
                  <h3 class="detail-title">{{ selectedRisk.name }}</h3>
                  <p class="detail-desc">{{ selectedRisk.description }}</p>
                </div>
              </div>
              <div class="detail-level-wrap">
                <div class="detail-level" :style="{ color: getRiskLevelColor(selectedRisk.level) }">
                  {{ getRiskLevelText(selectedRisk.level) }}
                </div>
                <div class="detail-prob">
                  风险概率 <span :style="{ color: getRiskLevelColor(selectedRisk.level) }">{{ selectedRisk.probability.toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <NDivider style="margin: 16px 0;" />

            <NGrid :cols="2" :x-gap="20">
              <NGi>
                <div class="section-title">
                  <NIcon :size="16" color="#E6A23C"><AlertTriangle /></NIcon>
                  主要风险因素
                </div>
                <div v-if="selectedRisk.factors.length === 0" class="no-factors">
                  <NIcon :size="20" color="#67C23A"><CheckCircle2 /></NIcon>
                  <span>暂无明显风险因素</span>
                </div>
                <div v-else class="factors-list">
                  <div
                    v-for="(factor, idx) in [...selectedRisk.factors].sort((a, b) => b.weight - a.weight)"
                    :key="idx"
                    class="factor-item"
                  >
                    <div class="factor-info">
                      <span class="factor-name">{{ factor.name }}</span>
                      <span class="factor-value">{{ factor.value }}</span>
                    </div>
                    <div class="factor-bar-wrap">
                      <div
                        class="factor-bar"
                        :style="{
                          width: `${Math.min(factor.weight * 2, 100)}%`,
                          background: factor.weight >= 20 ? '#F56C6C' : factor.weight >= 10 ? '#E6A23C' : '#67C23A',
                        }"
                      />
                    </div>
                    <div class="factor-desc">{{ factor.description }}</div>
                  </div>
                </div>
              </NGi>

              <NGi>
                <div class="section-title">
                  <NIcon :size="16" color="#4A90D9"><CheckCircle2 /></NIcon>
                  个性化改善建议
                </div>
                <div class="suggestions-list">
                  <div
                    v-for="(sug, idx) in selectedRisk.suggestions"
                    :key="idx"
                    class="suggestion-item"
                  >
                    <div class="suggestion-bullet">
                      <ChevronRight :size="14" />
                    </div>
                    <span class="suggestion-text">{{ sug }}</span>
                  </div>
                </div>

                <div class="model-info">
                  <NIcon :size="14" color="#8899aa"><Info /></NIcon>
                  <span>评估模型：{{ selectedRisk.model }}</span>
                </div>
              </NGi>
            </NGrid>
          </NCard>
        </template>
      </NTabPane>

      <NTabPane name="input" tab="基本信息与生活方式">
        <NCard :bordered="false">
          <NForm label-placement="left" label-width="120px" :show-label="true">
            <NGrid :cols="2" :x-gap="24">
              <NGi>
                <div class="form-section">
                  <div class="form-section-title">
                    <NIcon :size="16" color="#4A90D9"><User /></NIcon>
                    基本信息
                  </div>

                  <NFormItem label="年龄">
                    <NInputNumber
                      v-model:value="lifestyle.age"
                      :min="18"
                      :max="100"
                      placeholder="请输入年龄"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <NFormItem label="性别">
                    <NRadioGroup v-model:value="lifestyle.gender">
                      <NRadio value="male">男</NRadio>
                      <NRadio value="female">女</NRadio>
                    </NRadioGroup>
                  </NFormItem>

                  <div class="form-section-title" style="margin-top: 12px;">
                    <NIcon :size="16" color="#E74C3C"><Cigarette /></NIcon>
                    吸烟情况
                  </div>

                  <NFormItem label="是否吸烟">
                    <NSwitch v-model:value="lifestyle.smoking" />
                  </NFormItem>

                  <NFormItem v-if="lifestyle.smoking" label="吸烟年数">
                    <NInputNumber
                      v-model:value="lifestyle.smokingYears"
                      :min="0"
                      :max="60"
                      placeholder="年"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <NFormItem v-if="lifestyle.smoking" label="每日支数">
                    <NInputNumber
                      v-model:value="lifestyle.cigarettesPerDay"
                      :min="1"
                      :max="60"
                      placeholder="支/天"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <div class="form-section-title" style="margin-top: 12px;">
                    <NIcon :size="16" color="#8B5CF6"><Wine /></NIcon>
                    饮酒情况
                  </div>

                  <NFormItem label="饮酒频率">
                    <NSelect
                      v-model:value="lifestyle.alcohol"
                      :options="alcoholOptions"
                      style="width: 100%;"
                    />
                  </NFormItem>
                </div>
              </NGi>

              <NGi>
                <div class="form-section">
                  <div class="form-section-title">
                    <NIcon :size="16" color="#67C23A"><Dumbbell /></NIcon>
                    运动与饮食
                  </div>

                  <NFormItem label="运动频率">
                    <NSelect
                      v-model:value="lifestyle.exercise"
                      :options="exerciseOptions"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <NFormItem label="每周运动">
                    <NInputNumber
                      v-model:value="lifestyle.exerciseMinutesPerWeek"
                      :min="0"
                      :max="1400"
                      placeholder="分钟"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <NFormItem label="饮食习惯">
                    <NSelect
                      v-model:value="lifestyle.diet"
                      :options="dietOptions"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <div class="form-section-title" style="margin-top: 12px;">
                    <NIcon :size="16" color="#F59E0B"><Moon /></NIcon>
                    作息与压力
                  </div>

                  <NFormItem label="每日睡眠">
                    <NInputNumber
                      v-model:value="lifestyle.sleepHours"
                      :min="3"
                      :max="12"
                      placeholder="小时"
                      style="width: 100%;"
                    />
                  </NFormItem>

                  <NFormItem label="压力水平">
                    <NSelect
                      v-model:value="lifestyle.stress"
                      :options="stressOptions"
                      style="width: 100%;"
                    />
                  </NFormItem>
                </div>
              </NGi>
            </NGrid>

            <NDivider style="margin: 20px 0;" />

            <div class="form-section-title">
              <NIcon :size="16" color="#F56C6C"><Brain /></NIcon>
              家族病史
            </div>

            <NGrid :cols="5" :x-gap="16" :y-gap="12" style="margin-top: 12px;">
              <NGi>
                <div class="family-history-item">
                  <span>高血压</span>
                  <NSwitch v-model:value="lifestyle.familyHistory.hypertension" />
                </div>
              </NGi>
              <NGi>
                <div class="family-history-item">
                  <span>糖尿病</span>
                  <NSwitch v-model:value="lifestyle.familyHistory.diabetes" />
                </div>
              </NGi>
              <NGi>
                <div class="family-history-item">
                  <span>心血管疾病</span>
                  <NSwitch v-model:value="lifestyle.familyHistory.cardiovascular" />
                </div>
              </NGi>
              <NGi>
                <div class="family-history-item">
                  <span>高血脂</span>
                  <NSwitch v-model:value="lifestyle.familyHistory.hyperlipidemia" />
                </div>
              </NGi>
              <NGi>
                <div class="family-history-item">
                  <span>脂肪肝</span>
                  <NSwitch v-model:value="lifestyle.familyHistory.fattyLiver" />
                </div>
              </NGi>
            </NGrid>

            <NDivider style="margin: 20px 0;" />

            <NAlert
              v-if="availableIndicators.length > 0"
              type="info"
              :show-icon="true"
              style="margin-bottom: 20px;"
            >
              <template #header>已关联最新体检数据</template>
              将使用最近一次体检记录中的以下指标进行评估：
              <span v-for="(ind, i) in availableIndicators" :key="ind.id">
                {{ ind.name }}<template v-if="i < availableIndicators.length - 1">、</template>
              </span>
            </NAlert>
            <NAlert v-else type="warning" :show-icon="true" style="margin-bottom: 20px;">
              <template #header>暂无体检数据</template>
              建议先录入体检数据以获得更准确的风险评估结果。
            </NAlert>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <NButton @click="resetForm">
                重置
              </NButton>
              <NButton type="primary" @click="runAssessment" :loading="isAssessing" size="large">
                <template #icon><NIcon :size="16"><ShieldCheck /></NIcon></template>
                开始风险评估
              </NButton>
            </div>
          </NForm>
        </NCard>
      </NTabPane>

      <NTabPane name="visual" tab="风险可视化分析" v-if="hasAssessed">
        <NGrid :cols="2" :x-gap="16" :y-gap="16">
          <NGi>
            <NCard :bordered="false">
              <div class="card-section-title">雷达图分析</div>
              <div style="height: 360px;">
                <v-chart :option="radarOption" autoresize />
              </div>
            </NCard>
          </NGi>
          <NGi>
            <NCard :bordered="false">
              <div class="card-section-title">风险概率对比</div>
              <div style="height: 360px;">
                <v-chart :option="barOption" autoresize />
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.risk-page {
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

.risk-gauge-card {
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
  gap: 16px;
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
  font-size: 24px;
  font-weight: 700;
}

.card-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a6fb5;
  margin-bottom: 16px;
}

.risk-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  border-top: 3px solid;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.risk-card:hover {
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.15);
  transform: translateY(-2px);
}

.risk-card-selected {
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.25);
  background: #f5faff;
}

.risk-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.risk-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.risk-icon-wrapper.large {
  width: 48px;
  height: 48px;
  border-radius: 10px;
}

.risk-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.risk-card-prob {
  margin-bottom: 8px;
}

.risk-prob-value {
  font-size: 24px;
  font-weight: 700;
}

.risk-prob-unit {
  font-size: 14px;
  color: #999;
  margin-left: 2px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.detail-desc {
  font-size: 12px;
  color: #8899aa;
  margin: 4px 0 0;
}

.detail-level-wrap {
  text-align: right;
}

.detail-level {
  font-size: 22px;
  font-weight: 700;
}

.detail-prob {
  font-size: 13px;
  color: #8899aa;
  margin-top: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
}

.no-factors {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #f0f9eb;
  border-radius: 8px;
  color: #67C23A;
  font-size: 13px;
}

.factors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.factor-item {
  padding: 10px 12px;
  background: #f9fbfd;
  border-radius: 8px;
}

.factor-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.factor-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.factor-value {
  font-size: 13px;
  color: #4A90D9;
  font-weight: 500;
}

.factor-bar-wrap {
  height: 4px;
  background: #e8eef4;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.factor-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.factor-desc {
  font-size: 12px;
  color: #8899aa;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f7ff;
  border-radius: 8px;
}

.suggestion-bullet {
  color: #4A90D9;
  display: flex;
  align-items: center;
  margin-top: 2px;
  flex-shrink: 0;
}

.suggestion-text {
  font-size: 13px;
  color: #333;
  line-height: 1.6;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
  font-size: 12px;
  color: #8899aa;
}

.form-section {
  padding: 4px 0;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1a6fb5;
  margin: 0 0 16px;
}

.family-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f9fbfd;
  border-radius: 8px;
  font-size: 13px;
  color: #333;
}
</style>
