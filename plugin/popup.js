// DOM 元素
const elements = {
    status: document.getElementById('status'),
    statusText: document.querySelector('.status-text'),
    emptyState: document.getElementById('emptyState'),
    dataSection: document.getElementById('dataSection'),
    videoCover: document.getElementById('videoCover'),
    videoTitle: document.getElementById('videoTitle'),
    bvid: document.getElementById('bvid'),
    viewCount: document.getElementById('viewCount'),
    likeCount: document.getElementById('likeCount'),
    coinCount: document.getElementById('coinCount'),
    favoriteCount: document.getElementById('favoriteCount'),
    replyCount: document.getElementById('replyCount'),
    shareCount: document.getElementById('shareCount'),
    ownerAvatar: document.getElementById('ownerAvatar'),
    ownerName: document.getElementById('ownerName'),
    ownerSex: document.getElementById('ownerSex'),
    ownerLevel: document.getElementById('ownerLevel'),
    ownerOfficial: document.getElementById('ownerOfficial'),
    ownerFollowing: document.getElementById('ownerFollowing'),
    ownerFollower: document.getElementById('ownerFollower'),
    ownerLikes: document.getElementById('ownerLikes'),
    ownerSign: document.getElementById('ownerSign'),
    importBtn: document.getElementById('importBtn'),
    copyBtn: document.getElementById('copyBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    toast: document.getElementById('toast')
};

// API 配置
const IMPORT_API_URL = 'https://hajimi.fans/api/admin/import';
const IMPORT_API_TOKEN = 'hachimi_import_2024_xK9mP3qR7sT1wY5x';

// 当前数据
let currentData = null;

// 格式化数字
function formatNumber(num) {
    if (num === undefined || num === null) return '-';
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    }
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// 显示 Toast
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2000);
}

// 更新状态
function updateStatus(active, text) {
    if (active) {
        elements.status.classList.add('active');
    } else {
        elements.status.classList.remove('active');
    }
    elements.statusText.textContent = text;
}

// 显示数据
function displayData(data) {
    if (!data || (!data.video && !data.owner)) {
        elements.emptyState.style.display = 'flex';
        elements.dataSection.style.display = 'none';
        elements.importBtn.disabled = true;
        elements.copyBtn.disabled = true;
        updateStatus(false, '等待中');
        return;
    }

    currentData = data;
    elements.emptyState.style.display = 'none';
    elements.dataSection.style.display = 'flex';
    elements.importBtn.disabled = false;
    elements.copyBtn.disabled = false;
    updateStatus(true, '已抓取');

    // 视频信息
    if (data.video) {
        const video = data.video;

        // 封面
        if (video.pic) {
            elements.videoCover.src = video.pic;
            elements.videoCover.style.display = 'block';
        } else {
            elements.videoCover.style.display = 'none';
        }

        // 标题
        elements.videoTitle.textContent = video.title || '-';

        // BVID
        elements.bvid.textContent = video.bvid || '-';

        // 统计数据
        elements.viewCount.textContent = formatNumber(video.view);
        elements.likeCount.textContent = formatNumber(video.like);
        elements.coinCount.textContent = formatNumber(video.coin);
        elements.favoriteCount.textContent = formatNumber(video.favorite);
        elements.replyCount.textContent = formatNumber(video.reply);
        elements.shareCount.textContent = formatNumber(video.share);
    }

    // UP主信息
    if (data.owner) {
        const owner = data.owner;

        // 头像
        if (owner.face) {
            elements.ownerAvatar.src = owner.face;
            elements.ownerAvatar.style.display = 'block';
        } else {
            elements.ownerAvatar.style.display = 'none';
        }

        // 名称
        elements.ownerName.textContent = owner.name || '-';

        // 性别
        if (owner.sex === '男') {
            elements.ownerSex.textContent = '♂';
            elements.ownerSex.className = 'owner-sex male';
        } else if (owner.sex === '女') {
            elements.ownerSex.textContent = '♀';
            elements.ownerSex.className = 'owner-sex female';
        } else {
            elements.ownerSex.textContent = '';
            elements.ownerSex.className = 'owner-sex';
        }

        // 等级
        if (owner.level !== undefined) {
            elements.ownerLevel.textContent = `LV${owner.level}`;
            elements.ownerLevel.className = `owner-level lv${owner.level}`;
            elements.ownerLevel.style.display = 'inline-flex';
        } else {
            elements.ownerLevel.style.display = 'none';
        }

        // 认证信息
        if (owner.official) {
            elements.ownerOfficial.textContent = owner.official;
            elements.ownerOfficial.style.display = 'flex';
        } else {
            elements.ownerOfficial.style.display = 'none';
        }

        // 关注/粉丝/获赞
        elements.ownerFollowing.textContent = formatNumber(owner.following);
        elements.ownerFollower.textContent = formatNumber(owner.follower);
        elements.ownerLikes.textContent = formatNumber(owner.likes);

        // 签名
        elements.ownerSign.textContent = owner.sign || '这个人很懒，什么都没写~';
    }
}

// 加载数据
async function loadData() {
    try {
        const result = await chrome.storage.local.get(['bilibiliData']);

        if (result.bilibiliData) {
            displayData(result.bilibiliData);
        } else {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab && tab.url && tab.url.includes('bilibili.com')) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'capture' });
                    setTimeout(async () => {
                        const newResult = await chrome.storage.local.get(['bilibiliData']);
                        if (newResult.bilibiliData) {
                            displayData(newResult.bilibiliData);
                        }
                    }, 1500);
                } catch (e) {
                    console.log('Content script not ready');
                }
            }

            displayData(null);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        displayData(null);
    }
}

// 复制数据
async function copyData() {
    if (!currentData) return;

    try {
        const jsonStr = JSON.stringify(currentData, null, 2);
        await navigator.clipboard.writeText(jsonStr);
        showToast('已复制到剪贴板');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('复制失败');
    }
}

// 刷新数据
async function refreshData() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('bilibili.com')) {
            await chrome.storage.local.remove(['bilibiliData']);
            displayData(null);
            updateStatus(false, '刷新中...');

            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'capture' });

                setTimeout(async () => {
                    const result = await chrome.storage.local.get(['bilibiliData']);
                    if (result.bilibiliData) {
                        displayData(result.bilibiliData);
                    } else {
                        updateStatus(false, '抓取失败');
                    }
                }, 2000);
            } catch (e) {
                chrome.tabs.reload(tab.id);
                showToast('正在刷新页面...');
            }
        } else {
            showToast('请访问 B 站视频页面');
        }
    } catch (error) {
        console.error('Refresh failed:', error);
        showToast('刷新失败');
    }
}

// 导入数据到社区
async function importData() {
    if (!currentData) {
        showToast('没有可导入的数据');
        return;
    }

    // 设置加载状态
    elements.importBtn.disabled = true;
    elements.importBtn.classList.add('loading');
    elements.importBtn.querySelector('.btn-icon').textContent = '⏳';

    try {
        const response = await fetch(IMPORT_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IMPORT_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Import success:', result);
            showToast('✅ 导入成功！');
        } else {
            const errorText = await response.text();
            console.error('Import failed:', response.status, errorText);
            showToast(`导入失败: ${response.status}`);
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('导入失败，请检查网络');
    } finally {
        // 恢复按钮状态
        elements.importBtn.disabled = false;
        elements.importBtn.classList.remove('loading');
        elements.importBtn.querySelector('.btn-icon').textContent = '🚀';
    }
}

// 事件监听
elements.importBtn.addEventListener('click', importData);
elements.copyBtn.addEventListener('click', copyData);
elements.refreshBtn.addEventListener('click', refreshData);

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.bilibiliData) {
        displayData(changes.bilibiliData.newValue);
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', loadData);
