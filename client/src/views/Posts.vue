<template>
  <div class="posts-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>帖子管理</span>
        </div>
      </template>
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item>
          <el-input v-model="searchForm.keyword" placeholder="搜索标题/内容" clearable />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.status" placeholder="帖子状态" clearable>
            <el-option label="已发布" value="published" />
            <el-option label="草稿" value="draft" />
            <el-option label="已隐藏" value="hidden" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="author_name" label="作者" width="100" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="view_count" label="浏览" width="70" />
        <el-table-column prop="like_count" label="点赞" width="70" />
        <el-table-column prop="is_top" label="置顶" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.is_top" type="danger" size="small">置顶</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_essence" label="加精" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.is_essence" type="warning" size="small">精</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_hidden" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_hidden ? 'danger' : 'success'" size="small">
              {{ row.is_hidden ? '已隐藏' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="160" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            <el-button :type="row.is_top ? 'info' : 'warning'" size="small" @click="toggleTop(row)">
              {{ row.is_top ? '取消置顶' : '置顶' }}
            </el-button>
            <el-button :type="row.is_essence ? 'info' : 'success'" size="small" @click="toggleEssence(row)">
              {{ row.is_essence ? '取消加精' : '加精' }}
            </el-button>
            <el-button :type="row.is_hidden ? 'success' : 'danger'" size="small" @click="toggleHide(row)">
              {{ row.is_hidden ? '显示' : '隐藏' }}
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px">
        <el-button type="danger" :disabled="selectedRows.length === 0" @click="batchDelete">批量删除</el-button>
      </div>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="帖子详情" width="800px">
      <div v-if="currentPost" class="post-detail">
        <h2>{{ currentPost.title }}</h2>
        <div class="post-meta">
          <span>作者: {{ currentPost.author_name || currentPost.author_nickname }}</span>
          <span>分类: {{ currentPost.category_name || '未分类' }}</span>
          <span>时间: {{ currentPost.created_at }}</span>
        </div>
        <div class="post-content">{{ currentPost.content }}</div>
        <div class="post-comments">
          <h4>评论 ({{ currentPost.comments?.length || 0 }})</h4>
          <div v-for="comment in currentPost.comments" :key="comment.id" class="comment-item">
            <span class="comment-author">{{ comment.author_name || comment.author_nickname }}:</span>
            <span class="comment-content">{{ comment.content }}</span>
            <span class="comment-time">{{ comment.created_at }}</span>
          </div>
          <el-empty v-if="!currentPost.comments?.length" description="暂无评论" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const searchForm = reactive({
  keyword: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const tableData = ref([])
const selectedRows = ref([])
const detailVisible = ref(false)
const currentPost = ref(null)

async function loadData() {
  try {
    const res = await request.get('/posts/list', {
      params: {
        ...searchForm,
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    })
    tableData.value = res.data.list
    pagination.total = res.data.total
  } catch (error) {
    console.error(error)
  }
}

function resetForm() {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  loadData()
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

async function viewDetail(row) {
  try {
    const res = await request.get(`/posts/${row.id}`)
    currentPost.value = res.data
    detailVisible.value = true
  } catch (error) {
    console.error(error)
  }
}

async function toggleTop(row) {
  await request.put(`/posts/${row.id}/top`)
  ElMessage.success(row.is_top ? '已取消置顶' : '已置顶')
  loadData()
}

async function toggleEssence(row) {
  await request.put(`/posts/${row.id}/essence`)
  ElMessage.success(row.is_essence ? '已取消加精' : '已加精')
  loadData()
}

async function toggleHide(row) {
  await request.put(`/posts/${row.id}/hide`)
  ElMessage.success(row.is_hidden ? '已显示' : '已隐藏')
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定要删除该帖子吗？', '提示', { type: 'warning' })
  await request.delete(`/posts/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

async function batchDelete() {
  await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 篇帖子吗？`, '提示', { type: 'warning' })
  const ids = selectedRows.value.map(r => r.id)
  await request.post('/posts/batch-delete', { ids })
  ElMessage.success('批量删除成功')
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.post-detail h2 {
  margin-bottom: 15px;
}

.post-meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.post-content {
  line-height: 1.8;
  color: #333;
  margin-bottom: 30px;
}

.post-comments h4 {
  margin-bottom: 15px;
}

.comment-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
}

.comment-author {
  color: #409eff;
  font-weight: bold;
}

.comment-content {
  flex: 1;
  color: #333;
}

.comment-time {
  color: #999;
  font-size: 12px;
}
</style>
