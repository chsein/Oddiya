import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import styles from "../styles/LandingPage.module.css";

const Home: NextPage = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push('/login');
  };

  return (
    <div>
      <Head>
        <title>ODDIYA - 나만의 스티커로 특별한 영상 만들기</title>
        <meta name="description" content="AI가 만든 스티커로 영상을 더욱 재미있게 꾸며보세요" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div className={styles.container} onClick={handleClick}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <h1 className={styles.logoText}>ODDIYA</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
