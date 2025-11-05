import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../helpers/firebase';
import { handleRedirectResult, syncUserWithBackend } from '../lib/firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 리다이렉트 결과 처리
        const checkRedirectResult = async () => {
            try {
                const result = await handleRedirectResult();
                if (result) {
                    console.log('✅ 리다이렉트 로그인 처리 완료:', result.user.email);
                }
            } catch (err: any) {
                console.error('❌ 리다이렉트 결과 처리 실패:', err);
                setError(err.message || '로그인 처리에 실패했습니다.');
            }
        };

        checkRedirectResult();

        // Firebase 인증 상태 변경 감지
        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {
                console.log('🔄 인증 상태 변경:', currentUser?.email || 'No user');
                setUser(currentUser);
                setLoading(false);
                setError(null);

                // 로그인 시 백엔드 동기화 (모든 provider 지원)
                if (currentUser) {
                    try {
                        await syncUserWithBackend(currentUser);
                        console.log('✅ 백엔드 동기화 완료 - Provider:', currentUser.providerData[0]?.providerId || 'unknown');
                    } catch (err: any) {
                        console.error('❌ 백엔드 동기화 실패:', err);
                        // 백엔드 동기화 실패해도 로그인은 유지 (백엔드 서버 다운 시에도 프론트 동작)
                    }
                }
            },
            (err) => {
                console.error('❌ 인증 상태 감지 실패:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        // 클린업 함수
        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        error,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
