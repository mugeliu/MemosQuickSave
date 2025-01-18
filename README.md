# Memos Quick Save

一个简单易用的 Chrome 扩展，帮助你快速保存网页内容到 Memos。

## 功能特点

- 一键保存网页内容到 Memos
- 自动获取当前页面的标题和链接
- 支持添加原文摘要和个人感想
- 支持 Markdown 格式
- 简洁美观的用户界面
- 安全的 API 认证机制

## 安装方法

1. 下载本扩展的源代码
2. 打开 Chrome 浏览器，进入扩展管理页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本扩展的源代码目录

## 使用说明

### 首次使用配置

1. 点击 Chrome 工具栏中的扩展图标
2. 在配置界面输入：
   - Memos 服务器地址（例如：https://your-memos-server.com）
   - API Token（在 Memos 设置中获取）
3. 点击"保存配置"

### 日常使用

1. 在想要保存的网页上点击扩展图标
2. 扩展会自动获取当前页面的标题和链接
3. 在"原文摘要"框中粘贴想要保存的内容
4. 在"个人感想"框中输入你的想法
5. 点击"提交到 Memos"按钮完成保存

### 保存格式

内容将按以下格式保存到 Memos：

```markdown
## 📝 读书笔记

### 📖 原文信息

- 标题：[自动获取的标题]
- 链接：[自动获取的链接]

### 💭 原文摘要

[用户输入的摘要内容]

### 🤔 个人感想

[用户输入的感想内容]
```

## 隐私说明

- 本扩展不会收集任何个人信息
- 所有配置信息仅保存在本地
- API Token 仅用于与 Memos 服务器通信

## 技术栈

- Chrome Extension Manifest V3
- HTML5 & CSS3
- Vanilla JavaScript
- Chrome Storage API
- Chrome Tabs API

## 开发说明

### 项目结构

```
├── manifest.json      # 扩展配置文件
├── background.js      # 后台服务脚本
├── sidepanel.html     # 侧边栏界面
├── sidepanel.js       # 侧边栏逻辑
├── styles.css         # 样式文件
└── icons/            # 图标文件夹
```

### 本地开发

1. 克隆代码库
2. 修改代码
3. 在 Chrome 扩展管理页面点击"重新加载"进行测试

## 问题反馈

如果你在使用过程中遇到任何问题，或有任何建议，欢迎提出 Issue。

## 许可证

MIT License
