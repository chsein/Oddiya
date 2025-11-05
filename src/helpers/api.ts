import axios, { AxiosResponse } from 'axios';
import { getCurrentUserIdToken, refreshIdToken } from '../lib/firebase/auth';

// API 관련 타입 정의
export interface ContentItem {
    firstImage: string | undefined;
    id: string;
    contentId: string;
    title: string;
    photoUrl: string;
    areaCode: string;
    sigunguCode: string;
    contentTypeId: string;
    rating: number;
    ratingCount: number;
    address: string;
    latitude: number;
    longitude: number;
    // 기존 필드들도 유지 (하위 호환성)
    url?: string;
    googleRating?: number;
    googleRatingCount?: number;
}

export interface PageInfo {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

export interface ContentsResponse {
    success: boolean;
    data: {
        content: ContentItem[];
        page: PageInfo;
    };
    message: string;
    timestamp: string;
}

// ContentDetail 관련 타입 정의
export interface Time {
    hour: number;
    minute: number;
    second: number;
    nano: number;
}

export interface OpeningHours {
    id: string;
    dayOfWeek: number;
    openTime: Time;
    closeTime: Time;
    isClosed: boolean;
    is24Hours: boolean;
    breakTimeStart: Time;
    breakTimeEnd: Time;
    secondBreakStart: Time;
    secondBreakEnd: Time;
    lastOrderTime: Time;
    lastEntryTime: Time;
    specialType: string;
    specialDate: string;
    specialNotes: string;
    dataSource: string;
    confidenceScore: number;
    isVerified: boolean;
}

export interface Photo {
    id: string;
    photoUrl: string;
    photoReference: string;
    widthPx: number;
    heightPx: number;
    photoSource: string;
    isPrimary: boolean;
    caption: string;
    attribution: string;
    photographer: string;
    qualityScore: number;
}

export interface Review {
    id: string;
    reviewText: string;
    rating: number;
    authorName: string;
    authorProfilePhotoUrl: string;
    reviewTime: string;
    relativeTimeDescription: string;
    languageCode: string;
    reviewSource: string;
    isTranslated: boolean;
    translatedText: string;
    sentimentScore: number;
    sentiment: string;
    isVerified: boolean;
    helpfulVotes: number;
    totalVotes: number;
}

export interface DetailInfo {
    fldgubun: string;
    infoname: string;
    infotext: string;
    contentid: string;
    serialnum: string;
    contenttypeid: string;
}

export interface ContentDetail {
    id: string;
    contentId: string;
    googlePlaceId: string;
    contentTypeId: string;
    title: string;
    overview: string;
    addr1: string;
    addr2: string;
    tel: string;
    homepage: string;
    areaCode: string;
    sigunguCode: string;
    latitude: number;
    longitude: number;
    plusCode: string;
    firstImage: string;
    rating: number;
    reviewCount: number;
    googleRating: number;
    googleRatingCount: number;
    priceLevel: number;
    editorialSummary: string;
    generativeSummary: string;
    goodForChildren: boolean;
    allowsDogs: boolean;
    restroom: boolean;
    wheelchairAccessibleEntrance: boolean;
    wheelchairAccessibleRestroom: boolean;
    wheelchairAccessibleParking: boolean;
    freeParkingLot: boolean;
    paidParkingLot: boolean;
    acceptsCreditCards: boolean;
    acceptsContactlessPayment: boolean;
    businessStatus: string;
    dataQuality: string;
    lastUpdated: string;
    detailInfoJson: any; // 객체 또는 배열일 수 있음
    photos: Photo[];
    reviews: Review[];
    openingHours: OpeningHours[];
    detailIntro: any;
    fullAddress: string;
    // 하위 호환성을 위한 필드들 (옵셔널)
    contentTypeName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ContentDetailResponse {
    success: boolean;
    data: ContentDetail;
    message: string;
    timestamp: string;
    error?: string;
}

// Trip 관련 타입 정의
export interface Trip {
    tripName?: string;
    id: string;
    title: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
    image?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TripResponse {
    success: boolean;
    data: Trip[];
    message: string;
    timestamp: string;
}

// API 기본 URL - 환경 변수에서 주입
const API_BASE_URL = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8080';

// axios 인스턴스 생성
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // ngrok 브라우저 경고 스킵
        'User-Agent': 'ODDIYA-Frontend/1.0', // 사용자 에이전트 설정
    },
});

// 요청 인터셉터 - Firebase ID Token 자동 추가
apiClient.interceptors.request.use(
    async (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

        try {
            // Firebase ID Token 가져오기
            const idToken = await getCurrentUserIdToken();

            if (idToken) {
                // Authorization 헤더에 Bearer 토큰 추가
                config.headers.Authorization = `Bearer ${idToken}`;
                console.log('✅ Firebase ID Token added to request');
            } else {
                console.warn('⚠️ No Firebase ID Token available - user may not be logged in');
            }
        } catch (error) {
            console.error('❌ Failed to get Firebase ID Token:', error);
            // 토큰 가져오기 실패해도 요청은 계속 진행 (공개 API 지원)
        }

        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// 응답 인터셉터 - 토큰 만료 시 자동 갱신
apiClient.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // 401 Unauthorized 에러 & 토큰 갱신을 시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log('🔄 Token expired, attempting to refresh...');

                // Firebase ID Token 강제 갱신
                const newToken = await refreshIdToken();

                if (newToken) {
                    // 새 토큰으로 헤더 업데이트
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    console.log('✅ Token refreshed, retrying request');

                    // 원래 요청 재시도
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트 (클라이언트에서 처리)
                return Promise.reject(refreshError);
            }
        }

        console.error('Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
    }
);

// 지역별 컨텐츠 조회 API (contentTypeId 옵션 추가)
export const getContentsByRegion = async (regionName: string, contentTypeId?: number): Promise<ContentsResponse> => {
    try {
        const url = contentTypeId
            ? `/api/v1/contents/regions/${regionName}?contentTypeId=${contentTypeId}`
            : `/api/v1/contents/regions/${regionName}`;

        console.log('🌍 API 호출 - Region:', regionName, 'ContentType:', contentTypeId || 'All');

        // apiClient를 사용하여 Authorization 헤더 자동 포함
        const response = await apiClient.get(url);

        return response.data;
    } catch (error) {
        console.error('Error fetching contents by region:', error);
        throw error;
    }
};

// 타입별 컨텐츠 조회 API
export const getContentsByType = async (contentTypeId: number): Promise<ContentsResponse> => {
    try {
        console.log('🏷️ API 호출 - ContentType:', contentTypeId);

        // apiClient를 사용하여 Authorization 헤더 자동 포함
        const response = await apiClient.get(`/api/v1/contents/places/type/${contentTypeId}`);

        return response.data;
    } catch (error) {
        console.error('Error fetching contents by type:', error);
        throw error;
    }
};

// 컨텐츠 상세 조회 API
export const getContentDetail = async (contentId: string): Promise<ContentDetailResponse> => {
    try {
        const response: AxiosResponse<ContentDetailResponse> = await apiClient.get(`/api/v1/contents/detail/${contentId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching content detail:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 여행 목록 조회 API
export const getTrips = async (): Promise<Trip[]> => {
    try {
        const response = await apiClient.get('/api/v1/trips');
        console.log('🚗 API 호출 URL (인코딩 전):', response);
        console.log('🚗 Response data:', response.data);
        console.log('🚗 Response data type:', typeof response.data);
        console.log('🚗 Response data is array:', Array.isArray(response.data));

        // 실제 API 응답 구조에 맞게 수정
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else {
            console.warn('Unexpected API response structure:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching trips:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 여행 상세 조회 API
export const getTripById = async (tripId: string): Promise<Trip> => {
    try {
        const response = await apiClient.get(`/api/v1/trips/${tripId}`);
        console.log('🚗 Trip detail API response:', response);
        console.log('🚗 Trip data:', response.data);

        // 실제 API 응답 구조에 맞게 수정
        if (response.data) {
            return response.data;
        } else if (response.data && response.data.data) {
            return response.data.data;
        } else {
            throw new Error('Invalid trip data structure');
        }
    } catch (error) {
        console.error('Error fetching trip details:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 여행 생성 요청 타입
export interface CreateTripRequest {
    tripName: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
    tripStatus: "PLANNING";
    validDateRange: true;
}

// 여행 생성 API
export const createTrip = async (tripData: CreateTripRequest): Promise<Trip> => {
    try {
        const response: AxiosResponse<{ success: boolean; data: Trip; message: string; timestamp: string }> =
            await apiClient.post('/api/v1/trips', tripData);
        console.log('🚗 여행 생성 API 호출:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('Error creating trip:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 여행지 장바구니 추가 요청 타입
export interface BasketItemRequest {
    placeId: string;
    note?: string;
}

// 여행지 장바구니 추가 API
export const addBasketItem = async (tripId: string, item: BasketItemRequest): Promise<void> => {
    try {
        await apiClient.post(`/api/v1/trips/${tripId}/basket/items`, item);
        console.log('🚗 장바구니 항목 추가:', item);
    } catch (error) {
        console.error('Error adding basket item:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 장바구니 항목 타입
export interface BasketItem {
    id: string;
    placeId: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
    place?: ContentItem; // 장소 상세 정보
}

export interface BasketResponse {
    success: boolean;
    data: BasketItem[];
    message: string;
    timestamp: string;
}

// 장바구니 조회 API
export const getBasket = async (tripId: string): Promise<BasketItem[]> => {
    try {
        const response = await apiClient.get(`/api/v1/trips/${tripId}/basket`);
        console.log('🚗 장바구니 조회:', response);
        console.log('🚗 Response data:', response.data);
        console.log('🚗 Response data type:', typeof response.data);
        console.log('🚗 Response data is array:', Array.isArray(response.data));

        // 실제 API 응답 구조에 맞게 수정
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else {
            console.warn('Unexpected basket response structure:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching basket:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 장소 상세 정보 조회 API
export const getPlaceDetail = async (id: string): Promise<ContentItem> => {
    try {
        const response = await apiClient.get(`/api/v1/contents/detail/${id}`);
        console.log('🚗 장소 상세 조회:', response.data);

        // 실제 API 응답 구조에 맞게 수정
        if (response.data) {
            // 응답에 data 속성이 있으면 그 안의 데이터 반환
            if (response.data.data) {
                return response.data.data;
            }
            return response.data;
        }
        throw new Error('Invalid place detail response');
    } catch (error) {
        console.error('Error fetching place detail:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 장바구니 항목 삭제 API
export const deleteBasketItem = async (tripId: string, placeId: string): Promise<void> => {
    try {
        await apiClient.delete(`/api/v1/trips/${tripId}/basket/items/${placeId}`);
        console.log('🚗 장바구니 항목 삭제:', placeId);
    } catch (error) {
        console.error('Error deleting basket item:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 일정 조회 API
export const getItinerary = async (tripId: string): Promise<any> => {
    try {
        const response = await apiClient.get(`/api/v1/trips/${tripId}`);
        console.log('🚗 일정 조회:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching itinerary:', error);
        if (axios.isAxiosError(error)) {
            // 404는 일정이 없는 것으로 처리
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 일정 생성 요청 타입
export interface GenerateItineraryRequest {
    placeIds: string[];
}

// 일정 생성 API
export const generateItinerary = async (tripId: string, placeIds: string[]): Promise<any> => {
    try {
        const requestBody: GenerateItineraryRequest = { placeIds };
        console.log('🚗 일정 생성 요청:', {
            tripId,
            placeIds,
            requestBody
        });
        const response = await apiClient.post(`/api/v1/trips/${tripId}/generate-itinerary`, requestBody);
        console.log('🚗 일정 생성 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error generating itinerary:', error);
        if (axios.isAxiosError(error)) {
            console.error('🚗 API 에러 상세:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// ========== Photo API ==========

// Photo 관련 타입 정의
export interface PhotoUploadUrlRequest {
    fileName: string;
    fileType: string;  // MIME type (image/jpeg, image/png, etc.)
    fileSize: number;  // bytes
    takenAt?: string;  // ISO 8601 format
    latitude?: number;
    longitude?: number;
}

export interface PhotoUploadUrlResponse {
    photoId: string;
    uploadUrl: string;  // Pre-signed URL (15분 유효)
    expiresAt: string;  // ISO 8601 format
    s3Key: string;
}

export interface Photo {
    id: string;
    url: string;  // Pre-signed download URL (1시간 유효)
    thumbnailUrl?: string;
    fileName: string;
    fileSize: number;
    width?: number;
    height?: number;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    takenAt?: string;
    createdAt: string;
    status: string;  // PENDING, UPLOADED, PROCESSING, PROCESSED, FAILED
}

export interface PhotoListResponse {
    content: Photo[];
    pageable: any;
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
}

// 1. Pre-signed URL 요청
export const requestPhotoUploadUrl = async (
    tripId: string,
    request: PhotoUploadUrlRequest
): Promise<PhotoUploadUrlResponse> => {
    try {
        const response = await apiClient.post(`/api/v1/trips/${tripId}/photos/upload-url`, request);
        console.log('📸 Pre-signed URL 생성 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error requesting photo upload URL:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 2. S3/MinIO에 직접 업로드 (Pre-signed URL 사용)
export const uploadPhotoToS3 = async (
    uploadUrl: string,
    file: File,
    contentType: string
): Promise<void> => {
    try {
        // axios로 PUT 요청 (별도 인스턴스, Authorization 헤더 제외)
        await axios.put(uploadUrl, file, {
            headers: {
                'Content-Type': contentType,
            },
        });
        console.log('📸 S3 업로드 성공:', file.name);
    } catch (error) {
        console.error('Error uploading photo to S3:', error);
        throw error;
    }
};

// 3. 업로드 확인
export const confirmPhotoUpload = async (
    tripId: string,
    photoId: string
): Promise<void> => {
    try {
        await apiClient.post(`/api/v1/trips/${tripId}/photos/${photoId}/confirm`);
        console.log('📸 업로드 확인 성공:', photoId);
    } catch (error) {
        console.error('Error confirming photo upload:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 4. 사진 목록 조회
export const getPhotos = async (
    tripId: string,
    page: number = 0,
    size: number = 20
): Promise<PhotoListResponse> => {
    try {
        const response = await apiClient.get(`/api/v1/trips/${tripId}/photos`, {
            params: { page, size }
        });
        console.log('📸 사진 목록 조회 성공:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching photos:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};

// 5. 사진 삭제
export const deletePhoto = async (
    tripId: string,
    photoId: string
): Promise<void> => {
    try {
        await apiClient.delete(`/api/v1/trips/${tripId}/photos/${photoId}`);
        console.log('📸 사진 삭제 성공:', photoId);
    } catch (error) {
        console.error('Error deleting photo:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(`API Error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }
};
