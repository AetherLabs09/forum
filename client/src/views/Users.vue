<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button type="primary" @click="handleAdd">新增用户</el-button>
        </div>
      </template>
      <el-form :inline="true" @submit.prevent="loadData">
        <el-form-item>
          <el-input v-model="searchForm.keyword" placeholder="搜索用户名/昵称" clearable />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.role" placeholder="用户角色" clearable>
            <el-option label="管理员" value="admin" />
            <el-option label="版主" value="moderator" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.status" placeholder="账号状态" clearable>
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="danger">管理员</el-tag>
            <el-tag v-else-if="row.role === 'moderator'" type="warning">版主</el-tag>
            <el-tag v-else type="info">普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="160" />
        <el-table-column prop="last_login" label="最后登录" width="160" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.role !== 'admin'" :type="row.status === 'active' ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '解禁' }}
            </el-button>
            <el-button type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button v-if="row.role !== 'admin'" type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!form.id">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role">
            <el-option label="管理员" value="admin" />
            <el-option label="版主" value="moderator" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const searchForm = reactive({
  keyword: '',
  role: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const tableData = ref([])
const selectedRows = ref([])

const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref(null)
const form = reactive({
  id: '',
  username: '',
  nickname: '',
  email: '',
  password: '',
  role: 'user'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

async function loadData() {
  try {
    const res = await request.get('/users/list', {
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
  searchForm.role = ''
  searchForm.status = ''
  pagination.page = 1
  loadData()
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function handleAdd() {
  form.id = ''
  form.username = ''
  form.nickname = ''
  form.email = ''
  form.password = ''
  form.role = 'user'
  dialogTitle.value = '新增用户'
  dialogVisible.value = true
}

function handleEdit(row) {
  Object.assign(form, {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    password: '',
    role: row.role
  })
  dialogTitle.value = '编辑用户'
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.id) {
      await request.put(`/users/${form.id}`, form)
    } else {
      await request.post('/users', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

async function toggleStatus(row) {
  const action = row.status === 'active' ? '禁用' : '解禁'
  await ElMessageBox.confirm(`确定要${action}该用户吗？`, '提示', { type: 'warning' })
  await request.put(`/users/${row.id}/status`, { status: row.status === 'active' ? 'disabled' : 'active' })
  ElMessage.success('操作成功')
  loadData()
}

async function resetPassword(row) {
  await ElMessageBox.confirm('确定要重置该用户密码吗？', '提示', { type: 'warning' })
  await request.put(`/users/${row.id}/reset-password`, { password: '123456' })
  ElMessage.success('密码已重置为: 123456')
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定要删除该用户吗？', '提示', { type: 'warning' })
  await request.delete(`/users/${row.id}`)
  ElMessage.success('删除成功')
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
