import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo, useState, useEffect } from 'react';
import { z } from "zod";
import { CompositionProps } from "../../types/constants";

const timingData = {
    beat_times: [
        0.05,
        0.45,
        0.87,
        1.7,
        2.1,
        2.94,
        3.36,
        4.18,
        4.6,
        5.42,
        5.83,
        6.66,
        7.08,
        7.91,
        8.31,
        8.73,
        9.56,
        9.97,
        10.8,
        11.22,
        12.04,
        12.46,
        13.28,
        13.7,
        14.52,
        14.98,
        15.87
    ],
};

// single 레이아웃 제거 - 모든 비트를 grid 또는 coords로 사용

function getSeededRandomInt(seed: number, min: number, max: number) {
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return Math.floor(min + rand * (max - min + 1));
}

function decideLayoutType(seed: number, last: string | null, lastWasGrid: boolean): 'grid' | 'coords' {
    // 랜덤하게 grid 또는 coords 선택
    const candidate = getSeededRandomInt(seed, 0, 1) === 0 ? 'grid' : 'coords';
    return candidate;
}

export const BeatVideo = ({ title, images = [], music, tripId }: z.infer<typeof CompositionProps>) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // 매번 다른 시드를 생성하기 위해 useState 사용
    const [randomSeed, setRandomSeed] = useState(() => {
        const imageHash = images?.reduce((acc, img) => acc + (img.url || '').length, 0) || 0;
        return Date.now() + Math.random() * 1000 + (tripId ? tripId.toString().length : 0) + imageHash;
    });

    // 컴포넌트가 마운트될 때마다 새로운 시드 생성
    useEffect(() => {
        const imageHash = images?.reduce((acc, img) => acc + (img.url || '').length, 0) || 0;
        setRandomSeed(Date.now() + Math.random() * 1000 + (tripId ? tripId.toString().length : 0) + imageHash);
    }, [tripId, images?.length]);


    const renderItems = useMemo(() => {
        if (!images || images.length === 0) return [];

        let lastLayout: 'grid' | 'coords' | null = null;
        let lastWasGrid = false;
        const usedImages = new Set<number>(); // 전체 비디오에서 사용된 이미지 인덱스 추적
        const items: Array<{
            groupIndex: number;
            layout: 'gridImage' | 'coordsImage';
            imgIndex: number;
            coordsPos?: { left: number; top: number; widthPercent: number; heightPercent: number };
            gridIdx?: number;
            gridType?: '2x2' | '1x4';
            zIndex: number;
            startFrame: number;
        }> = [];

        // 사용 가능한 이미지 중에서 선택하는 함수
        const getAvailableImageIndex = (orientation?: 'landscape' | 'portrait'): number => {
            let availableImages = orientation
                ? images.filter((img, idx) => img.orientation === orientation && !usedImages.has(idx))
                : images.filter((_, idx) => !usedImages.has(idx));

            // 모든 이미지가 사용되었다면 사용 기록을 초기화
            if (availableImages.length === 0) {
                usedImages.clear();
                availableImages = orientation
                    ? images.filter(img => img.orientation === orientation)
                    : images;
            }

            // 최근 사용된 이미지들과의 거리를 고려하여 선택
            const recentUsed = Array.from(usedImages).slice(-8); // 최근 8개 사용된 이미지

            if (recentUsed.length > 0 && availableImages.length > 1) {
                // 최근 사용된 이미지와 거리가 먼 이미지 우선 선택
                const distances = availableImages.map((img, idx) => {
                    const originalIndex = images.indexOf(img);
                    const minDistance = Math.min(...recentUsed.map(used => Math.abs(originalIndex - used)));
                    return { img, originalIndex, distance: minDistance };
                });

                // 거리가 먼 순서로 정렬
                distances.sort((a, b) => b.distance - a.distance);

                // 상위 3개 중에서 랜덤 선택 (거리가 먼 이미지 우선)
                const topChoices = distances.slice(0, Math.min(3, distances.length));
                const selected = topChoices[Math.floor(Math.random() * topChoices.length)];
                usedImages.add(selected.originalIndex);
                return selected.originalIndex;
            }

            // 일반적인 랜덤 선택
            const randomIndex = Math.floor(Math.random() * availableImages.length);
            const selectedImage = availableImages[randomIndex];
            const originalIndex = images.indexOf(selectedImage);
            usedImages.add(originalIndex);
            return originalIndex;
        };

        let beatIdx = 0;
        const layoutTypes: string[] = [];

        while (beatIdx < timingData.beat_times.length) {
            const groupIndex = beatIdx;
            let layoutType: 'grid' | 'coords';

            // 모든 비트를 grid 또는 coords로 결정
            layoutType = decideLayoutType(groupIndex * 99 + randomSeed, lastLayout, lastWasGrid);
            console.log(`🎲 Beat ${groupIndex}: layout: ${layoutType}, lastLayout: ${lastLayout}, lastWasGrid: ${lastWasGrid}`);

            layoutTypes.push(layoutType);

            lastLayout = layoutType;
            lastWasGrid = layoutType === 'grid';

            if (layoutType === 'grid') {
                const gridType = getSeededRandomInt(groupIndex * 456, 0, 1) === 0 ? '2x2' : '1x4';
                const count = 4;
                console.log(`🎯 Grid layout - type: ${gridType}, count: ${count}, groupIndex: ${groupIndex}`);

                // 그리드용 이미지들을 먼저 선택하고 랜덤하게 섞기
                const gridImages: number[] = [];
                for (let i = 0; i < count; i++) {
                    if (beatIdx + i >= timingData.beat_times.length) break;
                    gridImages.push(getAvailableImageIndex()); // 모든 이미지 사용 가능
                }

                // 이미지 순서를 랜덤하게 섞기
                const shuffledGridImages = [...gridImages].sort(() => Math.random() - 0.5);

                for (let i = 0; i < count; i++) {
                    if (beatIdx + i >= timingData.beat_times.length) break;
                    items.push({
                        groupIndex,
                        layout: 'gridImage',
                        imgIndex: shuffledGridImages[i], // 랜덤하게 섞인 이미지 사용
                        zIndex: groupIndex,
                        startFrame: Math.floor(timingData.beat_times[beatIdx] * fps), // 그룹의 첫 번째 비트 시간 사용
                        gridIdx: i,
                        gridType,
                    });
                }
                beatIdx += count;
                continue;
            }

            // coords layout
            const count = getSeededRandomInt(groupIndex * 123, 2, 4); // 2-4장으로 늘림
            console.log(`🎯 Coords layout - count: ${count}, groupIndex: ${groupIndex}`);

            let coordsPositions;

            if (count === 2) {
                // 두장: 대각선 배치
                coordsPositions = [
                    { left: 25, top: 30, widthPercent: 40, heightPercent: 50 },
                    { left: 75, top: 70, widthPercent: 40, heightPercent: 50 },
                ];
            } else if (count === 3) {
                // 세장: 삼각형 배치
                coordsPositions = [
                    { left: 50, top: 20, widthPercent: 35, heightPercent: 40 },
                    { left: 25, top: 70, widthPercent: 35, heightPercent: 40 },
                    { left: 75, top: 70, widthPercent: 35, heightPercent: 40 },
                ];
            } else {
                // 네장: 사각형 배치
                coordsPositions = [
                    { left: 25, top: 25, widthPercent: 35, heightPercent: 35 },
                    { left: 75, top: 25, widthPercent: 35, heightPercent: 35 },
                    { left: 25, top: 75, widthPercent: 35, heightPercent: 35 },
                    { left: 75, top: 75, widthPercent: 35, heightPercent: 35 },
                ];
            }

            for (let i = 0; i < count; i++) {
                if (beatIdx + i >= timingData.beat_times.length) break;
                items.push({
                    groupIndex,
                    layout: 'coordsImage',
                    imgIndex: getAvailableImageIndex(), // 모든 이미지 사용 가능
                    zIndex: groupIndex,
                    startFrame: Math.floor(timingData.beat_times[beatIdx] * fps), // 그룹의 첫 번째 비트 시간 사용
                    coordsPos: coordsPositions[i],
                });
            }
            beatIdx += count;
        }

        // 디버깅: 레이아웃 분포 확인
        console.log('🎬 BeatVideo Layout Types:', layoutTypes);
        console.log('📊 Grid count:', layoutTypes.filter(t => t === 'grid').length);
        console.log('📊 Coords count:', layoutTypes.filter(t => t === 'coords').length);
        console.log('🎲 Random Seed:', randomSeed);
        console.log('📋 생성된 아이템들:', items.map(item => ({
            groupIndex: item.groupIndex,
            layout: item.layout,
            startFrame: item.startFrame,
            gridIdx: item.gridIdx,
            imgIndex: item.imgIndex
        })));

        return items;
    }, [fps, images, randomSeed]);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* 배경 음악이 있다면 재생 */}
            {music && <Audio src={music} />}

            {(() => {
                // 디버깅: 현재 프레임에서 렌더링될 아이템들 필터링
                const visibleItems = renderItems.filter(item => frame >= item.startFrame);
                console.log(`🎬 Frame ${frame}: 총 ${renderItems.length}개 아이템 중 ${visibleItems.length}개 렌더링`);

                return renderItems.map((item, i) => {
                    if (frame < item.startFrame) return null;

                    const src = images[item.imgIndex]?.url || '';

                    if (item.layout === 'gridImage') {
                        const gridType = item.gridType || '2x2';
                        let sizeW, sizeH, top, left;

                        if (gridType === '2x2') {
                            // 2x2 그리드: 네 장 모두 가로가 긴 사진
                            sizeW = width / 2;
                            sizeH = height / 2;
                            const gridIdx = item.gridIdx ?? 0;
                            top = Math.floor(gridIdx / 2) * sizeH;
                            left = (gridIdx % 2) * sizeW;
                        } else {
                            // 1x4 그리드: 네 장 모두 세로가 긴 사진
                            sizeW = width / 4;
                            sizeH = height;
                            const gridIdx = item.gridIdx ?? 0;
                            top = 0;
                            left = gridIdx * sizeW;
                        }

                        return (
                            <Img
                                key={`grid-${item.groupIndex}-${item.gridIdx}`}
                                src={src}
                                style={{
                                    position: 'absolute',
                                    width: sizeW,
                                    height: sizeH,
                                    left: left,
                                    top: top,
                                    objectFit: 'contain',
                                    objectPosition: 'center',
                                    borderRadius: 0,
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: 'black',
                                    zIndex: item.zIndex,
                                }}
                                draggable={false}
                            />
                        );
                    }

                    if (item.layout === 'coordsImage') {
                        const { left = 50, top = 50, widthPercent = 50, heightPercent = 50 } = item.coordsPos || {};
                        const pixelWidth = (width * widthPercent) / 100;
                        const pixelHeight = (height * heightPercent) / 100;
                        const pixelLeft = (width * left) / 100;
                        const pixelTop = (height * top) / 100;

                        return (
                            <Img
                                key={`coords-${item.groupIndex}-${item.imgIndex}`}
                                src={src}
                                style={{
                                    position: 'absolute',
                                    width: pixelWidth,
                                    height: pixelHeight,
                                    top: pixelTop - pixelHeight / 2,
                                    left: pixelLeft - pixelWidth / 2,
                                    objectFit: 'contain',
                                    borderRadius: 0,
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: 'black',
                                    zIndex: item.zIndex,
                                }}
                                draggable={false}
                            />
                        );
                    }

                    return null;
                });
            })()}

            {/* 제목 표시 */}
            {title && (
                <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '48px',
                    textAlign: 'center',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    fontWeight: 'bold',
                }}>
                    {title}
                </div>
            )}
        </AbsoluteFill>
    );
};
