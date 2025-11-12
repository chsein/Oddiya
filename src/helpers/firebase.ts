// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics 인스턴스 (프로덕션 환경에서만 초기화)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    try {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics 초기화 완료');
    } catch (error) {
        console.error('❌ Firebase Analytics 초기화 실패:', error);
    }
} else if (typeof window !== 'undefined') {
    console.log('ℹ️ Firebase Analytics: 개발 환경에서 비활성화됨 (404 오류 방지)');
}

// Auth 인스턴스
export const auth = getAuth(app);

// 모바일 로그인 유지를 위한 persistence 설정
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log('✅ Firebase persistence 설정 완료: localStorage');
        })
        .catch((error) => {
            console.error('❌ Firebase persistence 설정 실패:', error);
        });
}

export default app;

