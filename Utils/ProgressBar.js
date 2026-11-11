import React, { useState, useEffect } from 'react';

/**
 * Custom hook to manage the 15-second safety timeout countdown.
 */
export function ProgressCountdown(isProcessing) {
    const TIMEOUT_SECONDS = 15;
    const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);

    useEffect(() => {
        let timer;
        if (isProcessing) {
            setCountdown(TIMEOUT_SECONDS);
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isProcessing]);

    return countdown;
}

/**
 * Reusable Processing Modal Component
 */
export function ProgressBar({ isProcessing, countdown }) {
    if (!isProcessing) return null;

    return (
        <div className="processing-overlay">
            <div className="processing-modal">
                <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: '500' }}>
                    Processing... ({countdown}s)
                </div>
                <span className="dot-container">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <span key={i} className="dot" style={{ animationDelay: `${i * 0.12}s` }}>.</span>
                    ))}
                </span>
            </div>
        </div>
    );
}