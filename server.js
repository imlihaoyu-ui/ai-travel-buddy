require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// DeepSeek API (OpenAI-compatible)
const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || ''
});

const MODEL = 'deepseek-chat';

// Store current trip for chat adjustments
let currentTrip = null;

// ==================== SYSTEM PROMPT ====================
const SYSTEM_PROMPT = `你是一位资深旅行规划师，专门为自驾游和多日行程提供专业规划。

用户会告诉你目的地、天数、出行方式等信息，你需要生成一份完整的行程规划。

## 输出要求

你必须严格返回以下JSON格式，不要有任何其他文字（不要用markdown代码块包裹，直接返回纯JSON）：

{
  "title": "行程标题（如：日本关西7天自由行）",
  "dateRange": "日期范围（如：待定）",
  "travelers": "出行人数",
  "mode": "出行方式",
  "preferences": ["偏好标签"],
  "days": [
    {
      "day": 1,
      "date": "第1天",
      "title": "当天主题（如：抵达大阪）",
      "route": "当天路线概要",
      "driving": "驾驶/交通时间（无则null）",
      "transport": null,
      "schedule": [
        {
          "type": "attraction",
          "startTime": "建议开始时间（如 09:00）",
          "data": {
            "id": "唯一ID（英文小写+连字符）",
            "name": "景点名称",
            "nameEn": "景点的维基百科英文词条名（必须精确，如 Times_Square、Fushimi_Inari-taisha、Eiffel_Tower）",
            "icon": "一个emoji图标",
            "duration": "建议游玩时长（如：2h）",
            "ticket": "门票信息（如：$24 或 免费）",
            "ticketOptions": [
              {"type": "票种名称", "price": "价格", "note": "备注"}
            ],
            "needReserve": false,
            "reserveNote": "",
            "coords": [纬度, 经度],
            "description": "50字以内的景点描述",
            "highlights": ["亮点1", "亮点2", "亮点3"],
            "reviews": [
              {"author": "评价者昵称", "rating": "⭐⭐⭐⭐⭐", "text": "一句话评价"}
            ]
          }
        },
        {
          "type": "commute",
          "mode": "步行|地铁|公交|打车|自驾",
          "icon": "🚶|🚇|🚌|🚕|🚗",
          "duration": "约15分钟",
          "cost": "免费|约¥5|约¥30",
          "detail": "沿南京路步行即可|乘2号线3站|打车约15元"
        },
        {
          "type": "attraction",
          "startTime": "11:30",
          "data": { "...同上..." : "" }
        },
        {
          "type": "transport",
          "data": {"mode":"🚄 高铁","from":"上海","to":"出发地","distance":"","duration":"约2小时","departSuggestion":"建议下午4点出发","arriveEstimate":"约傍晚6点到达","tips":""}
        }
      ],
      "hotel": {
        "id": "唯一ID",
        "name": "真实酒店名称",
        "nameEn": "酒店的维基百科英文词条名（如有，如 The_Plaza_Hotel；普通酒店可填酒店品牌名如 Hilton）",
        "price": 价格数字,
        "currency": "CNY",
        "rating": 4.5,
        "reason": "推荐理由（结合行程逻辑说明为什么选这家）",
        "coords": [纬度, 经度],
        "tags": ["标签1", "标签2"],
        "reviews": [
          {"author": "住客昵称", "rating": "⭐⭐⭐⭐", "text": "一句话评价"}
        ],
        "alternatives": [
          {"name": "备选酒店名", "price": 价格, "distance": "距离描述", "reason": "选择理由"}
        ]
      }
    }
  ]
}

## 规划原则

1. **schedule数组是当天所有活动的时间轴**：按真实时间顺序排列，包括景点(attraction)、景点间的交通(commute)、跨城交通(transport)。每两个景点之间必须插入一个commute。跨城transport也放在schedule中正确的时间位置（如返程高铁应在当天最后的景点之后）
2. **attractions字段不再使用**，改用schedule数组
3. **节奏合理**：每天不超过5个景点，自驾每天不超过4小时。每个景点给出建议开始时间startTime
4. **酒店选择逻辑（非常重要）**：
   - **同一城市必须连住同一家酒店，不要每天换酒店！** 只在换城市时才换酒店
   - 连住时每天的hotel对象完全相同（相同id、name、price等），reason可以写"连住第X晚"
   - 靠近次日第一个景点
   - 机场/车站附近的首尾住宿
   - 价格与用户预算匹配
4. **推荐理由必须个性化**：不要说"位置好、评价高"这种废话，要说"明早去XX只要10分钟"
5. **坐标必须真实**：使用你知道的真实景点和酒店坐标
6. **最后一天如果是返程**：hotel设为null
7. **每个景点至少1条review**，酒店至少1条review + 至少1个alternative
8. **门票信息**：如果景点需要购票（不是免费的），ticketOptions必须列出真实票种和价格（如成人票、儿童票、学生票、快速通道票等），免费景点ticketOptions设为空数组[]
9. **跨城交通（非常重要）**：当某一天需要从一个城市转移到另一个城市时，必须在那天的transport字段中填写详细交通信息，格式为：
   {"mode":"🚗 自驾","from":"纽约","to":"波士顿","distance":"350km","duration":"约3.5小时","departSuggestion":"建议上午9:00出发","arriveEstimate":"约中午12:30到达","tips":"走I-95公路，途经康涅狄格州，注意收费站"}
   如果当天没有跨城移动，transport设为null。transport可以出现在当天attractions的任意位置之间（比如上午游玩完再出发）。

只返回纯JSON，不要有任何其他内容，不要用代码块包裹。`;

// ==================== Helper: Call AI ====================
async function callAI(userMessage) {
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 8000
    });
    return response.choices[0].message.content;
}

// ==================== Helper: Parse JSON ====================
function parseJSON(content) {
    try {
        return JSON.parse(content.trim());
    } catch (e) {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0]);
        throw new Error('无法解析AI返回的JSON');
    }
}

// ==================== GENERATE ENDPOINT ====================
app.post('/api/generate', async (req, res) => {
    const { input, tags } = req.body;

    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'your_api_key_here') {
        return res.status(400).json({ error: '请先在 .env 中配置 DEEPSEEK_API_KEY' });
    }

    try {
        const userMessage = tags?.length > 0
            ? `${input}\n\n偏好标签：${tags.join('、')}`
            : input;

        console.log(`[Generate] Input: "${userMessage}"`);
        const content = await callAI(userMessage);
        console.log('[Generate] Response length:', content.length);

        const tripData = parseJSON(content);
        currentTrip = tripData;
        res.json({ success: true, data: tripData });
    } catch (error) {
        console.error('[Generate] Error:', error.message);
        if (error.message.includes('JSON') || error.message.includes('解析')) {
            res.status(500).json({ error: 'AI返回格式异常，请重试' });
        } else if (error.status === 401) {
            res.status(401).json({ error: 'API Key无效' });
        } else if (error.status === 402) {
            res.status(402).json({ error: 'DeepSeek余额不足，请到 platform.deepseek.com 充值' });
        } else {
            res.status(500).json({ error: `生成失败: ${error.message}` });
        }
    }
});

// ==================== TRIP STORAGE ====================
const path = require('path');
const fs = require('fs');

const TRIPS_FILE = path.join(__dirname, 'data', 'trips.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(TRIPS_FILE)) {
    fs.writeFileSync(TRIPS_FILE, '{}');
}

function readTrips() {
    try {
        return JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function writeTrips(trips) {
    fs.writeFileSync(TRIPS_FILE, JSON.stringify(trips));
}

function generateTripId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
}

// Save trip → returns shareable ID
app.post('/api/save', (req, res) => {
    const { trip } = req.body;
    if (!trip) return res.status(400).json({ error: 'No trip data' });

    const id = generateTripId();
    const trips = readTrips();
    trips[id] = {
        data: trip,
        createdAt: new Date().toISOString()
    };
    writeTrips(trips);

    console.log('[Save] Trip saved with ID:', id);
    res.json({ success: true, id });
});

// Get saved trip
app.get('/api/trip/:id', (req, res) => {
    const trips = readTrips();
    const trip = trips[req.params.id];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip.data);
});

// ==================== CHAT ENDPOINT ====================
app.post('/api/chat', async (req, res) => {
    const { message, currentTripData } = req.body;

    try {
        const tripContext = currentTripData || currentTrip;
        console.log('[Chat] Message:', message);

        const userMessage = `当前行程方案如下：
${JSON.stringify(tripContext, null, 2)}

用户要求调整：${message}

请根据用户要求修改行程，返回完整的更新后的JSON（格式不变）。`;

        const content = await callAI(userMessage);
        const tripData = parseJSON(content);
        currentTrip = tripData;
        res.json({ success: true, data: tripData });
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({ error: `调整失败: ${error.message}` });
    }
});

// ==================== IMAGE PROXY (Wikipedia) ====================
const imageCache = new Map();

// Try fetching image from Wikipedia with multiple search strategies
async function searchWikiImage(query) {
    // Strategy 1: Direct page lookup (works for exact Wikipedia titles like "Times_Square")
    const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    try {
        const resp = await fetch(directUrl, {
            headers: { 'User-Agent': 'TravelBuddy/1.0' },
            signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
            const data = await resp.json();
            const img = data.thumbnail?.source;  // Use thumbnail (smaller, faster download)
            if (img) return img;
        }
    } catch (e) {}

    // Strategy 2: Wikipedia search API (fuzzy match)
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`;
        const resp = await fetch(searchUrl, {
            headers: { 'User-Agent': 'TravelBuddy/1.0' },
            signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
            const data = await resp.json();
            const title = data.query?.search?.[0]?.title;
            if (title) {
                const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
                const pageResp = await fetch(pageUrl, {
                    headers: { 'User-Agent': 'TravelBuddy/1.0' },
                    signal: AbortSignal.timeout(6000)
                });
                if (pageResp.ok) {
                    const pageData = await pageResp.json();
                    const img = pageData.originalimage?.source || pageData.thumbnail?.source;
                    if (img) return img;
                }
            }
        }
    } catch (e) {}

    return null;
}

app.get('/api/image', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(404).end();

    // Check cache
    if (imageCache.has(query)) {
        const cached = imageCache.get(query);
        if (!cached) return res.status(404).end();
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(cached);
    }

    try {
        const imgUrl = await searchWikiImage(query);

        if (!imgUrl) {
            imageCache.set(query, null);
            return res.status(404).end();
        }

        console.log('[Image] OK:', query);

        // Download the actual image (longer timeout for China network)
        const imgResp = await fetch(imgUrl, {
            headers: { 'User-Agent': 'TravelBuddy/1.0' },
            signal: AbortSignal.timeout(25000)
        });

        if (!imgResp.ok) {
            imageCache.set(query, null);
            return res.status(404).end();
        }

        const buffer = Buffer.from(await imgResp.arrayBuffer());
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg';

        // Only cache if it looks like a real image (> 5KB)
        if (buffer.length > 1000) {
            imageCache.set(query, buffer);
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'public, max-age=86400');
            res.send(buffer);
        } else {
            imageCache.set(query, null);
            res.status(404).end();
        }
    } catch (e) {
        console.log('[Image] Failed:', query, e.message);
        imageCache.set(query, null);
        res.status(404).end();
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    const hasKey = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_api_key_here';
    res.json({ status: 'ok', apiKeyConfigured: hasKey, model: MODEL });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
    const hasKey = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_api_key_here';
    console.log('');
    console.log('  ✈️  AI旅行搭子 已启动');
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  🤖 模型: ${MODEL}`);
    console.log(`  🔑 API Key: ${hasKey ? '✓ 已配置' : '✗ 未配置'}`);
    console.log('');
});
