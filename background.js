// 初始化时启用侧边栏
chrome.runtime.onInstalled.addListener(async () => {
  // 启用侧边栏
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 确保侧边栏在当前窗口打开
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error("Failed to open side panel:", error);
  }
});

// 初始化配置检查
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["memosUrl", "memosToken"], (result) => {
    if (!result.memosUrl || !result.memosToken) {
      console.log("Memos configuration not found");
    }
  });
});
