/**
 * 全局状态管理
 * 集中维护应用的业务状态，提供受控的更新方法，避免在不同模块中随意修改。
 */

const defaultFilters = Object.freeze({
    university: '',
    status: '',
    sentBy: '',
    search: ''
})

export const state = {
    currentTab: 'professors',
    professors: [],
    applications: new Map(),
    universities: new Map(),
    currentUser: 'Zhang',
    filters: { ...defaultFilters },
    batchMode: false,
    selectedProfessors: new Set(),
    displayLimit: 24
}

export function resetFilters() {
    state.filters = { ...defaultFilters }
}

export function updateFilters(patch = {}) {
    state.filters = {
        ...state.filters,
        ...patch
    }
}

export function setCurrentTab(tabName) {
    state.currentTab = tabName
}

export function setCurrentUser(userName) {
    state.currentUser = userName
}

export function setProfessors(professors = []) {
    state.professors = professors
}

export function setUniversities(universities = []) {
    state.universities = new Map()
    universities.forEach(uni => {
        if (uni?.id) {
            state.universities.set(uni.id, uni)
        }
    })
}

export function setApplications(applications) {
    if (applications instanceof Map) {
        state.applications = applications
        return
    }

    const next = new Map()
    applications?.forEach(app => {
        if (app?.professor_id) {
            next.set(app.professor_id, app)
        }
    })
    state.applications = next
}

export function upsertApplication(professorId, application) {
    if (!professorId || !application) return
    state.applications.set(professorId, application)
}

export function removeApplication(professorId) {
    state.applications.delete(professorId)
}

export function toggleBatchMode(forceValue) {
    if (typeof forceValue === 'boolean') {
        state.batchMode = forceValue
    } else {
        state.batchMode = !state.batchMode
    }

    if (!state.batchMode) {
        state.selectedProfessors.clear()
    }
}

export function clearBatchSelection() {
    state.selectedProfessors.clear()
}

export function selectProfessor(professorId) {
    if (professorId) {
        state.selectedProfessors.add(professorId)
    }
}

export function deselectProfessor(professorId) {
    if (professorId) {
        state.selectedProfessors.delete(professorId)
    }
}

export function setDisplayLimit(limit) {
    if (typeof limit === 'number' && limit > 0) {
        state.displayLimit = limit
    }
}

export function increaseDisplayLimit(step = 24) {
    if (typeof step === 'number' && step > 0) {
        state.displayLimit += step
    }
}
