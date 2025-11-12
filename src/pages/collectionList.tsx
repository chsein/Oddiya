import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NextPage } from 'next';
import styles from '../styles/CollectionList.module.css';
import Header from '../components/Header';
import { Spinner } from '../components/Spinner/Spinner';
import { ErrorComp } from '../components/Error';
import { getBasket, deleteBasketItem, BasketItem } from '../helpers/api';

const CollectionList: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // tripId를 안전하게 처리
    const safeTripId = Array.isArray(tripId) ? tripId[0] : tripId;

    // 서버에서 장바구니 불러오기
    useEffect(() => {
        const loadBasketItems = async () => {
            if (!safeTripId) {
                setError('여행 ID가 없습니다.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('=== CollectionList 장바구니 불러오기 ===');
                console.log('TripId:', safeTripId);

                const items = await getBasket(safeTripId);

                console.log('✅ 장바구니 항목:', items);
                setBasketItems(items);
            } catch (err) {
                console.error('❌ 장바구니 불러오기 실패:', err);
                setError('장바구니를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadBasketItems();
    }, [safeTripId]);

    // 여행지 상세 보기
    const handleDestinationClick = (destinationId: string) => {
        router.push(`/contentDetail?tripId=${safeTripId}&destinationId=${destinationId}&from=collection`);
    };

    // 여행지 삭제
    const handleDelete = async (destinationId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!safeTripId) {
            console.error('TripId가 없습니다.');
            return;
        }

        const confirmDelete = confirm('이 여행지를 목록에서 삭제하시겠습니까?');
        if (!confirmDelete) return;

        try {
            await deleteBasketItem(safeTripId, destinationId);
            console.log(`✅ 장바구니에서 삭제됨: ${destinationId}`);

            // 목록에서도 제거
            setBasketItems(prev => prev.filter(item => item.place?.id !== destinationId));
        } catch (error) {
            console.error('❌ 장바구니 항목 삭제 실패:', error);
            alert('장바구니에서 항목을 삭제하는데 실패했습니다.');
        }
    };

    // 뒤로가기
    const handleBack = () => {
        router.push(`/contentMenu?tripId=${safeTripId}`);
    };

    const getDisplayTitle = (title: string = ''): string => {
        if (!title) return '';
        return title.length > 15 ? `${title.slice(0, 15)}...` : title;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size={40} />
                    <p>선택된 여행지를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <ErrorComp message={error} />
                    <button
                        className={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Head>
                <title>내 여행지 컬렉션 - ODDIYA</title>
                <meta name="description" content="선택한 여행지들을 확인하고 관리하세요" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <link rel="icon" href="/defaulticon.png" />
            </Head>
            <div className={styles.container}>
                <Header
                    backgroundColor="#FFE135"
                    leftImage={{ src: '/headerimg/yellowLeft.png', alt: 'Collection List' }}
                    rightImage={{ src: '/headerimg/yellowRight.png', alt: 'Collection List' }}
                    title="내 여행지 컬렉션"
                    subtitle={`${basketItems.length}개의 선택된 여행지`}
                    leftButton={{
                        text: "돌아가기",
                        onClick: handleBack
                    }}
                />

                <div className={styles.content}>
                    {basketItems.length === 0 ? (
                        <div className={styles.emptyContainer}>
                            <div className={styles.emptyIcon}>📝</div>
                            <h3 className={styles.emptyTitle}>선택된 여행지가 없습니다</h3>
                            <p className={styles.emptyDescription}>
                                여행지 둘러보기에서 마음에 드는 여행지를 선택해보세요!
                            </p>
                            <button
                                className={styles.exploreButton}
                                onClick={() => router.push(`/contentList?tripId=${safeTripId}&regionName=서울`)}
                            >
                                여행지 둘러보기
                            </button>
                        </div>
                    ) : (
                        <div className={styles.destinationGrid}>
                            {basketItems
                                .filter(item => item.place) // place 정보가 있는 항목만
                                .map((item) => {
                                    const place = item.place!;
                                    const imageUrl = place.photoUrl || place.firstImage;

                                    if (!imageUrl) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={item.id}
                                            className={styles.destinationCard}
                                            onClick={() => handleDestinationClick(place.id)}
                                        >
                                            <div className={styles.cardImage}>
                                                <img
                                                    src={imageUrl}
                                                    alt={place.title}
                                                    className={styles.destinationImage}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const placeholder = target.nextElementSibling as HTMLElement;
                                                        if (placeholder) placeholder.style.display = 'flex';
                                                    }}
                                                />

                                            </div>
                                            <div className={styles.cardContent}>
                                                <div className={styles.cardTitle} title={place.title}>
                                                    {getDisplayTitle(place.title)}
                                                </div>
                                                <div className={styles.ratingContainer}>
                                                    <span className={styles.rating}>
                                                        ⭐ {(place.rating || 0).toFixed(1)}
                                                    </span>

                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollectionList;
