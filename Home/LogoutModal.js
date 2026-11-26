import React from 'react';

export const LogoutModal = ({ isOpen, onConfirmLogout, onReturnToWorkspace }) => {
    if (!isOpen) return null;

    return (
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide" style={{ width: '440px' }}>

                {/* --- HEADER TITLE PILL --- */}
                <div className="header-region-title-2">
                    Confirm Logout
                </div>

                {/* --- MAIN PANEL --- */}
                <div
                    className="define-globals-panel"
                    style={{
                        position: 'relative',
                        textAlign: 'center',
                        padding: '24px 16px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: 'black',
                        lineHeight: '1.5'
                    }}
                >
                    UNSAVED PORTFOLIOS?<br />
                    You can return to workspace, select "File" and save under a session name.
                </div>

                {/* --- FOOTER PANEL --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        
                        <div className="button-group-right" style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="basic-3d-button"
                                onClick={onConfirmLogout}
                            >
                                Continue with Logout
                            </button>
                        </div>

                        <div className="button-group-left" style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="basic-3d-button"
                                onClick={onReturnToWorkspace}
                            >
                                Return to workspace
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};