import { quickSaveToMemos, showNotification } from "./utils.js";
import { loadConfig, needsConfiguration } from "./config.js";

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

// 创建右键菜单
function createContextMenus() {
  // 移除现有菜单
  chrome.contextMenus.removeAll(() => {
    // 创建快速保存菜单项
    chrome.contextMenus.create({
      id: "quickSave",
      title: "快速保存选中内容",
      contexts: ["selection"],
    });

    // 创建在侧边栏中打开菜单项
    chrome.contextMenus.create({
      id: "openInSidebar",
      title: "在侧边栏中打开",
      contexts: ["selection"],
    });
  });
}

// 处理右键菜单点击事件
async function handleContextMenuClick(info, tab) {
  // 检查配置是否完整
  if (await needsConfiguration()) {
    showNotification(
      "需要配置",
      "请先完成 Memos 配置，点击扩展图标打开配置页面"
    );
    return;
  }

  const config = await loadConfig();

  switch (info.menuItemId) {
    case "quickSave":
      try {
        // 快速保存选中内容
        await quickSaveToMemos(info.selectionText, tab.title, tab.url, config);
        // 显示成功通知
        showNotification("保存成功", "内容已快速保存到 Memos");
      } catch (error) {
        // 显示错误通知
        showNotification("保存失败", error.message);
      }
      break;

    case "openInSidebar":
      try {
        // 打开侧边栏并传递选中内容
        await chrome.sidePanel.open({ windowId: tab.windowId });
        // 等待侧边栏准备就绪
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "setSelectedText",
            data: {
              text: info.selectionText,
              title: tab.title,
              url: tab.url,
            },
          });
        }, 500);
      } catch (error) {
        showNotification("操作失败", "无法打开侧边栏");
      }
      break;
  }
}

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
