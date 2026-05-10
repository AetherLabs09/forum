<template>
  <div class="comments-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>评论管理</span>
        </div>
      </template>
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item>
          <el-input v-model="searchForm.keyword" placeholder="搜索评论内容" clearable />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.status" placeholder="评论状态" clearable>
            <el-option label="正常" value="published" />
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
        <el-table-column prop="content" label="评论内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="author_name" label="评论者" width="100" />
        <el-table-column prop="post_title" label="所属帖子" min-width="150" show-overflow-tooltip />
        <el-table-column prop="like_count" label="点赞数" width="80" />
        <el-table-column prop="is_hidden" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_hidden ? 'danger' : 'success'" size="small">
              {{ row.is_hidden ? '已隐藏' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button :type="row.is_hidden ? 'success' : 'warning'" size="small" @click="toggleHide(row)">
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

async function loadData() {
  try {
    const res = await request.get('/comments/list', {
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

async function toggleHide(row) {
  await request.put(`/comments/${row.id}/hide`)
  ElMessage.success(row.is_hidden ? '已显示' : '已隐藏')
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定要删除该评论吗？', '提示', { type: 'warning' })
  await request.delete(`/comments/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

async function batchDelete() {
  await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条评论吗？`, '提示', { type: 'warning' })
  const ids = selectedRows.value.map(r => r.id)
  await request.post('/comments/batch-delete', { ids })
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
</style>
