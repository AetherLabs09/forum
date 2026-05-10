<template>
  <div class="settings-page">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>
      <el-form ref="formRef" :model="form" label-width="140px" style="max-width: 600px">
        <el-form-item label="论坛名称">
          <el-input v-model="form.forum_name" placeholder="请输入论坛名称" />
        </el-form-item>
        <el-form-item label="论坛公告">
          <el-input v-model="form.forum_announcement" type="textarea" :rows="4" placeholder="请输入论坛公告" />
        </el-form-item>
        <el-form-item label="每页帖子数">
          <el-input-number v-model="form.post_per_page" :min="5" :max="100" />
        </el-form-item>
        <el-form-item label="敏感词过滤">
          <el-input v-model="form.sensitive_words" type="textarea" :rows="3" placeholder="多个词用逗号分隔" />
        </el-form-item>
        <el-form-item label="注册审核">
          <el-switch v-model="form.register_review" active-value="true" inactive-value="false" />
        </el-form-item>
        <el-form-item label="评论审核">
          <el-switch v-model="form.comment_review" active-value="true" inactive-value="false" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const formRef = ref(null)

const form = reactive({
  forum_name: '',
  forum_announcement: '',
  post_per_page: 20,
  sensitive_words: '',
  register_review: 'false',
  comment_review: 'false'
})

async function loadSettings() {
  try {
    const res = await request.get('/settings')
    Object.assign(form, res.data)
  } catch (error) {
    console.error(error)
  }
}

async function handleSave() {
  try {
    await request.put('/settings', form)
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadSettings()
})
</script>
