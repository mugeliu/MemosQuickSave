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
  return Boolean(config.memosHost && config.memosToken);
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
  needsConfiguration,
  DEFAULT_CONFIG,
};
