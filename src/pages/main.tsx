import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import Header from "../components/Header";

const Main: NextPage = () => {
    const router = useRouter();

    return (
        <div>
            <Head>
                <title>메인 - ODDIYA</title>
                <meta name="description" content="ODDIYA 메인 페이지" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #00FFAA 0%, #CEF8DE 100%)',
                color: '#333',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
            }}>
                <Header
                    backgroundColor="#FF6B6B"
                    leftIcons={['🎉', '🎨']}
                    rightIcons={['📱', '✨']}
                    title="WELCOME"
                />

                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>환영합니다! 🎉</h1>
                        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
                            로그인이 완료되었습니다.
                        </p>
                        <button
                            onClick={() => router.push('/landing')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.3)',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                color: '#333',
                                padding: '12px 24px',
                                borderRadius: '25px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            }}
                        >
                            처음으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Main;
