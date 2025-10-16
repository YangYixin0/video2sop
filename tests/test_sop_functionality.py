#!/usr/bin/env python3
"""
测试SOP功能的基本脚本
"""

import json
import sys
import os

# 添加langgraph-agent目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'langgraph-agent'))

from sop_parser_tool import sop_parser
from sop_refine_tool import sop_refine

def test_sop_parser():
    """测试SOP解析功能"""
    print("🧪 测试SOP解析功能...")
    
    # 使用manuscript.txt中的内容作为测试数据
    manuscript_path = os.path.join(os.path.dirname(__file__), 'temp', 'manuscript.txt')
    
    if not os.path.exists(manuscript_path):
        print(f"❌ 找不到测试文件: {manuscript_path}")
        return False
    
    with open(manuscript_path, 'r', encoding='utf-8') as f:
        manuscript = f.read()
    
    try:
        result_json = sop_parser(manuscript)
        result = json.loads(result_json)
        
        if 'blocks' in result:
            print(f"✅ SOP解析成功，生成了 {len(result['blocks'])} 个区块")
            
            # 显示前几个区块的信息
            for i, block in enumerate(result['blocks'][:3]):
                print(f"   区块 {i+1}: {block.get('type', 'unknown')} - {block.get('content', '')[:50]}...")
            
            return True
        else:
            print(f"❌ 解析结果格式错误: {result}")
            return False
            
    except Exception as e:
        print(f"❌ SOP解析失败: {e}")
        return False

def test_sop_refine():
    """测试SOP精修功能"""
    print("\n🧪 测试SOP精修功能...")
    
    # 创建测试区块数据
    test_blocks = {
        "blocks": [
            {
                "id": "test_block_1",
                "type": "step",
                "content": "这是一个测试步骤，需要精修",
                "start_time": 10,
                "end_time": 30,
                "show_play_button": True
            }
        ]
    }
    
    user_notes = "请将这个步骤描述得更加详细和专业"
    
    try:
        blocks_json = json.dumps(test_blocks, ensure_ascii=False)
        result_json = sop_refine(blocks_json, user_notes)
        result = json.loads(result_json)
        
        if 'blocks' in result:
            print(f"✅ SOP精修成功，处理了 {len(result['blocks'])} 个区块")
            
            # 显示精修结果
            for block in result['blocks']:
                print(f"   精修后: {block.get('content', '')}")
            
            return True
        else:
            print(f"❌ 精修结果格式错误: {result}")
            return False
            
    except Exception as e:
        print(f"❌ SOP精修失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试SOP功能...")
    print("=" * 50)
    
    # 检查环境变量
    if not os.getenv('DASHSCOPE_API_KEY'):
        print("❌ 未设置DASHSCOPE_API_KEY环境变量")
        print("请确保已正确配置API密钥")
        return
    
    # 运行测试
    parser_success = test_sop_parser()
    refine_success = test_sop_refine()
    
    print("\n" + "=" * 50)
    print("📊 测试结果总结:")
    print(f"   SOP解析: {'✅ 通过' if parser_success else '❌ 失败'}")
    print(f"   SOP精修: {'✅ 通过' if refine_success else '❌ 失败'}")
    
    if parser_success and refine_success:
        print("\n🎉 所有测试通过！SOP功能已准备就绪。")
    else:
        print("\n⚠️ 部分测试失败，请检查配置和网络连接。")

if __name__ == "__main__":
    main()





