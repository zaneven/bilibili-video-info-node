// HTML页面内容
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bilibili 视频信息解析</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f0f2f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #00aeec;
        }
        
        .input-section {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            text-align: center;
        }
        
        .input-section input {
            width: 300px;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
        }
        
        .input-section button {
            padding: 10px 20px;
            font-size: 16px;
            background-color: #00aeec;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .input-section button:hover {
            background-color: #0099cc;
        }
        
        #result {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            display: none;
        }
        
        .video-card {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .video-cover {
            width: 200px;
            height: 112px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .video-info {
            flex: 1;
        }
        
        .video-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .video-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #666;
        }
        
        .video-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #00aeec;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
        }
        
        .owner-info {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
        }
        
        .owner-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .owner-name {
            font-size: 16px;
            font-weight: bold;
        }
        
        .video-desc {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
            white-space: pre-wrap;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            font-size: 16px;
            color: #666;
        }
        
        .error {
            background-color: #fff0f0;
            color: #ff4d4f;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bilibili 视频信息解析</h1>
        
        <div class="input-section">
            <input type="text" id="bvidInput" placeholder="请输入BV号，例如：BV1XX4y1C7mz">
            <button id="submitBtn">解析视频</button>
        </div>
        
        <div class="error" id="errorMsg"></div>
        
        <div class="loading" id="loading">正在解析视频信息...</div>
        
        <div id="result">
            <div class="video-card">
                <img src="" alt="视频封面" class="video-cover" id="videoCover">
                <div class="video-info">
                    <h2 class="video-title" id="videoTitle"></h2>
                    <div class="video-meta">
                        <span id="videoDate"></span>
                        <span id="videoDuration"></span>
                    </div>
                    <div class="video-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="viewCount"></div>
                            <div class="stat-label">播放</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="likeCount"></div>
                            <div class="stat-label">点赞</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="coinCount"></div>
                            <div class="stat-label">硬币</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="favoriteCount"></div>
                            <div class="stat-label">收藏</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="danmakuCount"></div>
                            <div class="stat-label">弹幕</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="replyCount"></div>
                            <div class="stat-label">评论</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="owner-info">
                <img src="" alt="UP主头像" class="owner-avatar" id="ownerAvatar">
                <div>
                    <div class="owner-name" id="ownerName"></div>
                    <div id="ownerId"></div>
                </div>
            </div>
            
            <div class="video-desc">
                <strong>视频简介：</strong>
                <div id="videoDesc"></div>
            </div>
        </div>
    </div>
    
    <script>
        const bvidInput = document.getElementById('bvidInput');
        const submitBtn = document.getElementById('submitBtn');
        const resultDiv = document.getElementById('result');
        const loadingDiv = document.getElementById('loading');
        const errorDiv = document.getElementById('errorMsg');
        
        // 格式化时间戳为日期
        function formatDate(timestamp) {
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN');
        }
        
        // 格式化时长
        function formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                    return hours + ':' + minutes.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
                } else {
                    return minutes + ':' + secs.toString().padStart(2, '0');
                }
        }
        
        // 解析视频信息
        async function fetchVideoInfo() {
            const bvid = bvidInput.value.trim();
            
            if (!bvid) {
                errorDiv.textContent = '请输入BV号';
                errorDiv.style.display = 'block';
                return;
            }
            
            errorDiv.style.display = 'none';
            resultDiv.style.display = 'none';
            loadingDiv.style.display = 'block';
            
            try {
                // 请求本地服务器，由服务器使用Puppeteer获取视频信息
                const apiUrl = '/api/video-info?bvid=' + bvid;
                const response = await fetch(apiUrl);
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // 更新页面内容，使用代理服务处理图片URL以绕过防盗链限制
                const baseUrl = window.location.origin;
                document.getElementById('videoCover').src = baseUrl + '/proxy-image/' + encodeURIComponent(data.video.pic);
                document.getElementById('videoTitle').textContent = data.video.title;
                document.getElementById('videoDate').textContent = '发布时间：' + formatDate(data.video.pubdate);
                document.getElementById('videoDuration').textContent = '时长：' + formatDuration(data.video.duration);
                document.getElementById('viewCount').textContent = data.video.view.toLocaleString();
                document.getElementById('likeCount').textContent = data.video.like.toLocaleString();
                document.getElementById('coinCount').textContent = data.video.coin.toLocaleString();
                document.getElementById('favoriteCount').textContent = data.video.favorite.toLocaleString();
                document.getElementById('danmakuCount').textContent = data.video.danmaku.toLocaleString();
                document.getElementById('replyCount').textContent = data.video.reply.toLocaleString();
                document.getElementById('ownerAvatar').src = baseUrl + '/proxy-image/' + encodeURIComponent(data.owner.face);
                document.getElementById('ownerName').textContent = data.owner.name;
                document.getElementById('ownerId').textContent = 'UP主ID：' + data.owner.mid;
                document.getElementById('videoDesc').textContent = data.video.desc || '暂无简介';
                
                resultDiv.style.display = 'block';
            } catch (error) {
                errorDiv.textContent = '解析失败：' + error.message;
                errorDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
            }
        }
        
        // 绑定事件
        submitBtn.addEventListener('click', fetchVideoInfo);
        bvidInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchVideoInfo();
            }
        });
    </script>
</body>
</html>`;

// 引入依赖
const express = require('express');
const puppeteer = require('puppeteer');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 启动浏览器实例（全局单例，提高性能）
let browser;

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new", // 使用新的无头模式
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
    res.send(await response.buffer());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // 初始化浏览器
  initBrowser().catch(error => {
    console.error('Failed to initialize browser:', error);
    process.exit(1);
  });
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
