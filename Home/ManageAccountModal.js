
import { useState, useEffect } from 'react';
import { useHelp } from '../Help/HelpContext';
import { createClient } from '@supabase/supabase-js';
import { ProgressBar, ProgressCountdown } from '../Utils/ProgressBar';
import '../Styles/Global/Account.css';

import { supabase } from '../Utils/supabase'; 


export const ManageAccountModal = ({ 
    isOpen, 
    onClose,
    handleEmailUpdate 
}) => {
    // Panel 1: Security Verification Gate State (Starts locked/false)
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    // Panel 2: Email Management State
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

    // Panel 3: Password Management State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // Toggle state for password visibility

    // Panel 4: Global Feedback State
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setErrorMessage('');
            setSuccessMessage('');
        }
    }, [isOpen]);

    const { openHelp } = useHelp();

   
    const countdown = ProgressCountdown(isProcessing);
    
   
    if (!isOpen) return null;

    // Handler to send the 8-digit OTP code to the logged-in user's email
    // Handler to send the 8-digit OTP code to the logged-in user's email
    const handleSendOtp = async () => {
        setOtpError('');
        setSuccessMessage('');
        setIsSendingOtp(true);

        // Helper to wrap promise with a timeout
        const timeoutPromise = (ms) => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out.')), ms)
        );

        setIsProcessing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) throw new Error('No active session found.');

            // Race the OTP sign-in request against a 10-second timeout
            const { error } = await Promise.race([
                supabase.auth.signInWithOtp({
                    email: session.user.email,
                    options: { shouldCreateUser: false } 
                }),
                timeoutPromise(10000) // 10 seconds
            ]);
         
            if (error) throw new Error(error.message);

            setSuccessMessage('Verification code sent to your email.');
        } catch (err) {
            if (err.message === 'Request timed out.') {
                setOtpError('Request timed out. The database or server took too long to respond.');
            } else {
                setOtpError(err.message || 'Failed to send verification code.');
            }
        } finally {
            // Clear the timer so the overlay never pops up after the request has finished
            setIsSendingOtp(false);
            setIsProcessing(false);
        }
    };

    // Handler for Panel 1: Security Verification Gate Verification

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setOtpError('');
        setSuccessMessage('');
        

        if (!otpCode || otpCode.length < 8) {
            setOtpError('Please enter a valid 8-digit verification code.');
            return;
        }

        setIsVerifyingOtp(true);
        setIsProcessing(true);

        // Helper to wrap promise with a timeout
        const timeoutPromise = (ms) => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out.')), ms)
        );

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) throw new Error('No active session found.');

            // Race the OTP verification against a 10-second timeout
            const { error } = await Promise.race([
                supabase.auth.verifyOtp({
                    email: session.user.email,
                    token: otpCode,
                    type: 'email'
                }),
                timeoutPromise(10000) // 10 seconds
            ]);

            if (error) throw new Error(error.message);

            setIsEmailVerified(true);
            setSuccessMessage('Account settings unlocked successfully.');
        } catch (err) {
            if (err.message === 'Request timed out.') {
                setOtpError('Request timed out. The database or server took too long to respond.');
            } else {
                setOtpError(err.message || 'Invalid verification code. Please try again.');
            }
        } finally {
            // Clear the timer so the overlay never pops up after the request has finished
            setIsVerifyingOtp(false);
            setIsProcessing(false);
        }
    };

    // Handler for Panel 2: Email Update (Executes instantly, UUID-linked)
    const handleEmailSubmit = async () => {
        setErrorMessage('');
        setSuccessMessage('');
        

        const cleanEmail = newEmail.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        if (cleanEmail !== confirmEmail.trim()) {
            setErrorMessage('Email addresses do not match.');
            return;
        }

        setIsEmailSubmitting(true);
        setIsProcessing(true);

        try {
            // Get the current logged-in user's immutable UUID safely
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found.');

            const response = await fetch('/api/update-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),               
                body: JSON.stringify({
                    userId: session.user.id, // Immutable UUID reference
                    newEmail: cleanEmail
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update email.');

            // --- FIX: Resync local client session to pull down the updated email claims ---
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                //console.warn('Email updated, but session refresh encountered an issue:', refreshError.message);
            }
            // -----------------------------------------------------------------------------

            setSuccessMessage('Successfully updated your email address instantly!');
            setNewEmail('');
            setConfirmEmail('');

            // Re-lock the security gate for the new email address
            setIsEmailVerified(false);
            setOtpCode('');

            if (handleEmailUpdate) {
                handleEmailUpdate(cleanEmail);
            }
        } catch (err) {
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                setErrorMessage('Request timed out. The database or server took too long to respond.');
            } else {
                setErrorMessage(err.message || 'Failed to update email.');
            }
        } finally {
            // Clear the timer so the overlay never pops up after the request has finished
            setIsEmailSubmitting(false);
            setIsProcessing(false);
        }
    };


   // Handler for Panel 3: Password Update (Executes instantly)
    const handlePasswordSubmit = async () => {
        setErrorMessage('');
        setSuccessMessage('');
        

        if (!newPassword) {
            setErrorMessage('Please enter a new password.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setIsProcessing(true);
        setIsPasswordSubmitting(true);


        try {
            // Get the current logged-in user's immutable UUID safely
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found.');

            // tests the progressBar
            //await new Promise((resolve) => setTimeout(resolve, 4000)); // 4-second artificial pause

            const response = await fetch('/api/update-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify({
                    userId: session.user.id, // Immutable UUID reference
                    newPassword: newPassword
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update password.');

            // --- FIX: Server invalidated old tokens on password change. 
            // Automatically sign back in with the new password to get a fresh, valid session. ---
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: session.user.email,
                password: newPassword
            });

            if (signInError) throw new Error('Password updated, but failed to re-establish session. Please log in again.');
            // -----------------------------------------------------------------------------------


            setSuccessMessage('Successfully updated your password!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                setErrorMessage('Request timed out. The database or server took too long to respond.');
            } else {
                setErrorMessage(err.message || 'Failed to update password.');
            }
        } finally {
            // Clear the timer so the overlay never pops up after the request has finished

            setIsPasswordSubmitting(false);
            setIsProcessing(false);
        }
    };


    // Computed match helpers to control activation of update buttons
    const isEmailMatch    = newEmail.trim().length > 0 && newEmail.trim() === confirmEmail.trim();
    const isPasswordMatch = newPassword.length >= 6 && newPassword === confirmPassword;

    return (
        <div className="fz-modal-overlay">

            <ProgressBar isProcessing={isProcessing} countdown={countdown} />

            <div className="fz-modal-container-wide" style={{ width: '800px', maxWidth: '95%' }}>

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    Manage Account Credentials
                </div>

                {/* --- TOP-RIGHT EXIT BUTTON --- */}
                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- SECURITY VERIFICATION GATE PANEL (Top if unverified) --- */}
                {!isEmailVerified && (
                    <div className="define-globals-panel" style={{ position: 'relative', padding: '25px', marginBottom: '15px' }}>
                        <div style={{ padding: '18px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 'bold', color: '#ff7300', marginBottom: '6px', fontSize: '0.95rem' }}>
                                🔒 Security Verification Required
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'black', marginBottom: '25px', textAlign: 'center'}}>
                                Click "Send Code" to receive an 8-digit verification code at your current email to unlock account
                            </p>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center'}}>
                                <input
                                    type="text"
                                    maxLength={8}
                                    placeholder="12345678"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    style={{ width: '130px', height: '32px', textAlign: 'center', letterSpacing: '2px', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    className="basic-3d-button"
                                    onClick={handleSendOtp}
                                    disabled={isSendingOtp}
                                    style={{ height: '30px', width: '85px', padding: '0 16px', cursor: isSendingOtp ? 'not-allowed' : 'pointer', opacity: isSendingOtp ? 0.5 : 1 }}
                                >
                                    {isSendingOtp ? 'Sending...' : 'Send Code'}
                                </button>
                                <button
                                    type="button"
                                    className="basic-3d-button"
                                    onClick={handleVerifyOtp}
                                    disabled={isVerifyingOtp}
                                    style={{ height: '30px', width: '85px', padding: '0 16px', cursor: isVerifyingOtp ? 'not-allowed' : 'pointer', opacity: isVerifyingOtp ? 0.5 : 1 }}
                                >
                                    {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                            {otpError &&
                                 <div style={{ color: '#d32f2f', fontSize: '1.0rem', marginTop: '10px' }}>
                                    ⚠️ {otpError}
                                </div>
                            }
                        </div>
                    </div>
                )}

                {/* --- UNLOCKED WRAPPER FOR PANELS --- */}
                <div style={{ 
                    opacity: isEmailVerified ? 1 : 0.4, 
                    pointerEvents: isEmailVerified ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>

                    {/* --- PANEL 1: EMAIL MANAGEMENT --- */}
                    <div className="define-globals-panel" style={{ position: 'relative', padding: '25px' }}>
                        
                        <div className="account-form-credentials-group">
                            <div className="credentials-row">
                                <label className="cred-col-label">New Email:</label>
                                <div className="cred-col-input">
                                    <input 
                                        autoFocus
                                        type="email" 
                                        placeholder="user@example.com"
                                        value={newEmail}
                                        maxLength={254}
                                        onChange={(e) => setNewEmail(e.target.value)}
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
                                <label className="cred-col-label">Confirm New Email:</label>
                                <div className="cred-col-input">
                                    <input 
                                        type="email" 
                                        placeholder="user@example.com"
                                        value={confirmEmail}
                                        maxLength={254}
                                        onChange={(e) => setConfirmEmail(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            height: '32px', 
                                            boxSizing: 'border-box',
                                            backgroundColor: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div className="cred-col-action">
                                    <button 
                                        type="button"
                                        className="basic-3d-button btn-cancel-3d" 
                                        disabled={!isEmailMatch || isEmailSubmitting}
                                        onClick={handleEmailSubmit}
                                        style={{ 
                                            width: '100%',
                                            height: '30px',
                                            cursor: isEmailMatch && !isEmailSubmitting ? 'pointer' : 'not-allowed',
                                            opacity: isEmailMatch && !isEmailSubmitting ? 1 : 0.5
                                        }}
                                    >
                                        {isEmailSubmitting ? 'Updating...' : 'Update'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- PANEL 2: PASSWORD MANAGEMENT --- */}
                    <div className="define-globals-panel" style={{ position: 'relative', padding: '25px' }}>

                        <div className="account-form-credentials-group">
                            <div className="credentials-row">
                                <label className="cred-col-label">New Password:</label>
                                <div className="cred-col-input">
                                    <input 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="••••••••"
                                        value={newPassword}
                                        maxLength={128}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            height: '32px', 
                                            boxSizing: 'border-box',
                                            backgroundColor: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div className="cred-col-action">
                                    <button 
                                        type="button"
                                        className="basic-3d-button btn-cancel-3d" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ 
                                            width: '100%',
                                            height: '30px',
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            <div className="credentials-row">
                                <label className="cred-col-label">Confirm New Password:</label>
                                <div className="cred-col-input">
                                    <input 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        maxLength={128}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            height: '32px', 
                                            boxSizing: 'border-box',
                                            backgroundColor: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div className="cred-col-action">
                                    <button 
                                        type="button"
                                        className="basic-3d-button btn-cancel-3d" 
                                        disabled={!isPasswordMatch || isPasswordSubmitting}
                                        onClick={handlePasswordSubmit}
                                        style={{ 
                                            width: '100%',
                                            height: '30px',
                                            cursor: isPasswordMatch && !isPasswordSubmitting ? 'pointer' : 'not-allowed',
                                            opacity: isPasswordMatch && !isPasswordSubmitting ? 1 : 0.5
                                        }}
                                    >
                                        {isPasswordSubmitting ? 'Updating...' : 'Update'}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* --- PANEL 3: FOOTER / ACTION PANEL --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="button-group-left">
                            <button 
                                type="button"          
                                className="basic-3d-button btn-cancel-3d" 
                                onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>

                       
                        <div style={{ 
                            flex: 1, 
                            width: '100%',
                            marginLeft: '15px',
                            boxSizing: 'border-box',
                            textAlign: 'center', 
                            padding: '10px 15px', 
                            borderRadius: '4px',
                            backgroundColor: errorMessage ? '#d32f2f' : successMessage ? '#2e7d32' : 'transparent',
                            color: '#ffffff',
                            fontWeight: '500'
                        }}>
                            {errorMessage && <span>⚠️ {errorMessage}</span>}
                            {successMessage && <span>✅ {successMessage}</span>}
                        </div>




                    </div>
                </div>

            </div>
        </div>
    );
};