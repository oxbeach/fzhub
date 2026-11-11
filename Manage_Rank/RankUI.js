'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WeightFactors }   from '../Utils/WeightFactors.js';
import { computeRankings } from '../Utils/computeRankings.js'; // Import your pure calculation engine
import { getRankColor }    from '../Utils/getRankColor.js';
import { Hint }            from '../Help/Hint.js';
import { HelpTrigger }     from '../Help/HelpTrigger.js';
import { getScoreHint }    from '../Utils/scoreHints.js';

import './Style_RankUI.css';
import '../Styles/Containers/Portfolio.css';  // we only need this for the portfolio name display ellipse layout

//import '../Styles/Core/BaseThemes.css';
//import '../Styles/Global/Style_Library.css';


//import '../Styles/Modals/PortfolioModals.css';


const METRICS = [
    'Thrs',
    'Average',
    'Median',
    'Hi',
    'Lo',
    'Std Dev',
    'Sharpe',
    'Sortino'
];

const createBlankAllocations = () => {
    return METRICS.reduce((acc, m) => ({ ...acc, [m]: '' }), {});
};

export default function RankUI({ allPortfolios, onClose, repository, updateRepository }) {
    const [showPortfolioList, setShowPortfolioList] = useState(true);
    const [mounted, setMounted]                     = useState(false);
    
    // Pull initial allocations and checked portfolio IDs from the centralized repository
    const [allocInputs, setAllocInputs] = useState(() => repository.getRankAllocations() || createBlankAllocations());
    const [activeMetrics, setActiveMetrics] = useState([]);
    const [isComputed, setIsComputed] = useState(false);
    const [sortColumn, setSortColumn] = useState(null); // Tracks which column is active
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
    const [selectedPortfolios, setSelectedPortfolios] = useState(() => new Set(repository.getCheckedPortfolioIds() || []));

    // SSR / Hydration guard
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate sumStatus cleanly on every single render pass directly from local inputs
    const currentRawSum = METRICS.reduce((rawSum, metric) => {
        const val = allocInputs[metric];
        if (val !== '' && !isNaN(val)) {
            return rawSum + (parseFloat(val) || 0.0);
        }
        return rawSum;
    }, 0.0);
    const sumStatus = currentRawSum / 100.0;

    // 1. Structural calculation holder
    let portfoliosToRender = []; 

    const getDisplayablePortfolios = () => {
        if (!allPortfolios) return [];
        return allPortfolios.filter(p => p && p.instance && p.instance.isComputed === true);
    };

    const getDisplayedPortfolios = () => {
        if (!allPortfolios) return [];
        return getDisplayablePortfolios().filter(p => selectedPortfolios.has(p.instance.id));
    };

    if (isComputed) {
        // If weights are calculated, handleComputeWeights will have prepared activeMetrics
        portfoliosToRender = computeRankings(activeMetrics, getDisplayedPortfolios());
    } else {
        // Fallback/Initial state structure before clicking "Compute"
        portfoliosToRender = getDisplayedPortfolios().map(p => ({
            id: p.instance?.id || p.id,
            name: p.instance?.name || p.name,
            stats: p.instance && typeof p.instance.getRankStats === 'function' ? p.instance.getRankStats() : {},
            fzFactor: 0,
            ranks: {}
        }));
    }

    const getSortedRows = () => {
        if (!sortColumn) return portfoliosToRender;

        return [...portfoliosToRender].sort((a, b) => {
            let valA, valB;

            if (sortColumn === 'Portfolio') {
                valA = a.name;
                valB = b.name;
            } else if (sortColumn === 'FZ FACTOR') {
                valA = parseFloat(a.fzFactor) || 0;
                valB = parseFloat(b.fzFactor) || 0;
            } else if (sortColumn.startsWith('rank-')) {
                const metric = sortColumn.replace('rank-', '');
                valA = parseInt(a.ranks[metric]) || 999;
                valB = parseInt(b.ranks[metric]) || 999;
            } else {
                valA = parseFloat(a.stats[sortColumn]) || 0;
                valB = parseFloat(b.stats[sortColumn]) || 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const inputTolerance = .005;

    const handleInputChange = (metric, value) => {
        let formattedValue = value;

        // Check if there is a decimal point and it exceeds 2 decimal places
        if (value && value.includes('.')) {
            const [integerPart, decimalPart] = value.split('.');
            if (decimalPart.length > 2) {
                // Truncate cleanly to two decimal places without rounding up prematurely
                formattedValue = `${integerPart}.${decimalPart.substring(0, 2)}`;
            }
        }

        setAllocInputs(prev => {
            const nextInputs = { ...prev, [metric]: formattedValue };
            return nextInputs;
        });
        
        setIsComputed(false);
        setActiveMetrics([]);
    };

    const handleComputeWeights = () => {
        const currentSum = sumStatus; 
        const tolerance = inputTolerance; 

        if (Math.abs(currentSum - 1.0) >= tolerance) {
            return; 
        }

        const adjustmentFactor = 1.0 / currentSum;
        
        const normalizedInputs = { ...allocInputs };

        for (const metric of METRICS) {
            const val = normalizedInputs[metric];
            if (val !== '' && !isNaN(val) && parseFloat(val) > 0) {
                const adjustedVal = (parseFloat(val) * adjustmentFactor).toFixed(2);
                normalizedInputs[metric] = adjustedVal;
            }
        }

        setAllocInputs(normalizedInputs);

        const processor = new WeightFactors();
        for (const metric of METRICS) {
            const val = normalizedInputs[metric];
            if (val !== '' && !isNaN(val) && parseFloat(val) > 0) {
                processor.push(metric, parseFloat(val) / 100);
            }
        }

        const tuples = processor.getAdjustedTuples(false);

        setActiveMetrics(tuples);
        setIsComputed(true);
        
        if (updateRepository) {
            updateRepository('rankAllocations', normalizedInputs);
            updateRepository('checkedPortfolioIds', Array.from(selectedPortfolios));
        }
    };

    const handleClear = () => {
        setAllocInputs(createBlankAllocations());
        setActiveMetrics([]);
        setIsComputed(false);
        setSelectedPortfolios(new Set());
        if (updateRepository) {
            updateRepository('rankAllocations', createBlankAllocations());
            updateRepository('checkedPortfolioIds', []);
        }
    };

    const handleSelectAll = (e) => {
        const displayable = getDisplayablePortfolios();
        let nextSet;
        if (e.target.checked) {
            nextSet = new Set(displayable.map(p => p.id));
        } else {
            nextSet = new Set();
        }
        
        setSelectedPortfolios(nextSet);
        
        if (updateRepository) {
            updateRepository('checkedPortfolioIds', Array.from(nextSet));
        }
    };

    const handleTogglePortfolio = (id) => {
        let nextSet;
        
        setSelectedPortfolios(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            nextSet = next;
            return next;
        });

        if (updateRepository && nextSet) {
            updateRepository('checkedPortfolioIds', Array.from(nextSet));
        }
    };

    const handleHeaderClick = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('desc');
        }
    };

    const renderSidebar = () => {
        const displayChoices = getDisplayablePortfolios();
        return (
            /* Transition relies on toggling the 'collapsed' class based on showPortfolioList state */
            <div className={`rank-sidebar ${!showPortfolioList ? 'collapsed' : ''}`}>
                <h3>Portfolio Selection</h3>
                <div className="rank-portfolio-checklist">
                    <label className="portfolio-checkbox-label select-all-label" style={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="checkbox" 
                            onChange={handleSelectAll} 
                            checked={displayChoices.length > 0 && selectedPortfolios.size === displayChoices.length} 
                        /> 
                        Check All / Clear All
                    </label>
                    
                    {displayChoices.map(p => (
                        <label key={p.id} className="portfolio-checkbox-label">
                            <input 
                                type="checkbox" 
                                value={p.id}
                                checked={selectedPortfolios.has(p.id)}
                                onChange={() => handleTogglePortfolio(p.id)}
                            /> 
                            <span className="portfolio-name-label" title={p.name}>
                                {p.name}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const isSumValid = Math.abs(sumStatus - 1.0) < inputTolerance;    

    const renderInputPanel = () => (
        <div className="rank-metric-allocation-panel">
            <h3>Metrics & Allocation</h3>
            <div className="table-responsive">
                <table className="rank-input-table">
                    <thead>

                        <tr>
                            <th style={{ textAlign: 'center' }}>Metrics</th>
                            {METRICS.map(m => (
                                <Hint key={m} as="th" text={getScoreHint(m, m)} position="bottom" 
                                style={{ cursor: 'pointer', fontSize: '12px' }}>
                                    {m}
                                </Hint>
                            ))}
                        </tr>

                        <tr>
                            <td style={{ textAlign: 'center' }}><strong>Weight Allocation (%)</strong></td>
                                {METRICS.map(m => {
                                const val = Number(allocInputs[m]);
                                const isActive = !isNaN(val) && val > 0;

                                return (
                                    <td key={m} className={isActive ? 'cell-active-weight' : ''}>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max="100"
                                            value={allocInputs[m] || ''}
                                            onChange={(e) => handleInputChange(m, e.target.value)}
                                            placeholder="0"
                                            className="metric-weight-input"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    </thead>
                </table>
            </div>

           {/* Unified Action & Feedback Bar */}
            <div className="allocation-action-row">
                <div className={`allocation-message-area ${
                    sumStatus === 0 
                        ? 'status-initial' 
                        : (isSumValid ? 'status-valid' : 'status-invalid')
                }`}>
                    {sumStatus === 0 ? (
                        <span>
                            <strong>Get Started:</strong> Enter metric weights (0–100%). Total must equal 100.0%.
                        </span>
                    ) : !isSumValid ? (
                        <span>
                            <strong>Allocation Error:</strong> Weights must sum to 100.0%. Current: <strong>{(sumStatus * 100).toFixed(1)}%</strong>.
                        </span>
                    ) : (
                        <span>
                            <strong>Ready:</strong> Allocation equals 100.0%. Engine balanced.
                        </span>
                    )}
                </div>

                <button 
                    className={`bttn-compute-action ${isSumValid ? 'btn-ready' : 'btn-locked'}`}
                    onClick={handleComputeWeights}
                    disabled={!isSumValid}
                >
                    {isComputed ? 'Results Computed' : 'Compute Results'}
                </button>
            </div>      {/***** END of <div className="allocation-action-row"></div>     */}


        </div>
    );

    const isStatColumnVisible = (metricName) => {
        if (!isComputed) return true;
        const val = allocInputs[metricName];
        return val !== '' && !isNaN(val) && parseFloat(val) > 0;
    };

    const isRankColumnVisible = (metricName) => {
        if (!isComputed) return false;
        const val = allocInputs[metricName];
        return val !== '' && !isNaN(val) && parseFloat(val) > 0;
    };

    const renderRankingsGrid = () => {
        return (
            <div className="rank-table-display-area">
                <h3>Rankings Grid</h3>
                <div className="table-responsive">
                    <table className="rank-display-table">
                        <thead>
                            <tr>
                                
                                <Hint 
                                    as="th" 
                                    text="Click to sort by portfolio name" 
                                    position="bottom"
                                    onClick={() => handleHeaderClick('Portfolio')} 
                                    style={{ cursor: 'pointer',

                                        fontSize: '13px'
                                     }}
                                >
                                    Portfolio {sortColumn === 'Portfolio' ? (sortDirection === 'asc' ? '▲' : '▼') : <span className="dormant-arrow"> ⇅</span>}
                                </Hint>
                                
                                {METRICS.map(m => (
                                    <Hint
                                        as="th"
                                        key={m}
                                        text={`Click to sort by ${m}`}
                                        position="bottom"
                                        onClick={() => handleHeaderClick(m)}
                                        style={{ display: isStatColumnVisible(m) ? 'table-cell' : 'none', cursor: 'pointer' }}
                                    >
                                        {m} {sortColumn === m ? (sortDirection === 'asc' ? '▲' : '▼') : <span className="dormant-arrow"> ⇅</span>}
                                    </Hint>
                                ))}




                               <Hint 
                                    as="th" 
                                    text="Click to sort by FZ Factor" 
                                    position="bottom"
                                    onClick={() => handleHeaderClick('FZ FACTOR')} 
                                    className="fz-factor-header" 
                                    style={{ cursor: 'pointer' }}
                                >
                                    FZ FACTOR {sortColumn === 'FZ FACTOR' ? (sortDirection === 'asc' ? '▲' : '▼') : <span className="dormant-arrow"> ⇅</span>}
                                </Hint>

                                {METRICS.map(m => (
                                    <Hint
                                        as="th"
                                        key={`rank-${m}`}
                                        text={`Click to sort by ${m} rank`}
                                        position="bottom"
                                        onClick={() => handleHeaderClick(`rank-${m}`)}
                                        style={{ display: isRankColumnVisible(m) ? 'table-cell' : 'none', cursor: 'pointer' }}
                                    >
                                        {m} {sortColumn === `rank-${m}` ? (sortDirection === 'asc' ? '▲' : '▼') : <span className="dormant-arrow"> ⇅</span>}
                                    </Hint>
                                ))}


                            </tr>
                        </thead>

                        <tbody>
                            {getSortedRows().map((p, idx) => {
                                const stats = p.stats || {};
                                return (
                                    <tr 
                                        key={p.id || idx}
                                        onClick={(e) => {e.currentTarget.classList.toggle('rank-row-selected');
                                        }}
                                    >
                                        <td>
                                            <span className="portfolio-name-label" title={p.name}>
                                                {p.name}
                                            </span>
                                        </td>
                                        
                                        {METRICS.map(m => (
                                            <td 
                                                key={`stat-${m}`} 
                                                style={{ display: isStatColumnVisible(m) ? 'table-cell' : 'none' }}
                                            >
                                                {stats[m] || (m === 'Thrs' ? '0.00%' : '0.00')}
                                            </td>
                                        ))}
                                        
                                        <td className="fz-factor-value">
                                            {isComputed ? p.fzFactor : '-'}
                                        </td>

                                        {METRICS.map(m => {
                                            const rankValue = p.ranks[m];
                                            return (
                                                <td 
                                                    key={`rank-${m}`} 
                                                    style={{ 
                                                        display: isRankColumnVisible(m) ? 'table-cell' : 'none',
                                                        backgroundColor: getRankColor(rankValue),
                                                    }}
                                                >
                                                    {rankValue || '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}


                            {portfoliosToRender.length === 0 && (
                                <tr>
                                    <td 
                                        colSpan={
                                            1 + // Portfolio Name column
                                            METRICS.filter(m => isStatColumnVisible(m)).length + // Visible Stat columns
                                            1 + // FZ Factor column
                                            METRICS.filter(m => isRankColumnVisible(m)).length // Visible Rank columns
                                        } 
                                        
                                        style={{ 
                                            textAlign: 'center', 
                                            padding: '20px', 
                                            backgroundColor: '#ffff00', // Bright Wakeup Yellow
                                            color: '#000000',           // Sharp, legible dark text
                                            fontWeight: 'bold',
                                            border: '1px solid #e6b800'  
                                        }}
                                    >
                                        ⚠️ No computed portfolios selected. Please check computed portfolios from the left sidebar.
                                    </td>
                                </tr>
                            )}

                        </tbody>  

                    </table>
                </div>
            </div>
        );
    };

    if (!mounted) return null;

    return createPortal(
        <div className="rank-modal-overlay">
            <div className="rank-modal-content">

                <div className="rank-top-controls">
                    <button 
                        className="basic-3d-button"
                        style={{ width: '130px', padding: '8px 0',

                             fontSize: '11px' }}
                        
                        onClick={() => setShowPortfolioList(!showPortfolioList)} 
                    >
                        {showPortfolioList ? 'Hide Portfolio List' : 'Show Portfolio List'}
                    </button>
                    
                    <button 
                        className="basic-3d-button"
                        style={{ fontSize: '11px' }}
                        onClick={handleClear}
                    >
                        Clear
                    </button>

                   <div className="header-region-title-2" style={{ marginLeft: '20px' }}>
                        Rank Portfolios
                         <HelpTrigger keyName="rank" size="sm" />
                    </div>

                    <button 
                        className="btn-rank-ctrl btn-exit"
                        onClick={onClose}
                    >
                        Exit
                    </button>
                </div>

                <div className="rank-body-layout">
                    {/* Evaluates sidebar using the active state flag */}
                    {renderSidebar()}

                    <div className="rank-main-content">
                        {renderInputPanel()}
                        {renderRankingsGrid()}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}