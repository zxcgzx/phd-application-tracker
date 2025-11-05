#!/usr/bin/env node
/**
 * 从指定学校官网抓取导师名单并写入 Supabase
 * 仅提取姓名和主页链接，其他字段保留在数据库默认值
 */

const cheerio = require('cheerio')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ 未检测到 Supabase 配置，请在运行前设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_KEY。')
    process.exit(1)
}

const UNIVERSITIES = [
    {
        id: 'dcac664c-a897-4bac-b6ee-9ff8e166da84',
        name: '北京航空航天大学自动化科学与电气工程学院',
        listUrl: 'https://dept3.buaa.edu.cn/szjs/yjsds/bssds.htm',
        parser: parseBeihang
    },
    {
        id: '9804ad05-50a7-4b0e-bf31-29582f7a2815',
        name: '华北电力大学电气与电子工程学院',
        listUrl: 'https://electric.ncepu.edu.cn/szdw/xyjj6/index.htm',
        parser: parseNcepu
    }
]

async function fetchText(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PhDTrackerBot/1.0)'
        }
    })
    if (!response.ok) {
        throw new Error(`请求失败 ${response.status} ${url}`)
    }
    return await response.text()
}

function absoluteUrl(href, base) {
    try {
        return new URL(href, base).href
    } catch (error) {
        return null
    }
}

function parseBeihang(html, base) {
    const $ = cheerio.load(html)
    const results = []

    $('div.sz_js_nr a').each((_, element) => {
        const name = $(element).text().trim()
        const href = $(element).attr('href')
        if (!name || !href) return
        const url = absoluteUrl(href, base)
        if (!url) return
        results.push({ name, homepage: url })
    })

    return deduplicate(results)
}

function parseNcepu(html, base) {
    const $ = cheerio.load(html)
    const results = []

    $('ul.subLightYearsList li a').each((_, element) => {
        const name = $(element).text().trim()
        const href = $(element).attr('href')
        if (!name || !href) return
        const url = absoluteUrl(href, base)
        if (!url) return
        results.push({ name, homepage: url })
    })

    return deduplicate(results)
}

function deduplicate(items) {
    const seen = new Set()
    return items.filter(item => {
        if (seen.has(item.name)) return false
        seen.add(item.name)
        return true
    })
}

async function fetchExistingNames(universityId) {
    const url = `${SUPABASE_URL}/rest/v1/professors?select=name&university_id=eq.${universityId}`
    const response = await fetch(url, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    })
    if (!response.ok) {
        throw new Error(`读取已有导师失败 ${response.statusText}`)
    }
    const data = await response.json()
    return new Set(data.map(item => item.name))
}

async function insertProfessors(university, professors) {
    if (professors.length === 0) {
        console.log(`⚠️  ${university.name} 没有可新增的导师`)
        return
    }

    const payload = professors.map(item => ({
        university_id: university.id,
        name: item.name,
        homepage: item.homepage,
        profile_url: item.homepage,
        is_active: true
    }))

    const response = await fetch(`${SUPABASE_URL}/rest/v1/professors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`写入 Supabase 失败: ${response.status} ${text}`)
    }

    const inserted = await response.json()
    console.log(`✅ ${university.name} 成功新增 ${inserted.length} 位导师`)
}

async function main() {
    for (const university of UNIVERSITIES) {
        console.log(`\n=== 处理 ${university.name} ===`)
        const html = await fetchText(university.listUrl)
        const parsed = university.parser(html, university.listUrl)
        console.log(`抓取名单 ${parsed.length} 人`)

        const existing = await fetchExistingNames(university.id)
        const toInsert = parsed.filter(item => !existing.has(item.name))

        console.log(`过滤重复后新增 ${toInsert.length} 人`)
        await insertProfessors(university, toInsert)
    }
}

main().catch(error => {
    console.error('导入流程失败:', error)
    process.exit(1)
})
