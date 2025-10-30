const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 아이콘 크기들
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// 기본 아이콘 SVG 생성 함수
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00FFAA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00e699;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#gradient)"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white">O</text>
</svg>`;

// PNG 아이콘 생성 함수
const generatePNGIcons = async () => {
    const iconsDir = path.join(__dirname, '..', 'public', 'icons');

    console.log('🎨 PNG 아이콘 생성 중...');

    for (const size of iconSizes) {
        try {
            const svg = createIconSVG(size);
            const pngBuffer = await sharp(Buffer.from(svg))
                .png()
                .toBuffer();

            const filename = `icon-${size}x${size}.png`;
            const filepath = path.join(iconsDir, filename);

            fs.writeFileSync(filepath, pngBuffer);
            console.log(`✅ Generated ${filename}`);
        } catch (error) {
            console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
        }
    }

    // 추가 아이콘들 생성
    try {
        // 192x192 아이콘을 180x180으로 리사이즈 (Android용)
        const icon192 = await sharp(path.join(iconsDir, 'icon-192x192.png'))
            .resize(180, 180)
            .png()
            .toBuffer();

        fs.writeFileSync(path.join(iconsDir, 'icon-180x180.png'), icon192);
        console.log('✅ Generated icon-180x180.png');

        // 512x512 아이콘을 192x192로 리사이즈 (maskable용)
        const icon512 = await sharp(path.join(iconsDir, 'icon-512x512.png'))
            .resize(192, 192)
            .png()
            .toBuffer();

        fs.writeFileSync(path.join(iconsDir, 'icon-192x192-maskable.png'), icon512);
        console.log('✅ Generated icon-192x192-maskable.png');

        // 512x512 아이콘을 512x512로 리사이즈 (maskable용)
        const icon512Maskable = await sharp(path.join(iconsDir, 'icon-512x512.png'))
            .resize(512, 512)
            .png()
            .toBuffer();

        fs.writeFileSync(path.join(iconsDir, 'icon-512x512-maskable.png'), icon512Maskable);
        console.log('✅ Generated icon-512x512-maskable.png');

    } catch (error) {
        console.error('❌ Error generating additional icons:', error.message);
    }

    console.log('🎉 PNG 아이콘 생성 완료!');
};

// 실행
generatePNGIcons().catch(console.error);
