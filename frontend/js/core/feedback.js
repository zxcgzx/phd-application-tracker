/**
 * UI 反馈相关工具
 */

export function showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

export function showLoading(container, message = '加载中...') {
    if (!container) return
    container.innerHTML = `
        <div class="col-span-full text-center py-12">
            <div class="loading mx-auto mb-4"></div>
            <p class="text-gray-500">${message}</p>
        </div>
    `
}
