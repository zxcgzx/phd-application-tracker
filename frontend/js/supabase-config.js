/**
 * Supabase 配置和客户端初始化
 *
 * 使用说明:
 * 1. 在 Supabase 官网注册账号: https://supabase.com
 * 2. 创建新项目
 * 3. 获取项目的 URL 和 anon key
 * 4. 将下面的值替换为你的实际值
 */

// ⚠️ 请将下面两个常量替换为你 Supabase 项目的真实配置
const SUPABASE_URL = 'https://cacvfqtupprixlmzrury.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY3ZmcXR1cHByaXhsbXpydXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzI1OTMsImV4cCI6MjA3NzcwODU5M30.tEm33FremWW86fPhlUiU2_ZQ4sq5PklaAt5ZkxRNm4I'

// 将配置暴露给其它工具（如 debug.html）
window.__SUPABASE_CONFIG__ = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
}

// 创建 Supabase 客户端
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 检查配置是否有效
export function checkConfig() {
    const missingUrl = !SUPABASE_URL || SUPABASE_URL === 'https://your-project.supabase.co'
    const missingKey = !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-anon-key'

    if (missingUrl || missingKey) {
        console.error(
            '❌ Supabase 配置无效！请在 frontend/js/supabase-config.js 中替换 SUPABASE_URL 与 SUPABASE_ANON_KEY。'
        )
        return false
    }
    return true
}

// 导出配置信息（用于调试）
export const config = {
    url: SUPABASE_URL,
    isConfigured: SUPABASE_URL !== 'https://your-project.supabase.co'
}
