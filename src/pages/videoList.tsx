import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage } from 'next';
import styles from '../styles/VideoList.module.css';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import {
    Video,
    getVideos,
    deleteVideo,
    getVideoStatus,
} from '../helpers/api';

const VideoList: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const { user, loading: authLoading } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(false);
    const [renderingProgress, setRenderingProgress] = useState<Record<string, number>>({});

    const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // 영상 목록 조회
    const refreshVideos = async () => {
        if (!safeTripId) return;

        try {
            setLoading(true);
            setError(null);
            const response = await getVideos(safeTripId);
            setVideos(response.content);
            console.log('=== 영상 목록 로드 완료 ===');
            console.log(`총 ${response.content.length}개`);
        } catch (err) {
            console.error('영상 목록 조회 실패:', err);
            setError('영상 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 페이지 로드 시 영상 목록 조회
    useEffect(() => {
        if (!authLoading && user && safeTripId) {
            refreshVideos();
        }
    }, [authLoading, user, safeTripId]);

    // 개별 영상 폴링 시작 함수
    const startPolling = (videoId: string) => {
        // 이미 폴링 중이면 중복 시작 방지
        if (pollingIntervalsRef.current[videoId]) {
            console.log(`⚠️ 이미 폴링 중: videoId=${videoId}`);
            return;
        }

        const intervalId = setInterval(async () => {
            if (!safeTripId) return;

            try {
                const statusResponse = await getVideoStatus(safeTripId, videoId);

                console.log(`📊 진행률 업데이트: videoId=${videoId}, progress=${statusResponse.progress}%, status=${statusResponse.status}`);

                // 진행률 업데이트
                setRenderingProgress(prev => ({
                    ...prev,
                    [videoId]: statusResponse.progress || 0
                }));

                // PROCESSED 또는 FAILED 상태가 되면 폴링 중단 및 목록 갱신
                if (statusResponse.status === 'PROCESSED' || statusResponse.status === 'FAILED') {
                    console.log(`✅ 렌더링 완료: videoId=${videoId}, status=${statusResponse.status}`);
                    clearInterval(pollingIntervalsRef.current[videoId]);
                    delete pollingIntervalsRef.current[videoId];
                    await refreshVideos();
                }
            } catch (error) {
                console.error(`❌ Error polling video ${videoId}:`, error);
            }
        }, 1000); // 1초마다 폴링

        pollingIntervalsRef.current[videoId] = intervalId;
        console.log(`🔄 폴링 시작: videoId=${videoId}`);
    };

    // 모든 영상의 실제 상태 확인 및 RENDERING 영상 폴링 시작
    useEffect(() => {
        if (!safeTripId || videos.length === 0) return;

        // 기존 폴링 모두 중단
        Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval));
        pollingIntervalsRef.current = {};

        // ✅ videoGeneration 방식: 모든 영상의 실제 상태 확인
        const checkVideosStatus = async () => {
            for (const video of videos) {
                try {
                    const statusResponse = await getVideoStatus(safeTripId, video.videoId);

                    console.log(`🔍 영상 상태 확인: videoId=${video.videoId}, status=${statusResponse.status}, progress=${statusResponse.progress}%`);

                    // RENDERING 상태면 폴링 시작
                    if (statusResponse.status === 'RENDERING') {
                        // 진행률 초기값 설정
                        setRenderingProgress(prev => ({
                            ...prev,
                            [video.videoId]: statusResponse.progress || 0
                        }));

                        startPolling(video.videoId);
                    }
                } catch (error) {
                    console.error(`❌ Error checking video status: ${video.videoId}`, error);
                }
            }
        };

        checkVideosStatus();

        // 컴포넌트 언마운트 시 폴링 정리
        return () => {
            Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval));
            pollingIntervalsRef.current = {};
        };
    }, [videos, safeTripId]);

    // 영상 생성하기
    const handleCreateVideo = () => {
        router.push(`/videoGeneration?tripId=${safeTripId}&mode=new`);
    };

    // 영상 클릭 (모달 열기)
    const handleVideoClick = async (video: Video) => {
        // PENDING, RENDERING, FAILED 상태는 삭제 확인
        if (video.status !== 'PROCESSED') {
            if (confirm(`이 영상은 ${getStatusText(video.status)} 상태입니다. 삭제하시겠습니까?`)) {
                await handleDeleteVideo(video.videoId);
            }
            return;
        }

        setSelectedVideo(video);
        setLoadingUrl(true);

        try {
            // 비디오 상태 조회하여 Pre-signed URL 가져오기
            const response = await getVideoStatus(safeTripId!, video.videoId);
            if (response.url) {
                setVideoUrl(response.url);
            } else {
                alert('영상 URL을 가져올 수 없습니다.');
                setSelectedVideo(null);
            }
        } catch (error) {
            console.error('영상 URL 조회 실패:', error);
            alert('영상을 불러오는데 실패했습니다.');
            setSelectedVideo(null);
        } finally {
            setLoadingUrl(false);
        }
    };

    // 모달 닫기
    const handleCloseModal = () => {
        setSelectedVideo(null);
        setVideoUrl(null);
    };

    // 영상 삭제하기
    const handleDeleteVideo = async (videoId: string) => {
        if (!safeTripId) return;

        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deleteVideo(safeTripId, videoId);
            console.log('✅ 영상 삭제 성공');
            setSelectedVideo(null); // 모달 닫기
            setVideoUrl(null);
            await refreshVideos();
        } catch (error) {
            console.error('❌ 영상 삭제 실패:', error);
            alert('영상 삭제에 실패했습니다.');
        }
    };

    // 뒤로가기
    const handleBack = () => {
        router.push(`/record?tripId=${safeTripId}`);
    };

    // 영상 상태 텍스트
    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING':
                return '대기 중';
            case 'RENDERING':
                return '렌더링 중';
            case 'PROCESSED':
                return '완료';
            case 'FAILED':
                return '실패';
            default:
                return status;
        }
    };

    // 영상 상태 배지 스타일
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PROCESSED':
                return styles.badgeSuccess;
            case 'RENDERING':
                return styles.badgeWarning;
            case 'FAILED':
                return styles.badgeDanger;
            default:
                return styles.badgeSecondary;
        }
    };

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>영상 목록 - ODDIYA</title>
                    <meta name="description" content="생성된 영상 목록" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                    <link rel="icon" href="/defaulticon.png" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00EEFF"
                        leftImage={{ src: '/headerimg/blueLeft.png', alt: 'Video List' }}
                        rightImage={{ src: '/headerimg/blueRight.png', alt: 'Video List' }}
                        title="영상 목록"
                        leftButton={{
                            text: "돌아가기",
                            onClick: handleBack
                        }}
                        rightButton={{
                            text: "영상 생성하기",
                            onClick: handleCreateVideo
                        }}
                    />

                    <div className={styles.content}>
                        {/* 에러 메시지 */}
                        {error && (
                            <div className={styles.errorContainer}>
                                <p className={styles.errorMessage}>{error}</p>
                                <button onClick={refreshVideos} className={styles.retryButton}>
                                    다시 시도
                                </button>
                            </div>
                        )}

                        {/* 로딩 상태 */}
                        {loading && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner}></div>
                                <p>영상 목록을 불러오는 중...</p>
                            </div>
                        )}

                        {/* 영상 목록이 없을 때 */}
                        {!loading && !error && videos.length === 0 && (
                            <div className={styles.emptyContainer}>
                                <div className={styles.emptyIcon}>🎬</div>
                                <h3 className={styles.emptyTitle}>아직 생성된 영상이 없습니다</h3>
                                <p className={styles.emptyDescription}>
                                    "영상 생성하기" 버튼을 눌러서 여행 영상을 만들어보세요!
                                </p>
                            </div>
                        )}

                        {/* 영상 갤러리 */}
                        {!loading && !error && videos.length > 0 && (
                            <div className={styles.videoGallery}>
                                {videos.map((video) => (
                                    <div
                                        key={video.videoId}
                                        className={styles.videoCard}
                                        data-status={video.status}
                                        onClick={() => handleVideoClick(video)}
                                        style={{
                                            cursor: 'pointer',
                                            opacity: video.status === 'PROCESSED' ? 1 : 0.6,
                                            position: 'relative'
                                        }}
                                    >
                                        <div className={styles.videoThumbnail}>
                                            {video.status === 'PROCESSED' && video.url ? (
                                                <>
                                                    <video
                                                        src={`${video.url}#t=2`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            borderRadius: '8px 8px 0 0'
                                                        }}
                                                        preload="metadata"
                                                        onLoadedMetadata={(e) => {
                                                            const videoEl = e.currentTarget;
                                                            // 영상 길이의 1/3 지점으로 이동 (더 의미있는 프레임)
                                                            if (videoEl.duration) {
                                                                videoEl.currentTime = videoEl.duration / 3;
                                                            }
                                                        }}
                                                    />
                                                    <div className={styles.playIcon}>
                                                        ▶️
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={styles.playIcon}>
                                                    {video.status === 'RENDERING' ? '⏳' :
                                                        video.status === 'FAILED' ? '❌' : '📹'}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.videoInfo}>
                                            <div className={styles.videoMeta}>
                                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(video.status)}`}>
                                                    {getStatusText(video.status)}
                                                </span>
                                                <span className={styles.videoDate}>
                                                    {new Date(video.createdAt).toLocaleDateString('ko-KR')}
                                                </span>
                                            </div>
                                            {video.status === 'RENDERING' && (
                                                <div className={styles.progressContainer}>
                                                    <div className={styles.progressBar}>
                                                        <div
                                                            className={styles.progressFill}
                                                            style={{ width: `${renderingProgress[video.videoId] || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={styles.progressText}>
                                                        {renderingProgress[video.videoId] || 0}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {video.status !== 'PROCESSED' && (
                                            <button
                                                className={styles.cardDeleteButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`이 영상을 삭제하시겠습니까?`)) {
                                                        handleDeleteVideo(video.videoId);
                                                    }
                                                }}
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 영상 재생 모달 */}
                    {selectedVideo && (
                        <div className={styles.videoModal} onClick={handleCloseModal}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                {loadingUrl ? (
                                    <div className={styles.loadingContainer}>
                                        <div className={styles.spinner}></div>
                                        <p>영상을 불러오는 중...</p>
                                    </div>
                                ) : videoUrl ? (
                                    <div className={styles.modalVideoContainer}>
                                        <video
                                            src={videoUrl}
                                            controls
                                            autoPlay
                                            className={styles.modalVideo}
                                        />
                                        <button className={styles.modalCloseButton} onClick={handleCloseModal}>
                                            ✕
                                        </button>
                                        <button
                                            className={styles.modalDeleteButton}
                                            onClick={() => handleDeleteVideo(selectedVideo.videoId)}
                                        >
                                            🗑️ 삭제하기
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default VideoList;
