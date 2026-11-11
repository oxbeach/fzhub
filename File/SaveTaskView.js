'use client';

import React, { useState } from 'react';
import { saveSession, serializePortfolios } from './File_DBaccess';
import { useHelp } from '../Help/HelpContext';

/* ==========================================
   SUB-COMPONENT: SAVE TASK VIEW
   ========================================== */
export function SaveTaskView({ dbSessions, portfolios, onClose, onComplete, onOpChange }) {
    const { openHelp } = useHelp();
    const [mode, setMode]                 = useState('SAVE'); // 'SAVE' | 'CONFIRM_OVERWRITE'
    const [sessionInput, setSessionInput] = useState('');
    const [description, setDescription]   = useState('');
    const [message, setMessage]           = useState('Enter a session name to save your active portfolios.');
    const [isLoading, setIsLoading]       = useState(false);
    
    // Track hovered session index
    const [hoveredIdx, setHoveredIdx]     = useState(null);

    const handleConfirmSave = async () => {
        const trimmedName = sessionInput.trim().slice(0, 35);
        if (!trimmedName) {
            setMessage('Please enter a valid session name.');
            return;
        }

        const isDuplicate = dbSessions.some(
            (s) => (typeof s === 'string' ? s : s.session_name) === trimmedName
        );

        // enforce a max of saving 40 unique session names
        if (!isDuplicate && dbSessions.length >= 40) {
            setMessage('Maximum limit of 40 sessions reached. Please overwrite an existing session or delete one.');
            return;
        }

        if (isDuplicate && mode !== 'CONFIRM_OVERWRITE') {
            setMessage(`Session "${trimmedName}" already exists. Overwrite?`);
            setMode('CONFIRM_OVERWRITE');
            return;
        }

       const serializeResults = serializePortfolios(portfolios);

        // 1. Separate successes and failures
        const successfulPayloads = serializeResults
            .filter(res => res && res.success === true && res.data)
            .map(res => res.data);

        const failedCount = serializeResults.length - successfulPayloads.length;

        // 2. Abort if no valid portfolios are ready to save
        if (successfulPayloads.length === 0) {
            setMessage('No valid portfolio data ready to save. Please compute portfolios first.');
            return;
        }

        setIsLoading(true);
        if (onOpChange) onOpChange(true);

        // 3. Pass only clean, unwrapped data payloads to saveSession
        const { success } = await saveSession(trimmedName, description.trim(), successfulPayloads);

        setIsLoading(false);
        if (onOpChange) onOpChange(false);

        // 4. Handle post-save messaging based on total success vs. partial success vs. DB error
        if (success) {
            if (failedCount > 0) {
                // Partial save: Trigger persistent Help Card
                setMessage(`Saved ${successfulPayloads.length} portfolio(s). ${failedCount} failed.`);
                openHelp("ERR_SERIALIZE_PARTIAL_SAVE");
            } else {
                setMessage('Operation successful!');
            }

            // Always complete and close on success (full or partial)
            setTimeout(() => {
                onComplete();
                onClose();
            }, 2000);
        } else {
            // Hard DB Save failure: keep modal open
            setMessage('Error saving session to Database. Please try again.');
            openHelp("ERR_DATABASE_SAVE_FAILURE");
        }
    };

    const handleCancelOverwrite = () => {
        setMessage('Enter a session name to save your active portfolios.');
        setMode('SAVE');
    };

    // Clean optional-chaining fallback check for description
    const activeHoveredSession = hoveredIdx !== null ? dbSessions[hoveredIdx] : null;
    const hoverDescription = activeHoveredSession?.description 
        ? activeHoveredSession.description 
        : 'No description for this session.';

    return (
        /* Red Container as relative parent anchor */
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
                {/* Existing Sessions List */}
                <div style={{ flex: '1' }}>
                    <label className="file-label">
                        Existing Sessions ({dbSessions.length}...40 max):
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

                                    return (
                                        <li 
                                            key={idx} 
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                            onMouseLeave={() => setHoveredIdx(null)}
                                            style={{ 
                                                padding: '6px 12px', 
                                                fontSize: '14px', 
                                                fontWeight: 'normal',
                                                borderBottom: idx < dbSessions.length - 1 ? '1px solid #eee' : 'none',
                                                color: 'black',
                                                cursor: 'pointer',
                                                backgroundColor: hoveredIdx === idx ? '#e2e8f0' : 'transparent'
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

                {/* Session Inputs */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label className="file-label">
                                Session Name:
                            </label>
                            <span style={{ fontSize: '11px', color: sessionInput.trim().length > 35 ? '#d97706' : '#666' }}>
                                {sessionInput.trim().length}/35 {sessionInput.trim().length > 35 && '(Will trim on save)'}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={sessionInput}
                            onChange={(e) => setSessionInput(e.target.value)}
                            placeholder="Enter name..."
                            autoFocus
                            disabled={mode === 'CONFIRM_OVERWRITE' || isLoading}
                            style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <label className="file-label">
                                Description:
                            </label>
                            <span style={{ fontSize: '11px', color: description.length >= 144 ? 'red' : '#666' }}>
                                {description.length}/144
                            </span>
                        </div>
                        <textarea
                            rows="4"
                            maxLength={144}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief summary of this session..."
                            disabled={mode === 'CONFIRM_OVERWRITE' || isLoading}
                            style={{ 
                                width: '100%', 
                                height: '100px',
                                padding: '8px', 
                                fontSize: '13px', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                resize: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Action Trigger Buttons */}
            <div className="button-group-right" style={{ marginTop: '20px', textAlign: 'right' }}>
                {mode === 'SAVE' && (
                    <button className="basic-3d-button" onClick={handleConfirmSave} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Accept'}
                    </button>
                )}

                {mode === 'CONFIRM_OVERWRITE' && (
                    <>
                        <button className="basic-3d-button btn-cancel-3d" onClick={handleCancelOverwrite} style={{ marginRight: '8px' }}>
                            No
                        </button>
                        <button className="basic-3d-button" onClick={handleConfirmSave} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Yes (Overwrite)'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}