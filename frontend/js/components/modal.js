/**
 * 通用Modal对话框组件
 * 替代原生的prompt和confirm对话框，提供更好的用户体验
 */

class ModalManager {
    constructor() {
        this.currentModal = null
        this.modalStack = []
        this.init()
    }

    init() {
        // 监听ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close()
            }
        })
    }

    /**
     * 显示确认对话框
     * @param {Object} options - 配置选项
     * @returns {Promise<boolean>} 用户选择结果
     */
    async confirm(options = {}) {
        const {
            title = '确认操作',
            message = '确定要继续吗？',
            confirmText = '确定',
            cancelText = '取消',
            type = 'default', // default, danger, warning
            details = null, // 额外的详细信息
        } = options

        return new Promise((resolve) => {
            const modalHTML = `
                <div class="custom-modal-overlay" id="custom-modal">
                    <div class="custom-modal ${type}">
                        <div class="custom-modal-header">
                            <h3>${this.escapeHtml(title)}</h3>
                            <button class="custom-modal-close" id="modal-close-btn" type="button" aria-label="关闭">&times;</button>
                        </div>
                        <div class="custom-modal-body">
                            <p>${this.escapeHtml(message)}</p>
                            ${details ? `<div class="custom-modal-details">${this.escapeHtml(details)}</div>` : ''}
                        </div>
                        <div class="custom-modal-footer">
                            <button class="custom-modal-btn-cancel" id="modal-cancel-btn" type="button">${this.escapeHtml(cancelText)}</button>
                            <button class="custom-modal-btn-confirm ${type}" id="modal-confirm-btn" type="button">${this.escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `

            this.show(modalHTML)

            // 绑定事件
            document.getElementById('modal-confirm-btn').addEventListener('click', () => {
                this.close()
                resolve(true)
            })

            document.getElementById('modal-cancel-btn').addEventListener('click', () => {
                this.close()
                resolve(false)
            })

            document.getElementById('modal-close-btn').addEventListener('click', () => {
                this.close()
                resolve(false)
            })

            // 点击外部关闭
            document.getElementById('custom-modal').addEventListener('click', (e) => {
                if (e.target.id === 'custom-modal') {
                    this.close()
                    resolve(false)
                }
            })

            // 聚焦到确认按钮
            setTimeout(() => {
                document.getElementById('modal-confirm-btn')?.focus()
            }, 100)
        })
    }

    /**
     * 显示输入对话框
     * @param {Object} options - 配置选项
     * @returns {Promise<string|null>} 用户输入的值或null
     */
    async prompt(options = {}) {
        const {
            title = '请输入',
            message = '',
            placeholder = '',
            defaultValue = '',
            inputType = 'text', // text, number, email, date
            required = true,
            validator = null, // 自定义验证函数
            confirmText = '确定',
            cancelText = '取消',
        } = options

        return new Promise((resolve) => {
            const inputId = 'modal-input-' + Date.now()
            const errorId = 'modal-error-' + Date.now()

            const modalHTML = `
                <div class="custom-modal-overlay" id="custom-modal">
                    <div class="custom-modal">
                        <div class="custom-modal-header">
                            <h3>${this.escapeHtml(title)}</h3>
                            <button class="custom-modal-close" id="modal-close-btn" type="button" aria-label="关闭">&times;</button>
                        </div>
                        <div class="custom-modal-body">
                            ${message ? `<p>${this.escapeHtml(message)}</p>` : ''}
                            <input
                                type="${inputType}"
                                id="${inputId}"
                                class="custom-modal-input"
                                placeholder="${this.escapeHtml(placeholder)}"
                                value="${this.escapeHtml(defaultValue)}"
                                ${required ? 'required' : ''}
                            />
                            <div class="custom-modal-error" id="${errorId}"></div>
                        </div>
                        <div class="custom-modal-footer">
                            <button class="custom-modal-btn-cancel" id="modal-cancel-btn" type="button">${this.escapeHtml(cancelText)}</button>
                            <button class="custom-modal-btn-confirm" id="modal-confirm-btn" type="button">${this.escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `

            this.show(modalHTML)

            const input = document.getElementById(inputId)
            const errorDiv = document.getElementById(errorId)

            const validate = () => {
                const value = input.value.trim()

                if (required && !value) {
                    errorDiv.textContent = '此字段不能为空'
                    return false
                }

                if (validator) {
                    const validationResult = validator(value)
                    if (validationResult !== true) {
                        errorDiv.textContent = validationResult
                        return false
                    }
                }

                errorDiv.textContent = ''
                return true
            }

            const handleConfirm = () => {
                if (validate()) {
                    const value = input.value.trim()
                    this.close()
                    resolve(value)
                }
            }

            // 绑定事件
            document.getElementById('modal-confirm-btn').addEventListener('click', handleConfirm)

            document.getElementById('modal-cancel-btn').addEventListener('click', () => {
                this.close()
                resolve(null)
            })

            document.getElementById('modal-close-btn').addEventListener('click', () => {
                this.close()
                resolve(null)
            })

            // 回车确认
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleConfirm()
                }
            })

            // 实时验证
            input.addEventListener('input', () => {
                if (errorDiv.textContent) {
                    validate()
                }
            })

            // 点击外部关闭
            document.getElementById('custom-modal').addEventListener('click', (e) => {
                if (e.target.id === 'custom-modal') {
                    this.close()
                    resolve(null)
                }
            })

            // 聚焦到输入框
            setTimeout(() => {
                input.focus()
                input.select()
            }, 100)
        })
    }

    /**
     * 显示自定义内容的对话框
     * @param {Object} options - 配置选项
     * @returns {Promise<any>} 用户操作结果
     */
    async custom(options = {}) {
        const {
            title = '',
            content = '',
            footer = null,
            onClose = null,
            width = null,
        } = options

        return new Promise((resolve) => {
            const modalHTML = `
                <div class="custom-modal-overlay" id="custom-modal">
                    <div class="custom-modal" ${width ? `style="max-width: ${width}px"` : ''}>
                        ${title ? `
                            <div class="custom-modal-header">
                                <h3>${this.escapeHtml(title)}</h3>
                                <button class="custom-modal-close" id="modal-close-btn" type="button" aria-label="关闭">&times;</button>
                            </div>
                        ` : ''}
                        <div class="custom-modal-body" id="modal-custom-body">
                            ${content}
                        </div>
                        ${footer ? `
                            <div class="custom-modal-footer" id="modal-custom-footer">
                                ${footer}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `

            this.show(modalHTML)

            const closeHandler = (result) => {
                if (onClose) onClose(result)
                this.close()
                resolve(result)
            }

            // 关闭按钮
            const closeBtn = document.getElementById('modal-close-btn')
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeHandler(null))
            }

            // 点击外部关闭
            document.getElementById('custom-modal').addEventListener('click', (e) => {
                if (e.target.id === 'custom-modal') {
                    closeHandler(null)
                }
            })

            // 将resolve函数暴露出去，允许自定义按钮调用
            this.currentResolve = closeHandler
        })
    }

    /**
     * 显示Modal
     * @private
     */
    show(html) {
        // 如果已有Modal，先关闭
        if (this.currentModal) {
            this.close()
        }

        // 创建Modal容器
        const container = document.createElement('div')
        container.innerHTML = html
        this.currentModal = container.firstElementChild

        document.body.appendChild(this.currentModal)
        document.body.style.overflow = 'hidden'

        // 添加显示动画
        setTimeout(() => {
            this.currentModal.classList.add('show')
        }, 10)
    }

    /**
     * 关闭当前Modal
     */
    close() {
        if (!this.currentModal) return

        this.currentModal.classList.remove('show')

        setTimeout(() => {
            if (this.currentModal && this.currentModal.parentNode) {
                this.currentModal.parentNode.removeChild(this.currentModal)
            }
            this.currentModal = null
            this.currentResolve = null
            document.body.style.overflow = ''
        }, 300) // 等待动画结束
    }

    /**
     * HTML转义
     * @private
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    /**
     * 解析Modal结果（用于自定义Modal）
     */
    resolve(result) {
        if (this.currentResolve) {
            this.currentResolve(result)
        }
    }
}

// 创建全局单例
const modal = new ModalManager()

// 导出便捷方法
export const showConfirm = (options) => modal.confirm(options)
export const showPrompt = (options) => modal.prompt(options)
export const showCustomModal = (options) => modal.custom(options)
export const closeModal = () => modal.close()
export const resolveModal = (result) => modal.resolve(result)

export default modal
