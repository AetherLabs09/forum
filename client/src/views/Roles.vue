<template>
  <div class="roles-page">
    <el-card>
      <template #header>
        <span>权限管理</span>
      </template>
      <el-alert title="权限说明" type="info" :closable="false" style="margin-bottom: 20px">
        <template #default>
          <p>管理员(admin): 拥有所有权限，可管理用户、帖子、评论、分类、权限、设置等</p>
          <p>版主(moderator): 可管理帖子和评论，审核内容，处理举报</p>
          <p>普通用户(user): 无后台管理权限</p>
        </template>
      </el-alert>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="role" label="当前角色" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="danger">管理员</el-tag>
            <el-tag v-else-if="row.role === 'moderator'" type="warning">版主</el-tag>
            <el-tag v-else type="info">普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleChangeRole(row)">修改角色</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="修改用户角色" width="400px">
      <el-form label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="currentUser.username" disabled />
        </el-form-item>
        <el-form-item label="当前角色">
          <el-tag :type="currentUser.role === 'admin' ? 'danger' : currentUser.role === 'moderator' ? 'warning' : 'info'">
            {{ currentUser.role === 'admin' ? '管理员' : currentUser.role === 'moderator' ? '版主' : '普通用户' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新角色">
          <el-select v-model="newRole">
            <el-option label="管理员" value="admin" />
            <el-option label="版主" value="moderator" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRole">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const tableData = ref([])
const dialogVisible = ref(false)
const currentUser = reactive({
  id: '',
  username: '',
  role: ''
})
const newRole = ref('')

async function loadData() {
  try {
    const res = await request.get('/roles/list')
    tableData.value = res.data
  } catch (error) {
    console.error(error)
  }
}

function handleChangeRole(row) {
  currentUser.id = row.id
  currentUser.username = row.username
  currentUser.role = row.role
  newRole.value = row.role
  dialogVisible.value = true
}

async function submitRole() {
  if (!newRole.value) {
    ElMessage.warning('请选择新角色')
    return
  }
  try {
    await request.put(`/roles/user/${currentUser.id}/role`, { role: newRole.value })
    ElMessage.success('角色修改成功')
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
