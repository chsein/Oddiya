import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/ContentList.module.css";
import { getContentsByRegion, getContentsByType, ContentItem, addBasketItem, deleteBasketItem, BasketItemRequest, getBasket } from "../helpers/api";

// 컨텐츠 타입 매핑
const CONTENT_TYPES = [
    { id: 12, name: '관광지' },
    { id: 14, name: '문화시설' },
    { id: 15, name: '축제/공연' },
    { id: 28, name: '레포츠' },
    { id: 32, name: '숙박' },
    { id: 38, name: '쇼핑' },
    { id: 39, name: '음식점' },
];

const ContentList: NextPage = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { tripId, regionName } = router.query;
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
    const [destinations, setDestinations] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<number | null>(null); // 선택된 필터

    // tripId와 regionName을 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;
    const safeRegionName = Array.isArray(regionName) ? regionName[0] : regionName;

    // 사용자 로그인 후 API에서 여행지 데이터 불러오기
    useEffect(() => {
        const fetchDestinations = async () => {
            // 인증 로딩 중이거나 user가 없으면 대기
            if (authLoading || !user) {
                return;
            }

            if (!safeRegionName && !selectedFilter) {
                setError('지역 정보가 없습니다.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // 지역별 API 호출 (필터가 있으면 contentTypeId 파라미터 추가)
                const response = await getContentsByRegion(safeRegionName!, selectedFilter || undefined);

                console.log('=== API 응답 전체 ===');
                console.log(response);

                // 안전하게 데이터 접근
                if (response && response.data) {
                    if (response.success && response.data.content) {
                        setDestinations(response.data.content);
                        console.log('=== 설정된 destinations ===');
                        console.log(response.data.content);
                    } else {
                        console.error('API 응답이 성공하지 않았거나 content가 없습니다:', response);
                        setError('데이터를 불러오는데 실패했습니다.');
                    }
                } else {
                    console.error('response 또는 response.data가 없습니다:', response);
                    setError('데이터를 불러오는데 실패했습니다.');
                }
            } catch (err) {
                console.error('Error fetching destinations:', err);

                // HTML 응답이 온 경우 (ngrok 브라우저 경고 등)
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as any;
                    if (axiosError.response && typeof axiosError.response.data === 'string' &&
                        axiosError.response.data.includes('<!DOCTYPE html>')) {
                        setError('API 서버에 연결할 수 없습니다. ngrok 터널을 확인해주세요.');
                    } else {
                        setError(`API 오류: ${axiosError.response?.status} - ${axiosError.message}`);
                    }
                } else {
                    setError('데이터를 불러오는데 실패했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDestinations();
    }, [authLoading, user, safeRegionName, selectedFilter]);

    // 테스트용: 강제로 선택 상태 설정 (나중에 제거)
    useEffect(() => {
        console.log('Current selectedDestinations state:', selectedDestinations);
    }, [selectedDestinations]);

    useEffect(() => {
        // 서버에서 이미 선택된 여행지 불러오기
        const loadBasketItems = async () => {
            // 인증 로딩 중이거나 user가 없으면 대기
            if (authLoading || !user || !safeTripId) {
                return;
            }

            try {
                console.log('=== LOADING FROM SERVER BASKET ===');
                console.log('TripId:', safeTripId);

                const basketItems = await getBasket(safeTripId);
                console.log('✅ 장바구니 항목:', basketItems);

                // placeId들을 selectedDestinations에 설정
                const selectedIds = basketItems.map(item => item.placeId);
                console.log('Selected IDs from basket:', selectedIds);

                setSelectedDestinations(selectedIds);
            } catch (error) {
                console.error('❌ 장바구니 불러오기 실패:', error);
            }
        };

        loadBasketItems();
    }, [authLoading, user, safeTripId]);

    // 페이지 포커스 시 서버에서 선택 상태 다시 로드
    useEffect(() => {
        const handleFocus = async () => {
            if (safeTripId && user && !authLoading) {
                try {
                    const basketItems = await getBasket(safeTripId);
                    const selectedIds = basketItems.map(item => item.placeId);
                    console.log('🔄 포커스 시 장바구니 상태 새로고침:', selectedIds);
                    setSelectedDestinations(selectedIds);
                } catch (error) {
                    console.error('❌ 포커스 시 장바구니 불러오기 실패:', error);
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [safeTripId, user, authLoading]);

    // 라우트 변경 시 서버에서 선택 상태 다시 로드
    useEffect(() => {
        const handleRouteChange = async () => {
            if (safeTripId && user && !authLoading) {
                try {
                    const basketItems = await getBasket(safeTripId);
                    const selectedIds = basketItems.map(item => item.placeId);
                    console.log('🔄 라우트 변경 시 장바구니 상태 새로고침:', selectedIds);
                    setSelectedDestinations(selectedIds);
                } catch (error) {
                    console.error('❌ 라우트 변경 시 장바구니 불러오기 실패:', error);
                }
            }
        };

        router.events.on('routeChangeComplete', handleRouteChange);
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [safeTripId, user, authLoading, router.events]);

    const handleBack = () => {
        router.push(`/contentMenu?tripId=${safeTripId}`);
    };

    // 완료 버튼 제거 - 체크박스 클릭 시 즉시 서버에 저장하므로 불필요

    const handleDestinationClick = (destinationId: string) => {
        router.push(`/contentDetail?tripId=${safeTripId}&destinationId=${destinationId}&regionName=${safeRegionName}`);
    };

    const handleCheckboxClick = async (e: React.MouseEvent, destinationId: string) => {
        e.stopPropagation(); // 카드 클릭 이벤트 방지

        if (!safeTripId) {
            console.error('TripId가 없습니다.');
            return;
        }

        console.log('=== CHECKBOX CLICKED ===');
        console.log('Destination ID:', destinationId);
        console.log('SafeTripId:', safeTripId);

        const isSelected = selectedDestinations.includes(destinationId);
        console.log('Is currently selected:', isSelected);

        try {
            if (isSelected) {
                // 선택 해제 - 서버에서 삭제
                await deleteBasketItem(safeTripId, destinationId);
                setSelectedDestinations(prev => prev.filter(id => id !== destinationId));
                console.log('✅ 장바구니에서 제거됨:', destinationId);
            } else {
                // 선택 추가 - 서버에 추가
                const destination = destinations.find(d => d.id === destinationId);
                if (destination) {
                    const basketItem: BasketItemRequest = {
                        placeId: destination.id,
                        note: ''
                    };
                    await addBasketItem(safeTripId, basketItem);
                    setSelectedDestinations(prev => [...prev, destinationId]);
                    console.log('✅ 장바구니에 추가됨:', destination.title);
                }
            }
        } catch (error) {
            console.error('❌ 장바구니 업데이트 실패:', error);
            alert('장바구니 업데이트에 실패했습니다. 다시 시도해주세요.');
        }
    };


    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>여행지 선택 - ODDIYA</title>
                    <meta name="description" content="가고 싶은 곳을 선택해보세요" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, maximum-scale=1"
                    />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#FFE135"
                        leftIcons={['🛟', '🧴']}
                        rightIcons={['🏮', '🏄', '🏐']}
                        title="가고 싶은 곳을 선택해보세요!"
                        leftButton={{
                            text: "돌아가기",
                            onClick: handleBack
                        }}
                    />

                    <div className={styles.content}>
                        {/* 필터 섹션 */}
                        <div className={styles.filterContainer}>
                            <button
                                className={`${styles.filterButton} ${selectedFilter === null ? styles.active : ''}`}
                                onClick={() => setSelectedFilter(null)}
                            >
                                전체
                            </button>
                            {CONTENT_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`${styles.filterButton} ${selectedFilter === type.id ? styles.active : ''}`}
                                    onClick={() => setSelectedFilter(type.id)}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner}></div>
                                <p>여행지를 불러오는 중...</p>
                            </div>
                        ) : error ? (
                            <div className={styles.errorContainer}>
                                <p className={styles.errorMessage}>{error}</p>
                                <button
                                    className={styles.retryButton}
                                    onClick={() => window.location.reload()}
                                >
                                    다시 시도
                                </button>
                            </div>
                        ) : (
                            <div className={styles.destinationGrid}>
                                {destinations.map((destination) => {
                                    // console.log('=== 개별 여행지 정보 ===');
                                    // console.log('ID:', destination.contentId);
                                    // console.log('제목:', destination.title);
                                    // console.log('이미지 URL:', destination.photoUrl);
                                    // console.log('평점:', destination.rating);
                                    // console.log('리뷰 수:', destination.ratingCount);
                                    // console.log('주소:', destination.address);
                                    // console.log('-------------------');

                                    return (
                                        <div
                                            key={destination.contentId}
                                            className={`${styles.destinationCard} ${selectedDestinations.includes(destination.id) ? styles.selectedCard : ''}`}
                                            onClick={() => handleDestinationClick(destination.id)}
                                        >
                                            <div className={styles.cardImage}>
                                                <img
                                                    src={destination.photoUrl}
                                                    alt={destination.title}
                                                    className={styles.destinationImage}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                <div
                                                    className={`${styles.checkbox} ${selectedDestinations.includes(destination.id) ? styles.checked : ''}`}
                                                    onClick={(e) => handleCheckboxClick(e, destination.id)}
                                                >
                                                    {selectedDestinations.includes(destination.id) && '✓'}
                                                </div>
                                            </div>
                                            <div className={styles.cardContent}>
                                                <h3 className={styles.cardTitle}>{destination.title}</h3>
                                                <div className={styles.ratingContainer}>
                                                    <span className={styles.rating}>
                                                        ⭐ {(destination.rating || 0).toFixed(1)}
                                                    </span>
                                                    <span className={styles.ratingCount}>
                                                        ({(destination.ratingCount || 0)}개 리뷰)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default ContentList;
