// 飞书文档创建脚本 - 支持知识库 + 真正的表格
// 使用：
//   1. 已配置 .env: FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_REDIRECT_URI
//   2. 首次运行会弹浏览器授权；之后自动复用token
//   3. 默认创建到第一个知识库空间下

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const REDIRECT_URI = process.env.FEISHU_REDIRECT_URI || 'http://localhost:7890/callback';
const TOKEN_CACHE = path.join(__dirname, '.feishu-token.json');
const SPACE_CACHE = path.join(__dirname, '.feishu-space.json');

if (!APP_ID || !APP_SECRET) {
    console.error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET');
    process.exit(1);
}

const BASE = 'https://open.feishu.cn/open-apis';
const SCOPES = 'docx:document:create docx:document:update_only docs:document:create wiki:node:read wiki:node:create drive:drive drive:file drive:folder';

// ==================== Token 管理 ====================
function loadUserToken() {
    if (fs.existsSync(TOKEN_CACHE)) return JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8'));
    return null;
}

function saveUserToken(t) {
    fs.writeFileSync(TOKEN_CACHE, JSON.stringify(t, null, 2));
}

async function getUserTokenViaOAuth() {
    return new Promise((resolve, reject) => {
        const state = crypto.randomBytes(8).toString('hex');
        const authUrl = `${BASE}/authen/v1/index?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(SCOPES)}`;

        console.log('\n🌐 请在浏览器中授权...');
        console.log('如果未自动打开，请访问：\n' + authUrl + '\n');
        try {
            const { exec } = require('child_process');
            exec(`start "" "${authUrl}"`);
        } catch (e) {}

        const server = http.createServer(async (req, res) => {
            const u = new URL(req.url, REDIRECT_URI);
            if (u.pathname !== '/callback') { res.end('Invalid'); return; }
            const code = u.searchParams.get('code');
            res.end('<h2 style="color:green;font-family:sans-serif">✓ 授权成功！可关闭此页面</h2>');
            server.close();
            if (!code) return reject(new Error('未收到code'));

            const r = await fetch(`${BASE}/authen/v1/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grant_type: 'authorization_code', code, app_id: APP_ID, app_secret: APP_SECRET })
            });
            const d = await r.json();
            if (d.code !== 0) return reject(new Error(d.msg));
            const td = {
                access_token: d.data.access_token,
                refresh_token: d.data.refresh_token,
                expires_at: Date.now() + (d.data.expires_in - 60) * 1000
            };
            saveUserToken(td);
            resolve(td.access_token);
        });
        server.listen(7890, () => console.log('✓ 回调服务已启动在 7890\n'));
    });
}

async function refreshUserToken(refreshToken) {
    const r = await fetch(`${BASE}/authen/v1/refresh_access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken, app_id: APP_ID, app_secret: APP_SECRET })
    });
    const d = await r.json();
    if (d.code !== 0) throw new Error('刷新token失败: ' + d.msg);
    const td = {
        access_token: d.data.access_token,
        refresh_token: d.data.refresh_token,
        expires_at: Date.now() + (d.data.expires_in - 60) * 1000
    };
    saveUserToken(td);
    return td.access_token;
}

async function getValidUserToken() {
    let t = loadUserToken();
    if (!t) return await getUserTokenViaOAuth();
    if (Date.now() > t.expires_at) {
        console.log('⚠️  token过期，刷新中...');
        return await refreshUserToken(t.refresh_token);
    }
    return t.access_token;
}

// ==================== 个人云盘文件夹 ====================
function loadSpaceCache() {
    if (fs.existsSync(SPACE_CACHE)) return JSON.parse(fs.readFileSync(SPACE_CACHE,));
    return null;
}

function saveSpaceCache(space) {
    fs.writeFileSync(SPACE_CACHE, JSON.stringify(space, null, 2));
}

// 获取「我的文档库」的space_id
// "我的文档库" 在飞书中属于 wiki 个人空间，使用特殊标识符 "my_library"
async function getMyDocLibrary(token) {
    let cached = loadSpaceCache();
    if (cached) return cached;

    // "我的文档库" 在 wiki API 中使用 'my_library' 作为 space_id
    const folder = {
        token: 'my_library',
        name: '我的文档库',
        isPersonal: true
    };
    console.log(`   ✓ 目标位置: ${folder.name} (space_id: ${folder.token})`);
    saveSpaceCache(folder);
    return folder;
}

// ==================== 创建文档到「我的文档库」 ====================
async function createDocInMyLibrary(token, title) {
    // 使用 wiki API 创建文档到 my_library 个人空间
    const url = `${BASE}/wiki/v2/spaces/my_library/nodes`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            obj_type: 'docx',
            node_type: 'origin',
            title
        })
    });
    const data = await resp.json();
    if (data.code !== 0) {
        throw new Error('创建文档失败: ' + data.msg + ' (code: ' + data.code + ')');
    }

    const node = data.data.node;
    return {
        documentId: node.obj_token,
        nodeToken: node.node_token,
        url: node.url
    };
}

// ==================== Markdown → 嵌套Block ====================
function mdToNestedBlocks(md) {
    const lines = md.split('\n');
    const childrenIds = [];
    const descendants = [];
    let i = 0;
    let counter = 0;
    const newId = (prefix) => `${prefix}_${counter++}`;

    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }

        let block = null;

        // 标题（用 match 而不是 RegExp，避免分支覆盖问题）
        const h1Match = line.match(/^# (.+)/);
        const h2Match = line.match(/^## (.+)/);
        const h3Match = line.match(/^### (.+)/);
        const bulletMatch = line.match(/^[-*] (.+)/);

        if (h1Match) {
            block = { type: 'heading1', text: h1Match[1].trim() };
            i++;
        } else if (h2Match) {
            block = { type: 'heading2', text: h2Match[1].trim() };
            i++;
        } else if (h3Match) {
            block = { type: 'heading3', text: h3Match[1].trim() };
            i++;
        } else if (line.startsWith('|') && line.endsWith('|')) {
            // 表格
            const tLines = [];
            while (i < lines.length && lines[i].startsWith('|')) {
                tLines.push(lines[i]);
                i++;
            }
            const parseRow = (l) => l.split('|').slice(1, -1).map(c => c.trim());
            const headers = parseRow(tLines[0]);
            const rows = tLines.slice(2).map(parseRow);

            // 根据列内容智能分配列宽（最小80像素，最大200）
            const colWidths = headers.map((h, idx) => {
                const allCells = [h, ...rows.map(r => r[idx] || '')];
                const maxLen = Math.max(...allCells.map(c => (c || '').length));
                // 中文字符按 2 个字符宽算
                const visualLen = [...(allCells[0] || '')].reduce((sum, ch) => sum + (/[一-龥]/.test(ch) ? 2 : 1), 0);
                const width = Math.max(100, Math.min(280, 30 + visualLen * 9));
                return width;
            });

            const tableId = newId('table');
            const cellIds = [];
            const cellDescendants = [];

            const allRows = [headers, ...rows];
            for (let r = 0; r < allRows.length; r++) {
                for (let c = 0; c < headers.length; c++) {
                    const cellId = newId('cell');
                    cellIds.push(cellId);
                    const cellContentId = newId('celltext');

                    // 表头行：粗体 + 背景色
                    const isHeader = (r === 0);
                    const textBlock = {
                        block_id: cellContentId,
                        block_type: 2,
                        text: {
                            elements: [{
                                text_run: {
                                    content: allRows[r][c] || ' ',
                                    // 表头加粗
                                    ...(isHeader && {
                                        text_element_style: {
                                            bold: true
                                        }
                                    })
                                }
                            }]
                        },
                        children: []
                    };

                    cellDescendants.push({
                        block_id: cellId,
                        block_type: 32,
                        table_cell: {},
                        children: [cellContentId]
                    });
                    cellDescendants.push(textBlock);
                }
            }

            childrenIds.push(tableId);
            descendants.push({
                block_id: tableId,
                block_type: 31,
                table: {
                    property: {
                        row_size: allRows.length,
                        column_size: headers.length,
                        column_width: colWidths,
                        header_row: true,           // 标记为表头行
                        header_background_color: 1  // 浅灰色背景（不同值对应不同颜色）
                    }
                },
                children: cellIds
            });
            descendants.push(...cellDescendants);
            continue;
        } else if (line.startsWith('> ')) {
            block = { type: 'quote', text: line.slice(2).trim() };
            i++;
        } else if (bulletMatch) {
            block = { type: 'bullet', text: bulletMatch[1].trim() };
            i++;
        } else {
            block = { type: 'text', text: line };
            i++;
        }

        if (block) {
            const id = newId('blk');
            childrenIds.push(id);
            descendants.push({
                block_id: id,
                block_type: { text: 2, heading1: 3, heading2: 4, heading3: 5, bullet: 12, quote: 15 }[block.type],
                [block.type]: { elements: [{ text_run: { content: block.text || '' } }] },
                children: []
            });
        }
    }

    return { index: 0, children_id: childrenIds, descendants };
}

// ==================== 创建嵌套Blocks ====================
async function insertNestedBlocks(token, documentId, payload) {
    const resp = await fetch(`${BASE}/docx/v1/documents/${documentId}/blocks/${documentId}/descendant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.code !== 0) throw new Error('写入内容失败: ' + data.msg);
    console.log(`  ✓ 写入 ${payload.descendants.length} 个 block`);
}

// ==================== Main ====================
async function main() {
    const mdFile = process.argv[2] || '项目介绍-飞书文档.md';
    const title = process.argv[3] || 'AI旅行搭子 · 项目介绍';

    console.log(`📄 读取文件: ${mdFile}`);
    const md = fs.readFileSync(path.join(__dirname, mdFile), 'utf8');

    console.log('🔧 解析 Markdown...');
    const payload = mdToNestedBlocks(md);
    console.log(`   ${payload.descendants.length} 个 block 待写入`);

    console.log('🔑 获取用户token...');
    const token = await getValidUserToken();
    console.log('✓ token有效\n');

    console.log('📝 在「我的文档库」中创建文档...');
    const doc = await createDocInMyLibrary(token, title);
    console.log(`   文档ID: ${doc.documentId}`);
    console.log(`   链接: ${doc.url}\n`);

    console.log('📥 写入内容...');
    await insertNestedBlocks(token, doc.documentId, payload);

    console.log('\n🎉 完成！');
    console.log('链接:', doc.url || '请到「我的文档库」查看');
}

main().catch(err => {
    console.error('\n❌ 失败:', err.message);
    process.exit(1);
});