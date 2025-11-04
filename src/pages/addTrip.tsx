import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState } from "react";
import Header from "../components/Header";
import ProtectedRoute from "../components/ProtectedRoute";
import styles from "../styles/AddTrip.module.css";
import { createTrip, CreateTripRequest } from "../helpers/api";

const AddTrip: NextPage = () => {
    const router = useRouter();
    const [tripData, setTripData] = useState({
        destinationCity: '',
        startDate: '',
        endDate: ''
    });
    const [showNameModal, setShowNameModal] = useState(false);
    const [tripName, setTripName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState('');

    // 도시 목록
    const cities = [
        '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
        '수원', '성남', '고양', '용인', '청주', '천안', '전주', '포항',
        '제주', '춘천', '원주', '강릉', '태백', '속초', '삼척', '홍천',
        '횡성', '영월', '평창', '정선', '철원', '화천', '양구', '인제',
        '고성', '양양', '동해', '삼척', '태백', '정선', '영월', '평창'
    ];

    // 검색된 도시 목록
    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(citySearchTerm.toLowerCase())
    );

    const handleBack = () => {
        router.push('/tripList');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 필수 필드 검증
        if (!tripData.destinationCity || !tripData.startDate || !tripData.endDate) {
            setError('모든 필드를 입력해주세요.');
            return;
        }

        // 날짜 유효성 검증
        if (new Date(tripData.startDate) >= new Date(tripData.endDate)) {
            setError('종료일은 시작일보다 늦어야 합니다.');
            return;
        }

        setError(null);
        setShowNameModal(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTripData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCitySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCitySearchTerm(value);
        setTripData(prev => ({
            ...prev,
            destinationCity: value
        }));
        setShowCitySuggestions(value.length > 0);
    };

    const handleCitySelect = (city: string) => {
        setTripData(prev => ({
            ...prev,
            destinationCity: city
        }));
        setCitySearchTerm(city);
        setShowCitySuggestions(false);
    };

    const handleCityInputFocus = () => {
        if (citySearchTerm.length > 0) {
            setShowCitySuggestions(true);
        }
    };

    const handleCityInputBlur = () => {
        // 약간의 지연을 두어 클릭 이벤트가 먼저 실행되도록 함
        setTimeout(() => {
            setShowCitySuggestions(false);
        }, 200);
    };

    const handleCreateTrip = async () => {
        if (!tripName.trim()) {
            setError('여행 이름을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const tripRequest: CreateTripRequest = {
                tripName: tripName.trim(),
                destinationCity: tripData.destinationCity,
                startDate: tripData.startDate,
                endDate: tripData.endDate,
                tripStatus: "PLANNING",
                validDateRange: true
            };

            await createTrip(tripRequest);
            router.push('/tripList');
        } catch (err) {
            console.error('Error creating trip:', err);
            setError('여행 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowNameModal(false);
        setTripName('');
        setError(null);
    };

    return (
        <ProtectedRoute>
            <>
                <Head>
                    <title>여행 추가 - ODDIYA</title>
                    <meta name="description" content="새로운 여행을 추가해보세요" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1, maximum-scale=1"
                    />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className={styles.container}>
                <Header
                    backgroundColor="#00FFAA"
                    leftIcons={['←', '📝']}
                    rightIcons={['💾', '❌']}
                    title="새로운 여행 시작하기"
                    showTripListButton={true}
                    onTripListClick={handleBack}
                    leftButton={{
                        text: "취소",
                        onClick: handleBack
                    }}

                />

                <div className={styles.content}>
                    <div className={styles.ticketContainer}>
                        <form onSubmit={handleSubmit} className={styles.ticket}>
                            <div className={styles.ticketHeader}>
                                <h1 className={styles.ticketTitle}>Oddiya</h1>
                            </div>

                            <div className={styles.ticketBody}>
                                <div className={styles.barcode}>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                    <div className={styles.barcodeLine}></div>
                                </div>

                                <div className={styles.ticketContent}>
                                    <div className={styles.questionGroup}>
                                        <p className={styles.question}>어디로 떠나시나요?</p>
                                        <div className={styles.citySearchContainer}>
                                            <input
                                                type="text"
                                                name="destinationCity"
                                                value={citySearchTerm}
                                                onChange={handleCitySearch}
                                                onFocus={handleCityInputFocus}
                                                onBlur={handleCityInputBlur}
                                                className={styles.ticketInput}
                                                placeholder="도시를 검색하세요 (예: 서울, 제주)"
                                                required
                                            />
                                            {showCitySuggestions && filteredCities.length > 0 && (
                                                <div className={styles.citySuggestions}>
                                                    {filteredCities.slice(0, 5).map((city) => (
                                                        <div
                                                            key={city}
                                                            className={styles.citySuggestionItem}
                                                            onClick={() => handleCitySelect(city)}
                                                        >
                                                            {city}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.questionGroup}>
                                        <p className={styles.question}>여행일자를 선택해주세요</p>
                                        <div className={styles.dateRangeContainer}>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={tripData.startDate}
                                                onChange={handleInputChange}
                                                className={styles.dateInput}
                                                min={new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                            <span className={styles.dateSeparator}>~</span>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={tripData.endDate}
                                                onChange={handleInputChange}
                                                className={styles.dateInput}
                                                min={tripData.startDate || new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.ticketActions}>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className={styles.cancelButton}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                >
                                    여행 시작하기
                                </button>
                            </div>
                        </form>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className={styles.errorMessage}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* 여행 이름 입력 모달 */}
                {showNameModal && (
                    <div className={styles.modalOverlay} onClick={handleModalClose}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>여행의 이름을 지어주세요!</h3>
                                <button
                                    className={styles.closeButton}
                                    onClick={handleModalClose}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <input
                                    type="text"
                                    value={tripName}
                                    onChange={(e) => setTripName(e.target.value)}
                                    className={styles.nameInput}
                                    placeholder="예: 제주도 힐링 여행"
                                    maxLength={50}
                                    autoFocus
                                />
                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.cancelButton}
                                        onClick={handleModalClose}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className={styles.confirmButton}
                                        onClick={handleCreateTrip}
                                        disabled={loading}
                                    >
                                        {loading ? '생성 중...' : '여행 생성하기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
            </>
        </ProtectedRoute>
    );
};

export default AddTrip;
