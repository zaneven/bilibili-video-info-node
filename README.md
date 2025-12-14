# Bilibili Video Info Node

A Node.js server that fetches basic information about Bilibili videos, including video details and author information, using Puppeteer to simulate browser requests.

## Features

- 🚀 Fast and lightweight Node.js server
- 📦 Easy to deploy and use
- 🤖 Uses Puppeteer to simulate browser requests
- 🔒 Secure API with CORS support
- 📱 Built-in web interface for easy use
- 🎯 Only returns essential video and author information

## Prerequisites

- Node.js 18+
- npm or yarn
- Chrome browser installed

## Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the server locally:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`

## Usage

### Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

You can enter a Bilibili video BV号 (e.g., BV1XX4y1C7mz) in the input field to get video information.

### API Endpoint

```
http://localhost:3000/api/video-info?bvid=<bilibili-video-id>
```

### Example

```bash
curl "http://localhost:3000/api/video-info?bvid=BV1XX4y1C7mz"
```

### Example Response

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

## Project Structure

```
├── src/
│   └── index.js          # Main server code
├── package.json          # Project dependencies
└── README.md             # This file
```

## Configuration

The server uses environment variables for configuration:

- `PORT`: The port to run the server on (default: 3000)

## Technologies Used

- Node.js
- Express.js
- Puppeteer
- JavaScript

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Bilibili for their video platform
- Puppeteer for browser automation