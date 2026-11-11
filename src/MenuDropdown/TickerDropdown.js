import React, { useEffect, useState, useRef } from 'react';

import { useHelp } from '../../Help/HelpContext';

export default function TickerDropdown({ initialValue, symbolList = [], onSelect }) {
    // 1. All Refs and State defined at the top
    const [isOpen, setIsOpen]       = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef              = useRef(null);
    const inputRef                  = useRef(null); 

     const { openHelp } = useHelp();

    // Extract ticker string array for virtualization & index calculations
    const universe = symbolList.map(s => typeof s === 'string' ? s : s.symbol);
    
    // Quick lookup map for company name / short_name
    const symbolMap = symbolList.reduce((acc, item) => {
        if (typeof item === 'object' && item !== null) {
            acc[item.symbol] = item.short_name || item.name || '';
        }
        return acc;
    }, {});

    const rowHeight  = 25; 
    //const viewHeight = 200; 
    const viewHeight = 150; 


    // 2. Logic functions
    const handleInput = (e) => {
        if (!isOpen) setIsOpen(true);
        const val = e.target.value.toUpperCase();
        const index = universe.findIndex(s => s.startsWith(val));
        
        if (index !== -1 && containerRef.current) {
            containerRef.current.scrollTop = index * rowHeight;
        }
    };


    const hasTriggeredRef = useRef(false);
    useEffect(() => {
        if (isOpen) {
            if (universe.length === 1 && universe[0] === '-- LIST UNAVAILABLE --') {
                if (!hasTriggeredRef.current) {
                    hasTriggeredRef.current = true;


                      openHelp('ERR_SYMBOL_FAILURE', false, false, true);



                }
            }
        }
    }, [isOpen, universe]);

    const handleFocus = (e) => {
        setIsOpen(true);
        e.target.select();

        setScrollTop(0); 
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    };

    const handleValidation = (val) => {
        const upperVal = val.toUpperCase();
        
        if (universe.includes(upperVal)) {
            if (onSelect) onSelect(upperVal);
        } else {
            if (inputRef.current) {
                inputRef.current.value = initialValue || '';
            }
        }
    };

    // 3. Virtualization Math
    const start = Math.floor(scrollTop / rowHeight);
    const end = start + Math.ceil(viewHeight / rowHeight) + 1;
    const visibleItems = universe.slice(start, end);

    // Dynamic title for the closed input box
    const currentTicker = inputRef.current?.value || initialValue || '';
    const currentName = symbolMap[currentTicker];
    const inputTooltip = currentName ? `${currentTicker} - ${currentName}` : currentTicker;

    // 4. Clean, scoped return
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                ref={inputRef} 
                type="text" 
                defaultValue={initialValue}
                title={inputTooltip}
                onInput={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleInput(e); 
                }}
                onFocus={handleFocus}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleValidation(e.target.value);
                        setIsOpen(false);
                    }
                    }}
                    
                    onBlur={() => {
                        if (inputRef.current) {
                            handleValidation(inputRef.current.value);
                        }
                        setIsOpen(false);
                    }}
                                    
                style={{ 
                    width: '100%', 
                    boxSizing: 'border-box', 
                    padding: '4px', 
                    color: 'black',
                    textTransform: 'uppercase'
                }}
            />

            {isOpen && (
                <div 
                    ref={containerRef}
                    onScroll={(e) => setScrollTop(e.target.scrollTop)}
                    style={{ 
                        height: viewHeight, 
                        overflowY: 'auto', 
                        overflowX: 'hidden', 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        minWidth: '100%', 
                        width: 'max-content',
                        zIndex: 9999, 
                        background: '#fff', 
                        border: '1px solid #999', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        paddingBottom: '4px' // Adds safety room for the final row
                    }}
                >
                    <style>{`
                        .ticker-item:hover {
                            background-color: #e8f0fe !important;
                        }
                    `}</style>

                    <div style={{ height: universe.length * rowHeight, position: 'relative' }}>
                        {visibleItems.map((symbol, i) => {
                            const name = symbolMap[symbol];
                            const label = name ? `${symbol} - ${name}` : symbol;

                            return (
                                <div 
                                    key={symbol}
                                    className="ticker-item"
                                    title={label}

                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevents browser from blurring input on click

                                        if (symbol === '-- LIST UNAVAILABLE --') {
                                            return;
                                        }


                                        
                                        if (inputRef.current) {
                                            inputRef.current.value = symbol;
                                            inputRef.current.focus();
                                        }
                                        if (onSelect) onSelect(symbol);
                                        setIsOpen(false);
                                    }}

                                    style={{ 
                                        position: 'absolute', 
                                        top: (start + i) * rowHeight, 
                                        height: rowHeight, 
                                        width: '100%', 
                                        padding: '2px 8px',
                                        cursor: 'pointer', 
                                        borderBottom: '1px solid #f0f0f0',
                                        whiteSpace: 'nowrap', 
                                        boxSizing: 'border-box', 
                                        color: 'black'
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}