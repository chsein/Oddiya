import axios, { AxiosResponse } from 'axios';

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
export interface Photo {
    id: number;
    photoUrl: string;
    photoReference: string;
    photoSource: string;
    isPrimary: boolean;
}

export interface Review {
    id: number;
    reviewText: string;
    rating: number;
    authorName: string;
    authorProfilePhotoUrl: string;
    reviewTime: string;
    relativeTimeDescription: string;
    languageCode: string;
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
    contentId: string;
    contentTypeId: string;
    contentTypeName: string;
    title: string;
    addr1: string;
    addr2: string;
    areaCode: string;
    sigunguCode: string;
    latitude: number;
    longitude: number;
    overview: string;
    firstImage: string;
    googlePlaceId: string;
    rating: number;
    reviewCount: number;
    photos: Photo[];
    reviews: Review[];
    openingHours: any[];
    detailInfoJson: DetailInfo[];
    dataQuality: string;
    lastUpdated: string;
    createdAt: string;
    updatedAt: string;
}

export interface ContentDetailResponse {
    success: boolean;
    data: ContentDetail;
    message: string;
    timestamp: string;
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

// API 기본 URL
const API_BASE_URL = 'https://c782ebba9ac1.ngrok-free.app';

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

// 요청 인터셉터
apiClient.interceptors.request.use(
    (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error('Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
    }
);

// 지역별 컨텐츠 조회 API
export const getContentsByRegion = async (regionName: string): Promise<ContentsResponse> => {
    try {
        // 한글 regionName을 인코딩하지 않고 직접 URL에 포함
        const fullUrl = `${API_BASE_URL}/api/v1/contents/regions/${regionName}`;
        console.log('🌍 API 호출 URL (인코딩 전):', fullUrl);

        // fetch를 사용하여 URL 인코딩을 완전히 방지
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'ODDIYA-Frontend/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ContentsResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching contents by region:', error);
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
