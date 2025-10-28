#!/usr/bin/env python3
"""
简化的视频压缩测试
"""
import os
import sys
import asyncio
import time
from pathlib import Path

# 添加项目路径
sys.path.append('/root/video2sop/langgraph-agent')

from video_processor import compress_and_overlay_video, get_video_duration
from local_storage_manager import save_video_locally_file

def progress_callback(current_frame, total_frames):
    """进度回调函数"""
    percentage = int((current_frame / total_frames) * 100) if total_frames > 0 else 0
    current_time = time.time()
    elapsed = current_time - progress_callback.start_time
    print(f"📈 压缩进度: {current_frame}/{total_frames} 帧 ({percentage}%) - 用时: {elapsed:.1f}秒")
    progress_callback.last_update_time = current_time
    progress_callback.last_frame = current_frame

# 初始化进度回调的静态变量
progress_callback.start_time = None
progress_callback.last_update_time = None
progress_callback.last_frame = 0

async def test_compression_simple():
    """简化的压缩测试"""
    print("🧪 开始简化压缩测试...")
    
    # 设置测试参数
    test_session_id = "test-simple-compression"
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
    
    # 开始压缩
    print("🚀 开始压缩视频...")
    start_time = time.time()
    progress_callback.start_time = start_time
    
    # 添加超时监控
    async def timeout_monitor():
        """监控压缩是否超时"""
        while True:
            await asyncio.sleep(10)  # 每10秒检查一次
            if progress_callback.last_update_time:
                time_since_last_update = time.time() - progress_callback.last_update_time
                if time_since_last_update > 60:  # 超过60秒无更新
                    print(f"⚠️  警告: 已{time_since_last_update:.1f}秒无进度更新，最后进度: {progress_callback.last_frame}帧")
                if time_since_last_update > 300:  # 超过5分钟无更新
                    print(f"❌ 超时: 已{time_since_last_update:.1f}秒无进度更新，可能卡住了")
                    return
    
    # 启动超时监控
    monitor_task = asyncio.create_task(timeout_monitor())
    
    try:
        compressed_path = await asyncio.to_thread(
            compress_and_overlay_video,
            local_video_path,
            test_session_id,
            "compressed_video.mp4",
            progress_callback,
            None  # cancel_flag
        )
        
        # 停止监控
        monitor_task.cancel()
        
        end_time = time.time()
        compression_time = end_time - start_time
        
        print(f"✅ 压缩完成: {compressed_path}")
        print(f"⏱️  压缩耗时: {compression_time:.1f} 秒")
        
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
    asyncio.run(test_compression_simple())


