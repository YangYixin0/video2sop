#!/usr/bin/env python3
"""
测试SOP解析工具的步骤分组功能
"""

import sys
import os
import json

# 添加langgraph-agent目录到Python路径
sys.path.append('/root/app/langgraph-agent')

from sop_parser_tool import sop_parser

def test_step_grouping():
    """测试步骤分组功能"""
    
    # 测试用例：包含层级步骤的SOP文档
    test_manuscript = """
标题：手动压片机标准操作流程（SOP）草稿

摘要：
本SOP旨在规范手动液压压片机的标准操作流程，确保操作人员能够安全、准确地完成压片工作。

关键词：
压片机、液压、操作流程、安全规范

材料试剂工具设备清单：
- 手动液压压片机
- 模具底座
- 模具套
- 压力表
- 安全防护设备

操作步骤：

第一步：设备准备和检查 (0:05 - 0:15)
1.1 检查压片机外观是否完好，无损坏或变形
1.2 确认模具底座与模具套的匹配性
1.3 检查压力表是否正常工作
1.4 确认安全防护设备齐全
1.5 检查工作台面清洁度

第二步：模具组装 (0:15 - 0:25)
2.1 将模具底座与模具套通过螺纹或卡扣方式组装牢固
2.2 检查组装后的模具是否稳固
2.3 确认模具表面无划痕或污渍

第三步：样品制备 (0:25 - 0:35)
3.1 准备待压制的样品材料
3.2 检查样品质量是否符合要求
3.3 将样品均匀分布在模具中

第四步：压片操作 (0:35 - 0:50)
4.1 启动压片机，设置初始压力
4.2 缓慢增加压力至设定值
4.3 保持压力30秒
4.4 缓慢释放压力
4.5 检查压片质量

第五步：清理和维护 (0:50 - 1:00)
5.1 关闭设备电源
5.2 拆卸模具并进行清洁
5.3 清理工作台面
5.4 记录操作日志

问题澄清：
1. 压力设定值是否有具体标准？
2. 压片质量检查的具体标准是什么？
3. 是否需要定期校准压力表？
"""

    print("🧪 测试SOP解析工具的步骤分组功能")
    print("=" * 60)
    
    try:
        # 调用解析工具
        result_json = sop_parser(test_manuscript)
        result = json.loads(result_json)
        
        if "error" in result:
            print(f"❌ 解析失败: {result['error']}")
            return
        
        blocks = result.get("blocks", [])
        print(f"✅ 解析成功，共生成 {len(blocks)} 个区块")
        print()
        
        # 分析区块内容
        step_blocks = [block for block in blocks if block.get("type") == "step"]
        print(f"📋 操作步骤区块数量: {len(step_blocks)}")
        print()
        
        for i, block in enumerate(step_blocks, 1):
            print(f"步骤区块 {i}:")
            print(f"  ID: {block.get('id', 'N/A')}")
            print(f"  时间: {block.get('start_time', 'N/A')}s - {block.get('end_time', 'N/A')}s")
            print(f"  播放按钮: {block.get('show_play_button', False)}")
            content = block.get('content', '')
            # 显示内容的前100个字符
            content_preview = content[:100] + "..." if len(content) > 100 else content
            print(f"  内容预览: {content_preview}")
            print()
        
        # 检查是否正确分组
        print("🔍 分组检查:")
        for i, block in enumerate(step_blocks, 1):
            content = block.get('content', '')
            if f"第{i}步" in content and f"{i}.1" in content:
                print(f"  ✅ 步骤{i}: 正确包含主步骤和子步骤")
            elif f"第{i}步" in content:
                print(f"  ⚠️  步骤{i}: 只包含主步骤，可能缺少子步骤")
            else:
                print(f"  ❌ 步骤{i}: 分组可能有问题")
        
        print()
        print("📊 其他区块类型:")
        other_blocks = [block for block in blocks if block.get("type") != "step"]
        type_counts = {}
        for block in other_blocks:
            block_type = block.get("type", "unknown")
            type_counts[block_type] = type_counts.get(block_type, 0) + 1
        
        for block_type, count in type_counts.items():
            print(f"  {block_type}: {count} 个")
        
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_step_grouping()

