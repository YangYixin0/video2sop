#!/usr/bin/env python3
"""
测试 OSS 函数调用
"""
import sys
import os
sys.path.append('/root/app/langgraph-agent')

from dotenv import load_dotenv
load_dotenv('/root/app/.env')

def test_generate_session_id():
    """测试生成会话 ID"""
    try:
        from oss_manager import generate_session_id
        session_id = generate_session_id()
        print(f"✅ 生成会话 ID 成功: {session_id}")
        return True
    except Exception as e:
        print(f"❌ 生成会话 ID 失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_check_oss_config():
    """测试 OSS 配置检查"""
    try:
        from oss_manager import check_oss_config
        check_oss_config()
        print("✅ OSS 配置检查成功")
        return True
    except Exception as e:
        print(f"❌ OSS 配置检查失败: {e}")
        return False

def test_fastapi_endpoint():
    """测试 FastAPI 端点函数"""
    try:
        from oss_api import setup_oss_routes
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        
        app = FastAPI()
        setup_oss_routes(app)
        
        client = TestClient(app)
        
        # 测试生成会话 ID 端点
        response = client.post("/generate_session_id")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        if response.status_code == 200:
            print("✅ FastAPI 端点测试成功")
            return True
        else:
            print("❌ FastAPI 端点测试失败")
            return False
            
    except Exception as e:
        print(f"❌ FastAPI 端点测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== OSS 函数测试 ===")
    
    print("\n1. 测试 OSS 配置...")
    config_ok = test_check_oss_config()
    
    print("\n2. 测试生成会话 ID...")
    session_ok = test_generate_session_id()
    
    print("\n3. 测试 FastAPI 端点...")
    api_ok = test_fastapi_endpoint()
    
    print(f"\n=== 测试结果 ===")
    print(f"OSS 配置: {'✅ 通过' if config_ok else '❌ 失败'}")
    print(f"会话 ID: {'✅ 通过' if session_ok else '❌ 失败'}")
    print(f"FastAPI 端点: {'✅ 通过' if api_ok else '❌ 失败'}")
    
    if config_ok and session_ok and api_ok:
        print("\n🎉 所有测试通过！")
        exit(0)
    else:
        print("\n💥 测试失败！")
        exit(1)
