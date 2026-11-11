import React, { useState, useEffect } from 'react';

import { aggregateChartData, computeStats } from '../app/Portfolio';
import { getStatColor } from '../Utils/getStatColor';
import { FormatPlot   } from './FormatPlot';
import { HelpTrigger  } from '../Help/HelpTrigger';
import { useHelp      } from '../Help/HelpContext';
import { Hint         } from '../Help/Hint';
import { getScoreHint } from '../Utils/scoreHints';

import './Style_ChartUI.css';
import '../Styles/Containers/Portfolio.css';


import { 
    ScatterChart,
    Scatter,
    Line,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    ReferenceLine, 
    Tooltip,
    Legend
} from 'recharts';

/**
 * PlotUI: The Main Orchestrator (Stripped to Type = Plot only)
 */
export const PlotUI = ({ portfolio, buttons }) => {
    const [, forceRedraw] = useState(0);

    const { openHelp, hasCardStartingWith } = useHelp();

    // 1. SAFETY GUARD (Using both existence & isComputed)
    if (!portfolio || !portfolio.isComputed || typeof portfolio.getChartCollection !== 'function') {
        return <div className="chart-ui-placeholder">Loading or uncomputed portfolio...</div>;
    }

    // 2. RETRIEVE UNIFIED PLOT STATE
    // Falls back to getPlotState() to safely handle out-of-bounds calculations dynamically
    const plotStateObj = typeof portfolio.getPlotState === 'function' 
        ? portfolio.getPlotState() 
        : { firstYear: 1996, lastYear: 2021, currentYear: 1996, viewMode: 'period' };

    const trueFirstYear      = plotStateObj.firstYear ?? 1996;
    const trueLastYear       = plotStateObj.lastYear ?? 2021;
    const userSelectedYear   = plotStateObj.currentYear ?? trueFirstYear;
    const activeViewMode     = plotStateObj.viewMode ?? 'period';

    // 3. MAP ACTIVE BUTTON INDEX FROM PLOT STATE VIEWMODE
    const activeIndex = buttons 
        ? buttons.findIndex(btn => btn.toLowerCase() === activeViewMode.toLowerCase())
        : 0;
    
    const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;
    const currentSubtype = buttons?.[safeActiveIndex]?.toLowerCase() ?? "???";

    // Keep portfolio plotState synchronized if the buttons alter active selection
    const handleButtonClick = (index) => {
        const targetViewMode = buttons[index].toLowerCase();
        if (typeof portfolio.updatePlotState === 'function') {
            portfolio.updatePlotState({ viewMode: targetViewMode });
            
            // Check if ANY plot help card is currently open
            if (hasCardStartingWith('plot-')) {
                // Open a new help card for the newly selected mode
                openHelp(`plot-${targetViewMode}`, false, false, false);
            }
        }
        forceRedraw(c => c + 1);
    };

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (typeof portfolio.updatePlotState === 'function') {
            portfolio.updatePlotState({ currentYear: val });
        }
        forceRedraw(c => c + 1);
    };

    // 4. DOWNSTREAM DATA PREPARATION
    const Type           = "plot";
    const portfolioName  = portfolio.name ?? "Unknown";
    const scorecard      = getScorecardDefinition(Type, currentSubtype);

    let cleanData = null;
    let stats;
    let transformer;

    if (currentSubtype === 'age') {
        const firstYear = portfolio.firstYear; 
        const selectedYear = userSelectedYear;

        const baseSlices = portfolio.getChartCollectionBYyear(Type, 'age', firstYear);
        const userSlices = portfolio.getChartCollectionBYyear(Type, 'age', selectedYear);

        const baseSlice  = baseSlices[0] || null;
        const userSlice  = userSlices[0] || null;

        const userPoints = userSlice ? userSlice.points : { success: [], failure: [], neutral: [] };
        stats = computeStats(userPoints.success, userPoints.failure, userPoints.neutral);            

        transformer = new FormatPlot(portfolio.id, Type, currentSubtype, 
            baseSlice, 
            userSlice, 
            [],
            portfolio.threshold, 
            0.0 
        );
    } else {
        const slices       = portfolio.getChartCollection(Type, currentSubtype);
        const consolidated = aggregateChartData(slices);
        
        stats = computeStats(consolidated.success, consolidated.failure, consolidated.neutral);
        transformer = new FormatPlot(portfolio.id, Type, currentSubtype, 
            consolidated.success, 
            consolidated.failure, 
            consolidated.neutral,
            portfolio.threshold, 
            portfolio.mhp
        );
    }

    cleanData = {
        name: portfolio.name,
        transformedData: transformer.chartData,
        rawStats: stats ?? {}
    };

    // Set dynamic headers strictly mapped by active execution targets
    let instructionMessage = "Plot Buy/Sell and Rolling matrices"; 

    if (currentSubtype === 'period') {
        instructionMessage = "Plot returns for the rows of Rolling Matrix. X axis is the Period.";
    } else if (currentSubtype === 'year') {
        instructionMessage = "Plot returns for the columns of Rolling Matrix. X axis is Sell Year.";
    } else if (currentSubtype === 'age') {
        instructionMessage = "Plot returns for the rows of Buy/Sell matrix (also diagonals of Rolling matrix). X axis is Sell Year.";
    } else if (currentSubtype === 'rolling') {
        instructionMessage = "Plot returns for 3, 5, 10 year rolling returns of Rolling matrix.  X axis is Sell Year.";
    }

    const formattedSubtype = currentSubtype.charAt(0).toUpperCase() + currentSubtype.slice(1);
    const setupTrigger     = <HelpTrigger keyName={`plot-${currentSubtype}`} size="sm" />;

    return (
        <div id={`${portfolioName}-${Type}-div-main`} className="chart-ui-main" style={{ width: '2000px', boxSizing: 'border-box' }}>
        
            <div id={`${portfolioName}-${Type}-div-header`} className="chart-ui-header" style={{ width: '100%', boxSizing: 'border-box' }}>

                {/* TOP ELEMENT: Elevated Header Title Region */}
                <div className="header-region-title-2">
                    {/*{instructionMessage}*/}
                    {`Plot Rolling Matrix — ${formattedSubtype}`}
                    {setupTrigger}
                </div>

                {/* BOTTOM ELEMENT: Controls Deck (Buttons, Slider, Scorecard) */}
                <div className="header-controls-row">
                    
                    {buttons && buttons.length > 0 && (
                        <div id={`${portfolioName}-${Type}-div-buttons`} className="chart-button-block">
                            {buttons.map((name, index) => (
                                <Hint text={getScoreHint(name, name)} position="bottom" key={name}>
                                    <button 
                                        onClick={() => handleButtonClick(index)}
                                        className={`btn-push-utility ${safeActiveIndex === index ? 'active' : ''}`}
                                    >
                                        {name}
                                    </button>
                                </Hint>
                            ))}
                        </div>
                    )}

                   {currentSubtype === 'age' && (
                        <div className="header-slider-container">
                            <span className="header-slider-label">
                                START YEAR: <span className="header-slider-year">{userSelectedYear}</span>
                            </span>
                            
                            <button 
                                className="btn-slider-step"
                                disabled={userSelectedYear <= trueFirstYear}
                                onClick={() => {
                                    const prev = Math.max(trueFirstYear, userSelectedYear - 1);
                                    if (portfolio && typeof portfolio.updatePlotState === 'function') {
                                        portfolio.updatePlotState({ currentYear: prev });
                                    }
                                    forceRedraw(c => c + 1);
                                }}
                            >
                                &#9664;
                            </button>

                            <input 
                                type="range"
                                min={trueFirstYear}
                                max={trueLastYear}
                                value={userSelectedYear}
                                onChange={handleSliderChange}
                                className="header-slider-input"
                            />

                            <button 
                                className="btn-slider-step"
                                disabled={userSelectedYear >= trueLastYear}
                                onClick={() => {
                                    const next = Math.min(trueLastYear, userSelectedYear + 1);
                                    if (portfolio && typeof portfolio.updatePlotState === 'function') {
                                        portfolio.updatePlotState({ currentYear: next });
                                    }
                                    forceRedraw(c => c + 1);
                                }}
                            >
                                &#9654;
                            </button>

                            <span className="header-slider-bounds">
                                ({trueFirstYear}-{trueLastYear})
                            </span>
                        </div>
                    )}

                    {scorecard.length > 0 && (
                        <div id={`${portfolioName}-${Type}-div-score`} className="chart-score-block">
                            {renderScoreStats(cleanData?.rawStats, scorecard)}
                        </div>
                    )}

                </div>

            </div>


            <div 
                id={`${portfolioName}-${Type}-stage`} 
                className="chart-stage-container-2"
            >
                {renderPlot(cleanData?.transformedData, currentSubtype)}
            </div>

        </div>
    );
};

export const getScorecardDefinition = (Type, subType) => {
    return ["Average", "Median", "Std Dev", "Total Count", "Thrs"];
};

const renderScoreStats = (stats, scorecard = []) => {
    if (!stats || !stats.averages || !stats.risk || !stats.counts) return null;

    const getStatValue = (label) => {
        const key = label.toLowerCase();
        switch(key) {
            case 'average':      return (stats.averages.average * 100).toFixed(1) + "%";
            case 'median':       return (stats.averages.median * 100).toFixed(1) + "%";
            case 'std dev':      return (stats.risk.stdDev * 100).toFixed(1); 
            case 'total count':  return stats.counts.total;
            case 'thrs':         return (stats.averages.thrs * 100).toFixed(1) + "%";
            default:             return "—";
        }
    };

    return (


        <div className="rbl-score">
            {scorecard.map((label, index) => {
                const value = getStatValue(label);
                const bgColor = getStatColor(label, value);

                return (
                    <Hint text={getScoreHint(label, label)} position="bottom" key={index}>
                        <div className="score-column">
                            <div className="score-header">{label}</div>
                            <div className="score-value" style={{ backgroundColor: bgColor }}>{value}</div>
                        </div>
                    </Hint>
                );
            })}
        </div>



    );
};



const CustomPlotTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; 
        return (
            <div className="tooltip-chart-summary" style={{ backgroundColor: data.dotFill || '#333', color: 'black' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.label}</div>
                <div><span style={{ fontWeight: 'bold' }}>Return: </span>{data.rawY}%</div>
                <div><span style={{ fontWeight: 'bold' }}>Jan Buy: </span>{data.year - data.period + 1}</div>
                <div><span style={{ fontWeight: 'bold' }}>Dec Sell: </span>{data.year}</div>
                <div><span style={{ fontWeight: 'bold' }}>Hold Time: </span>{data.period + ' years'}</div>
            </div>
        );
    }
    return null;
};

const renderPlot = (transformed, currentSubtype) => {
    if (!transformed || !transformed.points) return null;

    const { 
        points = { success: [], failure: [], neutral: [], outlier: [] },            
        bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }, 
        yTicks = [], 
        xTicks = [], 
        horizontalLines = [], 
        curves = [] 
    } = transformed;

    const minX = bounds?.minX ?? 0;
    const maxX = bounds?.maxX ?? 0;
    const minY = bounds?.minY ?? 0;
    const maxY = bounds?.maxY ?? 0;

    const renderHorizontalLines = () => horizontalLines.map((line, i) => {
        // Fall back cleanly if an old payload structure lacks explicit properties
        const strokeColor = line.color || 'red';
        const strokeDash  = line.dashArray || '0';

        return (
            <ReferenceLine 
                key={`h-${i}`} 
                y={line.y} 
                stroke={strokeColor} 
                strokeDasharray={strokeDash}
                label={{ 
                    value: line.label, 
                    fill: strokeColor,
                    position: 'insideLeft',
                    dx:  10,
                    dy: -10,
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'monospace'
                }}
            />
        );
    });

  

    const renderCurves = () => curves.map((curve) => {
        // Falls back gracefully if an old payload lacks explicit properties
        const strokeColor = curve.color || "#534bee";
        const strokeWidth = curve.strokeWidth || 2;

        return (
            <Line
                key={curve.id}
                data={curve.points}
                type="monotone"
                dataKey="y"
                name={curve.label || curve.name || "Trend Line"} // Uses descriptive label if available
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
            />
        );
    });

     const SimpleDot = (props) => {
        const { cx, cy, dotSize, dotFill, dotStroke } = props;
        return (
            <circle 
                cx={cx} 
                cy={cy} 
                r={dotSize}
                fill={dotFill}
                stroke={dotStroke}
                strokeWidth={2} 
            />
        );
    };
    
    const renderScatters = () => {
        return (
            <>
                {points.success?.length > 0 && (
                    <Scatter 
                        key="scatter-success" 
                        name={`Success (${points.success.length})`}
                        fill={points.success[0].dotFill} 
                        data={points.success} 
                        dataKey="y" 
                        shape={SimpleDot} 
                    />
                )}
                {points.failure?.length > 0 && (
                    <Scatter 
                        key="scatter-failure" 
                        name={`Failure (${points.failure.length})`}
                        fill={points.failure[0].dotFill} 
                        data={points.failure} 
                        dataKey="y" 
                        shape={SimpleDot} 
                    />
                )}
                 {points.neutral?.length > 0 && (
                    <Scatter 
                        key="scatter-neutral" 
                        name={`<MHP (${points.neutral.length})`}
                        fill={points.neutral[0].dotFill} 
                        data={points.neutral} 
                        dataKey="y" 
                        shape={SimpleDot} 
                    />
                )}
            </>
        );
    };

    const renderAxes = () => (
        <>
            <XAxis 
                type="number" 
                dataKey="x" 
                ticks={xTicks} 
                domain={[minX, maxX]} 
                stroke="#ffffff"
                orientation="bottom"
                tick={{ fontSize: '11px', fontFamily: 'sans-serif' }}
            />
            <YAxis 
                type="number" 
                dataKey="y" 
                domain={[minY, maxY]} 
                ticks={yTicks} 
                unit="%" 
                stroke="#ffffff" 
                orientation="right"
                tick={{ dx: 8, fontSize: '11px', fontFamily: 'sans-serif' }}
            />
        </>
    );

    const renderVerticalGrid = () => xTicks.map(tick => (
        <ReferenceLine key={`grid-v-${tick}`} x={tick} stroke="rgba(255, 255, 255, 0.30)" />
    ));

    return (
        <ScatterChart 
            width={1150} 
            height={600} 
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            style={{ boxSizing: 'border-box', backgroundColor: 'black', borderRadius: '8px' }}
        >
            <CartesianGrid stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" vertical={false} />
            {renderVerticalGrid()}
            <ReferenceLine y={0} stroke="#fff" strokeWidth={1} />
            {renderHorizontalLines()}
            {renderCurves()}
            {renderAxes()}

            {/*<Tooltip content={<CustomPlotTooltip />} cursor={{ strokeDasharray: '3 3' }} />*/}
            <Tooltip 
                content={<CustomPlotTooltip />} 
                cursor={{ strokeDasharray: '3 3' }} 
                wrapperStyle={{
                    transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
                    pointerEvents: 'none'
                }}
            />


            {renderScatters()}

            <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={8}

                itemSorter={(item) => {
                    // Read the legend display label or series name
                    const label = String(item.value || item.name || '').toLowerCase();

                    // curves come first
                    if (label.includes('average'))  return 1;
                    if (label.includes('_3'))       return 2;
                    if (label.includes('_5'))       return 3;
                    if (label.includes('_10'))      return 4;

                    if (label.includes('base'))     return 5;
                    if (label.includes('selected')) return 6;

                    // dot count comes last
                    if (label.includes('success')) return 7;
                    if (label.includes('failure') || label.includes('fail')) return 8;
                    if (label.includes('mhp') || label.includes('neutral'))  return 9;

                    return 99;
                }}


                wrapperStyle={{ 
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'auto',
                    fontSize: '15px', 
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontWeight: '500',
                    padding: '6px 16px',
                    backgroundColor: '#122B59', 
                    borderRadius: '4px' 
                }}
            />
        </ScatterChart>
    );
};