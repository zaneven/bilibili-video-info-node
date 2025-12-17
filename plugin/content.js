// Bilibili 视频信息抓取 Content Script
// 直接从页面 URL 提取 bvid 并调用 API 获取数据

(function () {
  'use strict';

  // 防止重复注入
  if (window.__bilibiliCaptureInjected) {
    return;
  }
  window.__bilibiliCaptureInjected = true;

  console.log('[Bilibili Capture] Content script loaded');

  // 确保 URL 使用 HTTPS
  function ensureHttps(url) {
    if (typeof url === 'string') {
      return url.replace(/^http:/, 'https:');
    }
    return url;
  }

  // 从 URL 提取 bvid
  function extractBvid() {
    const match = window.location.pathname.match(/\/video\/(BV\w+)/);
    return match ? match[1] : null;
  }

  // 保存数据到 storage
  function saveData(data) {
    if (data) {
      chrome.storage.local.set({ bilibiliData: data }, () => {
        console.log('[Bilibili Capture] Data saved to storage:', data.video?.title);
        // 通知 background
        chrome.runtime.sendMessage({ action: 'dataCaptured', data: data });
      });
    }
  }

  // 获取视频信息 API
  async function fetchVideoInfo(bvid) {
    console.log('[Bilibili Capture] Fetching video info for:', bvid);

    try {
      const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Bilibili Capture] Video API response code:', result.code);

      if (result.code === 0 && result.data) {
        return result.data;
      } else {
        console.error('[Bilibili Capture] Video API error:', result.message);
      }
    } catch (error) {
      console.error('[Bilibili Capture] Video fetch error:', error);
    }

    return null;
  }

  // 获取作者卡片信息 API
  async function fetchOwnerCard(mid) {
    console.log('[Bilibili Capture] Fetching owner card for mid:', mid);

    try {
      const apiUrl = `https://api.bilibili.com/x/web-interface/card?mid=${mid}&photo=1`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Bilibili Capture] Card API response code:', result.code);

      if (result.code === 0 && result.data) {
        return result.data;
      } else {
        console.error('[Bilibili Capture] Card API error:', result.message);
      }
    } catch (error) {
      console.error('[Bilibili Capture] Card fetch error:', error);
    }

    return null;
  }

  // 处理并合并数据
  function processData(videoData, cardData) {
    const v = videoData;

    // 视频信息
    const video = {
      bvid: v.bvid,
      aid: v.aid,
      title: v.title,
      desc: v.desc,
      pic: ensureHttps(v.pic),
      duration: v.duration,
      pubdate: v.pubdate,
      ctime: v.ctime,
      view: v.stat?.view,
      danmaku: v.stat?.danmaku,
      reply: v.stat?.reply,
      favorite: v.stat?.favorite,
      coin: v.stat?.coin,
      share: v.stat?.share,
      like: v.stat?.like
    };

    // 作者信息 - 优先使用 card API 的详细数据
    let owner = null;
    if (cardData && cardData.card) {
      const c = cardData.card;
      owner = {
        mid: c.mid,
        name: c.name,
        face: ensureHttps(c.face),
        sex: c.sex,
        sign: c.sign,
        level: c.level_info?.current_level,
        official: c.official_verify?.desc || '',
        officialType: c.official_verify?.type,
        vip: c.vip?.type > 0,
        vipLabel: c.vip?.label?.text || '',
        follower: cardData.follower,
        following: cardData.following || c.attention,
        likes: cardData.like_num,
        archive: cardData.archive_count
      };
    } else if (v.owner) {
      // fallback 到视频 API 的作者信息
      owner = {
        mid: v.owner.mid,
        name: v.owner.name,
        face: ensureHttps(v.owner.face)
      };
    }

    return {
      video: video,
      owner: owner,
      capturedAt: new Date().toISOString(),
      url: window.location.href
    };
  }

  // 从 meta 标签获取基本信息作为 fallback
  function tryExtractFromMeta(bvid) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');

    if (ogTitle) {
      return {
        video: {
          bvid: bvid,
          title: ogTitle.getAttribute('content') || '',
          desc: ogDescription ? ogDescription.getAttribute('content') : '',
          pic: ogImage ? ensureHttps(ogImage.getAttribute('content')) : ''
        },
        owner: null,
        capturedAt: new Date().toISOString(),
        url: window.location.href
      };
    }
    return null;
  }

  // 主抓取函数
  async function capture() {
    const bvid = extractBvid();
    if (!bvid) {
      console.log('[Bilibili Capture] No bvid found in URL');
      return null;
    }

    console.log('[Bilibili Capture] Starting capture for:', bvid);

    // 获取视频信息
    const videoData = await fetchVideoInfo(bvid);

    if (videoData) {
      // 获取作者卡片信息
      let cardData = null;
      if (videoData.owner?.mid) {
        cardData = await fetchOwnerCard(videoData.owner.mid);
      }

      // 处理并保存数据
      const data = processData(videoData, cardData);
      saveData(data);
      return data;
    }

    // 如果 API 失败，使用 meta fallback
    console.log('[Bilibili Capture] API failed, using meta fallback');
    const data = tryExtractFromMeta(bvid);
    if (data) {
      saveData(data);
    }
    return data;
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'capture') {
      console.log('[Bilibili Capture] Capture requested from popup');
      capture().then(data => {
        sendResponse({ success: !!data, data: data });
      });
      return true;
    }
  });

  // 监听页面变化 (SPA 路由)
  let lastUrl = location.href;
  let captureTimeout = null;

  function handleUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[Bilibili Capture] URL changed:', lastUrl);
      chrome.storage.local.remove(['bilibiliData']);

      if (captureTimeout) {
        clearTimeout(captureTimeout);
      }
      captureTimeout = setTimeout(() => {
        capture();
      }, 1500);
    }
  }

  setInterval(handleUrlChange, 500);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  window.addEventListener('popstate', handleUrlChange);

  // 初始化
  function init() {
    const bvid = extractBvid();
    if (bvid) {
      console.log('[Bilibili Capture] Auto capturing on page load');
      setTimeout(() => {
        capture();
      }, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[Bilibili Capture] Content script initialized');

})();
