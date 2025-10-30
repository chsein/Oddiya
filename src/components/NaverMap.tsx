import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface NaverMapProps {
    width?: string;
    height?: string;
    markers?: Array<{
        id: number;
        title: string;
        lat: number;
        lng: number;
        category: string;
    }>;
}

export interface NaverMapRef {
    openInfoWindow: (markerId: number) => void;
    closeInfoWindow: () => void;
}

declare global {
    interface Window {
        naver: any;
    }
}

const NaverMap = forwardRef<NaverMapRef, NaverMapProps>(({
    width = '100%',
    height = '100%',
    markers = []
}, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const infoWindowsRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapRef.current) return;

        // 네이버 지도 API 로드 대기
        const initMap = () => {
            if (!window.naver || !window.naver.maps) {
                // API가 아직 로드되지 않은 경우 재시도
                setTimeout(initMap, 100);
                return;
            }

            // 제주도 중심 좌표
            const jejuCenter = new window.naver.maps.LatLng(33.4996, 126.5312);

            // 지도 초기화
            const mapOptions = {
                center: jejuCenter,
                zoom: 10,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: window.naver.maps.MapTypeControlStyle.BUTTON,
                    position: window.naver.maps.Position.TOP_RIGHT
                },
                zoomControl: true,
                zoomControlOptions: {
                    style: window.naver.maps.ZoomControlStyle.SMALL,
                    position: window.naver.maps.Position.RIGHT_CENTER
                }
            };

            mapInstance.current = new window.naver.maps.Map(mapRef.current, mapOptions);

            // 기존 마커와 정보창 정리
            markersRef.current.forEach(marker => marker.setMap(null));
            infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
            markersRef.current = [];
            infoWindowsRef.current = [];

            // 마커 추가
            markers.forEach((marker) => {
                const markerPosition = new window.naver.maps.LatLng(marker.lat, marker.lng);

                const markerInstance = new window.naver.maps.Marker({
                    position: markerPosition,
                    map: mapInstance.current,
                    title: marker.title,
                    icon: {
                        content: `
                        <div style="
                            background: #00EEFF;
                            border: 2px solid #000;
                            border-radius: 50%;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            font-weight: bold;
                            color: #000;
                        ">
                            ${getCategoryIcon(marker.category)}
                        </div>
                    `,
                        size: new window.naver.maps.Size(30, 30),
                        anchor: new window.naver.maps.Point(15, 15)
                    }
                });

                // 정보창 추가
                const infoWindow = new window.naver.maps.InfoWindow({
                    content: `
                    <div style="
                        position: relative;
                        padding: 12px 16px;
                        background: white;
                        border: 2px solid #000;
                        border-radius: 12px;
                        font-family: 'Gamja Flower', cursive;
                        font-size: 14px;
                        max-width: 180px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        z-index: 1000;
                    ">
                        <div style="
                            font-weight: bold; 
                            color: #000;
                            line-height: 1.3;
                        ">${marker.title}</div>
                        
                        <!-- 커스텀 화살표 -->
                        <div style="
                            position: absolute;
                            bottom: -8px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 0;
                            height: 0;
                            border-left: 8px solid transparent;
                            border-right: 8px solid transparent;
                            border-top: 8px solid #000;
                        "></div>
                        <div style="
                            position: absolute;
                            bottom: -6px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 0;
                            height: 0;
                            border-left: 7px solid transparent;
                            border-right: 7px solid transparent;
                            border-top: 7px solid white;
                        "></div>
                    </div>
                `,
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    anchorSize: 0,
                    anchorColor: 'transparent'
                });

                // 마커 클릭 시 정보창 표시
                if (window.naver.maps.Event) {
                    window.naver.maps.Event.addListener(markerInstance, 'click', () => {
                        infoWindow.open(mapInstance.current, markerInstance);
                    });
                }

                // 마커와 정보창을 ref에 저장
                markersRef.current.push(markerInstance);
                infoWindowsRef.current.push(infoWindow);
            });

            // 마커가 있으면 모든 마커가 보이도록 지도 범위 조정
            if (markers.length > 0 && window.naver.maps) {
                const bounds = new window.naver.maps.LatLngBounds();
                markers.forEach((marker) => {
                    bounds.extend(new window.naver.maps.LatLng(marker.lat, marker.lng));
                });
                mapInstance.current.fitBounds(bounds);
            }
        };

        // 지도 초기화 시작
        initMap();

        // cleanup 함수
        return () => {
            if (mapInstance.current) {
                // 기존 마커와 정보창 정리
                markersRef.current.forEach(marker => marker.setMap(null));
                infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
            }
        };
    }, [markers]);

    // 외부에서 지도 제어할 수 있는 함수들
    useImperativeHandle(ref, () => ({
        openInfoWindow: (markerId: number) => {
            const markerIndex = markers.findIndex(marker => marker.id === markerId);
            if (markerIndex !== -1 && infoWindowsRef.current[markerIndex]) {
                // 다른 정보창들 닫기
                infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
                // 해당 마커의 정보창 열기
                infoWindowsRef.current[markerIndex].open(mapInstance.current, markersRef.current[markerIndex]);
            }
        },
        closeInfoWindow: () => {
            infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
        }
    }));

    // 카테고리별 아이콘 반환
    const getCategoryIcon = (category: string): string => {
        switch (category) {
            case '테마파크':
                return '🎠';
            case '식당':
                return '🍽️';
            case '자연':
                return '🌊';
            case '교통':
                return '✈️';
            case '숙박':
                return '🏨';
            case '관광':
                return '🏛️';
            default:
                return '📍';
        }
    };

    return (
        <div
            ref={mapRef}
            style={{
                width,
                height,
                minHeight: '450px',
                borderRadius: '15px',
                overflow: 'hidden',
                backgroundColor: '#f0f0f0',
                position: 'relative'
            }}
        />
    );
});

NaverMap.displayName = 'NaverMap';

export default NaverMap;
