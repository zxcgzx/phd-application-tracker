/**
 * 骨架屏加载组件
 * 用于首次加载时提供更好的加载体验
 */

/**
 * 生成导师卡片骨架屏HTML
 * @param {number} count - 卡片数量
 * @returns {string} 骨架屏HTML
 */
export function renderProfessorCardsSkeleton(count = 6) {
    let html = ''

    for (let i = 0; i < count; i++) {
        html += `
            <div class="professor-card skeleton-card">
                <div class="skeleton skeleton-header"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton-footer">
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                </div>
            </div>
        `
    }

    return html
}

/**
 * 生成统计卡片骨架屏HTML
 * @returns {string} 骨架屏HTML
 */
export function renderStatsCardsSkeleton() {
    let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">'

    for (let i = 0; i < 6; i++) {
        html += `
            <div class="bg-white rounded-lg shadow-sm p-4 text-center skeleton-card">
                <div class="skeleton skeleton-number mx-auto"></div>
                <div class="skeleton skeleton-text short mx-auto mt-2"></div>
            </div>
        `
    }

    html += '</div>'
    return html
}

/**
 * 生成时间线骨架屏HTML
 * @returns {string} 骨架屏HTML
 */
export function renderTimelineSkeleton() {
    let html = '<div class="timeline-skeleton">'

    for (let i = 0; i < 5; i++) {
        html += `
            <div class="timeline-item-skeleton">
                <div class="skeleton skeleton-circle"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `
    }

    html += '</div>'
    return html
}

/**
 * 生成通用列表骨架屏HTML
 * @param {number} rows - 行数
 * @returns {string} 骨架屏HTML
 */
export function renderListSkeleton(rows = 5) {
    let html = '<div class="list-skeleton">'

    for (let i = 0; i < rows; i++) {
        html += `
            <div class="list-item-skeleton">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        `
    }

    html += '</div>'
    return html
}

/**
 * 显示加载骨架屏
 * @param {HTMLElement} container - 容器元素
 * @param {string} type - 骨架屏类型 (cards|stats|timeline|list)
 * @param {number} count - 元素数量
 */
export function showSkeleton(container, type = 'cards', count = 6) {
    if (!container) return

    let skeletonHTML = ''

    switch (type) {
        case 'cards':
            skeletonHTML = renderProfessorCardsSkeleton(count)
            break
        case 'stats':
            skeletonHTML = renderStatsCardsSkeleton()
            break
        case 'timeline':
            skeletonHTML = renderTimelineSkeleton()
            break
        case 'list':
            skeletonHTML = renderListSkeleton(count)
            break
        default:
            skeletonHTML = renderProfessorCardsSkeleton(count)
    }

    container.innerHTML = skeletonHTML
}

/**
 * 隐藏加载骨架屏
 * @param {HTMLElement} container - 容器元素
 */
export function hideSkeleton(container) {
    if (!container) return
    container.innerHTML = ''
}
