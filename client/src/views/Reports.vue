<template>
  <div class="reports-page">
    <el-card>
      <template #header>
        <span>举报管理</span>
      </template>
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item>
          <el-select v-model="searchForm.targetType" placeholder="举报类型" clearable>
            <el-option label="帖子" value="post" />
            <el-option label="评论" value="comment" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.status" placeholder="处理状态" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="handled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="100" show-overflow-tooltip />
        <el-table-column prop="target_type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.target_type === 'post' ? '帖子' : '评论' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_title" label="被举报内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="reporter_name" label="举报人" width="100" />
        <el-table-column prop="reason" label="举报原因" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
              {{ row.status === 'pending' ? '待处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="举报时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="primary" size="small" @click="handleReport(row)">处理</el-button>
            <el-tag v-else type="info" size="small">已处理</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" title="处理举报" width="500px">
      <el-form label-width="100px">
        <el-form-item label="举报类型">
          <el-tag>{{ currentReport.target_type === 'post' ? '帖子' : '评论' }}</el-tag>
        </el-form-item>
        <el-form-item label="举报原因">
          {{ currentReport.reason }}
        </el-form-item>
        <el-form-item label="处理结果">
          <el-input v-model="handleResult" type="textarea" :rows="3" placeholder="请输入处理结果" />
        </el-form-item>
        <el-form-item label="处理动作">
          <el-checkbox v-if="currentReport.target_type === 'post'" v-model="hidePost">隐藏该帖子</el-checkbox>
          <el-checkbox v-if="currentReport.target_type === 'comment'" v-model="hideComment">隐藏该评论</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const searchForm = reactive({
  targetType: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const tableData = ref([])
const dialogVisible = ref(false)
const currentReport = ref({})
const handleResult = ref('')
const hidePost = ref(false)
const hideComment = ref(false)

async function loadData() {
  try {
    const res = await request.get('/reports/list', {
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
  searchForm.targetType = ''
  searchForm.status = ''
  pagination.page = 1
  loadData()
}

function handleReport(row) {
  currentReport.value = row
  handleResult.value = ''
  hidePost.value = false
  hideComment.value = false
  dialogVisible.value = true
}

async function submitHandle() {
  if (!handleResult.value) {
    ElMessage.warning('请输入处理结果')
    return
  }
  let action = ''
  if (hidePost.value) action = 'hide_post'
  if (hideComment.value) action = 'hide_comment'
  try {
    await request.put(`/reports/${currentReport.value.id}/handle`, {
      result: handleResult.value,
      action
    })
    ElMessage.success('处理成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadData()
})
</script>
