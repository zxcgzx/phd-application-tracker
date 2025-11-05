/**
 * 统计面板组件 - 增强版（包含图表）
 */

import { calculateStats } from '../core/stats.js'

// 存储图表实例
const chartInstances = {}

export function renderStatsPanel(state) {
    const container = document.getElementById('stats-panel')

    // 计算统计数据
    const stats = calculateStats(state)

    container.innerHTML = `
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-blue-600">${stats.total}</div>
                <div class="text-sm text-gray-500 mt-1">总导师数</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-green-600">${stats.sent}</div>
                <div class="text-sm text-gray-500 mt-1">已发送</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-purple-600">${stats.replied}</div>
                <div class="text-sm text-gray-500 mt-1">已回复</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-yellow-600">${stats.interview}</div>
                <div class="text-sm text-gray-500 mt-1">面试中</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-green-700">${stats.accepted}</div>
                <div class="text-sm text-gray-500 mt-1">已接受</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-4 text-center">
                <div class="text-3xl font-bold text-red-600">${stats.replyRate}%</div>
                <div class="text-sm text-gray-500 mt-1">回复率</div>
            </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- 状态分布饼图 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 申请状态分布</h3>
                <div class="chart-container">
                    <canvas id="status-chart"></canvas>
                </div>
            </div>

            <!-- 学校申请数柱状图 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">🏫 各学校申请数量</h3>
                <div class="chart-container">
                    <canvas id="university-chart"></canvas>
                </div>
            </div>

            <!-- 优先级分布 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">⭐ 优先级分布</h3>
                <div class="chart-container">
                    <canvas id="priority-chart"></canvas>
                </div>
            </div>

            <!-- 回复率对比 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 各操作人回复率</h3>
                <div class="chart-container">
                    <canvas id="reply-rate-chart"></canvas>
                </div>
            </div>
        </div>

        <!-- 待办事项 -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">⏰ 待办事项</h3>
            <div class="space-y-2">
                ${renderTodos(stats.todos)}
            </div>
        </div>
    `

    // 渲染图表（延迟执行以确保DOM已更新）
    setTimeout(() => {
        renderStatusChart(stats)
        renderUniversityChart(stats)
        renderPriorityChart(stats, state)
        renderReplyRateChart(stats)
    }, 100)
}

/**
 * 渲染状态分布饼图
 */
function renderStatusChart(stats) {
    const canvas = document.getElementById('status-chart')
    if (!canvas) return

    // 销毁旧图表
    if (chartInstances.status) {
        chartInstances.status.destroy()
    }

    const ctx = canvas.getContext('2d')

    // 统计各状态数量
    const statusCounts = {
        '待发送': stats.pending || 0,
        '已发送': stats.sent || 0,
        '已读': stats.read || 0,
        '已回复': stats.replied || 0,
        '待面试': stats.interview || 0,
        '已接受': stats.accepted || 0,
        '已拒绝': stats.rejected || 0
    }

    // 过滤掉数量为0的状态
    const labels = []
    const data = []
    Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
            labels.push(status)
            data.push(count)
        }
    })

    chartInstances.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#94a3b8', // 待发送 - 灰色
                    '#3b82f6', // 已发送 - 蓝色
                    '#8b5cf6', // 已读 - 紫色
                    '#10b981', // 已回复 - 绿色
                    '#f59e0b', // 待面试 - 橙色
                    '#22c55e', // 已接受 - 深绿
                    '#ef4444'  // 已拒绝 - 红色
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || ''
                            const value = context.parsed || 0
                            const total = context.dataset.data.reduce((a, b) => a + b, 0)
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
                            return `${label}: ${value} (${percentage}%)`
                        }
                    }
                }
            }
        }
    })
}

/**
 * 渲染学校申请数柱状图
 */
function renderUniversityChart(stats) {
    const canvas = document.getElementById('university-chart')
    if (!canvas) return

    // 销毁旧图表
    if (chartInstances.university) {
        chartInstances.university.destroy()
    }

    const ctx = canvas.getContext('2d')

    // 获取前8个学校
    const sorted = Array.from(stats.byUniversity.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 8)

    const labels = sorted.map(([name]) => {
        // 截断过长的学校名
        return name.length > 15 ? name.substring(0, 15) + '...' : name
    })
    const totals = sorted.map(([, s]) => s.total)
    const sents = sorted.map(([, s]) => s.sent)

    chartInstances.university = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '总数',
                    data: totals,
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1
                },
                {
                    label: '已发送',
                    data: sents,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}`
                        }
                    }
                }
            }
        }
    })
}

/**
 * 渲染优先级分布柱状图
 */
function renderPriorityChart(stats, state) {
    const canvas = document.getElementById('priority-chart')
    if (!canvas) return

    // 销毁旧图表
    if (chartInstances.priority) {
        chartInstances.priority.destroy()
    }

    const ctx = canvas.getContext('2d')

    // 统计各优先级数量
    const priorityCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    state.applications.forEach(app => {
        const priority = app.priority || 3
        if (priorityCounts[priority] !== undefined) {
            priorityCounts[priority]++
        }
    })

    chartInstances.priority = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'],
            datasets: [{
                label: '导师数量',
                data: [
                    priorityCounts[1],
                    priorityCounts[2],
                    priorityCounts[3],
                    priorityCounts[4],
                    priorityCounts[5]
                ],
                backgroundColor: [
                    '#94a3b8',
                    '#64748b',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `优先级: ${context[0].dataIndex + 1}星`
                        },
                        label: function(context) {
                            return `数量: ${context.parsed.y}`
                        }
                    }
                }
            }
        }
    })
}

/**
 * 渲染回复率对比图
 */
function renderReplyRateChart(stats) {
    const canvas = document.getElementById('reply-rate-chart')
    if (!canvas) return

    // 销毁旧图表
    if (chartInstances.replyRate) {
        chartInstances.replyRate.destroy()
    }

    const ctx = canvas.getContext('2d')

    // 获取各操作人数据
    const operators = Array.from(stats.byOperator.entries())
        .filter(([name]) => name !== '无')
        .sort((a, b) => b[1].total - a[1].total)

    if (operators.length === 0) {
        // 没有数据时显示空状态
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#9ca3af'
        ctx.textAlign = 'center'
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2)
        return
    }

    const labels = operators.map(([name]) => name)
    const replyRates = operators.map(([, s]) => {
        return s.total > 0 ? Math.round((s.replied / s.total) * 100) : 0
    })
    const totals = operators.map(([, s]) => s.total)

    chartInstances.replyRate = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '回复率 (%)',
                data: replyRates,
                backgroundColor: '#8b5cf6',
                borderColor: '#7c3aed',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: '发送数量',
                data: totals,
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '回复率 (%)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: '发送数量'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    })
}

function renderTodos(todos) {
    if (todos.length === 0) {
        return '<p class="text-green-600 text-sm">✅ 太棒了！暂无待办事项</p>'
    }

    const severityStyles = {
        danger: { icon: '⛔', bg: 'bg-red-50', iconClass: 'text-red-600' },
        warning: { icon: '⚠️', bg: 'bg-yellow-50', iconClass: 'text-yellow-600' },
        info: { icon: '🔔', bg: 'bg-blue-50', iconClass: 'text-blue-600' }
    }

    return todos.map(todo => `
        <div class="flex items-center gap-3 p-3 ${(severityStyles[todo.severity]?.bg) || 'bg-yellow-50'} rounded-lg">
            <span class="${(severityStyles[todo.severity]?.iconClass) || 'text-yellow-600'}">
                ${(severityStyles[todo.severity]?.icon) || '⚠️'}
            </span>
            <span class="flex-1 text-sm text-gray-700">${todo.message}</span>
            <button
                onclick="viewProfessorFromTodo('${todo.professorId}')"
                class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
                查看
            </button>
        </div>
    `).join('')
}

/**
 * 销毁所有图表实例（用于清理）
 */
export function destroyAllCharts() {
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy()
    })
    Object.keys(chartInstances).forEach(key => {
        delete chartInstances[key]
    })
}
