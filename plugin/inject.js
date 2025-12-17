// Bilibili 网络请求拦截器
// 此文件会被注入到页面上下文中以拦截 fetch 和 XHR 请求

(function () {
    'use strict';

    if (window.__bilibiliInterceptorInjected) return;
    window.__bilibiliInterceptorInjected = true;

    console.log('[Bilibili Capture] Interceptor injected');

    // 存储捕获的数据
    window.__bilibiliCapturedData = null;

    // 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;

            // 检查是否是视频信息 API
            if (url && url.includes('api.bilibili.com/x/web-interface/view')) {
                console.log('[Bilibili Capture] Intercepted video API:', url);

                // 克隆响应以便读取
                const clonedResponse = response.clone();
                clonedResponse.json().then(data => {
                    if (data && data.code === 0 && data.data) {
                        console.log('[Bilibili Capture] Video data captured via fetch');
                        window.__bilibiliCapturedData = data.data;

                        // 发送自定义事件通知 content script
                        window.dispatchEvent(new CustomEvent('bilibili-data-captured', {
                            detail: { type: 'video', data: data.data }
                        }));
                    }
                }).catch(e => {
                    console.error('[Bilibili Capture] Failed to parse response:', e);
                });
            }
        } catch (e) {
            // 忽略错误，确保原始请求不受影响
        }

        return response;
    };

    // 拦截 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._bilibili_url = url;
        return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        const xhr = this;
        const url = xhr._bilibili_url;

        if (url && url.includes('api.bilibili.com/x/web-interface/view')) {
            console.log('[Bilibili Capture] Intercepting XHR:', url);

            // 监听 load 事件
            xhr.addEventListener('load', function () {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data && data.code === 0 && data.data) {
                            console.log('[Bilibili Capture] Video data captured via XHR');
                            window.__bilibiliCapturedData = data.data;

                            window.dispatchEvent(new CustomEvent('bilibili-data-captured', {
                                detail: { type: 'video', data: data.data }
                            }));
                        }
                    } catch (e) {
                        // 忽略
                    }
                }
            });
        }

        return originalXHRSend.apply(this, args);
    };

    // 如果页面已经有 __INITIAL_STATE__ 数据，直接发送
    setTimeout(() => {
        if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.videoData) {
            console.log('[Bilibili Capture] Found __INITIAL_STATE__.videoData');
            window.__bilibiliCapturedData = window.__INITIAL_STATE__.videoData;
            window.dispatchEvent(new CustomEvent('bilibili-data-captured', {
                detail: { type: 'video', data: window.__INITIAL_STATE__.videoData }
            }));
        }
    }, 100);

    console.log('[Bilibili Capture] Network interceptor ready');
})();
