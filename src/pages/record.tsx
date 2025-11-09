import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage } from 'next';
import styles from '../styles/Record.module.css';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import {
    Photo,
    Video,
    requestPhotoUploadUrl,
    uploadPhotoToS3,
    confirmPhotoUpload,
    getPhotos,
    deletePhoto,
    getVideos,
} from '../helpers/api';

const Record: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const { user, loading: authLoading } = useAuth();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 영상 존재 여부 계산
    const hasVideos = videos.length > 0;

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // 사진 목록 조회
    const refreshPhotos = async () => {
        if (!safeTripId) return;

        try {
            setLoading(true);
            setError(null);
            const response = await getPhotos(safeTripId);
            setPhotos(response.content);
            console.log('=== 사진 목록 로드 완료 ===');
            console.log(`총 ${response.content.length}장`);
        } catch (err) {
            console.error('사진 목록 조회 실패:', err);
            setError('사진 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 영상 목록 조회
    const refreshVideos = async () => {
        if (!safeTripId) return;

        try {
            const response = await getVideos(safeTripId);
            setVideos(response.content);
            console.log('=== 영상 목록 로드 완료 ===');
            console.log(`총 ${response.content.length}개`);
        } catch (err) {
            console.error('영상 목록 조회 실패:', err);
            // 영상 목록 조회 실패는 치명적이지 않으므로 에러 메시지 표시 안함
        }
    };

    // 페이지 로드 시 사진 및 영상 목록 조회
    useEffect(() => {
        if (!authLoading && user && safeTripId) {
            refreshPhotos();
            refreshVideos();
        }
    }, [authLoading, user, safeTripId]);

    // 사진 추가 버튼 클릭
    const handleAddPhoto = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // 영상 생성하기
    const handleCreateVideo = () => {
        router.push(`/videoGeneration?tripId=${safeTripId}`);
    };

    // 영상 목록 보기
    const handleViewVideoList = () => {
        router.push(`/videoList?tripId=${safeTripId}`);
    };

    // 파일 선택 처리
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // 사진 개수 제한 (최대 20장)
        if (photos.length + files.length > 20) {
            alert('최대 20장까지만 추가할 수 있습니다.');
            return;
        }

        if (!safeTripId) {
            alert('여행 정보가 없습니다.');
            return;
        }

        setUploading(true);
        setError(null);

        const uploadResults: { success: number; failed: number; errors: string[] } = {
            success: 0,
            failed: 0,
            errors: [],
        };

        // 파일들을 순차적으로 업로드
        for (const file of Array.from(files)) {
            try {
                // 파일 크기 검증 (20MB)
                if (file.size > 20 * 1024 * 1024) {
                    uploadResults.failed++;
                    uploadResults.errors.push(`${file.name}: 파일 크기가 20MB를 초과합니다.`);
                    continue;
                }

                // 파일 타입 검증
                if (!file.type.startsWith('image/')) {
                    uploadResults.failed++;
                    uploadResults.errors.push(`${file.name}: 이미지 파일만 업로드 가능합니다.`);
                    continue;
                }

                console.log(`=== ${file.name} 업로드 시작 ===`);

                // 요청 데이터 디버깅
                const requestData = {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                };
                console.log('📤 업로드 요청 데이터:', requestData);
                console.log('  - fileName:', file.name);
                console.log('  - fileType:', file.type);
                console.log('  - fileSize:', file.size, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

                // 1. Pre-signed URL 요청
                const uploadUrlResponse = await requestPhotoUploadUrl(safeTripId, requestData);

                console.log('✅ Pre-signed URL 생성 성공');

                // 2. S3/MinIO에 직접 업로드
                await uploadPhotoToS3(uploadUrlResponse.uploadUrl, file, file.type);

                console.log('✅ S3 업로드 성공');

                // 3. 업로드 확인
                await confirmPhotoUpload(safeTripId, uploadUrlResponse.photoId);

                console.log('✅ 업로드 확인 완료');

                uploadResults.success++;
            } catch (error) {
                console.error(`❌ ${file.name} 업로드 실패:`, error);
                uploadResults.failed++;
                uploadResults.errors.push(`${file.name}: 업로드 실패`);
            }
        }

        // 업로드 완료 후 목록 새로고침
        await refreshPhotos();

        setUploading(false);

        // 결과 메시지 표시
        if (uploadResults.failed > 0) {
            const errorMsg = `업로드 완료: 성공 ${uploadResults.success}개, 실패 ${uploadResults.failed}개\n\n실패 목록:\n${uploadResults.errors.join('\n')}`;
            alert(errorMsg);
        } else if (uploadResults.success > 0) {
            console.log(`🎉 모든 사진 업로드 성공 (${uploadResults.success}개)`);
        }

        // 파일 입력 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 사진 클릭 (모달 열기)
    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    // 모달 닫기
    const handleCloseModal = () => {
        setSelectedPhoto(null);
    };

    // 사진 삭제하기
    const handleDeletePhoto = async (photoId: string) => {
        if (!safeTripId) return;

        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deletePhoto(safeTripId, photoId);
            console.log('✅ 사진 삭제 성공');
            setSelectedPhoto(null); // 모달 닫기
            await refreshPhotos();
        } catch (error) {
            console.error('❌ 사진 삭제 실패:', error);
            alert('사진 삭제에 실패했습니다.');
        }
    };

    // 뒤로가기
    const handleBack = () => {
        router.push(`/contentMenu?tripId=${safeTripId}`);
    };

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>기록 하세요! - ODDIYA</title>
                    <meta name="description" content="여행의 소중한 순간들을 기록하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00EEFF"
                        leftIcons={['⛰️']}
                        rightIcons={['☁️', '⚓']}
                        title="기록 하세요!"
                        leftButton={{
                            text: "돌아가기",
                            onClick: handleBack
                        }}
                        rightButton={{
                            text: hasVideos ? "영상 목록 보기" : "영상 생성하기",
                            onClick: hasVideos ? handleViewVideoList : handleCreateVideo
                        }}
                    />

                    <div className={styles.content}>
                        {/* 사진 추가 버튼 */}
                        <div className={styles.controlPanel}>
                            <button
                                className={styles.addPhotoButton}
                                onClick={handleAddPhoto}
                                disabled={photos.length >= 20 || uploading}
                            >
                                {uploading ? '업로드 중...' : `사진 추가하기 (${photos.length}/20)`}
                            </button>
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className={styles.errorContainer}>
                                <p className={styles.errorMessage}>{error}</p>
                                <button onClick={refreshPhotos} className={styles.retryButton}>
                                    다시 시도
                                </button>
                            </div>
                        )}

                        {/* 로딩 상태 */}
                        {loading && !uploading && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner}></div>
                                <p>사진 목록을 불러오는 중...</p>
                            </div>
                        )}

                        {/* 사진 목록이 없을 때 */}
                        {!loading && !error && photos.length === 0 && (
                            <div className={styles.emptyContainer}>
                                <div className={styles.emptyIcon}>📷</div>
                                <h3 className={styles.emptyTitle}>아직 추가된 사진이 없습니다</h3>
                                <p className={styles.emptyDescription}>
                                    "사진 추가하기" 버튼을 눌러서 여행의 소중한 순간들을 기록해보세요!
                                </p>
                            </div>
                        )}

                        {/* 사진 갤러리 */}
                        {!loading && !error && photos.length > 0 && (
                            <div className={styles.photoGallery}>
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className={styles.photoCard}
                                        onClick={() => handlePhotoClick(photo)}
                                    >
                                        <img
                                            src={photo.thumbnailUrl || photo.url}
                                            alt={photo.fileName}
                                            className={styles.photoImage}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 업로드 중 오버레이 */}
                        {uploading && (
                            <div className={styles.loadingOverlay}>
                                <div className={styles.loadingSpinner}></div>
                                <p>사진을 업로드하는 중...</p>
                            </div>
                        )}
                    </div>

                    {/* 사진 모달 */}
                    {selectedPhoto && (
                        <div className={styles.photoModal} onClick={handleCloseModal}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.modalImageContainer}>
                                    <img
                                        src={selectedPhoto.url}
                                        alt={selectedPhoto.fileName}
                                        className={styles.modalImage}
                                    />
                                    <button className={styles.modalCloseButton} onClick={handleCloseModal}>
                                        ✕
                                    </button>
                                    <button
                                        className={styles.modalDeleteButton}
                                        onClick={() => handleDeletePhoto(selectedPhoto.id)}
                                    >
                                        🗑️ 삭제하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 숨겨진 파일 입력 */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default Record;
