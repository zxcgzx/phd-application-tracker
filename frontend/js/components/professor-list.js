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

function resolveUniversityName(professor, state) {
    if (!professor) return '未知学校'
    const nested = Array.isArray(professor.universities)
        ? professor.universities[0]
        : professor.universities
    if (nested?.name) {
        return nested.name
    }
    const mapped = state?.universities?.get
        ? state.universities.get(professor.university_id)
        : null
    return mapped?.name || '未知学校'
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
    const uniName = resolveUniversityName(professor, state)

    const researchAreas = Array.isArray(professor.research_areas)
        ? professor.research_areas.filter(Boolean)
        : []
    const displayAreas = researchAreas.slice(0, 5)
    const remainingAreas = Math.max(0, researchAreas.length - displayAreas.length)

    const researchTags = displayAreas
        .map(area => `<span class="research-tag">${escapeHtml(area)}</span>`)
        .join('') + (remainingAreas > 0
            ? `<span class="research-tag research-tag-more">+${remainingAreas}</span>`
            : '')

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

    const homepageLink = professor.homepage
        ? `
            <div class="card-links">
                <a
                    href="${escapeHtml(professor.homepage)}"
                    target="_blank"
                    rel="noopener"
                    class="card-link-button"
                >
                    访问主页
                </a>
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
    const nextFollowupISO = application?.next_followup_at
        ? new Date(application.next_followup_at).toISOString().slice(0, 16)
        : ''
    const followupControls = application
        ? `
            <div class="quick-followup-group">
                <p class="quick-followup-label">安排跟进</p>
                <div class="followup-controls">
                    <div class="followup-presets">
                        <button
                            type="button"
                            data-action="schedule-followup"
                            data-professor-id="${professor.id}"
                            data-days="3"
                            class="quick-followup-btn"
                        >
                            +3 天
                        </button>
                        <button
                            type="button"
                            data-action="schedule-followup"
                            data-professor-id="${professor.id}"
                            data-days="7"
                            class="quick-followup-btn"
                        >
                            +7 天
                        </button>
                    </div>
                    <div class="followup-custom">
                        <label class="followup-label">自定义时间</label>
                        <input
                            type="datetime-local"
                            class="followup-input"
                            value="${nextFollowupISO}"
                            data-professor-id="${professor.id}"
                            data-action="custom-followup"
                        >
                        <button
                            type="button"
                            class="followup-save-btn"
                            data-action="apply-custom-followup"
                            data-professor-id="${professor.id}"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        `
        : ''

    const cardContentClass = state.batchMode ? 'card-content card-content-selection' : 'card-content'
    const cardHeaderClass = state.batchMode ? 'card-header card-header-selection' : 'card-header'

    return `
        <article class="professor-card ${accentClass}">
            ${batchCheckbox}
            <span class="card-accent"></span>

            <div class="${cardContentClass}">
                <header class="${cardHeaderClass}">
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

                ${application ? `
                    <section class="application-summary">
                        <div class="application-grid">
                            <div class="application-item">
                                <p class="summary-label">当前状态</p>
                                <p class="summary-value">${status}</p>
                            </div>
                            <div class="application-item">
                                <p class="summary-label">跟进成员</p>
                                <p class="summary-value">${sentBy || '未分配'}</p>
                            </div>
                            ${application.sent_at ? `
                                <div class="application-item">
                                    <p class="summary-label">发送时间</p>
                                    <p class="summary-value">${new Date(application.sent_at).toLocaleDateString('zh-CN')}</p>
                                </div>
                            ` : ''}
                            ${application.replied_at ? `
                                <div class="application-item">
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
                        <p>尚未创建申请记录，可在下方操作。</p>
                    </section>
                `}

                <section class="quick-status-group">
                    <p class="quick-status-title">状态快选</p>
                    <div class="quick-status-buttons">
                        ${quickStatusButtons}
                    </div>
                </section>

                ${followupControls}

                ${homepageLink}

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
        <button onclick="closeModal()" class="modal-close-btn">×</button>

        <div class="modal-header">
            <div>
                <h2 class="modal-title">${professor.name}</h2>
                <p class="modal-subtitle">${professor.title || '未知职称'} · ${resolveUniversityName(professor, state)}</p>
            </div>
            <span class="status-badge status-${status}">${status}</span>
        </div>

        <section class="modal-section">
            <h3 class="modal-section-title">研究方向</h3>
            <p class="modal-section-text">${researchAreas}</p>
        </section>

        ${professor.homepage ? `
            <section class="modal-section">
                <h3 class="modal-section-title">个人主页</h3>
                <a href="${professor.homepage}" target="_blank" rel="noopener" class="modal-link">
                    访问导师主页
                </a>
            </section>
        ` : ''}

        ${professor.office_location ? `
            <section class="modal-section">
                <h3 class="modal-section-title">办公室</h3>
                <p class="modal-section-text">${professor.office_location}</p>
            </section>
        ` : ''}

        <section class="modal-section">
            <h3 class="modal-section-title">申请记录</h3>

            ${application ? `
                <div class="modal-summary">
                    <div class="modal-summary-grid">
                        <div class="modal-summary-item">
                            <span class="modal-summary-label">状态</span>
                            <span class="modal-summary-value">${status}</span>
                        </div>
                        <div class="modal-summary-item">
                            <span class="modal-summary-label">操作人</span>
                            <span class="modal-summary-value">${application.sent_by || '未分配'}</span>
                        </div>
                        ${application.sent_at ? `
                            <div class="modal-summary-item">
                                <span class="modal-summary-label">发送</span>
                                <span class="modal-summary-value">${new Date(application.sent_at).toLocaleString('zh-CN')}</span>
                            </div>
                        ` : ''}
                        ${application.replied_at ? `
                            <div class="modal-summary-item">
                                <span class="modal-summary-label">回复</span>
                                <span class="modal-summary-value">${new Date(application.replied_at).toLocaleString('zh-CN')}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${application.notes ? `
                        <p class="modal-summary-note">备注：${application.notes}</p>
                    ` : ''}
                </div>

                <div class="modal-form-grid">
                    <label class="modal-field">
                        <span class="modal-field-label">更新状态</span>
                        <select id="update-status" class="modal-select">
                            <option value="待发送" ${status === '待发送' ? 'selected' : ''}>待发送</option>
                            <option value="已发送" ${status === '已发送' ? 'selected' : ''}>已发送</option>
                            <option value="已读" ${status === '已读' ? 'selected' : ''}>已读</option>
                            <option value="已回复" ${status === '已回复' ? 'selected' : ''}>已回复</option>
                            <option value="待面试" ${status === '待面试' ? 'selected' : ''}>待面试</option>
                            <option value="已接受" ${status === '已接受' ? 'selected' : ''}>已接受</option>
                            <option value="已拒绝" ${status === '已拒绝' ? 'selected' : ''}>已拒绝</option>
                        </select>
                    </label>

                    <label class="modal-field">
                        <span class="modal-field-label">优先级</span>
                        <select id="update-priority" class="modal-select">
                            ${[1, 2, 3, 4, 5].map(level => `
                                <option value="${level}" ${priorityValue === level ? 'selected' : ''}>${level} 星</option>
                            `).join('')}
                        </select>
                    </label>

                    <label class="modal-field">
                        <span class="modal-field-label">匹配度</span>
                        <select id="update-match-score" class="modal-select">
                            <option value="">未设置</option>
                            ${[1, 2, 3, 4, 5].map(score => `
                                <option value="${score}" ${matchScoreValue === score ? 'selected' : ''}>${score} 星</option>
                            `).join('')}
                        </select>
                    </label>

                    <label class="modal-field">
                        <span class="modal-field-label">下次跟进时间</span>
                        <input type="datetime-local" id="update-next-followup" value="${nextFollowupValue}" class="modal-input">
                        ${lastFollowupText ? `<span class="modal-field-hint">上次跟进：${lastFollowupText}</span>` : ''}
                    </label>

                    <label class="modal-field">
                        <span class="modal-field-label">标签（逗号分隔）</span>
                        <input type="text" id="update-tags" value="${escapeHtml(tagsValueRaw)}" class="modal-input" placeholder="例如：重点关注, 保底">
                    </label>

                    <label class="modal-field span-2">
                        <span class="modal-field-label">回复摘要</span>
                        <textarea id="update-reply-summary" rows="3" class="modal-textarea" placeholder="记录要点，便于快速回顾">${escapeHtml(replySummaryRaw)}</textarea>
                    </label>

                    <label class="modal-field span-2">
                        <span class="modal-field-label">备注</span>
                        <textarea id="update-notes" rows="3" class="modal-textarea" placeholder="添加备注...">${escapeHtml(application.notes || '')}</textarea>
                    </label>

                    <label class="modal-field">
                        <span class="modal-field-label">邮件主题</span>
                        <input type="text" id="update-email-subject" value="${escapeHtml(emailSubjectRaw)}" class="modal-input" placeholder="发送给导师的邮件主题">
                    </label>

                    <label class="modal-field span-2">
                        <span class="modal-field-label">邮件正文摘要</span>
                        <textarea id="update-email-body" rows="4" class="modal-textarea modal-textarea-code" placeholder="保留你发送的核心内容">${escapeHtml(emailBodyRaw)}</textarea>
                    </label>

                    <label class="modal-checkbox span-2">
                        <input type="checkbox" id="update-followup-done">
                        <span>本次更新包含一次跟进，自动记录最后跟进时间</span>
                    </label>
                </div>

                <button onclick="updateApplication('${application.id}')" class="modal-primary-btn">
                    保存更新
                </button>
            ` : `
                <p class="modal-empty-state">尚未创建申请记录，点击下方按钮即可快速创建。</p>
                <button onclick="markAsSent('${professor.id}')" class="modal-primary-btn">
                    创建申请记录
                </button>
            `}
        </section>
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
