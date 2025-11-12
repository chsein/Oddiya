import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../helpers/firebase";
import styles from "../styles/TripList.module.css";
import { getTrips, Trip } from "../helpers/api";

const TripList: NextPage = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API에서 여행 목록 가져오기
    const fetchTrips = async () => {
        try {
            setLoading(true);
            const data = await getTrips();

            // 데이터가 배열인지 확인하고, 아니면 빈 배열로 설정
            const tripsArray = Array.isArray(data) ? data : [];
            setTrips(tripsArray);
        } catch (err) {
            console.error('Error fetching trips:', err);
            setError('여행 목록을 불러오는데 실패했습니다.');
            // 에러 발생 시에도 빈 배열로 설정
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };


    const handleAddTrip = () => {
        router.push('/addTrip');
    };

    const handleLogout = async () => {
        const confirmLogout = confirm('로그아웃 하시겠습니까?');
        if (!confirmLogout) return;

        try {
            await signOut(auth);
            console.log('✅ 로그아웃 성공');
            // 로그아웃 후 localStorage의 토큰 제거
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
            }
            router.push('/login');
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            alert('로그아웃에 실패했습니다.');
        }
    };

    const handleTripClick = (tripId: string) => {
        router.push(`/contentMenu?tripId=${tripId}`);
    };

    // 사용자가 로그인된 후 API 호출
    useEffect(() => {
        if (!authLoading && user) {
            fetchTrips();
        }
    }, [authLoading, user]);

    // 날짜 포맷팅 함수
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '.').replace(/\s/g, '');
    };

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>여행 목록 - ODDIYA</title>
                    <meta name="description" content="나만의 여행 목록을 확인해보세요" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, maximum-scale=1"
                    />
                    <link rel="icon" href="/defaulticon.png" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00FFAA"
                        leftImage={{ src: '/headerimg/greenLeft.png', alt: 'Trip List' }}
                        rightImage={{ src: '/headerimg/greenRight.png', alt: 'Trip List' }}
                        title="여행 기록"
                        leftButton={{
                            text: "로그아웃",
                            onClick: handleLogout
                        }}
                        rightButton={{
                            text: "추가하기",
                            onClick: handleAddTrip
                        }}
                    />

                    <div className={styles.content}>
                        {/* 로딩 상태 */}
                        {loading && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.loadingSpinner}></div>
                                <p>여행 목록을 불러오는 중...</p>
                            </div>
                        )}

                        {/* 에러 상태 */}
                        {error && (
                            <div className={styles.errorContainer}>
                                <p>{error}</p>
                                <button onClick={fetchTrips} className={styles.retryButton}>
                                    다시 시도
                                </button>
                            </div>
                        )}

                        {/* 여행 목록이 0개일 때 */}
                        {(() => {
                            // console.log('🚗 Empty state check - loading:', loading, 'error:', error, 'trips:', trips, 'trips.length:', trips?.length);
                            // console.log('🚗 Empty conditions - !loading:', !loading, '!error:', !error, 'Array.isArray(trips):', Array.isArray(trips), 'trips.length === 0:', trips?.length === 0);
                            return !loading && !error && Array.isArray(trips) && trips.length === 0;
                        })() && (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyIcon}>✈️</div>
                                    <h3 className={styles.emptyTitle}>아직 여행이 없어요</h3>
                                    <p className={styles.emptyDescription}>첫 번째 여행을 추가해보세요!</p>
                                    <button
                                        className={styles.addTripButton}
                                        onClick={handleAddTrip}
                                    >
                                        여행 추가하기
                                    </button>
                                </div>
                            )}

                        {/* 여행 목록 */}
                        {(() => {
                            // console.log('🚗 Render check - loading:', loading, 'error:', error, 'trips:', trips, 'trips.length:', trips?.length);
                            // console.log('🚗 Conditions - !loading:', !loading, '!error:', !error, 'Array.isArray(trips):', Array.isArray(trips), 'trips.length > 0:', trips?.length > 0);
                            return !loading && !error && Array.isArray(trips) && trips.length > 0;
                        })() && (
                                <div
                                    className={styles.tripGrid}
                                >
                                    {trips.map((trip) => (
                                        <div
                                            key={trip.id}
                                            className={styles.tripCard}
                                            onClick={() => handleTripClick(trip.id)}
                                        >
                                            <div className={styles.cardImage}>
                                                {(() => {
                                                    const fallback = "/defaultpic.jpg";
                                                    const imageSrc =
                                                        typeof trip.image === "string" && /^https?:\/\//.test(trip.image)
                                                            ? trip.image
                                                            : fallback;
                                                    return (
                                                        <img
                                                            src={imageSrc}
                                                            alt={trip.tripName || trip.destinationCity || '기본 여행 이미지'}
                                                            className={styles.cardImageTag}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.cardContent}>
                                                <p className={styles.cardTitle}>{trip.tripName}/{trip.destinationCity}</p>

                                                <p className={styles.cardDateRange}>
                                                    {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default TripList;
