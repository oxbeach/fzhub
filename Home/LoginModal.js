import React, { useState, useEffect } from 'react';
import { supabase } from '../Utils/supabase';

export const LoginModal = ({ isOpen, onClose, onSuccess, onResetPassword }) => {
    const [mode, setMode] = useState('signin'); // 'signin' | 'forgot_email' | 'forgot_code_sent' | 'update_password'
    const [email, setEmail] = useState('');
    const [passwordOrCode, setPasswordOrCode] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Reset state every time the modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('signin');
            setEmail('');
            setPasswordOrCode('');
            setConfirmPassword('');
            setAuthError('');
            setSuccessMessage('');
            setShowPassword(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Handles the Login or Action button click depending on mode
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setAuthError('');
        setSuccessMessage('');

        const cleanEmail = email.trim();
        const cleanInput = passwordOrCode.trim();
        const cleanConfirm = confirmPassword.trim();

        if (!cleanEmail || !cleanInput) {
            if (mode === 'forgot_code_sent') {
                setAuthError('Please enter both email and verification code.');
            } else if (mode === 'update_password') {
                if (!cleanConfirm) {
                    setAuthError('Please enter and confirm your new password.');
                } else {
                    setAuthError('Please enter a new password.');
                }
            } else {
                setAuthError('Please enter both email and password.');
            }
            if (onSuccess) onSuccess(false, null);
            return;
        }

        if (mode === 'update_password' && cleanInput !== cleanConfirm) {
            setAuthError('Passwords do not match.');
            if (onSuccess) onSuccess(false, null);
            return;
        }

        try {
            // --- STAGE A: NORMAL SIGN IN ---

            /*****************************************************************************************
              signInWithPassword does not have an abortSignal attribute.  if this does hang up
              then the user is stuck.  let it go and the supabase/browser should eventually time out.
              user starts the login process over.
            ********************************************************************************************/

            if (mode === 'signin') {

                setSuccessMessage("Processing...");

                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: cleanInput,
                });

               

                if (authError) {
                    setSuccessMessage('');
                    setAuthError(authError.message);
                    if (onSuccess) onSuccess(false, null);
                    return;
                }

                // Fetch account subscription data
                const { data: accountData, error: accountError } = await supabase
                    .from('accounts')
                    .select('subscription_start, subscription_end, subscription_type')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                if (accountError) {
                    setSuccessMessage('');
                    setAuthError(`Account Query Error: ${accountError.message}`);
                    if (onSuccess) onSuccess(false, null);
                    return;
                }

                if (!accountData) {
                    setSuccessMessage('');
                    setAuthError('Authentication successful, but no associated account profile was found.');
                    if (onSuccess) onSuccess(false, null);
                    return;
                }

                if (onSuccess) {
                    onSuccess(true, {
                        email: cleanEmail,
                        password: cleanInput,
                        user: authData.user,
                        authData,
                        subscriptionStart: accountData.subscription_start,
                        subscriptionEnd: accountData.subscription_end,
                        subscriptionType: accountData.subscription_type
                    });
                }
            } 
            // --- STAGE B: VERIFY RECOVERY OTP CODE ---
            else if (mode === 'forgot_code_sent') {
                const { error } = await supabase.auth.verifyOtp({
                    email: cleanEmail,
                    token: cleanInput,
                    type: 'recovery',
                });

                if (error) {
                    setAuthError(error.message);
                } else {
                    setSuccessMessage('Code verified successfully! Please enter your new password.');
                    setMode('update_password');
                    setPasswordOrCode(''); // Clear field for new password entry
                    setConfirmPassword('');
                }
            } 
            // --- STAGE C: UPDATE TO NEW PASSWORD ---
            else if (mode === 'update_password') {
                const { error } = await supabase.auth.updateUser({
                    password: cleanInput,
                });

                if (error) {
                    setSuccessMessage('');
                    setAuthError(error.message);
                } else {
                    setSuccessMessage('Password successfully updated! You can now logged in.');
                    setTimeout(() => {
                        onClose();
                    }, 1500);
                }
            }
        } catch (err) {
            setSuccessMessage('');
            setAuthError('An unexpected authentication error occurred.');
            if (onSuccess) onSuccess(false, null);
        }
    };

    // Switches UI into forgot password mode
    const handleForgotClick = () => {
        setAuthError('');
        setSuccessMessage('');
        setMode('forgot_code_sent');
        setPasswordOrCode('');
    };

    // Dispatches reset code request to email
    const handleSendCodeClick = async () => {
        setAuthError('');
        setSuccessMessage('');

        if (!email) {
            setAuthError('Please enter your email address first.');
            return;
        }

        if (onResetPassword) {
            onResetPassword(email, setSuccessMessage, setAuthError);
        } else {
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                if (error) {
                    setAuthError(error.message);
                } else {
                    setSuccessMessage('Verification code sent to your email.');
                }
            } catch (err) {
                setAuthError('Failed to send verification code.');
            }
        }
    };

    const clearMessages = () => {
        if (authError) setAuthError('');
        if (successMessage) setSuccessMessage('');
    };

    // Determine dynamic labels based on active mode
    const getPasswordFieldLabel = () => {
        if (mode === 'forgot_code_sent') return 'Verification Code:';
        if (mode === 'update_password') return 'Password:';
        return 'Password:';
    };

    const getPasswordPlaceholder = () => {
        if (mode === 'forgot_code_sent') return 'Enter verification code';
        if (mode === 'update_password') return '••••••••';
        return '••••••••';
    };

    const getPrimaryButtonLabel = () => {
        if (mode === 'forgot_code_sent') return 'Verify Code';
        if (mode === 'update_password') return 'Update Password';
        return 'Login';
    };

    return (
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide">

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    {mode === 'update_password' ? 'Update Password' : mode === 'forgot_code_sent' ? 'Password Recovery' : 'Sign In'}:{' '}
                    <span style={{ fontWeight: 'normal', marginLeft: '6px' }}>
                        Financial Zone Account
                    </span>
                </div>

                {/* --- TOP-RIGHT EXIT BUTTON --- */}
                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- MAIN PANEL --- */}
                <div className="define-globals-panel" style={{ position: 'relative'}}>


                    <div className="account-form-credentials-group">
                        <div className="credentials-row">
                            <label className="cred-col-label">Email:</label>
                            <div className="cred-col-input">
                                <input 
                                    autoFocus
                                    type="email" 
                                    placeholder="user@example.com"
                                    value={email}
                                    disabled={mode === 'update_password'} // Lock email during final password update
                                    maxLength={254}
                                    onFocus={clearMessages}
                                    onChange={(e) => {
                                        clearMessages();
                                        setEmail(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLogin();
                                        }
                                    }}
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

                        <div className="credentials-row">
                            <label className="cred-col-label">
                                {getPasswordFieldLabel()}
                            </label>
                            <div className="cred-col-input">
                                <input 
                                    maxLength={128}
                                    style={{ 
                                        width: '100%', 
                                        height: '32px', 
                                        boxSizing: 'border-box',
                                        backgroundColor: '#ffffff'
                                    }}
                                    type={showPassword || mode === 'forgot_code_sent' ? 'text' : 'password'}
                                    value={passwordOrCode}
                                    onChange={(e) => {
                                        clearMessages();
                                        setPasswordOrCode(e.target.value);
                                    }}
                                    onFocus={clearMessages}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLogin();
                                        }
                                    }}
                                    placeholder={getPasswordPlaceholder()}
                                />
                            </div>
                            <div className="cred-col-action">
                                {(mode === 'signin' || mode === 'update_password') && (
                                    <button 
                                        type="button" 
                                        className="basic-3d-button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? 'HIDE' : 'SHOW'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CONFIRM PASSWORD ROW (Only active during update_password) */}
                        {mode === 'update_password' && (
                            <div className="credentials-row">
                                <label className="cred-col-label">
                                    Confirm Password:
                                </label>
                                <div className="cred-col-input">
                                    <input 
                                        maxLength={128}
                                        placeholder="••••••••"
                                        onFocus={clearMessages}
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            clearMessages();
                                            setConfirmPassword(e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleLogin();
                                            }
                                        }}
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
                        )}
                    </div>

                </div>

                {/* ERROR & SUCCESS MESSAGES */}
                {authError && (
                    <div className="modal-feedback-box error" style={{ marginTop: '12px' }}>
                        <span>⚠️</span>
                        <span>{authError}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="modal-feedback-box success" style={{ marginTop: '12px' }}>
                        <span>✅</span>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* --- FOOTER PANEL --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        
                        {/* LEFT ACTIONS */}
                        <div className="button-group-left" style={{ display: 'flex', gap: '8px' }}>
                            {mode === 'signin' && (
                                <button 
                                    type="button"
                                    className="basic-3d-button"
                                    onClick={handleForgotClick}
                                >
                                    Forgot Password?
                                </button>
                            )}

                            {mode === 'forgot_code_sent' && (
                                <button 
                                    type="button"
                                    className="basic-3d-button"
                                    onClick={handleSendCodeClick}
                                >
                                    Send
                                </button>
                            )}
                        </div>

                        {/* RIGHT ACTIONS */}
                        <div className="button-group-right" style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                type="button"
                                className="basic-3d-button btn-cancel-3d" 
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button 
                                type="button"
                                className="basic-3d-button" 
                                onClick={handleLogin}
                                onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                            >
                                {getPrimaryButtonLabel()}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};