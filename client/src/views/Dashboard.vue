<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon :size="30"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
            <div class="stat-sub">今日新增: {{ stats.todayUsers }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon :size="30"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalPosts }}</div>
            <div class="stat-label">总帖子数</div>
            <div class="stat-sub">今日新增: {{ stats.todayPosts }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon :size="30"><ChatDotSquare /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalComments }}</div>
            <div class="stat-label">总评论数</div>
            <div class="stat-sub">今日新增: {{ stats.todayComments }}</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #f56c6c">
            <el-icon :size="30"><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.violationCount }}</div>
            <div class="stat-label">违规内容</div>
            <div class="stat-sub">待处理: {{ stats.pendingReports }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>数据趋势 (近7天)</span>
          </template>
          <div ref="trendChartRef" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>最新帖子</span>
          </template>
          <div class="recent-posts">
            <div v-for="post in recentPosts" :key="post.id" class="recent-item">
              <span class="post-title">{{ post.title }}</span>
              <span class="post-author">{{ post.author_name }}</span>
            </div>
            <el-empty v-if="recentPosts.length === 0" description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const stats = ref({
  totalUsers: 0,
  todayUsers: 0,
  totalPosts: 0,
  todayPosts: 0,
  totalComments: 0,
  todayComments: 0,
  violationCount: 0,
  pendingReports: 0
})

const recentPosts = ref([])
const trendChartRef = ref(null)
let trendChart = null

async function loadDashboard() {
  try {
    const res = await request.get('/stats/dashboard')
    stats.value = res.data.stats
    recentPosts.value = res.data.recentPosts
    initTrendChart(res.data.trendData)
  } catch (error) {
    console.error(error)
  }
}

function initTrendChart(data) {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['用户', '帖子', '评论'] },
    xAxis: { type: 'category', data: data.map(d => d.date.substring(5)) },
    yAxis: { type: 'value' },
    series: [
      { name: '用户', type: 'line', data: data.map(d => d.users), smooth: true },
      { name: '帖子', type: 'line', data: data.map(d => d.posts), smooth: true },
      { name: '评论', type: 'line', data: data.map(d => d.comments), smooth: true }
    ]
  }
  trendChart.setOption(option)
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', () => trendChart?.resize())
})

onUnmounted(() => {
  window.removeEventListener('resize', () => trendChart?.resize())
  trendChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.stat-sub {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.recent-posts {
  max-height: 300px;
  overflow-y: auto;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.recent-item:last-child {
  border-bottom: none;
}

.post-title {
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-author {
  color: #999;
  font-size: 12px;
  margin-left: 10px;
}
</style>
