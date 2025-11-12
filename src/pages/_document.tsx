import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="ko">
            <Head>
                {/* PWA Meta Tags */}
                <meta name="application-name" content="ODDIYA" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="ODDIYA" />
                <meta name="description" content="아이와의 여행을 기록하고 공유하는 앱" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="msapplication-config" content="/icons/browserconfig.xml" />
                <meta name="msapplication-TileColor" content="#00FFAA" />
                <meta name="msapplication-tap-highlight" content="no" />
                <meta name="theme-color" content="#00FFAA" />

                {/* Force Landscape Orientation */}
                <meta name="screen-orientation" content="landscape" />
                <meta name="x5-orientation" content="landscape" />
                <meta name="x5-fullscreen" content="true" />
                <meta name="full-screen" content="yes" />

                {/* PWA Icons */}
                <link rel="apple-touch-icon" href="/defaulticon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/defaulticon.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/defaulticon.png" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#00FFAA" />
                <link rel="shortcut icon" href="/defaulticon.png" />

                {/* Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Galada:wght@400&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Gamja+Flower:wght@400&display=swap"
                    rel="stylesheet"
                />
                <script
                    type="text/javascript"
                    src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=brxklqwku5"
                ></script>
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
