/**
 * 导师列表组件
 */

// 渲染导师卡片
export function renderProfessorCard(professor, application, state) {
    const status = application?.status || '待发送'
    const priority = application?.priority || 3
    const matchScore = application?.match_score || 0
    const sentBy = application?.sent_by || ''
    const uniName = professor.universities?.name || '未知学校'

    // 研究方向标签
    const researchTags = (professor.research_areas || [])
        .slice(0, 3)
        .map(area => `<span class="research-tag">${area}</span>`)
        .join('')

    // 优先级星星
    const stars = Array.from({ length: 5 }, (_, i) => {
        const filled = i < priority
        return `<span class="priority-star ${filled ? '' : 'empty'}">★</span>`
    }).join('')

    // 批量选择复选框
    const batchCheckbox = state.batchMode
        ? `<input type="checkbox" class="batch-checkbox absolute top-3 left-3 w-5 h-5" data-professor-id="${professor.id}">`
        : ''

    return `
        <div class="professor-card bg-white rounded-lg shadow-sm p-4 relative hover:shadow-md transition-shadow">
            ${batchCheckbox}

            <!-- 头部 -->
            <div class="flex items-start justify-between mb-3 ${state.batchMode ? 'ml-7' : ''}">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-800">${professor.name}</h3>
                    <p class="text-sm text-gray-500">${professor.title || '未知职称'}</p>
                </div>
                <span class="status-badge status-${status}">${status}</span>
            </div>

            <!-- 学校 -->
            <p class="text-sm text-gray-600 mb-2">
                🏫 ${uniName}
            </p>

            <!-- 研究方向 -->
            <div class="mb-3">
                <p class="text-xs text-gray-500 mb-1">🔬 研究方向:</p>
                <div class="flex flex-wrap">
                    ${researchTags || '<span class="text-xs text-gray-400">未填写</span>'}
                </div>
            </div>

            <!-- 联系方式 -->
            ${professor.email ? `
                <p class="text-sm text-gray-600 mb-2 truncate">
                    📧 ${professor.email}
                </p>
            ` : ''}

            <!-- 申请信息 -->
            ${application ? `
                <div class="border-t pt-3 mt-3 text-xs text-gray-500">
                    <div class="flex justify-between items-center">
                        <span>发送人: ${sentBy}</span>
                        ${matchScore > 0 ? `<span>匹配度: ${'⭐'.repeat(matchScore)}</span>` : ''}
                    </div>
                    ${application.sent_at ? `
                        <p class="mt-1">⏰ ${new Date(application.sent_at).toLocaleDateString('zh-CN')}</p>
                    ` : ''}
                </div>
            ` : ''}

            <!-- 操作按钮 -->
            <div class="mt-4 flex gap-2">
                <button
                    data-action="view-detail"
                    data-professor-id="${professor.id}"
                    class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                    查看详情
                </button>
                ${status === '待发送' ? `
                    <button
                        data-action="mark-sent"
                        data-professor-id="${professor.id}"
                        class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                        标记已发送
                    </button>
                ` : ''}
            </div>
        </div>
    `
}

// 打开导师详情弹窗
export function openProfessorModal(professor, application, state) {
    const modal = document.getElementById('professor-modal')
    const content = document.getElementById('modal-content')

    const status = application?.status || '待发送'
    const researchAreas = (professor.research_areas || []).join('、') || '未填写'

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

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                        <textarea
                            id="update-notes"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="添加备注..."
                        >${application.notes || ''}</textarea>
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

    try {
        const { supabase } = await import('../supabase-config.js')

        const updateData = {
            status,
            notes,
            updated_at: new Date().toISOString()
        }

        // 如果状态变为"已回复"，记录回复时间
        if (status === '已回复') {
            updateData.replied_at = new Date().toISOString()
        }

        const { error } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', applicationId)

        if (error) throw error

        window.showToast('更新成功')
        window.closeModal()

        // 更新本地状态而不是刷新页面
        if (window.appState) {
            const profId = window.appState.applications.get(applicationId)?.professor_id
            if (profId) {
                window.appState.applications.set(profId, {
                    ...window.appState.applications.get(profId),
                    status,
                    notes,
                    replied_at: status === '已回复' ? new Date().toISOString() : undefined
                })
            }
        }

        // 触发列表重新渲染
        if (window.renderProfessorsList) {
            window.renderProfessorsList()
        }

    } catch (error) {
        console.error('更新失败:', error)
        window.showToast('更新失败: ' + error.message, 'error')
    }
}
