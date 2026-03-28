# 智能记账 App

一个支持自然语言输入的网页版记账应用，调用 AI 自动解析记账内容。

## 功能

- 🎤 **自然语言记账**：说句话就能记，比如「今天去陈记顺和吃了200块」
- 🤖 **AI 自动解析**：自动提取金额、分类、描述、日期
- 💾 **本地存储**：数据存在浏览器里，隐私安全
- 📊 **实时统计**：本月支出、分类统计、最近记录
- 🔧 **多模型支持**：支持智谱、Moonshot、DeepSeek、OpenAI 等主流模型

## 使用方法

### 1. 配置 AI 模型

只需要填写 **2 个信息**：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **模型名称** | 输入模型名称或完整 API 地址 | `glm-4-flash`、`kimi-k2.5`、`deepseek-chat` |
| **API Key** | 模型提供商的 API 密钥 | `sk-...` |

**智能提示**：输入模型名称时，会实时显示匹配的下拉菜单。例如输入 `ki` 会显示所有包含 `ki` 的模型（如 `kimi-k2.5`），可用上下键选择，回车确认。

### 2. 获取 API Key

根据你选择的模型，前往对应平台申请：

- **智谱 GLM**：https://open.bigmodel.cn/usercenter/apikeys （免费额度足够用）
- **Moonshot (Kimi)**：https://platform.moonshot.cn/
- **DeepSeek**：https://platform.deepseek.com/
- **OpenAI**：https://platform.openai.com/

### 3. 开始记账

1. 用浏览器打开 `index.html`
2. 输入模型名称和 API Key（自动保存到本地）
3. 在输入框里说话记账，例如：
   - 「打车花了35」
   - 「买了杯奶茶18」
   - 「昨天交房租2500」
   - 「周末看电影花了80」
4. 点击「记账」，AI 自动解析
5. 确认无误后保存

## 支持的模型

输入以下模型名称，系统会自动识别对应的 API 地址：

| 提供商 | 支持的模型 | 自动识别的关键词 |
|--------|-----------|-----------------|
| **智谱** | `glm-4-flash`、`glm-4`、`glm-4v` | `glm` |
| **Moonshot** | `kimi-k2.5`、`kimi-k2`、`kimi-k2-turbo` | `kimi` |
| **DeepSeek** | `deepseek-chat`、`deepseek-coder`、`deepseek-reasoner` | `deepseek` |
| **OpenAI** | `gpt-3.5-turbo`、`gpt-4`、`gpt-4o`、`gpt-4o-mini` | `gpt` |
| **Anthropic** | `claude-3-opus`、`claude-3-sonnet`、`claude-3-haiku` | `claude` |
| **Groq** | `llama3-70b`、`mixtral-8x7b` | `llama`、`groq` |
| **阿里云** | `qwen-turbo`、`qwen-plus` | `qwen` |
| **火山引擎** | `doubao-pro` | `doubao` |

### 自定义 API 地址

如果你的模型不在列表中，可以直接填写完整的 API 地址：

```
https://api.example.com/v1/your-model-name
```

系统会自动解析 URL 和模型名称。

## 文件结构

```
ai-expense-tracker/
├── index.html    # 主页面
├── app.js        # 核心逻辑
├── style.css     # 样式
└── README.md     # 说明
```

## 技术栈

- HTML5 + Tailwind CSS（界面）
- 原生 JavaScript（逻辑）
- LocalStorage（数据存储）
- OpenAI 兼容 API（支持大多数国产模型）

## 注意事项

- API Key 只存在你的浏览器里，不会上传到任何地方
- 数据只存在本地，换浏览器/清缓存会丢失
- 支持 OpenAI 格式的 API 接口（`/chat/completions`）
- 后续可升级云端同步版本

## 隐私说明

- 所有数据存储在浏览器 LocalStorage 中
- API Key 不会离开你的设备
- 记账数据不会上传到任何服务器
