# Bilibili Video Info Worker

A Cloudflare Worker that fetches basic information about Bilibili videos, including video details and author information.

## Features

- 🚀 Fast and lightweight Cloudflare Worker
- 📦 Easy to deploy and use
- 🔒 Secure API proxy
- 📱 Supports CORS for frontend applications
- 🎯 Only returns essential video and author information

## Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI installed (will be installed via npm)

## Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the worker locally:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

### API Endpoint

```
https://<your-worker-url>/?bvid=<bilibili-video-id>
```

### Example

```bash
curl "http://localhost:8787/?bvid=BV1N14y1p7G3"
```

### Example Response

```json
{
  "video": {
    "bvid": "BV1N14y1p7G3",
    "aid": 775367388,
    "title": "【b站独家原版】哈基米调音-《两个笨蛋》",
    "desc": "春原的专属BGM\n调教工具：Melodyne Studio 4、AU\n视频素材：赛马娘动画版\n伴奏： Clannad bgm -马鹿ふたり 曲速122",
    "pic": "http://i1.hdslb.com/bfs/archive/423dcf3d3cae6b5fc4737a167223a558d4c4ec88.jpg",
    "duration": 32,
    "pubdate": 1668852000,
    "ctime": 1668843503,
    "view": 3207341,
    "danmaku": 18276,
    "reply": 12348,
    "favorite": 87667,
    "coin": 69371,
    "share": 30109,
    "like": 198536
  },
  "owner": {
    "mid": 287291651,
    "name": "京桥刹那",
    "face": "https://i2.hdslb.com/bfs/face/92f95e272607825b1ed909d2a84824c4d9a1ed88.jpg"
  }
}
```

## Project Structure

```
├── src/
│   └── index.js          # Main Worker code
├── package.json          # Project dependencies
├── wrangler.toml         # Wrangler configuration
└── README.md             # This file
```

## Configuration

The worker uses environment variables defined in `wrangler.toml`:

- `ORIGIN`: The Bilibili API origin URL (default: `https://api.bilibili.com`)

## Technologies Used

- Cloudflare Workers
- JavaScript
- Wrangler CLI

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Bilibili for their video platform
- Cloudflare for their Workers platform
