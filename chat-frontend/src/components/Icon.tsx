import { Icon as IconifyIcon } from '@iconify/react';
import { getIconData, iconToSVG } from '@iconify/utils';
import type { IconifyJSON } from '@iconify/types';
import materialSymbolsData from '@iconify/json/json/material-symbols.json';

// 类型断言，确保 materialSymbols 是正确的 IconifyJSON 类型
const materialSymbols = materialSymbolsData as IconifyJSON;

// 定义图标名称类型
export type IconName = 
  | 'video'           // 🎬
  | 'success'         // ✅
  | 'error'           // ❌
  | 'loading'         // 🔄
  | 'edit'            // 📝
  | 'play'            // ▶️
  | 'pause'           // ⏸️
  | 'camera'          // 📹
  | 'microphone'      // 🎤
  | 'upload'          // 📁
  | 'compress'        // 🗜️
  | 'clipboard'       // 📋
  | 'sparkles'        // ✨
  | 'trash'           // 🗑️
  | 'waiting'         // ⏳
  | 'check'           // ✓
  | 'pencil'          // ✏️
  | 'movie'           // 🎥
  | 'target'          // 🎯
  | 'notifications'   // 🔔
  | 'description'     // 📄
  | 'download'       // 📥
  | 'videoFile'      // 📹
  | 'mail'           // 📧
  | 'code'           // 🐙 (GitHub)
  | 'shield'         // 🛡️
  | 'close';         // ✕

interface IconProps {
  name: IconName;
  className?: string;
  size?: number | string;
  color?: string;
  inline?: boolean; // 是否内联显示（不换行）
}

// Material Symbols 图标映射
const iconMap: Record<IconName, string> = {
  video: 'material-symbols:movie-info-sharp',
  success: 'material-symbols:check-circle',
  error: 'material-symbols:cancel', // close-circle 不存在，使用 cancel
  loading: 'material-symbols:refresh',
  edit: 'material-symbols:edit-document',
  play: 'material-symbols:play-arrow',
  pause: 'material-symbols:pause',
  camera: 'material-symbols:videocam',
  microphone: 'material-symbols:mic',
  upload: 'material-symbols:upload-file',
  compress: 'material-symbols:compress',
  clipboard: 'material-symbols:content-paste',
  sparkles: 'material-symbols:auto-awesome',
  trash: 'material-symbols:delete',
  waiting: 'material-symbols:hourglass-empty',
  check: 'material-symbols:check',
  pencil: 'material-symbols:edit',
  movie: 'material-symbols:movie',
  target: 'material-symbols:my-location',
  notifications: 'material-symbols:notifications',
  description: 'material-symbols:description',
  download: 'material-symbols:download',
  videoFile: 'material-symbols:video-file',
  mail: 'material-symbols:mail',
  code: 'material-symbols:code',
  shield: 'material-symbols:shield-lock',
  close: 'material-symbols:close',
};

export default function Icon({ 
  name, 
  className = '', 
  size = '1em', 
  color,
  inline = false 
}: IconProps) {
  const iconifyName = iconMap[name];
  
  if (!iconifyName) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  const style: React.CSSProperties = {
    display: inline ? 'inline-block' : 'block',
    ...(color ? { color } : {}),
  };

  return (
    <IconifyIcon 
      icon={iconifyName} 
      className={className}
      width={size}
      height={size}
      style={style}
    />
  );
}

// 用于在 HTML 字符串中生成内联 SVG 的辅助函数（离线可用）
export function getIconInlineSVG(name: IconName, size: number = 24, color?: string): string {
  const iconifyName = iconMap[name];
  if (!iconifyName) {
    return '';
  }

  try {
    // 从 iconifyName 中提取图标名称（去掉 "material-symbols:" 前缀）
    const iconName = iconifyName.replace('material-symbols:', '');
    
    // 从本地 JSON 数据中获取图标
    const iconData = getIconData(materialSymbols, iconName);
    if (!iconData) {
      console.warn(`Icon data not found for: ${iconName}`);
      return '';
    }

    // 将图标数据转换为 SVG
    const svg = iconToSVG(iconData, {
      width: `${size}px`,
      height: `${size}px`,
    });

    // 构建完整的 SVG 标签
    const svgAttributes = Object.entries(svg.attributes)
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
      .join(' ');

    // 添加颜色样式（如果指定了颜色）
    const colorStyle = color ? ` fill: ${color};` : '';
    const styleAttr = `style="display: inline-block; vertical-align: middle;${colorStyle}"`;

    return `<svg ${svgAttributes} ${styleAttr}>${svg.body}</svg>`;
  } catch (error) {
    console.error(`Error generating SVG for ${iconifyName}:`, error);
    return '';
  }
}

// 用于在 HTML 字符串中生成内联 SVG（离线可用）
export function getIconImgTag(name: IconName, size: number = 24, color?: string, className: string = ''): string {
  const inlineSVG = getIconInlineSVG(name, size, color);
  if (!inlineSVG) {
    return '';
  }
  const classAttr = className ? ` class="${className}"` : '';
  // 将 className 添加到 SVG 标签中
  return inlineSVG.replace('<svg ', `<svg${classAttr} `);
}

