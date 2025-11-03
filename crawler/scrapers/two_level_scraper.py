"""
两层结构爬虫
适用于"列表页 + 详情页"结构的网站（如北京理工大学）
"""

from typing import Dict, List, Any, Optional
from urllib.parse import urljoin
from .base_scraper import BaseScraper


class TwoLevelScraper(BaseScraper):
    """两层结构爬虫：先爬列表页获取链接，再爬详情页获取完整信息"""

    def scrape(self) -> List[Dict[str, Any]]:
        """
        执行两层爬取

        Returns:
            导师信息列表
        """
        print(f"\n开始爬取: {self.name}")
        print(f"URL: {self.base_url}")

        # 第一层：爬取列表页
        professor_links = self._scrape_list_page()

        if not professor_links:
            print("❌ 未找到任何导师链接")
            return []

        print(f"✓ 找到 {len(professor_links)} 位导师")

        # 第二层：爬取每个导师的详情页
        professors = []
        for i, link_info in enumerate(professor_links, 1):
            print(f"  [{i}/{len(professor_links)}] 爬取: {link_info['name']}...")

            professor = self._scrape_detail_page(link_info)
            if professor:
                professors.append(professor)
                self.stats['professors_found'] += 1

        print(f"\n✓ 成功爬取 {len(professors)} 位导师的信息")
        return professors

    def _scrape_list_page(self) -> List[Dict[str, str]]:
        """
        爬取列表页，提取导师姓名和详情页链接

        Returns:
            [{'name': '张三', 'url': 'https://...'}, ...]
        """
        html = self.fetch_page(self.base_url)
        if not html:
            return []

        soup = self.parse_html(html)
        list_config = self.config.get('list_page', {})

        # 提取导师列表容器
        container_selector = list_config.get('container_selector', 'ul > li')
        containers = soup.select(container_selector)

        professor_links = []

        for container in containers:
            # 提取链接和姓名
            link_selector = list_config.get('link_selector', 'a')
            link_elem = container.select_one(link_selector)

            if not link_elem:
                continue

            # 获取链接
            href = link_elem.get('href')
            if not href:
                continue

            # 转换为绝对URL
            absolute_url = urljoin(self.base_url, href)

            # 获取姓名
            name_selector = list_config.get('name_selector', 'a')
            if name_selector == link_selector:
                name = link_elem.get_text(strip=True)
            else:
                name_elem = container.select_one(name_selector)
                name = name_elem.get_text(strip=True) if name_elem else '未知'

            # 清理姓名（去除特殊字符）
            name = self.clean_text(name)
            if name:
                professor_links.append({
                    'name': name,
                    'url': absolute_url
                })

        return professor_links

    def _scrape_detail_page(self, link_info: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        爬取导师详情页

        Args:
            link_info: {'name': '张三', 'url': 'https://...'}

        Returns:
            导师完整信息字典
        """
        html = self.fetch_page(link_info['url'])
        if not html:
            return None

        soup = self.parse_html(html)
        detail_config = self.config.get('detail_page', {})

        # 提取各字段
        professor = {
            'name': link_info['name'],
            'homepage': link_info['url'],
            'university_name': self.name,
            'raw_html': html[:10000]  # 保存前10000字符用于调试
        }

        # 提取邮箱
        if 'email' in detail_config:
            email = self.extract_email(soup, detail_config['email'])
            if email:
                professor['email'] = email

        # 提取电话
        if 'phone' in detail_config:
            phone = self.extract_phone(soup, detail_config['phone'])
            if phone:
                professor['phone'] = phone

        # 提取职称
        if 'title' in detail_config:
            title = self.extract_title(soup, detail_config['title'])
            if title:
                professor['title'] = title

        # 提取研究方向
        if 'research_areas' in detail_config:
            areas = self.extract_research_areas(soup, detail_config['research_areas'])
            if areas:
                professor['research_areas'] = areas

        # 提取办公室
        if 'office' in detail_config:
            office_config = detail_config['office']
            if office_config and len(office_config) > 0:
                office = self.extract_text_by_keyword(
                    soup,
                    office_config[0].get('keywords', ['办公室', 'Office']),
                    office_config[0].get('extract_method', 'next_sibling_text')
                )
                if office:
                    professor['office_location'] = self.clean_text(office)

        return professor
