/**
 * 数据导入功能模块
 * 支持CSV文件导入导师数据
 */

import { supabase } from '../../supabase-config.js'
import { showToast } from '../../core/feedback.js'
import { state } from '../../core/store.js'

/**
 * 初始化数据导入功能
 */
export function initDataImport() {
    const importBtn = document.getElementById('import-data-btn')
    const modal = document.getElementById('import-modal')
    const closeBtn = document.getElementById('import-modal-close')
    const fileInput = document.getElementById('csv-file-input')
    const dropZone = document.getElementById('csv-drop-zone')
    const previewContainer = document.getElementById('import-preview-container')
    const importButton = document.getElementById('execute-import-btn')
    const downloadTemplateBtn = document.getElementById('download-template-btn')

    if (!importBtn || !modal) return

    // 打开导入模态框
    importBtn.addEventListener('click', () => {
        modal.classList.remove('hidden')
        resetImportState()
    })

    // 关闭模态框
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden')
            resetImportState()
        })
    }

    // 点击外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden')
            resetImportState()
        }
    })

    // 文件选择
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (file) handleFile(file)
        })
    }

    // 拖放上传
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault()
            dropZone.classList.add('drag-over')
        })

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over')
        })

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault()
            dropZone.classList.remove('drag-over')
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
        })

        dropZone.addEventListener('click', () => {
            fileInput.click()
        })
    }

    // 下载模板
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadTemplate)
    }

    // 执行导入
    if (importButton) {
        importButton.addEventListener('click', executeImport)
    }
}

// 导入状态
let importState = {
    parsedData: [],
    validData: [],
    errors: []
}

/**
 * 重置导入状态
 */
function resetImportState() {
    importState = {
        parsedData: [],
        validData: [],
        errors: []
    }

    const fileInput = document.getElementById('csv-file-input')
    const previewContainer = document.getElementById('import-preview-container')
    const importButton = document.getElementById('execute-import-btn')

    if (fileInput) fileInput.value = ''
    if (previewContainer) previewContainer.innerHTML = ''
    if (importButton) importButton.disabled = true
}

/**
 * 处理上传的文件
 */
async function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showToast('请上传CSV格式的文件', 'error')
        return
    }

    try {
        const text = await readFileAsText(file)
        const parsed = parseCSV(text)

        if (parsed.length === 0) {
            showToast('CSV文件为空或格式错误', 'error')
            return
        }

        importState.parsedData = parsed
        const validated = validateData(parsed)
        importState.validData = validated.valid
        importState.errors = validated.errors

        displayPreview()
        showToast(`成功读取 ${parsed.length} 条记录`)
    } catch (error) {
        console.error('文件处理失败:', error)
        showToast('文件处理失败: ' + error.message, 'error')
    }
}

/**
 * 读取文件为文本
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(new Error('文件读取失败'))
        reader.readAsText(file, 'UTF-8')
    })
}

/**
 * 解析CSV文件
 */
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length === 0) continue

        const row = {}
        headers.forEach((header, index) => {
            row[header] = values[index] || ''
        })
        rows.push(row)
    }

    return rows
}

/**
 * 解析CSV行（处理引号内的逗号）
 */
function parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }

    result.push(current.trim())
    return result.map(v => v.replace(/^["']|["']$/g, ''))
}

/**
 * 验证数据
 */
function validateData(data) {
    const valid = []
    const errors = []

    data.forEach((row, index) => {
        const rowNum = index + 2 // CSV行号（跳过表头）
        const rowErrors = []

        // 必填字段验证
        if (!row['姓名'] || !row['姓名'].trim()) {
            rowErrors.push(`第${rowNum}行：姓名不能为空`)
        }

        if (!row['学校名称'] || !row['学校名称'].trim()) {
            rowErrors.push(`第${rowNum}行：学校名称不能为空`)
        }

        // 邮箱格式验证（如果提供）
        if (row['邮箱'] && row['邮箱'].trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(row['邮箱'].trim())) {
                rowErrors.push(`第${rowNum}行：邮箱格式不正确`)
            }
        }

        if (rowErrors.length > 0) {
            errors.push(...rowErrors)
        } else {
            valid.push(row)
        }
    })

    return { valid, errors }
}

/**
 * 显示数据预览
 */
function displayPreview() {
    const container = document.getElementById('import-preview-container')
    const importButton = document.getElementById('execute-import-btn')

    if (!container) return

    const { validData, errors } = importState

    let html = '<div class="import-preview">'

    // 显示统计信息
    html += `
        <div class="import-stats">
            <div class="stat-item stat-total">
                <span class="stat-label">总记录数</span>
                <span class="stat-value">${importState.parsedData.length}</span>
            </div>
            <div class="stat-item stat-valid">
                <span class="stat-label">有效记录</span>
                <span class="stat-value">${validData.length}</span>
            </div>
            <div class="stat-item stat-error">
                <span class="stat-label">错误记录</span>
                <span class="stat-value">${errors.length}</span>
            </div>
        </div>
    `

    // 显示错误信息
    if (errors.length > 0) {
        html += '<div class="import-errors">'
        html += '<h4>数据验证错误：</h4>'
        html += '<ul>'
        errors.slice(0, 10).forEach(error => {
            html += `<li>${error}</li>`
        })
        if (errors.length > 10) {
            html += `<li>...还有 ${errors.length - 10} 个错误</li>`
        }
        html += '</ul>'
        html += '</div>'
    }

    // 显示数据预览表格
    if (validData.length > 0) {
        html += '<div class="import-table-wrapper">'
        html += '<h4>有效数据预览（前10条）：</h4>'
        html += '<table class="import-preview-table">'
        html += '<thead><tr>'
        html += '<th>姓名</th><th>职称</th><th>学校</th><th>学院</th><th>邮箱</th>'
        html += '</tr></thead>'
        html += '<tbody>'

        validData.slice(0, 10).forEach(row => {
            html += '<tr>'
            html += `<td>${escapeHtml(row['姓名'] || '')}</td>`
            html += `<td>${escapeHtml(row['职称'] || '')}</td>`
            html += `<td>${escapeHtml(row['学校名称'] || '')}</td>`
            html += `<td>${escapeHtml(row['学院'] || '')}</td>`
            html += `<td>${escapeHtml(row['邮箱'] || '')}</td>`
            html += '</tr>'
        })

        html += '</tbody></table>'
        html += '</div>'
    }

    html += '</div>'
    container.innerHTML = html

    // 启用/禁用导入按钮
    if (importButton) {
        importButton.disabled = validData.length === 0
    }
}

/**
 * 执行导入
 */
async function executeImport() {
    const { validData } = importState

    if (validData.length === 0) {
        showToast('没有可导入的数据', 'error')
        return
    }

    const confirmed = confirm(`确定要导入 ${validData.length} 条记录吗？`)
    if (!confirmed) return

    const importButton = document.getElementById('execute-import-btn')
    if (importButton) {
        importButton.disabled = true
        importButton.textContent = '导入中...'
    }

    let successCount = 0
    let failCount = 0
    const failedRecords = []

    showToast(`开始导入 ${validData.length} 条记录...`, 'info')

    for (let i = 0; i < validData.length; i++) {
        const row = validData[i]

        try {
            // 查找或创建学校
            const universityId = await findOrCreateUniversity(row['学校名称'].trim())

            if (!universityId) {
                throw new Error('无法创建学校记录')
            }

            // 处理研究方向（分号分隔）
            const researchAreas = row['研究方向']
                ? row['研究方向'].split(/[;；]/).map(s => s.trim()).filter(s => s)
                : []

            // 插入导师记录
            const professorData = {
                university_id: universityId,
                name: row['姓名'].trim(),
                title: row['职称']?.trim() || null,
                email: row['邮箱']?.trim() || null,
                phone: row['电话']?.trim() || null,
                college: row['学院']?.trim() || null,
                department: row['系所']?.trim() || null,
                research_areas: researchAreas.length > 0 ? researchAreas : null,
                profile_url: row['主页链接']?.trim() || null,
                homepage: row['主页链接']?.trim() || null,
                is_active: true
            }

            const { data, error } = await supabase
                .from('professors')
                .insert(professorData)
                .select()
                .single()

            if (error) throw error

            successCount++
        } catch (error) {
            console.error(`导入第 ${i + 1} 条记录失败:`, error)
            failCount++
            failedRecords.push({
                row: i + 1,
                name: row['姓名'],
                error: error.message
            })
        }

        // 更新进度
        if (importButton && (i + 1) % 5 === 0) {
            importButton.textContent = `导入中... (${i + 1}/${validData.length})`
        }
    }

    // 显示结果
    if (successCount > 0) {
        showToast(`成功导入 ${successCount} 条记录`)

        // 重新加载数据
        if (typeof window.loadProfessors === 'function') {
            await window.loadProfessors()
        }
        if (typeof window.renderProfessorsList === 'function') {
            window.renderProfessorsList()
        }
    }

    if (failCount > 0) {
        console.error('导入失败的记录:', failedRecords)
        showToast(`${failCount} 条记录导入失败，详情见控制台`, 'error')
    }

    // 重置按钮
    if (importButton) {
        importButton.textContent = '开始导入'
        importButton.disabled = false
    }

    // 如果全部成功，关闭模态框
    if (failCount === 0) {
        setTimeout(() => {
            const modal = document.getElementById('import-modal')
            if (modal) modal.classList.add('hidden')
            resetImportState()
        }, 1500)
    }
}

/**
 * 查找或创建学校
 */
async function findOrCreateUniversity(universityName) {
    // 先查找现有学校
    const { data: existing, error: findError } = await supabase
        .from('universities')
        .select('id')
        .eq('name', universityName)
        .maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
        throw findError
    }

    if (existing) {
        return existing.id
    }

    // 创建新学校
    const { data: newUni, error: createError } = await supabase
        .from('universities')
        .insert({
            name: universityName,
            is_active: true
        })
        .select('id')
        .single()

    if (createError) throw createError

    // 更新本地state
    if (newUni && typeof window.loadUniversities === 'function') {
        await window.loadUniversities()
    }

    return newUni.id
}

/**
 * 下载CSV模板
 */
function downloadTemplate() {
    const template = `姓名,职称,学校名称,学院,系所,邮箱,电话,研究方向,主页链接
张三,教授,清华大学,电子工程系,自动化系,zhangsan@example.com,010-12345678,人工智能;机器学习;深度学习,https://example.com/zhangsan
李四,副教授,北京大学,信息科学技术学院,计算机系,lisi@example.com,010-87654321,计算机视觉;图像处理,https://example.com/lisi`

    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '导师导入模板.csv'
    link.click()

    showToast('模板下载成功')
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}
