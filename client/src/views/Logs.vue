<template>
  <div class="logs-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
          <el-button type="danger" @click="handleClean">清理日志</el-button>
        </div>
      </template>
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item>
          <el-input v-model="searchForm.keyword" placeholder="搜索操作人/详情" clearable />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.action" placeholder="操作类型" clearable>
            <el-option label="登录系统" value="登录系统" />
            <el-option label="退出系统" value="退出系统" />
            <el-option label="创建用户" value="创建用户" />
            <el-option label="删除用户" value="删除用户" />
            <el-option label="发布帖子" value="发布帖子" />
            <el-option label="删除帖子" value="删除帖子" />
            <el-option label="隐藏帖子" value="隐藏帖子" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column prop="action" label="操作类型" width="120" />
        <el-table-column prop="target_type" label="操作对象" width="100" />
        <el-table-column prop="details" label="操作详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip_address" label="IP地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="160" />
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
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
  action: '',
  startDate: '',
  endDate: ''
})

const dateRange = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const tableData = ref([])

function handleDateChange(val) {
  if (val && val.length === 2) {
    searchForm.startDate = val[0]
    searchForm.endDate = val[1]
  } else {
    searchForm.startDate = ''
    searchForm.endDate = ''
  }
}

async function loadData() {
  try {
    const res = await request.get('/logs', {
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
  searchForm.action = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  dateRange.value = []
  pagination.page = 1
  loadData()
}

async function handleClean() {
  await ElMessageBox.prompt('请输入要保留的天数', '清理日志', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: '30'
  })
  const days = arguments[0] || 30
  await request.delete('/logs/clean', { data: { days } })
  ElMessage.success('清理成功')
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
