import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "../styles/LandingPage.module.css";
import { useAuth } from "../contexts/AuthContext";

const Home: NextPage = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigateNext = useCallback(() => {
    setPendingRedirect(true);
  }, []);

  useEffect(() => {
    const fadeInTimer = setTimeout(() => setIsVisible(true), 100);
    fadeOutTimeoutRef.current = setTimeout(() => {
      setIsFadingOut(true);
    }, 2100);

    redirectTimeoutRef.current = setTimeout(() => {
      navigateNext();
    }, 2600);

    return () => {
      clearTimeout(fadeInTimer);
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [navigateNext]);

  useEffect(() => {
    if (!pendingRedirect || loading) {
      return;
    }

    const target = user ? '/tripList' : '/login';
    router.replace(target);
  }, [pendingRedirect, loading, user, router]);

  const handleSkip = () => {
    if (!isFadingOut) {
      setIsFadingOut(true);
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    redirectTimeoutRef.current = setTimeout(() => {
      navigateNext();
    }, 600);
  };

  return (
    <div>
      <Head>
        <title>ODDIYA</title>
        <meta name="description" content="AI로 일정을 짜고 여행 영상을 만들어보세요" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="icon" href="/defaulticon.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div className={styles.container} onClick={handleSkip}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <h1
              className={`${styles.logoText} ${isVisible ? styles.fadeIn : ''} ${isFadingOut ? styles.fadeOut : ''}`}
            >
              ODDIYA
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
