import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- 1. IMPORT CREATEPORTAL
import { AssetWeight } from '../Utils/AssetWeight';
import TickerDropdown from '../src/MenuDropdown/TickerDropdown'; 
import { HelpTrigger } from '../Help/HelpTrigger';
import { TimeSpan } from '../app/TimeSpan';

// Sibling Styles imports
import '../Styles/Core/BaseThemes.css';
import '../Styles/Modals/PortfolioModals.css';
import '../Styles/Buttons/PrimaryActions.css';
import '../Styles/Buttons/UtilityButtons.css';

export const PortfolioModal_Define = ({ 
    isOpen, 
    onClose, 
    currentPortfolio, 
    allPortfolios = [], 
    symbolList,
    repository,
    onAccept,
}) => {
    // 2. MOUNTED STATE FOR HYDRATION / SSR SAFETY
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. ASSETS & WEIGHTS STATE
    const [assets, setAssets] = useState([]);
    const [isEqualWeight, setIsEqualWeight] = useState(false);

    // 2. GLOBALS OVERRIDE STATE
    const [startYear, setStartYear]   = useState(2000);
    const [endYear, setEndYear]       = useState(2025);
    const [mhp, setMhp]               = useState(3);
    const [threshold, setThreshold]   = useState(10);
    const [useFiller, setUseFiller]   = useState(false);
    const [fillerRate, setFillerRate] = useState(5);

    // 3. COPY SOURCE SELECTOR STATE
    const [selectedCopySource, setSelectedCopySource] = useState('');


    const makeAssetId = () => `asset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const createEmptyAsset = () => ({ id: makeAssetId(), ticker: '', weight: '' });

    // Populate state directly from currentPortfolio instance on open
    useEffect(() => {
        if (isOpen && currentPortfolio) {

            // Asset Setup
            const existing = currentPortfolio.assetsPercent || [];
            setIsEqualWeight(currentPortfolio.isEqualWeight || false);

            if (existing.length === 0) {
                setAssets([{ id: makeAssetId(), ticker: '', weight: '' }]);
            } else {
                const mapped = existing.map(a => ({
                    id: makeAssetId(),
                    ticker: a.ticker,
                    weight: (a.weight).toString()
                }));
                
                // Trailing empty row
                if (mapped[mapped.length - 1].ticker.trim() !== '') {
                    mapped.push(createEmptyAsset());
                }
                setAssets(mapped);
            }

            // Global Essentials setup
            const globals = currentPortfolio.GlobalEssentials;
            if (globals) {
                setStartYear(globals.timeSpan?.startYear ?? 2001);
                setEndYear(globals.timeSpan?.endYear ?? 2025);
                setMhp(globals.mhp ?? 3);
                setThreshold(globals.threshold ? globals.threshold * 100 : 10);
                setUseFiller(globals.useFiller ?? false);
                setFillerRate(globals.fillerRate ? globals.fillerRate * 100 : 5);
            }

            setSelectedCopySource('');
        }
    }, [isOpen, currentPortfolio]);





    // Numeric parsing for dynamic validations
    const numStart = parseInt(startYear, 10);
    const numEnd = parseInt(endYear, 10);
    const numMhp = parseInt(mhp, 10);

    // Derived Period calculation
    const calculatedPeriod = Math.max(0, numEnd - numStart + 1);

    // --- ESSENTIALS VALIDATION (ONLY 2 RULES) ---
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

    // Calculate total dynamically on every state update
    const totalWeight = assets.reduce((sum, item) => {
        const parsed = parseFloat(item.weight);
        return sum + (!isNaN(parsed) ? parsed : 0);
    }, 0);

    const isReady = Math.abs(totalWeight - 100) < 0.1;

 

    // Filter and normalize copy sources to ONLY include portfolios where isComputed === true
    const availableCopySources = Array.isArray(allPortfolios) 
        ? allPortfolios
            .filter(p => {
                const instance = p.instance || p;
                return Boolean(instance.isComputed || p.isComputed);
            })
            .map(p => ({
                name: p.name || p.instance?.name || '',
                instance: p.instance || p
            }))
        : [];

    // Display 100.00% if equal weight is set or if sum is within tolerance
    // 1. Add your processing state near your other component states


   
    const displayTotal   = (isEqualWeight || isReady) ? "100.00" : totalWeight.toFixed(2);
    const processMessage = `Total: ${displayTotal}%`;

    // 3. Update handleAccept to be async and await the upstream call
    const handleAccept = async () => {
        if (essentialsError || !isReady) return;

        const payload = assets
            .filter(a => a.ticker.trim() !== "")
            .map(a => new AssetWeight(a.ticker, a.weight));

        const isAccepted = currentPortfolio.SetAssets(payload, isEqualWeight);

        if (isAccepted) {
            const rateDecimal = useFiller ? parseFloat(fillerRate) / 100 : 0;
            const thresholdDecimal = parseFloat(threshold) / 100;

            currentPortfolio.setGlobalEssentials(
                numStart,
                numEnd,
                numMhp,
                thresholdDecimal,
                useFiller,
                rateDecimal
            );

            currentPortfolio.setDefineMode(true);
            onAccept(payload, isEqualWeight);
            onClose(); 
        }
    };

    const truncateText = (text, maxLength = 25) => {
        if (!text) return "";
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const handleEqualWeights = () => {
        const activeCount = assets.filter(a => a.ticker.trim() !== "").length;
        if (activeCount === 0) return;

        // Display string for the UI text boxes
        const displayVal = (Math.floor((100 / activeCount) * 100) / 100).toString();

        const next = assets.map(a => {
            if (a.ticker.trim() !== "") {
                return { ...a, weight: displayVal };
            }
            return a;
        });
        
        setAssets(next);
        setIsEqualWeight(true);
    };

    const handleWeightChange = (index, val) => {
        let finalVal = val;
        if (val !== "") {
            const numericVal = parseFloat(val);
            if (!isNaN(numericVal)) {
                if (numericVal > 100) finalVal = "100";
                if (numericVal < 0) finalVal = "0";
            }
        }

        const next = [...assets];
        next[index].weight = finalVal;
        
        setAssets(next);
        setIsEqualWeight(false);
    };

    const xxxhandleTickerChange = (index, symbol) => {
        const next = [...assets];
        next[index].ticker = symbol;

        if (index === assets.length - 1 && symbol.trim() !== '') {
            next.push({ticker: '', weight: '' });
        }

        setAssets(next);  
    };

    const handleTickerChange = (index, symbol) => {
        const next = [...assets];
        next[index].ticker = symbol;

        if (index === assets.length - 1 && symbol.trim() !== '') {
            next.push(createEmptyAsset());
        }

        setAssets(next);  
        
        // Direct synchronous check right after state change trigger
        //alert(`[FOCUS TRACE] Active element: <${document.activeElement.tagName}> class: "${document.activeElement.className}" id: "${document.activeElement.id}"`);
    };

 
    const handleRemoveRow = (indexToRemove) => {
        //if (assets.length <= 1) return;

        const updatedAssets = assets.filter((_, idx) => idx !== indexToRemove);

        if (updatedAssets.length === 0 || updatedAssets[updatedAssets.length - 1].ticker.trim() !== '') {
            updatedAssets.push(createEmptyAsset());
        }

        setAssets(updatedAssets);
        setIsEqualWeight(false);
    };

    const handleCopyPortfolio = (sourceName) => {
        if (!sourceName) return;

        const target = availableCopySources.find(p => p.name === sourceName);
        if (!target || !target.instance) return;

        const sourcePortfolio = target.instance;

        const globals = sourcePortfolio.GlobalEssentials;
        if (globals) {
            setStartYear(globals.timeSpan?.startYear ?? 2002);
            setEndYear(globals.timeSpan?.endYear ?? 2025);
            setMhp(globals.mhp ?? 3);
            setThreshold(globals.threshold ? globals.threshold * 100 : 10);
            setUseFiller(globals.useFiller ?? false);
            setFillerRate(globals.fillerRate ? globals.fillerRate * 100 : 5);
        }

        const sourceAssets = sourcePortfolio.assetsPercent || sourcePortfolio.assets || [];

        if (sourceAssets.length > 0) {
            const mapped = sourceAssets.map(a => ({
                id: makeAssetId(),
                ticker: String(a.ticker || ''),
                weight: a.weight !== undefined && a.weight !== null ? String(a.weight) : ''
            }));

            if (mapped.length === 0 || mapped[mapped.length - 1].ticker.trim() !== '') {
                mapped.push(createEmptyAsset());
            }

            setAssets([...mapped]);
        }
    };

    // Year Dropdown Range
    const { allYears: yearOptions } = repository?.getYearData?.() ?? {};

    // 3. PREVENT RENDER IF NOT OPEN OR NOT MOUNTED
    if (!isOpen || !mounted) return null;

    // 4. WRAP IN CREATEPORTAL
    return createPortal(
        <div className="fz-modal-overlay">
            <div className="fz-modal-container-wide">

                <div className="header-region-title-2">
                    Define Portfolio:{" "} <HelpTrigger keyName="define-portfolio" size="sm" />
                    
                </div>

                <span 
                    className="portfolio-define-label" 
                    title={currentPortfolio?.name}
                >
                    {currentPortfolio?.name}
                </span>

                <button className="basic-exit" onClick={onClose}>
                    Exit
                </button>

                {/* --- TOP PANEL: GLOBAL ESSENTIALS OVERRIDE --- */}
                <div className="define-globals-panel" style={{ position: 'relative' }}>
                    <div className="globals-row">
                        <div>
                            <label>Start Year: </label>
                            <select value={startYear} onChange={(e) => setStartYear(e.target.value)}>
                                {yearOptions?.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div>
                            <label>End Year: </label>
                            <select value={endYear} onChange={(e) => setEndYear(e.target.value)}>
                                {yearOptions?.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="period-label">
                            Max Period: {calculatedPeriod} Years
                        </div>
                    </div>

                    <div className="globals-row">
                        <label>MHP (Minimum Hold Period): </label>
                        <select value={mhp} onChange={(e) => setMhp(e.target.value)}>
                            {["0 (All)" , 1, 2, 3, 4, 5, 7, 8, 9, 10, 15, 20, 25, 30].map(m => (
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

                {/* --- BOTTOM PANEL: ASSETS & WEIGHTS GRID --- */}
             
                <div className="define-assets-panel">
                    <div 
                        className="fz-asset-grid"
                        onKeyDownCapture={(e) => {
                            if (e.key === 'Tab') {
                                const isWeightInput = e.target.getAttribute('type') === 'number';
                                const isEmpty = !e.target.value || e.target.value.trim() === '';
                                
                                // If focus is in a Ticker input and it is empty, stop Tab dead
                                if (!isWeightInput && isEmpty) {
                                    e.preventDefault();
                                    e.target.focus();
                                }
                            }
                        }}
                    >
                        <div className="fz-grid-header">
                            <span>Ticker Symbol</span>
                            <span>Weight (%)</span>
                            <span></span>
                        </div>
                        
                        {assets.map((asset, index) => (
                            <div key={asset.id} className="fz-asset-row">
                                <TickerDropdown 
                                    key={`ticker-${asset.id}`}
                                    value={asset.ticker}
                                    initialValue={asset.ticker}
                                    symbolList={symbolList}
                                    onSelect={(symbol) => handleTickerChange(index, symbol)}
                                />

                                <input 
                                    type="number" 
                                    step="any"
                                    min="0"
                                    max="100"
                                    value={asset.weight} 
                                    onChange={(e) => handleWeightChange(index, e.target.value)}
                                />
                                
                                <button 
                                    className="btn-remove" 
                                    onClick={() => handleRemoveRow(index)}
                                    tabIndex={-1}
                                >✕</button>
                            </div>
                        ))}
                        
                    </div>      
                </div>       

                <div className="define-assets-panel">
                    <div className={`weight-display ${isReady ? 'valid' : 'invalid'}`}>
                        {processMessage}
                    </div>

                    <div className="fz-modal-footer">
                        <div className="button-group-left">
                            <button className="basic-3d-button" onClick={handleEqualWeights}>
                                Equal Weights
                            </button>

                            <button 
                                className="basic-3d-button" 
                                onClick={() => {
                                    setAssets([createEmptyAsset()]);
                                    setIsEqualWeight(false);
                                }}
                            >
                                Clear Assets
                            </button>

                            <select 
                                value={selectedCopySource || ''} 
                                onChange={(e) => handleCopyPortfolio(e.target.value)}
                                className="quad-selector-2"
                                style={{ height: '32px', lineHeight: '32px', boxSizing: 'border-box' }}
                                title={selectedCopySource || "Copy From..."}
                            >
                                <option value="">Copy From...</option>
                                
                                {availableCopySources
                                    .filter(p => p.name !== currentPortfolio?.name)
                                    .map((p, idx) => (
                                        <option key={idx} value={p.name} title={p.name}>
                                            {truncateText(p.name, 22)}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="button-group-right">
                            <button className="basic-3d-button btn-cancel-3d" onClick={onClose}>
                                Cancel
                            </button>
                            
                            <button 
                                className="basic-3d-button" 
                                disabled={!isReady || Boolean(essentialsError)}
                                onClick={handleAccept}
                                onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>,
        document.body // <--- MOUNTS DIRECTLY TO DOCUMENT.BODY
    );
};