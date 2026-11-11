import React, { useState } from 'react';
import { useHelp } from '../Help/HelpContext';

export const SubscriptionModal = ({ 
    isOpen, 
    onClose, 
    onEnterGuestMode,
    subPricing = {}
}) => {
    // Destructure properties from subPricing with fallback defaults
    const { 
        monthPrice = 30, 
        yearPrice = 150, 
        canUpgrade = false 
    } = subPricing || {};

    // Pass Selection State: '30_day' | '1_year'
    const [selectedPass, setSelectedPass] = useState('30_day');

    const { openHelp } = useHelp();

    if (!isOpen) return null;

    return (
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide" style={{ width: '850px', maxWidth: '95%' }}>

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    Subscription Details
                </div>

                {/* --- TOP-RIGHT EXIT BUTTON --- */}
                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- MAIN PANEL --- */}
                <div className="subscription-panel" style={{ position: 'relative' }}>
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        
                        {/* 30-Day Card */}
                        <div className="pass-option-card">
                            <div className="pass-option-title">30-Day Unlimited Pass</div>
                            <div className="pass-option-price">${monthPrice}</div>
                            <div className="pass-option-details">
                                Short-term full access.<br />
                                <span className="pass-option-check">&#10003;</span> No automatic renewal.
                            </div>
                        </div>

                        {/* 1-Year Card */}
                        <div className="pass-option-card">
                            <div className="pass-option-title">1-Year Unlimited Pass</div>

                            <div className="pass-option-price">
                                {canUpgrade ? (
                                    <><s>$150</s> ${yearPrice}</>
                                ) : (
                                    <>${yearPrice}</>
                                )}
                            </div>

                            <div className="pass-option-details">
                                Full 365-day access.<br />
                                <span className="pass-option-check">&#10003;</span> No automatic renewal.
                            </div>
                        </div>

                    </div>

                    {/* Dynamic Upgrade Highlight Box */}
                    {canUpgrade ? (
                        <div className="subscription-panel-item featured">
                            <span className="subscription-highlight-label">Upgrade Credit Eligible! </span>
                            As an active 30-Day Pass holder, your $30 payment will be applied to an annual pass.
                             Upgrade to a one Year Pass for <strong>${yearPrice}</strong>, and all remaining days on your 30-day
                             pass will be added to your new term.
                        </div>
                    ) : (
                        <div className="subscription-panel-item featured">
                            <span className="subscription-highlight-label">Full Upgrade Credit </span>
                            Upgrade a 30-Day Pass to the 1-Year Pass before expiration, your $30 payment is fully credited
                            toward the $150 annual price. Any unused time is added to the new Pass.
                        </div>
                    )}
                </div>

                <div className="subscription-panel" style={{ position: 'relative' }}>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">No Automatic Renewals </span>
                        <p>
                        Your pass automatically expires at the end of its term with no auto-billing or recurring charges.
                        Your account and saved work are securely retained for 1 full year after expiration.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">Explore as a Free Guest </span>
                        <p>
                        Guests have free access to all FZ tools and analytics using historical data up to 2020. Investigate 
                        historical market behavior, including the 2000 dot-com bubble, 2008 financial crisis, and 2020 Covid shock.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">30 Days vs. 1 Full Year </span>
                        <p>
                        FZ is designed for long-term investing using full-year total return data. Since many investors review portfolios quarterly or less,
                        occasional users can buy a 30-Day Pass a few times a year and spend less than an annual pass.
                        Others prefer full 1-Year access for ongoing "what-if" modeling.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">Secure Payment Processing</span>
                        <p>
                        Financial Zone never stores or handles your payment credentials or personal data.
                        All transactions are processed by an independent unaffiliated third party.
                        </p>
                    </div>

                </div>

                {/* --- FOOTER PANEL --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        
                        <div className="button-group-left">
                            <button 
                                type="button"
                                className="basic-3d-button btn-cancel-3d" 
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="button-group-right" style={{ display: 'flex', gap: '8px' }}>
                            
                            {onEnterGuestMode && (
                                <button 
                                    type="button"
                                    className="basic-3d-button" 
                                    onClick={onEnterGuestMode}
                                    style={{
                                        fontSize: '0.88rem',
                                        padding: '6px 14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Try Guest Mode
                                </button>
                            )}

                        </div>

                    </div>
                </div>

            </div>
        </div>          
    );
};