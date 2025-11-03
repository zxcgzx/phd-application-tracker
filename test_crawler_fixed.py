#!/usr/bin/env python3
"""
验证修复后的爬虫配置 - 使用正确的CSS选择器
"""

import urllib.request
import re
from html.parser import HTMLParser
from urllib.parse import urljoin


class ProfessorListParser(HTMLParser):
    """解析导师列表的HTML"""

    def __init__(self):
        super().__init__()
        self.professors = []
        self.in_list = False
        self.in_li = False
        self.current_prof = {}

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # 检测是否进入正确的列表
        if tag == 'ul':
            classes = attrs_dict.get('class', '')
            if 'list01' in classes and 'list002' in classes:
                self.in_list = True

        # 在列表中的li
        elif tag == 'li' and self.in_list:
            self.in_li = True
            self.current_prof = {}

        # 在li中的链接
        elif tag == 'a' and self.in_li:
            href = attrs_dict.get('href', '')
            if href and href.endswith('.htm'):
                self.current_prof['url'] = href

    def handle_endtag(self, tag):
        if tag == 'ul' and self.in_list:
            self.in_list = False
        elif tag == 'li' and self.in_li:
            if self.current_prof and 'name' in self.current_prof:
                self.professors.append(self.current_prof)
            self.in_li = False
            self.current_prof = {}

    def handle_data(self, data):
        # 在li > a中的文本就是导师姓名
        if self.in_li and self.current_prof and 'url' in self.current_prof:
            text = data.strip()
            if text:
                self.current_prof['name'] = text


def test_with_correct_selector():
    """使用正确的选择器测试"""

    print("=" * 70)
    print("使用修复后的选择器测试爬虫")
    print("=" * 70)
    print()

    # 读取之前保存的HTML
    try:
        with open('/tmp/bit_list_page.html', 'r', encoding='utf-8') as f:
            html = f.read()
        print("✅ 已加载HTML文件\n")
    except:
        print("❌ 未找到 /tmp/bit_list_page.html")
        print("   请先运行 python3 test_crawler_simple.py\n")
        return

    # 解析
    parser = ProfessorListParser()
    parser.feed(html)

    professors = parser.professors

    print(f"选择器: ul.list01.list002 > li > a")
    print(f"找到导师: {len(professors)} 位\n")

    if professors:
        print("=" * 70)
        print("前10位导师信息:")
        print("=" * 70)

        for i, prof in enumerate(professors[:10], 1):
            print(f"\n{i}. {prof['name']}")
            # 转换为绝对URL
            base_url = "https://ac.bit.edu.cn/szdw/dsmd/bssds/index.htm"
            abs_url = urljoin(base_url, prof['url'])
            print(f"   URL: {abs_url}")

        print("\n" + "=" * 70)
        print("导师数量统计:")
        print("=" * 70)
        print(f"总计: {len(professors)} 位博士生导师")

        # 测试第一位导师的详情页
        print("\n" + "=" * 70)
        print("测试访问第一位导师的详情页:")
        print("=" * 70)
        test_detail_page(professors[0], base_url)

    else:
        print("❌ 未能解析出导师信息")


def test_detail_page(prof_info, base_url):
    """测试访问导师详情页"""

    abs_url = urljoin(base_url, prof_info['url'])

    print(f"\n导师: {prof_info['name']}")
    print(f"URL: {abs_url}\n")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        req = urllib.request.Request(abs_url, headers=headers)

        print("正在访问详情页...")
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')

        print(f"✅ 成功! 页面长度: {len(html)} 字符\n")

        # 查找关键信息
        print("页面内容分析:")

        # 邮箱
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, html)
        if emails:
            print(f"  ✓ 邮箱: {emails[0]}")
        else:
            print(f"  ✗ 未找到邮箱")

        # 职称
        if '教授' in html:
            print(f"  ✓ 包含'教授'关键词")
        elif '副教授' in html:
            print(f"  ✓ 包含'副教授'关键词")
        else:
            print(f"  ✗ 未找到职称信息")

        # 研究方向
        if '研究方向' in html or 'Research' in html:
            print(f"  ✓ 包含研究方向相关内容")
        else:
            print(f"  ✗ 未找到研究方向")

        # 保存示例
        sample_file = f'/tmp/bit_professor_{prof_info["name"]}.html'
        with open(sample_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"\n  📄 详情页已保存: {sample_file}")

    except Exception as e:
        print(f"❌ 访问失败: {e}")


def main():
    print("\n" + "=" * 70)
    print("北京理工大学爬虫修复验证")
    print("=" * 70)
    print()

    test_with_correct_selector()

    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    print()
    print("✅ 修复内容:")
    print("   1. 将选择器从 'ul > li' 改为 'ul.list01.list002 > li'")
    print("   2. 这样可以精确定位导师列表,排除导航菜单")
    print()
    print("💡 下一步:")
    print("   1. 如果看到了正确数量的导师,说明修复成功")
    print("   2. 检查详情页是否能正确提取邮箱、职称、研究方向")
    print("   3. 如果一切正常,可以提交修复到GitHub")
    print()


if __name__ == '__main__':
    main()
