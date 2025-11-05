import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo, useState, useEffect } from 'react';
import { z } from "zod";
import { CompositionProps } from "../../../types/constants";

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

        // 사용 가능한 이미지 중에서 랜덤으로 선택하는 함수
        const getRandomImageIndex = (orientation?: 'landscape' | 'portrait', avoidRecent: boolean = true): number => {
            // orientation에 맞는 이미지 필터링
            let candidateImages = orientation
                ? safeImages.filter((img, idx) => img?.orientation === orientation)
                : safeImages;

            // orientation에 맞는 이미지가 없으면 모든 이미지 사용
            if (candidateImages.length === 0) {
                candidateImages = safeImages;
            }

            // 최근 사용된 이미지 제외 (옵션)
            const recentUsed = Array.from(usedImages).slice(-5); // 최근 5개만 체크
            let availableImages = avoidRecent && recentUsed.length > 0
                ? candidateImages.filter((img) => !recentUsed.includes(safeImages.indexOf(img)))
                : candidateImages;

            // 사용 가능한 이미지가 없으면 모든 후보 이미지 사용
            if (availableImages.length === 0) {
                availableImages = candidateImages;
            }

            // 완전 랜덤 선택
            const randomIndex = Math.floor(Math.random() * availableImages.length);
            const selectedImage = availableImages[randomIndex];
            const originalIndex = safeImages.indexOf(selectedImage);

            // 최근 사용 목록에 추가 (최대 10개까지만 유지)
            usedImages.add(originalIndex);
            if (usedImages.size > 10) {
                const firstItem = usedImages.values().next().value;
                usedImages.delete(firstItem);
            }

            return originalIndex;
        };

        let beatIdx = 0;
        const layoutTypes: string[] = [];

        while (beatIdx < timingData.beat_times.length) {
            const groupIndex = beatIdx;
            let layoutType: 'single' | 'grid' | 'coords';
            let layoutSubType: 'fullscreen' | 'center1' | 'center2' | 'diagonal' | '2x2' | '1x4' | null = null;

            // 확률 기반 레이아웃 결정 (0-99)
            const randomValue = getSeededRandomInt(groupIndex * 99 + randomSeed, 0, 99);

            if (randomValue < 10) {
                // 0-9: 10% - 꽉차게 한장 (fullscreen)
                layoutType = 'single';
                layoutSubType = 'fullscreen';
            } else if (randomValue < 20) {
                // 10-19: 10% - 중간 한장 (center1)
                layoutType = 'coords';
                layoutSubType = 'center1';
            } else if (randomValue < 40) {
                // 20-39: 20% - 중간 두장 (center2)
                layoutType = 'coords';
                layoutSubType = 'center2';
            } else if (randomValue < 70) {
                // 40-69: 30% - 2x2 그리드
                layoutType = 'grid';
                layoutSubType = '2x2';
            } else if (randomValue < 80) {
                // 70-79: 10% - 1x4 그리드
                layoutType = 'grid';
                layoutSubType = '1x4';
            } else {
                // 80-99: 20% - 대각선 두장
                layoutType = 'coords';
                layoutSubType = 'diagonal';
            }

            console.log(`🎲 Beat ${groupIndex}: layout: ${layoutType}, subType: ${layoutSubType}, randomValue: ${randomValue}`);

            console.log(`🎲 Beat ${groupIndex}: layout: ${layoutType}, subType: ${layoutSubType}, randomValue: ${randomValue}`);

            layoutTypes.push(`${layoutType}-${layoutSubType}`);

            const startFrame = Math.floor(timingData.beat_times[beatIdx] * fps);

            // 꽉차게 한장 (fullscreen single)
            if (layoutType === 'single' && layoutSubType === 'fullscreen') {
                items.push({
                    groupIndex,
                    layout: 'single',
                    imgIndex: getRandomImageIndex('landscape'),
                    zIndex: groupIndex,
                    startFrame,
                });
                beatIdx += 1;
                continue;
            }

            // 그리드 레이아웃
            if (layoutType === 'grid') {
                const gridType = layoutSubType === '1x4' ? '1x4' : '2x2';
                const count = 4;
                console.log(`🎯 Grid layout - type: ${gridType}, count: ${count}, groupIndex: ${groupIndex}`);

                // 그리드용 이미지들을 랜덤으로 선택
                for (let i = 0; i < count; i++) {
                    if (beatIdx + i >= timingData.beat_times.length) break;
                    const orientation = gridType === '2x2' ? 'landscape' : 'portrait';
                    items.push({
                        groupIndex,
                        layout: 'gridImage',
                        imgIndex: getRandomImageIndex(orientation), // 완전 랜덤 선택
                        zIndex: groupIndex,
                        startFrame: Math.floor(timingData.beat_times[beatIdx + i] * fps),
                        gridIdx: i,
                        gridType,
                    });
                }
                beatIdx += count;
                continue;
            }

            // coords layout (중간 한장, 중간 두장, 대각선)
            let count = 1;
            let coordsPositions;

            if (layoutSubType === 'center1') {
                // 중간 한장
                count = 1;
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
                        widthPercent: 57,
                        heightPercent: 100
                    }];
                }
            } else if (layoutSubType === 'center2') {
                // 중간 두장 (상하 배치)
                count = 2;
                coordsPositions = [
                    { left: 50, top: 30, widthPercent: 70, heightPercent: 35 },
                    { left: 50, top: 70, widthPercent: 70, heightPercent: 35 },
                ];
            } else {
                // 대각선 두장
                count = 2;
                coordsPositions = [
                    { left: 25, top: 30, widthPercent: 80, heightPercent: 50 },
                    { left: 75, top: 70, widthPercent: 80, heightPercent: 50 },
                ];
            }

            console.log(`🎯 Coords layout - subType: ${layoutSubType}, count: ${count}, groupIndex: ${groupIndex}`);

            for (let i = 0; i < count; i++) {
                if (beatIdx + i >= timingData.beat_times.length) break;
                const orientation = count === 2 ? 'landscape' : undefined; // 대각선 두장일 때만 가로가 긴 사진 제한
                items.push({
                    groupIndex,
                    layout: 'coordsImage',
                    imgIndex: getRandomImageIndex(orientation), // 완전 랜덤 선택
                    zIndex: groupIndex,
                    startFrame: Math.floor(timingData.beat_times[beatIdx + i] * fps),
                    coordsPos: coordsPositions[i],
                });
            }
            beatIdx += count;
        }

        // 디버깅: 레이아웃 분포 확인
        console.log('🎬 BeatVideo Layout Types:', layoutTypes);
        console.log('📊 Layout distribution:');
        console.log('  - Fullscreen (꽉차게 한장):', layoutTypes.filter(t => t.includes('fullscreen')).length);
        console.log('  - Center1 (중간 한장):', layoutTypes.filter(t => t.includes('center1')).length);
        console.log('  - Center2 (중간 두장):', layoutTypes.filter(t => t.includes('center2')).length);
        console.log('  - 2x2 Grid:', layoutTypes.filter(t => t.includes('2x2')).length);
        console.log('  - 1x4 Grid:', layoutTypes.filter(t => t.includes('1x4')).length);
        console.log('  - Diagonal (대각선):', layoutTypes.filter(t => t.includes('diagonal')).length);
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
            {music && <Audio src={music} />}

            {(() => {
                // 디버깅: 현재 프레임에서 렌더링될 아이템들 필터링
                const visibleItems = renderItems.filter(item => frame >= item.startFrame);
                console.log(`🎬 Frame ${frame}: 총 ${renderItems.length}개 아이템 중 ${visibleItems.length}개 렌더링`);

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
