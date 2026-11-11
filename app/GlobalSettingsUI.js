'use client';

import React, { useState } from 'react';
import { TimeSpan } from './TimeSpan';
import GetTicker from './GetTicker';
import GlobalSettings, { initialSettings, broadcastSettingsChange } from './GlobalSettings';
import TickerDropdown from '../src/MenuDropdown/TickerDropdown';
//////////////////////////////////////////import { FZDataManager } from '../src/DataManagement/DataManager';

import '../Styles/Buttons/PrimaryActions.css'

/********************************** i don't thing this is used anymore 10-25-2026 */

export default function GlobalSettingsUI() {
    // 1. Initialize state as a true instance of the GlobalSettings class
    const [draft, setDraft] = useState(() => 
        Object.assign(new GlobalSettings(), initialSettings)
    );

    const handleFocus = (e) => {
        if (e.target && typeof e.target.select === 'function') {
            e.target.select();
        }
    };

    // 2. THE GATEKEEPER: All state changes must pass through here to remain professional
    const updateDraft = (updatedProps) => {
        const newDraft = Object.assign(new GlobalSettings(), draft, updatedProps);
        setDraft(newDraft);
    };

    const handleYearChange = (field, value) => {
        const newTS = new TimeSpan(
            field === 'start' ? value : draft.timeSpan.startYear,
            field === 'end' ? value : draft.timeSpan.endYear,
            draft.timeSpan.endMonth
        );
        updateDraft({ timeSpan: newTS });
    };

    const generateYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const endYear = currentYear - 1; // eg. 2025 = 2026 - 1
        const options = [];
        // Generates 29 years: [2025, 2024, ..., 1997]
        for (let i = 0; i < 30; i++) {
            options.push(endYear - i);
        }
        return options;
    };

    const yearOptions = generateYearOptions();

    // Generate MHP options: [0, 1, 2, ..., 10, 15, 20, 30]
    const generateMhpOptions = () => {
        const options = [];
        for (let i = 0; i <= 10; i++) options.push(i);
        [15, 20, 30].forEach(val => options.push(val));
        return options;
    };





    const updateBenchmark = (index, newSymbol) => {
        const newBenchmarks = [...draft.benchmarks];
        newBenchmarks[index] = new GetTicker(newSymbol);
        updateDraft({ benchmarks: newBenchmarks });
    };

    const handleCancel = () => {
        // Reset to the current global source of truth
        setDraft(Object.assign(new GlobalSettings(), initialSettings));
    };


    const handleAccept = () => {
        // 1. THE LOGIC FIX: If getValidationError() returns something, it's an ERROR.
        // We only proceed if it returns null/falsy.
        const error = draft.getValidationError();
        
        if (!error) {
            // 2. Commit draft to global settings
            Object.assign(initialSettings, draft);


            /*****************************************************************

            // 3. THE ADMIN HANDSHAKE
            try {
                const tpConnect = { marketSource: "FZDUMMY" };
                
                // This is the point where we turn the key
                FZDataManager.initialize(tpConnect);

                // Use the same debug flag strategy here
                if (FZDataManager.DEBUG) {
                    alert("UI: Handshake Sent. DataManager Initialized with FZDUMMY.");
                }
            } catch (err) {
                alert("UI ERROR: Handshake Failed. Check DataManager paths.");
            }

            ****************************************************************************/

            // 4. Signal the rest of the app
            broadcastSettingsChange();
        } else {
            // Optional: Alert the actual error if validation fails
            //alert(`Validation Error: ${error}`);
        }
    };

    return (
        <div className="global-settings-container">            
            {/* Row 1: Years */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ color: 'black' }}>
                    <strong>Start Year: </strong>
                    <select 
                        value={draft.timeSpan.startYear} 
                        onChange={(e) => handleYearChange('start', parseInt(e.target.value))}
                        style={{ padding: '4px', color: 'black', width: '80px' }}
                    >
                        {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </label>

                <label style={{ color: 'black' }}>
                    <strong>End Year: </strong>
                    <select 
                        value={draft.timeSpan.endYear} 
                        onChange={(e) => handleYearChange('end', parseInt(e.target.value))}
                        style={{ padding: '4px', color: 'black', width: '80px' }}
                    >
                        {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </label>
                
                <strong style={{ color: 'black' }}>Period: {draft.timeSpan.getYearCount()} Years</strong>
            </div>



            {/* Row: Minimum Hold Period (MHP) */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ color: 'black' }}>
                    <strong>MHP (Minimum Hold Period): </strong>
                    <select 
                        value={draft.mhp} 
                        onChange={(e) => updateDraft({ mhp: parseInt(e.target.value) })}
                        style={{ padding: '4px', color: 'black' }}
                    >
                        {generateMhpOptions().map(val => (
                            <option key={val} value={val}>
                                {val === 0 ? "0 (Include All)" : `${val} Years`}
                            </option>
                        ))}
                    </select>
                </label>
            </div>



            {/* Row 2: Threshold */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ color: 'black' }}>
                    <strong>Threshold: </strong>
                    <input 
                    type="number" 
                    step="0.1" 
                    value={draft.threshold * 100} 
                    onFocus={handleFocus} 
                    onChange={(e) => updateDraft({ threshold: e.target.value / 100 })} 
                    style={{ 
                        width: '80px',        // Increased width
                        height: '10px',        // Increased height for easier clicking
                        fontSize: '.9em',     // Larger text for readability
                        padding: '5px',        // Added padding
                        color: 'black' 
                    }} 
                /> %
                </label>
            </div>





            

            {/* Row 3: Frequency */}
            {/*
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <strong style={{ color: 'black' }}>Frequency:</strong>
                <div style={{ display: 'flex', border: '1px solid black' }}>
                    {['YEARLY', 'QUARTERLY', 'MONTHLY'].map((freq, i) => (
                        <button key={freq} type="button" onClick={() => updateDraft({ analysisFrequency: freq })}
                            style={{ padding: '5px 15px', backgroundColor: draft.analysisFrequency === freq ? '#fff' : '#ccc', borderLeft: i > 0 ? '1px solid black' : 'none', cursor: 'pointer', color: 'black', borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}
                        > {freq.charAt(0) + freq.slice(1).toLowerCase()} </button>
                    ))}
                </div>
                {draft.analysisFrequency !== 'YEARLY' && <span style={{ fontSize: '1.0em', color: 'red', fontWeight: 'bold', fontStyle: 'italic' }}>Future feature - not implemented</span>}
            </div>
            */}

            {/* Row 4: Benchmarks */}
            {/*
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <strong style={{ color: 'black' }}>Benchmarks:</strong>
                {draft.benchmarks.map((tickerObj, index) => (
                    <div key={index} style={{ width: '80px' }}>
                        <TickerDropdown 
                            initialValue={tickerObj.symbol} 
                            onSelect={(newSymbol) => updateBenchmark(index, newSymbol)} 
                        />
                    </div>
                ))}
            </div>
            */}




            {/* Row 6: Filler Return */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ cursor: 'pointer', color: 'black' }}>
                    <input 
                        type="checkbox" 
                        checked={draft.useFiller} 
                        onChange={() => updateDraft({ useFiller: !draft.useFiller })} 
                    /> Use Filler Return
                </label>
                
                <span style={{ 
                    color: 'black', 
                    visibility: draft.useFiller ? 'visible' : 'hidden' 
                }}>
                    Rate: <input 
                        type="number" 
                        value={draft.fillerRate * 100} 
                        onFocus={handleFocus} 
                        onChange={(e) => updateDraft({ fillerRate: e.target.value / 100 })} 
                        style={{ width: '50px', color: 'black' }} 
                    /> %
                </span>
            </div>



            {/* Row 5: Trailing Returns */}

            {/*

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color: 'black' }}>
                    <input 
                        type="checkbox" 
                        checked={draft.useTrailingReturns}
                        onChange={(e) => updateDraft({ useTrailingReturns: e.target.checked })}
                    />
                    Trailing Returns
                </label>

                <select 
                    value={draft.trailingMonth}
                    disabled={!draft.useTrailingReturns} 
                    onChange={(e) => updateDraft({ trailingMonth: e.target.value })}
                    style={{ padding: '2px', borderRadius: '4px', color: 'black' }}
                >
                    {["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>


                {draft.useTrailingReturns && (
                        <span style={{ color: 'red', fontStyle: 'italic', fontWeight: 'bold', marginLeft: '10px' }}>
                            Future feature - not implemented
                        </span>
                )}
            </div>
            */}


            {/* Error Message Section */}
            {draft.getValidationError() && (
                <div style={{ color: 'red', fontWeight: 'bold', backgroundColor: 'white', padding: '10px', border: '2px solid red', width: 'fit-content' }}>
                    {draft.getValidationError()}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-start' }}>
                <button 
                    onClick={handleCancel}
                    className="basic-3d-button btn-cancel-3d"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleAccept}
                    className="basic-3d-button"
                >
                    Accept
                </button>
            </div>
        </div>
    );
}