#!/usr/bin/env python3
"""
测试视频压缩功能
"""
import os
import sys
import asyncio
import json
from pathlib import Path

# 添加项目路径
sys.path.append('/root/video2sop/langgraph-agent')

from video_processor import compress_and_overlay_video, get_video_duration
from local_storage_manager import save_video_locally_file

async def test_compression():
    """测试压缩功能"""
    print("🧪 开始测试视频压缩功能...")
    
    # 设置测试参数
    test_session_id = "test-compression-session"
    input_video_path = "/root/video2sop/temp/video_example/original_video.mp4"
    
    # 检查输入视频
    if not os.path.exists(input_video_path):
        print(f"❌ 输入视频不存在: {input_video_path}")
        return
    
    print(f"📹 输入视频: {input_video_path}")
    print(f"📊 文件大小: {os.path.getsize(input_video_path) / (1024*1024*1024):.2f} GB")
    
    # 获取视频时长
    try:
        duration = get_video_duration(input_video_path, is_local_file=True)
        print(f"⏱️  视频时长: {duration:.2f} 秒 ({duration/60:.2f} 分钟)")
    except Exception as e:
        print(f"❌ 获取视频时长失败: {e}")
        return
    
    # 复制视频到测试目录
    print("📋 复制视频到测试目录...")
    try:
        local_video_path = save_video_locally_file(input_video_path, test_session_id)
        print(f"✅ 视频已复制到: {local_video_path}")
    except Exception as e:
        print(f"❌ 复制视频失败: {e}")
        return
    
    # 定义进度回调
    def progress_callback(current_frame, total_frames):
        percentage = int((current_frame / total_frames) * 100) if total_frames > 0 else 0
        print(f"📈 压缩进度: {current_frame}/{total_frames} 帧 ({percentage}%)")
    
    # 开始压缩
    print("🚀 开始压缩视频...")
    try:
        compressed_path = await asyncio.to_thread(
            compress_and_overlay_video,
            local_video_path,
            test_session_id,
            "compressed_video.mp4",
            progress_callback,
            None  # cancel_flag
        )
        
        print(f"✅ 压缩完成: {compressed_path}")
        
        # 检查压缩结果
        if os.path.exists(compressed_path):
            original_size = os.path.getsize(local_video_path)
            compressed_size = os.path.getsize(compressed_path)
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            print(f"📊 压缩结果:")
            print(f"   原始大小: {original_size / (1024*1024*1024):.2f} GB")
            print(f"   压缩大小: {compressed_size / (1024*1024*1024):.2f} GB")
            print(f"   压缩率: {compression_ratio:.1f}%")
            
            # 验证压缩视频
            try:
                compressed_duration = get_video_duration(compressed_path, is_local_file=True)
                print(f"⏱️  压缩视频时长: {compressed_duration:.2f} 秒")
                
                if abs(duration - compressed_duration) < 5:  # 允许5秒误差
                    print("✅ 时长验证通过")
                else:
                    print(f"⚠️  时长差异较大: 原始 {duration:.2f}s, 压缩 {compressed_duration:.2f}s")
            except Exception as e:
                print(f"⚠️  验证压缩视频时长失败: {e}")
        else:
            print("❌ 压缩文件不存在")
            
    except Exception as e:
        print(f"❌ 压缩失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_compression())




