// 智能记账 App - 主逻辑

// 存储键名
const STORAGE_KEY = 'accounting_records';
const API_KEY_STORAGE = 'zhipu_api_key';

// 当前解析结果（待确认）
let currentParsed = null;
let recordToDelete = null;
let currentFilter = '';

// DOM 元素
const apiKeyInput = document.getElementById('apiKeyInput');
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
    updateStats();
    loadRecentRecords();
});

// 加载保存的 API Key
function loadApiKey() {
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
}

// 保存 API Key
apiKeyInput.addEventListener('blur', () => {
    localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value.trim());
});

// 切换 API Key 显示/隐藏
toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyBtn.textContent = '隐藏';
    } else {
        apiKeyInput.type = 'password';
        toggleKeyBtn.textContent = '显示';
    }
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

async function handleSubmit() {
    const text = recordInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!text) {
        alert('请输入记账内容');
        return;
    }

    if (!apiKey) {
        alert('请先输入智谱 API Key');
        apiKeyInput.focus();
        return;
    }

    loading.classList.remove('hidden');

    try {
        const result = await parseWithAI(text, apiKey);
        currentParsed = result;
        showPreview(result);
    } catch (error) {
        alert('解析失败：' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// 调用智谱 AI 解析
async function parseWithAI(text, apiKey) {
    const prompt = `请从以下记账描述中提取信息，返回 JSON 格式：
描述："${text}"

请提取：
1. amount: 金额（数字，不含单位）
2. category: 分类（餐饮、交通、购物、娱乐、居住、医疗、教育、其他）
3. description: 简短描述（10字以内）
4. date: 日期（YYYY-MM-DD 格式，"今天"指${getToday()}, "昨天"指${getYesterday()}, "明天"指${getTomorrow()}）

只返回 JSON，不要其他内容。示例：
{"amount": 200, "category": "餐饮", "description": "陈记顺和吃饭", "date": "2024-01-15"}`;

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'glm-4-flash',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '请求失败');
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
confirmBtn.addEventListener('click', () => {
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
});

// 取消
cancelBtn.addEventListener('click', () => {
    previewArea.classList.add('hidden');
    currentParsed = null;
});

// 显示撤销确认弹窗
function showUndoModal(record) {
    recordToDelete = record;
    undoRecordText.textContent = `${record.description} ¥${record.amount}`;
    undoModal.classList.remove('hidden');
}

// 确认撤销
confirmUndoBtn.addEventListener('click', () => {
    if (!recordToDelete) return;

    const records = getRecords().filter(r => r.id !== recordToDelete.id);
    saveRecords(records);
    
    recordToDelete = null;
    undoModal.classList.add('hidden');
    
    updateStats();
    loadRecentRecords();
});

// 取消撤销
cancelUndoBtn.addEventListener('click', () => {
    recordToDelete = null;
    undoModal.classList.add('hidden');
});

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
