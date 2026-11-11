'use client';

import React, { useState } from 'react';
import { deleteSession } from './File_DBaccess';

/* ==========================================
   SUB-COMPONENT: DELETE TASK VIEW
   ========================================== */
export function DeleteTaskView({ dbSessions, onClose, onComplete, onOpChange }) {
    const [selectedSession, setSelectedSession] = useState('');
    const [mode, setMode]                       = useState('SELECT'); // 'SELECT' | 'CONFIRM_DELETE'
    const [message, setMessage]                 = useState('Select a session from the list to delete.');
    const [isLoading, setIsLoading]             = useState(false);
    
    // Track hovered session index for description card
    const [hoveredIdx, setHoveredIdx]           = useState(null);

    const handleInitialDeleteClick = () => {
        if (!selectedSession) {
            setMessage('Please select a session to delete.');
            return;
        }
        setMessage(`This will permanently delete "${selectedSession}"?`);
        setMode('CONFIRM_DELETE');
    };

    const handleConfirmDelete = async () => {
        if (!selectedSession) return;

        setIsLoading(true);
        if (onOpChange) onOpChange(true);

        const { success } = await deleteSession(selectedSession);

        setIsLoading(false);
        if (onOpChange) onOpChange(false);

        if (success) {
            setMessage('Session deleted successfully!');
            setTimeout(() => {
                onComplete();
                onClose();
            }, 1000);
        } else {
            setMessage('Error deleting session. Please try again.');
            setMode('SELECT');
        }
    };

    const handleCancelDelete = () => {
        setMessage('Select a session from the list to delete.');
        setMode('SELECT');
    };

    // Clean optional-chaining fallback check for hover description
    const activeHoveredSession = hoveredIdx !== null ? dbSessions[hoveredIdx] : null;
    const hoverDescription = activeHoveredSession?.description 
        ? activeHoveredSession.description 
        : 'No description for this session.';

    return (
        <div style={{ position: 'relative', padding: '20px' }}>
            
            {/* Hover Description Overlay Card */}
            {hoveredIdx !== null && (
                <div 
                    className="help-card"
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '20px',
                        width: '280px',
                        maxHeight: '85px',
                        overflowY: 'auto',
                        padding: '8px 12px',
                        zIndex: 50,
                        pointerEvents: 'none'
                    }}
                >
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#fffde7', fontSize: '11px', textTransform: 'uppercase' }}>
                        Session Description
                    </p>
                    <p style={{ margin: '3px 0 0 0', color: '#e2e8f0', fontSize: '12px', lineHeight: '1.35', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                        {hoverDescription}
                    </p>
                </div>
            )}

            <p className="file-nudge-message">
                {message}
            </p>

            <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                {/* Session List */}
                <div style={{ flex: '1' }}>
                    <label className="file-label">
                        Select Session:
                    </label>
                    <div 
                        style={{ 
                            height: '210px', 
                            overflowY: 'auto', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px', 
                            backgroundColor: '#fafafa'
                        }}
                    >
                        {dbSessions.length === 0 ? (
                            <div style={{ padding: '8px 12px', color: '#888', fontSize: '13px', fontStyle: 'italic' }}>
                                (No saved sessions)
                            </div>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {dbSessions.map((session, idx) => {
                                    const name = typeof session === 'string' ? session : session.session_name || session.name;
                                    const isSelected = selectedSession === name;

                                    return (
                                        <li 
                                            key={idx} 
                                            onClick={() => {
                                                if (mode === 'SELECT') {
                                                    setSelectedSession(name);
                                                    setMessage('Select a session from the list to delete.');
                                                }
                                            }}
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                            onMouseLeave={() => setHoveredIdx(null)}
                                            style={{ 
                                                padding: '6px 12px', 
                                                fontSize: '14px', 
                                                fontWeight: 'normal',
                                                borderBottom: idx < dbSessions.length - 1 ? '1px solid #eee' : 'none',
                                                color: 'black',
                                                cursor: mode === 'SELECT' ? 'pointer' : 'default',
                                                backgroundColor: isSelected 
                                                    ? '#cbd5e1' 
                                                    : hoveredIdx === idx 
                                                    ? '#e2e8f0' 
                                                    : 'transparent'
                                            }}
                                        >
                                            {name}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Selected Session Display / Warning Panel */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label className="file-label">
                            Target Session:
                        </label>
                        <input
                            type="text"
                            value={selectedSession}
                            title={selectedSession || 'No session selected'}
                            disabled
                            placeholder="Select a session to remove..."
                            style={{ 
                                width: '100%', 
                                padding: '8px', 
                                fontSize: '13px', 
                                fontWeight: 'normal',
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#f1f5f9',
                                color: '#475569'
                            }}
                        />
                    </div>

                    {mode === 'CONFIRM_DELETE' && (
                        <div 
                            style={{ 
                                padding: '12px', 
                                backgroundColor: '#fef2f2', 
                                border: '1px solid #fca5a5', 
                                borderRadius: '4px',
                                color: '#991b1b',
                                fontSize: '13px'
                            }}
                        >
                            <strong>Warning:</strong> This action cannot be undone. This session data will be permanently removed from your account.
                        </div>
                    )}
                </div>
            </div>

            {/* Action Trigger Buttons */}
            <div className="button-group-right" style={{ marginTop: '20px', textAlign: 'right' }}>
                {mode === 'SELECT' && (
                    <button 
                        className="basic-3d-button" 
                        onClick={handleInitialDeleteClick} 
                        disabled={isLoading || !selectedSession}
                    >
                        Delete
                    </button>
                )}

                {mode === 'CONFIRM_DELETE' && (
                    <>
                        <button 
                            className="basic-3d-button btn-cancel-3d" 
                            onClick={handleCancelDelete} 
                            disabled={isLoading}
                            style={{ marginRight: '8px' }}
                        >
                            No (Cancel)
                        </button>
                        <button 
                            className="basic-3d-button" 
                            onClick={handleConfirmDelete} 
                            disabled={isLoading}
                        >
                            {isLoading ? 'Deleting...' : 'Yes (Delete)'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}