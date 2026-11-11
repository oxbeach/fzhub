import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpTrigger }  from '../Help/HelpTrigger';

import GlobalSettings, { initialSettings, broadcastSettingsChange } from './GlobalSettings';


// Sibling Styles imports
import '../Styles/Core/BaseThemes.css';
import '../Styles/Modals/PortfolioModals.css';
import '../Styles/Buttons/PrimaryActions.css';
import '../Styles/Buttons/UtilityButtons.css';

export const GlobalSettings_modal = ({ 
    repository,
    onClose,
}) => {
    // SSR / Hydration guard
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // GLOBALS STATE INITIALIZATION (Seeded directly from GlobalSettings module)
    const [startYear, setStartYear]   = useState(initialSettings?.timeSpan?.startYear ?? 2008);
    const [endYear, setEndYear]       = useState(initialSettings?.timeSpan?.endYear ?? 2025);
    const [mhp, setMhp]               = useState(initialSettings?.mhp ?? 3);
    const [threshold, setThreshold]   = useState(initialSettings?.threshold ? initialSettings.threshold * 100 : 10);
    const [useFiller, setUseFiller]   = useState(initialSettings?.useFiller ?? false);
    const [fillerRate, setFillerRate] = useState(initialSettings?.fillerRate ? initialSettings.fillerRate * 100 : 5);

    // Numeric parsing for dynamic validations
    const numStart = parseInt(startYear, 10);
    const numEnd = parseInt(endYear, 10);
    const numMhp = parseInt(mhp, 10);

    // Derived Period calculation
    const calculatedPeriod = Math.max(0, numEnd - numStart + 1);

    // --- ESSENTIALS VALIDATION ---
    const getEssentialsError = () => {
        if (numStart > numEnd) {
            return "Start Year must be ≤ End Year";
        }
        if (numMhp > calculatedPeriod) {
            return "MHP exceeds Period";
        }
        return null;
    };

    const essentialsError = getEssentialsError();

    // Handlers
    const handleAccept = () => {
        if (essentialsError) return;

        const rateDecimal = useFiller ? parseFloat(fillerRate) / 100 : 0;
        const thresholdDecimal = parseFloat(threshold) / 100;

        const newSettings = {
            timeSpan:   { startYear: numStart, endYear: numEnd },
            mhp:        numMhp,
            threshold:  thresholdDecimal,
            useFiller:  useFiller,
            fillerRate: rateDecimal
        };

        // Update initialSettings object in memory
        Object.assign(initialSettings, newSettings);

        // Broadcast change to subscribers
        broadcastSettingsChange(initialSettings);

        onClose();
    };

    // Year Dropdown Range
    const { allYears: yearOptions } = repository?.getYearData?.() ?? {};

    if (!mounted) return null;

    return createPortal(
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide">

                <div className="header-region-title-2">
                    Settings
                     <HelpTrigger keyName="settings" size="sm" />
                </div>

                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- GLOBAL ESSENTIALS PANEL --- */}
                <div className="define-globals-panel" style={{ position: 'relative' }}>
                    <div className="globals-row">
                        <div>
                            <label>Start Year: </label>
                            <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
                                {yearOptions?.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div>
                            <label>End Year: </label>
                            <select value={endYear} onChange={(e) => setEndYear(Number(e.target.value))}>
                                {yearOptions?.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="period-label">
                            Period: {calculatedPeriod} Years
                        </div>
                    </div>

                    <div className="globals-row">
                        <label>MHP (Minimum Hold Period): </label>
                        <select value={mhp} onChange={(e) => setMhp(e.target.value)}>
                            {["0 (All)", 1, 2, 3, 4, 5, 7, 8, 9, 10, 15, 20, 25, 30].map(m => (
                                <option key={m} value={m}>{m} Years</option>
                            ))}
                        </select>
                    </div>

                    <div className="globals-row">
                        <label>Threshold: </label>
                        <input 
                            type="number" 
                            className="input-narrow"
                            value={threshold} 
                            onChange={(e) => setThreshold(e.target.value)} 
                        />
                        <span>%</span>
                    </div>

                    <div className="globals-row-filler">
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                checked={useFiller} 
                                onChange={(e) => setUseFiller(e.target.checked)} 
                            />
                            Use Filler Return
                        </label>

                        {useFiller && (
                            <div className="inline-group">
                                <label>Rate: </label>
                                <input 
                                    type="number" 
                                    className="input-narrow"
                                    value={fillerRate} 
                                    onChange={(e) => setFillerRate(e.target.value)} 
                                />
                                <span>%</span>
                            </div>
                        )}
                    </div>

                    {/* --- ESSENTIALS WARNING BOX --- */}
                    {essentialsError && (
                        <div style={{
                            position: 'absolute',
                            right: '20px',
                            bottom: '15px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #f44336',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            color: '#d32f2f',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <span>⚠️</span>
                            <span>{essentialsError}</span>
                        </div>
                    )}
                </div>

                {/* --- FOOTER ACTIONS --- */}
                <div className="define-assets-panel">
                    <div className="fz-modal-footer">
                        <div className="button-group-left"></div>

                        <div className="button-group-right">
                            <button className="basic-3d-button btn-cancel-3d" onClick={onClose}>
                                Cancel
                            </button>
                            
                            <button 
                                className="basic-3d-button" 
                                disabled={Boolean(essentialsError)}
                                onClick={handleAccept}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};