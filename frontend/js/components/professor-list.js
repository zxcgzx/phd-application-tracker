/**
 * 导师列表组件
 */

import { showToast } from '../core/feedback.js'
import { upsertApplication } from '../core/store.js'

const QUICK_STATUS_SEQUENCE = ['待发送', '已发送', '已读', '已回复', '待面试', '已接受', '已拒绝']
const STATUS_ACCENTS = {
    '待发送': 'accent-neutral',
    '已发送': 'accent-blue',
    '已读': 'accent-indigo',
    '已回复': 'accent-emerald',
    '待面试': 'accent-amber',
    '已接受': 'accent-teal',
    '已拒绝': 'accent-rose'
}
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char] || char)
}

function formatDateTimeLocal(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
}

// 渲染导师卡片
export function renderProfessorCard(professor, application, state) {
    const status = application?.status || '待发送'
    const priority = application?.priority || 3
    const matchScore = application?.match_score || 0
    const sentBy = application?.sent_by || ''
    const nextFollowup = application?.next_followup_at
        ? new Date(application.next_followup_at).toLocaleString('zh-CN', { hour12: false })
        : null
    const tags = Array.isArray(application?.tags)
        ? application.tags.filter(Boolean).slice(0, 3)
        : []
    const replySummary = application?.reply_summary ? escapeHtml(application.reply_summary) : ''
    const uniName = professor.universities?.name || '未知学校'

    // 研究方向标签
    const researchTags = (professor.research_areas || [])
        .slice(0, 3)
        .map(area => `<span class="research-tag">${escapeHtml(area)}</span>`)
        .join('')

    // 优先级星星
    const stars = Array.from({ length: 5 }, (_, i) => {
        const filled = i < priority
        return `<span class="priority-star ${filled ? '' : 'empty'}">★</span>`
    }).join('')
    const priorityTitle = `优先级: ${priority} 星`

    const tagChips = tags.length > 0
        ? `
            <section class="card-section">
                <p class="card-section-title">🏷️ 标签</p>
                <div class="tag-grid">
                    ${tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </section>
        `
        : ''

    // 批量选择复选框
    const batchCheckbox = state.batchMode
        ? `<input type="checkbox" class="batch-checkbox absolute top-3 left-3 w-5 h-5" data-professor-id="${professor.id}" ${state.selectedProfessors.has(professor.id) ? 'checked' : ''}>`
        : ''

    const quickStatusButtons = QUICK_STATUS_SEQUENCE.map(option => `
        <button
            type="button"
            data-action="quick-status"
            data-professor-id="${professor.id}"
            data-status="${option}"
            class="quick-status-btn ${option === status ? 'is-active' : ''}"
        >
            ${option}
        </button>
    `).join('')

    const quickActions = []
    if (professor.email) {
        quickActions.push(`
            <button
                type="button"
                data-action="copy-field"
                data-label="邮箱"
                data-value="${escapeHtml(professor.email)}"
                class="quick-action-btn"
            >
                复制邮箱
            </button>
        `)
    }
    if (professor.phone) {
        quickActions.push(`
            <button
                type="button"
                data-action="copy-field"
                data-label="电话"
                data-value="${escapeHtml(professor.phone)}"
                class="quick-action-btn"
            >
                复制电话
            </button>
        `)
    }
    if (professor.homepage) {
        const homepage = escapeHtml(professor.homepage)
        quickActions.push(`
            <a
                href="${homepage}"
                target="_blank"
                rel="noopener"
                class="quick-action-btn quick-action-link"
            >
                打开主页 ↗
            </a>
        `)
    }

    const quickActionSection = quickActions.length > 0
        ? `
            <div class="quick-action-group">
                <p class="quick-action-title">快捷操作</p>
                <div class="quick-action-buttons">
                    ${quickActions.join('')}
                </div>
            </div>
        `
        : ''

    const accentClass = STATUS_ACCENTS[status] || STATUS_ACCENTS['待发送']
    const matchChip = matchScore > 0
        ? `<span class="match-chip">匹配度 ${matchScore}★</span>`
        : ''
    const followupBadge = nextFollowup
        ? `<span class="followup-chip">🔔 ${nextFollowup}</span>`
        : ''
    const followupControls = application
        ? `
            <div class="quick-followup-group">
                <p class="quick-followup-label">快速安排跟进</p>
                <div class="flex flex-wrap gap-2">
                    <button
                        type="button"
                        data-action="schedule-followup"
                        data-professor-id="${professor.id}"
                        data-days="3"
                        class="quick-followup-btn"
                    >
                        +3 天提醒
                    </button>
                    <button
                        type="button"
                        data-action="schedule-followup"
                        data-professor-id="${professor.id}"
                        data-days="7"
                        class="quick-followup-btn"
                    >
                        +7 天提醒
                    </button>
                </div>
            </div>
        `
        : ''

    return `
        <article class="professor-card glass-card ${accentClass}">
            ${batchCheckbox}
            <span class="card-accent"></span>

            <div class="card-content ${state.batchMode ? 'pl-6 md:pl-8' : ''}">
                <header class="card-header">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="card-title">${professor.name}</h3>
                            ${matchChip}
                        </div>
                        <p class="card-subtitle">${professor.title || '未知职称'}</p>
                        <div class="card-meta-line">
                            <span class="university-chip">🏫 ${uniName}</span>
                            ${sentBy ? `<span class="operator-chip">由 ${sentBy} 跟进</span>` : ''}
                        </div>
                    </div>
                    <div class="card-status">
                        <span class="status-badge status-${status}">${status}</span>
                        <div class="priority-stars text-sm" title="${priorityTitle}">
                            ${stars}
                        </div>
                        ${followupBadge}
                    </div>
                </header>

                <section class="card-section">
                    <p class="card-section-title">🔬 研究方向</p>
                    <div class="card-tags">
                        ${researchTags || '<span class="text-xs text-gray-400">未填写</span>'}
                    </div>
                </section>

                ${(professor.email || professor.phone || professor.homepage) ? `
                    <section class="card-section">
                        <p class="card-section-title">📮 联系方式</p>
                        <div class="contact-grid">
                            ${professor.email ? `<span class="contact-chip truncate">📧 ${professor.email}</span>` : ''}
                            ${professor.phone ? `<span class="contact-chip">📞 ${professor.phone}</span>` : ''}
                            ${professor.homepage ? `<a href="${escapeHtml(professor.homepage)}" target="_blank" rel="noopener" class="contact-chip contact-link">主页 ↗</a>` : ''}
                        </div>
                    </section>
                ` : ''}

                ${application ? `
                    <section class="application-summary">
                        <div class="application-grid">
                            <div>
                                <p class="summary-label">状态</p>
                                <p class="summary-value">${status}</p>
                            </div>
                            <div>
                                <p class="summary-label">操作人</p>
                                <p class="summary-value">${sentBy || '未知'}</p>
                            </div>
                            ${application.sent_at ? `
                                <div>
                                    <p class="summary-label">发送时间</p>
                                    <p class="summary-value">${new Date(application.sent_at).toLocaleDateString('zh-CN')}</p>
                                </div>
                            ` : ''}
                            ${application.replied_at ? `
                                <div>
                                    <p class="summary-label">回复时间</p>
                                    <p class="summary-value">${new Date(application.replied_at).toLocaleDateString('zh-CN')}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${replySummary ? `
                            <p class="summary-note">💬 ${replySummary}</p>
                        ` : ''}
                    </section>
                ` : `
                    <section class="application-empty">
                        <p>尚未创建申请记录，点击下方按钮即可快速创建。</p>
                    </section>
                `}

                <section class="quick-status-group">
                    <p class="quick-status-title">状态快选</p>
                    <div class="quick-status-buttons">
                        ${quickStatusButtons}
                    </div>
                </section>

                ${followupControls}

                ${quickActionSection}

                ${tagChips}

                <footer class="card-footer">
                    <button
                        data-action="view-detail"
                        data-professor-id="${professor.id}"
                        class="primary-btn"
                    >
                        查看详情
                    </button>
                    ${status === '待发送' ? `
                        <button
                            data-action="mark-sent"
                            data-professor-id="${professor.id}"
                            class="accent-btn"
                        >
                            标记已发送
                        </button>
                    ` : ''}
                    <button
                        data-action="delete-professor"
                        data-professor-id="${professor.id}"
                        class="danger-outline-btn"
                    >
                        删除
                    </button>
                </footer>
            </div>
        </article>
    `
}

// 打开导师详情弹窗
export function openProfessorModal(professor, application, state) {
    const modal = document.getElementById('professor-modal')
    const content = document.getElementById('modal-content')

    const status = application?.status || '待发送'
    const researchAreas = (professor.research_areas || []).join('、') || '未填写'
    const priorityValue = Number.isInteger(application?.priority) ? application.priority : 3
    const matchScoreValue = Number.isInteger(application?.match_score) ? application.match_score : ''
    const nextFollowupValue = formatDateTimeLocal(application?.next_followup_at)
    const tagsValueRaw = Array.isArray(application?.tags) ? application.tags.filter(Boolean).join(', ') : ''
    const emailSubjectRaw = application?.email_subject || ''
    const emailBodyRaw = application?.email_body || ''
    const replySummaryRaw = application?.reply_summary || ''
    const lastFollowupText = application?.last_followup_at
        ? new Date(application.last_followup_at).toLocaleString('zh-CN', { hour12: false })
        : ''

    content.innerHTML = `
        <!-- 关闭按钮 -->
        <button
            onclick="closeModal()"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
            ×
        </button>

        <!-- 导师信息 -->
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">${professor.name}</h2>
            <p class="text-gray-600">${professor.title || '未知职称'} | ${professor.universities?.name || '未知学校'}</p>
        </div>

        <!-- 详细信息 -->
        <div class="space-y-4 mb-6">
            <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-1">研究方向</h3>
                <p class="text-gray-600">${researchAreas}</p>
            </div>

            ${professor.email ? `
                <div>
                    <h3 class="text-sm font-semibold text-gray-700 mb-1">邮箱</h3>
                    <a href="mailto:${professor.email}" class="text-blue-600 hover:underline">${professor.email}</a>
                </div>
            ` : ''}

            ${professor.phone ? `
                <div>
                    <h3 class="text-sm font-semibold text-gray-700 mb-1">电话</h3>
                    <p class="text-gray-600">${professor.phone}</p>
                </div>
            ` : ''}

            ${professor.office_location ? `
                <div>
                    <h3 class="text-sm font-semibold text-gray-700 mb-1">办公室</h3>
                    <p class="text-gray-600">${professor.office_location}</p>
                </div>
            ` : ''}

            ${professor.homepage ? `
                <div>
                    <h3 class="text-sm font-semibold text-gray-700 mb-1">个人主页</h3>
                    <a href="${professor.homepage}" target="_blank" class="text-blue-600 hover:underline">
                        ${professor.homepage} ↗
                    </a>
                </div>
            ` : ''}
        </div>

        <!-- 申请记录 -->
        <div class="border-t pt-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">申请记录</h3>

            ${application ? `
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-xs text-gray-500">状态</p>
                            <span class="status-badge status-${status} mt-1">${status}</span>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">操作人</p>
                            <p class="font-semibold">${application.sent_by || '未知'}</p>
                        </div>
                        ${application.sent_at ? `
                            <div>
                                <p class="text-xs text-gray-500">发送时间</p>
                                <p class="font-semibold">${new Date(application.sent_at).toLocaleString('zh-CN')}</p>
                            </div>
                        ` : ''}
                        ${application.replied_at ? `
                            <div>
                                <p class="text-xs text-gray-500">回复时间</p>
                                <p class="font-semibold">${new Date(application.replied_at).toLocaleString('zh-CN')}</p>
                            </div>
                        ` : ''}
                    </div>

                    ${application.notes ? `
                        <div>
                            <p class="text-xs text-gray-500 mb-1">备注</p>
                            <p class="text-sm text-gray-700">${application.notes}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- 更新记录表单 -->
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">更新状态</label>
                        <select id="update-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="待发送" ${status === '待发送' ? 'selected' : ''}>待发送</option>
                            <option value="已发送" ${status === '已发送' ? 'selected' : ''}>已发送</option>
                            <option value="已读" ${status === '已读' ? 'selected' : ''}>已读</option>
                            <option value="已回复" ${status === '已回复' ? 'selected' : ''}>已回复</option>
                            <option value="待面试" ${status === '待面试' ? 'selected' : ''}>待面试</option>
                            <option value="已接受" ${status === '已接受' ? 'selected' : ''}>已接受</option>
                            <option value="已拒绝" ${status === '已拒绝' ? 'selected' : ''}>已拒绝</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                            <select id="update-priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                ${[1, 2, 3, 4, 5].map(level => `
                                    <option value="${level}" ${priorityValue === level ? 'selected' : ''}>${level} 星</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">匹配度</label>
                            <select id="update-match-score" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">未设置</option>
                                ${[1, 2, 3, 4, 5].map(score => `
                                    <option value="${score}" ${matchScoreValue === score ? 'selected' : ''}>${score} 星</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label>
                        <input
                            type="datetime-local"
                            id="update-next-followup"
                            value="${nextFollowupValue}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                        ${lastFollowupText ? `
                            <p class="text-xs text-gray-500 mt-1">上次跟进: ${lastFollowupText}</p>
                        ` : ''}
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
                        <input
                            type="text"
                            id="update-tags"
                            value="${escapeHtml(tagsValueRaw)}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="例如: 重点关注, 保底"
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">回复摘要</label>
                        <textarea
                            id="update-reply-summary"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="记录要点，便于快速回顾"
                        >${escapeHtml(replySummaryRaw)}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                        <textarea
                            id="update-notes"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="添加备注..."
                        >${escapeHtml(application.notes || '')}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">邮件主题</label>
                        <input
                            type="text"
                            id="update-email-subject"
                            value="${escapeHtml(emailSubjectRaw)}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="发送给导师的邮件主题"
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">邮件正文摘要</label>
                        <textarea
                            id="update-email-body"
                            rows="4"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="保留你发送的核心内容，方便日后参考"
                        >${escapeHtml(emailBodyRaw)}</textarea>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="update-followup-done" class="h-4 w-4">
                        <label for="update-followup-done" class="text-sm text-gray-600">本次更新包含一次跟进，自动记录最后跟进时间</label>
                    </div>

                    <button
                        onclick="updateApplication('${application.id}')"
                        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        保存更新
                    </button>
                </div>
            ` : `
                <p class="text-gray-500 text-center py-8">尚未创建申请记录</p>
                <button
                    onclick="markAsSent('${professor.id}')"
                    class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    创建申请记录
                </button>
            `}
        </div>
    `

    modal.classList.remove('hidden')
}

// 更新申请记录（绑定到全局）
window.updateApplication = async function(applicationId) {
    const status = document.getElementById('update-status').value
    const notes = document.getElementById('update-notes').value
    const priorityValue = Number(document.getElementById('update-priority')?.value || 3)
    const matchScoreRaw = document.getElementById('update-match-score')?.value || ''
    const nextFollowupRaw = document.getElementById('update-next-followup')?.value || ''
    const tagsInput = document.getElementById('update-tags')?.value || ''
    const replySummary = document.getElementById('update-reply-summary')?.value || ''
    const emailSubject = document.getElementById('update-email-subject')?.value || ''
    const emailBody = document.getElementById('update-email-body')?.value || ''
    const followupDone = document.getElementById('update-followup-done')?.checked

    try {
        const { supabase } = await import('../supabase-config.js')

        const updateData = {
            status,
            notes,
            updated_at: new Date().toISOString()
        }

        if (!Number.isNaN(priorityValue) && priorityValue >= 1 && priorityValue <= 5) {
            updateData.priority = priorityValue
        }

        if (matchScoreRaw === '') {
            updateData.match_score = null
        } else {
            const matchScore = Number(matchScoreRaw)
            updateData.match_score = Number.isNaN(matchScore) ? null : matchScore
        }

        if (nextFollowupRaw) {
            const nextFollowupDate = new Date(nextFollowupRaw)
            updateData.next_followup_at = Number.isNaN(nextFollowupDate.getTime())
                ? null
                : nextFollowupDate.toISOString()
        } else {
            updateData.next_followup_at = null
        }

        const tags = tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        updateData.tags = tags.length > 0 ? tags : null

        updateData.reply_summary = replySummary.trim() || null
        updateData.email_subject = emailSubject.trim() || null
        updateData.email_body = emailBody.trim() || null

        if (followupDone) {
            updateData.last_followup_at = new Date().toISOString()
        }

        if (status === '已回复') {
            updateData.replied_at = new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', applicationId)
            .select()
            .single()

        if (error) throw error

        showToast('更新成功')
        window.closeModal()

        if (data?.professor_id) {
            upsertApplication(data.professor_id, data)
        }

        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }

    } catch (error) {
        console.error('更新失败:', error)
        showToast('更新失败: ' + error.message, 'error')
    }
}
