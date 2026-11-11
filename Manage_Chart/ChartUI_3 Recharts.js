import React, { useState } from 'react';
import { getStatColor } from '../Utils/getStatColor';
import { aggregateChartData, computeStats } from '../app/Portfolio';
import { FormatChartData } from './FormatChartData';
import { GlobalYticks } from './FormatChartData';
import './Style_ChartUI.css';
import '../Styles/Containers/Portfolio.css';

import { 
    ScatterChart,
    Scatter,
    LineChart,
    Line,
    BarChart, 
    Bar, 
    Cell,
    XAxis, 
    YAxis, 
    ZAxis,
    CartesianGrid, 
    ReferenceLine, 
    ReferenceArea,
    LabelList,
    Tooltip,
    Legend
} from 'recharts';

/**
 * ChartUI: The Main Orchestrator
 */
export const ChartUI = ({ Type : inType = "plot", buttons, portfolio, allPortfolios = [], repository, updateRepository }) => {

    const Type          = inType.toLowerCase();
    const portfolioName = portfolio?.name ?? "Unknown";
    const [activeIndex, setActiveIndex] = useState(0);

    // 1. SAFEGUARD: Handle missing buttons cleanly across variations
    const currentSubtype = buttons?.[activeIndex]?.toLowerCase() ?? "???";

    // 2. CONDITIONAL SCORECARD: Only relevant for 'plot' or 'analysis' types for now
    const scorecard = (Type !== 'distribution' && Type !== 'compare') 
        ? getScorecardDefinition(Type, currentSubtype) 
        : [];
      
    // 3. Define the Manifest (Who is participating?)
    const slotCount = (Type === 'compare') ? 5 : (Type === 'distribution') ? 3 : 1;
    const [compNames, setCompNames] = useState(() => Array(slotCount - 1).fill(null));

    const activePortfolios = [
        portfolio, // [0] is always the Main Anchor
        ...compNames.map(name => {
            if (!name) return null;
            const wrapper = allPortfolios.find(p => p.name === name);
            return wrapper ? wrapper.instance : null;
        })
    ];

    // --- LOCALIZED PERSISTENT PARAMETERS FROM PORTFOLIO ---
    const sliderData = portfolio ? portfolio.getAgeSliderState() : { firstYear: 1996, lastYear: 2021, currentYear: 2005, viewMode: "Age" };

    const trueFirstYear     = sliderData.firstYear ?? 1996;
    const trueLastYear      = sliderData.lastYear ?? 2021;
    
    // Core Fix: Secure a definitive fallback if currentYear is null in the instance
    const userSelectedYear  = sliderData.currentYear ?? trueFirstYear;

    // A simple redraw trigger—React doesn't know what's in the instance, so we bump this to paint
    const [, forceRedraw] = useState(0);

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        
        // Use dedicated helper method to safely update and clamp the persistent state
        if (portfolio) {
            portfolio.updateAgeSliderState({ currentYear: val });
        }
        
        // Kick React to redraw the screen using the newly saved data
        forceRedraw(c => c + 1);
    };

    const cleanData = []; 
    const rowColors = ["#FEF9C2", "#F0FDF4", "#FEF9C2"]; 

    activePortfolios.forEach((p, i) => {
        if (!p || typeof p.getChartCollection !== 'function') {
            cleanData[i] = null;
            return;
        }

        let stats;
        let transformer;

        if (currentSubtype === 'age') {
            const firstYear = p.firstYear; 
            const selectedYear = userSelectedYear; // Now safely guaranteed to be bounded

            const baseSlices = p.getChartCollectionBYyear(Type, 'age', firstYear);
            const userSlices = p.getChartCollectionBYyear(Type, 'age', selectedYear);

            const baseSlice  = baseSlices[0] || null;
            const userSlice  = userSlices[0] || null;

            const userPoints = userSlice ? userSlice.points : { success: [], failure: [], neutral: [] };
            stats = computeStats(userPoints.success, userPoints.failure, userPoints.neutral);            

            transformer = new FormatChartData(Type, currentSubtype, 
                baseSlice, 
                userSlice, 
                [],
                p.threshold, 
                0.0 
            );

        } else {
            const slices       = p.getChartCollection(Type, currentSubtype);
            const consolidated = aggregateChartData(slices);
            
            stats = computeStats(consolidated.success, consolidated.failure, consolidated.neutral);
            transformer = new FormatChartData(Type, currentSubtype, 
                consolidated.success, 
                consolidated.failure, 
                consolidated.neutral,
                p.threshold, 
                p.mhp
            );
        }

        cleanData[i] = {
            name: p.name,
            transformedData: transformer.chartData,
            rawStats: stats ?? {}, 
            rowBgColor: rowColors[i % rowColors.length]
        };
    });

    let globalYticks = [];
    let globalAccYticks = [];
    let ChartRenderData = { distribution: {}, cumulation: {} };

    if (Type === 'distribution') {
        const allDistBars = cleanData
            .filter(entry => entry !== null)
            .map(entry => entry.transformedData.distBars);

        if (allDistBars.length > 0) {
            globalYticks = GlobalYticks(allDistBars);
        } else if (cleanData[0]) {
            globalYticks = cleanData[0].transformedData.yTicks;
        }

        const allAccBars = cleanData
            .filter(entry => entry !== null)
            .map(entry => entry.transformedData.accBars);

        if (allAccBars.length > 0) {
            globalAccYticks = GlobalYticks(allAccBars);
        } else if (cleanData[0]) {
            globalAccYticks = [0, 25, 50, 75, 100]; 
        }

        ChartRenderData = {
            distribution: {
                barsKey: 'distBars',   
                xTicks: [-40, -30, -20, -10, 0, 10, 20, 30, 40],
                yTicks: globalYticks,  
                barWidth: cleanData[0]?.transformedData.barWidth || 5,
                bounds: {
                    minX: cleanData[0]?.transformedData.bounds.minX,
                    maxX: cleanData[0]?.transformedData.bounds.maxX,
                    minY: globalYticks[0] || 0,
                    maxY: globalYticks[globalYticks.length - 1] || 5
                }
            },
            cumulation: {
                barsKey: 'accBars',    
                xTicks: [-40, -30, -20, -10, 0, 10, 20, 30, 40],
                yTicks: globalAccYticks, 
                barWidth: cleanData[0]?.transformedData.barWidth || 5,
                bounds: {
                    minX: cleanData[0]?.transformedData.bounds.minX,
                    maxX: cleanData[0]?.transformedData.bounds.maxX,
                    minY: globalAccYticks[0] || 0,
                    maxY: globalAccYticks[globalAccYticks.length - 1] || 100
                }
            }
        };
    }

    // Set dynamic headers strictly mapped by context execution targets
    let instructionMessage = "Plot Buy/Sell and Rolling matrices"; 

    if (Type === 'compare') {
        //instructionMessage = "Portfolio Comparison Matrix: (X-Axis: Comparison, Y-Axis: Current Portfolio)";
        instructionMessage = "Compare";
    } else if (Type === 'analysis') {
        instructionMessage = `Rolling ${buttons?.[activeIndex] || "Metrics"} across Rolling Matrix periods`;
    } else if (buttons && buttons[activeIndex]) {
        const currentActiveButton = buttons[activeIndex].toLowerCase();
        if (currentActiveButton === 'period') {
            instructionMessage = "Plot returns for the rows of Rolling Matrix. X axis is the Period. (White dots < MHP)";
        } else if (currentActiveButton === 'year') {
            instructionMessage = "Plot returns for the columns of Rolling Matrix. X axis is Sell Year. (White dots < MHP)";
        } else if (currentActiveButton === 'age') {
            instructionMessage = "Plot returns for the rows of Buy/Sell matrix (also diagonals of Rolling matrix). X axis is Sell Year. (MHP NOT USED)";
        } else if (currentActiveButton === 'rolling') {
            instructionMessage = "Plot returns for 3, 5, 10 year rolling returns of Rolling matrix.  X axis is Sell Year. (White dots < MHP)";
        }
    }

    return (
        <div id={`${portfolioName}-${Type}-div-main`} className="chart-ui-main" style={{ width: '2000px', boxSizing: 'border-box' }}>
        
            <div id={`${portfolioName}-${Type}-div-header`} className="chart-ui-header" style={{ width: '100%', boxSizing: 'border-box' }}>

                {/* TOP ELEMENT: Elevated Header Title Region */}
                <div className="header-region-title-2">
                    {instructionMessage}
                </div>

                {/* BOTTOM ELEMENT: Controls Deck (Buttons, Slider, Scorecard) */}
                <div className="header-controls-row">
                    
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
                                    if (portfolio && typeof portfolio.updateAgeSliderState === 'function') {
                                        portfolio.updateAgeSliderState({ currentYear: prev });
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
                                    if (portfolio && typeof portfolio.updateAgeSliderState === 'function') {
                                        portfolio.updateAgeSliderState({ currentYear: next });
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
                            {renderScoreStats(cleanData[0]?.rawStats, scorecard)}
                        </div>
                    )}

                </div>

            </div>


            <div 
                id={`${portfolioName}-${Type}-stage`} 
                className="chart-stage-container-2"
            >
                {Type === 'distribution' ? (
                    renderDistribution(
                        cleanData,        
                        allPortfolios,    
                        compNames,        
                        setCompNames,     
                        ChartRenderData
                    )
                ) : Type === 'compare' ? (
                    renderCompareGrid(compNames, allPortfolios)
                ) : Type === 'analysis' ? (
                    renderAnalysisLine(cleanData[0]?.transformedData, buttons?.[activeIndex] || "Metric")
                ) : (
                    renderPlot(cleanData[0]?.transformedData, currentSubtype)
                )}
            </div>

        </div>
    );
};

export const getScorecardDefinition = (Type, subType) => {
    if (Type === 'plot' || Type === 'analysis') {
        return ["Average", "Median", "Std Dev", "Total Count"];
    }
    return ["Total Count"];
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
            default:             return "—";
        }
    };

    return (
        <div className="rbl-score">
            {scorecard.map((label, index) => {
                const value = getStatValue(label);
                const bgColor = getStatColor(label, value);

                return (
                    <div className="score-column" key={index}>
                        <div className="score-header">{label}</div>
                        <div className="score-value" style={{ backgroundColor: bgColor }}>{value}</div>
                    </div>
                );
            })}
        </div>
    );
};

const rollingStyles = {
    rolling_3:  { color: "#534bee", strokeWidth: 2 },
    rolling_5:  { color: "#82ca9d", strokeWidth: 2 },
    rolling_10: { color: "#ff7300", strokeWidth: 3 }, 
    trend_age_base:  { color: "#534bee", strokeWidth: 2 }, 
    trend_age_user: { color: "#ff7300", strokeWidth: 3 }
};

const CustomPlotTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; 
        return (
            <div className="chart-tooltip-summary" style={{ backgroundColor: data.dotFill || '#333', color: 'black' }}>
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
        vectorLines = [], 
        curves = [] 
    } = transformed;

    const minX = bounds?.minX ?? 0;
    const maxX = bounds?.maxX ?? 0;
    const minY = bounds?.minY ?? 0;
    const maxY = bounds?.maxY ?? 0;

    const renderHorizontalLines = () => horizontalLines.map((line, i) => {
        const colors = { threshold: 'orange', average: 'orange', median: 'yellow' };
        const dashes = { threshold: '0', average: '5 5', median: '3 3' };
        const strokeColor = colors[line.type] || 'red';

        return (
            <ReferenceLine 
                key={`h-${i}`} 
                y={line.y} 
                stroke={strokeColor} 
                strokeDasharray={dashes[line.type] || '0'}
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
                name={curve.name || "Trend Line"}
                stroke={style.color}
                strokeWidth={style.strokeWidth}
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
                {points.neutral?.length > 0 && <Scatter name="Neutral" data={points.neutral} dataKey="y" shape={SimpleDot} />}
                {points.success?.length > 0 && <Scatter name="Success" data={points.success} dataKey="y" shape={SimpleDot} />}
                {points.failure?.length > 0 && <Scatter name="Fail"    data={points.failure} dataKey="y" shape={SimpleDot} />}
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
                // Matches the Y-axis label sizing for perfect symmetry
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
                // ◄── Shrunk font size to 11px and nudged text 8px right away from the frame line
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
            style={{ boxSizing: 'border-box', backgroundColor: 'black', borderRadius: '8px' }} /* ◄── Sets background and rounds corners inside charting area */
        >
            <CartesianGrid stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" vertical={false} />
            {renderVerticalGrid()}
            <ReferenceLine y={0} stroke="#fff" strokeWidth={1} />
            {renderHorizontalLines()}
            {renderVectorLines()}
            {renderCurves()}
            {renderAxes()}
            <Tooltip content={<CustomPlotTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            {renderScatters()}

            <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ 
                    // Layout overrides to center and shrink the box to content only
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'auto',

                    // Typography and padding
                    fontSize: '12px', 
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                    /*textTransform: 'uppercase',*/
                    padding: '6px 16px',

                    // Background skin matching the outer stage container
                    backgroundColor: 'lightslategray', 
                    borderRadius: '4px' 
                }}
            />







        </ScatterChart>
    );
};


const renderAnalysisLine = (transformed, metricLabel) => {
    if (!transformed || !transformed.curves || transformed.curves.length === 0) {
        return <div style={{ width: '100%', height: '100%', color: 'red', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Analysis Data Points Found</div>;
    }

    const curve = transformed.curves[0];
    const xTicks = transformed.xTicks || [1, 2, 3, 4, 5];
    const yTicks = transformed.yTicks || [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];

    return (
        <div className="chart-panel-wrapper" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <LineChart width={944} height={560} data={curve.points} margin={{ top: 30, right: 30, bottom: 65, left: 20 }}>
                <CartesianGrid stroke="#FFFFFF" strokeOpacity={0.1} vertical={false} />
                {xTicks.map(tick => <ReferenceLine key={`grid-v-${tick}`} x={tick} stroke="#a9a9b3" strokeDasharray="3 3" />)}
                <XAxis type="number" dataKey="x" ticks={xTicks} domain={[xTicks[0], xTicks[xTicks.length - 1]]} stroke="#000" tick={{ fontSize: '11px', dy: 12 }} />
                <YAxis type="number" dataKey="y" ticks={yTicks} domain={[yTicks[0], yTicks[yTicks.length - 1]]} stroke="#000" orientation="right" tick={{ dx: 8, fontSize: '11px' }} />
                <Tooltip cursor={{ stroke: '#fff', strokeOpacity: 0.2 }} />
                <Line type="monotone" dataKey="y" stroke="#ffaa00" strokeWidth={3} dot={{ fill: '#ff0000', stroke: '#ffaa00', r: 6 }} activeDot={{ r: 8 }} isAnimationActive={false} />
                <Legend verticalAlign="bottom" height={36} content={() => <div style={{ textAlign: 'center', color: '#ffaa00', fontWeight: 'bold', fontSize: '14px' }}>■ {metricLabel} ({transformed.threshold || "7.0"}%)</div>} />
            </LineChart>
        </div>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ backgroundColor: data.fill, padding: '8px 12px', border: '1px solid #475569', borderRadius: '4px', color: '#000000', fontSize: '11px', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.label}</div>
                <div><span>Count: </span><strong>{data.count}</strong></div>
                <div><span>Frequency: </span><strong>{data.y}%</strong></div>
                <div><span>Avg Return: </span><strong>{data.avgReturn}%</strong></div>
            </div>
        );
    }
    return null;
};

const renderBarChart = (chartConfig) => {
    if (!chartConfig || !chartConfig.bars) return null;
    const { bars, verticalLines, yTicks, bounds, syncId } = chartConfig;
    const { minX, maxX, minY, maxY } = bounds;

    return (
        <div className="chart-panel-wrapper" style={{ width: "420px", height: "220px", position: 'relative' }}>
            <BarChart width={420} height={220} data={bars} syncId={syncId} margin={{ top: 25, right: 15, left: 15, bottom: 5 }}>
                <CartesianGrid stroke="#FFFFFF" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="x" type="number" domain={[minX, maxX]} hide />
                <YAxis type="number" ticks={yTicks} domain={[minY, maxY]} hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.2)' }} />
                <Bar dataKey="y" opacity={0.85}>
                    <LabelList position="top" fill="#000000" fontSize={12} />
                    {bars.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || "#10b981"} />)}
                </Bar>
                {verticalLines && verticalLines.map((line, i) => <ReferenceLine key={`v-line-${i}`} x={line.x} stroke={line.color || '#ffffff'} strokeWidth={1} strokeDasharray={line.dashStyle || undefined} />)}
            </BarChart>
        </div>
    );
};

const renderDistribution = (cleanData, allPortfolios, compNames, setCompNames, ChartRenderData) => {
    const prepareChartData = (entry, columnType) => {
        if (!entry) return null;
        const configProfile = columnType === 'dist' ? (ChartRenderData?.distribution ?? {}) : (ChartRenderData?.cumulation ?? {});
        return {
            bars: Array.isArray(columnType === 'dist' ? entry.transformedData.distBars : entry.transformedData.accBars) ? (columnType === 'dist' ? entry.transformedData.distBars : entry.transformedData.accBars).map(b => ({ ...b, x: b.x, y: b.y, fill: b.fill })) : [], 
            verticalLines: entry.transformedData.verticalLines || [],
            xTicks:   configProfile?.xTicks ?? [],
            yTicks:   configProfile?.yTicks ?? [],
            bounds:   configProfile?.bounds ?? { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            barWidth: configProfile?.barWidth ?? 5,
            syncId:   `${cleanData[0]?.name || "default"}-${columnType}`
        };
    };

    return (
        <table className="master-distribution-table" style={{ width: '100%' }}>
            <thead>
                <tr className="dist-sub-header">
                    <td className="cell-left-chart">
                        <div className="column-title">DISTRIBUTION</div>
                        <div className="x-axis-row left-halo-zone">
                            {(ChartRenderData?.distribution?.xTicks ?? []).map(tick => <span key={`left-x-${tick}`} className="x-tick-label">{tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}</span>)}
                        </div>
                    </td>
                    <td className="cell-center-spine"><div className="spine-title">PORTFOLIO SELECTION</div></td>
                    <td className="cell-right-chart">
                        <div className="column-title">CUMULATION</div>
                        <div className="x-axis-row right-halo-zone">
                            {(ChartRenderData?.cumulation?.xTicks ?? []).map(tick => <span key={`right-x-${tick}`} className="x-tick-label">{tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}</span>)}
                        </div>
                    </td>
                </tr>
            </thead>
            <tbody>
                {[0, 1, 2].map((rowIndex) => {
                    const entry = cleanData[rowIndex];
                    return (
                        <tr key={`row-${rowIndex}`} style={{ backgroundColor: entry?.rowBgColor || "#d9ead3" }}>
                            <td className="cell-left-chart">{renderBarChart(prepareChartData(entry, 'dist'))}</td>
                            <td className="cell-center-spine">
                                <div className="spine-stats">
                                    <div>Avg: {typeof entry?.rawStats?.averages?.average === 'number' ? (entry.rawStats.averages.average * 100).toFixed(1) + "%" : "---"}</div>
                                    <div>Med: {typeof entry?.rawStats?.averages?.median === 'number' ? (entry.rawStats.averages.median * 100).toFixed(1) + "%" : "---"}</div>
                                </div>
                            </td>
                            <td className="cell-right-chart">{renderBarChart(prepareChartData(entry, 'acc'))}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

const renderCompareGrid = (compNames, allPortfolios) => {
    return (
        <div className="compare-matrix-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 450px)', gap: '15px', justifyContent: 'center', backgroundColor: '#9aa0a6', padding: '10px', width: '920px' }}>
            {[0, 1, 2, 3].map((panelIdx) => (
                <div key={`compare-panel-${panelIdx}`} style={{ width: '440px', height: '300px', backgroundColor: '#3c4043', border: '2px solid #fbc02d', position: 'relative', padding: '5px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '4px', fontSize: '11px', color: '#fff' }}>
                        <span>x axis:</span>
                        <select style={{ fontSize: '11px', padding: '1px' }}><option>Select Comparison</option></select>
                        <span>Y axis:</span>
                        <input type="text" value="a" readOnly style={{ width: '80px', fontSize: '11px', padding: '1px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                        <div style={{ backgroundColor: '#137333', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '2px' }}>0 (0.0%)</div>
                        <div style={{ backgroundColor: '#a50e0e', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '2px' }}>0 (0.0%)</div>
                        <div style={{ backgroundColor: '#f4b400', color: '#000', fontSize: '10px', padding: '2px 4px', borderRadius: '2px' }}>0 (0.0%)</div>
                        <div style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #000', fontSize: '10px', padding: '2px 4px', borderRadius: '2px' }}>0 ( &lt; MHP)</div>
                    </div>
                    <div style={{ width: '426px', height: '220px', backgroundColor: '#202124', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#d93025', fontSize: '12px', textAlign: 'center' }}>Select a comparison portfolio to populate matrix</span>
                    </div>
                </div>
            ))}
        </div>
    );
};