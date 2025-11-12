import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Header from "../components/Header";
import styles from "../styles/ContentDetail.module.css";
import { getContentDetail, ContentDetail as ContentDetailType, deleteBasketItem } from "../helpers/api";

type CategoryKey =
    | "lodging"
    | "culture"
    | "festival"
    | "food"
    | "shopping"
    | "sports"
    | "tourist";

interface CategoryConfig {
    label: string;
    contentTypeIds: number[];
    friendlyFields: string[];
    coreFields: string[];
}

const CATEGORY_CONFIGS: Record<CategoryKey, CategoryConfig> = {
    lodging: {
        label: "숙박",
        contentTypeIds: [32],
        friendlyFields: ["chkcooking", "bicycle", "barbecue", "campfire", "pickup"],
        coreFields: ["checkintime", "checkouttime", "reservationurl"],
    },
    culture: {
        label: "문화시설",
        contentTypeIds: [14],
        friendlyFields: ["chkbabycarriageculture", "spendtime", "discountinfo"],
        coreFields: ["usefee", "usetimeculture", "restdateculture"],
    },
    festival: {
        label: "축제",
        contentTypeIds: [15],
        friendlyFields: ["subevent", "agelimit", "playtime"],
        coreFields: ["eventstartdate", "eventenddate", "eventplace"],
    },
    food: {
        label: "음식점",
        contentTypeIds: [39],
        friendlyFields: ["kidsfacility", "menu_for_children", "outdoor_seating"],
        coreFields: ["firstmenu", "opentimefood", "restdatefood"],
    },
    shopping: {
        label: "쇼핑",
        contentTypeIds: [38],
        friendlyFields: ["chkbabycarriageshopping", "restroom", "culturecenter"],
        coreFields: ["opentime", "restdateshopping"],
    },
    sports: {
        label: "스포츠",
        contentTypeIds: [28],
        friendlyFields: ["expagerangeleports", "chkbabycarriageleports"],
        coreFields: ["openperiod", "usetimeleports"],
    },
    tourist: {
        label: "관광지",
        contentTypeIds: [12],
        friendlyFields: ["chkbabycarriage", "heritage1", "heritage2", "heritage3"],
        coreFields: ["opendate", "restdate", "usetime"],
    },
};

const FIELD_LABELS: Record<string, string> = {
    chkcooking: "취사 가능 여부",
    bicycle: "자전거 대여",
    barbecue: "바비큐 시설",
    campfire: "캠프파이어",
    pickup: "픽업 서비스",
    checkintime: "체크인 시간",
    checkouttime: "체크아웃 시간",
    reservationurl: "예약 링크",
    chkbabycarriageculture: "유모차 대여 여부",
    spendtime: "체험 소요 시간",
    discountinfo: "할인 정보",
    usefee: "이용 요금",
    usetimeculture: "이용 시간",
    restdateculture: "휴무일",
    subevent: "부대 행사",
    agelimit: "연령 제한",
    playtime: "공연 시간",
    eventstartdate: "행사 시작일",
    eventenddate: "행사 종료일",
    eventplace: "행사 장소",
    kidsfacility: "키즈 시설",
    menu_for_children: "어린이 메뉴",
    outdoor_seating: "야외 좌석",
    firstmenu: "대표 메뉴",
    opentimefood: "영업 시간",
    restdatefood: "휴무일",
    chkbabycarriageshopping: "유모차 대여",
    restroom: "화장실",
    culturecenter: "문화센터/문화공간",
    opentime: "영업 시간",
    restdateshopping: "휴무일",
    expagerangeleports: "체험 가능 연령",
    chkbabycarriageleports: "유모차 대여",
    openperiod: "운영 기간",
    usetimeleports: "이용 시간",
    chkbabycarriage: "유모차 대여",
    heritage1: "세계문화유산",
    heritage2: "세계자연유산",
    heritage3: "세계기록유산",
    opendate: "개장일",
    restdate: "휴무일",
    usetime: "이용 시간",
};

const URL_FIELD_KEYS = new Set(["reservationurl"]);

const safeParseJSON = (value: string) => {
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
};

const normalizeDetailData = (data: any): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    if (!data) {
        return result;
    }

    const handleValue = (key: string, value: unknown) => {
        if (value === null || value === undefined) return;

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) {
                result[key] = trimmed;
            }
            return;
        }

        if (Array.isArray(value)) {
            const joined = value
                .map((item) => {
                    if (typeof item === "string") return item.trim();
                    if (typeof item === "number") return item.toString();
                    if (item && typeof item === "object") {
                        return Object.values(item)
                            .filter(Boolean)
                            .join(", ");
                    }
                    return "";
                })
                .filter(Boolean)
                .join(", ");

            if (joined) {
                result[key] = joined;
            }
            return;
        }

        if (typeof value === "object") {
            const nested = Object.values(value as Record<string, unknown>)
                .filter(Boolean)
                .map((item) => {
                    if (typeof item === "string") return item.trim();
                    if (typeof item === "number") return item.toString();
                    if (item && typeof item === "object") {
                        return Object.values(item)
                            .filter(Boolean)
                            .join(", ");
                    }
                    return "";
                })
                .filter(Boolean)
                .join(", ");

            if (nested) {
                result[key] = nested;
            }
            return;
        }

        result[key] = value;
    };

    if (typeof data === "string") {
        const parsed = safeParseJSON(data);
        if (parsed) {
            return normalizeDetailData(parsed);
        }
        return result;
    }

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (typeof item === "string") {
                const parsed = safeParseJSON(item);
                if (parsed) {
                    Object.assign(result, normalizeDetailData(parsed));
                }
            } else if (item && typeof item === "object") {
                Object.entries(item).forEach(([key, value]) => {
                    if (key && !(key in result)) {
                        handleValue(key, value);
                    }
                });
            } else if (item !== null && item !== undefined) {
                result[`item_${index}`] = item;
            }
        });
        return result;
    }

    if (typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
            handleValue(key, value);
        });
    }

    return result;
};

const getFieldLabel = (key: string) => FIELD_LABELS[key] ?? key;

const extractFieldValue = (
    key: string,
    introData: Record<string, unknown>,
    infoData: Record<string, unknown>
): string | null => {
    const rawValue = introData[key] ?? infoData[key];

    if (rawValue === null || rawValue === undefined) {
        return null;
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof rawValue === "number") {
        return rawValue.toString();
    }

    if (Array.isArray(rawValue)) {
        const joined = rawValue
            .map((item) => (item && typeof item === "object" ? Object.values(item).join(", ") : String(item)))
            .filter(Boolean)
            .join(", ");
        return joined || null;
    }

    if (typeof rawValue === "object") {
        const joined = Object.values(rawValue as Record<string, unknown>)
            .filter(Boolean)
            .map((item) => String(item))
            .join(", ");
        return joined || null;
    }

    return String(rawValue);
};

const DATE_MATCH_REGEX = /(\d{4})[.\-\/]?(0[1-9]|1[0-2])[.\-\/]?(0[1-9]|[12][0-9]|3[01])/;
const DATE_REPLACE_REGEX = /(\d{4})[.\-\/]?(0[1-9]|1[0-2])[.\-\/]?(0[1-9]|[12][0-9]|3[01])/g;

const shouldFormatAsDate = (key: string, rawValue: string) => {
    const lowered = key.toLowerCase();
    return lowered.includes("date") || lowered.includes("day") || DATE_MATCH_REGEX.test(rawValue);
};

const formatDateString = (value: string) => {
    if (value.includes("년") && value.includes("월")) {
        return value;
    }

    return value.replace(DATE_REPLACE_REGEX, (_, year, month, day) => {
        return `${year}년 ${month}월 ${day}일`;
    });
};

const formatFieldValue = (key: string, value: string) => {
    if (!value) return null;

    let displayValue = value.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");

    if (shouldFormatAsDate(key, value)) {
        displayValue = formatDateString(displayValue);
    }

    if (URL_FIELD_KEYS.has(key)) {
        const href = value.startsWith("http") ? value : `https://${value}`;
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={styles.detailFieldLink}>
                {displayValue}
            </a>
        );
    }

    return <span className={styles.detailFieldValueText}>{displayValue}</span>;
};

const findCategoryByContentType = (contentTypeId?: string | number | null): CategoryConfig | null => {
    if (!contentTypeId) return null;
    const numericId = typeof contentTypeId === "string" ? Number(contentTypeId) : contentTypeId;

    const matchedEntry = Object.values(CATEGORY_CONFIGS).find((config) =>
        config.contentTypeIds.includes(numericId)
    );

    return matchedEntry ?? null;
};

const ContentDetail: NextPage = () => {
    const router = useRouter();
    const { tripId, destinationId, regionName, from } = router.query;
    const [destination, setDestination] = useState<ContentDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showDetailModal, setShowDetailModal] = useState<{ title: string; content: ReactNode } | null>(null);

    // tripId, destinationId, regionName을 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;
    const safeDestinationId = Array.isArray(destinationId) ? destinationId[0] : destinationId;
    const safeRegionName = Array.isArray(regionName) ? regionName[0] : regionName;

    // API에서 여행지 상세 정보 불러오기
    useEffect(() => {
        const fetchDestinationDetail = async () => {
            if (!safeDestinationId) {
                setError('여행지 ID가 없습니다.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await getContentDetail(safeDestinationId);

                console.log('=== ContentDetail API 응답 전체 ===');
                console.log(response);
                console.log('=== ContentDetail data ===');
                console.log(response.data);

                if (response.success) {
                    const dest = response.data;
                    setDestination(dest);

                } else {
                    setError('데이터를 불러오는데 실패했습니다.');
                }
            } catch (err) {
                console.error('Error fetching destination detail:', err);
                console.error('Error details:', err);

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

        fetchDestinationDetail();
    }, [safeDestinationId]);

    // from 파라미터 안전하게 처리
    const safeFrom = Array.isArray(from) ? from[0] : from;
    const isFromCollection = safeFrom === 'collection';
    const isFromSchedule = safeFrom === 'schedule';

    const handleBack = () => {
        if (isFromSchedule) {
            // scheduleConfirmation에서 왔으면 scheduleConfirmation으로 돌아가기
            router.push(`/scheduleConfirmation?tripId=${safeTripId}`);
        } else if (isFromCollection) {
            // collectionList에서 왔으면 collectionList로 돌아가기
            router.push(`/collectionList?tripId=${safeTripId}`);
        } else if (safeRegionName) {
            router.push(`/contentList?tripId=${safeTripId}&regionName=${safeRegionName}`);
        } else {
            router.push(`/contentList?tripId=${safeTripId}`);
        }
    };

    // 삭제 핸들러
    const handleDelete = async () => {
        if (!safeTripId || !safeDestinationId) {
            console.error('TripId 또는 DestinationId가 없습니다.');
            return;
        }

        const confirmDelete = confirm('이 여행지를 장바구니에서 삭제하시겠습니까?');
        if (!confirmDelete) return;

        try {
            await deleteBasketItem(safeTripId, safeDestinationId);
            console.log(`✅ 장바구니에서 삭제됨: ${safeDestinationId}`);

            // 목록으로 돌아가기
            router.push(`/collectionList?tripId=${safeTripId}`);
        } catch (error) {
            console.error('❌ 장바구니 항목 삭제 실패:', error);
            alert('장바구니에서 항목을 삭제하는데 실패했습니다.');
        }
    };

    const renderDetailContent = () => {
        if (!destination) {
            return <div className={styles.detailEmpty}>추가 상세 정보가 없습니다.</div>;
        }

        const categoryConfig = findCategoryByContentType(destination.contentTypeId);
        const introData = normalizeDetailData(destination.detailIntro);
        const infoData = normalizeDetailData(destination.detailInfoJson);

        const buildFieldItems = (fields: string[]) =>
            fields
                .map((fieldKey) => {
                    const value = extractFieldValue(fieldKey, introData, infoData);
                    if (!value) return null;

                    return (
                        <div key={fieldKey} className={styles.detailField}>
                            <div className={styles.detailFieldLabel}>{getFieldLabel(fieldKey)}</div>
                            <div className={styles.detailFieldValue}>{formatFieldValue(fieldKey, value)}</div>
                        </div>
                    );
                })
                .filter(Boolean);

        const combinedFieldItems = categoryConfig
            ? buildFieldItems(Array.from(new Set([...categoryConfig.coreFields, ...categoryConfig.friendlyFields])))
            : [];

        const introSummary =
            typeof destination.detailIntro === "string" && destination.detailIntro.trim().length > 0
                ? destination.detailIntro.trim()
                : null;

        const fallbackItems = !categoryConfig
            ? Object.entries(introData)
                .concat(Object.entries(infoData))
                .reduce<Record<string, string>>((acc, [key, value]) => {
                    if (acc[key]) return acc;
                    const valueString = typeof value === "string" ? value : String(value ?? "");
                    if (valueString.trim()) {
                        acc[key] = valueString.trim();
                    }
                    return acc;
                }, {})
            : {};

        return (
            <div className={styles.detailModalContainer}>
                {introSummary && (
                    <div className={styles.detailIntroSummary}>
                        <p className={styles.detailIntroText}>{introSummary}</p>
                    </div>
                )}

                <div className={styles.detailFields}>
                    {categoryConfig && combinedFieldItems.length > 0 && combinedFieldItems}
                    {!categoryConfig && Object.keys(fallbackItems).length > 0 && (
                        Object.entries(fallbackItems).map(([key, value]) => (
                            <div key={key} className={styles.detailField}>
                                <div className={styles.detailFieldLabel}>{getFieldLabel(key)}</div>
                                <div className={styles.detailFieldValue}>
                                    {formatFieldValue(key, value)}
                                </div>
                            </div>
                        ))
                    )}

                    {((categoryConfig && combinedFieldItems.length === 0) ||
                        (!categoryConfig && Object.keys(fallbackItems).length === 0)) && (
                            <div className={styles.detailEmpty}>추가 상세 정보가 없습니다.</div>
                        )}
                </div>
            </div>
        );
    };

    const handleSelect = () => {
        if (destination && safeTripId) {
            console.log('=== SELECT BUTTON CLICKED ===');
            console.log('Destination:', destination);
            console.log('TripId:', safeTripId);

            // 선택된 여행지를 localStorage에 저장
            let selectedDestinations = JSON.parse(localStorage.getItem('selectedDestinations') || '{}');
            const tripKey = `trip_${safeTripId}`;

            console.log('Current localStorage:', selectedDestinations);
            console.log('TripKey:', tripKey);

            // selectedDestinations가 배열인 경우 객체로 변환
            if (Array.isArray(selectedDestinations)) {
                selectedDestinations = {};
                console.log('Converted array to object');
            }

            if (!selectedDestinations[tripKey]) {
                selectedDestinations[tripKey] = [];
                console.log('Created new trip array');
            }

            // 이미 선택된 여행지인지 확인 (contentId로 비교)
            const isAlreadySelected = selectedDestinations[tripKey].some((dest: any) => dest.contentId === destination.contentId);
            console.log('Is already selected:', isAlreadySelected);

            if (!isAlreadySelected) {
                selectedDestinations[tripKey].push(destination);
                try {
                    localStorage.setItem('selectedDestinations', JSON.stringify(selectedDestinations));
                    console.log('Destination saved to localStorage:', selectedDestinations);
                    console.log('Saved destinations for this trip:', selectedDestinations[tripKey]);

                    // 저장 확인
                    const savedData = localStorage.getItem('selectedDestinations');
                    console.log('Verification - saved data:', savedData);
                    const parsedSavedData = JSON.parse(savedData || '{}');
                    console.log('Verification - parsed saved data:', parsedSavedData);
                } catch (error) {
                    console.error('localStorage save error:', error);
                }
            }

            console.log('=== NAVIGATING TO CONTENT LIST ===');
            router.back();
        } else {
            console.log('Missing destination or tripId:', { destination, safeTripId });
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>여행지 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>{error}</p>
                    <button
                        className={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    if (!destination) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>여행지 정보를 찾을 수 없습니다.</p>
                    <button
                        className={styles.retryButton}
                        onClick={handleBack}
                    >
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Head>
                <title>{destination.title}</title>
                <meta name="description" content={destination.overview} />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className={styles.container}>
                <Header
                    backgroundColor="#FFE135"
                    leftImage={{ src: '/headerimg/yellowLeft.png', alt: 'Content Detail' }}
                    rightImage={{ src: '/headerimg/yellowRight.png', alt: 'Content Detail' }}
                    title={destination.title}
                    subtitle={destination.addr1}
                    leftButton={{
                        text: "돌아가기",
                        onClick: handleBack
                    }}
                    rightButton={isFromCollection
                        ? {
                            text: "삭제",
                            onClick: handleDelete
                        }
                        : (isFromSchedule
                            ? undefined
                            : {
                                text: "선택하기",
                                onClick: handleSelect
                            })}
                />

                <div className={styles.content}>
                    <div className={styles.mainContent}>
                        <div className={styles.imageSection}>
                            <div className={styles.mainImage}>
                                <img
                                    src={destination.firstImage || destination.photos?.[0]?.photoUrl}
                                    alt={destination.title}
                                    className={styles.destinationImage}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <button
                                    className={styles.moreImagesButton}
                                    onClick={() => setShowImageModal(true)}
                                >
                                    📷 더보기
                                </button>
                            </div>
                        </div>

                        <div className={styles.textSection}>
                            <div className={styles.description}>
                                {destination.overview}
                            </div>

                            {/* 편의시설 필드 중 true인 것들 체크 */}
                            {(() => {
                                const facilityFields = [
                                    { key: 'goodForChildren', label: '아이와 함께', icon: '👶' },
                                    { key: 'allowsDogs', label: '반려동물 동반', icon: '🐕' },
                                    { key: 'restroom', label: '화장실', icon: '🚻' },
                                    { key: 'wheelchairAccessibleEntrance', label: '휠체어 출입', icon: '♿' },
                                    { key: 'wheelchairAccessibleRestroom', label: '휠체어 화장실', icon: '♿🚻' },
                                    { key: 'wheelchairAccessibleParking', label: '휠체어 주차', icon: '♿🅿️' },
                                    { key: 'freeParkingLot', label: '무료 주차', icon: '🅿️' },
                                    { key: 'paidParkingLot', label: '유료 주차', icon: '🅿️💰' },
                                    { key: 'acceptsCreditCards', label: '신용카드', icon: '💳' },
                                    { key: 'acceptsContactlessPayment', label: '무선결제', icon: '📱💳' },
                                ];

                                const activeFacilities = facilityFields.filter(field =>
                                    destination[field.key as keyof typeof destination] === true
                                );

                                const hasContent =
                                    (destination.googleRatingCount && destination.googleRatingCount > 0) ||
                                    destination.contentTypeName ||
                                    (destination.tel && destination.tel.trim() !== '') ||
                                    (destination.overview && destination.overview.trim() !== '') ||
                                    activeFacilities.length > 0;

                                return hasContent ? (
                                    <div className={styles.featuresGrid}>
                                        {/* 평점 카드 - reviewCount가 0보다 클 때만 표시 */}
                                        {destination.googleRatingCount && destination.googleRatingCount > 0 && (
                                            <div
                                                className={styles.featureCard}
                                                onClick={() => setShowReviewModal(true)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className={styles.ratingText}>
                                                    ⭐ {(destination.googleRating || 0).toFixed(1)}
                                                </div>
                                                <div className={styles.ratingSubText}>
                                                    ({(destination.googleRatingCount || 0)}개 리뷰)
                                                </div>
                                            </div>
                                        )}

                                        {/* 컨텐츠 타입 카드 - 내용이 있을 때만 표시 */}
                                        {destination.contentTypeName && (
                                            <div className={styles.featureCard}>
                                                <div className={styles.featureText}>{destination.contentTypeName}</div>
                                            </div>
                                        )}

                                        {/* 연락처 / 홈페이지 카드 */}
                                        {((destination.tel && destination.tel.trim() !== '') || (destination.homepage && destination.homepage.trim() !== '')) && (
                                            <div className={`${styles.featureCard} ${styles.contactCard}`}>
                                                {destination.tel && destination.tel.trim() !== '' && (() => {
                                                    const phoneNumbers = destination.tel.split(/[,\n]/).map(phone => phone.trim()).filter(phone => phone !== '');
                                                    return (
                                                        <div className={styles.featureText}>
                                                            📞 {phoneNumbers.map((phone, index) => (
                                                                <React.Fragment key={index}>
                                                                    {phone}
                                                                    {index < phoneNumbers.length - 1 && <br />}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                {destination.homepage && destination.homepage.trim() !== '' && (
                                                    <div className={styles.featureText}>
                                                        🌐 <a
                                                            href={destination.homepage.startsWith('http') ? destination.homepage : `https://${destination.homepage}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.link}
                                                        >
                                                            홈페이지 바로가기
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}




                                        {/* 상세 정보 모달 카드 */}
                                        {((destination.detailIntro && String(destination.detailIntro).trim() !== '') ||
                                            (destination.detailInfoJson && String(destination.detailInfoJson).trim() !== '')) && (
                                                <div
                                                    className={`${styles.featureCard} ${styles.moreInfoCard}`}
                                                    onClick={() => setShowDetailModal({
                                                        title: '상세 정보',
                                                        content: renderDetailContent()
                                                    })}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className={styles.featureText}>
                                                        ℹ️ 상세 정보 더보기
                                                    </div>
                                                </div>
                                            )}

                                        {/* 편의시설 카드들 - true인 것만 표시 */}
                                        {activeFacilities.map((facility, index) => (
                                            <div key={index} className={styles.featureCard}>
                                                <div className={styles.featureText}>
                                                    {facility.icon} {facility.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>

                {/* 이미지 모달 */}
                {showImageModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowImageModal(false)}>
                        <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.imageModalHeader}>
                                <h3 className={styles.modalTitle}>사진 갤러리</h3>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setShowImageModal(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.imageModalBody}>
                                <div className={styles.imageContainer}>
                                    {destination.photos?.map((photo, index) => (
                                        <div
                                            key={index}
                                            className={styles.currentImageWrapper}
                                            onClick={() => setCurrentImageIndex(index)}
                                            style={{
                                                cursor: 'pointer',
                                                border: index === currentImageIndex ? '3px solid #FFE135' : '1px solid #ddd',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <img
                                                src={photo.photoUrl}
                                                alt={`${destination.title} - 이미지 ${index + 1}`}
                                                className={styles.currentImage}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 리뷰 모달 */}
                {showReviewModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowReviewModal(false)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>리뷰 목록</h3>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setShowReviewModal(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.reviewSummary}>
                                    <div className={styles.ratingDisplay}>
                                        <span className={styles.ratingNumber}>{destination.rating.toFixed(1)}</span>
                                        <div className={styles.stars}>
                                            {[...Array(5)].map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={i < Math.floor(destination.rating) ? styles.starFilled : styles.starEmpty}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                        <span className={styles.reviewCount}>({destination.reviewCount}개 리뷰)</span>
                                    </div>
                                </div>

                                <div className={styles.reviewsList}>
                                    {/* 실제 리뷰 데이터가 있다면 여기에 표시 */}
                                    {destination.reviews && destination.reviews.length > 0 ? (
                                        destination.reviews.map((review: any, index: number) => (
                                            <div key={index} className={styles.reviewItem}>
                                                <div className={styles.reviewHeader}>
                                                    <div className={styles.reviewerName}>{review.authorName || review.author || '익명'}</div>
                                                    <div className={styles.reviewRating}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <span
                                                                key={i}
                                                                className={i < (review.rating || 5) ? styles.starFilled : styles.starEmpty}
                                                            >
                                                                ⭐
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className={styles.reviewText}>{review.reviewText || review.content || review.translatedText || '리뷰 내용이 없습니다.'}</div>
                                                <div className={styles.reviewDate}>{review.relativeTimeDescription || review.reviewTime || review.date || '날짜 정보 없음'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        // 더미 리뷰 데이터 (실제 API에 리뷰 데이터가 없는 경우)
                                        [
                                            { author: '김여행', rating: 5, content: '정말 아름다운 곳이에요! 가족과 함께 가기 좋습니다.', date: '2024.01.15' },
                                            { author: '박관광', rating: 4, content: '사진 찍기 좋고 경치가 멋져요. 주차는 좀 어려워요.', date: '2024.01.10' },
                                            { author: '이방문', rating: 5, content: '역사적인 의미가 있는 곳이라 더욱 특별했어요.', date: '2024.01.08' },
                                            { author: '최탐방', rating: 4, content: '조용하고 평화로운 분위기였습니다. 추천해요!', date: '2024.01.05' },
                                            { author: '정체험', rating: 5, content: '아이들과 함께 가서 좋은 추억을 만들었어요.', date: '2024.01.03' }
                                        ].map((review, index) => (
                                            <div key={index} className={styles.reviewItem}>
                                                <div className={styles.reviewHeader}>
                                                    <div className={styles.reviewerName}>{review.author}</div>
                                                    <div className={styles.reviewRating}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <span
                                                                key={i}
                                                                className={i < review.rating ? styles.starFilled : styles.starEmpty}
                                                            >
                                                                ⭐
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className={styles.reviewText}>{review.content}</div>
                                                <div className={styles.reviewDate}>{review.date}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 상세 정보 모달 */}
                {showDetailModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowDetailModal(null)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>{showDetailModal.title}</h3>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setShowDetailModal(null)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.detailContent}>
                                    {showDetailModal.content}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentDetail;
