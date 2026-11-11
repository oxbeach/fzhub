"use client";

import React, { useState } from 'react';
import { FormatAnalyzeData } from './FormatAnalyzeData';
import { Hint }              from '../Help/Hint';
import { getScoreHint }      from '../Utils/scoreHints';
import { HelpTrigger }       from '../Help/HelpTrigger';
import { useHelp }           from '../Help/HelpContext';

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
 * AnalyzeUI: Dedicated Multi-Diagnostic Display with Auto-Updating Help Flow
 */
export const AnalyzeUI = ({ buttons = [], portfolio }) => {
    // 1. HOOKS FIRST
    const [, forceRedraw] = useState(0);
    const { openHelp, hasCardStartingWith } = useHelp();

    // 2. THE GUARANTOR
    if (!portfolio || !portfolio.isComputed || typeof portfolio.getAnalyzeState !== 'function') {
        return <div className="chart-ui-placeholder">Loading or uncomputed portfolio...</div>;
    }

    // Filter out FZ-suffixed stats for display
    const visibleButtons = buttons.filter(btn => !['SharpeFZ', 'SortinoFZ', 'StdDevFZ'].includes(btn));

    // 3. DIRECT ASSIGNMENTS
    const portfolioName = portfolio.name; 
    const analyzeState  = portfolio.getAnalyzeState();

    // Dynamically calculate safe active index based on visible buttons
    const persistentSubType = analyzeState.subType ?? "hi/lo";
    const targetIndex       = visibleButtons.findIndex(btn => btn.toLowerCase() === persistentSubType.toLowerCase());
    const safeActiveIndex   = targetIndex !== -1 ? targetIndex : 0;
    
    // Resolve current stat name directly from filtered list
    const currentStatName   = visibleButtons[safeActiveIndex] ?? "Hi/Lo";

    const firstPossibleYear = analyzeState.firstYear ?? 1996;
    const lastPossibleYear  = analyzeState.lastYear ?? 2021;
    const selectedYear      = analyzeState.currentYear ?? firstPossibleYear;

    const minThresholdUI    = analyzeState.minThreshold ?? 0.0;
    const maxThresholdUI    = analyzeState.maxThreshold ?? 15.0;
    const stepSizeUI        = analyzeState.stepSize ?? 0.5;
    
    // Updated threshold logic to support standard Sharpe / Sortino
    const isSharpeStat     = ['Sharpe', 'SharpeFZ'].includes(currentStatName);
    const selectedThresholdUI = isSharpeStat 
        ? (analyzeState.sharpeThreshold ?? 4.0)
        : (analyzeState.sortinoThreshold ?? 7.0);

    // Engine Matrix Parse Call
    const thresholdDecimal = Number((selectedThresholdUI / 100).toFixed(3));
    
    const analyzeEngine = new FormatAnalyzeData(portfolio, currentStatName, selectedYear, thresholdDecimal);
    const transformed = analyzeEngine.chartData;

    // Mutation Handlers
    const handleButtonClick = (name) => {
        portfolio.updateAnalyzeState({ subType: name });
        
        // If any analyze-plot help card is already open, open the new mode's card
        if (hasCardStartingWith('analyze-plot-')) {
            const statLower = name.toLowerCase();
            openHelp(`analyze-plot-${statLower}`, false, false, false);
        }
        
        forceRedraw(c => c + 1);
    };

    const handleYearSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        portfolio.updateAnalyzeState({ currentYear: val });
        forceRedraw(c => c + 1);
    };

    const handleThresholdSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        const updatePayload = isSharpeStat 
            ? { sharpeThreshold: val } 
            : { sortinoThreshold: val };
        portfolio.updateAnalyzeState(updatePayload);
        forceRedraw(c => c + 1);
    };

    // Updated visibility check for standard Sharpe / Sortino
    const isThresholdVisible = ['Sharpe', 'Sortino', 'SharpeFZ', 'SortinoFZ'].includes(currentStatName);

    const statLower = (currentStatName || '').toLowerCase();
    const setupTrigger = <HelpTrigger keyName={`analyze-plot-${statLower}`} size="sm" />;

    const rateLabel = statLower === 'sortino' 
    ? 'TARGET RETURN' 
    : 'RISK-FREE RATE';

    return (
        <div id={`${portfolioName}-analyze-div-main`} className="chart-ui-main" style={{ width: '2000px', boxSizing: 'border-box' }}>
        
            <div id={`${portfolioName}-analyze-div-header`} className="chart-ui-header" style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0px' }}>

                {/* ROW 1: Title and Buttons Deck */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px' }}>
                    <div className="header-region-title-2">
                        {`Analyze Rolling Matrix — ${currentStatName}`}
                        {setupTrigger} 
                    </div>

                    {visibleButtons && visibleButtons.length > 0 && (
                        <div id={`${portfolioName}-analyze-div-buttons`} className="chart-button-block">
                            {visibleButtons.map((name, index) => (
                                <Hint text={getScoreHint(name, name)} position="left" key={name}>
                                    <button 
                                        onClick={() => handleButtonClick(name)}
                                        className={`btn-push-utility ${safeActiveIndex === index ? 'active' : ''}`}
                                    >
                                        {name}
                                    </button>
                                </Hint>
                            ))}
                        </div>
                    )}
                </div>

                {/* ROW 2: Sliders Deck */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '4%' }}>
                    
                    {/* LEFT COLUMN: Threshold Slider */}
                    <div style={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-start' }}>
                        {isThresholdVisible ? (
                            <div className="header-slider-container" style={{ width: '100%', margin: 0 }}>
                                <span className="header-slider-label">{rateLabel}: <span className="header-slider-year">{selectedThresholdUI.toFixed(1)}%</span></span>
                                
                                <button 
                                    className="btn-slider-step"
                                    disabled={selectedThresholdUI <= minThresholdUI}
                                    onClick={() => {
                                        const prev = Math.max(minThresholdUI, selectedThresholdUI - stepSizeUI);
                                        const updatePayload = isSharpeStat ? { sharpeThreshold: prev } : { sortinoThreshold: prev };
                                        portfolio.updateAnalyzeState(updatePayload);
                                        forceRedraw(c => c + 1);
                                    }}
                                >
                                    &#9664;
                                </button>

                                <input 
                                    type="range"
                                    min={minThresholdUI}
                                    max={maxThresholdUI}
                                    step={stepSizeUI}
                                    value={selectedThresholdUI}
                                    onChange={handleThresholdSliderChange}
                                    className="header-slider-input"
                                    style={{ flex: '1' }}
                                />

                                <button 
                                    className="btn-slider-step"
                                    disabled={selectedThresholdUI >= maxThresholdUI}
                                    onClick={() => {
                                        const next = Math.min(maxThresholdUI, selectedThresholdUI + stepSizeUI);
                                        const updatePayload = isSharpeStat ? { sharpeThreshold: next } : { sortinoThreshold: next };
                                        portfolio.updateAnalyzeState(updatePayload);
                                        forceRedraw(c => c + 1);
                                    }}
                                >
                                    &#9654;
                                </button>

                                <span className="header-slider-bounds">
                                    ({minThresholdUI.toFixed(1)}%-{maxThresholdUI.toFixed(1)}%)
                                </span>
                            </div>
                        ) : (
                            <div style={{ width: '100%' }} />
                        )}
                    </div>

                    {/* RIGHT COLUMN: Start Year Slider */}
                    <div style={{ flex: '0 0 48%', display: 'flex', justifyContent: 'flex-end' }}>
                        <div className="header-slider-container" style={{ width: '100%', margin: 0 }}>
                            <span className="header-slider-label">START YEAR: <span className="header-slider-year">{selectedYear}</span></span>
                            
                            <button 
                                className="btn-slider-step"
                                disabled={selectedYear <= firstPossibleYear}
                                onClick={() => {
                                    const prev = Math.max(firstPossibleYear, selectedYear - 1);
                                    portfolio.updateAnalyzeState({ currentYear: prev });
                                    forceRedraw(c => c + 1);
                                }}
                            >
                                &#9664;
                            </button>

                            <input 
                                type="range"
                                min={firstPossibleYear}
                                max={lastPossibleYear}
                                value={selectedYear}
                                onChange={handleYearSliderChange}
                                className="header-slider-input"
                                style={{ flex: '1' }}
                            />

                            <button 
                                className="btn-slider-step"
                                disabled={selectedYear >= lastPossibleYear}
                                onClick={() => {
                                    const next = Math.min(lastPossibleYear, selectedYear + 1);
                                    portfolio.updateAnalyzeState({ currentYear: next });
                                    forceRedraw(c => c + 1);
                                }}
                            >
                                &#9654;
                            </button>

                            <span className="header-slider-bounds">
                                ({firstPossibleYear}-{lastPossibleYear})
                            </span>
                        </div>
                    </div>

                </div>
            </div>
            
            <div id={`${portfolioName}-analyze-stage`} className="chart-stage-container-2">
                {renderPlot(transformed, currentStatName)}
            </div>

        </div>
    );
};

/**
 * Custom Tooltip Parser
 */
const CustomPlotTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; 
        const activeCurveColor = data.dotColor || 'yellow';
        return (
            <div className="tooltip-chart-summary" style={{ borderColor: activeCurveColor }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'black' }}>
                    Statistic: {data.statName} 
                </div>
                <div><span style={{ fontWeight: 'bold' }}>Value: </span>{data.displayY}</div>
                <div><span style={{ fontWeight: 'bold' }}>Start Year: </span>{data.startYear}</div>
                <div><span style={{ fontWeight: 'bold' }}>End Year: </span>{data.endYear}</div>
                <div><span style={{ fontWeight: 'bold' }}>Hold Period: </span>{data.period} Yrs</div>
                <div><span style={{ fontWeight: 'bold' }}>Sample Size: </span>{data.sampleSize}</div>
            </div>
        );
    }
    return null;
};

/**
 * Sub-Render Plot Call
 */
const renderPlot = (transformed, currentStatName) => {
    if (!transformed || !transformed.points) return null;

    const { 
        points = [], 
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

    const renderHorizontalLines = () => horizontalLines.map((line, i) => (
        <ReferenceLine 
            key={`h-${i}`} 
            y={line.y} 
            stroke="orange" 
            strokeDasharray="5 5"
            label={{ 
                value: line.label, 
                fill: 'orange',
                position: 'insideLeft',
                dx:  10,
                dy: -10,
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'monospace'
            }}
        />
    ));

    const renderCurves = () => curves.map((curve) => (
        <Line
            key={curve.id}
            name={curve.name || "Trend Line"}
            data={curve.points}
            type="monotone"               
            dataKey="y"
            stroke={curve.color || "#ff7300"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}                
        />
    ));

    const SimpleDot = (props) => {
        const { cx, cy, dotSize, dotColor } = props;
        const finalColor = dotColor || 'white';
        
        return (
            <circle 
                cx={cx} 
                cy={cy} 
                r={dotSize || 4} 
                fill={finalColor} 
                stroke={finalColor}
                strokeWidth={1} 
            />
        );
    };

    const renderScatters = () => {
        return (
            <>
                <Scatter name="Trend Nodes" data={points} dataKey="y" shape={SimpleDot} legendType='none' />
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
                tick={{ fontSize: '11px', fontFamily: 'sans-serif', fill: '#ffffff' }}
            />
            <YAxis 
                type="number" 
                dataKey="y" 
                domain={[minY, maxY]} 
                ticks={yTicks} 
                tickFormatter={(value) => ['Sharpe', 'Sortino', 'SharpeFZ', 'SortinoFZ'].includes(currentStatName) 
                    ? value 
                    : `${value}%`
                }
                stroke="#ffffff" 
                orientation="right"
                tick={{ dx: 8, fontSize: '11px', fontFamily: 'sans-serif', fill: '#ffffff' }}
            />
        </>
    );

    const renderVerticalGrid = () => xTicks.map(tick => (
        <ReferenceLine key={`grid-v-${tick}`} x={tick} stroke="rgba(255, 255, 255, 0.15)" />
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