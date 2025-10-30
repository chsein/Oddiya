// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAImo14Ih3S1XeJdsqqL9tzMID0sgwz3xc",
    authDomain: "oddiya-82d10.firebaseapp.com",
    projectId: "oddiya-82d10",
    storageBucket: "oddiya-82d10.firebasestorage.app",
    messagingSenderId: "696625574309",
    appId: "1:696625574309:web:9e368d5e845845520eb84c",
    measurementId: "G-KW3YW44R1X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics 인스턴스 (브라우저에서만 초기화)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.error('Firebase Analytics 초기화 실패:', error);
    }
}

// Auth 인스턴스
export const auth = getAuth(app);

export default app;

