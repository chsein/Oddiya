import React, { useState, useEffect } from 'react';
import styles from '../styles/PWAInstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);

    useEffect(() => {
        // PWA가 이미 설치되어 있는지 확인
        const checkIfInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
                return;
            }

            // iOS Safari에서 standalone 모드 감지
            if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
                setIsInstalled(true);
                return;
            }
        };

        checkIfInstalled();

        // beforeinstallprompt 이벤트 리스너
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            // 이미 dismiss된 경우 표시하지 않음
            if (typeof window !== 'undefined') {
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                if (dismissed === 'permanent') {
                    return;
                }
            }
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallPrompt(true);
        };

        // appinstalled 이벤트 리스너
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // 처음에 바로 프롬프트 표시를 위해 짧은 딜레이 후 표시
        const showTimer = setTimeout(() => {
            if (typeof window !== 'undefined') {
                const dismissed = localStorage.getItem('pwa-install-dismissed');
                if (!dismissed && !isInstalled) {
                    // beforeinstallprompt 이벤트가 이미 발생했는지 확인
                    // 없다면 일반 설치 안내로 표시 (수동 설치 방법 안내)
                    setShowInstallPrompt(true);
                }
            }
        }, 1000); // 1초 후 표시

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            clearTimeout(showTimer);
        };
    }, [isInstalled]);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // beforeinstallprompt 이벤트가 있는 경우
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('PWA 설치가 승인되었습니다.');
            } else {
                console.log('PWA 설치가 거부되었습니다.');
            }

            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        } else {
            // beforeinstallprompt 이벤트가 없는 경우 (iOS Safari 등)
            // 브라우저별 설치 안내
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);

            if (isIOS) {
                alert('iOS Safari에서는:\n1. 공유 버튼(⬆️)을 누르세요\n2. "홈 화면에 추가"를 선택하세요');
            } else if (isAndroid) {
                alert('Android Chrome에서는:\n1. 메뉴(⋯)를 누르세요\n2. "앱 설치" 또는 "홈 화면에 추가"를 선택하세요');
            } else {
                alert('브라우저 주소창의 설치 아이콘(⬇️)을 클릭하거나, 브라우저 메뉴에서 "앱 설치"를 선택하세요.');
            }

            setShowInstallPrompt(false);
        }
    };

    const handleDismiss = () => {
        setIsDismissing(true);
        // 애니메이션 완료 후 팝업 숨기기
        setTimeout(() => {
            setShowInstallPrompt(false);
            setIsDismissing(false);
            // 앱을 다시 실행할 때까지 영구적으로 다시 표시하지 않음
            if (typeof window !== 'undefined') {
                localStorage.setItem('pwa-install-dismissed', 'permanent');
            }
        }, 300); // CSS 애니메이션 시간과 동일
    };

    // dismiss했으면 표시하지 않음 (영구적으로)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (dismissed === 'permanent') {
                setShowInstallPrompt(false);
                setDeferredPrompt(null);
            }
        }
    }, []);

    // 설치 프롬프트 표시 조건: 설치되지 않았고, dismiss되지 않았고, showInstallPrompt가 true일 때
    const dismissed = typeof window !== 'undefined' ? localStorage.getItem('pwa-install-dismissed') : null;
    const shouldShowPrompt = !isInstalled && !dismissed && showInstallPrompt;

    if (!shouldShowPrompt) {
        return null;
    }

    return (
        <div className={`${styles.installPrompt} ${isDismissing ? styles.dismissing : ''}`}>
            <div className={styles.installContent}>
                <div className={styles.installIcon}>📱</div>
                <div className={styles.installText}>
                    <h3>ODDIYA 앱 설치</h3>
                    <p>홈 화면에 추가하여 더 빠르게 접근하세요!</p>
                </div>
                <div className={styles.installButtons}>
                    <button
                        className={styles.installButton}
                        onClick={handleInstallClick}
                    >
                        설치
                    </button>
                    <button
                        className={styles.dismissButton}
                        onClick={handleDismiss}
                    >
                        나중에
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
