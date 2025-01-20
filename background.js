// 初始化时启用侧边栏
chrome.runtime.onInstalled.addListener(async () => {
  // 启用侧边栏
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  // 创建右键菜单
  createContextMenus();
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error("Failed to open side panel:", error);
  }
});

// 创建右键菜单
function createContextMenus() {
  // 确保先清除所有已存在的菜单
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "openInSidebar",
      title: "保存到 Memos",
      contexts: ["selection"]
    });
  });
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "openInSidebar") {
    try {
      // 打开侧边栏
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // 等待一小段时间确保侧边栏已打开
      setTimeout(() => {
        // 发送选中的文本和页面信息到侧边栏
        chrome.runtime.sendMessage({
          type: "setSelectedText",
          data: {
            text: info.selectionText,
            title: tab.title,
            url: tab.url
          }
        });
      }, 500);
      
    } catch (error) {
      console.error("操作失败:", error);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "操作失败",
        message: "无法打开侧边栏，请重试"
      });
    }
  }
});
