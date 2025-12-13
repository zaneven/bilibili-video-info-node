export default {
  async fetch(request, env) {
    try {
      // 解析请求URL，获取bvid参数
      const url = new URL(request.url);
      const bvid = url.searchParams.get('bvid');
      
      if (!bvid) {
        return new Response(JSON.stringify({ error: 'Missing bvid parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 构建Bilibili API请求URL
      const apiUrl = `${env.ORIGIN}/x/web-interface/view?bvid=${bvid}`;
      
      // 设置请求头，模拟浏览器请求
      const headers = {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'origin': 'https://www.bilibili.com',
        'referer': `https://www.bilibili.com/video/${bvid}/`,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0'
      };
      
      // 发送请求到Bilibili API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`Bilibili API returned ${response.status}`);
      }
      
      // 解析响应数据
      const data = await response.json();
      
      // 检查API返回的code
      if (data.code !== 0) {
        return new Response(JSON.stringify({ error: data.message || 'Failed to fetch video info' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 提取需要的视频和作者信息
      const videoData = data.data;
      const filteredData = {
        video: {
          bvid: videoData.bvid,
          aid: videoData.aid,
          title: videoData.title,
          desc: videoData.desc,
          pic: videoData.pic,
          duration: videoData.duration,
          pubdate: videoData.pubdate,
          ctime: videoData.ctime,
          view: videoData.stat.view,
          danmaku: videoData.stat.danmaku,
          reply: videoData.stat.reply,
          favorite: videoData.stat.favorite,
          coin: videoData.stat.coin,
          share: videoData.stat.share,
          like: videoData.stat.like
        },
        owner: {
          mid: videoData.owner.mid,
          name: videoData.owner.name,
          face: videoData.owner.face
        }
      };
      
      // 返回过滤后的JSON数据
      return new Response(JSON.stringify(filteredData), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};