import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage } from 'next';
import styles from '../styles/Record.module.css';
import Header from '../components/Header';

interface Photo {
    id: string;
    url: string;
    name: string;
    timestamp: number;
}

const Record: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLDivElement>(null);

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // localStorage에서 사진 불러오기
    useEffect(() => {
        const loadPhotos = () => {
            if (!safeTripId) return;

            try {
                const tripKey = `trip_${safeTripId}_photos`;
                const storedPhotos = localStorage.getItem(tripKey);

                if (storedPhotos) {
                    const parsedPhotos = JSON.parse(storedPhotos);
                    setPhotos(parsedPhotos);
                    console.log('=== 로드된 사진들 ===');
                    console.log(parsedPhotos);
                }
            } catch (err) {
                console.error('Error loading photos:', err);
            }
        };

        loadPhotos();
    }, [safeTripId]);

    // localStorage 용량 확인
    const getStorageSize = () => {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    };

    // 사진 저장하기
    const savePhotos = (newPhotos: Photo[]) => {
        if (!safeTripId) return;

        try {
            const tripKey = `trip_${safeTripId}_photos`;
            const dataString = JSON.stringify(newPhotos);

            // 데이터 크기 확인 (약 5MB 제한)
            const dataSize = new Blob([dataString]).size;
            const currentStorageSize = getStorageSize();

            if (dataSize + currentStorageSize > 5 * 1024 * 1024) { // 5MB
                throw new DOMException('QuotaExceededError');
            }

            localStorage.setItem(tripKey, dataString);
            console.log('=== 사진 저장됨 ===');
            console.log(`데이터 크기: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
            console.log(newPhotos);
        } catch (err) {
            console.error('Error saving photos:', err);
            throw err;
        }
    };

    // 사진 추가하기
    const handleAddPhoto = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };


    // 영상 생성하기
    const handleCreateVideo = () => {
        router.push(`/videoGeneration?tripId=${safeTripId}`);
    };

    // 이미지 압축 함수
    const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 원본 비율 유지하면서 크기 조정
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                // 이미지 그리기
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                // 압축된 이미지를 base64로 변환
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    // 파일 선택 처리
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // 사진 개수 제한 (최대 20장)
        if (photos.length + files.length > 20) {
            alert('최대 20장까지만 추가할 수 있습니다.');
            return;
        }

        setLoading(true);

        // 파일들을 처리 (압축 적용)
        const filePromises = Array.from(files).map((file) => {
            return new Promise<Photo>((resolve) => {
                // 이미지 압축 적용
                compressImage(file, 600, 0.7).then((compressedUrl) => {
                    const photo: Photo = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        url: compressedUrl,
                        name: file.name,
                        timestamp: Date.now(),
                    };
                    resolve(photo);
                });
            });
        });

        Promise.all(filePromises).then((newPhotos) => {
            // 새로 추가한 사진을 앞에 배치 (왼쪽에 오도록)
            const updatedPhotos = [...newPhotos, ...photos];
            setPhotos(updatedPhotos);

            // localStorage 저장 시도 (용량 초과 시 경고)
            try {
                savePhotos(updatedPhotos);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    alert('저장 공간이 부족합니다. 일부 사진을 삭제한 후 다시 시도해주세요.');
                    // 마지막에 추가된 사진들을 제거
                    setPhotos(photos);
                } else {
                    console.error('Error saving photos:', error);
                }
            }

            setLoading(false);

            // 새로 추가한 사진이 보이도록 스크롤을 맨 왼쪽으로 이동
            setTimeout(() => {
                if (galleryRef.current) {
                    galleryRef.current.scrollLeft = 0;
                }
            }, 100);
        });
    };

    // 사진 삭제하기
    const handleDeletePhoto = (photoId: string) => {
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        setPhotos(updatedPhotos);
        savePhotos(updatedPhotos);
    };

    // 뒤로가기
    const handleBack = () => {
        router.push(`/contentMenu?tripId=${safeTripId}`);
    };

    return (
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
                        text: "영상 생성하기",
                        onClick: handleCreateVideo
                    }}
                />

                <div className={styles.content}>
                    {/* 사진 추가 버튼 */}
                    <div className={styles.controlPanel}>
                        <button
                            className={styles.addPhotoButton}
                            onClick={handleAddPhoto}
                            disabled={photos.length >= 20}
                        >
                            사진 추가하기 ({photos.length}/20)
                        </button>
                        {photos.length > 0 && (
                            <div className={styles.storageInfo}>
                                저장 공간: {((getStorageSize() / 1024 / 1024)).toFixed(1)}MB / 5MB
                            </div>
                        )}
                    </div>

                    {photos.length === 0 ? (
                        <div className={styles.emptyContainer}>
                            <div className={styles.emptyIcon}>📷</div>
                            <h3 className={styles.emptyTitle}>아직 추가된 사진이 없습니다</h3>
                            <p className={styles.emptyDescription}>
                                "사진 추가하기" 버튼을 눌러서 여행의 소중한 순간들을 기록해보세요!
                            </p>
                        </div>
                    ) : (
                        <div className={styles.photoGallery} ref={galleryRef}>
                            {photos.map((photo) => (
                                <div key={photo.id} className={styles.photoCard}>
                                    <img
                                        src={photo.url}
                                        alt={photo.name}
                                        className={styles.photoImage}
                                    />
                                    <div className={styles.photoOverlay}>
                                        <button
                                            className={styles.deleteButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePhoto(photo.id);
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {loading && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.loadingSpinner}></div>
                            <p>사진을 처리하는 중...</p>
                        </div>
                    )}
                </div>

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
    );
};

export default Record;
