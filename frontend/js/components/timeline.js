/**
 * 跟进时间轴组件
 * 展示和管理导师申请的历史跟进记录
 */

import { supabase } from '../supabase-config.js'
import { showToast } from '../core/feedback.js'

// 跟进类型配置
const ACTION_TYPES = {
    sent_email: { icon: '📧', label: '发送邮件', color: 'bg-blue-100 text-blue-700' },
    received_reply: { icon: '✉️', label: '收到回复', color: 'bg-emerald-100 text-emerald-700' },
    phone_call: { icon: '📞', label: '电话沟通', color: 'bg-purple-100 text-purple-700' },
    interview: { icon: '🤝', label: '面试会谈', color: 'bg-amber-100 text-amber-700' },
    note: { icon: '📝', label: '记录备注', color: 'bg-gray-100 text-gray-700' },
    status_change: { icon: '🔄', label: '状态变更', color: 'bg-indigo-100 text-indigo-700' }
}

// HTML转义
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }
    return String(text || '').replace(/[&<>"']/g, m => map[m])
}

/**
 * 获取跟进记录列表
 */
export async function fetchFollowupLogs(applicationId) {
    try {
        const { data, error } = await supabase
            .from('followup_logs')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('获取跟进记录失败:', error)
        showToast('加载跟进历史失败', 'error')
        return []
    }
}

/**
 * 添加跟进记录
 */
export async function addFollowupLog(applicationId, actionType, content, operator) {
    try {
        const { data, error } = await supabase
            .from('followup_logs')
            .insert({
                application_id: applicationId,
                action_type: actionType,
                content: content || '',
                operator: operator || '',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('添加跟进记录失败:', error)
        showToast('添加跟进记录失败: ' + error.message, 'error')
        return null
    }
}

/**
 * 删除跟进记录
 */
export async function deleteFollowupLog(logId) {
    try {
        const { error } = await supabase
            .from('followup_logs')
            .delete()
            .eq('id', logId)

        if (error) throw error
        showToast('跟进记录已删除')
        return true
    } catch (error) {
        console.error('删除跟进记录失败:', error)
        showToast('删除失败: ' + error.message, 'error')
        return false
    }
}

/**
 * 渲染时间轴HTML
 */
export function renderTimelineHTML(logs) {
    if (!logs || logs.length === 0) {
        return `
            <div class="timeline-empty">
                <p class="text-sm text-gray-500">暂无跟进记录</p>
                <p class="text-xs text-gray-400 mt-1">添加跟进记录后会在此处显示</p>
            </div>
        `
    }

    const timelineItems = logs.map(log => {
        const config = ACTION_TYPES[log.action_type] || ACTION_TYPES.note
        const timeStr = new Date(log.created_at).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })

        return `
            <div class="timeline-item">
                <div class="timeline-marker">
                    <span class="timeline-icon ${config.color}">
                        ${config.icon}
                    </span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-type">${config.label}</span>
                        <span class="timeline-time">${timeStr}</span>
                    </div>
                    ${log.content ? `
                        <p class="timeline-text">${escapeHtml(log.content)}</p>
                    ` : ''}
                    ${log.operator ? `
                        <div class="timeline-meta">
                            <span class="timeline-operator">by ${escapeHtml(log.operator)}</span>
                        </div>
                    ` : ''}
                    <button
                        class="timeline-delete-btn"
                        onclick="window.deleteTimelineLog('${log.id}')"
                        title="删除此记录"
                    >
                        删除
                    </button>
                </div>
            </div>
        `
    }).join('')

    return `
        <div class="timeline">
            ${timelineItems}
        </div>
    `
}

/**
 * 渲染添加跟进记录表单
 */
export function renderAddLogForm(applicationId) {
    return `
        <div class="add-log-form">
            <h4 class="add-log-title">添加新跟进</h4>
            <div class="add-log-grid">
                <label class="add-log-field">
                    <span class="add-log-label">跟进类型</span>
                    <select id="new-log-type" class="add-log-select">
                        <option value="sent_email">📧 发送邮件</option>
                        <option value="received_reply">✉️ 收到回复</option>
                        <option value="phone_call">📞 电话沟通</option>
                        <option value="interview">🤝 面试会谈</option>
                        <option value="note">📝 记录备注</option>
                    </select>
                </label>
                <label class="add-log-field add-log-field-full">
                    <span class="add-log-label">跟进内容</span>
                    <textarea
                        id="new-log-content"
                        rows="3"
                        class="add-log-textarea"
                        placeholder="记录本次跟进的详细内容..."
                    ></textarea>
                </label>
            </div>
            <button
                onclick="window.addNewTimelineLog('${applicationId}')"
                class="add-log-btn"
            >
                添加跟进记录
            </button>
        </div>
    `
}

/**
 * 初始化时间轴事件监听
 */
export function initTimelineEvents(applicationId, currentUser) {
    // 添加跟进记录
    window.addNewTimelineLog = async function(appId) {
        const typeSelect = document.getElementById('new-log-type')
        const contentInput = document.getElementById('new-log-content')

        if (!typeSelect || !contentInput) return

        const actionType = typeSelect.value
        const content = contentInput.value.trim()

        if (!content) {
            showToast('请填写跟进内容', 'error')
            return
        }

        const log = await addFollowupLog(appId, actionType, content, currentUser)

        if (log) {
            showToast('跟进记录已添加')
            // 清空表单
            contentInput.value = ''
            typeSelect.selectedIndex = 0
            // 重新加载时间轴
            await reloadTimeline(appId, currentUser)
        }
    }

    // 删除跟进记录
    window.deleteTimelineLog = async function(logId) {
        if (!confirm('确定要删除这条跟进记录吗？')) return

        const success = await deleteFollowupLog(logId)
        if (success) {
            await reloadTimeline(applicationId, currentUser)
        }
    }
}

/**
 * 重新加载时间轴
 */
async function reloadTimeline(applicationId, currentUser) {
    const timelineContainer = document.getElementById('timeline-logs')
    if (!timelineContainer) return

    const logs = await fetchFollowupLogs(applicationId)
    timelineContainer.innerHTML = renderTimelineHTML(logs)
}

/**
 * 在详情弹窗中渲染完整的时间轴区域
 */
export async function renderTimelineSection(applicationId, currentUser) {
    if (!applicationId) {
        return '<p class="text-sm text-gray-500">请先创建申请记录后查看跟进历史</p>'
    }

    const logs = await fetchFollowupLogs(applicationId)

    return `
        <div class="timeline-section">
            <div class="timeline-logs" id="timeline-logs">
                ${renderTimelineHTML(logs)}
            </div>
            ${renderAddLogForm(applicationId)}
        </div>
    `
}
