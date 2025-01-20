import {
  formatSelectedText,
  formatPageInfo,
  showNotification,
  sendToMemos,
  retryOperation,
  debounce,
} from "./utils.js";
import {
  loadConfig,
  saveConfig,
  validateConfig,
  needsConfiguration,
} from "./config.js";

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的文章分析助手,请对文章进行以下分析:

1. 核心要点 (50字以内,提炼文章最关键的信息)
2. 关键词 (提取3个最具代表性的关键词，用逗号分隔，例如：Nextjs13,React,TypeScript.每个关键词中不应该包含空格)
3. 知识亮点 (列出2-3个文章中体现的关键知识点或技术点)

输出格式:
### 💡 核心要点
[精炼的核心内容概括]

### 🔑 关键词
[关键词1],[关键词2],[关键词3]

### 📚 知识亮点
- [知识点1]
- [知识点2]
- [知识点3]`;

// DOM 元素
const elements = {
  configSection: document.getElementById("configSection"),
  contentSection: document.getElementById("contentSection"),
  memosHost: document.getElementById("memosHost"),
  memosToken: document.getElementById("memosToken"),
  glmApiKey: document.getElementById("glmApiKey"),
  saveConfig: document.getElementById("saveConfig"),
  titleElem: document.getElementById("titleElem"),
  urlElem: document.getElementById("urlElem"),
  refreshInfo: document.getElementById("refreshInfo"),
  copyUrl: document.getElementById("copyUrl"),
  summaryInput: document.getElementById("summaryInput"),
  aiSummary: document.getElementById("aiSummary"),
  thoughtInput: document.getElementById("thoughtInput"),
  visibilityToggle: document.getElementById("visibilityToggle"),
  submitMemo: document.getElementById("submitMemo"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  openConfig: document.getElementById("openConfig"),
  customPrompt: document.getElementById("customPrompt"),
  resetPrompt: document.getElementById("resetPrompt"),
  toggleAdvanced: document.querySelector(".toggle-advanced"),
  advancedContent: document.querySelector(".advanced-content"),
};

// 当前页面信息
let currentPageInfo = {
  title: "",
  url: "",
};

// 显示加载动画
function showLoading(text = "正在处理...") {
  elements.loadingOverlay.querySelector(".loading-text").textContent = text;
  elements.loadingOverlay.classList.remove("hidden");
  // 禁用所有输入和按钮
  elements.submitMemo.disabled = true;
  elements.aiSummary.disabled = true;
  elements.saveConfig.disabled = true;
}

// 隐藏加载动画
function hideLoading() {
  elements.loadingOverlay.classList.add("hidden");
  // 恢复所有输入和按钮
  elements.submitMemo.disabled = false;
  elements.aiSummary.disabled = false;
  elements.saveConfig.disabled = false;
}

// 获取当前标签页信息
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      updatePageInfo(tab.title, tab.url);
    }
  } catch (error) {
    console.error("获取页面信息失败:", error);
    showNotification("获取页面信息失败", "请刷新页面重试");
  }
}

// 初始化配置界面
async function initializeConfig() {
  const config = await loadConfig();
  elements.memosHost.value = config.memosHost || "";
  elements.memosToken.value = config.memosToken || "";
  elements.glmApiKey.value = config.glmApiKey || "";
  elements.customPrompt.value = config.customPrompt || "";
}

// 保存配置
async function handleSaveConfig() {
  showLoading("正在验证配置...");
  try {
    const config = {
      memosHost: elements.memosHost.value.trim(),
      memosToken: elements.memosToken.value.trim(),
      glmApiKey: elements.glmApiKey.value.trim(),
      customPrompt: elements.customPrompt.value.trim(),
    };

    // 基本验证
    if (!config.memosHost || !config.memosToken) {
      throw new Error("请填写必要的配置信息（服务器地址和API Token）");
    }

    // URL格式验证
    try {
      new URL(config.memosHost);
    } catch {
      throw new Error("请输入有效的服务器地址");
    }

    await saveConfig(config);
    showNotification("配置成功", "配置信息已保存");
    
    // 配置成功后，切换到内容编辑界面
    elements.configSection.style.display = "none";
    elements.contentSection.style.display = "block";
    await getCurrentTab();
  } catch (error) {
    console.error("配置保存失败:", error);
    showErrorMessage(elements.memosHost, error.message);
  } finally {
    hideLoading();
  }
}

// 检查配置状态
async function checkConfiguration() {
  const needsConfig = await needsConfiguration();
  elements.configSection.style.display = needsConfig ? "block" : "none";
  elements.contentSection.style.display = needsConfig ? "none" : "block";

  if (!needsConfig) {
    await getCurrentTab();
  }
}

// 更新页面信息显示
function updatePageInfo(title, url) {
  currentPageInfo = { title, url };
  elements.titleElem.textContent = title;
  elements.titleElem.title = title;
  elements.urlElem.textContent = new URL(url).hostname;
  elements.urlElem.title = url;
}

// 复制链接
async function handleCopyUrl() {
  try {
    await navigator.clipboard.writeText(currentPageInfo.url);
    elements.copyUrl.title = "已复制";
    elements.copyUrl.classList.add("success");
    setTimeout(() => {
      elements.copyUrl.title = "复制链接";
      elements.copyUrl.classList.remove("success");
    }, 2000);
  } catch (error) {
    console.error("复制失败:", error);
    showNotification("复制失败", "请重试");
  }
}

// 重置提示词为默认值
function handleResetPrompt() {
  elements.customPrompt.value = DEFAULT_SYSTEM_PROMPT;
  elements.customPrompt.classList.add("success");
  setTimeout(() => elements.customPrompt.classList.remove("success"), 1000);
}

// 切换高级设置显示
function toggleAdvancedSettings() {
  elements.toggleAdvanced.classList.toggle("expanded");
  elements.advancedContent.classList.toggle("show");
}

// 调用智谱API进行总结
async function callGlmApi(title, url) {
  const config = await loadConfig();
  if (!config.glmApiKey) {
    throw new Error("请先配置智谱 API Key");
  }

  // 使用自定义提示词或默认提示词
  const systemPrompt = config.customPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.glmApiKey}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `请分析这篇文章：\n\n标题：${title}\n链接：${url}`,
          },
        ],
        temperature: 0.7,
        top_p: 0.7,
        max_tokens: 1000,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `AI 分析请求失败: ${errorData.error?.message || response.statusText}`
    );
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// 显示错误消息
function showErrorMessage(element, message) {
  // 移除已存在的错误消息
  const existingError = element.parentElement.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }

  // 创建错误消息元素
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
    ${message}
  `;

  // 插入错误消息
  element.parentElement.appendChild(errorDiv);

  // 添加错误样式
  element.classList.add('error');
  
  // 3秒后移除错误样式和消息
  setTimeout(() => {
    element.classList.remove('error');
    errorDiv.remove();
  }, 3000);
}

// 处理AI总结
async function handleAiSummary() {
  if (!currentPageInfo.title || !currentPageInfo.url) {
    showNotification("无法分析", "请确保已获取到页面信息");
    return;
  }

  // 检查是否配置了AI API Key
  const config = await loadConfig();
  if (!config.glmApiKey) {
    // 显示配置按钮的错误提示
    showErrorMessage(elements.aiSummary, "请先配置智谱 API Key");
    return;
  }

  showLoading("AI 正在分析...");
  try {
    const analysis = await retryOperation(
      () => callGlmApi(currentPageInfo.title, currentPageInfo.url)
    );
    elements.summaryInput.value = analysis;
    showNotification("AI 分析完成", "已生成内容分析");
  } catch (error) {
    console.error("AI 分析失败:", error);
    showErrorMessage(elements.aiSummary, error.message);
  } finally {
    hideLoading();
  }
}

// 更新可见性状态显示
function updateVisibilityLabel() {
  const toggleLabel = elements.visibilityToggle.nextElementSibling;
  toggleLabel.textContent = elements.visibilityToggle.checked ? "公开" : "私密";
  // 添加动画效果
  toggleLabel.classList.add("updated");
  setTimeout(() => toggleLabel.classList.remove("updated"), 300);
}

// 提交到Memos
async function handleSubmitMemo() {
  // 表单验证
  if (!elements.summaryInput.value.trim() && !elements.thoughtInput.value.trim()) {
    showNotification("内容为空", "请填写摘要或感想");
    elements.summaryInput.classList.add("error");
    setTimeout(() => elements.summaryInput.classList.remove("error"), 2000);
    return;
  }

  showLoading("正在保存...");
  try {
    const config = await loadConfig();
    const visibility = elements.visibilityToggle.checked ? "PUBLIC" : "PRIVATE";

    let content = `### 📖 ${currentPageInfo.title}\n\n`;
    content += `> 🔗 原文链接：${currentPageInfo.url}\n\n`;

    if (elements.summaryInput.value.trim()) {
      content += `### 📝 内容摘要\n${elements.summaryInput.value.trim()}\n\n`;
    }

    if (elements.thoughtInput.value.trim()) {
      content += `### 🤔 个人思考\n${elements.thoughtInput.value.trim()}\n\n`;
    }

    content += `---\n*由 Memos Quick Save 自动保存*\n\n`;
    content += `#文章笔记 #MemosQuickSave #快速保存`;

    const result = await sendToMemos(
      content,
      visibility,
      config.memosHost,
      config.memosToken
    );

    if (result && result.uid) {
      showNotification("保存成功", "内容已保存到 Memos");
      // 清空输入并添加动画效果
      elements.summaryInput.value = "";
      elements.thoughtInput.value = "";
      elements.summaryInput.classList.add("success");
      elements.thoughtInput.classList.add("success");
      setTimeout(() => {
        elements.summaryInput.classList.remove("success");
        elements.thoughtInput.classList.remove("success");
      }, 2000);
    } else {
      console.error("Invalid response:", result);
      throw new Error("保存失败：服务器返回的数据格式不正确");
    }
  } catch (error) {
    console.error("保存失败:", error);
    showNotification("保存失败", error.message);
  } finally {
    hideLoading();
  }
}

// 处理来自background的消息
function handleMessage(message) {
  if (message.type === "setSelectedText") {
    const { text, title, url } = message.data;
    updatePageInfo(title, url);
    elements.summaryInput.value = formatSelectedText(text);
  }
}

// 切换配置面板
function toggleConfigPanel() {
  const isConfigVisible = elements.configSection.style.display === "block";
  
  // 添加过渡效果
  elements.configSection.style.opacity = "0";
  elements.contentSection.style.opacity = "0";
  
  setTimeout(() => {
    elements.configSection.style.display = isConfigVisible ? "none" : "block";
    elements.contentSection.style.display = isConfigVisible ? "block" : "none";
    
    // 如果打开配置面板，自动加载当前配置
    if (!isConfigVisible) {
      initializeConfig();
    }
    
    // 淡入效果
    setTimeout(() => {
      elements.configSection.style.opacity = "1";
      elements.contentSection.style.opacity = "1";
    }, 50);
  }, 300);
}

// 初始化事件监听
function initializeEventListeners() {
  elements.saveConfig.addEventListener("click", handleSaveConfig);
  elements.refreshInfo.addEventListener("click", getCurrentTab);
  elements.copyUrl.addEventListener("click", handleCopyUrl);
  elements.aiSummary.addEventListener("click", handleAiSummary);
  elements.submitMemo.addEventListener("click", handleSubmitMemo);
  elements.visibilityToggle.addEventListener("change", updateVisibilityLabel);
  elements.openConfig.addEventListener("click", toggleConfigPanel);
  elements.resetPrompt.addEventListener("click", handleResetPrompt);
  elements.toggleAdvanced.addEventListener("click", toggleAdvancedSettings);
  chrome.runtime.onMessage.addListener(handleMessage);

  // 添加输入框焦点效果
  elements.summaryInput.addEventListener("focus", () => {
    elements.summaryInput.classList.add("focused");
  });
  elements.summaryInput.addEventListener("blur", () => {
    elements.summaryInput.classList.remove("focused");
  });
  elements.thoughtInput.addEventListener("focus", () => {
    elements.thoughtInput.classList.add("focused");
  });
  elements.thoughtInput.addEventListener("blur", () => {
    elements.thoughtInput.classList.remove("focused");
  });

  // 添加配置输入框的验证
  elements.memosHost.addEventListener("input", () => {
    try {
      new URL(elements.memosHost.value);
      elements.memosHost.classList.remove("error");
    } catch {
      if (elements.memosHost.value) {
        showErrorMessage(elements.memosHost, "请输入有效的URL地址");
      }
    }
  });

  elements.memosToken.addEventListener("input", () => {
    if (elements.memosToken.value && elements.memosToken.value.length < 32) {
      showErrorMessage(elements.memosToken, "Token长度不足");
    } else {
      elements.memosToken.classList.remove("error");
    }
  });

  elements.glmApiKey.addEventListener("input", () => {
    if (elements.glmApiKey.value && elements.glmApiKey.value.length < 32) {
      showErrorMessage(elements.glmApiKey, "API Key长度不足");
    } else {
      elements.glmApiKey.classList.remove("error");
    }
  });
}

// 初始化
async function initialize() {
  await initializeConfig();
  await checkConfiguration();
  updateVisibilityLabel(); // 初始化可见性标签
  initializeEventListeners();
}

// 启动应用
initialize().catch((error) => {
  console.error("初始化失败:", error);
  showNotification("初始化失败", error.message);
});
