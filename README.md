# Bilibili 视频信息获取工具

一个基于 Node.js 的服务器，使用 Puppeteer 模拟浏览器请求来获取 Bilibili 视频的基本信息，包括视频详情和作者信息。

## 功能特性

- 🚀 快速轻量的 Node.js 服务器
- 📦 易于部署和使用
- 🤖 使用 Puppeteer 模拟浏览器请求
- 🔒 安全的 API，支持 CORS
- 📱 内置 Web 界面，方便使用
- 🎯 只返回必要的视频和作者信息

## 前置条件

- Node.js 18+
- npm 或 yarn
- 已安装 Chrome 浏览器

## 安装步骤

1. 克隆或下载本仓库

2. 安装依赖：
   ```bash
   npm install
   ```

## 部署说明

### 本地开发环境

在本地开发时，应用会使用系统已安装的 Chrome 浏览器。

### 服务器环境

在服务器环境中部署时，Puppeteer 会自动下载并使用兼容的浏览器版本。请确保：

1. 服务器有足够的存储空间（约 500MB）用于下载浏览器
2. 服务器可以访问互联网以下载浏览器
3. 安装依赖时不要使用 `PUPPETEER_SKIP_DOWNLOAD=true` 环境变量
4. 确保服务器已安装必要的依赖库（如 libnss3、libatk1.0-0 等）

对于 Ubuntu 服务器，可以安装以下依赖：
```bash
sudo apt-get update && sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1 \
  libasound2 \
  libatspi2.0-0 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxrender1
```

### Docker 部署（推荐）

使用 Docker 部署是最便捷的方式，应用包含完整的运行环境，包括浏览器。

#### 前置条件

- Docker 已安装
- Docker Compose（可选，推荐）

#### 使用 Docker 命令部署

1. 构建 Docker 镜像：
   ```bash
   docker build -t bilibili-video-info .
   ```

2. 运行 Docker 容器：
   ```bash
   docker run -d -p 3000:3000 --name bilibili-video-info bilibili-video-info
   ```

#### 使用 Docker Compose 部署

1. 运行容器：
   ```bash
   docker-compose up -d
   ```

2. 停止容器：
   ```bash
   docker-compose down
   ```

#### 访问应用

部署完成后，应用将在 `http://localhost:3000` 上运行。

## 开发运行

在本地运行服务器：

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 上运行

## 使用方法

### Web 界面

打开浏览器并导航到：
```
http://localhost:3000
```

在输入框中输入 Bilibili 视频的 BV 号（例如：BV1XX4y1C7mz）即可获取视频信息。

### API 端点

```
http://localhost:3000/api/video-info?bvid=<bilibili-video-id>
```

### 使用示例

```bash
curl "http://localhost:3000/api/video-info?bvid=BV1XX4y1C7mz"
```

### 响应示例

```json
{
  "video": {
    "bvid": "BV1XX4y1C7mz",
    "aid": 356408325,
    "title": "暗区突围：从头帅到脚趾尖",
    "desc": "-",
    "pic": "http://i0.hdslb.com/bfs/archive/833b69050d729703865a106c128a25cb38815e9a.jpg",
    "duration": 32,
    "pubdate": 1684908275,
    "ctime": 1684908275,
    "view": 11774,
    "danmaku": 11,
    "reply": 14,
    "favorite": 147,
    "coin": 42,
    "share": 33,
    "like": 923
  },
  "owner": {
    "mid": 642237326,
    "name": "空白xBai",
    "face": "https://i2.hdslb.com/bfs/face/35bda972ff3e141de91b5999b951601919214764.jpg"
  }
}
```

## 项目结构

```
├── src/
│   └── index.js          # 主服务器代码
├── package.json          # 项目依赖
└── README.md             # 说明文档
```

## 配置选项

服务器使用环境变量进行配置：

- `PORT`: 服务器运行的端口（默认：3000）

## 使用技术

- Node.js
- Express.js
- Puppeteer
- JavaScript

## 许可证

MIT

## 贡献

欢迎贡献代码！请随时提交 Pull Request。

## 致谢

- Bilibili 提供视频平台
- Puppeteer 提供浏览器自动化支持