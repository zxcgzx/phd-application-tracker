/**
 * 统计数据计算核心
 * 将统计逻辑集中管理，便于在多个组件中复用并保持一致性。
 */

const STATUS_SEQUENCE = [
    '待发送',
    '已发送',
    '已读',
    '已回复',
    '待面试',
    '已接受',
    '已拒绝'
]

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

export function calculateStats(state) {
    const stats = {
        total: state.professors.length,
        sent: 0,
        replied: 0,
        interview: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
        replyRate: 0,
        byUniversity: new Map(),
        byOperator: new Map(),
        byStatus: new Map(),
        todos: [],
        followups: {
            overdue: [],
            upcoming: []
        }
    }

    state.professors.forEach(prof => {
        const app = state.applications.get(prof.id)
        const status = app?.status || '待发送'

        incrementMapValue(stats.byStatus, status)

        switch (status) {
            case '已发送':
            case '已读':
                stats.sent++
                break
            case '已回复':
                stats.sent++
                stats.replied++
                break
            case '待面试':
                stats.sent++
                stats.interview++
                break
            case '已接受':
                stats.sent++
                stats.accepted++
                break
            case '已拒绝':
                stats.rejected++
                break
            default:
                stats.pending++
                break
        }

        const uniName = resolveUniversityName(prof, state)
        const uniStats = stats.byUniversity.get(uniName) || { total: 0, sent: 0, replied: 0 }
        uniStats.total++
        if (status !== '待发送') uniStats.sent++
        if (status === '已回复' || status === '待面试' || status === '已接受') uniStats.replied++
        stats.byUniversity.set(uniName, uniStats)

        const operator = app?.sent_by || '无'
        const opStats = stats.byOperator.get(operator) || { total: 0, replied: 0 }
        opStats.total++
        if (status === '已回复') opStats.replied++
        stats.byOperator.set(operator, opStats)

        if (app && app.sent_at && !app.replied_at) {
            const daysSinceSent = Math.floor(
                (Date.now() - new Date(app.sent_at).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceSent >= 7) {
                const severity = daysSinceSent >= 14 ? 'danger' : 'warning'
                const todo = {
                    type: 'follow-up',
                    message: `${prof.name} 已发送 ${daysSinceSent} 天未回复`,
                    professorId: prof.id,
                    severity
                }
                stats.todos.push(todo)
                if (severity === 'danger') {
                    stats.followups.overdue.push(todo)
                } else {
                    stats.followups.upcoming.push(todo)
                }
            }
        }

        if (app?.next_followup_at) {
            const nextFollowupDate = new Date(app.next_followup_at)
            if (!Number.isNaN(nextFollowupDate.getTime())) {
                const diffMs = nextFollowupDate.getTime() - Date.now()
                const dueText = nextFollowupDate.toLocaleString('zh-CN', { hour12: false })
                if (diffMs <= 0) {
                    const overdueHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)))
                    const todo = {
                        type: 'follow-up-due',
                        message: `${prof.name} 的跟进已逾期 ${overdueHours} 小时，计划时间 ${dueText}`,
                        professorId: prof.id,
                        severity: 'danger'
                    }
                    stats.todos.push(todo)
                    stats.followups.overdue.push(todo)
                } else if (diffMs <= 48 * 60 * 60 * 1000) {
                    const remainingHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
                    const todo = {
                        type: 'follow-up-soon',
                        message: `${prof.name} 还有 ${remainingHours} 小时到预定跟进时间 (${dueText})`,
                        professorId: prof.id,
                        severity: 'warning'
                    }
                    stats.todos.push(todo)
                    stats.followups.upcoming.push(todo)
                }
            }
        }
    })

    if (stats.sent > 0) {
        stats.replyRate = Math.round((stats.replied / stats.sent) * 100)
    }

    stats.statusSequence = STATUS_SEQUENCE.map(status => ({
        key: status,
        label: status,
        count: stats.byStatus.get(status) || 0
    }))

    stats.followups.overdue.sort(sortTodoBySeverity)
    stats.followups.upcoming.sort(sortTodoBySeverity)

    return stats
}

function incrementMapValue(map, key) {
    map.set(key, (map.get(key) || 0) + 1)
}

function sortTodoBySeverity(a, b) {
    return (a.severity === 'danger' ? -1 : 1) - (b.severity === 'danger' ? -1 : 1)
}
