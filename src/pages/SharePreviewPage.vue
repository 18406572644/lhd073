<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  NCard,
  NInput,
  NButton,
  NIcon,
  NModal,
  NAvatar,
  NList,
  NListItem,
  NEmpty,
  NAlert,
  NSpace,
  NTag,
} from 'naive-ui'
import {
  Lock,
  Eye,
  Download,
  MessageSquare,
  Send,
  AlertTriangle,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-vue-next'
import { getSharePreview, verifyShareAccess, addShareComment, fetchShareComments } from '@/api/mock'
import type { ShareRecord, ShareComment } from '@/types'

const route = useRoute()
const message = useMessage()

const shareId = computed(() => route.params.shareId as string)

const isLoading = ref(false)
const isAuthenticated = ref(false)
const shareInfo = ref<ShareRecord | null>(null)
const accessError = ref<string | null>(null)
const password = ref('')
const pdfDataUrl = ref('')
const showPasswordModal = ref(true)

const showCommentPanel = ref(false)
const comments = ref<ShareComment[]>([])
const newComment = ref('')
const commentAuthor = ref('')
const isSubmittingComment = ref(false)
const showScreenshotWarning = ref(false)

const currentPage = ref(1)
const totalPages = ref(1)

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const isExpired = computed(() => {
  if (!shareInfo.value?.expiresAt) return false
  return new Date(shareInfo.value.expiresAt) < new Date()
})

const expireStatusText = computed(() => {
  if (!shareInfo.value) return ''
  if (shareInfo.value.isRevoked) return '已撤销'
  if (isExpired.value) return '已过期'
  if (!shareInfo.value.expiresAt) return '永久有效'
  return `有效期至 ${formatDate(shareInfo.value.expiresAt)}`
})

async function checkShareStatus() {
  isLoading.value = true
  accessError.value = null
  
  try {
    const result = await getSharePreview(shareId.value)
    if (!result.success) {
      accessError.value = result.error || '无法访问该分享'
      return
    }
    shareInfo.value = result.share || null
  } catch (e) {
    accessError.value = '网络错误，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

async function submitPassword() {
  if (!password.value.trim()) {
    message.warning('请输入访问密码')
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await verifyShareAccess(shareId.value, password.value)
    if (!result.success) {
      message.error(result.error || '密码错误')
      return
    }
    
    isAuthenticated.value = true
    showPasswordModal.value = false
    shareInfo.value = result.share || null
    pdfDataUrl.value = result.share?.pdfDataUrl || ''
    password.value = ''
    
    message.success('验证成功')
    loadComments()
    
    nextTick(() => {
      renderPdf()
    })
  } catch (e) {
    message.error('验证失败，请重试')
  } finally {
    isLoading.value = false
  }
}

function renderPdf() {
  const container = document.getElementById('pdf-container')
  if (!container || !pdfDataUrl.value) return
  
  container.innerHTML = ''
  
  const iframe = document.createElement('iframe')
  iframe.src = pdfDataUrl.value
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = 'none'
  iframe.style.pointerEvents = 'none'
  iframe.setAttribute('sandbox', '')
  
  container.appendChild(iframe)
}

async function loadComments() {
  try {
    const result = await fetchShareComments(shareId.value)
    if (result.code === 0) {
      comments.value = result.data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
  } catch (e) {
    console.error('加载评论失败:', e)
  }
}

async function submitComment() {
  if (!newComment.value.trim()) {
    message.warning('请输入评论内容')
    return
  }
  
  isSubmittingComment.value = true
  
  try {
    const result = await addShareComment(
      shareId.value,
      commentAuthor.value.trim() || '匿名用户',
      newComment.value.trim(),
      currentPage.value
    )
    
    if (result.code === 0) {
      message.success('评论发表成功')
      newComment.value = ''
      loadComments()
    } else {
      message.error('评论发表失败')
    }
  } catch (e) {
    message.error('评论发表失败')
  } finally {
    isSubmittingComment.value = false
  }
}

function preventActions(e: KeyboardEvent) {
  if (
    (e.ctrlKey || e.metaKey) && 
    (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')
  ) {
    e.preventDefault()
    showScreenshotWarning.value = true
    setTimeout(() => { showScreenshotWarning.value = false }, 3000)
  }
  
  if (e.key === 'PrintScreen') {
    e.preventDefault()
    showScreenshotWarning.value = true
    setTimeout(() => { showScreenshotWarning.value = false }, 3000)
  }
}

function preventContextMenu(e: MouseEvent) {
  e.preventDefault()
  showScreenshotWarning.value = true
  setTimeout(() => { showScreenshotWarning.value = false }, 3000)
}

function detectScreenshot() {
  document.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') {
      showScreenshotWarning.value = true
      setTimeout(() => { showScreenshotWarning.value = false }, 3000)
    }
  })
}

onMounted(() => {
  checkShareStatus()
  document.addEventListener('keydown', preventActions)
  document.addEventListener('contextmenu', preventContextMenu)
  detectScreenshot()
  
  if (navigator.userAgent.match(/(iPhone|iPad|Android)/i)) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isAuthenticated.value) {
        showScreenshotWarning.value = true
        setTimeout(() => { showScreenshotWarning.value = false }, 2000)
      }
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', preventActions)
  document.removeEventListener('contextmenu', preventContextMenu)
})
</script>

<template>
  <div class="share-preview-page" selectable="none" onselectstart="return false;" oncontextmenu="return false;">
    <div class="watermark" aria-hidden="true">
      <div v-for="i in 30" :key="i" class="watermark-item">
        机密文件 · 禁止截图 · {{ shareInfo?.reportTitle || '健康报告' }}
      </div>
    </div>
    
    <NAlert
      v-if="showScreenshotWarning"
      type="warning"
      show-icon
      class="screenshot-warning"
    >
      <template #icon>
        <NIcon><ShieldAlert /></NIcon>
      </template>
      <strong>安全提示：</strong>本报告为机密文件，禁止截图、下载或转发！
    </NAlert>
    
    <header class="preview-header">
      <div class="header-content">
        <div class="header-left">
          <NIcon :size="24" color="#4A90D9"><FileText /></NIcon>
          <span class="header-title">{{ shareInfo?.reportTitle || '健康报告预览' }}</span>
        </div>
        <div class="header-right">
          <NTag :type="shareInfo?.isRevoked ? 'error' : isExpired ? 'warning' : 'success'" size="small">
            <template #icon>
              <NIcon :size="14"><Clock /></NIcon>
            </template>
            {{ expireStatusText }}
          </NTag>
          <NTag v-if="shareInfo?.allowComments" type="info" size="small">
            <template #icon>
              <NIcon :size="14"><MessageSquare /></NIcon>
            </template>
            可评论
          </NTag>
        </div>
      </div>
    </header>
    
    <main class="preview-main">
      <NEmpty v-if="isLoading" description="加载中..." />
      
      <NCard v-else-if="accessError" class="error-card">
        <template #header>
          <div class="error-header">
            <NIcon :size="24" color="#D03050"><AlertTriangle /></NIcon>
            <span>无法访问</span>
          </div>
        </template>
        <p class="error-message">{{ accessError }}</p>
        <p class="error-hint">请联系分享者获取有效链接</p>
      </NCard>
      
      <template v-else>
        <div v-if="!isAuthenticated" class="auth-section">
          <NCard class="auth-card">
            <template #header>
              <div class="auth-header">
                <NIcon :size="28" color="#4A90D9"><Lock /></NIcon>
                <span>请输入访问密码</span>
              </div>
            </template>
            
            <div class="auth-info">
              <div class="auth-info-item">
                <NIcon :size="16" color="#888"><Eye /></NIcon>
                <span>该报告已被访问 {{ shareInfo?.viewCount || 0 }} 次</span>
              </div>
              <div class="auth-info-item">
                <NIcon :size="16" color="#888"><MessageSquare /></NIcon>
                <span>{{ shareInfo?.comments.length || 0 }} 条评论</span>
              </div>
            </div>
            
            <NInput
              v-model:value="password"
              type="password"
              placeholder="请输入访问密码"
              show-password-on="click"
              size="large"
              @keyup.enter="submitPassword"
              style="margin-bottom: 16px;"
            />
            
            <NButton
              type="primary"
              size="large"
              block
              :loading="isLoading"
              @click="submitPassword"
            >
              确认查看
            </NButton>
            
            <NAlert type="info" show-icon style="margin-top: 16px;">
              <template #icon>
                <NIcon><ShieldAlert /></NIcon>
              </template>
              <strong>安全提示：</strong>本报告包含敏感健康信息，仅供您个人查看，禁止截图、下载或转发给他人。
            </NAlert>
          </NCard>
        </div>
        
        <div v-else class="pdf-viewer">
          <div class="pdf-toolbar">
            <div class="toolbar-left">
              <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            </div>
            <div class="toolbar-right">
              <NButton
                size="small"
                :type="showCommentPanel ? 'primary' : 'default'"
                @click="showCommentPanel = !showCommentPanel"
              >
                <template #icon>
                  <NIcon><MessageSquare /></NIcon>
                </template>
                评论 ({{ comments.length }})
              </NButton>
              <NButton size="small" disabled>
                <template #icon>
                  <NIcon><Download /></NIcon>
                </template>
                禁止下载
              </NButton>
            </div>
          </div>
          
          <div class="pdf-content">
            <div class="pdf-warning-bar">
              <NIcon :size="16" color="#D03050"><ShieldAlert /></NIcon>
              <span>本报告为机密文件，禁止截图、复制和下载。违规行为将被记录。</span>
            </div>
            
            <div id="pdf-container" class="pdf-container">
              <div v-if="!pdfDataUrl" class="pdf-loading">
                <NEmpty description="PDF 加载中..." />
              </div>
            </div>
            
            <div class="pdf-footer-warning">
              <NAlert type="warning" show-icon>
                <template #icon>
                  <NIcon><AlertTriangle /></NIcon>
                </template>
                <strong>版权声明：</strong>本报告内容受法律保护，未经授权禁止以任何形式复制、传播或用于商业用途。
              </NAlert>
            </div>
          </div>
          
          <div v-if="showCommentPanel && shareInfo?.allowComments" class="comment-panel">
            <div class="comment-header">
              <h3><NIcon><MessageSquare /></NIcon> 评论区</h3>
              <span class="comment-count">{{ comments.length }} 条评论</span>
            </div>
            
            <div class="comment-input-section">
              <NInput
                v-model:value="commentAuthor"
                placeholder="您的昵称（选填）"
                size="small"
                maxlength="20"
                style="margin-bottom: 8px;"
              />
              <NSpace>
                <NInput
                  v-model:value="newComment"
                  type="textarea"
                  placeholder="发表您的评论..."
                  :rows="3"
                  maxlength="500"
                  show-count
                />
              </NSpace>
              <div style="text-align: right; margin-top: 8px;">
                <NButton
                  type="primary"
                  size="small"
                  :loading="isSubmittingComment"
                  @click="submitComment"
                >
                  <template #icon>
                    <NIcon><Send /></NIcon>
                  </template>
                  发表评论
                </NButton>
              </div>
            </div>
            
            <div class="comment-list">
              <NEmpty v-if="comments.length === 0" description="暂无评论，快来发表第一条评论吧" />
              <NList v-else bordered>
                <NListItem v-for="comment in comments" :key="comment.id" class="comment-item">
                  <template #prefix>
                    <NAvatar size="small" round>
                      {{ comment.authorName.charAt(0) }}
                    </NAvatar>
                  </template>
                  <div class="comment-content">
                    <div class="comment-meta">
                      <span class="comment-author">{{ comment.authorName }}</span>
                      <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
                      <NTag v-if="comment.pageNumber" size="small" type="info">
                        第 {{ comment.pageNumber }} 页
                      </NTag>
                    </div>
                    <p class="comment-text">{{ comment.content }}</p>
                  </div>
                </NListItem>
              </NList>
            </div>
          </div>
        </div>
      </template>
    </main>
    
    <footer class="preview-footer">
      <p>本报告由健康档案管理系统生成 · 机密文件 请勿外传</p>
    </footer>
    
    <NModal
      v-model:show="showPasswordModal"
      preset="dialog"
      title="需要访问密码"
      :mask-closable="false"
      :close-on-esc="false"
      :show-icon="false"
      positive-text="确认"
      negative-text=""
      @positive-click="submitPassword"
    >
      <p>请输入访问密码以查看报告内容</p>
    </NModal>
  </div>
</template>

<style scoped>
.share-preview-page {
  min-height: 100vh;
  background: #f5f7fa;
  position: relative;
  overflow-x: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.watermark {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-start;
  gap: 80px;
  padding: 60px;
  opacity: 0.06;
  transform: rotate(-25deg);
}

.watermark-item {
  font-size: 18px;
  color: #4A90D9;
  font-weight: 600;
  white-space: nowrap;
}

.screenshot-warning {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  max-width: 500px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.preview-header {
  background: #fff;
  border-bottom: 1px solid #e8f4fd;
  padding: 12px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.08);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a6fb5;
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preview-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.error-card {
  max-width: 500px;
  margin: 60px auto;
  text-align: center;
}

.error-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #D03050;
}

.error-message {
  font-size: 16px;
  color: #333;
  margin: 16px 0;
}

.error-hint {
  font-size: 14px;
  color: #888;
}

.auth-section {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.auth-card {
  width: 100%;
  max-width: 450px;
}

.auth-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1a6fb5;
}

.auth-info {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 8px;
}

.auth-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.pdf-viewer {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.pdf-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8f4fd;
}

.toolbar-left .page-info {
  font-size: 14px;
  color: #666;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.pdf-content {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.pdf-warning-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fef0f0;
  border-bottom: 1px solid #fde2e2;
  font-size: 13px;
  color: #D03050;
}

.pdf-container {
  width: 100%;
  height: calc(100vh - 320px);
  min-height: 500px;
  background: #525659;
  position: relative;
  overflow: hidden;
}

.pdf-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.02);
  z-index: 10;
  pointer-events: none;
}

.pdf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
}

.pdf-footer-warning {
  padding: 16px;
  background: #fdf6ec;
}

.comment-panel {
  width: 360px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8f4fd;
}

.comment-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a6fb5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-count {
  font-size: 13px;
  color: #888;
}

.comment-input-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.comment-item {
  padding: 12px 8px !important;
  border-bottom: 1px solid #f5f5f5;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-text {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 4px 0 0 0;
  word-break: break-word;
}

.preview-footer {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 12px;
}

@media (max-width: 768px) {
  .preview-main {
    padding: 12px;
  }
  
  .pdf-viewer {
    flex-direction: column;
  }
  
  .comment-panel {
    width: 100%;
    max-height: 400px;
  }
  
  .pdf-container {
    height: 60vh;
    min-height: 400px;
  }
  
  .header-title {
    font-size: 14px;
  }
}
</style>
