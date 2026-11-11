import React from 'react';
import { useHelp } from '../Help/HelpContext';

const PASS_NAMES = {
    '1_year': { title: '1-Year Unlimited Pass', term: '365 Days Access' },
    '30_day': { title: '30-Day Unlimited Pass', term: '30 Days Access' }
};

export const CheckoutModal = ({ 
    isOpen, 
    onClose, 
    onBack,
    onProceedToPayment,
    selectedPass = '30_day',
    amount = 30
}) => {
    const { openHelp } = useHelp();

    if (!isOpen) return null;

    const passInfo = PASS_NAMES[selectedPass] || PASS_NAMES['30_day'];
    const displayPrice = `$${amount}`;

    return (
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide" style={{ width: '700px', maxWidth: '95%' }}>

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    Checkout Confirmation
                </div>

                {/* --- TOP-RIGHT EXIT BUTTON --- */}
                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- READ-ONLY ORDER SUMMARY --- */}
                <div className="subscription-panel" style={{ position: 'relative' }}>
                    
                    <div className="subscription-panel-item featured" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <div>
                            <span className="subscription-highlight-label" style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>
                                Selected Plan: {passInfo.title}
                            </span>
                            <span style={{ color: '#555', fontSize: '0.9rem' }}>
                                Term: {passInfo.term} — No automatic renewal
                            </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1b5e20' }}>
                            {displayPrice}
                        </div>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
                        To change your plan selection, use the <strong>Back</strong> button below.
                    </div>

                </div>

                {/* --- TERMS & POLICIES PANEL --- */}
                <div className="subscription-panel" style={{ position: 'relative' }}>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">No Automatic Renewals </span>
                        <p>
                        Your pass automatically expires at the end of its term with no auto-billing or recurring charges.
                        Your account and saved work are securely retained for 1 full year after expiration.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">Upgrade Credit </span>
                        <p>
                        Upgrade a 30-Day Pass to the 1-Year Pass before expiration—your $30 payment is fully credited
                        toward the $150 annual price. Any unused time is added to the new Pass.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">Secure Payment Processing</span>
                        <p>
                        Financial Zone never stores or handles your payment credentials.
                        All transactions are processed by an independent unaffiliated third party, Stripe.
                        </p>
                    </div>

                    <div className="subscription-panel-item">
                        <span className="subscription-highlight-label">Terms of Service Policy</span>
                        
                        <p>
                            By clicking Proceed to Payment, you agree to our Terms of Service Policy, including our final sale and no-refund policy.
                        </p>

                        <div className="terms-review-row">
                            <span>Please review details by clicking:</span>
                            <button 
                                type="button"
                                className="basic-3d-button" 
                                style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                                onClick={() => openHelp('terms-service', false, true)}
                            >
                                Terms of Service Policy
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER PANEL --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        
                        <div className="button-group-left" style={{ display: 'flex', gap: '8px' }}>
                            {onBack && (
                                <button 
                                    type="button"
                                    className="basic-3d-button" 
                                    onClick={onBack}
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                type="button"
                                className="basic-3d-button btn-cancel-3d" 
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="button-group-right">
                            <button 
                                type="button"
                                className="basic-3d-button" 
                                onClick={() => onProceedToPayment?.()}
                                style={{
                                    backgroundColor: '#2e7d32',
                                    color: '#ffffff',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    padding: '6px 20px',
                                    border: '1px solid #1b5e20',
                                    cursor: 'pointer'
                                }}
                            >
                                Proceed to Payment ({displayPrice})
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>          
    );
};