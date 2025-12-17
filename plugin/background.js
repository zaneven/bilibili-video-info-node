// Bilibili 视频信息抓取 Background Service Worker

console.log('[Bilibili Capture] Background service worker started');

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'dataCaptured') {
        console.log('[Bilibili Capture] Data captured:', message.data?.video?.title);

        // 更新 badge 显示状态
        if (sender.tab?.id) {
            chrome.action.setBadgeText({
                text: '✓',
                tabId: sender.tab.id
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#00a1d6',
                tabId: sender.tab.id
            });
        }
    }

    sendResponse({ received: true });
    return true;
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url?.includes('bilibili.com')) {
        // 清除之前的 badge
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
    }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url?.includes('bilibili.com/video/')) {
            // 检查是否有缓存数据
            const result = await chrome.storage.local.get(['bilibiliData']);
            if (result.bilibiliData) {
                chrome.action.setBadgeText({
                    text: '✓',
                    tabId: activeInfo.tabId
                });
                chrome.action.setBadgeBackgroundColor({
                    color: '#00a1d6',
                    tabId: activeInfo.tabId
                });
            }
        }
    } catch (e) {
        // 忽略错误
    }
});

// 安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Bilibili Capture] Extension installed:', details.reason);

    // 清除旧数据
    chrome.storage.local.remove(['bilibiliData']);
});
