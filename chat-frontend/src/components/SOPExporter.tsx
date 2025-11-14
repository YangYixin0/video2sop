'use client';

import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { SOPBlock, ExportFormat } from '@/types/sop';
import Icon, { getIconImgTag } from './Icon';

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
  const { t } = useI18n();

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
    let stepCounter = 1; // 操作步骤计数器
    
    currentBlocks.forEach((block) => {
      // 添加区块标题（本地化）
      const baseLabel = t(
        block.type === 'title' ? 'sop.block_labels.title' :
        block.type === 'abstract' ? 'sop.block_labels.abstract' :
        block.type === 'keywords' ? 'sop.block_labels.keywords' :
        block.type === 'materials' ? 'sop.block_labels.materials' :
        block.type === 'step' ? 'sop.block_labels.step' :
        'sop.block_labels.unknown'
      );
      const blockTitle = block.type === 'step' ? `${baseLabel} ${stepCounter++}` : baseLabel;
      
      content += `${blockTitle}：\n`;
      content += `${block.content}\n`;
      
      // 如果有时间戳且是播放区块，添加时间信息
      if ((block.start_time !== undefined || block.end_time !== undefined) && block.show_play_button) {
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
        content += `\n${'='.repeat(50)}\n\n`;
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
        /* 区块样式：少量间隔、无圆角/边框，浅色背景 + 深色左边缘 */
        .block {
            margin-bottom: 8px;
            padding: 12px 16px;
            border: none;
            border-radius: 0;
        }
        .block.title {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
        }
        .block.abstract {
            background: #dcfce7;
            border-left: 4px solid #22c55e;
        }
        .block.keywords {
            background: #fef9c3;
            border-left: 4px solid #eab308;
        }
        .block.materials {
            background: #f3e8ff;
            border-left: 4px solid #a855f7;
        }
        .block.step {
            background: #ffedd5;
            border-left: 4px solid #f97316;
        }
        .block.unknown {
            background: #f3f4f6;
            border-left: 4px solid #6b7280;
        }
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
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }
        .play-button:hover {
            background: #059669;
        }
        .play-button:disabled {
            background: #d1d5db;
            color: #6b7280;
            cursor: not-allowed;
        }
        .block-content {
            white-space: pre-wrap;
            line-height: 1.7;
            color: #4b5563;
            padding: 0;
            border: none;
            border-radius: 0;
            outline: none;
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
            ${t('exporter_html.title')}
        </h1>

    <!-- 视频文件配置区域 -->
    <div class="video-config">
        <h3 style="margin: 0 0 15px 0; color: #495057; display: flex; align-items: center;">
            ${getIconImgTag('movie', 20, undefined, 'mr-2')}
            ${t('exporter_html.video_config_title')}
        </h3>
        <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 0.9em;">
                <strong>${t('exporter_html.current_video')}</strong><span id="currentVideoName" style="color: #007bff; font-weight: 500;">${videoFileName}</span>
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 0.85em;">
                    ${t('exporter_html.ensure_same_dir')}
            </p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="selectVideoFile()" style="
                padding: 8px 16px; 
                background: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 0.9em;
                transition: background-color 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                ${t('exporter_html.select_video')}
            </button>
            <button onclick="testVideoFile()" style="
                padding: 8px 16px; 
                background: #10b981; 
                color: white; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 0.9em;
                transition: background-color 0.2s;
            " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                ${t('exporter_html.test_play')}
            </button>
            <span id="videoStatus" style="font-size: 0.85em; color: #6c757d;"></span>
        </div>
        <input type="file" id="videoFileInput" accept="video/*" style="display: none;" onchange="handleVideoFileSelect(event)">
        </div>
    </div>`;

    const currentBlocks = getCurrentBlocks();
    let stepCounter = 1; // 操作步骤计数器
    currentBlocks.forEach((block) => {
      const baseLabel = t(
        block.type === 'title' ? 'sop.block_labels.title' :
        block.type === 'abstract' ? 'sop.block_labels.abstract' :
        block.type === 'keywords' ? 'sop.block_labels.keywords' :
        block.type === 'materials' ? 'sop.block_labels.materials' :
        block.type === 'step' ? 'sop.block_labels.step' :
        'sop.block_labels.unknown'
      );
      const blockTitle = block.type === 'step' ? `${baseLabel} ${stepCounter++}` : baseLabel;

      const canPlay = block.show_play_button && block.start_time !== undefined;
      
      html += `
        <div class="block ${block.type}">
            <div class="block-header">
                <div class="block-title">${blockTitle}</div>
                ${canPlay ? `
                <button class="play-button" onclick="playSegment(${block.start_time}, ${block.end_time || 'null'})">
                    ${getIconImgTag('play', 16)} 播放 (${block.start_time !== undefined ? formatTime(block.start_time) : ''}${block.end_time ? ` - ${formatTime(block.end_time)}` : ''})
                </button>
                ` : ''}
            </div>
            <div class="block-content" contenteditable="true">${block.content}</div>
            ${(block.start_time !== undefined || block.end_time !== undefined) && block.show_play_button ? `
            <div class="time-info">
                时间范围：${block.start_time !== undefined ? formatTime(block.start_time) : '--'} 
                ${block.end_time !== undefined && block.start_time !== block.end_time ? ` - ${formatTime(block.end_time)}` : ''}
            </div>
            ` : ''}
        </div>`;
    });

    html += `
    </div>

    <!-- 视频播放器 -->
    <div id="videoContainer" class="video-container" style="display: none;">
        <button class="close-video" onclick="closeVideo()">×</button>
        <video id="sopVideo" controls>
            <source src="${videoFileName}" type="video/mp4">
            ${t('exporter_html.browser_not_support')}
        </video>
        <div class="video-controls">
            <div id="timeInfo" style="text-align: center; font-size: 0.9em; color: #6b7280;">
                ${t('exporter_html.click_to_play')}
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
                // 本地化模板在构建时注入，在运行时替换文件名占位符
                const notFoundTpl = ${JSON.stringify(t('exporter_html.alert_not_found', { name: '__NAME__' }))};
                alert(notFoundTpl.replace('__NAME__', currentVideoName));
                video.removeEventListener('error', onError);
            }, { once: true });
            
            video.addEventListener('loadeddata', function onLoaded() {
                videoContainer.style.display = 'block';
                video.currentTime = startTime;
                video.play();
                
                currentSegment = { start: startTime, end: endTime };
                timeInfo.textContent = ${JSON.stringify(t('exporter_html.playing') + ' ')} + formatTime(startTime)
                    + (endTime ? ' - ' + formatTime(endTime) : '');
                
                // 如果有结束时间，设置自动停止
                if (endTime) {
                    const checkEnd = () => {
                        if (video.currentTime >= endTime) {
                            video.pause();
                            timeInfo.textContent = ${JSON.stringify(t('exporter_html.play_done') + ' ')} + formatTime(startTime) + ' - ' + formatTime(endTime);
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
                status.textContent = ${JSON.stringify(t('exporter_html.selected_file') + ' ')} + fileName;
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
            
            status.textContent = ${JSON.stringify(t('exporter_html.testing'))};
            status.style.color = '#ffc107';
            
            // 确保使用当前配置的文件名
            if (source.src !== fileName) {
                source.src = fileName;
            }
            
            // 尝试加载视频
            video.addEventListener('loadeddata', function() {
                status.textContent = ${JSON.stringify(t('exporter_html.test_ok'))};
                status.style.color = '#28a745';
                video.removeEventListener('loadeddata', arguments.callee);
            }, { once: true });
            
            video.addEventListener('error', function() {
                const failTpl = ${JSON.stringify(t('exporter_html.test_fail', { name: '__NAME__' }))};
                status.textContent = failTpl.replace('__NAME__', fileName);
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
                timeInfo.textContent = ${JSON.stringify(t('exporter_html.playing') + ' ')} + formatTime(currentSegment.start)
                    + (currentSegment.end ? ' - ' + formatTime(currentSegment.end) : '')
                    + ' ' + ${JSON.stringify(t('exporter_html.current_time'))} + ' ' + formatTime(current);
            }
        });

        // 编辑相关功能
        function initializeEditableContent() {
            // 为所有可编辑区域添加编辑提示
            const editableElements = document.querySelectorAll('.block-content[contenteditable="true"]');
            editableElements.forEach(element => {
                // 添加编辑提示
                if (!element.hasAttribute('data-hint-added')) {
                    element.setAttribute('data-hint-added', 'true');
                    
                    // 移除编辑提示功能，保持内容可编辑但无提示
                    
                    // 添加键盘快捷键支持
                    element.addEventListener('keydown', function(e) {
                        // Ctrl+S 保存提示
                        if (e.ctrlKey && e.key === 's') {
                            e.preventDefault();
                            showSaveNotification();
                        }
                    });
                }
            });
        }
        
        function showSaveNotification() {
            // 创建保存提示
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            \`;
            notification.innerHTML = \`
                <div style="display: flex; align-items: center;">
                    ${getIconImgTag('edit', 20, undefined, 'mr-2')}
                    <span>编辑内容已更新！</span>
                </div>
            \`;
            
            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            \`;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            
            // 3秒后自动移除
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        // 页面加载完成后的提示
        window.addEventListener('load', () => {
            console.log(${JSON.stringify('HTML loaded')});
            initializeEditableContent();
            console.log('Current video:', '${videoFileName}');
            console.log('Ensure video and HTML are in the same folder');
            
            // 自动测试视频文件
            setTimeout(() => {
                testVideoFile();
            }, 1000);
        });
    </script>
    
    <!-- 生成信息 -->
    <div style="margin-top: 40px; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      <p>${t('exporter_html.generated_by_prefix')} <a href="${process.env.NEXT_PUBLIC_APP_GITHUB || '#'}" target="_blank" style="color: #3b82f6; text-decoration: none;">Video2SOP</a> ${t('exporter_html.generated_by_suffix')}</p>
    </div>
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
      console.error(t('exporter.export_failed') + ':', error);
      alert(t('exporter.export_failed_retry'));
    } finally {
      setIsExporting(false);
    }
  };

  const currentBlocks = getCurrentBlocks();

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="download" size={24} inline />
          {t('exporter.title')}
        </h2>
        
        {/* 区块选择 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <Icon name="target" size={20} className="mr-2" inline />
            {t('exporter.select_area')}
          </label>
          <div className="flex space-x-6">
            <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedBlocks === 'A' 
                ? 'border-blue-500 bg-blue-100 shadow-md' 
                : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
            }`}>
              <input
                type="radio"
                name="blockSelection"
                value="A"
                checked={selectedBlocks === 'A'}
                onChange={(e) => setSelectedBlocks(e.target.value as 'A' | 'B')}
                className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className={`text-sm font-medium ${
                  selectedBlocks === 'A' ? 'text-blue-800' : 'text-gray-700'
                }`}>
                  <Icon name="edit" size={16} className="mr-1" inline />
                  {t('exporter.edit_area')}
                </span>
                <span className={`block text-xs ${
                  selectedBlocks === 'A' ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  ({blocksA.length} {t('exporter.blocks')})
                </span>
              </div>
            </label>
            {blocksB && blocksB.length > 0 && (
              <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedBlocks === 'B' 
                  ? 'border-blue-500 bg-blue-100 shadow-md' 
                  : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}>
                <input
                  type="radio"
                  name="blockSelection"
                  value="B"
                  checked={selectedBlocks === 'B'}
                  onChange={(e) => setSelectedBlocks(e.target.value as 'A' | 'B')}
                  className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className={`text-sm font-medium ${
                    selectedBlocks === 'B' ? 'text-blue-800' : 'text-gray-700'
                  }`}>
                    <Icon name="sparkles" size={16} className="mr-1" inline />
                    {t('exporter.refine_area')}
                  </span>
                  <span className={`block text-xs ${
                    selectedBlocks === 'B' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    ({blocksB.length} {t('exporter.blocks')})
                  </span>
                </div>
              </label>
            )}
          </div>
        </div>
        
      </div>

      <div className="space-y-3">
        {/* 导出纯文本 */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-4">
              <Icon name="description" size={96} />
            <div>
                <h4 className="font-medium text-gray-800 mb-1">
                  {t('exporter.txt_title')}
                </h4>
              <p className="text-sm text-gray-600">
                  {t('exporter.txt_desc')} <a href="https://protocols.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Protocols.io</a>
              </p>
              </div>
            </div>
            <button
              onClick={() => handleExport('txt')}
              disabled={isExporting || currentBlocks.length === 0}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isExporting ? t('exporter.exporting') : t('exporter.export_txt')}
            </button>
          </div>
        </div>

        {/* 导出HTML关联格式 */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-4">
              <Icon name="videoFile" size={96} />
            <div>
                <h4 className="font-medium text-gray-800 mb-1">
                  {t('exporter.html_title')}
                </h4>
              <p className="text-sm text-gray-600 mb-1">
                  {t('exporter.html_desc1')}
              </p>
              <p className="text-sm text-gray-600">
                  {t('exporter.html_desc2')}
              </p>
              </div>
            </div>
            <button
              onClick={() => handleExport('html')}
              disabled={isExporting || currentBlocks.length === 0}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isExporting ? t('exporter.exporting') : t('exporter.export_html')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SOPExporter;
