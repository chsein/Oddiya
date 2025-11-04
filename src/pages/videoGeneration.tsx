import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage, GetServerSideProps } from 'next';
import { Player } from '@remotion/player';
import styles from '../styles/VideoGeneration.module.css';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { BeatVideo } from '../remotion/MyComp/BeatVideo';

interface Photo {
    id: string;
    url: string;
    name: string;
    timestamp: number;
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
    const [selectedMusic, setSelectedMusic] = useState<MusicOption | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // Remotion inputProps 생성
    const inputProps = {
        photos: photos,
        music: selectedMusic,
        tripId: safeTripId,
    };

    // 음악 옵션들
    const musicOptions: MusicOption[] = [
        { id: '1', name: '기본 음악 1', url: '/music/default1.mp3', duration: 16 },
        { id: '2', name: '기본 음악 2', url: '/music/default2.mp3', duration: 16 },
        { id: '3', name: '기본 음악 3', url: '/music/default3.mp3', duration: 16 },
    ];

    // 이미지 압축 함수
    const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 비율을 유지하면서 크기 조정
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // 이미지 그리기
                ctx?.drawImage(img, 0, 0, width, height);

                // 압축된 이미지를 base64로 변환
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };

            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = URL.createObjectURL(file);
        });
    };

    // localStorage 사용량 확인 함수
    const getStorageSize = (): number => {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    };

    // localStorage 정리 함수
    const cleanupLocalStorage = () => {
        try {
            const keysToRemove: string[] = [];

            // 모든 키를 확인하여 오래된 데이터나 큰 데이터 찾기
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    // trip_ 관련 키들 중에서 현재 tripId가 아닌 것들
                    if (key.startsWith('trip_') && !key.includes(safeTripId || '')) {
                        keysToRemove.push(key);
                    }
                    // 비디오 데이터는 크기가 클 수 있으므로 제거 고려
                    if (key.includes('_video') && !key.includes(safeTripId || '')) {
                        keysToRemove.push(key);
                    }
                }
            }

            // 오래된 데이터 제거
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🗑️ 제거된 키: ${key}`);
            });

            console.log(`🧹 localStorage 정리 완료. ${keysToRemove.length}개 항목 제거`);

        } catch (err) {
            console.error('Error cleaning up localStorage:', err);
        }
    };

    // 이미지의 aspectRatio를 계산하는 함수
    const calculateAspectRatio = (url: string): Promise<number> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                console.log(`📏 Image loaded: ${img.naturalWidth}x${img.naturalHeight}, aspectRatio: ${aspectRatio}`);
                resolve(aspectRatio);
            };
            img.onerror = () => {
                console.log('❌ Image load failed, using default aspectRatio');
                resolve(16 / 9); // 기본값
            };
            img.src = url;
        });
    };

    // localStorage에서 사진 불러오기
    useEffect(() => {
        const loadPhotos = async () => {
            if (!safeTripId) return;

            try {
                const tripKey = `trip_${safeTripId}_photos`;
                const storedPhotos = localStorage.getItem(tripKey);

                if (storedPhotos) {
                    const parsedPhotos = JSON.parse(storedPhotos);

                    // 각 사진의 aspectRatio 계산
                    const photosWithAspectRatio = await Promise.all(
                        parsedPhotos.map(async (photo: Photo) => {
                            const aspectRatio = await calculateAspectRatio(photo.url);
                            return {
                                ...photo,
                                aspectRatio,
                                orientation: aspectRatio > 1 ? 'landscape' : 'portrait'
                            };
                        })
                    );

                    setPhotos(photosWithAspectRatio);
                    console.log('=== 로드된 사진들 (aspectRatio 포함) ===');
                    console.log(photosWithAspectRatio);

                    // localStorage 사용량 확인
                    const storageSize = getStorageSize();
                    console.log(`📊 localStorage 사용량: ${(storageSize / 1024 / 1024).toFixed(2)}MB`);

                    if (storageSize > 5 * 1024 * 1024) { // 5MB 초과 시 경고
                        console.warn('⚠️ localStorage 사용량이 5MB를 초과했습니다. 일부 데이터가 삭제될 수 있습니다.');
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'QuotaExceededError') {
                    console.error('❌ localStorage 용량 초과:', err);
                    alert('저장된 사진이 너무 많습니다. 일부 사진을 삭제하고 다시 시도해주세요.');
                } else {
                    console.error('Error loading photos:', err);
                }
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

    // 음악 선택
    const handleMusicSelect = (music: MusicOption) => {
        setSelectedMusic(music);
    };


    // 영상 생성하기
    const handleGenerateVideo = async () => {
        if (photos.length === 0) {
            alert('사진이 없습니다. 먼저 사진을 추가해주세요.');
            return;
        }

        if (!selectedMusic) {
            alert('음악을 선택해주세요.');
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
                    {/* localStorage 정리 버튼 */}
                    <div className={styles.storageControls}>
                        <button
                            className={styles.cleanupButton}
                            onClick={cleanupLocalStorage}
                            title="오래된 데이터를 정리하여 저장 공간을 확보합니다"
                        >
                            🧹 저장공간 정리
                        </button>
                        <div className={styles.storageInfo}>
                            사용량: {(getStorageSize() / 1024 / 1024).toFixed(2)}MB
                        </div>
                    </div>

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
                        <div className={styles.videoContainer}>
                            <div className={styles.videoPreview}>
                                <h3 className={styles.previewTitle}>생성된 영상 미리보기</h3>
                                <div className={styles.playerContainer}>
                                    {refreshKey > 0 && (
                                        <Player
                                            key={`player-${refreshKey}`}
                                            component={BeatVideo}
                                            inputProps={inputProps}
                                            durationInFrames={450}
                                            fps={30}
                                            compositionHeight={1080}
                                            compositionWidth={1920}
                                            style={{
                                                width: '100%',
                                                maxWidth: '600px',
                                                height: 'auto',
                                                aspectRatio: '16/9',
                                            }}
                                            controls
                                            autoPlay
                                            loop
                                        />
                                    )}
                                </div>
                            </div>
                            <div className={styles.videoActions}>
                                <button
                                    className={styles.downloadButton}
                                    onClick={handleDownloadVideo}
                                >
                                    📥 다운로드
                                </button>
                                <button
                                    className={styles.regenerateButton}
                                    onClick={() => setShowWarning(true)}
                                >
                                    🔄 다시 만들기
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.generationContainer}>
                            <div className={styles.photoCount}>
                                📷 총 {photos.length}장의 사진이 준비되었습니다
                            </div>

                            <div className={styles.musicSelection}>
                                <h3 className={styles.musicTitle}>음악 선택</h3>
                                <div className={styles.musicOptions}>
                                    {musicOptions.map((music) => (
                                        <button
                                            key={music.id}
                                            className={`${styles.musicOption} ${selectedMusic?.id === music.id ? styles.selected : ''
                                                }`}
                                            onClick={() => handleMusicSelect(music)}
                                        >
                                            <div className={styles.musicIcon}>🎵</div>
                                            <div className={styles.musicName}>{music.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.warningBox}>
                                <div className={styles.warningIcon}>⚠️</div>
                                <div className={styles.warningText}>
                                    한 번 생성하면 재생성은 불가능합니다.<br />
                                    신중하게 선택해주세요!
                                </div>
                            </div>

                            <button
                                className={styles.generateButton}
                                onClick={handleGenerateVideo}
                                disabled={!selectedMusic}
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
