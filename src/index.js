// 引入依赖
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// WBI 签名相关常量和变量
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

// WBI keys 缓存
let wbiKeys = null;
let wbiKeysExpiry = 0;
const WBI_KEYS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

// 对 imgKey 和 subKey 进行字符顺序打乱编码，生成 mixin_key
function getMixinKey(orig) {
  return MIXIN_KEY_ENC_TAB.map(n => orig[n]).join('').slice(0, 32);
}

// 计算 MD5 哈希
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// 为请求参数进行 WBI 签名
function encWbi(params, img_key, sub_key) {
  const mixin_key = getMixinKey(img_key + sub_key);
  const curr_time = Math.round(Date.now() / 1000);
  const chr_filter = /[!'()*]/g;

  // 添加 wts 字段
  const signParams = { ...params, wts: curr_time };

  // 按照 key 升序排序并编码
  const query = Object.keys(signParams)
    .sort()
    .map(key => {
      // 过滤 value 中的 "!'()*" 字符
      const value = signParams[key].toString().replace(chr_filter, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  // 计算 w_rid
  const w_rid = md5(query + mixin_key);

  return query + '&w_rid=' + w_rid;
}

// 获取最新的 img_key、sub_key 以及 buvid Cookie
let buvidCookies = null;

async function getWbiKeys() {
  const now = Date.now();

  // 检查缓存是否有效
  if (wbiKeys && buvidCookies && now < wbiKeysExpiry) {
    console.log('Using cached WBI keys and buvid cookies');
    return { ...wbiKeys, cookies: buvidCookies };
  }

  console.log('Fetching new WBI keys and buvid cookies...');

  try {
    // 首先访问 B站主页获取 buvid3 cookie
    const homeResponse = await fetch('https://www.bilibili.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    // 从响应头中提取 cookies
    const setCookies = homeResponse.headers.get('set-cookie') || '';
    console.log('Home page set-cookie header:', setCookies.slice(0, 200));

    // 解析 buvid3 和 buvid4
    let buvid3 = '';
    let buvid4 = '';

    const buvid3Match = setCookies.match(/buvid3=([^;]+)/);
    const buvid4Match = setCookies.match(/buvid4=([^;]+)/);

    if (buvid3Match) {
      buvid3 = buvid3Match[1];
    }
    if (buvid4Match) {
      buvid4 = buvid4Match[1];
    }

    // 如果从主页没获取到，尝试使用 fingerprint SPI 接口
    if (!buvid3) {
      console.log('Generating buvid3 manually...');
      // 生成一个符合格式的 buvid3
      const uuid = crypto.randomUUID().toUpperCase();
      buvid3 = `${uuid}infoc`;
    }

    buvidCookies = `buvid3=${buvid3}; buvid4=${buvid4}`;
    console.log('Buvid cookies obtained:', { buvid3: buvid3.slice(0, 20) + '...', buvid4: buvid4.slice(0, 20) + '...' });

    // 然后获取 WBI keys
    const navResponse = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Cookie': buvidCookies
      }
    });

    const data = await navResponse.json();

    if (data.data && data.data.wbi_img) {
      const { img_url, sub_url } = data.data.wbi_img;

      // 提取文件名作为 key
      const img_key = img_url.slice(
        img_url.lastIndexOf('/') + 1,
        img_url.lastIndexOf('.')
      );
      const sub_key = sub_url.slice(
        sub_url.lastIndexOf('/') + 1,
        sub_url.lastIndexOf('.')
      );

      wbiKeys = { img_key, sub_key };
      wbiKeysExpiry = now + WBI_KEYS_CACHE_DURATION;

      console.log('WBI keys obtained successfully:', { img_key, sub_key });
      return { ...wbiKeys, cookies: buvidCookies };
    }

    throw new Error('Failed to get WBI keys from nav API');
  } catch (error) {
    console.error('Error fetching WBI keys:', error);
    throw error;
  }
}

// 读取HTML文件内容
const HTML_PATH = path.join(__dirname, 'index.html');
let HTML_PAGE;

try {
  HTML_PAGE = fs.readFileSync(HTML_PATH, 'utf8');
  console.log('HTML file loaded successfully');
} catch (error) {
  console.error('Failed to load HTML file:', error);
  // 如果无法读取HTML文件，使用一个简单的默认页面
  HTML_PAGE = '<html><body><h1>HTML file not found</h1></body></html>';
}

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 启动浏览器实例（全局单例，提高性能）
let browser;
let pagePool = []; // 页面池，用于复用页面，减少创建和关闭的开销
const MAX_POOL_SIZE = 3; // 最大页面池大小

async function initBrowser() {
  try {
    // 尝试使用本地Chrome浏览器，先查找系统Chrome路径
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];

    let executablePath = null;
    for (const path of chromePaths) {
      try {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch (e) {
        // 忽略错误
      }
    }

    console.log('Found Chrome executable:', executablePath || 'Using Puppeteer default');

    // 尝试使用本地Chrome浏览器，如果失败则回退到Puppeteer自动下载
    browser = await puppeteer.launch({
      headless: "new", // 使用新的无头模式
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions', // 禁用扩展，减少资源消耗
        '--disable-features=site-per-process' // 减少进程创建，提高性能
      ],
      defaultViewport: { width: 1280, height: 720 }, // 设置默认视口，减少调整开销
      ignoreHTTPSErrors: true // 忽略HTTPS错误，减少处理时间
    });
    console.log('Puppeteer browser initialized');
  } catch (error) {
    console.warn('Failed to launch Chrome with custom options:', error.message);
    try {
      // 使用Puppeteer的默认配置，不指定executablePath
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions'
        ]
      });
      console.log('Puppeteer browser initialized with default options');
    } catch (fallbackError) {
      console.error('Failed to initialize Puppeteer browser:', fallbackError.message);
      // 不抛出错误，让后续代码处理
    }
  }
}

// 获取页面（从池或创建新页面）
async function getPage() {
  if (pagePool.length > 0) {
    return pagePool.pop();
  }

  if (!browser) {
    await initBrowser();
  }

  const page = await browser.newPage();

  // 设置更完整的浏览器配置，使其更接近真实浏览器
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0');

  // 设置视口大小
  await page.setViewport({ width: 1920, height: 1080 });

  // 设置cookie，模拟已登录状态
  await page.setCookie({
    name: 'buvid3',
    value: 'B3D9A8E0-9F7B-4D5E-8C9A-1234567890AB',
    domain: '.bilibili.com',
    path: '/'
  });

  // 启用JavaScript
  await page.setJavaScriptEnabled(true);

  return page;
}

// 回收页面到池
async function recyclePage(page) {
  if (pagePool.length < MAX_POOL_SIZE) {
    try {
      // 清空页面，准备复用
      await page.goto('about:blank');
      pagePool.push(page);
    } catch (error) {
      console.error('Error recycling page:', error);
      await page.close(); // 直接关闭页面，避免无限递归
    }
  } else {
    await page.close();
  }
}

// 使用Puppeteer获取视频信息
async function getVideoInfo(bvid) {
  try {
    if (!browser) {
      await initBrowser();
    }

    const page = await getPage(); // 从页面池获取页面，减少创建开销

    // 移除重复的User-Agent设置，已经在getPage中设置

    // 移除网络请求日志，减少性能开销
    // page.on('response', async (response) => {
    //   const url = response.url();
    //   if (url.includes('api.bilibili.com/x/web-interface/view?bvid=')) {
    //     console.log('Found video info API response:', url);
    //   }
    // });

    // 直接访问视频信息API，不使用page.evaluate，改为在Node.js环境中直接请求
    let videoData = null;
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

    try {
      console.log('Directly accessing API from Node.js:', apiUrl);
      // 在Node.js环境中直接请求
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'DNT': '1',
          'Pragma': 'no-cache',
          'Referer': `https://www.bilibili.com/video/${bvid}/`,
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="143", "Microsoft Edge";v="143"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'omit',
        mode: 'cors'
      });

      const data = await response.json();
      console.log('Direct API Response status:', data.code);

      if (data.code === 0) {
        videoData = data;
      }
    } catch (error) {
      console.error('Direct API request failed:', error);
    }

    // 如果直接API请求失败，尝试通过页面加载获取
    if (!videoData || videoData.code !== 0) {
      console.log('Direct API failed, trying page load approach...');

      // 访问B站视频页面
      await page.goto(`https://www.bilibili.com/video/${bvid}/`, {
        waitUntil: 'domcontentloaded', // 只等待DOM加载完成，减少等待时间
        timeout: 30000
      });



      // 尝试从页面中提取数据，使用更广泛的方法
      videoData = await page.evaluate(() => {
        console.log('Checking for data in page...');

        // 1. 尝试从window.__INITIAL_STATE__获取数据
        if (window.__INITIAL_STATE__) {
          console.log('Found __INITIAL_STATE__');
          const initialState = window.__INITIAL_STATE__;
          console.log('Initial State keys:', Object.keys(initialState));

          // 检查videoData或相关属性
          if (initialState.videoData) {
            console.log('Found videoData in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.videoData
            };
          } else if (initialState.player) {
            console.log('Found player in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.player
            };
          } else if (initialState.view) {
            console.log('Found view in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.view
            };
          }
        }

        // 2. 尝试从script标签中提取JSON-LD数据
        const scriptTags = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scriptTags) {
          try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'VideoObject') {
              console.log('Found JSON-LD VideoObject');
              return {
                code: 0,
                data: data
              };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }

        // 3. 尝试从其他可能的全局变量获取数据
        if (window.__data) {
          console.log('Found __data');
          return {
            code: 0,
            data: window.__data
          };
        }

        // 4. 尝试从window.__NUXT_DATA__获取数据（如果使用Nuxt框架）
        if (window.__NUXT_DATA__) {
          console.log('Found __NUXT_DATA__');
          return {
            code: 0,
            data: window.__NUXT_DATA__
          };
        }

        console.log('No initial state found');
        return null;
      }).catch(e => {
        console.error('Failed to extract data from page:', e);
        return null;
      });
    }

    await recyclePage(page); // 回收页面到池，实现复用

    if (!videoData || videoData.code !== 0 || !videoData.data) {
      throw new Error('Failed to fetch video info');
    }

    console.log('Final Video Data retrieved successfully');
    // 移除详细的JSON日志，提高性能

    // 提取需要的视频和作者信息，添加安全检查
    const video = videoData.data;

    // 处理不同数据结构
    let stat = {};
    let owner = {};

    // 如果是标准API响应格式
    if (video.stat) {
      stat = video.stat;
    } else if (video.interactionStat) {
      // 处理JSON-LD格式
      stat = {
        view: video.interactionStat.viewCount || 0,
        like: video.interactionStat.likeCount || 0,
        favorite: video.interactionStat.favoriteCount || 0,
        reply: video.interactionStat.commentCount || 0,
        danmaku: 0,
        coin: 0,
        share: 0
      };
    }

    // 处理作者信息
    if (video.owner) {
      owner = video.owner;
    } else if (video.author) {
      // 处理JSON-LD格式
      owner = {
        name: video.author.name || '',
        face: video.author.image || '',
        mid: ''
      };
    }

    // 辅助函数：将http URL转换为https
    const ensureHttps = (url) => {
      if (typeof url === 'string') {
        return url.replace(/^http:/, 'https:');
      }
      return url;
    };

    // 处理视频信息
    const videoInfo = {
      bvid: video.bvid || bvid,
      aid: video.aid || video.id || '',
      title: video.title || video.name || '',
      desc: video.desc || video.description || '',
      pic: ensureHttps(video.pic || video.thumbnailUrl || ''),
      duration: video.duration || (video.durationSeconds || 0),
      pubdate: video.pubdate || (video.uploadDate ? new Date(video.uploadDate).getTime() / 1000 : 0),
      ctime: video.ctime || (video.datePublished ? new Date(video.datePublished).getTime() / 1000 : 0),
      ...stat
    };

    // 处理作者头像URL
    owner.face = ensureHttps(owner.face);

    const filteredData = {
      video: videoInfo,
      owner: owner
    };

    return filteredData;
  } catch (error) {
    console.error('Error fetching video info:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// 获取UP主代表作信息
async function getUpMasterpiece(vmid) {
  try {
    // 直接访问UP主代表作API，在Node.js环境中直接请求
    let masterpieceData = null;
    const apiUrl = `https://api.bilibili.com/x/space/masterpiece?vmid=${vmid}&web_location=333.1387`;

    try {
      console.log('Directly accessing UP masterpiece API:', apiUrl);
      // 在Node.js环境中直接请求
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'DNT': '1',
          'Pragma': 'no-cache',
          'Referer': `https://space.bilibili.com/${vmid}`,
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="143", "Microsoft Edge";v="143"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'omit',
        mode: 'cors'
      });

      const data = await response.json();
      console.log('UP Masterpiece API Response status:', data.code);

      if (data.code === 0) {
        masterpieceData = data;
      }
    } catch (error) {
      console.error('Direct UP masterpiece API request failed:', error);

      // 如果直接API请求失败，尝试使用Puppeteer
      if (!browser) {
        await initBrowser();
      }

      const page = await getPage(); // 从页面池获取页面，减少创建开销

      // 移除重复的User-Agent设置，已经在getPage中设置

      // 访问UP主空间页面
      await page.goto(`https://space.bilibili.com/${vmid}`, {
        waitUntil: 'domcontentloaded', // 只等待DOM加载完成
        timeout: 30000
      });

      // 添加短暂等待，确保页面JavaScript执行完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 尝试从页面中提取数据
      masterpieceData = await page.evaluate(() => {
        console.log('Checking for UP masterpiece data in page...');

        // 1. 尝试从window.__INITIAL_STATE__获取数据
        if (window.__INITIAL_STATE__) {
          console.log('Found __INITIAL_STATE__');
          const initialState = window.__INITIAL_STATE__;
          console.log('Initial State keys:', Object.keys(initialState));

          // 检查masterpiece或相关属性
          if (initialState.masterpiece) {
            console.log('Found masterpiece in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.masterpiece
            };
          } else if (initialState.videos) {
            console.log('Found videos in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.videos
            };
          } else if (initialState.cards) {
            console.log('Found cards in __INITIAL_STATE__');
            return {
              code: 0,
              data: initialState.cards
            };
          }
        }

        // 2. 尝试从script标签中提取数据
        const scriptTags = Array.from(document.querySelectorAll('script'));
        for (const script of scriptTags) {
          try {
            const content = script.textContent;
            if (content.includes('masterpiece')) {
              // 尝试提取masterpiece数据
              const masterpieceMatch = content.match(/masterpiece:\s*(\[[^\]]+\])/);
              if (masterpieceMatch && masterpieceMatch[1]) {
                console.log('Found masterpiece data in script tag');
                const data = JSON.parse(masterpieceMatch[1]);
                return {
                  code: 0,
                  data: data
                };
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }

        console.log('No masterpiece data found in page');
        return null;
      }).catch(e => {
        console.error('Failed to extract masterpiece data from page:', e);
        return null;
      });

      await recyclePage(page); // 回收页面到池，实现复用
    }

    if (!masterpieceData || masterpieceData.code !== 0) {
      throw new Error('Failed to fetch UP masterpiece info');
    }

    console.log('Final UP Masterpiece Data retrieved successfully');
    // 移除详细的JSON日志，提高性能

    // 返回原始数据，因为数据结构已经符合要求
    return masterpieceData.data;
  } catch (error) {
    console.error('Error fetching UP masterpiece info:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// 获取UP主个人信息
async function getUpInfo(vmid) {
  try {
    let upData = null;

    // 方案1: 使用 WBI 签名的 API
    try {
      const { img_key, sub_key, cookies } = await getWbiKeys();
      const params = { mid: vmid };
      const signedQuery = encWbi(params, img_key, sub_key);

      const wbiApiUrl = `https://api.bilibili.com/x/space/wbi/acc/info?${signedQuery}`;
      console.log('Trying WBI signed API:', wbiApiUrl.slice(0, 80) + '...');

      const response = await fetch(wbiApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Origin': 'https://space.bilibili.com',
          'Referer': `https://space.bilibili.com/${vmid}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'Cookie': cookies
        }
      });

      const data = await response.json();
      console.log('WBI API Response status:', data.code, data.message || '');

      if (data.code === 0) {
        upData = data;
      } else {
        console.warn('WBI API failed:', data.code, data.message);
      }
    } catch (error) {
      console.error('WBI API request error:', error.message);
    }

    // 方案2: WBI API 失败时使用 Puppeteer 从页面提取数据
    if (!upData || upData.code !== 0) {
      console.log('Falling back to Puppeteer for UP info...');

      try {
        if (!browser) {
          await initBrowser();
        }

        const page = await getPage();

        // 存储捕获的 API 数据
        let capturedData = null;

        // 使用 CDP 监听网络响应
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');

        client.on('Network.responseReceived', async (params) => {
          const url = params.response.url;
          if (url.includes('/x/space/wbi/acc/info') || url.includes('/x/space/acc/info')) {
            try {
              const response = await client.send('Network.getResponseBody', {
                requestId: params.requestId
              });
              const data = JSON.parse(response.body);
              if (data.code === 0) {
                capturedData = data.data;
                console.log('Captured API response:', data.data.name);
              }
            } catch (e) {
              // 可能请求还在进行中
            }
          }
        });

        // 访问 UP 主空间页面，浏览器会自动发起带签名的 API 请求
        await page.goto(`https://space.bilibili.com/${vmid}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // 等待 API 响应被捕获
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('CDP capture result:', capturedData ? `Found: ${capturedData.name}` : 'null');

        if (capturedData) {
          upData = { code: 0, data: capturedData };
          console.log('Got UP info via CDP capture:', capturedData.name || 'unknown');
        }

        await client.detach();
        await recyclePage(page);

      } catch (puppeteerError) {
        console.error('Puppeteer fallback failed:', puppeteerError.message);
      }
    }

    // 如果所有方法都失败，返回基本结构
    if (!upData || upData.code !== 0) {
      console.log('All methods failed, returning basic UP info structure');
      return {
        mid: vmid,
        name: '',
        face: '',
        sign: '',
        follower: 0,
        video: 0,
        likes: 0
      };
    }

    console.log('Final UP Info Data retrieved successfully');
    return upData.data;
  } catch (error) {
    console.error('Error fetching UP info:', error);
    return {
      mid: vmid,
      name: '',
      face: '',
      sign: '',
      follower: 0,
      video: 0,
      likes: 0
    };
  }
}

// CORS中间件
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 处理OPTIONS请求
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// 根路径返回HTML页面
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML_PAGE);
});

// 视频信息API
app.get('/api/video-info', async (req, res) => {
  try {
    const bvid = req.query.bvid;

    if (!bvid) {
      return res.status(400).json({ error: 'Missing bvid parameter' });
    }

    const videoInfo = await getVideoInfo(bvid);
    res.json(videoInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UP主代表作API
app.get('/api/up-masterpiece', async (req, res) => {
  try {
    const vmid = req.query.vmid;

    if (!vmid) {
      return res.status(400).json({ error: 'Missing vmid parameter' });
    }

    const upInfo = await getUpMasterpiece(vmid);
    res.json(upInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UP主个人信息API
app.get('/api/up-info', async (req, res) => {
  try {
    const vmid = req.query.vmid;

    if (!vmid) {
      return res.status(400).json({ error: 'Missing vmid parameter' });
    }

    const upInfo = await getUpInfo(vmid);
    res.json(upInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 图片代理路由
app.get('/proxy-image/:encodedUrl', async (req, res) => {
  try {
    const encodedImageUrl = req.params.encodedUrl;
    const imageUrl = decodeURIComponent(encodedImageUrl);

    // 转发请求到原始图片URL
    const response = await fetch(imageUrl);

    // 返回图片响应
    res.setHeader('Content-Type', response.headers.get('Content-Type'));
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 使用arrayBuffer()替代buffer()，然后转换为Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.error('Error in proxy-image route:', error);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // 不立即初始化浏览器，只在需要时初始化
  console.log('Browser will be initialized on first request');
});

// 优雅关闭
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
