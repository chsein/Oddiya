import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage, GetServerSideProps } from 'next';
import { Player } from '@remotion/player';
import styles from '../styles/VideoGeneration.module.css';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { BeatVideo } from '../remotion/MyComp/BeatVideo';
import {
    getPhotos,
    renderVideo,
    getVideoStatus,
    getVideos,
    type RenderVideoRequest,
    type VideoStatusResponse
} from '../helpers/api';
import { DURATION_IN_FRAMES, VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from '../types/constants';

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
    const { tripId, mode } = router.query;
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [showPreview, setShowPreview] = useState(false);  // Remotion Player 미리보기 표시
    const [isSaving, setIsSaving] = useState(false);  // 백엔드 저장 중 (렌더링)
    const [videoStatus, setVideoStatus] = useState<VideoStatusResponse | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;
    const isNewMode = mode === 'new';  // 새 영상 생성 모드

    // Remotion inputProps 생성 - useMemo로 감싸서 photos가 변경될 때만 재생성
    const inputProps = useMemo(() => ({
        title: '',
        images: photos.length > 0 ? photos.map(photo => ({
            url: photo.url,
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

    // 기존 비디오 확인
    useEffect(() => {
        const checkExistingVideo = async () => {
            if (!safeTripId) return;

            try {
                const response = await getVideos(safeTripId, 0, 1);
                if (response.content.length > 0) {
                    const latestVideo = response.content[0];

                    // 최신 비디오 상태 가져오기
                    const statusResponse = await getVideoStatus(safeTripId, latestVideo.videoId);
                    setVideoStatus(statusResponse);

                    // RENDERING 상태면 폴링 시작
                    if (statusResponse.status === 'RENDERING') {
                        setIsSaving(true);
                        startPolling(statusResponse.videoId);
                    }
                }
            } catch (err) {
                console.error('Error checking existing video:', err);
            }
        };

        checkExistingVideo();
    }, [safeTripId]);

    // 폴링 시작
    const startPolling = (videoId: string) => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(async () => {
            if (!safeTripId) return;

            try {
                const status = await getVideoStatus(safeTripId, videoId);
                setVideoStatus(status);

                // PROCESSED나 FAILED 상태면 폴링 중단
                if (status.status === 'PROCESSED' || status.status === 'FAILED') {
                    stopPolling();
                    setIsSaving(false);

                    if (status.status === 'FAILED') {
                        setErrorMessage(status.errorMessage || '영상 생성에 실패했습니다.');
                    }
                }
            } catch (err) {
                console.error('Error polling video status:', err);
                stopPolling();
                setIsSaving(false);
                setErrorMessage('영상 상태 확인 중 오류가 발생했습니다.');
            }
        }, 1000); // 1초마다 폴링
    };

    // 폴링 중단
    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // 컴포넌트 언마운트 시 폴링 정리
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);

    // 뒤로가기
    const handleBack = () => {
        router.push(`/record?tripId=${safeTripId}`);
    };


    // 영상 미리보기 생성 (Remotion Player)
    const handleGenerateVideo = () => {
        if (photos.length === 0) {
            alert('사진이 없습니다. 먼저 사진을 추가해주세요.');
            return;
        }

        // 이미 완료된 영상이 있으면 경고
        if (videoStatus?.status === 'PROCESSED') {
            setShowWarning(true);
            return;
        }

        // Remotion Player 미리보기 표시
        setShowPreview(true);
        setRefreshKey(prev => prev + 1);
    };

    // 영상 저장하기 (백엔드 렌더링 요청)
    const handleSaveVideo = async () => {
        if (!safeTripId) {
            alert('Trip ID가 없습니다.');
            return;
        }

        setIsSaving(true);
        setShowPreview(false);  // 미리보기 숨김
        setErrorMessage(null);

        try {
            // API 요청 준비
            const request: RenderVideoRequest = {
                composition: 'BeatVideo',
                inputProps: {
                    title: '',
                    images: photos.map(photo => ({
                        url: photo.url,
                        orientation: photo.orientation || 'landscape',
                        aspectRatio: photo.aspectRatio || 16 / 9
                    })),
                    music: '/music.mp3',
                    tripId: safeTripId,
                }
            };

            // 백엔드 렌더링 요청 (202 Accepted 응답)
            const response = await renderVideo(safeTripId, request);
            setVideoStatus(response);

            // 폴링 시작
            startPolling(response.videoId);

        } catch (error) {
            console.error('Error saving video:', error);
            setErrorMessage('영상 저장 요청에 실패했습니다. 다시 시도해주세요.');
            setIsSaving(false);
            setShowPreview(true);  // 미리보기로 돌아가기
        }
    };

    // 영상 다운로드
    const handleDownloadVideo = () => {
        if (videoStatus?.url) {
            const link = document.createElement('a');
            link.href = videoStatus.url;
            link.download = `trip_${safeTripId}_video.mp4`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // 경고 모달 닫기
    const handleCloseWarning = () => {
        setShowWarning(false);
    };

    // 재생성 확인
    const handleConfirmRegeneration = () => {
        setShowWarning(false);
        setVideoStatus(null);
        setErrorMessage(null);
        setRefreshKey(prev => prev + 1);
        // 미리보기 바로 표시 (최초 생성과 동일한 흐름)
        setShowPreview(true);
    };

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>영상 생성하기 - ODDIYA</title>
                    <meta name="description" content="여행 사진으로 영상을 만들어보세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                    <link rel="icon" href="/defaulticon.png" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00EEFF"
                        leftImage={{ src: '/headerimg/blueLeft.png', alt: 'Video Generation' }}
                        rightImage={{ src: '/headerimg/blueRight.png', alt: 'Video Generation' }}
                        title="영상 생성하기"
                        leftButton={{
                            text: "돌아가기",
                            onClick: handleBack
                        }}
                        rightButton={videoStatus?.status === 'PROCESSED' ? {
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
                        ) : showPreview ? (
                            <div className={styles.previewContainer}>
                                <h3 className={styles.previewTitle}>🎬 영상 미리보기</h3>
                                <div className={styles.remotionPlayerWrapper}>
                                    <Player
                                        key={refreshKey}
                                        component={BeatVideo}
                                        inputProps={inputProps}
                                        durationInFrames={DURATION_IN_FRAMES}
                                        fps={VIDEO_FPS}
                                        compositionWidth={VIDEO_WIDTH}
                                        compositionHeight={VIDEO_HEIGHT}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                        controls
                                        loop
                                    />
                                </div>
                                <div className={styles.previewActions}>
                                    <button
                                        className={styles.retryButton}
                                        onClick={() => {
                                            setShowPreview(false);
                                            setRefreshKey(prev => prev + 1);
                                        }}
                                    >
                                        🔄 다시 만들기
                                    </button>
                                    <button
                                        className={styles.saveButton}
                                        onClick={handleSaveVideo}
                                    >
                                        💾 저장하기
                                    </button>
                                </div>
                            </div>
                        ) : isSaving || videoStatus?.status === 'RENDERING' ? (
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
                                            style={{ width: `${videoStatus?.progress || 0}%` }}
                                        ></div>
                                    </div>
                                    <span className={styles.progressText}>{videoStatus?.progress || 0}%</span>
                                </div>
                            </div>
                        ) : videoStatus?.status === 'FAILED' ? (
                            <div className={styles.emptyContainer}>
                                <div className={styles.emptyIcon}>❌</div>
                                <h3 className={styles.emptyTitle}>영상 생성 실패</h3>
                                <p className={styles.emptyDescription}>
                                    {errorMessage || '영상 생성 중 문제가 발생했습니다.'}
                                </p>
                                <button
                                    className={styles.generateButton}
                                    onClick={handleGenerateVideo}
                                >
                                    🔄 다시 시도하기
                                </button>
                            </div>
                        ) : videoStatus?.status === 'PROCESSED' && videoStatus.url && !isNewMode ? (
                            <div className={styles.videoWrapper}>
                                <video
                                    key={`video-${refreshKey}`}
                                    src={videoStatus.url}
                                    controls
                                    autoPlay
                                    loop
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        maxWidth: '100%',
                                        aspectRatio: '16/9',
                                        objectFit: 'contain',
                                        borderRadius: '8px',
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>
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
                                                    src={photo.thumbnailUrl || photo.url}
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
                                <div className={styles.modalIcon}>📹</div>
                                <h3 className={styles.modalTitle}>새 영상 생성</h3>
                                <p className={styles.modalDescription}>
                                    이미 생성된 영상이 있습니다.<br />
                                    새로운 영상을 추가로 생성하시겠습니까?
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
                                        생성하기
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
