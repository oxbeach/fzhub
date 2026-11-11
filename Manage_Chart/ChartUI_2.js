import React, { useState } from 'react';
import { getStatColor } from '../Utils/getStatColor';
import { aggregateChartData, computeStats } from '../app/Portfolio';
import { FormatChartData } from './FormatChartData';
import { GlobalYticks } from './FormatChartData';
import './Style_ChartUI.css';
import '../Styles/Containers/Portfolio.css'

import { 
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, ReferenceArea,
    CartesianGrid, Tooltip, ResponsiveContainer, Line 
} from 'recharts';

/**
 * ChartUI: The Main Orchestrator
 * MODIFIED: Integrated Portfolio collection retrieval and statistical aggregation.
 */
export const ChartUI = ({ Type : inType = "plot", buttons, portfolio, allPortfolios = [] }) => {

    const Type          = inType.toLowerCase();
    const portfolioName = portfolio?.name ?? "Unknown";
    const [activeIndex, setActiveIndex] = useState(0);

    // 1. SAFEGUARD: Handle missing buttons for 'dist' Type
    // If buttons exist, use the activeIndex; otherwise, subtype is null
    const currentSubtype = buttons?.[activeIndex]?.toLowerCase() ?? "???";

    // 2. CONDITIONAL SCORECARD: Only relevant for 'plot' or 'risk' types for now
    const scorecard = (Type !== 'distribution') 
        ? getScorecardDefinition(Type, currentSubtype) 
        : [];
     
        
    // 1. Define the Manifest (Who is participating?)
    const slotCount = (Type === 'compare') ? 5 : (Type === 'distribution') ? 3 : 1;
    const [compNames, setCompNames] = useState(Array(slotCount - 1).fill(null));

    const activePortfolios = [
        portfolio, // [0] is always the Main Anchor
        ...compNames.map(name => allPortfolios.find(p => p.name === name) || null)
    ];

    const cleanData = []; 
    const rowColors = ["#47f707", "#f814f8", "#f7bc0b"]; // Row 0, Row 1, Row 2... forever

    activePortfolios.forEach((p, i) => {
        // Strict Instance Check: Ensure p exists and is a valid Portfolio object before processing.
        if (p && typeof p.getChartCollection === 'function') {
            
            const slices       = p.getChartCollection(Type, currentSubtype);
            const consolidated = aggregateChartData(slices);
            const stats        = computeStats(consolidated.success, consolidated.failure, consolidated.neutral);
            const transformer  = new FormatChartData(Type, currentSubtype, 
                consolidated.success, 
                consolidated.failure, 
                consolidated.neutral,
                p.threshold, 
                p.mhp
            );

            cleanData[i] = {
                name: p.name,
                transformedData: transformer.chartData,
                rawStats: stats ?? {}, // Fallback to empty object to prevent downstream render crashes
                rowBgColor: rowColors[i % rowColors.length]
            };
        } else {
            cleanData[i] = null; 
        }
    });

    // Global Synchronization (The Unified Y-Axis)
    let globalYticks   = [];
    //let globalXticks   = [];
    //let globalBounds   = [];
    //let globalBarWidth = 0;

    let ChartRenderData = {};

    if (Type === 'distribution') {
        // Collect all existing distBars to find the maximum shared scale
        const allDistBars = cleanData
            .filter(entry => entry !== null)
            .map(entry => entry.transformedData.distBars);

        //alert("   allDistBars length " + allDistBars.length);

        if (allDistBars.length > 0) {
            globalYticks = GlobalYticks(allDistBars);       // consolidate if needed
        } else if (cleanData[0]) {
            globalYticks = cleanData[0].transformedData.yTicks;
        }

        ChartRenderData = {
        distribution: {
            barsKey: 'distBars',   // Tells the helper which array to read from the entry
            xTicks: [-40, -30, -20, -10, 0, 10, 20, 30, 40],
            yTicks: globalYticks,  // Dynamic scale calculated for individual slices (e.g., [0, 5, 10, 15, 20])
            barWidth: cleanData[0]?.transformedData.barWidth || 5,
            bounds: {
                minX: cleanData[0]?.transformedData.bounds.minX,
                maxX: cleanData[0]?.transformedData.bounds.maxX,
                minY: globalYticks[0] || 0,
                maxY: (globalYticks[globalYticks.length - 1] || 20) + 20 // Buffer for labels
            }
        },
        cumulation: {
            barsKey: 'accBars',    // Tells the helper to read the cumulative running sums
            xTicks: [-40, -30, -20, -10, 0, 10, 20, 30, 40],
            yTicks: [0, 25, 50, 75, 100], // Fixed scale: Cumulative probability always reaches 100%
            barWidth: cleanData[0]?.transformedData.barWidth || 5,
            bounds: {
                minX: cleanData[0]?.transformedData.bounds.minX,
                maxX: cleanData[0]?.transformedData.bounds.maxX,
                minY: 0,
                maxY: 100 // Hard ceiling for cumulative probability
            }
        }
    };
 };



  return (
    <div id={`${portfolioName}-${Type}-div-main`} className="chart-ui-main">
      
      {/* YELLOW ZONE: HEADER */}
      <div id={`${portfolioName}-${Type}-div-header`} className="chart-ui-header">

        {/*<div style={{ fontWeight: 'bold' }}>{portfolioName}</div>*/}
        <div className="portfolio-name-label">{portfolioName}</div>
        
        {/*<div id={`${portfolioName}-${Type}-div-ui`} className="chart-ui-block"> */}
        {/*  UI CONTROLS (BROWN)*/}
        {/*</div>*/}

        {buttons && buttons.length > 0 && (
            <div id={`${portfolioName}-${Type}-div-buttons`} className="chart-button-block">
                {buttons.map((name, index) => (
                    <button 
                    key={name}
                    onClick={() => setActiveIndex(index)}
                    className={`btn-push-utility ${activeIndex === index ? 'active' : ''}`}
                    >
                    {name}
                    </button>
                ))}
            </div>
        )}    

        {/* UPDATED: Scoreblock now uses the new stats mapping */}

        {scorecard.length > 0 && (
            <div id={`${portfolioName}-${Type}-div-score`} className="chart-score-block" style={{ marginLeft: 'auto' }}>
            {renderScoreStats(cleanData[0]?.rawStats, scorecard)}
            </div>
        )}



      </div>

        {/* BLUE ZONE: STAGES */}
        <div className="chart-stage-container">
            <div id={`${portfolioName}-${Type}-stage`} className="chart-stage is-visible">
                {/* Dispatch to appropriate renderer based on Type */}
                {Type === 'distribution' ? (
                    renderDistribution(
                        cleanData,        // The full array for Main + Comparisons
                        allPortfolios,    // For the dropdowns in the Spine
                        compNames,        // State: current comparison selections
                        setCompNames,     // State Setter: change comparison
                        ChartRenderData
                    )
                ) : (
                    renderPlot(cleanData[0]?.transformedData)
                )}
            </div>
        </div>   

    </div>

  ); // ************************ end of return

}; // *********************************************************** end of ChartUI

/**
 * POLICY: getScorecardDefinition
 */
export const getScorecardDefinition = (Type, subType) => {
    const activeType    = Type;
    const activeSubtype = subType;

    if (activeType === 'plot') {
        switch (activeSubtype) {
            case 'period':  return ["Average", "Median", "Std Dev", "Total Count"];
            case 'year':    return ["Average", "Median", "Std Dev", "Total Count"];
            case 'age':     return ["Average", "Median", "Std Dev", "Total Count"];
            case 'rolling': return ["Average", "Median", "Std Dev", "Total Count"];
            default:        return ["Average", "Median", "Std Dev", "Total Count"];
        }
    }

    if (activeType === 'analysis') {
        return ["Average", "Median", "Std Dev", "Total Count"];
    }

    return ["Total Count"];
};

/**
 * LANDLORD: renderScoreStats
 * Refactored to match the 3x2 "Silo" architecture and high-density CSS.
 */
const renderScoreStats = (stats, scorecard = []) => {
    const getStatValue = (label) => {
        const key = label.toLowerCase();
        switch(key) {
            case 'average':      return (stats.averages.average * 100).toFixed(1) + "%";
            case 'median':       return (stats.averages.median * 100).toFixed(1) + "%";
            case 'std dev':      return (stats.risk.stdDev * 100).toFixed(1); 
            case 'total count':  return stats.counts.total;
            default:             return "—";
        }
    };

    return (
        <div className="rbl-score"> {/* Main container with the Vivid Yellow background */}
            {scorecard.map((label, index) => {
                const value = getStatValue(label);
                const bgColor = getStatColor(label, value);

                return (
                    <div className="score-column" key={index}>
                        <div className="score-header">
                            {label}
                        </div>
                        <div 
                            className="score-value"
                            style={{ backgroundColor: bgColor }}
                        >
                            {value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};





/**
 * UNIVERSAL ENGINE: renderPlotData (formerly renderPlotPeriod)
 * This engine is "dumb"—it just paints the bounds, ticks, and points 
 * provided by the FormatChartData class.
 */
/**
 * UNIVERSAL ENGINE: renderPlotData
 */

const rollingStyles = {
    rolling_3:  { color: "#534bee", strokeWidth: 2 }, // Purple-ish
    rolling_5:  { color: "#82ca9d", strokeWidth: 2 }, // Green-ish
    rolling_10: { color: "#ff7300", strokeWidth: 3 }  // Orange (bold)
};

const renderPlot = (transformed) => {
    const { points, bounds, yTicks, xTicks, horizontalLines, vectorLines, curves } = transformed;

    // --- SUB-RENDERERS ---

    const renderHorizontalLines = () => horizontalLines.map((line, i) => (
        <ReferenceLine 
            key={`h-${i}`} 
            y={line.y} 
            label={line.label} 
            stroke={line.type === 'threshold' ? 'orange' : 'blue'} 
            strokeDasharray={line.type === 'average' ? '5 5' : '0'}
        />
    ));

    const renderVectorLines = () => vectorLines.map((line, i) => (
        <ReferenceLine 
            key={`v-${i}`}
            segment={line.segment}
            stroke="blue"
            strokeWidth={2}
            label={{ value: line.label, position: 'top' }}
        />
    ));

    const renderCurves = () => curves.map((curve) => {
        const style = rollingStyles[curve.id] || { color: "#534bee", strokeWidth: 2 };
        return (
            <Line
                key={curve.id}
                data={curve.points}
                type="monotone"
                dataKey="y"
                stroke={style.color}
                strokeWidth={style.strokeWidth}
                dot={false}           // Keep dots off to let the Scatter layer handle vertices
                activeDot={{ r: 5 }}
                isAnimationActive={false}
            />
        );
    });

    const renderScatters = () => (
        <>
            <Scatter name="Neutral" data={points.neutral} dataKey="y" fill="#FFFFFF" stroke="#71797e" />
            <Scatter name="Success" data={points.success} dataKey="y" fill="#4ec54e" stroke="#71797e" />
            <Scatter name="Fail"    data={points.failure} dataKey="y" fill="#e74c3c" stroke="#71797e" />
        </>
    );

    const renderAxes = () => (
        <>
            <XAxis type="number" dataKey="x" ticks={xTicks} domain={[bounds.minX, bounds.maxX]} stroke="#000000" />
            <YAxis type="number" dataKey="y" domain={[bounds.minY, bounds.maxY]} ticks={yTicks} unit="%" stroke="#000000" />
            <ZAxis type="number" range={[60, 60]} />
        </>
    );

    const renderVerticalGrid = () => xTicks.map(tick => (
        <ReferenceLine key={`grid-v-${tick}`} x={tick} stroke="#a9a9b3" />
    ));

    // --- MAIN RETURN ---

    return (
        <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">

                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid stroke="#999" strokeDasharray="3 3" vertical={false} />
                    
                    {renderVerticalGrid()}
                    <ReferenceLine y={0} stroke="#000" strokeWidth={1} />

                    {renderHorizontalLines()}
                    {renderVectorLines()}
                    {renderCurves()}

                    {renderAxes()}

                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                        itemStyle={{ color: '#000' }} // <--- This forces the text to be black
                        //formatter={(value) => [`${value.toFixed(2)}%`, "Return"]}

                        //formatter={(value) => {
                            // If the number looks like a year (over 1000)
                            //if (value > 1000) return [value, "Year"];
                            
                            // Otherwise, treat as return
                            //return [`${value.toFixed(2)}%`, "Return"];
                            //return [value, "Return"];
                        //}}

                        
                    />

                    {renderScatters()}
                </ScatterChart>

            </ResponsiveContainer>
        </div>
    );
}; // ****************************** end of renderPlot




/**
 * renderBarChart: The Dumb Layout Engine
 * Responsibility: Renders a single SVG chart column using pre-packaged scales and bounds.
 */
const renderBarChart = (chartConfig) => {
    if (!chartConfig) return null;

    // 1. Unpack our encapsulated configuration
    const { bars, xTicks, yTicks, bounds, barWidth } = chartConfig;
    const { minX, maxX, minY, maxY } = bounds;

    // 2. ViewScale: Maps data values directly to the 100x100 relative SVG grid area
    const getX = (val) => ((val - minX) / (maxX - minX)) * 100;
    const getY = (val) => 77 - ((val - minY) / (maxY - minY)) * 77;

    const viewBarWidth = (barWidth / (maxX - minX)) * 100;

    

    return (
        <svg 
            viewBox="0 0 100 77" 
            preserveAspectRatio="none" 
            className="fzone-svg-chart"
        >
            {/* GRID LINES & HORIZONTAL RULERS */}
            <g className="grid-lines">
                {yTicks.map((tick) => {
                    const yPos = getY(tick);
                    return (
                        <line
                            key={`y-line-${tick}`}
                            x1="0"
                            y1={yPos}
                            x2="100"
                            y2={yPos}
                            stroke="#334155"
                            strokeWidth="0.2"
                            strokeDasharray="1,1"
                        />
                    );
                })}
            </g>

            {/* THE ACTUAL DATA BARS */}
            <g className="chart-bars">
                {bars && bars.map((bar, i) => {
                    const barX = getX(bar.x);
                    const barY = getY(bar.y);
                    const floorY = getY(minY); // The baseline anchor (usually 100)
                    const height = floorY - barY;

                    return (
                        <rect
                            key={`bar-${i}`}
                            x={barX - (viewBarWidth / 2)}
                            y={barY}
                            width={viewBarWidth}
                            height={Math.max(0, height)} // Prevent negative height glitches
                            fill={bar.fill || "#10b981"}
                            opacity="0.85"
                        />
                    );
                })}
            </g>
        </svg>
    );
};










/**
 * renderDistribution: The 3x3 "Sandwich" Engine
 * Responsibility: Maps pre-computed bucket data to the 6-chart grid + Spine.
 * Handles the sticky X-axis labels to ensure vertical alignment across rows.
 */
const renderDistribution = (
        cleanData, 
        allPortfolios, 
        compNames, 
        setCompNames, 
        ChartRenderData
    ) => {
    
    const prepareChartData = (entry, columnType) => {
        if (!entry) return null;

        // Pick the correct rendering profile block from our structural data object
        const configProfile = columnType === 'dist' ? ChartRenderData.distribution : ChartRenderData.cumulation;

        return {
            ...entry.transformedData.chartData, 
            bars:     columnType === 'dist' ? entry.transformedData.distBars : entry.transformedData.accBars,
            xTicks:   configProfile.xTicks,
            yTicks:   configProfile.yTicks,
            bounds:   configProfile.bounds,
            barWidth: configProfile.barWidth,
            type:     'distribution',
            subType:  columnType 
        };
    };

    return (
        <div className="distribution-view-grid">
            {/* STICKY SUB-HEADER (The Source of Truth for X-Axis) */}
            {/*
            <div className="dist-sub-header">
                <div className="column-title">Distribution</div>
                <div className="spine-title">Portfolio Selection</div>
                <div className="column-title">Cumulation</div>
                
                <div className="x-axis-row left-halo-zone">
                    {ChartRenderData.distribution.xTicks.map(tick => (
                        <span key={`left-x-${tick}`}>
                            {tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}
                        </span>
                    ))}
                </div>
                <div className="spine-spacer"></div>
              
                <div className="x-axis-row right-halo-zone">
                    {ChartRenderData.cumulation.xTicks.map(tick => (
                        <span key={`right-x-${tick}`}>
                            {tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}
                        </span>
                    ))}
                </div>
            </div>
            */}

            {/* THE DATA ROWS */}
            {[0, 1, 2].map((rowIndex) => {
                const entry = cleanData[rowIndex];
                
                return (
                    <div key={`row-${rowIndex}`} className="dist-sandwich-row" style={{ backgroundColor: entry?.rowBgColor }}>
                        
                        {/* LEFT COLUMN: Distribution */}
                        <div className="chart-cell left-col">
                            {entry && renderBarChart(prepareChartData(entry, 'dist'))}
                        </div>

                        {/* CENTER COLUMN: The Spine */}
                        <div className="spine-cell" style={{ backgroundColor: entry?.rowBgColor }}>
                            {rowIndex === 0 ? (
                                <div className="spine-name-holder">
                                    <strong>{entry?.name || "Main Portfolio"}</strong>
                                </div>
                            ) : (
                                <select 
                                    className="spine-select"
                                    value={compNames[rowIndex - 1] || ""} 
                                    onChange={(e) => {
                                        const newNames = [...compNames];
                                        newNames[rowIndex - 1] = e.target.value;
                                        setCompNames(newNames);
                                    }}
                                >
                                    <option value="">Select Portfolio...</option>
                                    {allPortfolios.map(ap => (
                                        <option key={ap.name} value={ap.name}>{ap.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Cumulation */}
                        <div className="chart-cell right-col">
                            {entry && renderBarChart(prepareChartData(entry, 'acc'))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};