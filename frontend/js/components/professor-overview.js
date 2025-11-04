/**
 * 导师页顶部概览
 */

export function renderProfessorsOverview({ state, stats }) {
    updateHeroMetrics(stats)
    renderOverviewCards(stats)
    renderStatusPills(state, stats)
    renderInsights(stats)
}

function updateHeroMetrics(stats) {
    const totalEl = document.getElementById('metric-total')
    if (totalEl) {
        totalEl.textContent = stats.total
    }

    const sentEl = document.getElementById('metric-in-progress')
    if (sentEl) {
        const waiting = Math.max(
            stats.sent - stats.replied - stats.accepted - stats.interview - stats.rejected,
            0
        )
        sentEl.textContent = waiting
    }

    const repliedEl = document.getElementById('metric-replied')
    if (repliedEl) {
        repliedEl.textContent = stats.replied
    }

    const followupEl = document.getElementById('metric-followups')
    if (followupEl) {
        const totalFollowups = stats.followups.overdue.length + stats.followups.upcoming.length
        followupEl.textContent = totalFollowups
    }

    const replyRateEl = document.getElementById('metric-reply-rate')
    if (replyRateEl) {
        replyRateEl.textContent = `${stats.replyRate}%`
    }
}

function renderOverviewCards(stats) {
    const container = document.getElementById('professors-overview')
    if (!container) return

    const waiting = Math.max(
        stats.sent - stats.replied - stats.accepted - stats.interview - stats.rejected,
        0
    )
    const overdue = stats.followups.overdue.length
    const upcoming = stats.followups.upcoming.length

    container.innerHTML = `
        <div class="overview-card">
            <p class="overview-label">等待反馈</p>
            <div class="overview-value">${waiting}</div>
            <p class="overview-desc">已发送但尚未收到回复</p>
        </div>
        <div class="overview-card accent-warning">
            <p class="overview-label">逾期待办</p>
            <div class="overview-value">${overdue}</div>
            <p class="overview-desc">需要立即跟进的导师</p>
        </div>
        <div class="overview-card accent-info">
            <p class="overview-label">即将跟进</p>
            <div class="overview-value">${upcoming}</div>
            <p class="overview-desc">未来 48 小时内的提醒</p>
        </div>
    `
}

function renderStatusPills(state, stats) {
    const container = document.getElementById('status-pills')
    if (!container) return

    const pills = [
        {
            key: '',
            label: '全部',
            count: stats.total
        },
        ...stats.statusSequence
    ]

    container.innerHTML = pills.map(({ key, label, count }) => {
        const isActive = (state.filters.status || '') === key
        return `
            <button
                type="button"
                class="status-pill ${isActive ? 'is-active' : ''}"
                data-status-filter="${key}"
            >
                <span>${label}</span>
                <span class="status-count">${count}</span>
            </button>
        `
    }).join('')
}

function renderInsights(stats) {
    const panel = document.getElementById('insights-panel')
    if (!panel) return

    if (!stats.todos || stats.todos.length === 0) {
        panel.innerHTML = `
            <div class="insight-empty">
                <span>👏</span>
                <p>暂无提醒，保持节奏！</p>
            </div>
        `
        return
    }

    const severityClass = {
        danger: 'insight-card-danger',
        warning: 'insight-card-warning',
        info: 'insight-card-info'
    }

    panel.innerHTML = `
        <div class="insight-grid">
            ${stats.todos.slice(0, 3).map(todo => `
                <div class="insight-card ${severityClass[todo.severity] || 'insight-card-info'}">
                    <p class="insight-message">${todo.message}</p>
                    <button
                        type="button"
                        data-professor="${todo.professorId}"
                        class="insight-action"
                        onclick="viewProfessorFromTodo('${todo.professorId}')"
                    >
                        查看
                    </button>
                </div>
            `).join('')}
        </div>
    `
}
