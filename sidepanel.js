// DOM 元素
const configPanel = document.getElementById("config-panel");
const mainPanel = document.getElementById("main-panel");
const toggleConfigBtn = document.getElementById("toggle-config");
const saveConfigBtn = document.getElementById("save-config");
const submitButton = document.getElementById("submit-button");
const toast = document.getElementById("toast");

// 输入元素
const memosUrlInput = document.getElementById("memos-url");
const memosTokenInput = document.getElementById("memos-token");
const pageTitleInput = document.getElementById("page-title");
const pageUrlInput = document.getElementById("page-url");
const summaryInput = document.getElementById("summary");
const thoughtsInput = document.getElementById("thoughts");

// 验证URL格式
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 验证输入
function validateInputs() {
  if (!summaryInput.value.trim()) {
    showToast("请输入原文摘要", true);
    return false;
  }
  if (!thoughtsInput.value.trim()) {
    showToast("请输入个人感想", true);
    return false;
  }
  return true;
}

// 显示提示消息
function showToast(message, isError = false) {
  console.log(`[${isError ? "ERROR" : "INFO"}] ${message}`);
  toast.textContent = message;
  toast.style.backgroundColor = isError ? "#dc3545" : "#28a745";
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// 检查配置
async function checkConfig() {
  try {
    const config = await chrome.storage.local.get(["memosUrl", "memosToken"]);
    if (!config.memosUrl || !config.memosToken) {
      mainPanel.style.display = "none";
      configPanel.style.display = "block";
      return false;
    }
    if (!isValidUrl(config.memosUrl)) {
      showToast("Memos服务器地址格式不正确", true);
      return false;
    }
    return true;
  } catch (error) {
    showToast("读取配置失败：" + error.message, true);
    return false;
  }
}

// 验证并格式化URL
function formatApiUrl(url) {
  // 移除URL末尾的斜杠
  url = url.trim().replace(/\/*$/, "");

  // 确保URL以http或https开头
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  return url;
}

// 保存配置
async function saveConfig() {
  let url = memosUrlInput.value.trim();
  const token = memosTokenInput.value.trim();

  console.log("开始保存配置...");
  console.log("服务器地址:", url);
  console.log("Token长度:", token.length);

  if (!url || !token) {
    showToast("请填写所有配置项", true);
    return;
  }

  try {
    url = formatApiUrl(url);
    console.log("格式化后的URL:", url);

    if (!isValidUrl(url)) {
      showToast("请输入有效的Memos服务器地址", true);
      return;
    }

    console.log("开始测试API连接...");
    // 测试API连接
    const testResponse = await fetch(`${url}/api/v1/memos`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("API测试状态码:", testResponse.status);
    const responseData = await testResponse.json();
    console.log("API测试响应:", responseData);

    // 检查特定的错误响应
    if (
      responseData.code === 3 &&
      responseData.message.includes("unauthenticated user")
    ) {
      throw new Error("API Token无效或服务器地址不正确");
    }

    await chrome.storage.local.set({
      memosUrl: url,
      memosToken: token,
    });
    console.log("配置保存成功");
    showToast("配置保存成功");
    configPanel.style.display = "none";
    mainPanel.style.display = "block";
    loadPageInfo();
  } catch (error) {
    console.error("配置保存错误:", error);
    console.error("错误详情:", {
      message: error.message,
      stack: error.stack,
    });
    showToast("配置保存失败：" + error.message, true);
  }
}

// 加载配置
async function loadConfig() {
  const config = await chrome.storage.local.get(["memosUrl", "memosToken"]);
  if (config.memosUrl) memosUrlInput.value = config.memosUrl;
  if (config.memosToken) memosTokenInput.value = config.memosToken;
}

// 加载页面信息
async function loadPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      pageTitleInput.value = tab.title || "";
      pageUrlInput.value = tab.url || "";
    }
  } catch (error) {
    showToast("获取页面信息失败", true);
  }
}

// 提交到Memos
async function submitToMemos() {
  console.log("开始提交内容到Memos...");

  if (!(await checkConfig())) {
    console.log("配置检查未通过");
    return;
  }
  if (!validateInputs()) {
    console.log("输入验证未通过");
    return;
  }

  const config = await chrome.storage.local.get(["memosUrl", "memosToken"]);
  console.log("使用的服务器地址:", config.memosUrl);

  const content = formatContent();
  console.log("格式化后的内容:", content);

  try {
    submitButton.disabled = true;
    submitButton.textContent = "保存中...";

    // 严格按照API文档的请求体格式
    const memoData = {
      content: content,
      visibility: "VISIBILITY_UNSPECIFIED",
      resources: [
        {
          name: "",
          uid: "",
          filename: "",
          content: "",
          externalLink: "",
          type: "",
          size: "",
          memo: "",
        },
      ],
      relations: [
        {
          memo: "",
          relatedMemo: "",
          type: "TYPE_UNSPECIFIED",
        },
      ],
    };

    console.log("准备发送的数据:", memoData);
    console.log("发送请求到:", `${config.memosUrl}/api/v1/memos`);

    const response = await fetch(`${config.memosUrl}/api/v1/memos`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.memosToken}`,
      },
      body: JSON.stringify(memoData),
    });

    console.log("响应状态码:", response.status);
    const responseText = await response.text();
    console.log("原始响应文本:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("解析后的响应数据:", responseData);
    } catch (e) {
      console.error("响应解析错误:", e);
      throw new Error("服务器响应格式错误");
    }

    if (responseData.code) {
      throw new Error(responseData.message || "保存失败");
    }

    showToast("保存成功");
    clearInputs();
  } catch (error) {
    console.error("提交失败:", error);
    console.error("错误详情:", {
      message: error.message,
      stack: error.stack,
    });
    showToast(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "提交到Memos";
  }
}

// 格式化内容
function formatContent() {
  const title = pageTitleInput.value.trim();
  const url = pageUrlInput.value.trim();
  const summary = summaryInput.value.trim();
  const thoughts = thoughtsInput.value.trim();

  return `## 📝 读书笔记

### 📖 原文信息
- 标题：${title}
- 链接：${url}

### 💭 原文摘要
${summary}

### 🤔 个人感想
${thoughts}

#读书笔记`;
}

// 清空输入
function clearInputs() {
  summaryInput.value = "";
  thoughtsInput.value = "";
}

// 事件监听
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await checkConfig();
  await loadPageInfo();
});

toggleConfigBtn.addEventListener("click", () => {
  configPanel.style.display =
    configPanel.style.display === "none" ? "block" : "none";
  mainPanel.style.display =
    mainPanel.style.display === "none" ? "block" : "none";
});

saveConfigBtn.addEventListener("click", saveConfig);
submitButton.addEventListener("click", submitToMemos);
