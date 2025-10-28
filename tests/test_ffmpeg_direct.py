#!/usr/bin/env python3
"""
完全独立的FFmpeg压缩测试程序
直接调用FFmpeg，不依赖项目中的任何函数
"""
import os
import sys
import subprocess
import time
import threading
import json

def get_video_duration_direct(video_path):
    """直接使用ffprobe获取视频时长"""
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            print(f"ffprobe错误: {result.stderr}")
            return None
    except Exception as e:
        print(f"获取视频时长失败: {e}")
        return None

def progress_callback(current_frame, total_frames, elapsed_time):
    """进度回调函数"""
    percentage = int((current_frame / total_frames) * 100) if total_frames > 0 else 0
    print(f"📈 压缩进度: {current_frame}/{total_frames} 帧 ({percentage}%) - 用时: {elapsed_time:.1f}秒")

def file_size_monitor(output_path, total_frames, progress_callback, start_time, stop_event):
    """文件大小监控线程"""
    last_size = 0
    last_progress_time = start_time
    
    while not stop_event.is_set():
        if os.path.exists(output_path):
            current_size = os.path.getsize(output_path)
            if current_size > last_size:
                # 基于文件大小估算进度（假设压缩后约为原始文件的1-2%）
                estimated_total_size = 30 * 1024 * 1024  # 估算30MB
                estimated_progress = min(95, int((current_size / estimated_total_size) * 100))
                estimated_frames = int(estimated_progress * total_frames // 100)
                
                current_time = time.time()
                elapsed = current_time - start_time
                
                # 每3秒更新一次
                if current_time - last_progress_time >= 3:
                    progress_callback(estimated_frames, total_frames, elapsed)
                    last_progress_time = current_time
                
                last_size = current_size
        time.sleep(1)

def test_ffmpeg_direct():
    """直接测试FFmpeg压缩"""
    print("🧪 开始独立FFmpeg压缩测试...")
    
    # 设置测试参数
    input_video_path = "/root/video2sop/temp/video_example/original_video.mp4"
    output_video_path = "/root/video2sop/temp/test_direct_compressed.mp4"
    
    # 检查输入视频
    if not os.path.exists(input_video_path):
        print(f"❌ 输入视频不存在: {input_video_path}")
        return
    
    print(f"📹 输入视频: {input_video_path}")
    print(f"📊 文件大小: {os.path.getsize(input_video_path) / (1024*1024*1024):.2f} GB")
    
    # 获取视频时长
    duration = get_video_duration_direct(input_video_path)
    if duration is None:
        print("❌ 无法获取视频时长")
        return
    
    print(f"⏱️  视频时长: {duration:.2f} 秒 ({duration/60:.2f} 分钟)")
    
    # 计算总帧数（10fps输出）
    total_frames = int(duration * 10)
    print(f"🎬 预计总帧数: {total_frames}")
    
    # 清理输出文件
    if os.path.exists(output_video_path):
        os.remove(output_video_path)
    
    # 构建FFmpeg命令
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    drawtext = (
        f"drawtext=fontfile={font_path}:"
        "text='Time\\: %{{eif\\:floor(t/60)\\:d\\:2}}\\:%{{eif\\:mod(t\\,60)\\:d\\:2}}':"
        "x=w-tw-10:y=h-th-10:"
        "fontsize=30:fontcolor=white:box=1:boxcolor=black@0.55:"
        "borderw=2:bordercolor=black@0.8"
    )
    
    cmd = [
        'ffmpeg',
        '-hide_banner',
        '-nostats',
        '-v', 'error',
        '-progress', 'pipe:1',  # 输出进度到stdout
        '-i', input_video_path,
        '-vf', f'scale=-2:720,{drawtext}',  # 保持宽高比，高度720p，叠加时间戳
        '-r', '10',  # 帧率10fps
        '-c:v', 'libx265',  # h265编码
        '-x265-params', 'log-level=error',  # 降低x265日志
        '-crf', '23',  # CRF质量
        '-preset', 'ultrafast',  # 最快预设
        '-c:a', 'copy',  # 复制原音频，不重新编码
        '-metadata', 'description=Video2SOP v1.7.0',  # 元数据标识
        '-movflags', '+faststart',  # 优化流媒体播放
        '-threads', '0',  # 使用所有可用CPU核心进行多线程编码
        '-y',
        output_video_path
    ]
    
    print("🚀 开始FFmpeg压缩...")
    print(f"🔧 FFmpeg命令: {' '.join(cmd)}")
    
    start_time = time.time()
    last_progress_time = start_time
    current_frame = 0
    no_progress_count = 0
    max_no_progress = 30  # 最大无进度次数（30秒）
    
    # 启动文件大小监控
    stop_event = threading.Event()
    monitor_thread = threading.Thread(
        target=file_size_monitor, 
        args=(output_video_path, total_frames, progress_callback, start_time, stop_event),
        daemon=True
    )
    monitor_thread.start()
    
    try:
        # 启动FFmpeg进程
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        print("📊 开始解析FFmpeg进度输出...")
        
        # 实时读取FFmpeg输出
        while True:
            # 检查进程是否结束
            if process.poll() is not None:
                print("FFmpeg进程已结束")
                break
            
            # 检查是否长时间无进度更新
            if no_progress_count > max_no_progress:
                print(f"⚠️  警告: 已{max_no_progress}秒无进度更新，但FFmpeg仍在运行")
                no_progress_count = 0
            
            # 非阻塞读取
            try:
                import select
                ready, _, _ = select.select([process.stdout], [], [], 1.0)  # 1秒超时
                if not ready:
                    no_progress_count += 1
                    continue
            except ImportError:
                # Windows平台
                time.sleep(0.1)
                no_progress_count += 1
                continue
            
            line = process.stdout.readline()
            if not line:
                print("FFmpeg输出结束")
                break
            
            line = line.strip()
            if not line:
                continue
            
            # 调试：输出关键FFmpeg行
            if line.startswith('frame=') or line.startswith('progress=') or line.startswith('out_time='):
                print(f"FFmpeg输出: {line}")
            
            # 解析frame=行
            if line.startswith('frame='):
                try:
                    new_frame = int(line.split('=')[1].strip())
                    if new_frame > current_frame:
                        current_frame = new_frame
                        no_progress_count = 0
                        
                        # 每5秒回调一次
                        current_time = time.time()
                        if current_time - last_progress_time >= 5:
                            elapsed = current_time - start_time
                            progress_callback(current_frame, total_frames, elapsed)
                            last_progress_time = current_time
                except (ValueError, IndexError) as e:
                    print(f"解析帧数失败: {line}, 错误: {e}")
                    continue
            
            # 解析out_time=行作为备用进度
            elif line.startswith('out_time='):
                try:
                    out_time_value = line.split('=')[1].strip()
                    # 解析时间格式 HH:MM:SS.micro
                    hh, mm, ss = out_time_value.split(":")
                    secs = int(hh) * 3600 + int(mm) * 60 + float(ss)
                    estimated_frame = min(total_frames, int(secs * 10))  # 10fps
                    
                    if estimated_frame > current_frame:
                        current_frame = estimated_frame
                        no_progress_count = 0
                        current_time = time.time()
                        if current_time - last_progress_time >= 3:
                            elapsed = current_time - start_time
                            progress_callback(current_frame, total_frames, elapsed)
                            print(f"基于时间的进度: {current_frame}/{total_frames} 帧")
                            last_progress_time = current_time
                except Exception as e:
                    print(f"解析时间失败: {line}, 错误: {e}")
                    continue
            
            # 检查结束信号
            elif line.startswith('progress=') and line.split('=')[1].strip() == 'end':
                print("收到FFmpeg结束信号")
                break
        
        # 等待进程完成
        stdout, stderr = process.communicate()
        
        # 停止文件大小监控
        stop_event.set()
        
        end_time = time.time()
        compression_time = end_time - start_time
        
        if process.returncode == 0:
            print(f"✅ FFmpeg压缩完成: {output_video_path}")
            print(f"⏱️  压缩耗时: {compression_time:.1f} 秒")
            
            # 检查压缩结果
            if os.path.exists(output_video_path):
                original_size = os.path.getsize(input_video_path)
                compressed_size = os.path.getsize(output_video_path)
                compression_ratio = (1 - compressed_size / original_size) * 100
                
                print(f"📊 压缩结果:")
                print(f"   原始大小: {original_size / (1024*1024*1024):.2f} GB")
                print(f"   压缩大小: {compressed_size / (1024*1024*1024):.2f} GB")
                print(f"   压缩率: {compression_ratio:.1f}%")
                
                # 验证压缩视频时长
                compressed_duration = get_video_duration_direct(output_video_path)
                if compressed_duration:
                    print(f"⏱️  压缩视频时长: {compressed_duration:.2f} 秒")
                    if abs(duration - compressed_duration) < 5:
                        print("✅ 时长验证通过")
                    else:
                        print(f"⚠️  时长差异较大: 原始 {duration:.2f}s, 压缩 {compressed_duration:.2f}s")
            else:
                print("❌ 压缩文件不存在")
        else:
            print(f"❌ FFmpeg压缩失败: {stderr}")
            
    except Exception as e:
        print(f"❌ 压缩过程异常: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 确保停止监控线程
        stop_event.set()

if __name__ == "__main__":
    test_ffmpeg_direct()
