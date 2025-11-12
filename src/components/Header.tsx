import React from 'react';
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
                    <h1>{title}</h1>
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
