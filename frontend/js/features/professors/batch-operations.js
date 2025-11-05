/**
 * 批量操作功能模块
 * 提供批量修改状态、优先级、标签、跟进提醒和删除等功能
 */

import { supabase } from '../../supabase-config.js'
import { showToast } from '../../core/feedback.js'
import { state, upsertApplication } from '../../core/store.js'

/**
 * 初始化批量操作的下拉菜单
 */
export function initBatchDropdowns() {
    // 批量修改状态下拉菜单
    initDropdown('batch-status-btn', 'batch-status-menu', async (statusValue) => {
        await batchUpdateStatus(statusValue)
    })

    // 批量设置优先级下拉菜单
    initDropdown('batch-priority-btn', 'batch-priority-menu', async (priorityValue) => {
        await batchUpdatePriority(parseInt(priorityValue))
    })
}

/**
 * 初始化单个下拉菜单
 */
function initDropdown(buttonId, menuId, onSelect) {
    const button = document.getElementById(buttonId)
    const menu = document.getElementById(menuId)

    if (!button || !menu) return

    // 点击按钮切换菜单显示
    button.addEventListener('click', (e) => {
        e.stopPropagation()
        const isHidden = menu.classList.contains('hidden')

        // 先关闭所有其他下拉菜单
        document.querySelectorAll('.batch-dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.add('hidden')
        })

        // 切换当前菜单
        if (isHidden) {
            menu.classList.remove('hidden')
        } else {
            menu.classList.add('hidden')
        }
    })

    // 点击菜单项
    menu.addEventListener('click', async (e) => {
        const menuItem = e.target.closest('.batch-menu-item')
        if (!menuItem) return

        const status = menuItem.dataset.status
        const priority = menuItem.dataset.priority
        const value = status || priority

        if (value && typeof onSelect === 'function') {
            menu.classList.add('hidden')
            await onSelect(value)
        }
    })

    // 点击外部关闭菜单
    document.addEventListener('click', () => {
        menu.classList.add('hidden')
    })
}

/**
 * 批量更新状态
 */
async function batchUpdateStatus(status) {
    const count = state.selectedProfessors.size
    if (count === 0) {
        showToast('请先选择导师', 'error')
        return
    }

    const selectedIds = Array.from(state.selectedProfessors)
    let successCount = 0
    let failCount = 0

    showToast(`正在批量更新 ${count} 位导师的状态...`, 'info')

    for (const professorId of selectedIds) {
        const professor = state.professors.find(p => p.id === professorId)
        if (!professor) {
            failCount++
            continue
        }

        try {
            const existing = state.applications.get(professorId)
            const now = new Date().toISOString()

            const payload = {
                status,
                updated_at: now
            }

            // 处理特殊状态的字段
            if (status === '待发送') {
                payload.sent_at = null
                payload.sent_by = null
                payload.replied_at = null
            } else {
                payload.sent_by = state.currentUser
                if (['已发送', '已读', '已回复', '待面试', '已接受', '已拒绝'].includes(status) && !existing?.sent_at) {
                    payload.sent_at = now
                }
                if (status === '已回复') {
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
                    priority: 3,
                    ...payload
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
                successCount++
            }
        } catch (error) {
            console.error(`更新导师 ${professor.name} 失败:`, error)
            failCount++
        }
    }

    // 显示结果
    if (successCount > 0) {
        showToast(`成功更新 ${successCount} 位导师为"${status}"`)

        // 刷新视图
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        showToast(`${failCount} 位导师更新失败`, 'error')
    }
}

/**
 * 批量更新优先级
 */
async function batchUpdatePriority(priority) {
    const count = state.selectedProfessors.size
    if (count === 0) {
        showToast('请先选择导师', 'error')
        return
    }

    const selectedIds = Array.from(state.selectedProfessors)
    let successCount = 0
    let failCount = 0

    showToast(`正在批量设置 ${count} 位导师的优先级...`, 'info')

    for (const professorId of selectedIds) {
        const professor = state.professors.find(p => p.id === professorId)
        if (!professor) {
            failCount++
            continue
        }

        try {
            const existing = state.applications.get(professorId)
            const now = new Date().toISOString()

            const payload = {
                priority,
                updated_at: now
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
                    status: '待发送',
                    ...payload
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
                successCount++
            }
        } catch (error) {
            console.error(`更新导师 ${professor.name} 失败:`, error)
            failCount++
        }
    }

    // 显示结果
    const stars = '⭐'.repeat(priority)
    if (successCount > 0) {
        showToast(`成功设置 ${successCount} 位导师优先级为 ${stars}`)

        // 刷新视图
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        showToast(`${failCount} 位导师更新失败`, 'error')
    }
}

/**
 * 批量安排跟进提醒
 */
export async function batchScheduleFollowup() {
    const count = state.selectedProfessors.size
    if (count === 0) {
        showToast('请先选择导师', 'error')
        return
    }

    const days = prompt('请输入跟进天数 (例如: 3表示3天后跟进):', '3')
    if (!days) return

    const daysNum = parseInt(days)
    if (isNaN(daysNum) || daysNum <= 0) {
        showToast('请输入有效的天数', 'error')
        return
    }

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysNum)

    const selectedIds = Array.from(state.selectedProfessors)
    let successCount = 0
    let failCount = 0

    showToast(`正在批量设置 ${count} 位导师的跟进提醒...`, 'info')

    for (const professorId of selectedIds) {
        const application = state.applications.get(professorId)
        if (!application) {
            failCount++
            continue
        }

        try {
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
            successCount++
        } catch (error) {
            console.error(`设置跟进提醒失败:`, error)
            failCount++
        }
    }

    // 显示结果
    if (successCount > 0) {
        showToast(`成功为 ${successCount} 位导师设置 ${daysNum} 天后跟进`)

        // 刷新视图
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        showToast(`${failCount} 位导师设置失败`, 'error')
    }
}

/**
 * 批量添加标签
 */
export async function batchAddTags() {
    const count = state.selectedProfessors.size
    if (count === 0) {
        showToast('请先选择导师', 'error')
        return
    }

    const tagsInput = prompt('请输入要添加的标签 (多个标签用逗号分隔):', '')
    if (!tagsInput) return

    const newTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

    if (newTags.length === 0) {
        showToast('请输入有效的标签', 'error')
        return
    }

    const selectedIds = Array.from(state.selectedProfessors)
    let successCount = 0
    let failCount = 0

    showToast(`正在批量添加标签...`, 'info')

    for (const professorId of selectedIds) {
        const application = state.applications.get(professorId)

        try {
            const existingTags = application?.tags || []
            const mergedTags = [...new Set([...existingTags, ...newTags])]

            const payload = {
                tags: mergedTags,
                updated_at: new Date().toISOString()
            }

            let record = null

            if (application) {
                const { data, error } = await supabase
                    .from('applications')
                    .update(payload)
                    .eq('id', application.id)
                    .select()
                    .single()

                if (error) throw error
                record = data
            } else {
                const insertPayload = {
                    professor_id: professorId,
                    status: '待发送',
                    priority: 3,
                    ...payload
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
                successCount++
            }
        } catch (error) {
            console.error(`添加标签失败:`, error)
            failCount++
        }
    }

    // 显示结果
    if (successCount > 0) {
        showToast(`成功为 ${successCount} 位导师添加标签`)

        // 刷新视图
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        showToast(`${failCount} 位导师操作失败`, 'error')
    }
}

/**
 * 批量删除
 */
export async function batchDelete() {
    const count = state.selectedProfessors.size
    if (count === 0) {
        showToast('请先选择导师', 'error')
        return
    }

    const confirmed = window.confirm(
        `确定要删除 ${count} 位导师吗？此操作不可恢复。`
    )
    if (!confirmed) return

    const selectedIds = Array.from(state.selectedProfessors)
    let successCount = 0
    let failCount = 0

    showToast(`正在批量删除 ${count} 位导师...`, 'info')

    for (const professorId of selectedIds) {
        try {
            const { error } = await supabase
                .from('professors')
                .delete()
                .eq('id', professorId)

            if (error) throw error
            successCount++
        } catch (error) {
            console.error(`删除导师失败:`, error)
            failCount++
        }
    }

    // 显示结果
    if (successCount > 0) {
        showToast(`成功删除 ${successCount} 位导师`)

        // 刷新视图 (通过实时订阅会自动更新)
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        showToast(`${failCount} 位导师删除失败`, 'error')
    }
}
