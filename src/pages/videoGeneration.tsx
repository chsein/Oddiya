import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage, GetServerSideProps } from 'next';
import { Player } from '@remotion/player';
import styles from '../styles/VideoGeneration.module.css';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { BeatVideo } from '../remotion/MyComp/BeatVideo';
import { getPhotos } from '../helpers/api';

interface Photo {
    id: string;
    url: string;
    thumbnailUrl?: string;
    fileName: string;
    aspectRatio?: number;
    orientation?: 'landscape' | 'portrait';
}

interface MusicOption {
    id: string;
    name: string;
    url: string;
    duration: number;
}

const VideoGeneration: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // Remotion inputProps 생성 - useMemo로 감싸서 photos가 변경될 때만 재생성
    const inputProps = useMemo(() => ({
        title: '',
        images: photos.length > 0 ? photos.map(photo => ({
            url: `/api/image-proxy?url=${encodeURIComponent(photo.url)}`,
            orientation: photo.orientation || 'landscape',
            aspectRatio: photo.aspectRatio || 16 / 9
        })) : [],
        music: '/music.mp3', // public 폴더의 음악 파일
        tripId: safeTripId,
    }), [photos, safeTripId]);

    // 서버에서 사진 불러오기
    useEffect(() => {
        const loadPhotos = async () => {
            if (!safeTripId) return;

            try {
                const response = await getPhotos(safeTripId);
                const fetchedPhotos = response.content.map((photo: any) => ({
                    id: photo.id,
                    url: photo.url,
                    thumbnailUrl: photo.thumbnailUrl,
                    fileName: photo.fileName,
                    aspectRatio: 16 / 9, // 기본 비율
                    orientation: 'landscape' as const
                }));

                setPhotos(fetchedPhotos);
                console.log('=== 서버에서 로드된 사진들 ===');
                console.log(fetchedPhotos);
            } catch (err) {
                console.error('Error loading photos:', err);
            }
        };

        loadPhotos();
    }, [safeTripId]);

    // 영상 생성 여부 확인
    useEffect(() => {
        if (!safeTripId) return;

        try {
            const tripKey = `trip_${safeTripId}_video`;
            const generatedVideo = localStorage.getItem(tripKey);
            if (generatedVideo) {
                setIsGenerated(true);
                // Blob URL로 변환
                const blob = new Blob([generatedVideo], { type: 'video/mp4' });
                setVideoBlob(blob);
            }
        } catch (err) {
            console.error('Error checking generated video:', err);
        }
    }, [safeTripId]);

    // 뒤로가기
    const handleBack = () => {
        router.push(`/record?tripId=${safeTripId}`);
    };


    // 영상 생성하기
    const handleGenerateVideo = async () => {
        if (photos.length === 0) {
            alert('사진이 없습니다. 먼저 사진을 추가해주세요.');
            return;
        }

        if (isGenerated) {
            setShowWarning(true);
            return;
        }

        setIsGenerating(true);
        setDownloadProgress(0);
        setRefreshKey(prev => prev + 1); // Player 컴포넌트 새로고침

        try {
            // 시뮬레이션: 실제로는 서버에서 Remotion 렌더링
            // 현재는 진행률만 시뮬레이션하고 더미 영상 생성
            const totalSteps = 100;

            for (let step = 0; step <= totalSteps; step++) {
                setDownloadProgress(step);
                await new Promise(resolve => setTimeout(resolve, 50)); // 50ms 간격
            }

            // 더미 영상 Blob 생성 (실제로는 서버에서 생성된 영상)
            const dummyVideoData = new Uint8Array(1024 * 1024); // 1MB 더미 데이터
            const blob = new Blob([dummyVideoData], { type: 'video/mp4' });

            setVideoBlob(blob);
            setIsGenerating(false);
            setIsGenerated(true);

            // localStorage에 영상 생성 완료 저장 (Blob을 base64로 변환)
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const tripKey = `trip_${safeTripId}_video`;
                    localStorage.setItem(tripKey, reader.result as string);
                } catch (err) {
                    console.error('Error saving video:', err);
                }
            };
            reader.readAsDataURL(blob);

        } catch (error) {
            console.error('Error generating video:', error);
            alert('영상 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
            setIsGenerating(false);
        }
    };

    // 영상 다운로드
    const handleDownloadVideo = () => {
        if (videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `trip_${safeTripId}_video.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    // 경고 모달 닫기
    const handleCloseWarning = () => {
        setShowWarning(false);
    };

    // 재생성 확인
    const handleConfirmRegeneration = () => {
        setShowWarning(false);
        setIsGenerated(false);
        setVideoBlob(null);
        setDownloadProgress(0);
        setRefreshKey(prev => prev + 1); // Player 컴포넌트 새로고침

        // localStorage에서 영상 데이터 삭제
        try {
            const tripKey = `trip_${safeTripId}_video`;
            localStorage.removeItem(tripKey);
        } catch (err) {
            console.error('Error removing video:', err);
        }
    };

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>영상 생성하기 - ODDIYA</title>
                    <meta name="description" content="여행 사진으로 영상을 만들어보세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00EEFF"
                        leftIcons={['⛰️']}
                        rightIcons={['☁️', '⚓']}
                        title="영상 생성하기"
                        leftButton={{
                            text: "돌아가기",
                            onClick: handleBack
                        }}
                        rightButton={isGenerated ? {
                            text: "다운로드",
                            onClick: handleDownloadVideo
                        } : undefined}
                    />

                    <div className={styles.content}>
                        {photos.length === 0 ? (
                            <div className={styles.emptyContainer}>
                                <div className={styles.emptyIcon}>📷</div>
                                <h3 className={styles.emptyTitle}>사진이 없습니다</h3>
                                <p className={styles.emptyDescription}>
                                    먼저 사진을 추가한 후 영상을 생성해주세요.
                                </p>
                                <button
                                    className={styles.goToRecordButton}
                                    onClick={() => router.push(`/record?tripId=${safeTripId}`)}
                                >
                                    사진 추가하러 가기
                                </button>
                            </div>
                        ) : isGenerating ? (
                            <div className={styles.loadingContainer}>
                                <div className={styles.loadingSpinner}></div>
                                <h3 className={styles.loadingTitle}>영상 생성 중...</h3>
                                <p className={styles.loadingDescription}>
                                    잠시만 기다려주세요. 곧 완성됩니다!
                                </p>
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${downloadProgress}%` }}
                                        ></div>
                                    </div>
                                    <span className={styles.progressText}>{downloadProgress}%</span>
                                </div>
                            </div>
                        ) : isGenerated && videoBlob ? (
                            <div className={styles.videoWrapper}>
                                <Player
                                    key={`player-${refreshKey}`}
                                    component={BeatVideo as React.ComponentType<any>}
                                    inputProps={inputProps}
                                    durationInFrames={450}
                                    fps={30}
                                    compositionHeight={1080}
                                    compositionWidth={1920}
                                    style={{
                                        width: 'auto',
                                        height: '100%',
                                        maxWidth: '100%',
                                        aspectRatio: '16/9',
                                        objectFit: 'contain',
                                    }}
                                    controls
                                    autoPlay
                                    loop
                                    acknowledgeRemotionLicense
                                />
                                <button
                                    className={styles.regenerateButtonSmall}
                                    onClick={() => setShowWarning(true)}
                                    title="재생성하기"
                                >
                                    🔄
                                </button>
                            </div>
                        ) : (
                            <div className={styles.generationContainer}>
                                {/* 사진 미리보기 */}
                                <div className={styles.photoPreview}>
                                    <h3 className={styles.previewTitle}>
                                        📷 선택된 사진 ({photos.length}장)
                                    </h3>
                                    <div className={styles.photoGrid}>
                                        {photos.map((photo, index) => (
                                            <div key={photo.id} className={styles.photoItem}>
                                                <img
                                                    src={`/api/image-proxy?url=${encodeURIComponent(photo.thumbnailUrl || photo.url)}`}
                                                    alt={photo.fileName}
                                                    className={styles.previewImage}
                                                />
                                                <div className={styles.photoNumber}>{index + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className={styles.generateButton}
                                    onClick={handleGenerateVideo}
                                >
                                    🎬 영상 생성하기
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 경고 모달 */}
                    {showWarning && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modalContent}>
                                <div className={styles.modalIcon}>⚠️</div>
                                <h3 className={styles.modalTitle}>재생성 확인</h3>
                                <p className={styles.modalDescription}>
                                    이미 생성된 영상이 있습니다.<br />
                                    다시 만들면 기존 영상이 삭제됩니다.<br />
                                    정말 계속하시겠습니까?
                                </p>
                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.cancelButton}
                                        onClick={handleCloseWarning}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className={styles.confirmButton}
                                        onClick={handleConfirmRegeneration}
                                    >
                                        계속하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default VideoGeneration;

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        props: {},
    };
};
