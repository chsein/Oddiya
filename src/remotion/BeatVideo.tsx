import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo, useState, useEffect } from 'react';
import { z } from "zod";
import { CompositionProps } from "../../types/constants";

const timingData = {
    beat_times: [
        0.13,
        1.00, 1.20, 1.28, 1.40, 1.60,
        2.1,
        2.78, 3.25, 3.29, 3.50,
        4.1,
        5.10, 5.40, 5.70,
        6.12,
        7.00, 7.60, 7.9,
        8.30,
        8.70, 8.90, 9.60, 9.81, 10.00,
        10.50,
        11.08, 11.42, 11.90, 12.65,
        13.16,
        13.71,
        14.19,
        14.74,
        15.25,
        16.05
    ],
};

const singleBeatIndices = new Set([0, 6, 11, 15, 19, 25]); // 무조건 한장이 나와야 하는 인덱스

function getSeededRandomInt(seed: number, min: number, max: number) {
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return Math.floor(min + rand * (max - min + 1));
}

function decideLayoutType(seed: number, last: string | null, lastWasGrid: boolean): 'grid' | 'coords' {
    // 그리드 다음에는 무조건 싱글이 와야 하므로 coords만 가능
    if (lastWasGrid) {
        return 'coords';
    }

    const candidate = getSeededRandomInt(seed, 0, 1) === 0 ? 'grid' : 'coords';
    return candidate === last ? (candidate === 'grid' ? 'coords' : 'grid') : candidate;
}

export const BeatVideo = ({ title, images = [], music, tripId }: z.infer<typeof CompositionProps>) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // images 안전성 체크
    const safeImages = Array.isArray(images) ? images : [];

    console.log('🎬 BeatVideo props:', {
        title,
        imagesCount: safeImages.length,
        music,
        tripId,
        images: safeImages.slice(0, 3) // 처음 3개만 로그
    });

    // 매번 다른 시드를 생성하기 위해 useState 사용
    const [randomSeed, setRandomSeed] = useState(() => {
        const imageHash = safeImages.reduce((acc, img) => acc + (img?.url || '').length, 0);
        return Date.now() + Math.random() * 1000 + (tripId ? tripId.toString().length : 0) + imageHash;
    });

    // 컴포넌트가 마운트될 때마다 새로운 시드 생성
    useEffect(() => {
        const imageHash = safeImages.reduce((acc, img) => acc + (img?.url || '').length, 0);
        setRandomSeed(Date.now() + Math.random() * 1000 + (tripId ? tripId.toString().length : 0) + imageHash);
    }, [tripId, safeImages.length]);

    const renderItems = useMemo(() => {
        if (!safeImages || safeImages.length === 0) {
            console.log('⚠️ No images available for BeatVideo');
            return [];
        }

        let lastLayout: 'grid' | 'coords' | null = null;
        let lastWasGrid = false;
        const usedImages = new Set<number>(); // 전체 비디오에서 사용된 이미지 인덱스 추적
        const items: Array<{
            groupIndex: number;
            layout: 'single' | 'gridImage' | 'coordsImage';
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
                ? safeImages.filter((img, idx) => img?.orientation === orientation && !usedImages.has(idx))
                : safeImages.filter((_, idx) => !usedImages.has(idx));

            // 모든 이미지가 사용되었다면 사용 기록을 초기화
            if (availableImages.length === 0) {
                usedImages.clear();
                availableImages = orientation
                    ? safeImages.filter(img => img?.orientation === orientation)
                    : safeImages;
            }

            // 최근 사용된 이미지들과의 거리를 고려하여 선택
            const recentUsed = Array.from(usedImages).slice(-8); // 최근 8개 사용된 이미지

            if (recentUsed.length > 0 && availableImages.length > 1) {
                // 최근 사용된 이미지와 거리가 먼 이미지 우선 선택
                const distances = availableImages.map((img, idx) => {
                    const originalIndex = safeImages.indexOf(img);
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
            const originalIndex = safeImages.indexOf(selectedImage);
            usedImages.add(originalIndex);
            return originalIndex;
        };

        let beatIdx = 0;
        const layoutTypes: string[] = [];

        while (beatIdx < timingData.beat_times.length) {
            const groupIndex = beatIdx;
            let layoutType: 'single' | 'grid' | 'coords';

            if (singleBeatIndices.has(groupIndex)) {
                // 무조건 한장이 나와야 하는 인덱스: single 또는 coords 한장
                const shouldBeSingle = getSeededRandomInt(groupIndex * 99 + randomSeed, 0, 1) === 0;
                layoutType = shouldBeSingle ? 'single' : 'coords';
                console.log(`🎯 Single beat index ${groupIndex}: layoutType = ${layoutType}`);
            } else {
                layoutType = decideLayoutType(groupIndex * 99 + randomSeed, lastLayout, lastWasGrid);
                console.log(`🎲 Beat ${groupIndex}: layout: ${layoutType}, lastLayout: ${lastLayout}, lastWasGrid: ${lastWasGrid}`);
            }

            layoutTypes.push(layoutType);

            if (layoutType !== 'single') {
                lastLayout = layoutType;
                lastWasGrid = layoutType === 'grid';
            } else {
                lastWasGrid = false;
            }

            const startFrame = Math.floor(timingData.beat_times[beatIdx] * fps);

            if (layoutType === 'single') {
                items.push({
                    groupIndex,
                    layout: 'single',
                    imgIndex: getAvailableImageIndex('landscape'), // 가로가 긴 사진만 선택
                    zIndex: groupIndex,
                    startFrame,
                });
                beatIdx += 1;
                continue;
            }

            if (layoutType === 'grid') {
                const gridType = getSeededRandomInt(groupIndex * 456, 0, 1) === 0 ? '2x2' : '1x4';
                const count = 4;
                console.log(`🎯 Grid layout - type: ${gridType}, count: ${count}, groupIndex: ${groupIndex}`);

                // 그리드용 이미지들을 먼저 선택하고 랜덤하게 섞기
                const gridImages: number[] = [];
                for (let i = 0; i < count; i++) {
                    if (beatIdx + i >= timingData.beat_times.length) break;
                    const orientation = gridType === '2x2' ? 'landscape' : 'portrait';
                    gridImages.push(getAvailableImageIndex(orientation));
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
                        startFrame: Math.floor(timingData.beat_times[beatIdx + i] * fps),
                        gridIdx: i,
                        gridType,
                    });
                }
                beatIdx += count;
                continue;
            }

            // coords layout
            const count = singleBeatIndices.has(groupIndex) ? 1 : getSeededRandomInt(groupIndex * 123, 1, 2); // 특정 인덱스는 무조건 1장
            console.log(`🎯 Coords layout - count: ${count}, groupIndex: ${groupIndex}`);

            let coordsPositions;

            if (count === 1) {
                // 중간 한장: 세로가 긴 사진은 세로 크기 살짝 작게, 가로가 긴 사진은 가로 크기 4/7
                const isPortrait = getSeededRandomInt(groupIndex * 789, 0, 1) === 0;
                if (isPortrait) {
                    coordsPositions = [{
                        left: 50,
                        top: 50,
                        widthPercent: 70,
                        heightPercent: 85
                    }];
                } else {
                    coordsPositions = [{
                        left: 50,
                        top: 50,
                        widthPercent: 57, // 4/7 ≈ 57%
                        heightPercent: 100
                    }];
                }
            } else {
                // 대각선 두장: 가로가 긴 사진, 세로 크기 4/7, 비율 유지하며 패딩
                coordsPositions = [
                    { left: 25, top: 30, widthPercent: 80, heightPercent: 50 }, // 위쪽 여백 추가
                    { left: 75, top: 70, widthPercent: 80, heightPercent: 50 }, // 아래쪽 여백 추가
                ];
            }

            for (let i = 0; i < count; i++) {
                if (beatIdx + i >= timingData.beat_times.length) break;
                const orientation = count === 2 ? 'landscape' : undefined; // 대각선 두장일 때만 가로가 긴 사진 제한
                items.push({
                    groupIndex,
                    layout: 'coordsImage',
                    imgIndex: getAvailableImageIndex(orientation), // 사용되지 않은 이미지 중에서 선택
                    zIndex: groupIndex,
                    startFrame: Math.floor(timingData.beat_times[beatIdx + i] * fps),
                    coordsPos: coordsPositions[i],
                });
            }
            beatIdx += count;
        }

        // 디버깅: 레이아웃 분포 확인
        console.log('🎬 BeatVideo Layout Types:', layoutTypes);
        console.log('📊 Single count:', layoutTypes.filter(t => t === 'single').length);
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
    }, [fps, safeImages, randomSeed]);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* 배경 음악이 있다면 재생 */}
            {music && <Audio src={staticFile('../public/music.mp3')} />}

            {(() => {
                // 디버깅: 현재 프레임에서 렌더링될 아이템들 필터링
                const visibleItems = renderItems.filter(item => frame >= item.startFrame);
                // console.log(`🎬 Frame ${frame}: 총 ${renderItems.length}개 아이템 중 ${visibleItems.length}개 렌더링`);

                return renderItems.map((item, i) => {
                    if (frame < item.startFrame) return null;

                    const src = safeImages[item.imgIndex]?.url || '';

                    if (item.layout === 'single') {
                        return (
                            <Img
                                key={`single-${item.groupIndex}`}
                                src={src}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center 25%',
                                    borderRadius: 0,
                                    border: 'none',
                                    outline: 'none',
                                    zIndex: item.zIndex,
                                }}
                                draggable={false}
                            />
                        );
                    }

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
                                    top,
                                    left,
                                    objectFit: 'cover',
                                    objectPosition: 'center 25%',
                                    borderRadius: 0,
                                    border: 'none',
                                    outline: 'none',
                                    zIndex: item.zIndex,
                                }}
                                draggable={false}
                            />
                        );
                    }

                    if (item.layout === 'coordsImage') {
                        const { left = 50, top = 50, widthPercent = 50, heightPercent = 50 } = item.coordsPos || {};
                        return (
                            <Img
                                key={`coords-${item.groupIndex}-${item.imgIndex}`}
                                src={src}
                                style={{
                                    position: 'absolute',
                                    width: `${widthPercent}%`,
                                    height: `${heightPercent}%`,
                                    top: `${top}%`,
                                    left: `${left}%`,
                                    transform: 'translate(-50%, -50%)',
                                    objectFit: 'contain',
                                    borderRadius: 0,
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: 'transparent',
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
