import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute 컴포넌트
 * 로그인된 사용자만 접근할 수 있는 페이지를 보호합니다.
 *
 * 사용법:
 * ```tsx
 * function ProtectedPage() {
 *     return (
 *         <ProtectedRoute>
 *             <div>보호된 컨텐츠</div>
 *         </ProtectedRoute>
 *     );
 * }
 * ```
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // 로딩이 완료되고 사용자가 없으면 로그인 페이지로 리다이렉트
        if (!loading && !user) {
            console.log('⚠️ 인증되지 않은 접근 - 로그인 페이지로 리다이렉트');

            // 현재 페이지 URL을 저장하여 로그인 후 돌아올 수 있도록 함
            const returnUrl = router.asPath;
            router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
    }, [user, loading, router]);

    // 로딩 중이면 로딩 UI 표시
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #00FFAA',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: '#666' }}>로딩 중...</p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // 인증되지 않은 경우 null 반환 (리다이렉트 처리 중)
    if (!user) {
        return null;
    }

    // 인증된 경우 자식 컴포넌트 렌더링
    return <>{children}</>;
};

export default ProtectedRoute;
