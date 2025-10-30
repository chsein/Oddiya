import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../helpers/firebase';
import Header from "../components/Header";
import styles from "../styles/LoginPage.module.css";

const Login: NextPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = (email: string) => {
        console.log('Login successful:', { email });
        router.push('/tripList');
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
                    leftIcons={['🔐', '👤']}
                    rightIcons={['⚙️', '❓']}
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

                        {/* <div className={styles.divider}>
                            <span>또는</span>
                        </div>

                         <div className={styles.socialLogin}>
                            <button className={styles.socialButton}>
                                <span className={styles.socialIcon}>📧</span>
                                Google로 로그인
                            </button>
                            <button className={styles.socialButton}>
                                <span className={styles.socialIcon}>🍎</span>
                                Apple로 로그인
                            </button>
                        </div> */}

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
