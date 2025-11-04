"""
基础爬虫类
所有爬虫的父类，定义通用接口和工具方法
"""

import re
import time
import random
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup


class BaseScraper:
    """基础爬虫类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化爬虫

        Args:
            config: 爬虫配置字典，包含 URL、选择器等
        """
        self.config = config
        self.name = config.get('name', '未知学校')
        self.base_url = config.get('url')
        self.scraper_type = config.get('scraper_type', 'two_level')

        # 全局设置
        self.request_delay = config.get('settings', {}).get('request_delay', 1.0)
        self.timeout = config.get('settings', {}).get('timeout', 30)
        self.max_retries = config.get('settings', {}).get('max_retries', 3)
        self.user_agent = config.get('settings', {}).get(
            'user_agent',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )

        # 会话
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})

        # 统计信息
        self.stats = {
            'requests_made': 0,
            'professors_found': 0,
            'errors': []
        }

    def fetch_page(self, url: str) -> Optional[str]:
        """
        获取网页HTML

        Args:
            url: 网页URL

        Returns:
            HTML字符串，失败返回None
        """
        for attempt in range(self.max_retries):
            try:
                # 礼貌性延迟
                if self.stats['requests_made'] > 0:
                    time.sleep(self.request_delay + random.uniform(0, 0.5))

                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                response.encoding = response.apparent_encoding  # 自动检测编码

                self.stats['requests_made'] += 1
                return response.text

            except requests.RequestException as e:
                error_msg = f"请求失败 ({attempt + 1}/{self.max_retries}): {url} - {str(e)}"
                print(error_msg)
                self.stats['errors'].append(error_msg)

                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # 指数退避
                else:
                    return None

    def parse_html(self, html: str) -> BeautifulSoup:
        """
        解析HTML

        Args:
            html: HTML字符串

        Returns:
            BeautifulSoup对象
        """
        return BeautifulSoup(html, 'lxml')

    def extract_text_by_keyword(
        self,
        soup: BeautifulSoup,
        keywords: List[str],
        extract_method: str = 'next_sibling_text'
    ) -> Optional[str]:
        """
        根据关键词提取文本

        Args:
            soup: BeautifulSoup对象
            keywords: 关键词列表
            extract_method: 提取方法（next_sibling_text/parent_text等）

        Returns:
            提取的文本
        """
        collected: List[str] = []

        for keyword in keywords:
            # 查找包含关键词的元素
            elements = soup.find_all(string=re.compile(keyword))

            for elem in elements:
                if extract_method == 'next_sibling_text':
                    # 提取下一个兄弟节点的文本
                    parent = elem.parent
                    if parent:
                        next_elem = parent.find_next_sibling()
                        while next_elem and not next_elem.get_text(strip=True):
                            next_elem = next_elem.find_next_sibling()
                        if next_elem:
                            collected.append(next_elem.get_text("\n", strip=True))

                elif extract_method == 'parent_text':
                    # 提取父节点的完整文本
                    parent = elem.parent
                    if parent:
                        collected.append(parent.get_text("\n", strip=True))

        if collected:
            deduped = list(dict.fromkeys([text for text in collected if text]))
            return "\n".join(deduped)

        return None

    def extract_by_pattern(self, text: str, pattern: str) -> Optional[str]:
        """
        使用正则表达式提取文本

        Args:
            text: 待匹配的文本
            pattern: 正则表达式

        Returns:
            匹配结果
        """
        match = re.search(pattern, text)
        return match.group(1) if match and match.groups() else (match.group(0) if match else None)

    def extract_email(self, soup: BeautifulSoup, config: List[Dict]) -> Optional[str]:
        """
        提取邮箱地址

        Args:
            soup: BeautifulSoup对象
            config: 提取配置列表

        Returns:
            邮箱地址
        """
        for rule in config:
            # 方法1：通过CSS选择器
            if 'selector' in rule:
                elem = soup.select_one(rule['selector'])
                if elem:
                    if rule.get('extract') == 'href':
                        href = elem.get('href', '')
                        if 'pattern' in rule:
                            return self.extract_by_pattern(href, rule['pattern'])
                        return href.replace('mailto:', '')
                    return elem.get_text(strip=True)

            # 方法2：通过正则表达式
            if 'pattern' in rule and 'selector' not in rule:
                text = soup.get_text()
                email = self.extract_by_pattern(text, rule['pattern'])
                if email:
                    return email

        return None

    def extract_phone(self, soup: BeautifulSoup, config: List[Dict]) -> Optional[str]:
        """提取电话号码"""
        for rule in config:
            if 'pattern' in rule:
                text = soup.get_text()
                phone = self.extract_by_pattern(text, rule['pattern'])
                if phone:
                    return phone
        return None

    def extract_title(self, soup: BeautifulSoup, config: List[Dict]) -> Optional[str]:
        """提取职称"""
        for rule in config:
            if 'pattern' in rule:
                text = soup.get_text()
                title = self.extract_by_pattern(text, rule['pattern'])
                if title:
                    return title

            if 'selector' in rule:
                elem = soup.select_one(rule['selector'])
                if elem:
                    return elem.get_text(strip=True)

        return None

    def extract_research_areas(self, soup: BeautifulSoup, config: List[Dict]) -> List[str]:
        """提取研究方向（增强版，支持更多提取方式）"""
        areas = []

        def split_text_to_areas(text: str) -> List[str]:
            if not text:
                return []
            # 拆分前先统一分隔符，处理编号和符号
            replaced = re.sub(r'(?:\r\n|\r)', '\n', text)
            # 将带编号的项目替换为换行分隔，便于拆分
            replaced = re.sub(r'(?<=\n)(\s*[①-⑩ⅰ-ⅹ]|[(（]?[0-9]{1,2}[)）.]|\s*[0-9]{1,2}[.、)])', r'\n\1', replaced)
            raw_items = re.split(r'[,\n;；，、]', replaced)
            cleaned = []
            for item in raw_items:
                piece = item.strip()
                piece = re.sub(r'^[0-9]{1,2}[)\.、．]\s*', '', piece)
                piece = re.sub(r'^[（(][0-9]{1,2}[)）]\s*', '', piece)
                piece = re.sub(r'^[①-⑩Ⅰ-Ⅹⅰ-ⅹIVXivx·•\-\*\s]+', '', piece)
                if piece and len(piece) > 1:
                    cleaned.append(piece)
            return cleaned

        for rule in config:
            # 方法1：通过关键词定位后提取
            if 'keywords' in rule:
                text = self.extract_text_by_keyword(
                    soup,
                    rule['keywords'],
                    rule.get('extract_method', 'next_sibling_text')
                )
                if text:
                    areas = split_text_to_areas(text)
                    if areas:
                        break

            # 方法2：通过CSS选择器提取
            if 'selector' in rule:
                elem = soup.select_one(rule['selector'])
                if elem:
                    text = elem.get_text(" ", strip=True)
                    areas = split_text_to_areas(text)
                    if areas:
                        break

            # 方法3：提取多个元素（如列表项）
            if 'selector_all' in rule:
                elements = soup.select(rule['selector_all'])
                for elem in elements:
                    text = elem.get_text(" ", strip=True)
                    items = split_text_to_areas(text) or [text]
                    for item in items:
                        if item and len(item) > 1:
                            areas.append(item)
                if areas:
                    break

            # 方法4：通过正则表达式从整个页面提取
            if 'pattern' in rule and 'selector' not in rule:
                text = soup.get_text()
                # 查找包含关键词的段落
                for keyword in rule.get('keywords', ['研究方向', '研究领域']):
                    pattern = f'{keyword}[：:](.*?)(?:\\n\\s*\\n|$)'
                    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
                    if match:
                        text_content = match.group(1).strip()
                        areas = split_text_to_areas(text_content)
                        if areas:
                            break
                if areas:
                    break

        deduped = list(dict.fromkeys(areas))
        return deduped[:10]  # 最多返回10个研究方向

    def clean_text(self, text: Optional[str]) -> Optional[str]:
        """
        清理文本

        Args:
            text: 原始文本

        Returns:
            清理后的文本
        """
        if not text:
            return None

        # 去除多余空白
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()

        return text if text else None

    def scrape(self) -> List[Dict[str, Any]]:
        """
        执行爬取（子类需实现）

        Returns:
            导师信息列表
        """
        raise NotImplementedError("子类必须实现 scrape 方法")

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self.stats
