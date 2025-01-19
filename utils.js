/**
 * 文本格式化工具函数
 */

// 格式化选中的文本为 Markdown 引用格式
function formatSelectedText(text) {
  if (!text) return "";

  // 移除多余的空格和换行
  text = text.trim().replace(/\s+/g, " ");

  // 转换为 Markdown 引用格式
  return `> ${text}`;
}

// 格式化页面信息为 Markdown 格式
function formatPageInfo(title, url) {
  return `\n\n📍 来自：[${title}](${url})`;
}

/**
 * 通知相关函数
 */

// 显示通知
function showNotification(title, message) {
  const notificationId = "memos-notification-" + Date.now();
  chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: title,
      message: message,
      priority: 2,
      requireInteraction: false, // 通知会自动消失
    },
    (notificationId) => {
      // 设置通知自动关闭时间
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000);
    }
  );

  // 同时在控制台记录
  console.log(`[${title}] ${message}`);
}

/**
 * API 相关函数
 */

// 发送内容到 Memos
async function sendToMemos(content, visibility, memosHost, memosToken) {
  try {
    // 确保 memosHost 没有尾随斜杠
    const baseUrl = memosHost.replace(/\/+$/, "");

    // 构建请求数据
    const requestData = {
      content: content,
      visibility: visibility.toUpperCase(), // 确保大写
      resourceIdList: [], // 空资源列表
      relationList: [], // 空关系列表
    };

    console.log("Sending to Memos:", {
      url: `${baseUrl}/api/v1/memos`,
      data: requestData,
      token: memosToken.substring(0, 10) + "...", // 日志中隐藏完整token
    });

    const response = await fetch(`${baseUrl}/api/v1/memos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${memosToken}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Memos API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `保存失败 (${response.status}): ${errorText || response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Memos API Response:", result);

    // 验证响应数据
    if (!result || !result.uid) {
      throw new Error("保存失败：服务器返回的数据格式不正确");
    }

    return result;
  } catch (error) {
    console.error("发送到 Memos 失败:", error);
    throw error; // 继续抛出错误以便上层处理
  }
}

// 快速保存内容到 Memos
async function quickSaveToMemos(selectedText, pageTitle, pageUrl, config) {
  const formattedText = formatSelectedText(selectedText);
  const pageInfo = formatPageInfo(pageTitle, pageUrl);
  const content = `${formattedText}${pageInfo} #快速保存`;

  try {
    const result = await sendToMemos(
      content,
      "PUBLIC",
      config.memosHost,
      config.memosToken
    );
    if (result && result.uid) {
      showNotification(
        "快速保存成功",
        `内容已保存到 Memos (ID: ${result.uid})`
      );
    }
  } catch (error) {
    showNotification("保存失败", error.message);
    throw error;
  }
}

// 导出工具函数
export {
  formatSelectedText,
  formatPageInfo,
  showNotification,
  sendToMemos,
  quickSaveToMemos,
};
