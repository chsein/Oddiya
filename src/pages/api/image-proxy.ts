import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * 이미지 프록시 API
 * ngrok 경고 페이지를 우회하기 위해 서버사이드에서 이미지를 가져와 클라이언트에게 전달
 *
 * 사용법: /api/image-proxy?url=<encoded-image-url>
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // ngrok 경고 우회 헤더 추가
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      timeout: 10000, // 10초 타임아웃
    });

    // Content-Type 설정
    const contentType = response.headers['content-type'] || 'image/png';
    res.setHeader('Content-Type', contentType);

    // 캐시 헤더 설정 (1시간)
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // 이미지 데이터 전송
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}
