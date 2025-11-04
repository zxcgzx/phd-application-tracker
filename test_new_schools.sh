#!/bin/bash
# 测试新添加的学校爬虫配置

echo "========================================"
echo "测试新学校爬虫配置"
echo "========================================"
echo ""

cd crawler

echo "1. 测试华北电力大学..."
echo "----------------------------------------"
python main.py --url "https://electric.ncepu.edu.cn/szdw/xyjj6/index.htm" --dry-run
echo ""

echo "2. 测试北京航空航天大学..."
echo "----------------------------------------"
python main.py --url "https://dept3.buaa.edu.cn/szjs/yjsds/bssds.htm" --dry-run
echo ""

echo "========================================"
echo "测试完成！"
echo "========================================"
echo ""
echo "如果测试成功，运行以下命令正式爬取："
echo "  cd crawler"
echo "  python main.py  # 爬取所有启用的学校"
echo ""
echo "或者单独爬取某个学校："
echo "  python main.py --url '华北电力大学URL'"
echo "  python main.py --url '北航URL'"
