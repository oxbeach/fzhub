import React, { useState, useEffect } from 'react';
import { useHelp } from '../Help/HelpContext';

import '../Styles/Global/Account.css';

export const AccountModal = ({ 
    isOpen, 
    onClose, 
    onProceedToCheckout, 
    onOpenSubscriptionModal,
    subPricing = {},
    handleRenewalLogin,
    loginEmail = 'Guest',
    isLoggedIn = false
}) => {
    // Destructure properties from subPricing with fallback defaults
    const { 
        monthPrice = 0, 
        yearPrice = 0, 
        canUpgrade = false 
    } = subPricing || {};

    // Resolve email default from state prop (fallback to empty string if Guest)
    const currentUserEmail = loginEmail === 'Guest' ? '' : loginEmail;

    // Pass Selection State: '30_day' | '1_year'
    const [selectedPass, setSelectedPass] = useState('1_year');

    // Toggle for existing account vs new account creation
    const [useExistingAccount, setUseExistingAccount] = useState(isLoggedIn);

    // Credential States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Feedback States
    const [errorMessage, setErrorMessage] = useState('');

    const { openHelp } = useHelp();

    // Reset modal state whenever it opens or auth state changes
    useEffect(() => {
        if (!isOpen) return;

        setPassword('');
        setConfirmPassword('');
        setErrorMessage('');
        setShowPassword(false);
        setSelectedPass('1_year');

        if (isLoggedIn && currentUserEmail) {
            setEmail(currentUserEmail);
            setUseExistingAccount(true);
        } else {
            setEmail('');
            setUseExistingAccount(false);
        }
    }, [isOpen, isLoggedIn, currentUserEmail]);

    // Toggle logic between logged-in user and manual entry
    const handleToggleExistingAccount = (isExisting) => {
        setUseExistingAccount(isExisting);
        setErrorMessage('');
        setPassword('');
        setConfirmPassword('');

        if (isExisting && currentUserEmail) {
            setEmail(currentUserEmail);
        } else {
            setEmail('');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');

        if (!email) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        if (!useExistingAccount) {
            if (!password || !confirmPassword) {
                setErrorMessage('Please fill out all required password fields.');
                return;
            }

            if (password !== confirmPassword) {
                setErrorMessage('Passwords do not match.');
                return;
            }

            if (password.length < 6) {
                setErrorMessage('Password must be at least 6 characters long.');
                return;
            }
        }

        const selectedAmount = selectedPass === '30_day' ? monthPrice : yearPrice;

        // Clean output payload containing only user inputs
        if (onProceedToCheckout) {
            onProceedToCheckout({
                email,
                password: useExistingAccount ? '' : password,
                passType: selectedPass,
                amount: selectedAmount,
                useExistingAccount
            });
        }
    };

    

    return (
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide" style={{ width: '800px', maxWidth: '95%' }}>

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    {useExistingAccount ? 'Account & Access Pass' : 'Create Account'}
                </div>

                {/* --- TOP-RIGHT EXIT BUTTON --- */}
                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- MAIN PANEL --- */}
                <div className="define-globals-panel" style={{ position: 'relative' }}>
                    
                    {/* SECTION 1: PASS SELECTION */}

                    <div className="panel-section-title">
                        Select Your Desired Subscription Pass
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        
                        {/* 30-Day Card */}
                        <div 
                            onClick={() => setSelectedPass('30_day')}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: selectedPass === '30_day' ? '2px solid #003366' : '2px solid #ccc',
                                borderRadius: '4px',
                                backgroundColor: selectedPass === '30_day' ? '#ddf7e1' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>30-Day Unlimited Pass</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#003366', margin: '4px 0' }}>
                                ${monthPrice}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: '1.4' }}>
                                Short-term full access.<br />
                                <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '16px' }}>&#10003;</span> No automatic renewal.
                            </div>
                        </div>

                        {/* 1-Year Card */}
                        <div 
                            onClick={() => setSelectedPass('1_year')}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: selectedPass === '1_year' ? '2px solid #003366' : '2px solid #ccc',
                                borderRadius: '4px',
                                backgroundColor: selectedPass === '1_year' ? '#ddf7e1' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                position: 'relative'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>1-Year Unlimited Pass</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#003366', margin: '4px 0' }}>
                                ${yearPrice}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: '1.4' }}>
                                Full 365-day access.<br />
                                <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '16px' }}>&#10003;</span> No automatic renewal.
                            </div>
                        </div>

                    </div>

                    {/* Upgrade Credit Highlight Box */}
                    <div className="details-summary-box">
                        <div className="details-summary-text" style={{fontWeight: '500'}}>
                            <span>No Recurring Payments</span>
                            <span>•</span>
                            <span>{canUpgrade ? 'Upgrade Credit Available' : 'Upgrade Credit'}</span>
                            <span>•</span>
                            <span>30-day vs 1-year</span>
                            <span>•</span>
                            <span>Secure Payment</span>
                        </div>

                        <button 
                            type="button" 
                            className="basic-3d-button"
                            onClick={onOpenSubscriptionModal}
                        >
                            Full Details
                        </button>
                    </div>
                </div>       

                {!useExistingAccount && (
                    <div className="define-globals-panel" style={{ position: 'relative' }}>

                        <div className="panel-section-title">
                            Existing Subscriber: First Log In for Renewal
                        </div>

                        <div className="button-group-right" style={{width: '100%'} }>
                            <button 
                                type="button"
                                className="basic-3d-button" 
                                style={{ minHeight: '22px', minWidth: '85px', marginRight: '20px' }}
                                onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                                onClick={handleRenewalLogin}
                                
                            >
                                LOG IN
                            </button>
                        </div>      

                    </div>
                )}



                <div className="define-globals-panel" style={{ position: 'relative' }}>
                    {/* SECTION 2: ACCOUNT & CREDENTIALS */}
                    <div className="account-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                        <div className="panel-section-title">
                            {useExistingAccount ? 'Log In Account Information' : 'Guest: Create an Account'}
                        </div>

                        {/*{isLoggedIn && (          this allow gift subscription from current user to a new account user*/}
                        {false && (
                            <div className="account-type-toggle">
                                <label className="radio-label">
                                    <input 
                                        type="radio"
                                        name="accountChoice"
                                        checked={useExistingAccount}
                                        onChange={() => handleToggleExistingAccount(true)}
                                    />
                                    <span>Use current account (<span className="account-login-name" title={currentUserEmail}>{currentUserEmail}</span>)</span>
                                </label>

                                <label className="radio-label">
                                    <input 
                                        type="radio"
                                        name="accountChoice"
                                        checked={!useExistingAccount}
                                        onChange={() => handleToggleExistingAccount(false)}
                                    />
                                    Create new account
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="account-form-credentials-group">

                        {/* Email Row */}
                        <div className="credentials-row">
                            <label className="cred-col-label">Email:</label>
                            <input 
                                autoFocus
                                type="email" 
                                placeholder="user@example.com"
                                value={email}
                                readOnly={useExistingAccount && isLoggedIn}
                                maxLength={254}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ 
                                    width: '310px', 
                                    height: '32px', 
                                    boxSizing: 'border-box',
                                    backgroundColor: (useExistingAccount && isLoggedIn) ? '#f0f0f0' : '#ffffff'
                                }}
                            />

                            {/* Empty dummy placeholder div matching button column width */}
                            <div className="cred-col-action-placeholder" />

                        </div>

                        {/* Conditionally Render Passwords only when creating a new account */}
                        {!useExistingAccount && (
                            <>
                                {/* Password Row */}
                                <div className="credentials-row">

                                    <label className="cred-col-label">
                                        Password:
                                    </label>

                                    <div className="cred-col-input">
                                        <input 
                                            style={{ 
                                                width: '100%', 
                                                height: '32px', 
                                                boxSizing: 'border-box',
                                                backgroundColor: '#ffffff'
                                            }}
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••"
                                            value={password}
                                            maxLength={128}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>

                                    <div className="cred-col-action">
                                        <button 
                                            type="button" 
                                            className="basic-3d-button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? 'HIDE' : 'SHOW'}
                                        </button>
                                    </div>
                                   
                                </div>


                                <div className="credentials-row">
                                    <label className="cred-col-label">
                                        Confirm Password:
                                    </label>
                                    <div className="cred-col-input">
                                        <input 
                                            maxLength={128}
                                            placeholder="••••••••"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                height: '32px', 
                                                boxSizing: 'border-box',
                                                backgroundColor: '#ffffff'
                                            }}
                                        />
                                    </div>

                                      {/* Empty dummy placeholder div matching button column width */}
                                    <div className="cred-col-action-placeholder" />

                                </div>


                            </>
                        )}

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

                        <div className="button-group-right">
                            <button 
                                type="button"
                                className="basic-3d-button" 
                                onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                                onClick={handleSubmit}
                                style={{
                                    backgroundColor: '#2e7d32',
                                    color: '#ffffff',
                                    fontSize: '1.0rem',
                                    fontWeight: 'bold',
                                    padding: '6px 24px',
                                    border: '1px solid #1b5e20',
                                    cursor: 'pointer'
                                }}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                </div>

                {/* ERROR FEEDBACK */}
                    {errorMessage && (
                    <div 
                        className="modal-feedback-box error" 
                        style={{ 
                            position: 'absolute', 
                            left: '220px', 
                            bottom: '100px' // adjusted to sit comfortably above the footer buttons
                        }}
                    >
                        <span>⚠️</span>
                        <span>{errorMessage}</span>
                    </div>
                )}

            </div>
        </div>
    );
};