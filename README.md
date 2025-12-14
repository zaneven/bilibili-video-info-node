# Bilibili 视频信息获取工具

一个基于 Node.js 的服务器，使用 Puppeteer 模拟浏览器请求来获取 Bilibili 视频的基本信息，包括视频详情和作者信息。

## 功能特性

- 🚀 快速轻量的 Node.js 服务器
- 📦 易于部署和使用
- 🤖 使用 Puppeteer 模拟浏览器请求
- 🔒 安全的 API，支持 CORS
- 📱 内置 Web 界面，方便使用
- 🎯 只返回必要的视频和作者信息
- 👤 支持 UP 主个人信息查询
- 📋 支持 UP 主代表作查询

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
   docker run -d -p 8001:3000 --name bilibili-video-info bilibili-video-info
   ```

#### 使用 Docker Compose 部署

1. 确保 `docker-compose.yml` 文件存在

2. 运行容器：
   ```bash
   docker-compose up -d
   ```

3. 停止容器：
   ```bash
   docker-compose down
   ```

4. 重新构建并运行：
   ```bash
   docker-compose up -d --build
   ```

#### 访问应用

部署完成后，应用将在 `http://localhost:8001` 上运行。

#### 常见问题解决

1. **容器启动失败，报错 "Cannot find module 'express'"**
   - 解决方案：确保在构建镜像时正确安装了依赖，使用 `docker-compose up -d --build` 重新构建镜像
   - 不要在 `docker-compose.yml` 中挂载本地目录到容器的 `/app` 目录，这会覆盖容器内已安装的依赖

2. **容器无法访问互联网**
   - 解决方案：检查 Docker 网络设置，确保容器可以访问互联网以下载浏览器和访问B站API

3. **Puppeteer 无法启动浏览器**
   - 解决方案：确保 Docker 容器有足够的权限，特别是 `--no-sandbox` 参数已正确配置
   - 检查 Docker 日志，查看具体错误信息

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

#### 获取视频信息

```
http://localhost:3000/api/video-info?bvid=<bilibili-video-id>
```

#### 使用示例

```bash
curl "http://localhost:3000/api/video-info?bvid=BV1XX4y1C7mz"
```

#### 响应示例

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

#### 获取UP主代表作

```
http://localhost:3000/api/up-masterpiece?vmid=<up-master-id>
```

#### 使用示例

```bash
curl "http://localhost:3000/api/up-masterpiece?vmid=287291651"
```

#### 响应示例

```json
[
  {
    "aid": 775367388,
    "videos": 1,
    "tid": 126,
    "tname": "人力VOCALOID",
    "copyright": 1,
    "pic": "http://i1.hdslb.com/bfs/archive/423dcf3d3cae6b5fc4737a167223a558d4c4ec88.jpg",
    "title": "【b站独家原版】哈基米调音-《两个笨蛋》",
    "pubdate": 1668852000,
    "ctime": 1668843503,
    "desc": "春原的专属BGM\n调教工具：Melodyne Studio 4、AU\n视频素材：赛马娘动画版\n伴奏： Clannad bgm -马鹿ふたり 曲速122",
    "duration": 32,
    "owner": {
      "mid": 287291651,
      "name": "京桥刹那",
      "face": "https://i2.hdslb.com/bfs/face/92f95e272607825b1ed909d2a84824c4d9a1ed88.jpg"
    },
    "stat": {
      "aid": 775367388,
      "view": 3208856,
      "danmaku": 18289,
      "reply": 12350,
      "favorite": 87691,
      "coin": 69399,
      "share": 30119,
      "like": 198623
    }
  }
]

#### 获取UP主个人信息

```
http://localhost:3000/api/up-info?vmid=<up-master-id>
```

#### 使用示例

```bash
curl "http://localhost:3000/api/up-info?vmid=287291651"
```

#### 响应示例

```json
{
  "mid": 287291651,
  "name": "京桥刹那",
  "face": "https://i2.hdslb.com/bfs/face/92f95e272607825b1ed909d2a84824c4d9a1ed88.jpg",
  "sign": "春原的专属BGM制作",
  "video": 100,
  "article": 0,
  "follower": 50000
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