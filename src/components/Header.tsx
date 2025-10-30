import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/Header.module.css';

interface HeaderProps {
    backgroundColor?: string;
    leftIcons?: string[];
    rightIcons?: string[];
    title: string;
    subtitle?: string;
    showTripListButton?: boolean;
    showAddTripButton?: boolean;
    onTripListClick?: () => void;
    onAddTripClick?: () => void;
    leftButton?: {
        text: string;
        onClick: () => void;
    };
    rightButton?: {
        text: string;
        onClick: () => void;
        disabled?: boolean;
    };
}

const Header: React.FC<HeaderProps> = ({
    backgroundColor = '#00FFAA',
    leftIcons = ['🎨', '⚡'],
    rightIcons = ['📱', '✨'],
    title = 'ODDIYA',
    subtitle,
    showTripListButton = false,
    showAddTripButton = false,
    onTripListClick,
    onAddTripClick,
    leftButton,
    rightButton
}) => {
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [fontSize, setFontSize] = useState('2.2rem');

    useEffect(() => {
        const adjustFontSize = () => {
            if (titleRef.current) {
                const element = titleRef.current;
                const container = element.parentElement;

                if (container) {
                    // 컨테이너의 실제 사용 가능한 너비
                    const containerWidth = container.offsetWidth;
                    const availableWidth = containerWidth * 0.8; // 80% 사용 가능

                    // 초기 폰트 사이즈로 시작
                    element.style.fontSize = '2.2rem';

                    // 텍스트가 넘치면 폰트 사이즈를 줄임
                    let currentSize = 2.2;
                    while (element.scrollWidth > availableWidth && currentSize > 0.8) {
                        currentSize -= 0.05;
                        element.style.fontSize = `${currentSize}rem`;
                    }

                    setFontSize(element.style.fontSize);
                }
            }
        };

        // DOM이 완전히 렌더링된 후 실행
        const timeoutId = setTimeout(adjustFontSize, 50);
        window.addEventListener('resize', adjustFontSize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', adjustFontSize);
        };
    }, [title]);
    return (
        <header className={styles.header} style={{ backgroundColor }}>
            <div className={styles.headerContent}>
                {/* 왼쪽 아이콘들 */}
                <div className={styles.leftIcons}>
                    {leftIcons.map((icon, index) => (
                        <div key={index} className={styles.iconContainer}>
                            <span className={styles.icon}>{icon}</span>
                        </div>
                    ))}
                </div>

                {/* 왼쪽 버튼 */}
                <div className={styles.leftButtonContainer}>
                    {leftButton && (
                        <button
                            className={styles.sideButton}
                            onClick={leftButton.onClick}
                        >
                            {leftButton.text}
                        </button>
                    )}
                </div>

                {/* 중간 제목 */}
                <div className={styles.logo}>
                    <h1 ref={titleRef} style={{ fontSize }}>{title}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>

                {/* 오른쪽 버튼 */}
                <div className={styles.rightButtonContainer}>
                    {rightButton && (
                        <button
                            className={styles.sideButton}
                            onClick={rightButton.onClick}
                            disabled={rightButton.disabled}
                        >
                            {rightButton.text}
                        </button>
                    )}
                </div>

                {/* 오른쪽 아이콘들 */}
                <div className={styles.rightIcons}>
                    {rightIcons.map((icon, index) => (
                        <div key={index} className={styles.iconContainer}>
                            <span className={styles.icon}>{icon}</span>
                        </div>
                    ))}
                </div>
            </div>


        </header>
    );
};

export default Header;
