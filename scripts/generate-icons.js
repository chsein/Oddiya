const fs = require('fs');
const path = require('path');

// 기본 아이콘 SVG 템플릿
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

// 아이콘 크기들
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// 아이콘 생성
const generateIcons = () => {
    const iconsDir = path.join(__dirname, '..', 'public', 'icons');

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    iconSizes.forEach(size => {
        const svg = createIconSVG(size);
        const filename = `icon-${size}x${size}.png`;
        const filepath = path.join(iconsDir, filename);

        // SVG를 파일로 저장 (실제 PNG 변환은 별도 도구 필요)
        const svgFilename = `icon-${size}x${size}.svg`;
        const svgFilepath = path.join(iconsDir, svgFilename);
        fs.writeFileSync(svgFilepath, svg);

        console.log(`Generated ${svgFilename}`);
    });

    // Safari pinned tab SVG
    const safariIcon = `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00FFAA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00e699;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="3" fill="url(#gradient)"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="white">O</text>
</svg>`;

    fs.writeFileSync(path.join(iconsDir, 'safari-pinned-tab.svg'), safariIcon);
    console.log('Generated safari-pinned-tab.svg');

    // browserconfig.xml
    const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/icons/icon-144x144.png"/>
            <TileColor>#00FFAA</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

    fs.writeFileSync(path.join(iconsDir, 'browserconfig.xml'), browserConfig);
    console.log('Generated browserconfig.xml');
};

// 실행
generateIcons();
console.log('PWA 아이콘 생성 완료!');
console.log('PNG 변환을 위해서는 ImageMagick이나 다른 도구를 사용하세요.');
console.log('예: convert icon-512x512.svg icon-512x512.png');
