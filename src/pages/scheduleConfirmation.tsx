import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import NaverMap, { NaverMapRef } from "../components/NaverMap";
import styles from "../styles/ScheduleConfirmation.module.css";
import { getItinerary, generateItinerary, getBasket, getPlaceDetail } from "../helpers/api";

const ScheduleConfirmation: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // API 상태 관리
    const [itinerary, setItinerary] = useState<any>(null);
    const [loading, setLoading] = useState(true); // 초기값을 true로 변경
    const [error, setError] = useState<string | null>(null);
    const [placeDetails, setPlaceDetails] = useState<{ [key: string]: any }>({});

    // 날짜 선택 상태 (인덱스 기반)
    const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);

    // 지도 ref
    const mapRef = useRef<NaverMapRef>(null);

    const handleBack = () => {
        if (!safeTripId) {
            console.error('TripId가 없습니다.');
            // tripId가 없으면 tripList로 이동
            router.push('/tripList');
            return;
        }
        router.push(`/contentMenu?tripId=${safeTripId}`);
    };

    // 초기 일정 로드
    useEffect(() => {
        const loadItinerary = async () => {
            if (!safeTripId) return;

            try {
                setLoading(true);
                const data = await getItinerary(safeTripId);
                console.log('✅ 일정 로드:', data);
                setItinerary(data);

                // 일정이 있으면 상세 정보도 로드
                if (data?.scheduleItems && Array.isArray(data.scheduleItems)) {
                    await loadPlaceDetails(data.scheduleItems);

                    // 첫 번째 날짜를 기본 선택 (인덱스 0)
                    setSelectedDateIndex(0);
                }
            } catch (err: any) {
                console.error('❌ 일정 로드 실패:', err);
                if (err.response?.status === 404) {
                    setError('일정이 없습니다. 재생성 버튼을 눌러주세요.');
                } else {
                    setError('일정을 불러오는데 실패했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };

        loadItinerary();
    }, [safeTripId]);

    // 장소 상세 정보 로드
    const loadPlaceDetails = async (scheduleItems: any[]) => {
        try {
            const placeIds = scheduleItems
                .filter(item => item.placeId)
                .map(item => item.placeId);

            console.log('🏢 로드할 placeIds:', placeIds);

            const detailsPromises = placeIds.map(async (placeId) => {
                try {
                    const detail = await getPlaceDetail(placeId);
                    return { placeId, detail };
                } catch (error) {
                    console.error(`❌ 장소 상세 정보 로드 실패 (${placeId}):`, error);
                    return { placeId, detail: null };
                }
            });

            const detailsResults = await Promise.all(detailsPromises);
            const detailsMap: { [key: string]: any } = {};

            detailsResults.forEach(({ placeId, detail }) => {
                if (detail) {
                    detailsMap[placeId] = detail;
                }
            });

            console.log('✅ 장소 상세 정보 로드 완료:', detailsMap);
            setPlaceDetails(detailsMap);
        } catch (error) {
            console.error('❌ 장소 상세 정보 로드 실패:', error);
        }
    };

    // 재생성 핸들러
    const handleRegenerate = async () => {
        if (!safeTripId) return;

        try {
            setLoading(true);
            setError(null);

            console.log('🔄 일정 재생성 시작');

            // 1. 장바구니에서 placeId 목록 가져오기
            const basketItems = await getBasket(safeTripId);
            console.log('🛒 장바구니 항목 (전체):', basketItems);
            console.log('🛒 장바구니 항목 개수:', basketItems.length);

            // 2. placeId만 추출
            const placeIds = basketItems
                .filter(item => {
                    console.log('🔍 장바구니 항목 필터링:', {
                        hasPlaceId: !!item.placeId,
                        placeId: item.placeId
                    });
                    return !!item.placeId;
                })
                .map(item => {
                    const placeId = item.placeId;
                    console.log('✅ placeId 추출:', placeId);
                    return placeId;
                });

            console.log('📝 추출된 placeIds:', placeIds);
            console.log('📝 placeIds 개수:', placeIds.length);

            if (placeIds.length === 0) {
                setError('일정을 생성할 여행지가 없습니다.');
                return;
            }

            // 3. 일정 재생성
            await generateItinerary(safeTripId, placeIds);
            console.log('✅ 일정 재생성됨');

            // 4. 재생성된 일정 불러오기
            try {
                const data = await getItinerary(safeTripId);
                console.log('✅ 재생성된 일정:', data);
                setItinerary(data);

                // 재생성된 일정의 상세 정보도 로드
                if (data?.scheduleItems && Array.isArray(data.scheduleItems)) {
                    await loadPlaceDetails(data.scheduleItems);

                    // 첫 번째 날짜를 기본 선택 (인덱스 0)
                    setSelectedDateIndex(0);
                }
            } catch (loadError: any) {
                console.error('❌ 재생성된 일정 불러오기 실패:', loadError);
                // 일정은 생성되었지만 불러오기 실패한 경우
                setError('일정이 재생성되었지만 불러오는데 실패했습니다. 새로고침 해주세요.');
            }
        } catch (err: any) {
            console.error('❌ 일정 재생성 실패:', err);
            setError('일정을 재생성하는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (destinationId: number) => {
        router.push(`/contentDetail?tripId=${safeTripId}&destinationId=${destinationId}&from=schedule`);
    };

    const handleScheduleCardClick = (activityId: number) => {
        // 지도에서 해당 마커의 정보창 열기
        if (mapRef.current) {
            mapRef.current.openInfoWindow(activityId);
        }
    };

    // 날짜 네비게이션 함수들
    const handlePreviousDate = () => {
        if (selectedDateIndex > 0) {
            setSelectedDateIndex(selectedDateIndex - 1);
        }
    };

    const handleNextDate = () => {
        if (selectedDateIndex < dayKeys.length - 1) {
            setSelectedDateIndex(selectedDateIndex + 1);
        }
    };


    // API에서 받은 일정 데이터 사용
    console.log('📋 현재 itinerary:', itinerary);
    console.log('📋 itinerary 타입:', typeof itinerary);

    // API 응답 구조에 따라 데이터 추출
    const activities = itinerary?.scheduleItems || itinerary?.scheduledItems || itinerary?.schedules || itinerary?.itinerary || [];

    // 일정이 있는지 확인
    const hasScheduleItems = Array.isArray(activities) && activities.length > 0;

    // startDate부터 날짜 배열 생성
    const startDate = itinerary?.startDate;
    console.log('📅 startDate:', startDate);

    // 날짜 포맷팅 함수 (8월 23일 형식)
    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일`;
    };

    // startDate를 기준으로 날짜별로 그룹화
    const groupedByDayNumber: { [key: string]: any[] } = {};
    const dateMap: { [key: string]: string } = {}; // dayKey -> 실제 날짜 문자열 매핑

    if (Array.isArray(activities) && startDate) {
        activities.forEach((activity: any) => {
            const dayNumber = activity.dayNumber || activity.day;
            const dayKey = `day${dayNumber}`;

            if (!groupedByDayNumber[dayKey]) {
                groupedByDayNumber[dayKey] = [];

                // startDate를 기준으로 dayNumber만큼 더해서 실제 날짜 계산
                const startDateObj = new Date(startDate);
                const actualDate = new Date(startDateObj);
                actualDate.setDate(startDateObj.getDate() + (dayNumber - 1));
                dateMap[dayKey] = formatDate(actualDate.toISOString().split('T')[0]);
            }
            groupedByDayNumber[dayKey].push(activity);
        });
    }

    console.log('📅 groupedByDayNumber:', groupedByDayNumber);
    console.log('📅 dateMap:', dateMap);

    // dayNumber를 기준으로 정렬된 키 배열 생성
    const dayKeys = Object.keys(groupedByDayNumber).sort((a, b) => {
        const dayA = parseInt(a.replace('day', ''));
        const dayB = parseInt(b.replace('day', ''));
        return dayA - dayB;
    });

    console.log('📅 dayKeys:', dayKeys);

    // 선택된 dayNumber의 일정만 필터링
    const selectedDayKey = dayKeys[selectedDateIndex] || '';
    const selectedDateActivities = selectedDayKey ? (groupedByDayNumber[selectedDayKey] || []) : [];

    // 날짜 표시 텍스트 계산 (실제 날짜 사용)
    const selectedDateDisplay = selectedDayKey ? (dateMap[selectedDayKey] || '') : '';

    // 이전/다음 날짜 표시 텍스트 계산
    const prevDayKey = selectedDateIndex > 0 ? dayKeys[selectedDateIndex - 1] : '';
    const nextDayKey = selectedDateIndex < dayKeys.length - 1 ? dayKeys[selectedDateIndex + 1] : '';
    const prevDateDisplay = prevDayKey ? (dateMap[prevDayKey] || '') : '';
    const nextDateDisplay = nextDayKey ? (dateMap[nextDayKey] || '') : '';

    console.log('📅 groupedByDayNumber:', groupedByDayNumber);
    console.log('📅 날짜 키들:', dayKeys);
    console.log('📅 선택된 날짜 인덱스:', selectedDateIndex);
    console.log('📅 선택된 날짜 표시:', selectedDateDisplay);
    console.log('📅 이전 날짜:', prevDateDisplay);
    console.log('📅 다음 날짜:', nextDateDisplay);
    console.log('📅 선택된 날짜 일정:', selectedDateActivities);

    // 지도 마커 데이터 (선택된 날짜의 일정만)
    let mapMarkers = selectedDateActivities.map((activity: any) => {
        const placeDetail = placeDetails[activity.placeId];
        return {
            id: activity.id || activity.contentId || '',
            title: placeDetail?.title || activity.title || activity.placeName || activity.name || '',
            category: activity.category || '',
            lat: placeDetail?.latitude || activity.latitude || activity.lat || 33.4996, // 제주도 기본 좌표
            lng: placeDetail?.longitude || activity.longitude || activity.lng || 126.5312
        };
    });

    // 일정이 없으면 제주도 기본 마커 추가
    if (mapMarkers.length === 0) {
        mapMarkers = [{
            id: 'default',
            title: '제주도',
            category: '기본',
            lat: 33.4996,
            lng: 126.5312
        }];
    }

    console.log('🗺️ 지도 마커 데이터:', mapMarkers);

    return (
        <>
            <Head>
                <title>일정 확인 - ODDIYA</title>
                <meta name="description" content="여행 일정을 확인하세요" />
            </Head>

            <div className={styles.container}>
                <Header
                    backgroundColor="#00EEFF"
                    leftIcons={['🛟', '🧴']}
                    rightIcons={['🏮', '🏄', '🏐']}
                    title="일정을 확인 하세요!"
                    subtitle="제주도 서귀포시"
                    leftButton={{
                        text: "돌아가기",
                        onClick: handleBack
                    }}
                    rightButton={hasScheduleItems ? {
                        text: loading ? "재생성 중..." : "재생성하기",
                        onClick: handleRegenerate,
                        disabled: loading
                    } : undefined}
                />

                <div className={styles.content}>
                    <div className={styles.mapSection}>
                        <div className={styles.mapContainer}>
                            <NaverMap
                                ref={mapRef}
                                width="100%"
                                height="100%"
                                markers={mapMarkers}
                            />
                        </div>
                    </div>


                    <div className={styles.scheduleSection}>
                        {loading && (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <p>일정을 불러오는 중...</p>
                            </div>
                        )}

                        {error && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
                                <p>{error}</p>
                            </div>
                        )}

                        {!loading && !error && dayKeys.length > 0 && (
                            <div className={styles.scheduleList}>
                                {/* 날짜 네비게이션 UI */}
                                <div className={styles.dateNavigation}>
                                    <div
                                        className={`${styles.dateNavItem} ${selectedDateIndex === 0 ? styles.disabled : ''}`}
                                        onClick={selectedDateIndex > 0 ? handlePreviousDate : undefined}
                                    >
                                        어제
                                    </div>
                                    <div className={styles.currentDate}>
                                        {selectedDateDisplay}
                                    </div>
                                    <div
                                        className={`${styles.dateNavItem} ${selectedDateIndex === dayKeys.length - 1 ? styles.disabled : ''}`}
                                        onClick={selectedDateIndex < dayKeys.length - 1 ? handleNextDate : undefined}
                                    >
                                        내일
                                    </div>
                                </div>

                                {/* 선택된 날짜의 일정 표시 */}
                                <div className={styles.selectedDateActivities}>
                                    <div className={styles.dayActivities}>
                                        {selectedDateActivities.map((activity: any, index: number) => {
                                            const placeDetail = placeDetails[activity.placeId];
                                            return (
                                                <div
                                                    key={activity.id || activity.contentId || index}
                                                    className={styles.scheduleCard}
                                                    onClick={() => handleScheduleCardClick(activity.id)}
                                                >
                                                    <div className={styles.cardContent}>
                                                        <div className={styles.activityTitle}>
                                                            {placeDetail?.title || activity.title || activity.placeName || activity.contentName || '제목 없음'}
                                                        </div>
                                                        {placeDetail?.address && (
                                                            <div className={styles.activityAddress}>
                                                                📍 {placeDetail.address}
                                                            </div>
                                                        )}
                                                        {activity.order && (
                                                            <div className={styles.activityOrder}>
                                                                순서: {activity.order}
                                                            </div>
                                                        )}
                                                        {activity.description && (
                                                            <div className={styles.activityDescription}>
                                                                {activity.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        className={styles.detailsButton}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewDetails(activity.placeId || activity.contentId || activity.id);
                                                        }}
                                                    >
                                                        상세보기
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!loading && !error && dayKeys.length === 0 && (
                            <div className={styles.emptyScheduleContainer}>
                                <div className={styles.emptyScheduleContent}>
                                    <div className={styles.emptyScheduleIcon}>📅</div>
                                    <h3 className={styles.emptyScheduleTitle}>일정이 없습니다</h3>
                                    <p className={styles.emptyScheduleDescription}>
                                        AI를 활용해서 여행 일정을 생성해보세요!
                                    </p>
                                    <button
                                        className={styles.generateScheduleButton}
                                        onClick={handleRegenerate}
                                        disabled={loading}
                                    >
                                        {loading ? '생성 중...' : '🤖 AI를 활용해서 일정을 생성하기'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ScheduleConfirmation;
