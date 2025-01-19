import {
  formatSelectedText,
  formatPageInfo,
  showNotification,
  sendToMemos,
} from "./utils.js";
import {
  loadConfig,
  saveConfig,
  validateConfig,
  needsConfiguration,
} from "./config.js";

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
}

// 隐藏加载动画
function hideLoading() {
  elements.loadingOverlay.classList.add("hidden");
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
}

// 保存配置
async function handleSaveConfig() {
  showLoading();
  try {
    const config = {
      memosHost: elements.memosHost.value.trim(),
      memosToken: elements.memosToken.value.trim(),
      glmApiKey: elements.glmApiKey.value.trim(),
    };

    if (!validateConfig(config)) {
      throw new Error("请填写必要的配置信息");
    }

    await saveConfig(config);
    showNotification("配置成功", "配置信息已保存");
    await checkConfiguration();
  } catch (error) {
    showNotification("配置失败", error.message);
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
    setTimeout(() => {
      elements.copyUrl.title = "复制链接";
    }, 2000);
  } catch (error) {
    console.error("复制失败:", error);
  }
}

// 调用智谱API进行总结
async function callGlmApi(title, url) {
  const config = await loadConfig();
  if (!config.glmApiKey) {
    throw new Error("请先配置智谱 API Key");
  }

  const systemPrompt = `你是一个专业的文章分析助手。我会给你一篇文章的标题和链接，请你：
1. 基于标题和链接，分析文章的主题和背景
2. 推测文章可能包含的关键信息点
3. 给出建议的阅读角度

输出格式：
### 📌 主题分析
[分析文章的主题和背景，100字以内]

### 💡 可能的关键点
- 点1
- 点2
- 点3

### 👀 阅读建议
[给出阅读这篇文章的建议角度，50字以内]`;

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

// 处理AI总结
async function handleAiSummary() {
  if (!currentPageInfo.title || !currentPageInfo.url) {
    showNotification("无法分析", "请确保已获取到页面信息");
    return;
  }

  showLoading("AI 正在分析...");
  try {
    const analysis = await callGlmApi(
      currentPageInfo.title,
      currentPageInfo.url
    );
    elements.summaryInput.value = analysis;
    showNotification("AI 分析完成", "已生成内容分析");
  } catch (error) {
    console.error("AI 分析失败:", error);
    showNotification("AI 分析失败", error.message);
  } finally {
    hideLoading();
  }
}

// 更新可见性状态显示
function updateVisibilityLabel() {
  const toggleLabel = elements.visibilityToggle.nextElementSibling;
  toggleLabel.textContent = elements.visibilityToggle.checked ? "公开" : "私密";
}

// 提交到Memos
async function handleSubmitMemo() {
  showLoading();
  try {
    const config = await loadConfig();
    const visibility = elements.visibilityToggle.checked ? "PUBLIC" : "PRIVATE";

    let content = "## 📝 读书笔记\n\n";
    content += "### 📖 原文信息\n\n";
    content += `- 标题：${currentPageInfo.title}\n`;
    content += `- 链接：${currentPageInfo.url}\n\n`;

    if (elements.summaryInput.value.trim()) {
      content += "### 💭 原文摘要\n\n";
      content += elements.summaryInput.value.trim() + "\n\n";
    }

    if (elements.thoughtInput.value.trim()) {
      content += "### 🤔 个人感想\n\n";
      content += elements.thoughtInput.value.trim();
    }

    const result = await sendToMemos(
      content,
      visibility,
      config.memosHost,
      config.memosToken
    );

    // 检查返回结果中的 uid 字段
    if (result && result.uid) {
      showNotification("保存成功", `笔记已保存，ID: ${result.uid}`);
      // 清空输入
      elements.summaryInput.value = "";
      elements.thoughtInput.value = "";
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

// 初始化事件监听
function initializeEventListeners() {
  elements.saveConfig.addEventListener("click", handleSaveConfig);
  elements.refreshInfo.addEventListener("click", getCurrentTab);
  elements.copyUrl.addEventListener("click", handleCopyUrl);
  elements.aiSummary.addEventListener("click", handleAiSummary);
  elements.submitMemo.addEventListener("click", handleSubmitMemo);
  elements.visibilityToggle.addEventListener("change", updateVisibilityLabel);
  chrome.runtime.onMessage.addListener(handleMessage);
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
