# 可调节侧边栏功能说明

## 🎯 功能概述

实现了可调节宽度的聊天侧边栏，用户可以通过拖拽来调整侧边栏宽度，左侧内容区域会根据可用空间自动响应式调整。

## ✨ 主要特性

### 1. 拖拽调整宽度
- **操作方式**: 鼠标悬停在侧边栏左边缘，出现拖拽指示器
- **拖拽范围**: 最小 300px，最大 600px
- **实时反馈**: 拖拽时显示当前宽度数值

### 2. 响应式布局
- **左侧内容**: 根据侧边栏宽度自动调整可用空间
- **网格布局**: 使用 CSS Grid 实现响应式卡片排列
- **断点设置**: 
  - `lg`: 大屏幕显示 2 列
  - `xl`: 超大屏幕显示 3 列
  - 小屏幕始终显示 1 列

### 3. 用户体验优化
- **视觉反馈**: 拖拽指示器悬停显示，拖拽时高亮
- **平滑过渡**: 所有调整都有 CSS 过渡动画
- **宽度记忆**: 使用 localStorage 保存用户偏好设置
- **限制保护**: 防止侧边栏过窄或过宽影响使用

## 🛠️ 技术实现

### 组件结构
```
ResizableLayout
├── 主内容区域 (动态宽度)
├── 拖拽分隔条 (可交互)
└── 聊天侧边栏 (固定宽度)
```

### 关键代码
```typescript
// 拖拽处理
const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing || !containerRef.current) return;
  
  const containerRect = containerRef.current.getBoundingClientRect();
  const newWidth = containerRect.right - e.clientX;
  
  // 限制宽度范围
  const clampedWidth = Math.min(
    Math.max(newWidth, minSidebarWidth),
    maxSidebarWidth
  );
  
  setSidebarWidth(clampedWidth);
};

// 保存用户偏好
const handleMouseUp = () => {
  setIsResizing(false);
  localStorage.setItem('sidebar-width', sidebarWidth.toString());
};
```

### 响应式网格
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
  {/* 内容卡片 */}
</div>
```

## 📱 使用指南

### 基本操作
1. **开始调整**: 将鼠标移动到侧边栏左边缘
2. **拖拽调整**: 按住鼠标左键并左右拖拽
3. **完成调整**: 松开鼠标左键，宽度自动保存

### 视觉提示
- **悬停状态**: 分隔条变蓝，显示圆形拖拽指示器
- **拖拽状态**: 分隔条高亮，显示当前宽度数值
- **完成状态**: 所有视觉反馈消失，新宽度生效

### 布局变化
- **窄侧边栏** (300-400px): 左侧内容显示更多列
- **中等侧边栏** (400-500px): 平衡的布局显示
- **宽侧边栏** (500-600px): 左侧内容紧凑排列

## 🔧 自定义配置

### 修改默认参数
```tsx
<ResizableLayout
  defaultSidebarWidth={400}  // 默认宽度
  minSidebarWidth={280}      // 最小宽度
  maxSidebarWidth={600}      // 最大宽度
  sidebar={<ChatSidebar />}
>
  {/* 内容 */}
</ResizableLayout>
```

### 样式自定义
- 分隔条颜色: 修改 `bg-gray-200 hover:bg-blue-300`
- 指示器样式: 调整拖拽指示器的 CSS 类
- 过渡动画: 修改 `transition-all duration-200`

## 🚀 扩展功能

### 可能的增强
1. **快捷键支持**: 添加键盘快捷键快速调整宽度
2. **预设宽度**: 提供几个常用宽度的快速切换按钮
3. **全屏模式**: 支持隐藏/显示侧边栏
4. **拖拽历史**: 记住用户常用的几个宽度设置

### 性能优化
- 使用 `useCallback` 优化事件处理函数
- 添加防抖处理避免频繁的状态更新
- 考虑使用 `requestAnimationFrame` 优化拖拽性能

## 📋 测试检查清单

- [ ] 拖拽调整宽度功能正常
- [ ] 宽度限制 (300-600px) 生效
- [ ] 左侧内容响应式调整
- [ ] localStorage 保存和恢复宽度
- [ ] 视觉反馈 (悬停、拖拽状态)
- [ ] 不同屏幕尺寸下的布局
- [ ] 平滑过渡动画效果

## 🐛 已知限制

1. **移动端支持**: 当前主要针对桌面端设计，移动端体验待优化
2. **键盘导航**: 暂不支持键盘操作调整宽度
3. **触摸设备**: 触摸设备的拖拽体验可能需要进一步优化

## 📝 更新日志

- **v1.0.0**: 初始实现，支持基本的拖拽调整功能
- **v1.1.0**: 添加 localStorage 宽度记忆功能
- **v1.2.0**: 优化视觉反馈和用户体验
