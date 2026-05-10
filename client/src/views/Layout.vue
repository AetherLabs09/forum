<template>
  <div class="layout-container">
    <aside class="sidebar">
      <div class="logo">
        <h3>论坛管理后台</h3>
      </div>
      <el-menu :default-active="activeMenu" router @select="handleSelect">
        <template v-for="route in filteredRoutes" :key="route.path">
          <el-menu-item :index="route.path">
            <el-icon><component :is="route.meta.icon" /></el-icon>
            <span>{{ route.meta.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>
    <div class="main-wrapper">
      <header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta.title">{{ currentRoute.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ userStore.userInfo.nickname || userStore.userInfo.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="info">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const routes = ref([])

const currentRoute = computed(() => route)

const activeMenu = computed(() => route.path)

const filteredRoutes = computed(() => {
  const allRoutes = router.getRoutes().filter(r => r.meta?.title)
  if (userStore.isAdmin) return allRoutes
  return allRoutes.filter(r => {
    const perm = r.meta.permission
    if (!perm) return true
    if (userStore.isAdmin) return true
    const allowedPerms = userStore.isModerator ? ['posts', 'comments', 'categories', 'stats'] : []
    return allowedPerms.includes(perm)
  })
})

function handleSelect(index) {
  router.push(index)
}

async function handleCommand(command) {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    try {
      await request.post('/auth/logout')
    } catch (error) {
      console.error('退出请求失败:', error)
    }
    userStore.logout()
    router.push('/login')
  }
}

onMounted(async () => {
  try {
    const res = await request.get('/auth/info')
    userStore.setUserInfo(res.data)
  } catch (error) {
    console.error(error)
  }
})
</script>

<style scoped>
.layout-container {
  display: flex;
  width: 100%;
  height: 100vh;
}

.sidebar {
  width: 220px;
  background: #304156;
  height: 100vh;
  overflow-y: auto;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #263445;
}

.logo h3 {
  color: white;
  font-size: 18px;
}

.sidebar .el-menu {
  border: none;
  background: transparent;
}

.sidebar .el-menu-item {
  color: #bfcbd9;
}

.sidebar .el-menu-item:hover,
.sidebar .el-menu-item.is-active {
  background: #263445 !important;
  color: #409eff;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #333;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f5f7fa;
}
</style>
