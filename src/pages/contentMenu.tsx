import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import styles from "../styles/ContentMenu.module.css";
import { getTripById, Trip } from "../helpers/api";

const ContentMenu: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const [tripData, setTripData] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API에서 여행 상세 정보 가져오기
    const fetchTripData = async () => {
        if (!tripId || typeof tripId !== 'string') {
            setError('여행 ID가 없습니다.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await getTripById(tripId);
            console.log('🚗 Fetched trip data:', data);
            setTripData(data);
        } catch (err) {
            console.error('Error fetching trip data:', err);
            setError('여행 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTripData();
    }, [tripId]);

    const handleBack = () => {
        router.push('/tripList');
    };

    const handleMenuClick = (menuType: string) => {
        console.log(`Menu clicked: ${menuType}`);
        // 여기서 각 메뉴에 따른 페이지로 이동
        switch (menuType) {
            case 'explore':
                // tripData에서 지역명 추출 (destinationCity 사용)
                const regionName = tripData?.destinationCity || '서울';
                router.push(`/contentList?tripId=${tripId}&regionName=${encodeURIComponent(regionName)}`);
                break;

            case 'schedule':
                router.push(`/scheduleConfirmation?tripId=${tripId}`);
                break;
            case 'collection':
                router.push(`/collectionList?tripId=${tripId}`);
                break;
            case 'record':
                router.push(`/record?tripId=${tripId}`);
                break;
            default:
                break;
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>여행 정보를 불러오는 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>{error}</p>
                    <button onClick={fetchTripData} className={styles.retryButton}>
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    if (!tripData) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>여행 정보를 찾을 수 없습니다.</div>
            </div>
        );
    }

    return (
        <div>
            <Head>
                <title>{tripData.title}</title>
                <meta name="description" content={`${tripData.title} 여행 관리`} />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className={styles.container}>
                <Header
                    backgroundColor="#00FFAA"
                    leftImage={{ src: '/headerimg/yellowLeft.png', alt: 'Content Menu' }}
                    rightImage={{ src: '/headerimg/yellowRight.png', alt: 'Content Menu' }}
                    title={`${tripData.tripName || 'ODDIYA'}`}
                    leftButton={{
                        text: "뒤로가기",
                        onClick: handleBack
                    }}
                    rightButton={{
                        text: "설정",
                        onClick: () => router.push(`/settings?tripId=${tripId}`)
                    }}
                />

                <div className={styles.content}>


                    <div className={styles.menuGrid}>
                        <div
                            className={styles.menuItem}
                            onClick={() => handleMenuClick('explore')}
                        >
                            <div className={styles.menuIcon}>🗺️</div>
                            <h3 className={styles.menuTitle}>여행지 둘러보기</h3>
                        </div>

                        <div
                            className={styles.menuItem}
                            onClick={() => handleMenuClick('collection')}
                        >
                            <div className={styles.menuIcon}>⭐</div>
                            <h3 className={styles.menuTitle}>관심 여행지 모아보기</h3>
                        </div>

                        <div
                            className={styles.menuItem}
                            onClick={() => handleMenuClick('schedule')}
                        >
                            <div className={styles.menuIcon}>📅</div>
                            <h3 className={styles.menuTitle}>일정 생성하기</h3>
                        </div>

                        <div
                            className={styles.menuItem}
                            onClick={() => handleMenuClick('record')}
                        >
                            <div className={styles.menuIcon}>📝</div>
                            <h3 className={styles.menuTitle}>여행 기록하기</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentMenu;
