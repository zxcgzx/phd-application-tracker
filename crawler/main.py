#!/usr/bin/env python3
"""
申请博士记录 - 爬虫主程序

用法:
    python main.py                    # 爬取所有启用的学校
    python main.py --url <URL>        # 爬取指定URL
    python main.py --dry-run          # 测试模式（不写入数据库）
"""

import os
import sys
import argparse
import yaml
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv

from scrapers import TwoLevelScraper
from database import SupabaseSync


def load_config(config_path: str = 'config.yaml') -> Dict[str, Any]:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def create_scraper(university_config: Dict[str, Any], global_settings: Dict[str, Any]):
    """
    根据配置创建爬虫实例

    Args:
        university_config: 学校配置
        global_settings: 全局设置

    Returns:
        爬虫实例
    """
    # 合并全局设置
    config = {**university_config, 'settings': global_settings}

    scraper_type = university_config.get('scraper_type', 'two_level')

    if scraper_type == 'two_level':
        return TwoLevelScraper(config)
    else:
        raise ValueError(f"不支持的爬虫类型: {scraper_type}")


def crawl_university(
    university_config: Dict[str, Any],
    global_settings: Dict[str, Any],
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    爬取单个学校

    Args:
        university_config: 学校配置
        global_settings: 全局设置
        dry_run: 是否为测试模式

    Returns:
        爬取结果统计
    """
    started_at = datetime.utcnow()
    result = {
        'university': university_config['name'],
        'status': 'success',
        'professors_found': 0,
        'new': 0,
        'updated': 0,
        'unchanged': 0,
        'error': None,
        'started_at': started_at.isoformat()
    }

    try:
        # 创建爬虫
        scraper = create_scraper(university_config, global_settings)

        # 执行爬取
        professors = scraper.scrape()
        result['professors_found'] = len(professors)

        if not dry_run:
            # 同步到数据库
            db = SupabaseSync()

            # 同步学校信息
            university_id = db.sync_university({
                'name': university_config['name'],
                'url': university_config['url'],
                'scraper_type': university_config.get('scraper_type'),
                'list_page': university_config.get('list_page'),
                'detail_page': university_config.get('detail_page')
            })

            # 同步导师信息
            sync_stats = db.sync_professors(university_id, professors)
            result.update(sync_stats)

            # 更新学校统计
            db.update_university_stats(
                university_id,
                'success',
                result['professors_found']
            )

            # 记录日志
            db.log_crawl(university_id, 'success', result)

            print(f"\n✅ 同步完成:")
            print(f"   新增: {sync_stats['new']} 位")
            print(f"   更新: {sync_stats['updated']} 位")
            print(f"   未变化: {sync_stats['unchanged']} 位")
        else:
            print(f"\n🧪 测试模式: 找到 {len(professors)} 位导师（未写入数据库）")

            # 显示前3位导师的信息作为示例
            for i, prof in enumerate(professors[:3], 1):
                print(f"\n示例导师 {i}:")
                print(f"  姓名: {prof.get('name')}")
                print(f"  职称: {prof.get('title', '未知')}")
                print(f"  邮箱: {prof.get('email', '未找到')}")
                print(f"  研究方向: {', '.join(prof.get('research_areas', ['未找到']))}")

    except Exception as e:
        result['status'] = 'failed'
        result['error'] = str(e)
        print(f"\n❌ 爬取失败: {str(e)}")

        if not dry_run:
            # 记录失败日志
            try:
                db = SupabaseSync()
                university_id = db.sync_university({
                    'name': university_config['name'],
                    'url': university_config['url']
                })
                db.log_crawl(university_id, 'failed', result, str(e))
            except:
                pass

    return result


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='申请博士记录 - 爬虫程序')
    parser.add_argument('--url', help='指定要爬取的学校URL')
    parser.add_argument('--dry-run', action='store_true', help='测试模式（不写入数据库）')
    parser.add_argument('--config', default='config.yaml', help='配置文件路径')
    args = parser.parse_args()

    # 加载环境变量
    load_dotenv()

    # 加载配置
    try:
        config = load_config(args.config)
    except FileNotFoundError:
        print(f"❌ 配置文件未找到: {args.config}")
        sys.exit(1)

    universities = config.get('universities', [])
    global_settings = config.get('settings', {})

    # 过滤要爬取的学校
    if args.url:
        universities = [u for u in universities if u['url'] == args.url]
        if not universities:
            print(f"❌ 未找到URL对应的学校配置: {args.url}")
            sys.exit(1)
    else:
        # 只爬取启用的学校
        universities = [u for u in universities if u.get('enabled', True)]

    if not universities:
        print("❌ 没有要爬取的学校")
        sys.exit(1)

    # 显示模式
    mode = "🧪 测试模式" if args.dry_run else "🚀 正常模式"
    print(f"\n{mode}")
    print("=" * 60)
    print(f"计划爬取 {len(universities)} 所学校\n")

    # 逐个爬取
    results = []
    for i, uni_config in enumerate(universities, 1):
        print(f"\n[{i}/{len(universities)}] {uni_config['name']}")
        print("-" * 60)

        result = crawl_university(uni_config, global_settings, args.dry_run)
        results.append(result)

    # 汇总统计
    print("\n" + "=" * 60)
    print("📊 爬取汇总")
    print("=" * 60)

    total_found = sum(r['professors_found'] for r in results)
    total_new = sum(r.get('new', 0) for r in results)
    total_updated = sum(r.get('updated', 0) for r in results)
    success_count = sum(1 for r in results if r['status'] == 'success')

    print(f"成功: {success_count}/{len(results)} 所学校")
    print(f"发现导师: {total_found} 位")

    if not args.dry_run:
        print(f"新增: {total_new} 位")
        print(f"更新: {total_updated} 位")

    # 显示失败的学校
    failed = [r for r in results if r['status'] == 'failed']
    if failed:
        print("\n❌ 失败的学校:")
        for r in failed:
            print(f"  - {r['university']}: {r['error']}")

    print("\n✨ 完成!\n")


if __name__ == '__main__':
    main()
