'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PortfolioModal_Rename({ portfolios = [], onClose, onRename }) {
    const [selectedPortfolio, setSelectedPortfolio] = useState('');
    const [newName, setNewName]                     = useState('');
    const [message, setMessage]                     = useState('Select a portfolio and enter a new name.');
    const [mounted, setMounted]                     = useState(false);

    // SSR / Hydration guard
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleConfirmRename = () => {
        if (!selectedPortfolio) {
            setMessage('Please select a portfolio to rename.');
            return;
        }

        const trimmedNewName = newName.trim();
        if (!trimmedNewName) {
            setMessage('Please enter a valid new name.');
            return;
        }

        if (selectedPortfolio === trimmedNewName) {
            setMessage('New name must be different from the current name.');
            return;
        }

        const isDuplicate = portfolios.some(
            (p) => (typeof p === 'string' ? p : p.name || p.portfolio_name) === trimmedNewName
        );

        if (isDuplicate) {
            setMessage(`A portfolio named "${trimmedNewName}" already exists.`);
            return;
        }

        if (onRename) {
            onRename(selectedPortfolio, trimmedNewName);
        }
        onClose();
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide">
                
                {/* HEADER ROW: Badge Title and Exit Button on the same row */}
              
                    <div className="header-region-title-2">Rename Portfolio</div>
                    <button className="basic-exit" onClick={onClose}>
                        Exit
                    </button>
              
                {/* MAIN CONTENT AREA */}
                
                <div className="define-globals-panel">
                    <p style={{ margin: '0 0 15px 0', fontWeight: '500', fontSize: '16px', textAlign: 'center' }}>
                        {message}
                    </p>

                   <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
    
                        {/* Left Side: Portfolio List Box (Added minWidth: 0) */}
                        <div style={{ flex: '1', minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                                Select Portfolio to Rename:
                            </label>
                            <div 
                                style={{ 
                                    height: '185px', 
                                    overflowY: 'auto', 
                                    border: '1px solid #ccc', 
                                    borderRadius: '4px', 
                                    backgroundColor: '#ffffff'
                                }}
                            >
                                {portfolios.length === 0 ? (
                                    <div style={{ padding: '8px 12px', color: '#888', fontSize: '13px', fontStyle: 'italic' }}>
                                        (No active portfolios)
                                    </div>
                                ) : (
                                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                        {portfolios.map((portfolio, idx) => {
                                            const name = typeof portfolio === 'string' ? portfolio : portfolio.name || portfolio.portfolio_name;
                                            const isSelected = selectedPortfolio === name;

                                            return (
                                                <li 
                                                    key={idx} 
                                                    onClick={() => {
                                                        setSelectedPortfolio(name);
                                                        setNewName('');
                                                    }}
                                                    className={isSelected ? 'portfolio-list-item selected' : 'portfolio-list-item'}
                                                    title={name}
                                                >
                                                    {name}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Input Fields (Added minWidth: 0) */}
                        <div style={{ flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                                    Current Name:
                                </label>
                                <input
                                    type="text"
                                    value={selectedPortfolio}
                                    disabled
                                    placeholder="Select a portfolio from list..."
                                    title={selectedPortfolio || ''}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                                    New Portfolio Name:
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter new name..."
                                    title={newName || ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Tab' && (!selectedPortfolio || !newName.trim())) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                    </div>

                </div>

                {/* BOTTOM ACTION BAR */}
                <div 
                    style={{
                        backgroundColor: '#fffde7',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '15px',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
                    }}
                >
                    <button className="basic-3d-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        className="basic-3d-button" 
                        onClick={handleConfirmRename} 
                        disabled={!selectedPortfolio || !newName.trim()}
                        onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                    >
                        Accept
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}