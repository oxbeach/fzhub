'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PortfolioModal_Delete({
    portfolios,
    selectedId,
    setSelectedId,
    onClose,
    onConfirm
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activePortfolio = portfolios.find(p => String(p.id) === String(selectedId));
    const selectTooltip = activePortfolio ? activePortfolio.name : "Select a portfolio...";

    const truncateText = (text, maxLength = 40) => {
        if (!text) return "";
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fz-modal-overlay">
            <div className="modal-content" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                <div className="header-region-title-2">Delete Portfolio</div>
                
                <div style={{ margin: '25px 0 15px 0' }}>
                    <select 
                        value={selectedId} 
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="modal-select"
                        title={selectTooltip}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            paddingRight: '30px'
                        }}
                    >
                        <option value="" disabled>Select a portfolio...</option>
                        {portfolios.map(p => (
                            <option 
                                key={p.id} 
                                value={p.id}
                                title={p.name}
                            >
                                {truncateText(p.name, 42)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="button-group-right">
                    <button className="basic-3d-button" onClick={onClose}>
                        Cancel
                    </button>
                    
                    <button className="basic-3d-button" onClick={onConfirm}>
                        Accept
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}