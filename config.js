/**
 * 配置管理模块
 */

// 默认配置
const DEFAULT_CONFIG = {
  memosHost: "",
  memosToken: "",
  glmApiKey: "",
  defaultVisibility: "PUBLIC",
};

// 配置键名
const CONFIG_KEY = "memosQuickSaveConfig";

/**
 * 验证API配置
 * @param {Object} config 配置对象
 * @returns {Promise<boolean>} 验证结果
 */
async function validateApiConfig(config) {
  try {
    // 确保memosHost没有尾随斜杠
    const baseUrl = config.memosHost.replace(/\/+$/, "");
    
    const response = await fetch(`${baseUrl}/api/v1/auth/status`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.memosToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API验证失败:", {
        status: response.status,
        error: errorText,
      });
      return false;
    }
    
    const data = await response.json();
    if (!data.id || !data.role) {
      console.error("API验证失败: 返回数据格式不正确", data);
      return false;
    }
    
    console.log("API验证成功:", {
      id: data.id,
      role: data.role,
      username: data.username
    });
    
    return true;
  } catch (error) {
    console.error("API验证错误:", error);
    return false;
  }
}

/**
 * 加载配置
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig() {
  try {
    const result = await chrome.storage.sync.get(CONFIG_KEY);
    return { ...DEFAULT_CONFIG, ...result[CONFIG_KEY] };
  } catch (error) {
    console.error("加载配置失败:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 保存配置
 * @param {Object} config 配置对象
 * @returns {Promise<void>}
 */
async function saveConfig(config) {
  try {
    // 验证API配置
    const isValid = await validateApiConfig(config);
    if (!isValid) {
      throw new Error("Memos API验证失败，请检查服务器地址和Token是否正确");
    }

    await chrome.storage.sync.set({
      [CONFIG_KEY]: {
        ...DEFAULT_CONFIG,
        ...config,
      },
    });
  } catch (error) {
    console.error("保存配置失败:", error);
    throw error;
  }
}

/**
 * 验证配置是否有效
 * @param {Object} config 配置对象
 * @returns {boolean} 是否有效
 */
function validateConfig(config) {
  // 基本验证：检查必填字段
  if (!config.memosHost || !config.memosToken) {
    return false;
  }

  // 验证URL格式
  try {
    new URL(config.memosHost);
  } catch {
    return false;
  }

  return true;
}

/**
 * 检查是否需要配置
 * @returns {Promise<boolean>} 是否需要配置
 */
async function needsConfiguration() {
  const config = await loadConfig();
  return !validateConfig(config);
}

// 导出配置相关函数
export {
  loadConfig,
  saveConfig,
  validateConfig,
  validateApiConfig,
  needsConfiguration,
  DEFAULT_CONFIG,
};
