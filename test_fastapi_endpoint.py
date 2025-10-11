#!/usr/bin/env python3
"""
测试 FastAPI 端点
"""
import requests
import json

def test_endpoint():
    """测试 FastAPI 端点"""
    try:
        # 测试健康检查
        print("1. 测试健康检查端点...")
        response = requests.get('http://localhost:8123/health', timeout=5)
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")
        
        if response.status_code == 200:
            print("   ✅ 健康检查通过")
        else:
            print("   ❌ 健康检查失败")
            return False
        
        # 测试生成会话 ID
        print("\n2. 测试生成会话 ID...")
        response = requests.post(
            'http://localhost:8123/generate_session_id',
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("   ✅ 会话 ID 生成成功")
                return True
            else:
                print("   ❌ 会话 ID 生成失败")
                return False
        else:
            print("   ❌ 请求失败")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    print("=== FastAPI 端点测试 ===")
    success = test_endpoint()
    if success:
        print("\n🎉 测试通过！")
        exit(0)
    else:
        print("\n💥 测试失败！")
        exit(1)
