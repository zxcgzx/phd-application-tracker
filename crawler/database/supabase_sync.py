"""
Supabase 数据库同步模块
负责将爬取的数据同步到 Supabase
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from supabase import create_client, Client


class SupabaseSync:
    """Supabase 数据同步器"""

    def __init__(self):
        """初始化 Supabase 客户端"""
        supabase_url = os.getenv('SUPABASE_URL') or 'https://cacvfqtupprixlmzrury.supabase.co'
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or (
            os.getenv('SUPABASE_ANON_KEY')
        ) or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY3ZmcXR1cHByaXhsbXpydXJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEzMjU5MywiZXhwIjoyMDc3NzA4NTkzfQ.hbqrmQKt5_Pjn6bAwxhik2v9KHsiTY-edwPjEtWn2fg'

        if not supabase_url or not supabase_key:
            raise ValueError(
                "请设置环境变量: SUPABASE_URL 和 SUPABASE_SERVICE_KEY"
            )

        self.client: Client = create_client(supabase_url, supabase_key)
        self.stats = {
            'universities_created': 0,
            'professors_new': 0,
            'professors_updated': 0,
            'professors_unchanged': 0
        }

    def sync_university(self, university_data: Dict[str, Any]) -> str:
        """
        同步学校信息

        Args:
            university_data: 学校数据

        Returns:
            学校的 UUID
        """
        # 检查学校是否已存在
        result = self.client.table('universities').select('id').eq(
            'url', university_data['url']
        ).execute()

        if result.data:
            # 已存在，返回 ID
            return result.data[0]['id']
        else:
            # 不存在，创建新记录
            insert_data = {
                'name': university_data['name'],
                'url': university_data['url'],
                'scraper_type': university_data.get('scraper_type', 'two_level'),
                'list_page_selector': str(university_data.get('list_page', {})),
                'detail_page_selectors': university_data.get('detail_page', {})
            }

            result = self.client.table('universities').insert(insert_data).execute()

            if result.data:
                self.stats['universities_created'] += 1
                return result.data[0]['id']
            else:
                raise Exception(f"创建学校记录失败: {result}")

    def sync_professors(
        self,
        university_id: str,
        professors: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        同步导师信息（增量更新）

        Args:
            university_id: 学校 UUID
            professors: 导师列表

        Returns:
            统计信息 {'new': X, 'updated': Y, 'unchanged': Z}
        """
        stats = {'new': 0, 'updated': 0, 'unchanged': 0}

        for prof in professors:
            # 检查导师是否已存在
            result = self.client.table('professors').select('*').eq(
                'university_id', university_id
            ).eq('name', prof['name']).execute()

            if result.data:
                # 导师已存在，检查是否需要更新
                existing = result.data[0]
                if self._needs_update(existing, prof):
                    self._update_professor(existing['id'], prof)
                    stats['updated'] += 1
                else:
                    stats['unchanged'] += 1
            else:
                # 新导师，插入记录
                self._insert_professor(university_id, prof)
                stats['new'] += 1

        self.stats['professors_new'] += stats['new']
        self.stats['professors_updated'] += stats['updated']
        self.stats['professors_unchanged'] += stats['unchanged']

        return stats

    def _needs_update(
        self,
        existing: Dict[str, Any],
        new_data: Dict[str, Any]
    ) -> bool:
        """
        判断导师信息是否需要更新

        Args:
            existing: 数据库中的现有数据
            new_data: 新爬取的数据

        Returns:
            True 需要更新，False 无需更新
        """
        # 检查关键字段是否有变化
        fields_to_check = [
            'title',
            'research_areas',
            'homepage',
            'profile_url',
            'office_location',
            'department',
            'email',
            'phone',
            'education_background'
        ]

        for field in fields_to_check:
            if field in new_data:
                if existing.get(field) != new_data.get(field):
                    return True

        return False

    def _insert_professor(self, university_id: str, prof: Dict[str, Any]):
        """插入新导师"""
        insert_data = {
            'university_id': university_id,
            'name': prof['name'],
            'title': prof.get('title'),
            'research_areas': prof.get('research_areas', []),
            'homepage': prof.get('homepage'),
            'profile_url': prof.get('profile_url') or prof.get('homepage'),
            'office_location': prof.get('office_location'),
            'department': prof.get('department'),
            'email': prof.get('email'),
            'phone': prof.get('phone'),
            'education_background': prof.get('education_background'),
            'raw_html': prof.get('raw_html'),
            'is_active': True
        }

        result = self.client.table('professors').insert(insert_data).execute()

        if not result.data:
            print(f"  ⚠️  插入导师失败: {prof['name']}")

    def _update_professor(self, professor_id: str, prof: Dict[str, Any]):
        """更新现有导师"""
        update_data = {
            'title': prof.get('title'),
            'research_areas': prof.get('research_areas', []),
            'homepage': prof.get('homepage'),
            'profile_url': prof.get('profile_url') or prof.get('homepage'),
            'office_location': prof.get('office_location'),
            'department': prof.get('department'),
            'email': prof.get('email'),
            'phone': prof.get('phone'),
            'education_background': prof.get('education_background'),
            'updated_at': datetime.utcnow().isoformat()
        }

        # 移除 None 值
        update_data = {k: v for k, v in update_data.items() if v is not None}

        result = self.client.table('professors').update(update_data).eq(
            'id', professor_id
        ).execute()

        if not result.data:
            print(f"  ⚠️  更新导师失败: ID {professor_id}")

    def update_university_stats(
        self,
        university_id: str,
        status: str,
        professors_count: int
    ):
        """
        更新学校的爬取统计信息

        Args:
            university_id: 学校 UUID
            status: 爬取状态
            professors_count: 导师总数
        """
        self.client.table('universities').update({
            'crawl_status': status,
            'professors_count': professors_count,
            'last_crawled_at': datetime.utcnow().isoformat()
        }).eq('id', university_id).execute()

    def log_crawl(
        self,
        university_id: str,
        status: str,
        stats: Dict[str, Any],
        error_message: Optional[str] = None
    ):
        """
        记录爬取日志

        Args:
            university_id: 学校 UUID
            status: 状态 (success/failed)
            stats: 统计信息
            error_message: 错误信息（可选）
        """
        log_data = {
            'university_id': university_id,
            'status': status,
            'professors_found': stats.get('professors_found', 0),
            'professors_new': stats.get('new', 0),
            'professors_updated': stats.get('updated', 0),
            'error_message': error_message,
            'started_at': stats.get('started_at'),
            'completed_at': datetime.utcnow().isoformat()
        }

        self.client.table('crawl_logs').insert(log_data).execute()

    def get_stats(self) -> Dict[str, int]:
        """获取同步统计信息"""
        return self.stats
