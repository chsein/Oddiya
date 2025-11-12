import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import ProtectedRoute from "../components/ProtectedRoute";
import styles from "../styles/Settings.module.css";
import { getTripById, deleteTrip, updateTrip, Trip } from "../helpers/api";

const Settings: NextPage = () => {
    const router = useRouter();
    const { tripId } = router.query;
    const [tripData, setTripData] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newTripName, setNewTripName] = useState("");

    // 여행 정보 가져오기
    const fetchTripData = async () => {
        if (!tripId || typeof tripId !== 'string') {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getTripById(tripId);
            setTripData(data);
            setNewTripName(data.tripName || data.title);
        } catch (error) {
            console.error('Error fetching trip data:', error);
            alert('여행 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTripData();
    }, [tripId]);

    const handleBack = () => {
        router.back();
    };

    const handleDeleteTrip = async () => {
        if (!tripId || typeof tripId !== 'string') return;

        const confirmDelete = confirm(
            `"${tripData?.tripName || tripData?.title}" 여행을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
        );
        if (!confirmDelete) return;

        try {
            setIsDeleting(true);
            await deleteTrip(tripId);
            alert('여행이 삭제되었습니다.');
            router.push('/tripList');
        } catch (error) {
            console.error('여행 삭제 실패:', error);
            alert('여행 삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setNewTripName(tripData?.tripName || tripData?.title || "");
    };

    const handleSaveEdit = async () => {
        if (!tripId || typeof tripId !== 'string') return;
        if (!newTripName.trim()) {
            alert('여행 이름을 입력해주세요.');
            return;
        }

        try {
            await updateTrip(tripId, { tripName: newTripName.trim() });
            alert('여행 이름이 변경되었습니다.');
            setIsEditing(false);
            await fetchTripData();
        } catch (error) {
            console.error('여행 이름 변경 실패:', error);
            alert('여행 이름 변경에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className={styles.container}>
                    <div className={styles.loading}>여행 정보를 불러오는 중...</div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!tripData) {
        return (
            <ProtectedRoute>
                <div className={styles.container}>
                    <div className={styles.error}>여행 정보를 찾을 수 없습니다.</div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div>
                <Head>
                    <title>설정 - ODDIYA</title>
                    <meta name="description" content="ODDIYA 설정" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, maximum-scale=1"
                    />
                    <link rel="icon" href="/favicon.ico" />
                </Head>
                <div className={styles.container}>
                    <Header
                        backgroundColor="#00FFAA"
                        leftImage={{ src: '/headerimg/greenLeft.png', alt: 'Settings' }}
                        rightImage={{ src: '/headerimg/greenRight.png', alt: 'Settings' }}
                        title="Settings"
                        leftButton={{
                            text: "뒤로가기",
                            onClick: handleBack
                        }}
                    />

                    <div className={styles.content}>
                        <div className={styles.contentInner}>
                            {/* 여행 정보 섹션 */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>✈️ 여행 정보</h2>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>여행 이름</span>
                                        <span className={styles.infoValue}>
                                            {tripData.tripName || tripData.title}
                                        </span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>여행지</span>
                                        <span className={styles.infoValue}>{tripData.destinationCity}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>기간</span>
                                        <span className={styles.infoValue}>
                                            {tripData.startDate} ~ {tripData.endDate}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 여행 이름 변경 섹션 */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>✏️ 여행 이름 변경</h2>
                                {isEditing ? (
                                    <div className={styles.editCard}>
                                        <input
                                            type="text"
                                            value={newTripName}
                                            onChange={(e) => setNewTripName(e.target.value)}
                                            className={styles.editInput}
                                            placeholder="새로운 여행 이름"
                                        />
                                        <div className={styles.editButtons}>
                                            <button
                                                className={styles.saveButton}
                                                onClick={handleSaveEdit}
                                            >
                                                저장
                                            </button>
                                            <button
                                                className={styles.cancelButton}
                                                onClick={handleCancelEdit}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className={styles.settingButton}
                                        onClick={handleStartEdit}
                                    >
                                        <span className={styles.settingIcon}>✏️</span>
                                        <div className={styles.settingContent}>
                                            <span className={styles.settingTitle}>여행 이름 바꾸기</span>
                                            <span className={styles.settingDescription}>
                                                현재: {tripData.tripName || tripData.title}
                                            </span>
                                        </div>
                                        <span className={styles.settingArrow}>→</span>
                                    </button>
                                )}
                            </div>

                            {/* 여행 삭제 섹션 */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>🗑️ 위험 영역</h2>
                                <button
                                    className={styles.deleteButton}
                                    onClick={handleDeleteTrip}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? '삭제 중...' : '🗑️ 여행 삭제'}
                                </button>
                                <p className={styles.warningText}>
                                    ⚠️ 여행을 삭제하면 모든 일정과 기록이 영구적으로 삭제됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default Settings;

