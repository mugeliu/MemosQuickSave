/**
 * 文本格式化工具函数
 */

/**
 * 重试操作的包装函数
 * @param {Function} operation 要执行的操作
 * @param {number} maxRetries 最大重试次数
 * @param {number} delay 重试延迟(ms)
 * @returns {Promise} 操作结果
 */
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`操作失败，第 ${i + 1} 次重试:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间(ms)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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
  // 获取或创建 toast 元素
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  // 设置 toast 内容
  const type = title.toLowerCase().includes('成功') ? 'success' : 'error';
  toast.className = `toast ${type}`;
  
  // 设置 toast HTML
  toast.innerHTML = `
    <div class="icon">
      ${type === 'success' ? `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="var(--success-color)" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      ` : `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="var(--error-color)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      `}
    </div>
    <div class="message">
      <div class="title">${title}</div>
      <div class="description">${message}</div>
    </div>
  `;

  // 显示 toast
  toast.style.display = 'flex';
  setTimeout(() => toast.classList.add('show'), 10);

  // 3秒后隐藏
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, 3000);

  // 同时在控制台记录
  console.log(`[${title}] ${message}`);
}

/**
 * API 相关函数
 */

// 发送内容到 Memos
async function sendToMemos(content, visibility, memosHost, memosToken) {
  return await retryOperation(async () => {
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
  });
}

// 导出工具函数
export {
  formatSelectedText,
  formatPageInfo,
  showNotification,
  sendToMemos,
  retryOperation,
  debounce,
};
