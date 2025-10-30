import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface BeatVideoProps {
    photos: Array<{
        id: string;
        url: string;
        name: string;
        timestamp: number;
    }>;
    music: {
        id: string;
        name: string;
        url: string;
        duration: number;
    } | null;
    tripId: string | undefined;
}

export const BeatVideo: React.FC<BeatVideoProps> = ({ photos, music, tripId }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // 비트에 맞춰 사진이 전환되는 애니메이션
    const photoIndex = Math.floor((frame / fps) * 2) % photos.length; // 2초마다 사진 변경
    const currentPhoto = photos[photoIndex];

    // 페이드 인/아웃 효과
    const fadeInOut = interpolate(
        frame % (fps * 2), // 2초 주기
        [0, fps * 0.2, fps * 1.8, fps * 2], // 0.2초 페이드인, 1.8초 표시, 0.2초 페이드아웃
        [0, 1, 1, 0],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    // 줌 인 효과
    const zoom = interpolate(
        frame % (fps * 2),
        [0, fps * 2],
        [1.1, 1.3],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    // 비트에 맞춘 스케일 애니메이션
    const beatScale = interpolate(
        frame % (fps * 0.5), // 0.5초마다 비트
        [0, fps * 0.1, fps * 0.4],
        [1, 1.05, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    const containerStyle: React.CSSProperties = {
        backgroundColor: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    };

    const imageStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${zoom * beatScale})`,
        opacity: fadeInOut,
    };

    const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(45deg, rgba(0, 238, 255, 0.1), rgba(0, 153, 204, 0.1))',
        opacity: fadeInOut,
    };

    const titleStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: '48px',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        textAlign: 'center',
        opacity: fadeInOut,
        fontFamily: 'Arial, sans-serif',
    };

    if (!currentPhoto) {
        return (
            <AbsoluteFill style={containerStyle}>
                <div style={titleStyle}>사진을 추가해주세요</div>
            </AbsoluteFill>
        );
    }

    return (
        <AbsoluteFill style={containerStyle}>
            <img src={currentPhoto.url} alt={currentPhoto.name} style={imageStyle} />
            <div style={overlayStyle} />
            <div style={titleStyle}>
                {tripId ? `여행 ${tripId}` : 'ODDIYA'}
            </div>
        </AbsoluteFill>
    );
};
