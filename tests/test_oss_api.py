#!/usr/bin/env python3
"""
测试 OSS API 端点
"""
import sys
import os
sys.path.append('/root/video2sop/langgraph-agent')

# 加载环境变量
from dotenv import load_dotenv
load_dotenv('/root/video2sop/.env')

from oss_manager import generate_session_id, check_oss_config

def test_oss_config():
    """测试 OSS 配置"""
    try:
        check_oss_config()
        print("✅ OSS 配置检查通过")
        return True
    except Exception as e:
        print(f"❌ OSS 配置检查失败: {e}")
        return False

def test_session_id():
    """测试会话 ID 生成"""
    try:
        session_id = generate_session_id()
        print(f"✅ 会话 ID 生成成功: {session_id}")
        return True
    except Exception as e:
        print(f"❌ 会话 ID 生成失败: {e}")
        return False

def main():
    print("=== OSS API 测试 ===")
    
    print("\n1. 测试 OSS 配置...")
    config_ok = test_oss_config()
    
    print("\n2. 测试会话 ID 生成...")
    session_ok = test_session_id()
    
    print(f"\n=== 测试结果 ===")
    print(f"OSS 配置: {'✅ 通过' if config_ok else '❌ 失败'}")
    print(f"会话 ID: {'✅ 通过' if session_ok else '❌ 失败'}")
    
    if config_ok and session_ok:
        print("\n🎉 所有测试通过！")
        return 0
    else:
        print("\n💥 测试失败！")
        return 1

if __name__ == "__main__":
    exit(main())
