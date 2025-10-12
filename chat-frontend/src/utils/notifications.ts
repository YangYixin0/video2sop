class NotificationManager {
  private hasPermission = false;

  async initialize(): Promise<boolean> {
    try {
      if ('Notification' in window) {
        console.log('浏览器支持通知API');
        
        // 检查当前权限状态
        const currentPermission = Notification.permission;
        console.log('当前通知权限:', currentPermission);
        
        if (currentPermission === 'granted') {
          this.hasPermission = true;
          return true;
        } else if (currentPermission === 'denied') {
          console.log('通知权限已被拒绝');
          this.hasPermission = false;
          return false;
        } else {
          // 请求权限
          console.log('请求通知权限...');
          const permission = await Notification.requestPermission();
          console.log('权限请求结果:', permission);
          
          this.hasPermission = permission === 'granted';
          return this.hasPermission;
        }
      } else {
        console.log('浏览器不支持通知API');
        this.hasPermission = false;
        return false;
      }
    } catch (error) {
      console.error('初始化通知权限失败:', error);
      this.hasPermission = false;
      return false;
    }
  }

  sendNotification(title: string, body: string, options?: NotificationOptions, force: boolean = false) {
    console.log('尝试发送通知:', { title, body, hasPermission: this.hasPermission, isPageVisible: this.isPageVisible(), force });
    
    if (this.hasPermission) {
      // 强制发送或测试通知始终发送，实际通知只在页面不可见时发送
      if (force || title.includes('测试') || !this.isPageVisible()) {
        try {
          // 生成唯一的tag，避免通知被覆盖
          const uniqueTag = `video2sop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: uniqueTag, // 使用唯一tag
            requireInteraction: true, // 要求用户交互才关闭
            ...options
          });
          
          console.log('通知发送成功:', notification, 'tag:', uniqueTag);
          
          // 监听通知点击事件
          notification.onclick = () => {
            console.log('通知被点击');
            window.focus();
            notification.close();
          };
          
        } catch (error) {
          console.error('发送通知失败:', error);
        }
      } else {
        console.log('页面可见且非测试通知，跳过通知发送');
      }
    } else {
      console.log('没有通知权限，跳过通知发送');
    }
  }

  private isPageVisible(): boolean {
    return !document.hidden && document.visibilityState === 'visible';
  }

  onVisibilityChange(callback: (visible: boolean) => void) {
    document.addEventListener('visibilitychange', () => {
      const isVisible = this.isPageVisible();
      console.log('页面可见性变化:', isVisible);
      callback(isVisible);
    });
  }

  // 添加窗口焦点变化监听
  onFocusChange(callback: (focused: boolean) => void) {
    window.addEventListener('focus', () => {
      console.log('窗口获得焦点');
      callback(true);
    });
    
    window.addEventListener('blur', () => {
      console.log('窗口失去焦点');
      callback(false);
    });
  }

  getPermissionStatus(): boolean {
    return this.hasPermission;
  }

  setPermissionStatus(permission: boolean) {
    this.hasPermission = permission;
  }

  disable() {
    this.hasPermission = false;
  }

  enable() {
    this.hasPermission = true;
  }
}

export const notificationManager = new NotificationManager();
