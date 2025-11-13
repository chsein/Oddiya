import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Header from "../components/Header";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/ContentList.module.css";
import { getContentsByRegion, ContentItem, addBasketItem, deleteBasketItem, BasketItemRequest, getBasket } from "../helpers/api";

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
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<number | null>(null); // 선택된 필터
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [showEndModal, setShowEndModal] = useState(false);
    const [initialStateLoaded, setInitialStateLoaded] = useState(false);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const isLoadingRef = useRef(false);
    const restoredScrollRef = useRef<number>(0);
    const hasRestoredScrollRef = useRef<boolean>(false);
    const savedPageRef = useRef<number>(0);
    const shouldRestorePagesRef = useRef<boolean>(false);

    // tripId와 regionName을 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;
    const safeRegionName = Array.isArray(regionName) ? regionName[0] : regionName;

    const stateStorageKey = useMemo(() => {
        if (!safeTripId) {
            return null;
        }
        return `contentListState_${safeTripId}_${safeRegionName || "all"}`;
    }, [safeTripId, safeRegionName]);

    const saveListState = useCallback(
        (partialState: { selectedFilter?: number | null; scrollLeft?: number; page?: number }) => {
            if (!stateStorageKey || typeof window === "undefined") {
                return;
            }
            try {
                const existingRaw = sessionStorage.getItem(stateStorageKey);
                const existing = existingRaw ? JSON.parse(existingRaw) : {};
                const nextState = { ...existing, ...partialState };
                sessionStorage.setItem(stateStorageKey, JSON.stringify(nextState));
            } catch (error) {
                console.error("Failed to save content list state:", error);
            }
        },
        [stateStorageKey]
    );

    // 최초 로드 시 이전 상태 복원
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        if (!stateStorageKey) {
            setInitialStateLoaded(true);
            return;
        }

        try {
            const storedRaw = sessionStorage.getItem(stateStorageKey);
            if (storedRaw) {
                const stored = JSON.parse(storedRaw);

                if ("selectedFilter" in stored) {
                    const storedFilter =
                        typeof stored.selectedFilter === "number" ? stored.selectedFilter : null;
                    setSelectedFilter(storedFilter);
                }

                if (typeof stored.scrollLeft === "number") {
                    restoredScrollRef.current = stored.scrollLeft;
                }

                if (typeof stored.page === "number" && stored.page > 0) {
                    savedPageRef.current = stored.page;
                    shouldRestorePagesRef.current = true;
                } else {
                    savedPageRef.current = 0;
                    shouldRestorePagesRef.current = false;
                }
            } else {
                savedPageRef.current = 0;
                shouldRestorePagesRef.current = false;
            }
        } catch (error) {
            console.error("Failed to restore content list state:", error);
        } finally {
            setInitialStateLoaded(true);
        }
    }, [stateStorageKey]);

    const fetchDestinations = useCallback(async (targetPage: number, reset: boolean = false) => {
        if (authLoading || !user) {
            return;
        }

        if (!safeRegionName) {
            setError('지역 정보가 없습니다.');
            setLoading(false);
            return;
        }

        if (isLoadingRef.current) {
            return;
        }
        console.log('👀 fetchDestinations called', { targetPage, isLoading: isLoadingRef.current });


        if (reset) {
            setHasMore(true);
            setDestinations([]);
            setShowEndModal(false);
        }

        try {
            isLoadingRef.current = true;
            if (targetPage === 0) {
                setLoading(true);
            } else {
                setIsFetchingMore(true);
            }
            setError(null);

            const response = await getContentsByRegion(
                safeRegionName,
                selectedFilter || undefined,
                targetPage
            );

            const newItems = response?.data?.content ?? [];
            const pageInfo = response?.data?.page;
            const isLastPage = pageInfo ? pageInfo.last : newItems.length === 0;

            setDestinations(prev => {
                if (reset || targetPage === 0) {
                    return newItems;
                }

                const existingIds = new Set(prev.map(item => item.id));
                const filtered = newItems.filter(item => !existingIds.has(item.id));
                return [...prev, ...filtered];
            });

            const shouldShowEndModal = isLastPage && (targetPage > 0 || newItems.length > 0);
            setHasMore(!isLastPage);
            setShowEndModal(shouldShowEndModal);
            setPage(targetPage);
        } catch (err) {
            console.error('Error fetching destinations:', err);

            if (targetPage === 0) {
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
            } else {
                console.error('추가 여행지 로드 실패:', err);
            }
        } finally {
            if (targetPage === 0) {
                setLoading(false);
            } else {
                setIsFetchingMore(false);
            }
            isLoadingRef.current = false;
        }
    }, [authLoading, user, safeRegionName, selectedFilter]);

    // 필터 또는 지역 변경 시 초기화 후 첫 페이지 로드
    useEffect(() => {
        if (!initialStateLoaded) {
            return;
        }

        if (!authLoading && user && safeRegionName) {
            fetchDestinations(0, true);
        }
    }, [authLoading, user, safeRegionName, selectedFilter, fetchDestinations, initialStateLoaded]);

    // 무한 스크롤 Intersection Observer 설정
    useEffect(() => {
        console.log("🟡 useEffect (observer setup) 실행됨");
        if (loading) {
            console.log("⏸ 로딩 중이라 observer 설정 안 함");
            return;
        }
        if (!hasMore) {
            console.log("🚫 hasMore=false, 더 이상 로드 안 함");
            return;
        }

        const sentinel = loadMoreRef.current;
        if (!sentinel) {
            console.log("❌ loadMoreRef.current 없음");
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    console.log("✅ entry.isIntersecting → fetchDestinations 호출");
                    fetchDestinations(page + 1);
                }
            },
            {
                root: gridRef.current, // ✅ 내부 스크롤 영역을 감시
                rootMargin: '0px 0px 200px 0px',
                threshold: 0.1,
            }
        );


        observer.observe(sentinel);
        console.log("🟢 observer.observe 실행 완료");

        return () => {
            observer.disconnect();
            console.log("🔴 observer 해제됨");
        };
    }, [page, hasMore, loading, fetchDestinations]);


    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) {
            return;
        }

        grid.style.overflowX = showEndModal ? 'hidden' : '';

        return () => {
            grid.style.overflowX = '';
        };
    }, [showEndModal]);


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
        saveListState({
            selectedFilter,
            scrollLeft: gridRef.current ? gridRef.current.scrollLeft : 0,
            page,
        });

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


    const getDisplayTitle = (title: string = ''): string => {
        if (!title) return '';
        return title.length > 15 ? `${title.slice(0, 15)}...` : title;
    };

    const handleFilterSelect = useCallback(
        (filterId: number | null) => {
            setSelectedFilter(filterId);
            saveListState({
                selectedFilter: filterId,
                scrollLeft: 0,
                page: 0,
            });
            if (gridRef.current) {
                gridRef.current.scrollLeft = 0;
            }
            savedPageRef.current = 0;
            shouldRestorePagesRef.current = false;
        },
        [saveListState]
    );

    // 스크롤 위치 복원
    useEffect(() => {
        if (!initialStateLoaded || loading) {
            return;
        }
        if (hasRestoredScrollRef.current) {
            return;
        }
        if (!gridRef.current) {
            return;
        }
        gridRef.current.scrollLeft = restoredScrollRef.current || 0;
        hasRestoredScrollRef.current = true;
    }, [initialStateLoaded, loading, destinations.length]);

    // 이전에 로드했던 추가 페이지 복원
    useEffect(() => {
        if (!initialStateLoaded || authLoading) {
            return;
        }
        if (!shouldRestorePagesRef.current) {
            return;
        }
        if (isLoadingRef.current) {
            return;
        }
        if (page < savedPageRef.current && hasMore) {
            fetchDestinations(page + 1);
        } else {
            shouldRestorePagesRef.current = false;
        }
    }, [initialStateLoaded, authLoading, page, hasMore, fetchDestinations]);

    // selectedFilter나 page가 변할 때 상태 저장 (사용자가 다른 경로로 이동했을 때를 대비)
    useEffect(() => {
        saveListState({
            selectedFilter,
            page,
        });
    }, [selectedFilter, page, saveListState]);

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
                    <link rel="icon" href="/defaulticon.png" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#FFE135"
                        leftImage={{ src: '/headerimg/yellowLeft.png', alt: 'Content List' }}
                        rightImage={{ src: '/headerimg/yellowRight.png', alt: 'Content List' }}
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
                                onClick={() => handleFilterSelect(null)}
                            >
                                전체
                            </button>
                            {CONTENT_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`${styles.filterButton} ${selectedFilter === type.id ? styles.active : ''}`}
                                    onClick={() => handleFilterSelect(type.id)}
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
                            <div className={styles.destinationGrid} ref={gridRef}>
                                {destinations.map((destination) => {
                                    if (!destination.photoUrl) {
                                        return null;
                                    }
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
                                                <h3 className={styles.cardTitle} title={destination.title}>
                                                    {getDisplayTitle(destination.title)}
                                                </h3>
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
                                {isFetchingMore && (
                                    <div className={styles.loadingCard}>
                                        <div className={`${styles.spinner} ${styles.spinnerSmall}`} />
                                        <span>여행지를 불러오는 중...</span>
                                    </div>
                                )}
                                <div
                                    ref={loadMoreRef}
                                    className={`${styles.loadMoreTrigger} ${!hasMore ? styles.hiddenTrigger : ''}`}
                                />
                            </div>
                        )}
                        {showEndModal && (
                            <>
                                <div
                                    className={styles.modalOverlay}
                                    onClick={() => setShowEndModal(false)}
                                />
                                <div className={styles.endModal}>
                                    <h3 className={styles.endModalTitle}>모든 여행지를 확인했어요!</h3>
                                    <p className={styles.endModalMessage}>
                                        새로운 여행지가 더 이상 없어요. 다른 지역이나 카테고리를 선택해볼까요?
                                    </p>
                                    <button
                                        className={styles.endModalButton}
                                        onClick={() => setShowEndModal(false)}
                                    >
                                        닫기
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default ContentList;
