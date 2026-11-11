'use client';

import React, { useState } from 'react';
import { renameSession } from './File_DBaccess';


/* ==========================================
   SUB-COMPONENT: RENAME TASK VIEW
   ========================================== */
export function RenameTaskView({ dbSessions = [], onClose, onComplete, onOpChange }) {
    const [selectedSession, setSelectedSession] = useState('');
    const [newName, setNewName]                 = useState('');
    const [message, setMessage]                 = useState('Select a session and enter a new name.');
    const [isLoading, setIsLoading]             = useState(false);

    // Track hovered session index for description overlay
    const [hoveredIdx, setHoveredIdx]           = useState(null);

    const handleConfirmRename = async () => {
        if (!selectedSession) {
            setMessage('Please select a session to rename.');
            return;
        }

        const trimmedNewName = newName.trim().slice(0, 35);
        if (!trimmedNewName) {
            setMessage('Please enter a valid new name.');
            return;
        }

        if (selectedSession === trimmedNewName) {
            setMessage('New name must be different from the current name.');
            return;
        }

        const isDuplicate = dbSessions.some(
            (s) => (typeof s === 'string' ? s : s.session_name) === trimmedNewName
        );

        if (isDuplicate) {
            setMessage(`A session named "${trimmedNewName}" already exists.`);
            return;
        }

        setIsLoading(true);
        if (onOpChange) onOpChange(true);

        const { success } = await renameSession(selectedSession, trimmedNewName);

        setIsLoading(false);
        if (onOpChange) onOpChange(false);

        if (success) {
            setMessage('Session renamed successfully!');
            setTimeout(() => {
                onComplete();
                onClose();
            }, 1000);
        } else {
            setMessage('Error renaming session. Please try again.');
        }
    };

    // Description fallback check matching SaveTaskView logic
    const activeHoveredSession = hoveredIdx !== null ? dbSessions[hoveredIdx] : null;
    const hoverDescription = activeHoveredSession?.description 
        ? activeHoveredSession.description 
        : 'No description for this session.';

    return (
        /* Relative parent container for overlay positioning */
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
                {/* Selectable Sessions List */}
                <div style={{ flex: '1' }}>
                    <label className="file-label">
                        Select Session to Rename:
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
                                            onClick={() => setSelectedSession(name)}
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                            onMouseLeave={() => setHoveredIdx(null)}
                                            style={{ 
                                                padding: '6px 0px 6px 6px',
                                                fontSize: '13px', 
                                                borderBottom: idx < dbSessions.length - 1 ? '1px solid #eee' : 'none',
                                                color: isSelected ? '#000' : '#000',
                                                fontWeight: isSelected ? 'normal' : 'normal',
                                                cursor: 'pointer',
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

                {/* Rename Inputs Panel */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label className="file-label">
                            Current Name:
                        </label>
                        <input
                            type="text"
                            value={selectedSession}
                            title={selectedSession || 'No session selected'}
                            disabled
                            placeholder="Select a session from list..."
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                fontSize: '14px', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#f1f5f9',
                                color: '#475569'
                            }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label className="file-label">
                                New Session Name:
                            </label>
                            <span style={{ fontSize: '11px', color: newName.trim().length > 35 ? '#d97706' : '#666' }}>
                                {newName.trim().length}/35 {newName.trim().length > 35 && '(Will trim)'}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={newName}
                            title={newName || 'No session selected'}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter new name..."
                            disabled={isLoading}
                            style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>


                    
                </div>



                
            </div>

            {/* Action Buttons */}
            <div className="button-group-right" style={{ marginTop: '20px', textAlign: 'right' }}>
                <button 
                    className="basic-3d-button" 
                    onClick={handleConfirmRename} 
                    disabled={isLoading || !selectedSession || !newName.trim()}
                >
                    {isLoading ? 'Renaming...' : 'Accept'}
                </button>
            </div>
        </div>
    );
}