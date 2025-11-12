import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../helpers/firebase';
import {
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithApple,
    signInWithAppleRedirect,
    isMobile,
    signOut as firebaseSignOut,
    getCurrentUserIdToken
} from '../lib/firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import Header from "../components/Header";
import styles from "../styles/LoginPage.module.css";

const Login: NextPage = () => {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<string>('');

    // 이미 로그인되어 있으면 tripList로 리다이렉트
    // useEffect(() => {
    //     const checkAuthAndRedirect = async () => {
    //         // 로딩 중이면 대기
    //         if (loading) {
    //             return;
    //         }

    //         // 사용자가 로그인되어 있으면 토큰 확인 후 리다이렉트
    //         if (user) {
    //             try {
    //                 const token = await getCurrentUserIdToken();
    //                 if (token) {
    //                     console.log('✅ 이미 로그인되어 있음. tripList로 리다이렉트');
    //                     // returnUrl이 있으면 해당 페이지로, 없으면 tripList로 이동
    //                     const returnUrl = router.query.returnUrl as string;
    //                     const redirectPath = returnUrl || '/tripList';
    //                     router.push(redirectPath);
    //                 }
    //             } catch (error) {
    //                 console.error('❌ 토큰 확인 실패:', error);
    //                 // 토큰이 없으면 로그인 화면 유지
    //             }
    //         }
    //     };

    //     checkAuthAndRedirect();
    // }, [user, loading, router]);

    const handleLogin = (email: string) => {
        console.log('Login successful:', { email });

        // returnUrl이 있으면 해당 페이지로, 없으면 tripList로 이동
        const returnUrl = router.query.returnUrl as string;
        const redirectPath = returnUrl || '/tripList';

        router.push(redirectPath);
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // 회원가입
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log('✅ 회원가입 성공:', userCredential.user);
                handleLogin(email);
            } else {
                // 로그인
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('✅ 로그인 성공:', userCredential.user);
                handleLogin(email);
            }
        } catch (error: any) {
            console.error('❌ 인증 실패:', error);
            setError(error.message || '로그인/회원가입에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        console.log('🔵 Google 로그인 버튼 클릭');
        setIsLoading(true);
        setError(null);

        try {
            console.log('🔵 isMobile:', isMobile());
            console.log('🔵 Firebase auth:', auth);

            // 항상 팝업 방식 사용 (테스트용)
            console.log('🔵 signInWithGoogle 호출 시작...');
            const result = await signInWithGoogle();
            console.log('✅ Google 로그인 성공:', result.user.email);
            handleLogin(result.user.email || 'Google User');
        } catch (error: any) {
            console.error('❌ Google 로그인 실패:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            setError(error.message || 'Google 로그인에 실패했습니다.');
            setIsLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 모바일이면 리다이렉트 방식, 데스크톱이면 팝업 방식
            if (isMobile()) {
                await signInWithAppleRedirect();
                // 리다이렉트되므로 이후 코드는 실행되지 않음
            } else {
                const result = await signInWithApple();
                console.log('✅ Apple 로그인 성공:', result.user.email);
                handleLogin(result.user.email || 'Apple User');
            }
        } catch (error: any) {
            console.error('❌ Apple 로그인 실패:', error);
            setError(error.message || 'Apple 로그인에 실패했습니다.');
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await firebaseSignOut();
            console.log('✅ 로그아웃 성공');
            setTokenInfo('');
            setError(null);
        } catch (error: any) {
            console.error('❌ 로그아웃 실패:', error);
            setError(error.message || '로그아웃에 실패했습니다.');
        }
    };

    const handleCheckToken = async () => {
        try {
            const token = await getCurrentUserIdToken();
            if (token) {
                // 토큰의 앞부분만 표시
                const tokenPreview = token.substring(0, 50) + '...';
                setTokenInfo(`Token: ${tokenPreview}`);
                console.log('✅ Firebase ID Token:', token);
                // jwt.io에서 디코딩 가능하도록 전체 토큰도 콘솔에 출력
                console.log('📋 Copy this token to jwt.io to decode:', token);
            } else {
                setTokenInfo('토큰이 없습니다. 로그인이 필요합니다.');
            }
        } catch (error: any) {
            console.error('❌ 토큰 가져오기 실패:', error);
            setError(error.message || '토큰을 가져올 수 없습니다.');
        }
    };

    return (
        <div>
            <Head>
                <title>로그인 - ODDIYA</title>
                <meta name="description" content="ODDIYA에 로그인하여 나만의 스티커 영상을 만들어보세요" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className={styles.container}>
                <Header
                    backgroundColor="#00FFAA"
                    leftImage={{ src: '/headerimg/greenLeft.png', alt: 'Login' }}
                    rightImage={{ src: '/headerimg/greenRight.png', alt: 'Login' }}
                    title="로그인 하기"
                    leftButton={{
                        text: "뒤로가기",
                        onClick: handleBack
                    }}
                    rightButton={{
                        text: "도움말",
                        onClick: () => console.log('도움말 클릭')
                    }}
                />

                <div className={styles.content}>
                    <div className={styles.loginCard}>

                        {/* 로그인 상태 표시 (테스트용) */}
                        {user && (
                            <div style={{
                                marginBottom: '20px',
                                padding: '15px',
                                backgroundColor: '#e8f5e9',
                                borderRadius: '8px',
                                border: '1px solid #4caf50'
                            }}>
                                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#2e7d32' }}>
                                    ✅ 로그인됨: {user.email || user.providerData[0]?.email || user.displayName || 'User'}
                                </p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleCheckToken}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#2196f3',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        토큰 확인
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        로그아웃
                                    </button>
                                </div>
                                {tokenInfo && (
                                    <p style={{
                                        marginTop: '10px',
                                        fontSize: '12px',
                                        color: '#555',
                                        wordBreak: 'break-all'
                                    }}>
                                        {tokenInfo}
                                    </p>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="이메일을 입력하세요"
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    비밀번호
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="비밀번호를 입력하세요"
                                    required
                                />
                            </div>

                            {error && (
                                <div className={styles.errorMessage}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={styles.loginButton}
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? (isSignUp ? '회원가입 중...' : '로그인 중...')
                                    : (isSignUp ? '회원가입' : '로그인')
                                }
                            </button>
                        </form>

                        <div className={styles.divider}>
                            <span>또는</span>
                        </div>

                        <div className={styles.socialLogin}>
                            <button
                                type="button"
                                className={styles.socialButton}
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <span className={styles.socialIcon}>📧</span>
                                Google로 로그인
                            </button>
                            <button
                                type="button"
                                className={styles.socialButton}
                                onClick={handleAppleLogin}
                                disabled={isLoading}
                            >
                                <span className={styles.socialIcon}>🍎</span>
                                Apple로 로그인
                            </button>
                        </div>

                        <div className={styles.footer}>
                            <div>
                                {isSignUp ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
                                <button
                                    type="button"
                                    className={styles.linkButton}
                                    onClick={() => setIsSignUp(!isSignUp)}
                                >
                                    {isSignUp ? '로그인' : '회원가입'}
                                </button>
                            </div>
                            {/* <button className={styles.linkButton}>
                                비밀번호를 잊으셨나요?
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
