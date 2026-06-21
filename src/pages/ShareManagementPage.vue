<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import {
  NCard,
  NDataTable,
  NButton,
  NIcon,
  NTag,
  NEmpty,
  NPopconfirm,
  NSpace,
  NGrid,
  NGi,
  type DataTableColumns,
} from 'naive-ui'
import {
  Share2,
  Trash2,
  Ban,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-vue-next'
import { fetchShareList, revokeShare, deleteShare } from '@/api/mock'
import type { ShareRecordMeta } from '@/types'

const message = useMessage()
const dialog = useDialog()

const isLoading = ref(false)
const shareList = ref<ShareRecordMeta[]>([])

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadShareList() {
  isLoading.value = true
  try {
    const result = await fetchShareList()
    if (result.code === 0) {
      shareList.value = result.data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  } catch (e) {
    message.error('加载分享列表失败')
  } finally {
    isLoading.value = false
  }
}

async function handleRevoke(share: ShareRecordMeta) {
  try {
    const result = await revokeShare(share.id)
    if (result.code === 0) {
      message.success('分享已撤销')
      loadShareList()
    } else {
      message.error('撤销失败')
    }
  } catch (e) {
    message.error('撤销失败')
  }
}

async function handleDelete(share: ShareRecordMeta) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除这条分享记录吗？删除后无法恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await deleteShare(share.id)
        if (result.code === 0) {
          message.success('删除成功')
          loadShareList()
        } else {
          message.error('删除失败')
        }
      } catch (e) {
        message.error('删除失败')
      }
    },
  })
}

function copyShareLink(share: ShareRecordMeta) {
  const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${share.id}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    message.success('分享链接已复制到剪贴板')
  }).catch(() => {
    const input = document.createElement('input')
    input.value = shareUrl
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    message.success('分享链接已复制到剪贴板')
  })
}

function openShareLink(share: ShareRecordMeta) {
  const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${share.id}`
  window.open(shareUrl, '_blank')
}

function getStatusInfo(share: ShareRecordMeta) {
  if (share.isRevoked) {
    return { type: 'default' as const, text: '已撤销' }
  }
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return { type: 'warning' as const, text: '已过期' }
  }
  return { type: 'success' as const, text: '有效' }
}

const columns = computed<DataTableColumns<ShareRecordMeta>>(() => [
  {
    title: '报告标题',
    key: 'reportTitle',
    minWidth: 200,
    render: (row) => h('div', { style: { fontWeight: '500', color: '#333' } }, row.reportTitle),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const status = getStatusInfo(row)
      return h(NTag, { type: status.type, size: 'small' }, () => status.text)
    },
  },
  {
    title: '访问密码',
    key: 'accessPassword',
    width: 100,
    render: (row) => h('span', { style: { fontFamily: 'monospace', color: '#666' } }, row.accessPassword),
  },
  {
    title: '有效期',
    key: 'expiresAt',
    width: 180,
    render: (row) => {
      if (row.isRevoked) {
        return h('span', { style: { color: '#999' } }, '-')
      }
      if (!row.expiresAt) {
        return h(NTag, { size: 'small', type: 'info' }, () => '永久有效')
      }
      const isExpired = new Date(row.expiresAt) < new Date()
      return h('span', { style: { color: isExpired ? '#E67E22' : '#666', fontSize: '13px' } }, formatDate(row.expiresAt))
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 160,
    render: (row) => h('span', { style: { color: '#888', fontSize: '13px' } }, formatDate(row.createdAt)),
  },
  {
    title: '访问次数',
    key: 'viewCount',
    width: 100,
    render: (row) => h('span', { style: { color: '#666' } }, `${row.viewCount} 次`),
  },
  {
    title: '评论数',
    key: 'commentCount',
    width: 100,
    render: (row) => h('span', { style: { color: '#666' } }, `${row.commentCount} 条`),
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right' as const,
    render: (row) => {
      const isActive = !row.isRevoked && (!row.expiresAt || new Date(row.expiresAt) >= new Date())

      return h(NSpace, { size: 'small' }, () => [
        h(NButton, {
          size: 'small',
          onClick: () => copyShareLink(row),
        }, () => [
          h(NIcon, { size: 16 }, () => h(Copy)),
          h('span', { style: { marginLeft: '4px' } }, '复制链接'),
        ]),
        h(NButton, {
          size: 'small',
          onClick: () => openShareLink(row),
        }, () => [
          h(NIcon, { size: 16 }, () => h(ExternalLink)),
          h('span', { style: { marginLeft: '4px' } }, '预览'),
        ]),
        isActive
          ? h(NButton, {
            size: 'small',
            type: 'warning',
            onClick: () => handleRevoke(row),
          }, () => [
            h(NIcon, { size: 16 }, () => h(Ban)),
            h('span', { style: { marginLeft: '4px' } }, '撤销'),
          ])
          : null,
        h(NPopconfirm, {
          trigger: 'click' as const,
          content: '确定要删除这条分享记录吗？',
          positiveText: '确定',
          negativeText: '取消',
          onPositiveClick: () => handleDelete(row),
        }, () => [
          h(NButton, {
            size: 'small',
            type: 'error',
          }, () => [
            h(NIcon, { size: 16 }, () => h(Trash2)),
            h('span', { style: { marginLeft: '4px' } }, '删除'),
          ]),
        ]),
      ])
    },
  },
])

const statistics = computed(() => {
  const total = shareList.value.length
  const active = shareList.value.filter(s =>
    !s.isRevoked && (!s.expiresAt || new Date(s.expiresAt) >= new Date())
  ).length
  const revoked = shareList.value.filter(s => s.isRevoked).length
  const expired = shareList.value.filter(s =>
    !s.isRevoked && s.expiresAt && new Date(s.expiresAt) < new Date()
  ).length
  const totalViews = shareList.value.reduce((sum, s) => sum + s.viewCount, 0)
  const totalComments = shareList.value.reduce((sum, s) => sum + s.commentCount, 0)

  return { total, active, revoked, expired, totalViews, totalComments }
})

onMounted(() => {
  loadShareList()
})
</script>

<template>
  <div style="padding: 24px; background: #f0f7ff; min-height: 100%;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 600; color: #1a6fb5; margin: 0; display: flex; align-items: center; gap: 10px;">
          <NIcon :size="28" color="#4A90D9"><Share2 /></NIcon>
          分享管理
        </h1>
        <p style="margin: 8px 0 0; color: #888; font-size: 14px;">管理所有分享链接，可随时撤销或删除分享记录</p>
      </div>
      <NSpace>
        <NButton type="primary" :loading="isLoading" @click="loadShareList">
          <template #icon>
            <NIcon><RefreshCw /></NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <NCard :bordered="false" style="margin-bottom: 20px;">
      <NGrid :cols="6" :x-gap="16" :y-gap="12">
        <NGi>
          <div style="background: #fafcff; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">总分享数</div>
            <div style="font-size: 28px; font-weight: 700; color: #4A90D9;">{{ statistics.total }}</div>
          </div>
        </NGi>
        <NGi>
          <div style="background: #f0f9eb; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">有效分享</div>
            <div style="font-size: 28px; font-weight: 700; color: #67C23A;">{{ statistics.active }}</div>
          </div>
        </NGi>
        <NGi>
          <div style="background: #fef0f0; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">已撤销</div>
            <div style="font-size: 28px; font-weight: 700; color: #999;">{{ statistics.revoked }}</div>
          </div>
        </NGi>
        <NGi>
          <div style="background: #fdf6ec; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">已过期</div>
            <div style="font-size: 28px; font-weight: 700; color: #E67E22;">{{ statistics.expired }}</div>
          </div>
        </NGi>
        <NGi>
          <div style="background: #ecf5ff; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">总访问次数</div>
            <div style="font-size: 28px; font-weight: 700; color: #4A90D9;">{{ statistics.totalViews }}</div>
          </div>
        </NGi>
        <NGi>
          <div style="background: #fff7e6; padding: 16px; border-radius: 8px;">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px;">总评论数</div>
            <div style="font-size: 28px; font-weight: 700; color: #E67E22;">{{ statistics.totalComments }}</div>
          </div>
        </NGi>
      </NGrid>
    </NCard>

    <NCard :bordered="false">
      <NEmpty v-if="!isLoading && shareList.length === 0" description="暂无分享记录" style="padding: 80px 0;" />

      <NDataTable
        v-else
        :columns="columns"
        :data="shareList"
        :bordered="false"
        :loading="isLoading"
        size="small"
        :max-height="600"
      />
    </NCard>
  </div>
</template>
