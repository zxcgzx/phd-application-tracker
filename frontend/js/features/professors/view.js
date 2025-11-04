/**
 * 导师列表视图相关逻辑
 * 负责数据筛选与列表渲染，保持与状态模块的分离。
 */

import { renderProfessorCard, openProfessorModal } from '../../components/professor-list.js'
import { showToast } from '../../core/feedback.js'

export function getFilteredProfessors(state) {
    return state.professors.filter(professor => {
        const application = state.applications.get(professor.id)

        if (state.filters.university && professor.university_id !== state.filters.university) {
            return false
        }

        if (state.filters.status) {
            const status = application?.status || '待发送'
            if (status !== state.filters.status) {
                return false
            }
        }

        if (state.filters.sentBy && application?.sent_by !== state.filters.sentBy) {
            return false
        }

        if (state.filters.search) {
            const keyword = state.filters.search.toLowerCase()
            const searchText = [
                professor.name,
                professor.title,
                ...(professor.research_areas || [])
            ].join(' ').toLowerCase()

            if (!searchText.includes(keyword)) {
                return false
            }
        }

        return true
    })
}

export function renderProfessorsList(state, options = {}) {
    const container = options.container ?? document.getElementById('professors-grid')
    if (!container) {
        return {
            filtered: [],
            visibleCount: 0
        }
    }

    const filtered = getFilteredProfessors(state)
    const limit = typeof options.limit === 'number'
        ? options.limit
        : (typeof state.displayLimit === 'number' ? state.displayLimit : filtered.length)
    const visibleItems = filtered.slice(0, limit)

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <p class="text-lg mb-2">😕 没有找到导师</p>
                <p class="text-sm">请尝试调整筛选条件或添加新的学校</p>
            </div>
        `
        return {
            filtered,
            visibleCount: 0
        }
    }

    container.innerHTML = visibleItems.map(professor => {
        const application = state.applications.get(professor.id)
        return renderProfessorCard(professor, application, state)
    }).join('')

    return {
        filtered,
        visibleCount: visibleItems.length
    }
}

let stateRef = null
let handlerRef = {
    onViewDetail: null,
    onMarkSent: null,
    onSelectionChange: null,
    onQuickStatusChange: null,
    onDeleteProfessor: null,
    onScheduleFollowup: null
}

export function bindProfessorCardEvents(state, handlers = {}) {
    stateRef = state
    handlerRef = {
        ...handlerRef,
        ...handlers
    }

    const container = document.getElementById('professors-grid')
    if (!container || container.dataset.bound === 'true') {
        return
    }

    container.dataset.bound = 'true'

    container.addEventListener('click', async (event) => {
        const detailBtn = event.target.closest('[data-action="view-detail"]')
        if (detailBtn) {
            const professorId = detailBtn.dataset.professorId
            const professor = stateRef?.professors.find(p => p.id === professorId)
            const application = stateRef?.applications.get(professorId)

            if (professor) {
                if (typeof handlerRef.onViewDetail === 'function') {
                    handlerRef.onViewDetail(professor, application)
                } else {
                    openProfessorModal(professor, application, stateRef)
                }
            }
            return
        }

        const quickBtn = event.target.closest('[data-action="quick-status"]')
        if (quickBtn) {
            const professorId = quickBtn.dataset.professorId
            const nextStatus = quickBtn.dataset.status

            if (professorId && nextStatus && typeof handlerRef.onQuickStatusChange === 'function') {
                const originalText = quickBtn.textContent
                quickBtn.disabled = true
                quickBtn.classList.add('is-loading')
                quickBtn.textContent = '更新中...'

                const success = await handlerRef.onQuickStatusChange(professorId, nextStatus)

                if (!success && quickBtn.isConnected) {
                    quickBtn.disabled = false
                    quickBtn.classList.remove('is-loading')
                    quickBtn.textContent = originalText
                }
            }
            return
        }

        const sentBtn = event.target.closest('[data-action="mark-sent"]')
        if (sentBtn) {
            const professorId = sentBtn.dataset.professorId
            if (typeof handlerRef.onMarkSent === 'function') {
                const originalText = sentBtn.textContent
                sentBtn.disabled = true
                sentBtn.classList.add('is-loading')
                sentBtn.textContent = '处理中...'

                const success = await handlerRef.onMarkSent(professorId)

                if (!success && sentBtn.isConnected) {
                    sentBtn.disabled = false
                    sentBtn.classList.remove('is-loading')
                    sentBtn.textContent = originalText
                }
            }
            return
        }

        const followupBtn = event.target.closest('[data-action="schedule-followup"]')
        if (followupBtn) {
            const professorId = followupBtn.dataset.professorId
            const daysRaw = followupBtn.dataset.days || '3'
            const days = Number(daysRaw)

            if (professorId && typeof handlerRef.onScheduleFollowup === 'function') {
                const originalText = followupBtn.textContent
                followupBtn.disabled = true
                followupBtn.classList.add('is-loading')
                followupBtn.textContent = '设置中...'

                const success = await handlerRef.onScheduleFollowup(professorId, Number.isFinite(days) && days > 0 ? days : 3)

                if (!success && followupBtn.isConnected) {
                    followupBtn.disabled = false
                    followupBtn.classList.remove('is-loading')
                    followupBtn.textContent = originalText
                } else if (success && followupBtn.isConnected) {
                    followupBtn.classList.remove('is-loading')
                    followupBtn.textContent = '已更新'
                    setTimeout(() => {
                        if (followupBtn.isConnected) {
                            followupBtn.disabled = false
                            followupBtn.textContent = originalText
                        }
                    }, 1200)
                }
            }
            return
        }

        const deleteBtn = event.target.closest('[data-action="delete-professor"]')
        if (deleteBtn) {
            const professorId = deleteBtn.dataset.professorId
            if (professorId && typeof handlerRef.onDeleteProfessor === 'function') {
                const originalText = deleteBtn.textContent
                deleteBtn.disabled = true
                deleteBtn.classList.add('is-loading')
                deleteBtn.textContent = '删除中...'

                const success = await handlerRef.onDeleteProfessor(professorId)

                if (!success && deleteBtn.isConnected) {
                    deleteBtn.disabled = false
                    deleteBtn.classList.remove('is-loading')
                    deleteBtn.textContent = originalText
                }
            }
            return
        }

    })

    container.addEventListener('change', (event) => {
        const checkbox = event.target.closest('.batch-checkbox')
        if (!checkbox) return

        if (typeof handlerRef.onSelectionChange === 'function') {
            handlerRef.onSelectionChange(checkbox.dataset.professorId, checkbox.checked)
        }
    })
}

export function updateBatchSelectionView(state) {
    const counter = document.getElementById('selected-count')
    if (counter) {
        counter.textContent = state.selectedProfessors.size
    }
}

export function closeModal(modalId = 'professor-modal') {
    const modal = document.getElementById(modalId)
    if (modal) {
        modal.classList.add('hidden')
    }
}
