/**
 * 爬虫管理组件
 */

import { supabase } from '../supabase-config.js'

export async function renderCrawlerPanel() {
    const container = document.getElementById('crawler-panel')

    container.innerHTML = '<div class="text-center py-8"><div class="loading mx-auto"></div></div>'

    try {
        // 加载学校列表
        const { data: universities, error } = await supabase
            .from('universities')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        container.innerHTML = `
            <!-- 添加新学校 -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4">📝 添加新学校</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">学校名称</label>
                        <input
                            type="text"
                            id="new-uni-name"
                            placeholder="例如: 清华大学计算机系"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">导师列表页 URL</label>
                        <input
                            type="url"
                            id="new-uni-url"
                            placeholder="https://www.example.edu.cn/faculty/list.html"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p class="text-sm text-blue-800">
                            💡 <strong>提示</strong>: 添加后需要在 <code class="bg-blue-100 px-2 py-1 rounded">crawler/config.yaml</code> 中配置爬虫规则，
                            然后运行 <code class="bg-blue-100 px-2 py-1 rounded">python crawler/main.py</code> 进行爬取。
                            详见 <a href="docs/爬虫配置指南.md" class="underline font-semibold" target="_blank">爬虫配置指南</a>
                        </p>
                    </div>
                    <button
                        onclick="addUniversity()"
                        class="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        添加学校
                    </button>
                </div>
            </div>

            <!-- 已配置学校列表 -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4">🏫 已配置学校 (${universities?.length || 0})</h2>

                ${universities && universities.length > 0 ? `
                    <div class="space-y-4">
                        ${universities.map(uni => renderUniversityCard(uni)).join('')}
                    </div>
                ` : `
                    <p class="text-gray-400 text-center py-8">暂无学校，请添加第一个学校</p>
                `}
            </div>
        `

        bindCrawlerEvents()

    } catch (error) {
        console.error('加载爬虫管理失败:', error)
        container.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p class="text-red-600">❌ 加载失败: ${error.message}</p>
            </div>
        `
    }
}

function renderUniversityCard(uni) {
    const lastCrawled = uni.last_crawled_at
        ? new Date(uni.last_crawled_at).toLocaleString('zh-CN')
        : '从未爬取'

    const statusColor = {
        'success': 'green',
        'failed': 'red',
        'running': 'yellow',
        'pending': 'gray'
    }[uni.crawl_status] || 'gray'

    const statusText = {
        'success': '✅ 成功',
        'failed': '❌ 失败',
        'running': '⏳ 进行中',
        'pending': '⏸️ 待爬取'
    }[uni.crawl_status] || '⏸️ 待爬取'

    return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 mb-1">${uni.name}</h3>
                    <a href="${uni.url}" target="_blank" class="text-sm text-blue-600 hover:underline truncate block">
                        ${uni.url} ↗
                    </a>
                </div>
                <span class="px-3 py-1 bg-${statusColor}-100 text-${statusColor}-700 text-sm rounded-full whitespace-nowrap ml-3">
                    ${statusText}
                </span>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                <div>
                    <span class="text-gray-500">导师数量:</span>
                    <span class="font-semibold ml-1">${uni.professors_count || 0}</span>
                </div>
                <div>
                    <span class="text-gray-500">最后爬取:</span>
                    <span class="font-semibold ml-1">${lastCrawled}</span>
                </div>
            </div>

            <div class="flex gap-2">
                <button
                    onclick="viewCrawlLogs('${uni.id}')"
                    class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                >
                    查看日志
                </button>
                <button
                    onclick="deleteUniversity('${uni.id}', '${uni.name}')"
                    class="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                >
                    删除
                </button>
            </div>
        </div>
    `
}

function bindCrawlerEvents() {
    // 事件已通过 onclick 绑定
}

// 全局函数
window.addUniversity = async function() {
    const name = document.getElementById('new-uni-name').value.trim()
    const url = document.getElementById('new-uni-url').value.trim()

    if (!name || !url) {
        alert('请填写完整信息')
        return
    }

    try {
        const { error } = await supabase
            .from('universities')
            .insert({
                name,
                url,
                scraper_type: 'two_level',
                crawl_status: 'pending'
            })

        if (error) throw error

        window.showToast(`已添加 ${name}，请在 config.yaml 中配置爬虫规则`)

        // 刷新面板
        renderCrawlerPanel()

    } catch (error) {
        console.error('添加失败:', error)
        alert('添加失败: ' + error.message)
    }
}

window.viewCrawlLogs = async function(universityId) {
    try {
        const { data: logs, error } = await supabase
            .from('crawl_logs')
            .select('*')
            .eq('university_id', universityId)
            .order('started_at', { ascending: false })
            .limit(10)

        if (error) throw error

        if (!logs || logs.length === 0) {
            alert('暂无爬取日志')
            return
        }

        const logHtml = logs.map(log => `
            <div class="border-b pb-3 mb-3 last:border-b-0">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}">
                        ${log.status === 'success' ? '✅' : '❌'} ${log.status}
                    </span>
                    <span class="text-sm text-gray-500">
                        ${new Date(log.started_at).toLocaleString('zh-CN')}
                    </span>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                    <p>发现: ${log.professors_found || 0} 位 | 新增: ${log.professors_new || 0} 位 | 更新: ${log.professors_updated || 0} 位</p>
                    ${log.error_message ? `<p class="text-red-600">错误: ${log.error_message}</p>` : ''}
                </div>
            </div>
        `).join('')

        // 显示弹窗
        const modal = document.getElementById('professor-modal')
        const content = document.getElementById('modal-content')
        content.innerHTML = `
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">×</button>
            <h2 class="text-xl font-bold text-gray-800 mb-4">爬取日志</h2>
            <div class="max-h-96 overflow-y-auto">
                ${logHtml}
            </div>
        `
        modal.classList.remove('hidden')

    } catch (error) {
        console.error('加载日志失败:', error)
        alert('加载日志失败: ' + error.message)
    }
}

window.deleteUniversity = async function(id, name) {
    if (!confirm(`确定删除 "${name}" 吗？这将同时删除该学校的所有导师和申请记录！`)) {
        return
    }

    try {
        const { error } = await supabase
            .from('universities')
            .delete()
            .eq('id', id)

        if (error) throw error

        window.showToast(`已删除 ${name}`)
        renderCrawlerPanel()

    } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败: ' + error.message)
    }
}

export { renderCrawlerPanel }
