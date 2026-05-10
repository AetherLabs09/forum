<template>
  <div class="categories-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>分类管理</span>
          <el-button type="primary" @click="handleAdd">新增分类</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="分类名称" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column prop="postCount" label="帖子数" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" size="small" @click="handleManagers(row)">设置管理员</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入分类描述" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="disabled">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="managerDialogVisible" title="设置分类管理员" width="500px">
      <el-transfer
        v-model="selectedManagers"
        :data="allUsers"
        :props="{ key: 'id', label: 'nickname' }"
        filterable
        filter-placeholder="搜索用户"
        titles="可选用户"
        placeholder="请选择管理员"
      />
      <template #footer>
        <el-button @click="managerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitManagers">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const tableData = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增分类')
const formRef = ref(null)
const currentCategoryId = ref(null)

const form = reactive({
  name: '',
  description: '',
  sortOrder: 0,
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const managerDialogVisible = ref(false)
const allUsers = ref([])
const selectedManagers = ref([])

async function loadData() {
  try {
    const res = await request.get('/categories/list')
    tableData.value = res.data
  } catch (error) {
    console.error(error)
  }
}

function handleAdd() {
  form.name = ''
  form.description = ''
  form.sortOrder = 0
  form.status = 'active'
  dialogTitle.value = '新增分类'
  dialogVisible.value = true
}

function handleEdit(row) {
  Object.assign(form, {
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    status: row.status
  })
  currentCategoryId.value = row.id
  dialogTitle.value = '编辑分类'
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (currentCategoryId.value) {
      await request.put(`/categories/${currentCategoryId.value}`, form)
    } else {
      await request.post('/categories', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定要删除该分类吗？', '提示', { type: 'warning' })
  await request.delete(`/categories/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

async function handleManagers(row) {
  currentCategoryId.value = row.id
  try {
    const res = await request.get(`/categories/${row.id}`)
    selectedManagers.value = res.data.managers?.map(m => m.id) || []
    const usersRes = await request.get('/roles/list')
    allUsers.value = usersRes.data
    managerDialogVisible.value = true
  } catch (error) {
    console.error(error)
  }
}

async function submitManagers() {
  try {
    await request.put(`/categories/${currentCategoryId.value}/managers`, {
      userIds: selectedManagers.value
    })
    ElMessage.success('设置成功')
    managerDialogVisible.value = false
  } catch (error) {
    console.error(error)
  }
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
