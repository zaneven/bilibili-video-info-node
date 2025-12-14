// 引入依赖
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
        '--disable-gpu'
      ]
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
          '--disable-setuid-sandbox'
        ]
      });
      console.log('Puppeteer browser initialized with default options');
    } catch (fallbackError) {
      console.error('Failed to initialize Puppeteer browser:', fallbackError.message);
      // 不抛出错误，让后续代码处理
    }
  }
}

// 使用Puppeteer获取视频信息
async function getVideoInfo(bvid) {
  try {
    if (!browser) {
      await initBrowser();
    }
    
    const page = await browser.newPage();
    
    // 设置User-Agent和其他必要的header
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0');
    
    // 启用网络请求日志，查看所有B站API请求
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api.bilibili.com/x/web-interface/view?bvid=')) {
        console.log('Found video info API response:', url);
      }
    });
    
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
          'Referer': `https://www.bilibili.com/video/${bvid}/`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0'
        }
      });
      
      const data = await response.json();
      console.log('Direct API Response:', JSON.stringify(data, null, 2));
      
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
        waitUntil: 'networkidle2', // 等待更多网络请求完成
        timeout: 60000
      });
      
      // 等待一段时间确保所有数据加载完成
      await new Promise(resolve => setTimeout(resolve, 3000));
      
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
    
    await page.close();
    
    if (!videoData || videoData.code !== 0 || !videoData.data) {
      throw new Error('Failed to fetch video info');
    }
    
    console.log('Final Video Data:', JSON.stringify(videoData, null, 2));
    
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
    
    // 处理视频信息
    const videoInfo = {
      bvid: video.bvid || bvid,
      aid: video.aid || video.id || '',
      title: video.title || video.name || '',
      desc: video.desc || video.description || '',
      pic: video.pic || video.thumbnailUrl || '',
      duration: video.duration || (video.durationSeconds || 0),
      pubdate: video.pubdate || (video.uploadDate ? new Date(video.uploadDate).getTime() / 1000 : 0),
      ctime: video.ctime || (video.datePublished ? new Date(video.datePublished).getTime() / 1000 : 0),
      ...stat
    };
    
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
          'Referer': `https://space.bilibili.com/${vmid}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0'
        }
      });
      
      const data = await response.json();
      console.log('UP Masterpiece API Response:', JSON.stringify(data, null, 2));
      
      if (data.code === 0) {
        masterpieceData = data;
      }
    } catch (error) {
      console.error('Direct UP masterpiece API request failed:', error);
      
      // 如果直接API请求失败，尝试使用Puppeteer
      if (!browser) {
        await initBrowser();
      }
      
      const page = await browser.newPage();
      
      // 设置User-Agent和其他必要的header
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0');
      
      // 访问UP主空间页面
      await page.goto(`https://space.bilibili.com/${vmid}`, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // 等待一段时间确保所有数据加载完成
      await new Promise(resolve => setTimeout(resolve, 3000));
      
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
      
      await page.close();
    }
    
    if (!masterpieceData || masterpieceData.code !== 0) {
      throw new Error('Failed to fetch UP masterpiece info');
    }
    
    console.log('Final UP Masterpiece Data:', JSON.stringify(masterpieceData, null, 2));
    
    // 返回原始数据，因为数据结构已经符合要求
    return masterpieceData.data;
  } catch (error) {
    console.error('Error fetching UP masterpiece info:', error);
    console.error('Error stack:', error.stack);
    throw error;
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
