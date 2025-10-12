'use client';

import React, { useState } from 'react';
import { SOPBlock, ExportFormat } from '@/types/sop';

interface SOPExporterProps {
  blocksA: SOPBlock[];
  blocksB?: SOPBlock[];
  videoUrl?: string;
  fileName?: string;
  onExport?: (format: ExportFormat, content: string) => void;
}

const SOPExporter: React.FC<SOPExporterProps> = ({
  blocksA,
  blocksB,
  videoUrl,
  fileName = 'sop_document',
  onExport
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<'A' | 'B'>('A');

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取当前选中的区块
  const getCurrentBlocks = (): SOPBlock[] => {
    return selectedBlocks === 'A' ? blocksA : (blocksB || []);
  };

  // 生成纯文本SOP
  const generateTxtContent = (): string => {
    let content = '';
    const currentBlocks = getCurrentBlocks();
    
    currentBlocks.forEach((block, index) => {
      // 添加区块标题
      const blockTypeNames: Record<SOPBlock['type'], string> = {
        title: '标题',
        abstract: '摘要',
        keywords: '关键词',
        materials: '材料试剂工具设备清单',
        step: '操作步骤',
        unknown: '其他内容'
      };
      
      content += `${blockTypeNames[block.type]}：\n`;
      content += `${block.content}\n`;
      
      // 如果有时间戳，添加时间信息
      if (block.start_time !== undefined || block.end_time !== undefined) {
        content += `时间范围：`;
        if (block.start_time !== undefined) {
          content += formatTime(block.start_time);
        }
        if (block.end_time !== undefined && block.start_time !== block.end_time) {
          content += ` - ${formatTime(block.end_time)}`;
        }
        content += `\n`;
      }
      
      // 添加分隔线（除了最后一个区块）
      if (index < blocks.length - 1) {
        content += `\n${'='.repeat(50)}\n\n`;
      }
    });
    
    return content;
  };

  // 生成HTML关联SOP
  const generateHtmlContent = (): string => {
    const videoFileName = videoUrl ? videoUrl.split('/').pop() : 'video.mp4';
    
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .video-config {
            margin: 30px 0; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border: 2px dashed #dee2e6;
        }
        .video-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        .video-container video {
            width: 100%;
            border-radius: 8px 8px 0 0;
        }
        .video-controls {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 0 0 8px 8px;
        }
        .block {
            margin-bottom: 30px;
            padding: 20px;
            border-left: 4px solid #e0e0e0;
            background: #fafafa;
            border-radius: 0 8px 8px 0;
        }
        .block.title { border-left-color: #3b82f6; background: #eff6ff; }
        .block.abstract { border-left-color: #10b981; background: #f0fdf4; }
        .block.keywords { border-left-color: #f59e0b; background: #fffbeb; }
        .block.materials { border-left-color: #8b5cf6; background: #faf5ff; }
        .block.step { border-left-color: #f97316; background: #fff7ed; }
        .block-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .block-title {
            font-weight: bold;
            font-size: 1.1em;
            color: #374151;
        }
        .play-button {
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }
        .play-button:hover {
            background: #059669;
        }
        .play-button:disabled {
            background: #d1d5db;
            cursor: not-allowed;
        }
        .block-content {
            white-space: pre-wrap;
            line-height: 1.7;
            color: #4b5563;
        }
        .time-info {
            margin-top: 10px;
            font-size: 0.9em;
            color: #6b7280;
            font-style: italic;
        }
        .close-video {
            position: absolute;
            top: 5px;
            right: 10px;
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            cursor: pointer;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">
            📋 SOP 标准操作流程文档
        </h1>`;

    const currentBlocks = getCurrentBlocks();
    currentBlocks.forEach((block, index) => {
      const blockTypeNames: Record<SOPBlock['type'], string> = {
        title: '标题',
        abstract: '摘要',
        keywords: '关键词',
        materials: '材料试剂工具设备清单',
        step: '操作步骤',
        unknown: '其他内容'
      };

      const canPlay = block.show_play_button && block.start_time !== undefined;
      
      html += `
        <div class="block ${block.type}">
            <div class="block-header">
                <div class="block-title">${blockTypeNames[block.type]}</div>
                ${canPlay ? `
                <button class="play-button" onclick="playSegment(${block.start_time}, ${block.end_time || 'null'})">
                    ▶️ 播放 (${formatTime(block.start_time)}${block.end_time ? ` - ${formatTime(block.end_time)}` : ''})
                </button>
                ` : ''}
            </div>
            <div class="block-content">${block.content}</div>
            ${block.start_time !== undefined || block.end_time !== undefined ? `
            <div class="time-info">
                时间范围：${block.start_time !== undefined ? formatTime(block.start_time) : '--'} 
                ${block.end_time !== undefined && block.start_time !== block.end_time ? ` - ${formatTime(block.end_time)}` : ''}
            </div>
            ` : ''}
        </div>`;
    });

    html += `
    </div>

    <!-- 视频文件配置区域 -->
    <div class="video-config">
        <h3 style="margin: 0 0 15px 0; color: #495057; display: flex; align-items: center;">
            <span style="margin-right: 8px;">🎥</span>
            视频文件配置
        </h3>
        <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 0.9em;">
                <strong>当前视频文件：</strong><span id="currentVideoName" style="color: #007bff; font-weight: 500;">${videoFileName}</span>
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 0.85em;">
                💡 请确保视频文件与HTML文件在同一目录下，文件名完全匹配
            </p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="selectVideoFile()" style="
                padding: 8px 16px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 0.9em;
                transition: background-color 0.2s;
            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                📁 选择视频文件
            </button>
            <button onclick="testVideoFile()" style="
                padding: 8px 16px; 
                background: #28a745; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 0.9em;
                transition: background-color 0.2s;
            " onmouseover="this.style.background='#1e7e34'" onmouseout="this.style.background='#28a745'">
                ▶️ 测试播放
            </button>
            <span id="videoStatus" style="font-size: 0.85em; color: #6c757d;"></span>
        </div>
        <input type="file" id="videoFileInput" accept="video/*" style="display: none;" onchange="handleVideoFileSelect(event)">
    </div>

    <!-- 视频播放器 -->
    <div id="videoContainer" class="video-container" style="display: none;">
        <button class="close-video" onclick="closeVideo()">×</button>
        <video id="sopVideo" controls>
            <source src="${videoFileName}" type="video/mp4">
            您的浏览器不支持视频播放。
        </video>
        <div class="video-controls">
            <div id="timeInfo" style="text-align: center; font-size: 0.9em; color: #6b7280;">
                点击播放按钮开始观看
            </div>
        </div>
    </div>

    <script>
        const video = document.getElementById('sopVideo');
        const videoContainer = document.getElementById('videoContainer');
        const timeInfo = document.getElementById('timeInfo');
        let currentSegment = null;

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return mins + ':' + secs.toString().padStart(2, '0');
        }

        function playSegment(startTime, endTime) {
            // 获取当前配置的视频文件名
            const currentVideoName = document.getElementById('currentVideoName').textContent;
            const video = document.getElementById('sopVideo');
            const source = video.querySelector('source');
            
            // 确保视频源是最新的
            if (source.src !== currentVideoName) {
                source.src = currentVideoName;
                video.load();
            }
            
            // 检查视频是否可用
            video.addEventListener('error', function onError() {
                alert('视频文件未找到，请确保视频文件"' + currentVideoName + '"与HTML文件在同一目录下。');
                video.removeEventListener('error', onError);
            }, { once: true });
            
            video.addEventListener('loadeddata', function onLoaded() {
                videoContainer.style.display = 'block';
                video.currentTime = startTime;
                video.play();
                
                currentSegment = { start: startTime, end: endTime };
                timeInfo.textContent = '播放中: ' + formatTime(startTime) + 
                    (endTime ? ' - ' + formatTime(endTime) : '');
                
                // 如果有结束时间，设置自动停止
                if (endTime) {
                    const checkEnd = () => {
                        if (video.currentTime >= endTime) {
                            video.pause();
                            timeInfo.textContent = '播放完成: ' + formatTime(startTime) + ' - ' + formatTime(endTime);
                        }
                    };
                    
                    const interval = setInterval(checkEnd, 100);
                    video.addEventListener('pause', () => clearInterval(interval), { once: true });
                }
                video.removeEventListener('loadeddata', onLoaded);
            }, { once: true });
        }

        function closeVideo() {
            video.pause();
            videoContainer.style.display = 'none';
            currentSegment = null;
        }

        // 选择视频文件
        function selectVideoFile() {
            document.getElementById('videoFileInput').click();
        }

        // 处理视频文件选择
        function handleVideoFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                const fileName = file.name;
                document.getElementById('currentVideoName').textContent = fileName;
                
                // 更新video元素的src
                const video = document.getElementById('sopVideo');
                const source = video.querySelector('source');
                source.src = fileName;
                video.load();
                
                // 更新状态显示
                const status = document.getElementById('videoStatus');
                status.textContent = '✅ 已选择: ' + fileName;
                status.style.color = '#28a745';
                
                console.log('视频文件已更改为:', fileName);
                console.log('现在区块播放按钮将使用文件:', fileName);
            }
        }

        // 测试视频文件
        function testVideoFile() {
            const video = document.getElementById('sopVideo');
            const fileName = document.getElementById('currentVideoName').textContent;
            const status = document.getElementById('videoStatus');
            const source = video.querySelector('source');
            
            status.textContent = '🔄 测试中...';
            status.style.color = '#ffc107';
            
            // 确保使用当前配置的文件名
            if (source.src !== fileName) {
                source.src = fileName;
            }
            
            // 尝试加载视频
            video.addEventListener('loadeddata', function() {
                status.textContent = '✅ 视频文件可正常播放';
                status.style.color = '#28a745';
                video.removeEventListener('loadeddata', arguments.callee);
            }, { once: true });
            
            video.addEventListener('error', function() {
                status.textContent = '❌ 视频文件无法加载，请检查文件"' + fileName + '"是否存在';
                status.style.color = '#dc3545';
                video.removeEventListener('error', arguments.callee);
            }, { once: true });
            
            // 重新加载视频
            video.load();
        }

        // 监听视频播放进度
        video.addEventListener('timeupdate', () => {
            if (currentSegment) {
                const current = video.currentTime;
                timeInfo.textContent = '播放中: ' + formatTime(currentSegment.start) + 
                    (currentSegment.end ? ' - ' + formatTime(currentSegment.end) : '') + 
                    ' (当前: ' + formatTime(current) + ')';
            }
        });

        // 页面加载完成后的提示
        window.addEventListener('load', () => {
            console.log('SOP文档已加载完成');
            console.log('当前视频文件:', '${videoFileName}');
            console.log('请确保视频文件与HTML文件在同一目录下');
            
            // 自动测试视频文件
            setTimeout(() => {
                testVideoFile();
            }, 1000);
        });
    </script>
</body>
</html>`;

    return html;
  };

  // 下载文件
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 处理导出
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'txt') {
        content = generateTxtContent();
        filename = `${fileName}.txt`;
        mimeType = 'text/plain;charset=utf-8';
      } else {
        content = generateHtmlContent();
        filename = `${fileName}.html`;
        mimeType = 'text/html;charset=utf-8';
      }
      
      // 调用外部回调（如果有）
      onExport?.(format, content);
      
      // 下载文件
      downloadFile(content, filename, mimeType);
      
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const currentBlocks = getCurrentBlocks();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📤 导出SOP文档</h3>
        
        {/* 区块选择 */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择导出区域：</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="blockSelection"
                value="A"
                checked={selectedBlocks === 'A'}
                onChange={(e) => setSelectedBlocks(e.target.value as 'A' | 'B')}
                className="mr-2"
              />
              <span className="text-sm">编辑区 ({blocksA.length} 个区块)</span>
            </label>
            {blocksB && blocksB.length > 0 && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="blockSelection"
                  value="B"
                  checked={selectedBlocks === 'B'}
                  onChange={(e) => setSelectedBlocks(e.target.value as 'A' | 'B')}
                  className="mr-2"
                />
                <span className="text-sm">精修区 ({blocksB.length} 个区块)</span>
              </label>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          当前选中区域共有 <span className="font-medium text-blue-600">{currentBlocks.length}</span> 个区块
        </div>
      </div>

      <div className="space-y-3">
        {/* 导出纯文本 */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-800">📄 纯文本格式 (.txt)</h4>
              <p className="text-sm text-gray-600">导出为纯文本文件，便于阅读和打印</p>
            </div>
            <button
              onClick={() => handleExport('txt')}
              disabled={isExporting || currentBlocks.length === 0}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {isExporting ? '导出中...' : '导出TXT'}
            </button>
          </div>
        </div>

        {/* 导出HTML关联格式 */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-800">🌐 HTML关联格式 (.html)</h4>
              <p className="text-sm text-gray-600">导出为HTML文件，支持视频片段播放和文件选择</p>
            </div>
            <button
              onClick={() => handleExport('html')}
              disabled={isExporting || currentBlocks.length === 0}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {isExporting ? '导出中...' : '导出HTML'}
            </button>
          </div>
          
          {videoUrl && (
            <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
              ✅ 检测到视频文件，HTML将支持视频片段播放
            </div>
          )}
          
          {!videoUrl && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
              💡 未检测到视频文件，HTML将提供视频文件选择功能
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <h5 className="font-medium mb-1">💡 使用说明：</h5>
        <ul className="space-y-1 text-xs">
          <li>• <strong>TXT格式</strong>：适合打印和简单阅读</li>
          <li>• <strong>HTML格式</strong>：支持视频片段播放，包含视频文件配置功能</li>
          <li>• <strong>视频配置</strong>：HTML开头显示视频文件要求，可点击按钮选择视频</li>
          <li>• <strong>测试功能</strong>：可测试视频文件是否能正常加载和播放</li>
          <li>• <strong>文件要求</strong>：视频文件需与HTML文件在同一目录下</li>
        </ul>
      </div>
    </div>
  );
};

export default SOPExporter;
