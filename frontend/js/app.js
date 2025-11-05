/**
 * 申请博士记录系统 - 主应用
 */

import { supabase, checkConfig } from './supabase-config.js'
import { openProfessorModal } from './components/professor-list.js'
import { renderProfessorsOverview } from './components/professor-overview.js'
import { renderStatsPanel } from './components/stats-dashboard.js'
import { renderCrawlerPanel } from './components/crawler-manager.js'
import { showToast, showLoading } from './core/feedback.js'
import { calculateStats } from './core/stats.js'
import { showConfirm } from './components/modal.js'
import { debounce } from './utils/debounce.js'
import {
    state,
    setCurrentTab,
    setCurrentUser,
    setProfessors,
    setUniversities,
    setApplications,
    upsertApplication,
    removeApplication,
    updateFilters,
    toggleBatchMode as toggleBatchModeState,
    clearBatchSelection,
    selectProfessor,
    deselectProfessor,
    setDisplayLimit,
    increaseDisplayLimit
} from './core/store.js'
import {
    renderProfessorsList,
    bindProfessorCardEvents,
    updateBatchSelectionView,
    closeModal
} from './features/professors/view.js'
import { initAdvancedFilters } from './features/professors/advanced-filters.js'
import {
    initBatchDropdowns,
    batchScheduleFollowup,
    batchAddTags,
    batchDelete
} from './features/professors/batch-operations.js'
import { initDataImport } from './features/import/import-data.js'

const DEFAULT_PAGE_SIZE = 24
const STATUS_NEEDS_SENT_AT = new Set(['已发送', '已读', '已回复', '待面试', '已接受', '已拒绝'])
const STATUS_NEEDS_REPLIED_AT = new Set(['已回复'])
const FILTER_STORAGE_KEY = 'phd_tracker_filters_v1'
const CREATE_PROFESSOR_MODAL_ID = 'create-professor-modal'
const USER_OPTIONS = ['Zhang', 'Shi']
const LEGACY_USER_MAP = {
    '你': 'Zhang',
    '女朋友': 'Shi'
}
let filterPersistTimer = null
let legacyUserMigrated = false

function normalizeUserName(value, options = {}) {
    const allowEmpty = options.allowEmpty ?? false
    if (!value) {
        return allowEmpty ? '' : USER_OPTIONS[0]
    }
    const mapped = LEGACY_USER_MAP[value] || value
    if (USER_OPTIONS.includes(mapped)) {
        return mapped
    }
    return allowEmpty ? '' : USER_OPTIONS[0]
}

async function migrateLegacySentBy() {
    if (legacyUserMigrated) return
    try {
        await supabase.from('applications')
            .update({ sent_by: 'Zhang' })
            .eq('sent_by', '你')

        await supabase.from('applications')
            .update({ sent_by: 'Shi' })
            .eq('sent_by', '女朋友')
    } catch (error) {
        console.warn('迁移旧操作人失败:', error)
    } finally {
        legacyUserMigrated = true
    }
}

function scheduleFiltersPersist() {
    if (filterPersistTimer) {
        clearTimeout(filterPersistTimer)
    }
    filterPersistTimer = setTimeout(() => {
        saveFiltersToStorage()
        filterPersistTimer = null
    }, 200)
}

function saveFiltersToStorage() {
    if (typeof localStorage === 'undefined') {
        return
    }
    try {
        const payload = {
            search: state.filters.search || '',
            university: state.filters.university || '',
            status: state.filters.status || '',
            sentBy: state.filters.sentBy || ''
        }
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
        console.warn('保存筛选条件失败:', error)
    }
}

function restoreFiltersFromStorage() {
    if (typeof localStorage === 'undefined') {
        return
    }
    try {
        const raw = localStorage.getItem(FILTER_STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
            updateFilters({
                search: parsed.search || '',
                university: parsed.university || '',
                status: parsed.status || '',
                sentBy: normalizeUserName(parsed.sentBy, { allowEmpty: true })
            })
        }
    } catch (error) {
        console.warn('恢复筛选条件失败:', error)
    }
}

function syncFilterControlsFromState() {
    const searchInput = document.getElementById('search-input')
    if (searchInput) {
        searchInput.value = state.filters.search || ''
    }

    const uniSelect = document.getElementById('filter-university')
    if (uniSelect) {
        uniSelect.value = state.filters.university || ''
    }

    const statusSelect = document.getElementById('filter-status')
    if (statusSelect) {
        statusSelect.value = state.filters.status || ''
    }

    const sentBySelect = document.getElementById('filter-sent-by')
    if (sentBySelect) {
        sentBySelect.value = state.filters.sentBy || ''
    }
}

function parseResearchAreas(value = '') {
    return value
        .split(/[,，;；\s]+/)
        .map(item => item.trim())
        .filter(Boolean)
}

function populateCreateProfessorUniversities() {
    const select = document.getElementById('create-professor-university')
    if (!select) return

    const currentValue = select.value
    select.innerHTML = '<option value="">请选择学校</option>'

    state.universities.forEach((uni, id) => {
        if (!uni) return
        const option = document.createElement('option')
        option.value = id
        option.textContent = uni.name || '未命名学校'
        select.appendChild(option)
    })

    if (state.filters.university && state.universities.has(state.filters.university)) {
        select.value = state.filters.university
    } else if (currentValue && state.universities.has(currentValue)) {
        select.value = currentValue
    }
}

function resetCreateProfessorForm() {
    const form = document.getElementById('create-professor-form')
    if (!form) return
    form.reset()
    form.dataset.submitting = 'false'
}

function openCreateProfessorModal() {
    if (state.universities.size === 0) {
        showToast('请先在 Supabase 中配置学校信息', 'error')
        return
    }

    resetCreateProfessorForm()
    populateCreateProfessorUniversities()

    const modal = document.getElementById(CREATE_PROFESSOR_MODAL_ID)
    if (modal) {
        modal.classList.remove('hidden')
    }
}

function closeCreateProfessorModal() {
    const modal = document.getElementById(CREATE_PROFESSOR_MODAL_ID)
    if (modal) {
        modal.classList.add('hidden')
    }
}

async function handleCreateProfessorSubmit(event) {
    event.preventDefault()
    const form = event.target
    if (!form || form.dataset.submitting === 'true') {
        return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn?.textContent

    form.dataset.submitting = 'true'
    if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.classList.add('is-loading')
        submitBtn.textContent = '保存中...'
    }

    const formData = new FormData(form)
    const name = (formData.get('name') || '').trim()
    const universityId = (formData.get('university_id') || '').trim()

    if (!name) {
        showToast('导师姓名不能为空', 'error')
        form.dataset.submitting = 'false'
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.classList.remove('is-loading')
            submitBtn.textContent = originalText || '保存'
        }
        return
    }

    if (!universityId) {
        showToast('请选择导师所属学校', 'error')
        form.dataset.submitting = 'false'
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.classList.remove('is-loading')
            submitBtn.textContent = originalText || '保存'
        }
        return
    }

    const payload = {
        name,
        university_id: universityId,
        title: (formData.get('title') || '').trim() || null,
        email: null,
        phone: null,
        homepage: (formData.get('homepage') || '').trim() || null,
        office_location: (formData.get('office_location') || '').trim() || null,
        research_areas: null
    }

    const researchInput = (formData.get('research_areas') || '').trim()
    const researchAreas = parseResearchAreas(researchInput)
    if (researchAreas.length > 0) {
        payload.research_areas = researchAreas
    }

    try {
        const { data, error } = await supabase
            .from('professors')
            .insert(payload)
            .select(`
                *,
                universities(name),
                applications(*)
            `)
            .single()

        if (error) throw error

        const nextProfessors = [data, ...state.professors.filter(p => p.id !== data.id)]
        setProfessors(nextProfessors)
        removeApplication(data.id)

        showToast(`已创建导师 ${data.name}`)
        closeCreateProfessorModal()
        refreshProfessorsView()

    } catch (error) {
        console.error('创建导师失败:', error)
        showToast('创建导师失败: ' + error.message, 'error')
    } finally {
        form.dataset.submitting = 'false'
        if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.classList.remove('is-loading')
            submitBtn.textContent = originalText || '保存'
        }
    }
}

async function deleteProfessor(professorId) {
    if (!professorId) return false

    const professor = state.professors.find(p => p.id === professorId)
    if (!professor) {
        showToast('未找到对应导师', 'error')
        return false
    }

    const confirmed = await showConfirm({
        title: '删除导师',
        message: `确认删除 ${professor.name} 吗？`,
        details: '此操作不可恢复，请谨慎操作！',
        type: 'danger',
        confirmText: '确认删除',
        cancelText: '取消'
    })
    if (!confirmed) {
        return false
    }

    try {
        const { error } = await supabase
            .from('professors')
            .delete()
            .eq('id', professorId)

        if (error) throw error

        const next = state.professors.filter(p => p.id !== professorId)
        setProfessors(next)
        removeApplication(professorId)
        deselectProfessor(professorId)

        showToast(`已删除 ${professor.name}`, 'info')
        refreshProfessorsView()
        return true

    } catch (error) {
        console.error('删除导师失败:', error)
        showToast('删除导师失败: ' + error.message, 'error')
        return false
    }
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
    syncBatchModeUI()
    restoreFiltersFromStorage()
    syncFilterControlsFromState()

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

    // 搜索 - 使用防抖优化
    const debouncedSearch = debounce((searchValue) => {
        updateFilters({ search: searchValue })
        setDisplayLimit(DEFAULT_PAGE_SIZE)
        scheduleFiltersPersist()
        applyFilters()
    }, 300)

    document.getElementById('search-input').addEventListener('input', (e) => {
        // 立即更新输入值，但延迟触发过滤
        const value = e.target.value
        // 先更新state中的search值（立即反馈）
        state.filters.search = value
        // 然后延迟执行过滤操作
        debouncedSearch(value)
    })

    // 筛选器
    document.getElementById('filter-university').addEventListener('change', (e) => {
        updateFilters({ university: e.target.value })
        setDisplayLimit(DEFAULT_PAGE_SIZE)
        scheduleFiltersPersist()
        applyFilters()
    })

    document.getElementById('filter-status').addEventListener('change', (e) => {
        updateFilters({ status: e.target.value })
        setDisplayLimit(DEFAULT_PAGE_SIZE)
        scheduleFiltersPersist()
        applyFilters()
    })

    document.getElementById('filter-sent-by').addEventListener('change', (e) => {
        updateFilters({ sentBy: e.target.value })
        setDisplayLimit(DEFAULT_PAGE_SIZE)
        scheduleFiltersPersist()
        applyFilters()
    })

    // 批量操作
    document.getElementById('batch-mode-btn').addEventListener('click', handleBatchModeToggle)
    document.getElementById('batch-cancel').addEventListener('click', () => handleBatchModeToggle({ force: false }))
    document.getElementById('batch-export').addEventListener('click', batchExport)

    // 初始化批量操作下拉菜单
    initBatchDropdowns()

    // 批量跟进
    const batchFollowupBtn = document.getElementById('batch-followup-btn')
    if (batchFollowupBtn) {
        batchFollowupBtn.addEventListener('click', batchScheduleFollowup)
    }

    // 批量添加标签
    const batchTagsBtn = document.getElementById('batch-tags-btn')
    if (batchTagsBtn) {
        batchTagsBtn.addEventListener('click', batchAddTags)
    }

    // 批量删除
    const batchDeleteBtn = document.getElementById('batch-delete')
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', batchDelete)
    }

    const createBtn = document.getElementById('create-professor-btn')
    if (createBtn) {
        createBtn.addEventListener('click', openCreateProfessorModal)
    }

    const createCancelBtn = document.getElementById('create-professor-cancel')
    if (createCancelBtn) {
        createCancelBtn.addEventListener('click', closeCreateProfessorModal)
    }

    const createCloseBtn = document.getElementById('create-professor-close')
    if (createCloseBtn) {
        createCloseBtn.addEventListener('click', closeCreateProfessorModal)
    }

    const createModal = document.getElementById(CREATE_PROFESSOR_MODAL_ID)
    if (createModal) {
        createModal.addEventListener('click', (event) => {
            if (event.target.id === CREATE_PROFESSOR_MODAL_ID) {
                closeCreateProfessorModal()
            }
        })
    }

    const createForm = document.getElementById('create-professor-form')
    if (createForm) {
        createForm.addEventListener('submit', handleCreateProfessorSubmit)
    }

    const loadMoreBtn = document.getElementById('load-more')
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            increaseDisplayLimit(DEFAULT_PAGE_SIZE)
            refreshProfessorsView()
        })
    }

    const statusPills = document.getElementById('status-pills')
    if (statusPills) {
        statusPills.addEventListener('click', handleStatusPillClick)
    }

    // 关闭弹窗
    document.getElementById('professor-modal').addEventListener('click', (e) => {
        if (e.target.id === 'professor-modal') {
            closeModal()
        }
    })

    // 初始化高级筛选
    initAdvancedFilters()

    // 初始化数据导入
    initDataImport()

    // 初始化移动端交互
    initMobileInteractions()
}

/**
 * 初始化移动端交互功能
 * 包括汉堡菜单、侧边栏抽屉和FAB浮动按钮
 */
function initMobileInteractions() {
    // 获取DOM元素
    const mobileMenuBtn = document.getElementById('mobile-menu-btn')
    const sidebar = document.getElementById('sidebar')
    const sidebarOverlay = document.getElementById('sidebar-overlay')
    const mobileFab = document.getElementById('mobile-fab')
    const fabMain = mobileFab?.querySelector('.fab-main')
    const fabAddProfessor = document.getElementById('fab-add-professor')
    const fabBatchMode = document.getElementById('fab-batch-mode')
    const fabImportData = document.getElementById('fab-import-data')

    // 切换侧边栏显示/隐藏
    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open')

        if (isOpen) {
            // 关闭侧边栏
            sidebar.classList.remove('open')
            sidebarOverlay.classList.remove('show')
            mobileMenuBtn.classList.remove('active')
        } else {
            // 打开侧边栏
            sidebar.classList.add('open')
            sidebarOverlay.classList.add('show')
            mobileMenuBtn.classList.add('active')
        }
    }

    // 汉堡菜单按钮点击事件
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            toggleSidebar()
        })

        // 遮罩层点击事件 - 关闭侧边栏
        sidebarOverlay.addEventListener('click', () => {
            toggleSidebar()
        })

        // 侧边栏内的链接点击后自动关闭侧边栏（移动端）
        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                // 只在移动端自动关闭
                if (window.innerWidth <= 768) {
                    toggleSidebar()
                }
            })
        })
    }

    // FAB浮动按钮功能
    if (mobileFab && fabMain) {
        // 切换FAB展开/收起状态
        function toggleFAB() {
            mobileFab.classList.toggle('expanded')
        }

        // 关闭FAB
        function closeFAB() {
            mobileFab.classList.remove('expanded')
        }

        // FAB主按钮点击事件
        fabMain.addEventListener('click', (e) => {
            e.stopPropagation()
            toggleFAB()
        })

        // FAB子按钮：新建导师
        if (fabAddProfessor) {
            fabAddProfessor.addEventListener('click', () => {
                closeFAB()
                // 触发新建导师按钮点击
                const createBtn = document.getElementById('create-professor-btn')
                if (createBtn) {
                    createBtn.click()
                }
            })
        }

        // FAB子按钮：批量操作
        if (fabBatchMode) {
            fabBatchMode.addEventListener('click', () => {
                closeFAB()
                // 触发批量模式切换
                handleBatchModeToggle()
            })
        }

        // FAB子按钮：导入数据
        if (fabImportData) {
            fabImportData.addEventListener('click', () => {
                closeFAB()
                // 触发导入数据按钮点击
                const importBtn = document.getElementById('import-data-btn')
                if (importBtn) {
                    importBtn.click()
                }
            })
        }

        // 点击页面其他区域关闭FAB
        document.addEventListener('click', (e) => {
            if (!mobileFab.contains(e.target)) {
                closeFAB()
            }
        })
    }

    // 响应式处理：窗口大小变化时自动关闭侧边栏
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            // 桌面端自动关闭移动端侧边栏
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open')
                sidebarOverlay.classList.remove('show')
                mobileMenuBtn.classList.remove('active')
            }
        }
    })

    console.log('✅ 移动端交互已初始化')
}

// 切换 Tab
function switchTab(tabName) {
    setCurrentTab(tabName)

    // 更新按钮样式
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('is-active')
        } else {
            btn.classList.remove('is-active')
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
    }
}

// 加载数据
async function loadData() {
    try {
        showLoading(document.getElementById('professors-grid'))
        setDisplayLimit(DEFAULT_PAGE_SIZE)

        await migrateLegacySentBy()

        // 加载学校
        const { data: universities } = await supabase
            .from('universities')
            .select('*')
            .order('name')

        setUniversities(universities || [])

        // 更新学校筛选器
        const uniSelect = document.getElementById('filter-university')
        uniSelect.innerHTML = '<option value="">所有学校</option>'
        universities?.forEach(uni => {
            uniSelect.innerHTML += `<option value="${uni.id}">${uni.name}</option>`
        })

        if (state.filters.university && !state.universities.has(state.filters.university)) {
            updateFilters({ university: '' })
            scheduleFiltersPersist()
        }
        uniSelect.value = state.filters.university || ''

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

        setProfessors(professors || [])

        const applicationsMap = new Map()
        professors?.forEach(prof => {
            if (prof.applications && prof.applications.length > 0) {
                const record = { ...prof.applications[0] }
                record.sent_by = normalizeUserName(record.sent_by, { allowEmpty: true })
                applicationsMap.set(prof.id, record)
            }
        })
        setApplications(applicationsMap)

        syncFilterControlsFromState()
        refreshProfessorsView()

    } catch (error) {
        console.error('加载数据失败:', error)
        showToast('加载数据失败: ' + error.message, 'error')
    }
}

function getUniversityName(professor) {
    if (!professor) return ''
    const nested = Array.isArray(professor.universities)
        ? professor.universities[0]
        : professor.universities
    if (nested?.name) {
        return nested.name
    }
    const mapped = state.universities.get(professor.university_id)
    return mapped?.name || ''
}

function refreshProfessorsView() {
    const { filtered, visibleCount } = renderProfessorsList(state, { limit: state.displayLimit })
    bindProfessorCardEvents(state, {
        onViewDetail: (professor, application) => openProfessorModal(professor, application, state),
        onMarkSent: markAsSent,
        onQuickStatusChange: changeProfessorStatus,
        onDeleteProfessor: deleteProfessor,
        onScheduleFollowup: scheduleQuickFollowup,
        onSelectionChange: (professorId, checked) => {
            if (!professorId) return
            if (checked) {
                selectProfessor(professorId)
            } else {
                deselectProfessor(professorId)
            }
            updateBatchSelectionView(state)
        }
    })
    updateBatchSelectionView(state)
    updateLoadMoreButton(filtered.length, visibleCount)

    const stats = calculateStats(state)
    renderProfessorsOverview({ state, stats })
}

function updateLoadMoreButton(totalCount, visibleCount) {
    const button = document.getElementById('load-more')
    if (!button) return

    const remaining = totalCount - visibleCount
    if (remaining > 0) {
        button.classList.remove('hidden')
        button.disabled = false
        button.textContent = `加载更多 (剩余 ${remaining})`
    } else {
        button.classList.add('hidden')
    }
}

// 应用筛选
function applyFilters() {
    refreshProfessorsView()
}

function handleStatusPillClick(event) {
    const pill = event.target.closest('[data-status-filter]')
    if (!pill) return

    const selectedStatus = pill.dataset.statusFilter || ''
    const currentStatus = state.filters.status || ''
    const nextStatus = currentStatus === selectedStatus ? '' : selectedStatus

    updateFilters({ status: nextStatus })
    setDisplayLimit(DEFAULT_PAGE_SIZE)
    scheduleFiltersPersist()
    syncFilterControlsFromState()
    applyFilters()
}

// 更新申请状态的通用方法，确保批量操作与快捷操作可复用
async function updateApplicationStatus(professorId, status, options = {}) {
    const { silent = false } = options

    try {
        const professor = state.professors.find(p => p.id === professorId)
        if (!professor) {
            showToast('未找到对应导师', 'error')
            return false
        }

        const existing = state.applications.get(professorId)
        const now = new Date().toISOString()

        const payload = {
            status,
            updated_at: now
        }

        if (status === '待发送') {
            payload.sent_at = null
            payload.sent_by = null
            payload.replied_at = null
        } else {
            payload.sent_by = state.currentUser
            if (STATUS_NEEDS_SENT_AT.has(status) && !existing?.sent_at) {
                payload.sent_at = now
            }
            if (STATUS_NEEDS_REPLIED_AT.has(status)) {
                payload.replied_at = now
            }
        }

        let record = null

        if (existing) {
            const { data, error } = await supabase
                .from('applications')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            record = data
        } else {
            const insertPayload = {
                professor_id: professorId,
                ...payload
            }
            insertPayload.priority = 3

            if (!insertPayload.sent_at && STATUS_NEEDS_SENT_AT.has(status)) {
                insertPayload.sent_at = now
            }
            if (STATUS_NEEDS_REPLIED_AT.has(status)) {
                insertPayload.replied_at = now
            }

            const { data, error } = await supabase
                .from('applications')
                .upsert(insertPayload, { onConflict: 'professor_id' })
                .select()
                .single()

            if (error) throw error
            record = data
        }

        if (record) {
            upsertApplication(professorId, record)
        }

        if (!silent) {
            const message = status === '待发送'
                ? `已将 ${professor.name} 重置为待发送`
                : `已更新 ${professor.name} 为"${status}"`
            showToast(message)
            refreshProfessorsView()
        }
        return true

    } catch (error) {
        console.error('更新状态失败:', error)
        showToast('更新状态失败: ' + error.message, 'error')
        return false
    }
}

// 标记为已发送
async function markAsSent(professorId, options = {}) {
    return updateApplicationStatus(professorId, '已发送', options)
}

// 快速状态更新入口
async function changeProfessorStatus(professorId, status) {
    if (!professorId || !status) {
        return false
    }
    return updateApplicationStatus(professorId, status)
}

async function scheduleQuickFollowup(professorId, days = 3, options = {}) {
    if (!professorId) {
        return false
    }

    const application = state.applications.get(professorId)
    if (!application) {
        showToast('请先创建申请记录后再设置跟进提醒', 'info')
        return false
    }

    try {
        let targetDate = null

        if (options.targetISO) {
            const customDate = new Date(options.targetISO)
            if (Number.isNaN(customDate.getTime())) {
                showToast('无效的日期格式', 'error')
                return false
            }
            targetDate = customDate
        } else {
            const sanitizedDays = Number.isFinite(days) && days > 0 ? Math.round(days) : 3
            targetDate = new Date()
            targetDate.setDate(targetDate.getDate() + sanitizedDays)
        }

        const payload = {
            next_followup_at: targetDate.toISOString(),
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('applications')
            .update(payload)
            .eq('id', application.id)
            .select()
            .single()

        if (error) throw error

        upsertApplication(professorId, data)
        showToast('已更新跟进提醒')
        refreshProfessorsView()
        return true

    } catch (error) {
        console.error('设置跟进提醒失败:', error)
        showToast('设置跟进提醒失败: ' + error.message, 'error')
        return false
    }
}

// 批量标记
async function batchMarkAsSent() {
    const count = state.selectedProfessors.size
    if (count === 0) return

    const selectedIds = Array.from(state.selectedProfessors)

    for (const profId of selectedIds) {
        await markAsSent(profId, { silent: true })
    }

    clearBatchSelection()
    handleBatchModeToggle({ force: false })
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
    const headers = [
        '姓名',
        '职称',
        '学校',
        '个人主页',
        '研究方向',
        '申请状态',
        '优先级',
        '匹配度',
        '发送时间',
        '下次跟进',
        '最后跟进',
        '标签',
        '回复摘要',
        '备注'
    ]
    const rows = selectedData.map(prof => {
        const app = state.applications.get(prof.id)
        return [
            prof.name,
            prof.title || '',
            getUniversityName(prof) || '',
            prof.homepage || '',
            prof.research_areas?.join('; ') || '',
            app?.status || '待发送',
            app?.priority ?? '',
            app?.match_score ?? '',
            app?.sent_at ? new Date(app.sent_at).toLocaleDateString('zh-CN') : '',
            app?.next_followup_at ? new Date(app.next_followup_at).toLocaleString('zh-CN') : '',
            app?.last_followup_at ? new Date(app.last_followup_at).toLocaleString('zh-CN') : '',
            Array.isArray(app?.tags) ? app.tags.join('; ') : '',
            app?.reply_summary || '',
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

function handleBatchModeToggle(options = {}) {
    const { force } = options

    if (typeof force === 'boolean') {
        toggleBatchModeState(force)
    } else {
        toggleBatchModeState()
    }

    if (!state.batchMode) {
        clearBatchSelection()
    }

    syncBatchModeUI()
    refreshProfessorsView()
}

function syncBatchModeUI() {
    const batchActions = document.getElementById('batch-actions')
    const batchBtn = document.getElementById('batch-mode-btn')

    if (state.batchMode) {
        batchActions.classList.remove('hidden')
        batchBtn.classList.add('primary-btn')
        batchBtn.classList.remove('secondary-btn')
    } else {
        batchActions.classList.add('hidden')
        batchBtn.classList.add('secondary-btn')
        batchBtn.classList.remove('primary-btn')
    }

    updateBatchSelectionView(state)
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
                    upsertApplication(payload.new.professor_id, payload.new)
                    refreshProfessorsView()

                    // 显示通知
                    const operator = payload.new.sent_by
                    if (operator && operator !== state.currentUser) {
                        showToast(`${operator} 刚刚更新了申请记录`, 'info')
                    }
                } else if (payload.eventType === 'DELETE') {
                    removeApplication(payload.old.professor_id)
                    refreshProfessorsView()
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
                    const next = state.professors.filter(p => p.id !== payload.old.id)
                    setProfessors(next)
                    refreshProfessorsView()
                } else if (payload.eventType === 'UPDATE') {
                    // 更新现有导师信息
                    const index = state.professors.findIndex(p => p.id === payload.new.id)
                    if (index >= 0) {
                        const updated = [...state.professors]
                        updated[index] = { ...updated[index], ...payload.new }
                        setProfessors(updated)
                        refreshProfessorsView()
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
    const savedUser = normalizeUserName(localStorage.getItem('currentUser'))
    setCurrentUser(savedUser)

    const userSpan = document.getElementById('current-user')
    const optionsHtml = USER_OPTIONS.map(user => `
        <option value="${user}" ${state.currentUser === user ? 'selected' : ''}>${user}</option>
    `).join('')
    userSpan.innerHTML = `
        <span class="hero-user-label">当前用户</span>
        <select class="hero-user-select" id="user-selector">
            ${optionsHtml}
        </select>
    `

    document.getElementById('user-selector').addEventListener('change', (e) => {
        const nextUser = normalizeUserName(e.target.value)
        setCurrentUser(nextUser)
        localStorage.setItem('currentUser', nextUser)
        showToast(`已切换到 ${nextUser}`)
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
window.markAsSent = markAsSent
window.renderProfessorsList = refreshProfessorsView

// 启动应用
document.addEventListener('DOMContentLoaded', init)
