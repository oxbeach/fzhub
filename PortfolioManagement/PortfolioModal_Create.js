'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PortfolioModal_Create({ 
    onClose, 
    onConfirm, 
    error 
}) {
    // Local state isolates keystrokes to this modal only
    const [name, setName] = useState('');
    const [mounted, setMounted] = useState(false);

    // SSR / Hydration guard
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleAccept = () => {
        onConfirm(name);
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fz-modal-overlay">
            <div className="modal-content" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                <div className="header-region-title-2">Create Portfolio</div>
                
                <div style={{ margin: '15px 0' }}>
                    <label 
                        htmlFor="portfolio-name-input" 
                        style={{ display: 'block', marginTop: '25px', marginBottom: '0px', fontWeight: 'bold' }}
                    >
                        Enter Portfolio Name:
                    </label>
                    <input 
                        id="portfolio-name-input"
                        type="text"
                        autoComplete="off"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAccept()}
                        placeholder="New Portfolio..."
                        className="modal-select" 
                        autoFocus
                    />
                    {error && (
                        <div style={{ color: '#1a1a1a', fontSize: '18px', marginTop: '5px', fontWeight: 'bold' }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                <div className="button-group-right">
                    <button className="basic-3d-button" onClick={onClose}>
                        Cancel
                    </button>
                    
                    <button 
                        className="basic-3d-button" 
                        onClick={handleAccept}
                        onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); }
                        }}
                        >
                        Accept
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}