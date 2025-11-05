/**
 * 防抖函数工具
 * 延迟执行函数,在指定时间内如果再次触发则重新计时
 *
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 延迟时间(毫秒)
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout

    return function executedFunction(...args) {
        const context = this

        const later = () => {
            timeout = null
            if (!immediate) func.apply(context, args)
        }

        const callNow = immediate && !timeout

        clearTimeout(timeout)
        timeout = setTimeout(later, wait)

        if (callNow) func.apply(context, args)
    }
}

/**
 * 节流函数工具
 * 限制函数在指定时间内只能执行一次
 *
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 节流时间(毫秒)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, wait = 300) {
    let timeout
    let previous = 0

    return function executedFunction(...args) {
        const context = this
        const now = Date.now()

        const remaining = wait - (now - previous)

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout)
                timeout = null
            }
            previous = now
            func.apply(context, args)
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now()
                timeout = null
                func.apply(context, args)
            }, remaining)
        }
    }
}
