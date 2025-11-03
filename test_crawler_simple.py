#!/usr/bin/env python3
"""
简单的爬虫测试脚本 - 无需安装依赖
"""

import urllib.request
import re
from html.parser import HTMLParser


class SimpleHTMLParser(HTMLParser):
    """简单的HTML解析器"""

    def __init__(self):
        super().__init__()
        self.links = []
        self.current_tag = None
        self.current_attrs = {}

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        self.current_attrs = dict(attrs)

        # 如果是链接,记录下来
        if tag == 'a' and 'href' in self.current_attrs:
            self.links.append({
                'href': self.current_attrs['href'],
                'text': ''
            })

    def handle_data(self, data):
        # 如果在链接内,记录文本
        if self.current_tag == 'a' and self.links:
            self.links[-1]['text'] += data.strip()


def test_fetch_page():
    """测试1: 能否访问北理工网站"""
    url = "https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm"

    print("=" * 60)
    print("测试1: 访问北理工导师列表页")
    print("=" * 60)
    print(f"URL: {url}\n")

    try:
        # 创建请求
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        req = urllib.request.Request(url, headers=headers)

        # 发送请求
        print("正在发送请求...")
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')

        print(f"✅ 成功! 响应长度: {len(html)} 字符\n")

        # 保存HTML用于调试
        with open('/tmp/bit_list_page.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("✅ HTML已保存到: /tmp/bit_list_page.html\n")

        return html

    except Exception as e:
        print(f"❌ 失败: {e}\n")
        return None


def test_parse_links(html):
    """测试2: 解析导师链接"""

    print("=" * 60)
    print("测试2: 解析导师链接")
    print("=" * 60)

    try:
        parser = SimpleHTMLParser()
        parser.feed(html)

        # 筛选出可能是导师详情页的链接
        professor_links = []
        for link in parser.links:
            href = link['href']
            text = link['text']

            # 假设导师页面包含某些特征
            if text and len(text) > 0 and len(text) < 20:  # 姓名通常很短
                # 排除导航链接
                if 'index' not in href.lower() and 'list' not in href.lower():
                    professor_links.append(link)

        print(f"找到 {len(professor_links)} 个可能的导师链接\n")

        # 显示前5个
        print("前5个链接:")
        for i, link in enumerate(professor_links[:5], 1):
            print(f"  {i}. {link['text']}")
            print(f"     URL: {link['href']}\n")

        return professor_links

    except Exception as e:
        print(f"❌ 解析失败: {e}\n")
        return []


def test_extract_emails(html):
    """测试3: 提取邮箱"""

    print("=" * 60)
    print("测试3: 提取邮箱地址")
    print("=" * 60)

    # 邮箱正则
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(email_pattern, html)

    # 去重
    emails = list(set(emails))

    print(f"找到 {len(emails)} 个邮箱地址\n")

    if emails:
        print("示例邮箱:")
        for email in emails[:5]:
            print(f"  - {email}")

    print()
    return emails


def analyze_html_structure(html):
    """测试4: 分析HTML结构"""

    print("=" * 60)
    print("测试4: HTML结构分析")
    print("=" * 60)

    # 统计常见标签
    tags = {
        '<ul': html.count('<ul'),
        '<li': html.count('<li'),
        '<div': html.count('<div'),
        '<a': html.count('<a'),
        '<span': html.count('<span'),
    }

    print("标签统计:")
    for tag, count in tags.items():
        print(f"  {tag}: {count}")

    print()

    # 查找包含"教授"的内容
    if '教授' in html or '副教授' in html:
        print("✅ 页面包含'教授'/'副教授'关键词")
    else:
        print("⚠️  页面不包含'教授'关键词")

    # 查找列表结构
    if '<ul' in html and '<li' in html:
        print("✅ 页面包含列表结构 (ul/li)")

    print()


def main():
    """主测试流程"""

    print("\n" + "=" * 60)
    print("北京理工大学爬虫测试")
    print("=" * 60 + "\n")

    # 测试1: 访问页面
    html = test_fetch_page()
    if not html:
        print("❌ 无法访问页面,测试终止")
        return

    # 测试2: 解析链接
    links = test_parse_links(html)

    # 测试3: 提取邮箱
    emails = test_extract_emails(html)

    # 测试4: 分析结构
    analyze_html_structure(html)

    # 总结
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"✓ 页面可访问: 是")
    print(f"✓ 导师链接数: {len(links)}")
    print(f"✓ 邮箱地址数: {len(emails)}")
    print(f"✓ HTML文件: /tmp/bit_list_page.html")
    print()

    print("💡 下一步:")
    print("  1. 检查 /tmp/bit_list_page.html 确认HTML结构")
    print("  2. 根据实际结构调整 crawler/config.yaml 中的选择器")
    print("  3. 如果链接数为0,需要更新 list_page.container_selector")
    print()


if __name__ == '__main__':
    main()
