/**
 * 统计面板组件
 */

import { calculateStats } from '../core/stats.js'

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

        <!-- 分组统计 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- 按学校统计 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 按学校统计</h3>
                <div class="space-y-3">
                    ${renderUniversityStats(stats.byUniversity)}
                </div>
            </div>

            <!-- 按操作人统计 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">👥 按操作人统计</h3>
                <div class="space-y-3">
                    ${renderOperatorStats(stats.byOperator)}
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
}

function renderUniversityStats(byUniversity) {
    if (byUniversity.size === 0) {
        return '<p class="text-gray-400 text-sm">暂无数据</p>'
    }

    const sorted = Array.from(byUniversity.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)

    return sorted.map(([name, stats]) => {
        const percentage = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0
        return `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium text-gray-700">${name}</span>
                    <span class="text-xs text-gray-500">${stats.sent}/${stats.total}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `
    }).join('')
}

function renderOperatorStats(byOperator) {
    if (byOperator.size === 0) {
        return '<p class="text-gray-400 text-sm">暂无数据</p>'
    }

    return Array.from(byOperator.entries())
        .filter(([name]) => name !== '无')
        .map(([name, stats]) => {
            const replyRate = stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0
            return `
                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                    <span class="font-medium text-gray-700">${name}</span>
                    <div class="text-right">
                        <div class="text-sm font-semibold text-gray-800">${stats.total} 封</div>
                        <div class="text-xs text-gray-500">回复率 ${replyRate}%</div>
                    </div>
                </div>
            `
        }).join('')
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
