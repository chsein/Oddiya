import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    OAuthProvider,
    User,
    UserCredential
} from 'firebase/auth';
import { auth } from '../../helpers/firebase';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8080';

// ==================== Google OAuth ====================

/**
 * Google 로그인 (팝업 방식)
 * 데스크톱 브라우저에서 권장
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google 로그인 성공 (팝업):', result.user.email);

        // 백엔드와 동기화
        await syncUserWithBackend(result.user);

        return result;
    } catch (error: any) {
        console.error('❌ Google 로그인 실패 (팝업):', error);
        throw handleAuthError(error);
    }
};

/**
 * Google 로그인 (리다이렉트 방식)
 * 모바일 브라우저에서 권장
 */
export const signInWithGoogleRedirect = async (): Promise<void> => {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        await signInWithRedirect(auth, provider);
        // 리다이렉트 후 handleRedirectResult()를 호출하여 결과 처리
    } catch (error: any) {
        console.error('❌ Google 로그인 실패 (리다이렉트):', error);
        throw handleAuthError(error);
    }
};

// ==================== Apple OAuth ====================

/**
 * Apple 로그인 (팝업 방식)
 * 데스크톱 브라우저에서 권장
 */
export const signInWithApple = async (): Promise<UserCredential> => {
    try {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');

        const result = await signInWithPopup(auth, provider);
        console.log('✅ Apple 로그인 성공 (팝업):', result.user.email);

        // 백엔드와 동기화
        await syncUserWithBackend(result.user);

        return result;
    } catch (error: any) {
        console.error('❌ Apple 로그인 실패 (팝업):', error);
        throw handleAuthError(error);
    }
};

/**
 * Apple 로그인 (리다이렉트 방식)
 * 모바일 브라우저에서 권장
 */
export const signInWithAppleRedirect = async (): Promise<void> => {
    try {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');

        await signInWithRedirect(auth, provider);
        // 리다이렉트 후 handleRedirectResult()를 호출하여 결과 처리
    } catch (error: any) {
        console.error('❌ Apple 로그인 실패 (리다이렉트):', error);
        throw handleAuthError(error);
    }
};

// ==================== Redirect Result Handler ====================

/**
 * 리다이렉트 로그인 결과 처리
 * _app.tsx의 useEffect에서 호출하여 리다이렉트 후 사용자 정보 확인
 */
export const handleRedirectResult = async (): Promise<UserCredential | null> => {
    try {
        const result = await getRedirectResult(auth);

        if (result) {
            console.log('✅ 리다이렉트 로그인 성공:', result.user.email);

            // 백엔드와 동기화
            await syncUserWithBackend(result.user);

            return result;
        }

        return null;
    } catch (error: any) {
        console.error('❌ 리다이렉트 결과 처리 실패:', error);
        throw handleAuthError(error);
    }
};

// ==================== Sign Out ====================

/**
 * 로그아웃
 */
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
        console.log('✅ 로그아웃 성공');
    } catch (error: any) {
        console.error('❌ 로그아웃 실패:', error);
        throw handleAuthError(error);
    }
};

// ==================== Token Management ====================

/**
 * 현재 사용자의 Firebase ID Token 가져오기
 * API 호출 시 Authorization 헤더에 포함
 */
export const getCurrentUserIdToken = async (): Promise<string | null> => {
    try {
        const user = auth.currentUser;

        if (!user) {
            console.warn('⚠️ 로그인된 사용자가 없습니다.');
            return null;
        }

        // forceRefresh: false → 캐시된 토큰 사용 (1시간 유효)
        const idToken = await user.getIdToken(false);
        return idToken;
    } catch (error: any) {
        console.error('❌ ID Token 가져오기 실패:', error);
        throw handleAuthError(error);
    }
};

/**
 * Firebase ID Token 강제 갱신
 * 토큰 만료 시 호출
 */
export const refreshIdToken = async (): Promise<string | null> => {
    try {
        const user = auth.currentUser;

        if (!user) {
            console.warn('⚠️ 로그인된 사용자가 없습니다.');
            return null;
        }

        // forceRefresh: true → 강제로 새 토큰 발급
        const idToken = await user.getIdToken(true);
        console.log('✅ ID Token 갱신 완료');
        return idToken;
    } catch (error: any) {
        console.error('❌ ID Token 갱신 실패:', error);
        throw handleAuthError(error);
    }
};

// ==================== Backend Sync ====================

/**
 * 백엔드 API와 사용자 정보 동기화
 * Firebase 로그인 성공 후 호출하여 백엔드 DB에 사용자 생성/업데이트
 */
export const syncUserWithBackend = async (user: User): Promise<void> => {
    try {
        const idToken = await user.getIdToken();

        // 백엔드 API 호출: POST /api/v1/auth/login-or-register
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/login-or-register`,
            {
                firebaseUid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoUrl: user.photoURL,
                provider: user.providerData[0]?.providerId || 'unknown'
            },
            {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ 백엔드 사용자 동기화 성공:', response.data);
    } catch (error: any) {
        console.error('❌ 백엔드 사용자 동기화 실패:', error);

        // 백엔드 동기화 실패는 로그인 실패로 처리하지 않음
        // (Firebase 로그인은 성공했으므로)
        // 추후 재시도 로직 추가 가능
    }
};

// ==================== Error Handling ====================

/**
 * Firebase Auth 에러 처리
 */
const handleAuthError = (error: any): Error => {
    const errorCode = error.code;
    const errorMessage = error.message;

    // 사용자 친화적인 에러 메시지 변환
    let userMessage = '로그인에 실패했습니다.';

    switch (errorCode) {
        case 'auth/popup-closed-by-user':
            userMessage = '로그인 팝업이 닫혔습니다.';
            break;
        case 'auth/cancelled-popup-request':
            userMessage = '로그인이 취소되었습니다.';
            break;
        case 'auth/popup-blocked':
            userMessage = '팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.';
            break;
        case 'auth/account-exists-with-different-credential':
            userMessage = '이미 다른 로그인 방식으로 가입된 계정입니다.';
            break;
        case 'auth/network-request-failed':
            userMessage = '네트워크 연결을 확인해주세요.';
            break;
        case 'auth/too-many-requests':
            userMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            break;
        case 'auth/user-disabled':
            userMessage = '비활성화된 계정입니다.';
            break;
        default:
            userMessage = errorMessage || '로그인에 실패했습니다.';
    }

    return new Error(userMessage);
};

// ==================== Utility Functions ====================

/**
 * 현재 로그인 상태 확인
 */
export const isAuthenticated = (): boolean => {
    return auth.currentUser !== null;
};

/**
 * 현재 사용자 정보 가져오기
 */
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

/**
 * 모바일 환경 감지
 * 모바일이면 redirect 방식, 데스크톱이면 popup 방식 사용 권장
 */
export const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};
