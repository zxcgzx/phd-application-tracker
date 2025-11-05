/**
 * 高级筛选功能模块
 */

import { state, updateFilters } from '../../core/store.js'
import { showToast } from '../../core/feedback.js'

// 高级筛选状态
const advancedFilterState = {
    timeRange: '',
    priorityMin: '',
    priorityMax: '',
    matchMin: '',
    matchMax: '',
    followupStatus: '',
    tags: '',
    tagsAnd: false
}

/**
 * 初始化高级筛选功能
 */
export function initAdvancedFilters() {
    // 绑定事件监听
    const toggleBtn = document.getElementById('advanced-filter-toggle')
    const applyBtn = document.getElementById('apply-advanced-filters')
    const resetBtn = document.getElementById('reset-advanced-filters')

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAdvancedFilters)
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', applyAdvancedFilters)
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetAdvancedFilters)
    }

    // 绑定输入变化监听
    bindInputListeners()
}

/**
 * 切换高级筛选面板显示/隐藏
 */
function toggleAdvancedFilters() {
    const panel = document.getElementById('advanced-filters')
    const icon = document.getElementById('advanced-filter-icon')

    if (!panel || !icon) return

    const isHidden = panel.classList.contains('hidden')

    if (isHidden) {
        panel.classList.remove('hidden')
        icon.classList.add('rotated')
        icon.textContent = '▲'
    } else {
        panel.classList.add('hidden')
        icon.classList.remove('rotated')
        icon.textContent = '▼'
    }
}

/**
 * 绑定输入框变化监听
 */
function bindInputListeners() {
    const inputs = [
        'filter-time-range',
        'filter-priority-min',
        'filter-priority-max',
        'filter-match-min',
        'filter-match-max',
        'filter-followup-status',
        'filter-tags',
        'filter-tags-and'
    ]

    inputs.forEach(id => {
        const el = document.getElementById(id)
        if (!el) return

        const event = id === 'filter-tags-and' ? 'change' : 'input'
        el.addEventListener(event, () => {
            // 实时更新状态
            updateAdvancedFilterState()
        })
    })
}

/**
 * 更新高级筛选状态
 */
function updateAdvancedFilterState() {
    advancedFilterState.timeRange = document.getElementById('filter-time-range')?.value || ''
    advancedFilterState.priorityMin = document.getElementById('filter-priority-min')?.value || ''
    advancedFilterState.priorityMax = document.getElementById('filter-priority-max')?.value || ''
    advancedFilterState.matchMin = document.getElementById('filter-match-min')?.value || ''
    advancedFilterState.matchMax = document.getElementById('filter-match-max')?.value || ''
    advancedFilterState.followupStatus = document.getElementById('filter-followup-status')?.value || ''
    advancedFilterState.tags = document.getElementById('filter-tags')?.value || ''
    advancedFilterState.tagsAnd = document.getElementById('filter-tags-and')?.checked || false
}

/**
 * 应用高级筛选
 */
function applyAdvancedFilters() {
    updateAdvancedFilterState()

    // 触发主筛选器重新渲染
    if (typeof window.renderProfessorsList === 'function') {
        window.renderProfessorsList()
    }

    // 显示反馈
    const activeFiltersCount = countActiveAdvancedFilters()
    if (activeFiltersCount > 0) {
        showToast(`已应用 ${activeFiltersCount} 个高级筛选条件`)
    }
}

/**
 * 重置高级筛选
 */
function resetAdvancedFilters() {
    // 清空所有输入
    document.getElementById('filter-time-range').value = ''
    document.getElementById('filter-priority-min').value = ''
    document.getElementById('filter-priority-max').value = ''
    document.getElementById('filter-match-min').value = ''
    document.getElementById('filter-match-max').value = ''
    document.getElementById('filter-followup-status').value = ''
    document.getElementById('filter-tags').value = ''
    document.getElementById('filter-tags-and').checked = false

    // 更新状态
    updateAdvancedFilterState()

    // 重新渲染
    if (typeof window.renderProfessorsList === 'function') {
        window.renderProfessorsList()
    }

    showToast('已重置高级筛选')
}

/**
 * 统计激活的筛选条件数量
 */
function countActiveAdvancedFilters() {
    let count = 0
    if (advancedFilterState.timeRange) count++
    if (advancedFilterState.priorityMin || advancedFilterState.priorityMax) count++
    if (advancedFilterState.matchMin || advancedFilterState.matchMax) count++
    if (advancedFilterState.followupStatus) count++
    if (advancedFilterState.tags) count++
    return count
}

/**
 * 应用高级筛选到导师列表
 */
export function applyAdvancedFiltersToList(professors) {
    let filtered = [...professors]

    // 时间范围筛选
    if (advancedFilterState.timeRange) {
        filtered = filterByTimeRange(filtered, advancedFilterState.timeRange)
    }

    // 优先级筛选
    if (advancedFilterState.priorityMin || advancedFilterState.priorityMax) {
        filtered = filterByPriorityRange(filtered, advancedFilterState.priorityMin, advancedFilterState.priorityMax)
    }

    // 匹配度筛选
    if (advancedFilterState.matchMin || advancedFilterState.matchMax) {
        filtered = filterByMatchRange(filtered, advancedFilterState.matchMin, advancedFilterState.matchMax)
    }

    // 跟进状态筛选
    if (advancedFilterState.followupStatus) {
        filtered = filterByFollowupStatus(filtered, advancedFilterState.followupStatus)
    }

    // 标签筛选
    if (advancedFilterState.tags) {
        filtered = filterByTags(filtered, advancedFilterState.tags, advancedFilterState.tagsAnd)
    }

    return filtered
}

/**
 * 按时间范围筛选
 */
function filterByTimeRange(professors, timeRange) {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    return professors.filter(prof => {
        const app = state.applications.get(prof.id)
        if (!app) return false

        switch (timeRange) {
            case 'sent_7d':
                return app.sent_at && (now - new Date(app.sent_at).getTime()) <= 7 * day
            case 'sent_30d':
                return app.sent_at && (now - new Date(app.sent_at).getTime()) <= 30 * day
            case 'no_followup_7d':
                return app.last_followup_at && (now - new Date(app.last_followup_at).getTime()) > 7 * day
            case 'no_followup_30d':
                return app.last_followup_at && (now - new Date(app.last_followup_at).getTime()) > 30 * day
            case 'replied_7d':
                return app.replied_at && (now - new Date(app.replied_at).getTime()) <= 7 * day
            case 'replied_30d':
                return app.replied_at && (now - new Date(app.replied_at).getTime()) <= 30 * day
            default:
                return true
        }
    })
}

/**
 * 按优先级范围筛选
 */
function filterByPriorityRange(professors, min, max) {
    const minPriority = min ? parseInt(min) : 1
    const maxPriority = max ? parseInt(max) : 5

    return professors.filter(prof => {
        const app = state.applications.get(prof.id)
        if (!app) return false

        const priority = app.priority || 3
        return priority >= minPriority && priority <= maxPriority
    })
}

/**
 * 按匹配度范围筛选
 */
function filterByMatchRange(professors, min, max) {
    const minMatch = min ? parseInt(min) : 0
    const maxMatch = max ? parseInt(max) : 5

    return professors.filter(prof => {
        const app = state.applications.get(prof.id)
        if (!app || !app.match_score) return false

        const match = app.match_score
        return match >= minMatch && match <= maxMatch
    })
}

/**
 * 按跟进状态筛选
 */
function filterByFollowupStatus(professors, status) {
    const now = Date.now()
    const threeDays = 3 * 24 * 60 * 60 * 1000

    return professors.filter(prof => {
        const app = state.applications.get(prof.id)
        if (!app) return false

        switch (status) {
            case 'has_reminder':
                return !!app.next_followup_at
            case 'no_reminder':
                return !app.next_followup_at
            case 'overdue':
                return app.next_followup_at && new Date(app.next_followup_at).getTime() < now
            case 'upcoming':
                return app.next_followup_at &&
                       new Date(app.next_followup_at).getTime() > now &&
                       new Date(app.next_followup_at).getTime() < (now + threeDays)
            default:
                return true
        }
    })
}

/**
 * 按标签筛选
 */
function filterByTags(professors, tagsInput, useAnd) {
    const searchTags = tagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)

    if (searchTags.length === 0) return professors

    return professors.filter(prof => {
        const app = state.applications.get(prof.id)
        if (!app || !app.tags || app.tags.length === 0) return false

        const professorTags = app.tags.map(t => t.toLowerCase())

        if (useAnd) {
            // AND逻辑：必须包含所有搜索标签
            return searchTags.every(searchTag =>
                professorTags.some(profTag => profTag.includes(searchTag))
            )
        } else {
            // OR逻辑：包含任意一个搜索标签即可
            return searchTags.some(searchTag =>
                professorTags.some(profTag => profTag.includes(searchTag))
            )
        }
    })
}

/**
 * 获取当前高级筛选状态（用于外部查询）
 */
export function getAdvancedFilterState() {
    return { ...advancedFilterState }
}

/**
 * 检查是否有激活的高级筛选
 */
export function hasActiveAdvancedFilters() {
    return countActiveAdvancedFilters() > 0
}
