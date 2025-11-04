/**
 * 邮件模板管理组件
 */

import { supabase } from '../supabase-config.js'
import { showToast } from '../core/feedback.js'

export async function renderTemplatesPanel() {
    const container = document.getElementById('templates-panel')

    container.innerHTML = '<div class="text-center py-8"><div class="loading mx-auto"></div></div>'

    try {
        // 加载模板列表
        const { data: templates, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('usage_count', { ascending: false })

        if (error) throw error

        container.innerHTML = `
            <!-- 顶部操作栏 -->
            <div class="mb-6 flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-800">📧 邮件模板管理</h2>
                <button
                    onclick="openTemplateEditor()"
                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    + 新建模板
                </button>
            </div>

            <!-- 模板列表 -->
            ${templates && templates.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${templates.map(tpl => renderTemplateCard(tpl)).join('')}
                </div>
            ` : `
                <div class="bg-white rounded-lg shadow-sm p-12 text-center">
                    <p class="text-gray-400 mb-4">暂无邮件模板</p>
                    <button
                        onclick="openTemplateEditor()"
                        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600"
                    >
                        创建第一个模板
                    </button>
                </div>
            `}
        `

    } catch (error) {
        console.error('加载模板失败:', error)
        container.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p class="text-red-600">❌ 加载失败: ${error.message}</p>
            </div>
        `
    }
}

function renderTemplateCard(tpl) {
    const tags = tpl.tags?.join(', ') || '无标签'
    const preview = tpl.body.substring(0, 100) + (tpl.body.length > 100 ? '...' : '')

    return `
        <div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 mb-1">${tpl.name}</h3>
                    <p class="text-xs text-gray-500">标签: ${tags} | 使用 ${tpl.usage_count || 0} 次</p>
                </div>
            </div>

            <div class="mb-3">
                <p class="text-sm font-medium text-gray-700 mb-1">主题: ${tpl.subject}</p>
                <p class="text-sm text-gray-600 line-clamp-3">${preview}</p>
            </div>

            <div class="flex gap-2">
                <button
                    onclick="useTemplate('${tpl.id}')"
                    class="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors"
                >
                    使用
                </button>
                <button
                    onclick="openTemplateEditor('${tpl.id}')"
                    class="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                >
                    编辑
                </button>
                <button
                    onclick="deleteTemplate('${tpl.id}', '${tpl.name}')"
                    class="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                >
                    删除
                </button>
            </div>
        </div>
    `
}

// 全局函数
window.openTemplateEditor = async function(templateId = null) {
    let template = {
        name: '',
        subject: '',
        body: '',
        tags: []
    }

    if (templateId) {
        // 加载现有模板
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single()

        if (error) {
            alert('加载模板失败: ' + error.message)
            return
        }
        template = data
    }

    const modal = document.getElementById('professor-modal')
    const content = document.getElementById('modal-content')

    content.innerHTML = `
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">×</button>
        <h2 class="text-xl font-bold text-gray-800 mb-4">${templateId ? '编辑' : '新建'}邮件模板</h2>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">模板名称</label>
                <input
                    type="text"
                    id="tpl-name"
                    value="${template.name}"
                    placeholder="例如: 首次联系模板"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">邮件主题</label>
                <input
                    type="text"
                    id="tpl-subject"
                    value="${template.subject}"
                    placeholder="例如: 申请攻读博士学位 - {学校}{院系}"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">邮件正文</label>
                <textarea
                    id="tpl-body"
                    rows="12"
                    placeholder="支持变量: {导师姓名}, {职称}, {学校}, {研究方向}"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                >${template.body}</textarea>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">标签（用逗号分隔）</label>
                <input
                    type="text"
                    id="tpl-tags"
                    value="${template.tags?.join(', ') || ''}"
                    placeholder="例如: 首次联系, 正式"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="text-sm text-blue-800">
                    <strong>支持的变量：</strong><br>
                    {导师姓名}, {职称}, {学校}, {院系}, {研究方向}, {邮箱}
                </p>
            </div>

            <button
                onclick="saveTemplate('${templateId || ''}')"
                class="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
                ${templateId ? '保存修改' : '创建模板'}
            </button>
        </div>
    `

    modal.classList.remove('hidden')
}

window.saveTemplate = async function(templateId) {
    const name = document.getElementById('tpl-name').value.trim()
    const subject = document.getElementById('tpl-subject').value.trim()
    const body = document.getElementById('tpl-body').value.trim()
    const tagsInput = document.getElementById('tpl-tags').value.trim()
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : []

    if (!name || !subject || !body) {
        alert('请填写完整信息')
        return
    }

    try {
        const templateData = { name, subject, body, tags }

        if (templateId) {
            // 更新
            const { error } = await supabase
                .from('email_templates')
                .update(templateData)
                .eq('id', templateId)

            if (error) throw error
        showToast('模板已更新')
        } else {
            // 新建
            const { error } = await supabase
                .from('email_templates')
                .insert(templateData)

            if (error) throw error
        showToast('模板已创建')
        }

        closeModal()
        renderTemplatesPanel()

    } catch (error) {
        console.error('保存失败:', error)
        alert('保存失败: ' + error.message)
    }
}

window.useTemplate = async function(templateId) {
    try {
        const { data: template, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single()

        if (error) throw error

        // 复制到剪贴板
        const text = `主题: ${template.subject}\n\n${template.body}`
        await navigator.clipboard.writeText(text)

        // 增加使用次数
        await supabase
            .from('email_templates')
            .update({ usage_count: (template.usage_count || 0) + 1 })
            .eq('id', templateId)

        showToast('已复制到剪贴板！')

    } catch (error) {
        console.error('使用模板失败:', error)
        alert('使用模板失败: ' + error.message)
    }
}

window.deleteTemplate = async function(id, name) {
    if (!confirm(`确定删除模板 "${name}" 吗？`)) {
        return
    }

    try {
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id)

        if (error) throw error

        showToast(`已删除模板 ${name}`)
        renderTemplatesPanel()

    } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败: ' + error.message)
    }
}
