#!/usr/bin/env python3
"""
直接测试 OSS API 函数调用
"""
import sys
import os
sys.path.append('/root/video2sop/langgraph-agent')

from dotenv import load_dotenv
load_dotenv('/root/video2sop/.env')

def test_direct_call():
    """直接测试函数调用"""
    try:
        print("1. 导入模块...")
        from oss_api import setup_oss_routes
        from fastapi import FastAPI
        print("   ✅ 模块导入成功")
        
        print("\n2. 创建 FastAPI 应用...")
        app = FastAPI()
        print("   ✅ FastAPI 应用创建成功")
        
        print("\n3. 设置 OSS 路由...")
        setup_oss_routes(app)
        print("   ✅ OSS 路由设置成功")
        
        print("\n4. 测试路由列表...")
        routes = [route.path for route in app.routes]
        print(f"   路由: {routes}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== 直接函数调用测试 ===")
    success = test_direct_call()
    if success:
        print("\n🎉 测试通过！")
        exit(0)
    else:
        print("\n💥 测试失败！")
        exit(1)
