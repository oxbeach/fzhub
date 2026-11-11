'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchSessionNames } from './File_DBaccess';
import { SaveTaskView }   from './SaveTaskView';
import { RenameTaskView } from './RenameTaskView';
import { DeleteTaskView } from './DeleteTaskView';
import { LoadTaskView }   from './LoadTaskView';
import { useHelp }        from '../Help/HelpContext';

export function FileModal({ 
    showModal, 
    onClose, 
    portfolios = [], 
    onLoad, 
}) {
    const [activeTask, setActiveTask]   = useState('NONE'); // 'NONE' | 'SAVE' | 'LOAD' | 'RENAME' | 'DELETE'
    const [dbSessions, setDbSessions]   = useState([]);
    const [isOperating, setIsOperating] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Hydration guard for Next.js SSR / Portal usage
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch existing session names from DB when modal opens and sort alphabetically
    const refreshSessions_ORGINAL = async () => {
        const { data } = await fetchSessionNames();
        setDbSessions(data || []);
    };

    // Error state for your global/banner notification
    const [dbError, setDbError] = useState(false);
    const { openHelp } = useHelp();

    // Fetch existing session names from DB when modal opens and sort alphabetically
    const refreshSessions = async () => {
        setDbError(false); // Reset prior to fetch
        const { data, error } = await fetchSessionNames();
        
        if (error) {
            openHelp('ERR_SESSION_FAILURE', false, false, true);
            setDbError(true); // Triggers your unified error banner
            setDbSessions([]); // Keeps it clean on failure
            return;
        }

        setDbSessions(data || []);
    };








    useEffect(() => {
        if (showModal) {
            refreshSessions();
            setActiveTask('NONE');
            setIsOperating(false);
        }
    }, [showModal]);

    // Handles backing out to main view vs. fully closing the modal
    const handleExitOrCancel = () => {
        if (activeTask !== 'NONE') {
            setActiveTask('NONE');
        } else {
            onClose();
        }
    };

    if (!showModal || !mounted) return null;

    return createPortal(
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide">

                {/* Title */}
                <div className="header-region-title-2">
                    File Operations
                </div>

                {/* Exit Button - Backs out or closes, locked during DB operation */}
                <button 
                    className="basic-exit" 
                    onClick={handleExitOrCancel} 
                    disabled={isOperating}
                >
                    Exit
                </button>

                {/* --- MAIN CONTENT PANEL --- */}
                <div className="define-globals-panel">
                    {activeTask === 'NONE' && (
                        <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                            <p className="file-nudge-message">
                                Ready to process active portfolios ({portfolios.length} in session).
                            </p>
                        </div>
                    )}

                    {activeTask === 'SAVE' && (
                        <SaveTaskView 
                            dbSessions={dbSessions} 
                            portfolios={portfolios} 
                            onClose={onClose}
                            onOpChange={setIsOperating}
                            onComplete={() => { 
                                refreshSessions(); 
                                setActiveTask('NONE'); 
                            }} 
                        />
                    )}

                    {activeTask === 'RENAME' && (
                        <RenameTaskView 
                            dbSessions={dbSessions} 
                            onClose={() => setActiveTask('NONE')}
                            onOpChange={setIsOperating}
                            onComplete={() => { 
                                refreshSessions(); 
                                setActiveTask('NONE'); 
                            }} 
                        />
                    )}

                    {activeTask === 'DELETE' && (
                        <DeleteTaskView 
                            dbSessions={dbSessions} 
                            onClose={() => setActiveTask('NONE')}
                            onOpChange={setIsOperating}
                            onComplete={() => { 
                                refreshSessions(); 
                                setActiveTask('NONE'); 
                            }} 
                        />
                    )}

                    {activeTask === 'LOAD' && (
                        <LoadTaskView 
                            dbSessions={dbSessions} 
                            onClose={() => setActiveTask('NONE')}
                            onOpChange={setIsOperating}
                            onComplete={(data) => { 
                                if (onLoad && data) {
                                    onLoad(data); // <--- Pass loaded DB data up to LibraryUI's handleLoad
                                }
                                refreshSessions(); 
                                setActiveTask('NONE');
                                onClose(); // Close the FileModal completely
                            }} 
                        />
                    )}
                </div>

                {/* --- FOOTER ACTIONS --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        <div className="button-group-left">
                            <button 
                                className="basic-3d-button btn-cancel-3d" 
                                onClick={handleExitOrCancel}
                                disabled={isOperating}
                                onKeyDown={(e) => { if (e.key === 'Tab' && !isOperating) { e.preventDefault(); } }}
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="button-group-right">
                            <button 
                                className="basic-3d-button" 
                                onClick={() => setActiveTask('DELETE')} 
                                disabled={isOperating || activeTask !== 'NONE'}
                            >
                                Delete
                            </button>
                            <button 
                                className="basic-3d-button" 
                                onClick={() => setActiveTask('RENAME')} 
                                disabled={isOperating || activeTask !== 'NONE'}
                            >
                                Rename
                            </button>
                            <button 
                                className="basic-3d-button" 
                                onClick={() => setActiveTask('LOAD')} 
                                disabled={isOperating || activeTask !== 'NONE'}
                            >
                                Load
                            </button>
                            <button 
                                className="basic-3d-button" 
                                onClick={() => setActiveTask('SAVE')} 
                                disabled={isOperating || activeTask !== 'NONE'}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}