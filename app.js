// 智能记账 App - 主逻辑

// 存储键名
const STORAGE_KEY = 'accounting_records';
const API_CONFIG_STORAGE = 'accounting_api_config';

// 模型名称 → API 地址映射表
const MODEL_REGISTRY = {
    // 智谱
    'glm-4-flash': 'https://open.bigmodel.cn/api/paas/v4',
    'glm-4': 'https://open.bigmodel.cn/api/paas/v4',
    'glm-4v': 'https://open.bigmodel.cn/api/paas/v4',
    'glm-4-long': 'https://open.bigmodel.cn/api/paas/v4',
    
    // Moonshot
    'kimi-k2.5': 'https://api.moonshot.cn/v1',
    'kimi-k2': 'https://api.moonshot.cn/v1',
    'kimi-k2-turbo': 'https://api.moonshot.cn/v1',
    
    // DeepSeek
    'deepseek-chat': 'https://api.deepseek.com/v1',
    'deepseek-coder': 'https://api.deepseek.com/v1',
    'deepseek-reasoner': 'https://api.deepseek.com/v1',
    
    // OpenAI
    'gpt-3.5-turbo': 'https://api.openai.com/v1',
    'gpt-4': 'https://api.openai.com/v1',
    'gpt-4o': 'https://api.openai.com/v1',
    'gpt-4o-mini': 'https://api.openai.com/v1',
    
    // Anthropic
    'claude-3-opus': 'https://api.anthropic.com/v1',
    'claude-3-sonnet': 'https://api.anthropic.com/v1',
    'claude-3-haiku': 'https://api.anthropic.com/v1',
    
    // Groq
    'llama3-70b': 'https://api.groq.com/openai/v1',
    'mixtral-8x7b': 'https://api.groq.com/openai/v1',
    
    // 其他
    'qwen-turbo': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'qwen-plus': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'doubao-pro': 'https://ark.cn-beijing.volces.com/api/v3'
};

// 所有模型列表（用于下拉菜单）
const ALL_MODELS = Object.keys(MODEL_REGISTRY);

// 下拉菜单状态
let dropdownSelectedIndex = -1;
let currentDropdownItems = [];

// 当前解析结果（待确认）
let currentParsed = null;
let recordToDelete = null;
let currentFilter = '';

// DOM 元素
const modelInput = document.getElementById('modelInput');
const modelDropdown = document.getElementById('modelDropdown');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiHint = document.getElementById('apiHint');
const recordInput = document.getElementById('recordInput');
const submitBtn = document.getElementById('submitBtn');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const previewArea = document.getElementById('previewArea');
const previewContent = document.getElementById('previewContent');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const loading = document.getElementById('loading');
const categoryFilter = document.getElementById('categoryFilter');
const undoModal = document.getElementById('undoModal');
const undoRecordText = document.getElementById('undoRecordText');
const confirmUndoBtn = document.getElementById('confirmUndoBtn');
const cancelUndoBtn = document.getElementById('cancelUndoBtn');
const zhipuLink = document.getElementById('zhipuLink');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadApiConfig();
    updateStats();
    loadRecentRecords();
    setupEventListeners();
});

// 根据模型名检测 API 地址
function detectApiUrl(modelName) {
    modelName = modelName.toLowerCase().trim();
    
    // 精确匹配
    if (MODEL_REGISTRY[modelName]) {
        return MODEL_REGISTRY[modelName];
    }
    
    // 前缀/包含匹配
    for (const [key, url] of Object.entries(MODEL_REGISTRY)) {
        if (modelName.includes(key) || key.includes(modelName)) {
            return url;
        }
    }
    
    return null;
}

// 加载保存的配置
function loadApiConfig() {
    const saved = localStorage.getItem(API_CONFIG_STORAGE);
    if (saved) {
        const config = JSON.parse(saved);
        modelInput.value = config.model || '';
        apiKeyInput.value = config.key || '';
        updateApiHint(config.model);
    }
}

// 保存配置
function saveApiConfig() {
    const config = {
        model: modelInput.value.trim(),
        key: apiKeyInput.value.trim()
    };
    localStorage.setItem(API_CONFIG_STORAGE, JSON.stringify(config));
}

// 更新 API 地址提示
function updateApiHint(modelName) {
    const url = detectApiUrl(modelName);
    if (url) {
        apiHint.textContent = `→ ${new URL(url).hostname}`;
        apiHint.classList.remove('hidden');
    } else if (modelName) {
        apiHint.textContent = '⚠️ 请填写完整 API 地址';
        apiHint.classList.remove('hidden');
    } else {
        apiHint.classList.add('hidden');
    }
}

// 设置事件监听
function setupEventListeners() {
    // 模型输入变化时显示下拉菜单
    modelInput.addEventListener('input', () => {
        const value = modelInput.value.trim();
        updateApiHint(value);
        
        if (value.length > 0) {
            showModelDropdown(value);
        } else {
            hideModelDropdown();
        }
    });
    
    // 输入框聚焦时如果有内容也显示下拉
    modelInput.addEventListener('focus', () => {
        const value = modelInput.value.trim();
        if (value.length > 0) {
            showModelDropdown(value);
        }
    });
    
    // 键盘导航
    modelInput.addEventListener('keydown', (e) => {
        if (!currentDropdownItems.length) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                dropdownSelectedIndex = Math.min(dropdownSelectedIndex + 1, currentDropdownItems.length - 1);
                updateDropdownSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                dropdownSelectedIndex = Math.max(dropdownSelectedIndex - 1, -1);
                updateDropdownSelection();
                break;
            case 'Enter':
                e.preventDefault();
                if (dropdownSelectedIndex >= 0 && currentDropdownItems[dropdownSelectedIndex]) {
                    selectModel(currentDropdownItems[dropdownSelectedIndex]);
                }
                break;
            case 'Escape':
                hideModelDropdown();
                break;
        }
    });
    
    // 点击其他地方隐藏下拉菜单
    document.addEventListener('click', (e) => {
        if (!modelInput.contains(e.target) && !modelDropdown.contains(e.target)) {
            hideModelDropdown();
        }
    });
    
    // 失去焦点时保存
    modelInput.addEventListener('blur', saveApiConfig);
    apiKeyInput.addEventListener('blur', saveApiConfig);
    
    // 切换 API Key 显示
    toggleKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleKeyBtn.textContent = '隐藏';
        } else {
            apiKeyInput.type = 'password';
            toggleKeyBtn.textContent = '显示';
        }
    });
    
    // 智谱链接点击 - 自动填充
    zhipuLink.addEventListener('click', (e) => {
        e.preventDefault();
        selectModel('glm-4-flash');
        apiKeyInput.focus();
    });
    
    // 分类筛选
    categoryFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        loadRecentRecords();
    });
    
    // 提交记账
    submitBtn.addEventListener('click', handleSubmit);
    recordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });
    
    // 确认/取消
    confirmBtn.addEventListener('click', confirmSave);
    cancelBtn.addEventListener('click', cancelSave);
    
    // 撤销
    confirmUndoBtn.addEventListener('click', confirmUndo);
    cancelUndoBtn.addEventListener('click', cancelUndo);
}

// 显示模型下拉菜单
function showModelDropdown(query) {
    query = query.toLowerCase();
    
    // 过滤匹配的模型
    const matches = ALL_MODELS.filter(model => 
        model.toLowerCase().includes(query)
    );
    
    if (matches.length === 0) {
        hideModelDropdown();
        return;
    }
    
    currentDropdownItems = matches;
    dropdownSelectedIndex = -1;
    
    // 渲染下拉菜单
    modelDropdown.innerHTML = matches.map((model, index) => {
        const provider = getProviderName(model);
        return `
            <div class="model-option px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center justify-between ${index === 0 ? 'bg-blue-50' : ''}" 
                 data-model="${model}" data-index="${index}">
                <span class="font-medium">${model}</span>
                <span class="text-xs text-gray-400">${provider}</span>
            </div>
        `;
    }).join('');
    
    // 添加点击事件
    modelDropdown.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            selectModel(option.dataset.model);
        });
        option.addEventListener('mouseenter', () => {
            dropdownSelectedIndex = parseInt(option.dataset.index);
            updateDropdownSelection();
        });
    });
    
    modelDropdown.classList.remove('hidden');
}

// 隐藏下拉菜单
function hideModelDropdown() {
    modelDropdown.classList.add('hidden');
    currentDropdownItems = [];
    dropdownSelectedIndex = -1;
}

// 更新下拉菜单选中状态
function updateDropdownSelection() {
    const options = modelDropdown.querySelectorAll('.model-option');
    options.forEach((opt, idx) => {
        if (idx === dropdownSelectedIndex) {
            opt.classList.add('bg-blue-100');
            opt.classList.remove('bg-blue-50');
        } else {
            opt.classList.remove('bg-blue-100');
            if (idx === 0) {
                opt.classList.add('bg-blue-50');
            }
        }
    });
}

// 选择模型
function selectModel(model) {
    modelInput.value = model;
    updateApiHint(model);
    saveApiConfig();
    hideModelDropdown();
}

// 获取提供商名称
function getProviderName(model) {
    const url = MODEL_REGISTRY[model];
    if (!url) return '自定义';
    
    if (url.includes('bigmodel.cn')) return '智谱';
    if (url.includes('moonshot.cn')) return 'Moonshot';
    if (url.includes('deepseek.com')) return 'DeepSeek';
    if (url.includes('openai.com')) return 'OpenAI';
    if (url.includes('anthropic.com')) return 'Anthropic';
    if (url.includes('groq.com')) return 'Groq';
    if (url.includes('aliyuncs.com')) return '阿里云';
    if (url.includes('volces.com')) return '火山引擎';
    return '其他';
}

async function handleSubmit() {
    const text = recordInput.value.trim();
    const modelName = modelInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!text) {
        alert('请输入记账内容');
        return;
    }

    if (!modelName) {
        alert('请输入模型名称');
        modelInput.focus();
        return;
    }

    if (!apiKey) {
        alert('请输入 API Key');
        apiKeyInput.focus();
        return;
    }

    loading.classList.remove('hidden');

    try {
        const result = await parseWithAI(text, modelName, apiKey);
        currentParsed = result;
        showPreview(result);
    } catch (error) {
        alert('解析失败：' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// 调用 AI 解析
async function parseWithAI(text, modelName, apiKey) {
    let baseUrl = detectApiUrl(modelName);
    
    // 如果没匹配到，尝试解析模型名是否为 URL
    if (!baseUrl && modelName.startsWith('http')) {
        baseUrl = modelName.replace(/\/$/, '');
        // 从 URL 中提取模型名（如果有）
        const urlParts = baseUrl.split('/');
        modelName = urlParts[urlParts.length - 1] || 'default';
        baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    
    // 还是没找到，报错
    if (!baseUrl) {
        throw new Error('无法识别此模型，请填写完整 API 地址（如：https://api.example.com/v1）');
    }
    
    const apiUrl = baseUrl + '/chat/completions';

    const prompt = `请从以下记账描述中提取信息，返回 JSON 格式：
描述："${text}"

请提取：
1. amount: 金额（数字，不含单位）
2. category: 分类（餐饮、交通、购物、娱乐、居住、医疗、教育、其他）
3. description: 简短描述（10字以内）
4. date: 日期（YYYY-MM-DD 格式，"今天"指${getToday()}, "昨天"指${getYesterday()}, "明天"指${getTomorrow()}）

只返回 JSON，不要其他内容。示例：
{"amount": 200, "category": "餐饮", "description": "陈记顺和吃饭", "date": "2024-01-15"}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI 返回格式错误');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // 验证必要字段
    if (!parsed.amount || !parsed.category) {
        throw new Error('未能识别金额或分类');
    }

    return {
        amount: parseFloat(parsed.amount),
        category: parsed.category,
        description: parsed.description || text.substring(0, 10),
        date: parsed.date || getToday(),
        rawText: text
    };
}

// 显示预览
function showPreview(data) {
    previewContent.innerHTML = `
        <div class="flex justify-between"><span class="text-gray-600">金额：</span><span class="font-bold text-red-600">¥${data.amount}</span></div>
        <div class="flex justify-between"><span class="text-gray-600">分类：</span><span class="font-medium">${data.category}</span></div>
        <div class="flex justify-between"><span class="text-gray-600">描述：</span><span class="font-medium">${data.description}</span></div>
        <div class="flex justify-between"><span class="text-gray-600">日期：</span><span class="font-medium">${data.date}</span></div>
    `;
    previewArea.classList.remove('hidden');
}

// 确认保存
function confirmSave() {
    if (!currentParsed) return;

    const records = getRecords();
    records.unshift({
        ...currentParsed,
        id: Date.now(),
        createdAt: new Date().toISOString()
    });

    saveRecords(records);
    
    // 重置
    recordInput.value = '';
    previewArea.classList.add('hidden');
    currentParsed = null;

    // 刷新显示
    updateStats();
    loadRecentRecords();
}

// 取消
function cancelSave() {
    previewArea.classList.add('hidden');
    currentParsed = null;
}

// 显示撤销确认弹窗
function showUndoModal(record) {
    recordToDelete = record;
    undoRecordText.textContent = `${record.description} ¥${record.amount}`;
    undoModal.classList.remove('hidden');
}

// 确认撤销
function confirmUndo() {
    if (!recordToDelete) return;

    const records = getRecords().filter(r => r.id !== recordToDelete.id);
    saveRecords(records);
    
    recordToDelete = null;
    undoModal.classList.add('hidden');
    
    updateStats();
    loadRecentRecords();
}

// 取消撤销
function cancelUndo() {
    recordToDelete = null;
    undoModal.classList.add('hidden');
}

// 获取所有记录
function getRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// 保存记录
function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 更新统计
function updateStats() {
    const records = getRecords();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 本月支出
    const monthTotal = records
        .filter(r => r.date.startsWith(currentMonth))
        .reduce((sum, r) => sum + r.amount, 0);

    document.getElementById('monthTotal').textContent = `¥${monthTotal.toFixed(2)}`;
    document.getElementById('recordCount').textContent = records.length;

    // 分类统计
    const categoryMap = {};
    records.forEach(r => {
        categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
    });

    const categoryStats = document.getElementById('categoryStats');
    const categories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (categories.length === 0) {
        categoryStats.innerHTML = '<p class="text-sm text-gray-400">暂无数据</p>';
    } else {
        categoryStats.innerHTML = categories.map(([cat, amount]) => `
            <div class="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span class="text-sm">${cat}</span>
                <span class="text-sm font-medium text-red-600">¥${amount.toFixed(2)}</span>
            </div>
        `).join('');
    }
}

// 加载最近记录
function loadRecentRecords() {
    let records = getRecords();
    const recentRecords = document.getElementById('recentRecords');

    // 应用分类筛选
    if (currentFilter) {
        records = records.filter(r => r.category === currentFilter);
    }

    if (records.length === 0) {
        recentRecords.innerHTML = '<p class="text-sm text-gray-400">还没有记账记录</p>';
        return;
    }

    recentRecords.innerHTML = records.slice(0, 10).map(r => `
        <div class="flex justify-between items-center bg-white border px-3 py-2 rounded-lg">
            <div>
                <p class="text-sm font-medium">${r.description}</p>
                <p class="text-xs text-gray-500">${r.category} · ${r.date}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-red-600">-¥${r.amount.toFixed(2)}</span>
                <button onclick='showUndoModal(${JSON.stringify(r).replace(/'/g, "&#39;")})' 
                    class="text-xs text-gray-400 hover:text-red-600 px-2 py-1">
                    撤销
                </button>
            </div>
        </div>
    `).join('');
}

// 工具函数
function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

function getTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}
