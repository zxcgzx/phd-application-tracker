#!/usr/bin/env python3
"""
数据库诊断脚本 - 检查Supabase中是否有导师数据
"""

import urllib.request
import json
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

def query_table(table_name, select="*", limit=None):
    """查询Supabase表"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("未提供 Supabase 配置")

    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select={select}"
    if limit:
        url += f"&limit={limit}"

    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"❌ 查询失败: {e}")
        return None


def main():
    print("=" * 70)
    print("Supabase 数据库诊断")
    print("=" * 70)
    print()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ 未检测到 Supabase 配置。")
        print("   请在运行前设置环境变量 SUPABASE_URL 以及 SUPABASE_SERVICE_KEY（可选：SUPABASE_ANON_KEY）。")
        print()
        return

    # 1. 检查universities表
    print("1️⃣  检查 universities 表...")
    universities = query_table("universities")

    if universities is not None:
        print(f"   ✅ 找到 {len(universities)} 个学校")
        if universities:
            for uni in universities:
                print(f"      - {uni['name']}")
                print(f"        URL: {uni.get('url', 'N/A')}")
                print(f"        导师数: {uni.get('professors_count', 0)}")
                print(f"        爬取状态: {uni.get('crawl_status', 'unknown')}")
        else:
            print("   ⚠️  universities表是空的!")
    print()

    # 2. 检查professors表
    print("2️⃣  检查 professors 表...")
    professors = query_table("professors", limit=10)

    if professors is not None:
        # 获取总数
        count_data = query_table("professors", select="count")
        total = count_data[0]['count'] if count_data and 'count' in count_data[0] else len(professors)

        print(f"   ✅ 找到 {total} 位导师")

        if professors:
            print(f"   前{min(10, len(professors))}位导师:")
            for i, prof in enumerate(professors[:10], 1):
                print(f"      {i}. {prof.get('name', '未知')}")
                print(f"         邮箱: {prof.get('email', 'N/A')}")
                print(f"         职称: {prof.get('title', 'N/A')}")
        else:
            print("   ⚠️  professors表是空的!")
    else:
        print("   ❌ 无法访问professors表")
    print()

    # 3. 检查applications表
    print("3️⃣  检查 applications 表...")
    applications = query_table("applications")

    if applications is not None:
        print(f"   ✅ 找到 {len(applications)} 条申请记录")
    print()

    # 4. 检查email_templates表
    print("4️⃣  检查 email_templates 表...")
    templates = query_table("email_templates")

    if templates is not None:
        print(f"   ✅ 找到 {len(templates)} 个邮件模板")
        if templates:
            for tpl in templates:
                print(f"      - {tpl.get('name', '未知')}")
    print()

    # 总结
    print("=" * 70)
    print("诊断总结")
    print("=" * 70)

    if professors and len(professors) > 0:
        print("✅ 数据库连接正常")
        print("✅ 导师数据存在")
        print()
        print("💡 如果网页上看不到数据,可能的原因:")
        print("   1. 前端配置的API Key不正确")
        print("   2. 浏览器缓存问题 - 请按 Ctrl+Shift+R 强制刷新")
        print("   3. 前端JavaScript有错误 - 请按F12查看控制台")
    elif universities and len(universities) > 0:
        print("⚠️  数据库连接正常,但没有导师数据")
        print("   学校配置存在,但可能爬虫还未运行成功")
        print()
        print("💡 建议:")
        print("   1. 查看GitHub Actions运行日志")
        print("   2. 手动触发一次爬虫")
    else:
        print("❌ 数据库为空或连接失败")
        print()
        print("💡 建议:")
        print("   1. 检查Supabase项目是否正常运行")
        print("   2. 检查API Key是否正确")
        print("   3. 运行 database/init_all.sql 初始化数据库")

    print()


if __name__ == '__main__':
    main()
