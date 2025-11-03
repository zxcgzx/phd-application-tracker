/**
 * 申请博士记录系统 - 主应用
 */

import { supabase, checkConfig } from './supabase-config.js'
import { renderProfessorCard, openProfessorModal } from './components/professor-list.js'
import { renderStatsPanel } from './components/stats-dashboard.js'
import { renderCrawlerPanel } from './components/crawler-manager.js'
import { renderTemplatesPanel } from './components/email-templates.js'

// 全局状态
const state = {
    currentTab: 'professors',
    professors: [],
    applications: new Map(),
    universities: new Map(),
    currentUser: '你', // 或 '女朋友'
    filters: {
        university: '',
        status: '',
        sentBy: '',
        search: ''
    },
    batchMode: false,
    selectedProfessors: new Set()
}

// 工具函数
export function showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

export function showLoading(container, message = '加载中...') {
    container.innerHTML = `
        <div class="col-span-full text-center py-12">
            <div class="loading mx-auto mb-4"></div>
            <p class="text-gray-500">${message}</p>
        </div>
    `
}

// 初始化
async function init() {
    console.log('🚀 申请博士记录系统启动...')

    // 检查配置
    if (!checkConfig()) {
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="bg-white p-8 rounded-lg shadow-lg max-w-2xl">
                    <h1 class="text-2xl font-bold text-red-600 mb-4">⚠️ 配置错误</h1>
                    <p class="text-gray-700 mb-4">
                        请先配置 Supabase 连接信息。
                    </p>
                    <ol class="list-decimal list-inside text-sm text-gray-600 space-y-2">
                        <li>访问 <a href="https://supabase.com" target="_blank" class="text-blue-600 underline">https://supabase.com</a> 注册并创建项目</li>
                        <li>在项目设置中获取 URL 和 anon key</li>
                        <li>编辑 <code class="bg-gray-100 px-2 py-1 rounded">frontend/js/supabase-config.js</code> 文件</li>
                        <li>替换 SUPABASE_URL 和 SUPABASE_ANON_KEY 的值</li>
                        <li>刷新页面</li>
                    </ol>
                </div>
            </div>
        `
        return
    }

    // 绑定事件
    bindEvents()

    // 加载数据
    await loadData()

    // 设置实时订阅
    setupRealtimeSubscription()

    // 设置当前用户（可以改成从 localStorage 读取）
    updateCurrentUser()

    console.log('✅ 系统初始化完成')
}

// 绑定事件
function bindEvents() {
    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    })

    // 搜索
    document.getElementById('search-input').addEventListener('input', (e) => {
        state.filters.search = e.target.value
        applyFilters()
    })

    // 筛选器
    document.getElementById('filter-university').addEventListener('change', (e) => {
        state.filters.university = e.target.value
        applyFilters()
    })

    document.getElementById('filter-status').addEventListener('change', (e) => {
        state.filters.status = e.target.value
        applyFilters()
    })

    document.getElementById('filter-sent-by').addEventListener('change', (e) => {
        state.filters.sentBy = e.target.value
        applyFilters()
    })

    // 批量操作
    document.getElementById('batch-mode-btn').addEventListener('click', toggleBatchMode)
    document.getElementById('batch-cancel').addEventListener('click', toggleBatchMode)
    document.getElementById('batch-mark-sent').addEventListener('click', batchMarkAsSent)
    document.getElementById('batch-export').addEventListener('click', batchExport)

    // 关闭弹窗
    document.getElementById('professor-modal').addEventListener('click', (e) => {
        if (e.target.id === 'professor-modal') {
            closeModal()
        }
    })
}

// 切换 Tab
function switchTab(tabName) {
    state.currentTab = tabName

    // 更新按钮样式
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.className = 'tab-btn border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
        } else {
            btn.className = 'tab-btn border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
        }
    })

    // 显示对应内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden')
    })
    document.getElementById(`tab-${tabName}`).classList.remove('hidden')

    // 加载对应数据
    if (tabName === 'stats') {
        renderStatsPanel(state)
    } else if (tabName === 'crawler') {
        renderCrawlerPanel()
    } else if (tabName === 'templates') {
        renderTemplatesPanel()
    }
}

// 加载数据
async function loadData() {
    try {
        showLoading(document.getElementById('professors-grid'))

        // 加载学校
        const { data: universities } = await supabase
            .from('universities')
            .select('*')
            .order('name')

        universities?.forEach(uni => {
            state.universities.set(uni.id, uni)
        })

        // 更新学校筛选器
        const uniSelect = document.getElementById('filter-university')
        uniSelect.innerHTML = '<option value="">所有学校</option>'
        universities?.forEach(uni => {
            uniSelect.innerHTML += `<option value="${uni.id}">${uni.name}</option>`
        })

        // 加载导师和申请记录
        const { data: professors } = await supabase
            .from('professors')
            .select(`
                *,
                universities(name),
                applications(*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        state.professors = professors || []

        // 构建申请记录映射
        professors?.forEach(prof => {
            if (prof.applications && prof.applications.length > 0) {
                state.applications.set(prof.id, prof.applications[0])
            }
        })

        renderProfessorsList()

    } catch (error) {
        console.error('加载数据失败:', error)
        showToast('加载数据失败: ' + error.message, 'error')
    }
}

// 渲染导师列表
function renderProfessorsList() {
    const container = document.getElementById('professors-grid')
    const filtered = getFilteredProfessors()

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <p class="text-lg mb-2">😕 没有找到导师</p>
                <p class="text-sm">请尝试调整筛选条件或添加新的学校</p>
            </div>
        `
        return
    }

    container.innerHTML = filtered.map(prof => {
        const application = state.applications.get(prof.id)
        return renderProfessorCard(prof, application, state)
    }).join('')

    // 绑定卡片事件
    bindCardEvents()
}

// 获取筛选后的导师列表
function getFilteredProfessors() {
    return state.professors.filter(prof => {
        const application = state.applications.get(prof.id)

        // 学校筛选
        if (state.filters.university && prof.university_id !== state.filters.university) {
            return false
        }

        // 状态筛选
        if (state.filters.status) {
            const status = application?.status || '待发送'
            if (status !== state.filters.status) {
                return false
            }
        }

        // 操作人筛选
        if (state.filters.sentBy && application?.sent_by !== state.filters.sentBy) {
            return false
        }

        // 搜索筛选
        if (state.filters.search) {
            const keyword = state.filters.search.toLowerCase()
            const searchText = [
                prof.name,
                prof.title,
                ...(prof.research_areas || [])
            ].join(' ').toLowerCase()

            if (!searchText.includes(keyword)) {
                return false
            }
        }

        return true
    })
}

// 应用筛选
function applyFilters() {
    renderProfessorsList()
}

// 绑定卡片事件
function bindCardEvents() {
    // 查看详情
    document.querySelectorAll('[data-action="view-detail"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const profId = btn.dataset.professorId
            const prof = state.professors.find(p => p.id === profId)
            const app = state.applications.get(profId)
            openProfessorModal(prof, app, state)
        })
    })

    // 快速标记状态
    document.querySelectorAll('[data-action="mark-sent"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const profId = btn.dataset.professorId
            await markAsSent(profId)
        })
    })

    // 批量选择
    if (state.batchMode) {
        document.querySelectorAll('.batch-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const profId = e.target.dataset.professorId
                if (e.target.checked) {
                    state.selectedProfessors.add(profId)
                } else {
                    state.selectedProfessors.delete(profId)
                }
                updateBatchActions()
            })
        })
    }
}

// 标记为已发送
async function markAsSent(professorId) {
    try {
        const prof = state.professors.find(p => p.id === professorId)
        let application = state.applications.get(professorId)

        if (application) {
            // 更新现有记录
            const { data, error } = await supabase
                .from('applications')
                .update({
                    status: '已发送',
                    sent_at: new Date().toISOString(),
                    sent_by: state.currentUser
                })
                .eq('id', application.id)
                .select()

            if (error) throw error
            state.applications.set(professorId, data[0])
        } else {
            // 创建新记录
            const { data, error } = await supabase
                .from('applications')
                .insert({
                    professor_id: professorId,
                    status: '已发送',
                    sent_at: new Date().toISOString(),
                    sent_by: state.currentUser
                })
                .select()

            if (error) throw error
            state.applications.set(professorId, data[0])
        }

        showToast(`已标记 ${prof.name} 为"已发送"`)
        renderProfessorsList()

    } catch (error) {
        console.error('标记失败:', error)
        showToast('标记失败: ' + error.message, 'error')
    }
}

// 批量标记
async function batchMarkAsSent() {
    const count = state.selectedProfessors.size
    if (count === 0) return

    for (const profId of state.selectedProfessors) {
        await markAsSent(profId)
    }

    state.selectedProfessors.clear()
    toggleBatchMode()
    showToast(`已批量标记 ${count} 位导师`)
}

// 批量导出
function batchExport() {
    const count = state.selectedProfessors.size
    if (count === 0) {
        alert('请先选择要导出的导师')
        return
    }

    // 获取选中的导师数据
    const selectedData = state.professors.filter(p => state.selectedProfessors.has(p.id))

    // 转换为CSV格式
    const headers = ['姓名', '职称', '学校', '邮箱', '电话', '研究方向', '申请状态', '发送时间', '备注']
    const rows = selectedData.map(prof => {
        const app = state.applications.get(prof.id)
        return [
            prof.name,
            prof.title || '',
            prof.universities?.name || '',
            prof.email || '',
            prof.phone || '',
            prof.research_areas?.join('; ') || '',
            app?.status || '待发送',
            app?.sent_at ? new Date(app.sent_at).toLocaleDateString('zh-CN') : '',
            app?.notes || ''
        ]
    })

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // 下载文件
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `导师名单_${new Date().toLocaleDateString('zh-CN')}.csv`
    link.click()

    showToast(`已导出 ${count} 位导师信息`)
}

// 切换批量模式
function toggleBatchMode() {
    state.batchMode = !state.batchMode
    state.selectedProfessors.clear()

    const batchActions = document.getElementById('batch-actions')
    const batchBtn = document.getElementById('batch-mode-btn')

    if (state.batchMode) {
        batchActions.classList.remove('hidden')
        batchBtn.classList.add('bg-blue-600', 'text-white')
        batchBtn.classList.remove('bg-gray-100', 'text-gray-700')
    } else {
        batchActions.classList.add('hidden')
        batchBtn.classList.remove('bg-blue-600', 'text-white')
        batchBtn.classList.add('bg-gray-100', 'text-gray-700')
    }

    renderProfessorsList()
}

// 更新批量操作栏
function updateBatchActions() {
    document.getElementById('selected-count').textContent = state.selectedProfessors.size
}

// 关闭弹窗
function closeModal() {
    document.getElementById('professor-modal').classList.add('hidden')
}

window.closeModal = closeModal

// 设置实时订阅
function setupRealtimeSubscription() {
    // 订阅申请记录变化
    supabase
        .channel('applications')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'applications' },
            (payload) => {
                console.log('实时更新 (applications):', payload)

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    state.applications.set(payload.new.professor_id, payload.new)
                    renderProfessorsList()

                    // 显示通知
                    const operator = payload.new.sent_by
                    if (operator && operator !== state.currentUser) {
                        showToast(`${operator} 刚刚更新了申请记录`, 'info')
                    }
                } else if (payload.eventType === 'DELETE') {
                    state.applications.delete(payload.old.professor_id)
                    renderProfessorsList()
                }
            }
        )
        .subscribe()

    // 订阅导师信息变化（新增、删除）
    supabase
        .channel('professors')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'professors' },
            (payload) => {
                console.log('实时更新 (professors):', payload)

                if (payload.eventType === 'INSERT') {
                    // 重新加载数据以包含新导师
                    loadData()
                    showToast('发现新导师，列表已更新', 'info')
                } else if (payload.eventType === 'DELETE') {
                    // 从列表中移除
                    state.professors = state.professors.filter(p => p.id !== payload.old.id)
                    renderProfessorsList()
                } else if (payload.eventType === 'UPDATE') {
                    // 更新现有导师信息
                    const index = state.professors.findIndex(p => p.id === payload.new.id)
                    if (index >= 0) {
                        state.professors[index] = { ...state.professors[index], ...payload.new }
                        renderProfessorsList()
                    }
                }
            }
        )
        .subscribe()

    console.log('✅ 实时同步已启用 (applications + professors)')
}

// 更新当前用户显示
function updateCurrentUser() {
    // 可以从 localStorage 读取
    const savedUser = localStorage.getItem('currentUser') || '你'
    state.currentUser = savedUser

    const userSpan = document.getElementById('current-user')
    userSpan.innerHTML = `
        当前用户:
        <select class="ml-1 border-none bg-transparent font-semibold cursor-pointer" id="user-selector">
            <option value="你" ${state.currentUser === '你' ? 'selected' : ''}>你</option>
            <option value="女朋友" ${state.currentUser === '女朋友' ? 'selected' : ''}>女朋友</option>
        </select>
    `

    document.getElementById('user-selector').addEventListener('change', (e) => {
        state.currentUser = e.target.value
        localStorage.setItem('currentUser', e.target.value)
        showToast(`已切换到 ${e.target.value}`)
    })
}

// 从待办事项查看导师
window.viewProfessorFromTodo = function(professorId) {
    const prof = state.professors.find(p => p.id === professorId)
    const app = state.applications.get(professorId)
    if (prof) {
        openProfessorModal(prof, app, state)
    }
}

// 导出全局函数供组件使用
window.appState = state
window.markAsSent = markAsSent
window.showToast = showToast
window.renderProfessorsList = renderProfessorsList

// 启动应用
document.addEventListener('DOMContentLoaded', init)
