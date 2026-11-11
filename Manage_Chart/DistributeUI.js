import React, { useState } from 'react';
import { getStatColor } from '../Utils/getStatColor';
import { aggregateChartData, computeStats } from '../app/Portfolio';
import { FormatDistribute } from './FormatDistribute';
import { GlobalYticks }     from './FormatDistribute';
import { HelpTrigger }      from '../Help/HelpTrigger';

import './Style_ChartUI.css';
import '../Styles/Containers/Portfolio.css';
import './Style_Distribute.css';
import '../Styles/Style_Ellipsis.css';

import { 
    BarChart, 
    Bar, 
    Cell,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    ReferenceLine, 
    LabelList,
    Tooltip
} from 'recharts';

/**
 * DistributeUI: Dedicated Orchestrator for Distribution and Cumulation Charts
 */
export const DistributeUI = ({ portfolio, allPortfolios = [] }) => {

    const portfolioName = portfolio?.name ?? "Unknown";
    const [renderTrigger, setRenderTrigger] = useState(0);

    const currentSubtype = "???";

    // Step 1: Extract the saved distribution slots from the engine instance cache
    const rawCache = typeof portfolio?.getDistribution === 'function' ? portfolio.getDistribution() : [];
    
    // Explicitly reconstruct the 2 comparison slots to prevent layout pop/shifting
    const compNames = Array.from({ length: 2 }).map((_, i) => {
        return rawCache[i] || null;
    });

    // Step 2: Commit these slots back to lock them down natively
    if (typeof portfolio?.setDistribution === 'function') {
        portfolio.setDistribution(compNames);
    }

    // Handle updating comparison portfolio selection dropdowns via the persistent engine
    const handleCompChange = (slotIndex, selectedName) => {
        const nextSlots = [...compNames];
        nextSlots[slotIndex] = selectedName === "" ? null : selectedName;
        
        if (typeof portfolio?.setDistribution === 'function') {
            portfolio.setDistribution(nextSlots);
        }
        setRenderTrigger(prev => prev + 1);
    };

    const activePortfolios = [
        portfolio, // [0] is always the Main Anchor
        ...compNames.map((name) => {
            if (!name) return null;
            const wrapper = allPortfolios.find(p => p.name === name);
            return wrapper ? wrapper.instance : null;
        })
    ];

    const cleanData = []; 
    const rowColors = ["lightblue", "rgb(0,0,255,.4)", "lightblue"]; 

    activePortfolios.forEach((p, i) => {
        if (!p || typeof p.getChartCollection !== 'function') {
            cleanData[i] = null;
            return;
        }

        const slices       = p.getChartCollection('distribution', currentSubtype);
        const consolidated = aggregateChartData(slices);
        const stats        = computeStats(consolidated.success, consolidated.failure, consolidated.neutral);
        const transformer  = new FormatDistribute(p.id, consolidated.success, consolidated.failure, consolidated.neutral);

        cleanData[i] = {
            name: p.name,
            transformedData: transformer.chartData,
            rawStats: stats ?? {}, 
            rowBgColor: rowColors[i % rowColors.length]
        };
    });

    // Compute Global Y-ticks for clean scale alignment across the tables
    let globalYticks = [];
    let globalAccYticks = [];

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

    const ChartRenderData = {
        distribution: {
            barsKey: 'distBars',   
            xTicks: cleanData[0]?.transformedData?.xTicks || [-40, -30, -20, -10, 0, 10, 20, 30, 40],
            yTicks: globalYticks,  
            bounds: {
                minX: cleanData[0]?.transformedData?.bounds?.minX ?? -40,
                maxX: cleanData[0]?.transformedData?.bounds?.maxX ?? 40,
                minY: globalYticks[0] || 0,
                maxY: globalYticks[globalYticks.length - 1] || 5
            }
        },
        cumulation: {
            barsKey: 'accBars',    
            xTicks: cleanData[0]?.transformedData?.xTicks || [-40, -30, -20, -10, 0, 10, 20, 30, 40],
            yTicks: globalAccYticks, 
            bounds: {
                minX: cleanData[0]?.transformedData?.bounds?.minX ?? -40,
                maxX: cleanData[0]?.transformedData?.bounds?.maxX ?? 40,
                minY: globalAccYticks[0] || 0,
                maxY: globalAccYticks[globalAccYticks.length - 1] || 100
            }
        }
    };

    return (
        <div id={`${portfolioName}-distribution-div-main`} className="chart-ui-main" style={{ width: '2000px', boxSizing: 'border-box' }}>
            <div id={`${portfolioName}-distribution-div-header`} className="chart-ui-header" style={{ width: '100%', boxSizing: 'border-box' }}>
                <div className="header-region-title-2">
                    Distribution and Cumulation Profiles <HelpTrigger keyName="distribution-plot" size="sm" />
                </div>
            </div>

            <div id={`${portfolioName}-distribution-stage`} className="chart-stage-container-2">
                {renderDistribution(
                    cleanData,        
                    allPortfolios,    
                    compNames,        
                    handleCompChange,     
                    ChartRenderData
                )}
            </div>
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
    if (!chartConfig || !chartConfig.bars || chartConfig.bars.length === 0) {
        return <div className="chart-panel-placeholder" style={{ width: "420px", height: "220px" }} />;
    }
    const { bars, verticalLines, yTicks, bounds, syncId } = chartConfig;
    const { minX, maxX, minY, maxY } = bounds;

    return (
        <div className="chart-panel-wrapper" style={{ width: "460px", height: "220px", position: 'relative' }}>
            <BarChart width={460} height={220} data={bars} syncId={syncId} margin={{ top: 25, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#FFFFFF" strokeOpacity={0.5} vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" domain={[minX, maxX]} hide />
                <YAxis type="number" ticks={yTicks} domain={[minY, maxY]} hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.2)' }} />
                <Bar dataKey="y" opacity={0.85}>
                    <LabelList position="top" fill="#000000" fontSize={12} />
                    {bars.map((entry, index) => (
                        <Cell key={entry.id !== undefined && entry.id !== null ? `cell-${entry.id}` : `cell-fallback-${index}`} fill={entry.fill || "#10b981"} />
                    ))}
                </Bar>
                {verticalLines && verticalLines.map((line, i) => (
                    <ReferenceLine key={`v-line-${syncId}-${i}`} x={line.x} stroke={line.color || '#ffffff'} strokeWidth={1} strokeDasharray={line.dashStyle || undefined} />
                ))}
            </BarChart>
        </div>
    );
};

const renderDistribution = (cleanData, allPortfolios, compNames, handleCompChange, ChartRenderData) => {
   
    const prepareChartData = (entry, columnType) => {
        if (!entry) return null;

        const configProfile = columnType === 'dist' 
            ? (ChartRenderData?.distribution ?? {}) 
            : (ChartRenderData?.cumulation ?? {});

        const rawBars = columnType === 'dist' 
            ? entry.transformedData?.distBars 
            : entry.transformedData?.accBars;

        const computedBars = Array.isArray(rawBars)
            ? rawBars.map((b, idx) => ({ 
                ...b, 
                x: b.x, 
                y: b.y, 
                fill: b.fill,
                id: b.id !== undefined && b.id !== null ? b.id : idx
            }))
            : [];

        return {
            bars:          computedBars,
            verticalLines: entry.transformedData.verticalLines || [],
            xTicks:        configProfile?.xTicks ?? [],
            yTicks:        configProfile?.yTicks ?? [],
            bounds:        configProfile?.bounds ?? { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            syncId:        `${cleanData[0]?.name || "default"}-${columnType}`
        };
    };

    return (
        <table className="master-distribution-table">
            <thead>
                <tr className="dist-sub-header">
                    <td className="cell-left-chart">
                        <div className="column-title">DISTRIBUTION</div>
                        <div className="x-axis-row left-halo-zone">
                            {(ChartRenderData?.distribution?.xTicks ?? []).map((tick, idx) => (
                                <span key={`left-x-tick-${tick}-${idx}`} className="x-tick-label">
                                    {tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}
                                </span>
                            ))}
                        </div>
                    </td>
                    <td className="cell-center-spine"><div className="spine-title">PORTFOLIO SELECTION</div></td>
                    <td className="cell-right-chart">
                        <div className="column-title">CUMULATION</div>
                        <div className="x-axis-row right-halo-zone">
                            {(ChartRenderData?.cumulation?.xTicks ?? []).map((tick, idx) => (
                                <span key={`right-x-tick-${tick}-${idx}`} className="x-tick-label">
                                    {tick === 40 ? '>= 40' : tick === -40 ? '<= -40' : tick}
                                </span>
                            ))}
                        </div>
                    </td>
                </tr>
            </thead>
            <tbody>
                {[0, 1, 2].map((rowIndex) => {
                    const entry = cleanData[rowIndex];
                    
                    return (
                        <tr key={`master-row-${rowIndex}`} style={{ backgroundColor: entry?.rowBgColor || (rowIndex === 1 ? "#F0FDF4" : "#FEF9C2") }}>
    
                            {/* Left Chart */}
                            <td className="cell-left-chart">
                                {entry ? renderBarChart(prepareChartData(entry, 'dist')) : <div style={{ height: '220px' }} />}
                            </td>
                            
                            {/* Center Spine */}
                            <td className="cell-center-spine">
                                <div className="spine-summary-card">
                                    <div className="">
                                        {rowIndex === 0 ? "Current Portfolio" : "Comparison Portfolio"}
                                    </div>
                                    <div className="spine-card-target">
                                        {rowIndex === 0 ? (
                                            <div 
                                                className="ellipsis-label"
                                                title={entry?.name || "Anchor Portfolio"}
                                            > 
                                                {entry?.name || "Anchor Portfolio"}
                                            </div>
                                        ) : (
                                            <select 
                                                value={compNames[rowIndex - 1] || ""} 
                                                onChange={(e) => handleCompChange(rowIndex - 1, e.target.value)}
                                                className="ellipsis-select-name"
                                                title={compNames[rowIndex - 1] || "-- Select Portfolio --"}
                                            >
                                                <option value="">-- Select Portfolio --</option>
                                                {allPortfolios
                                                    .filter(p => p.name !== cleanData[0]?.name)
                                                    .map((p, pIdx) => {
                                                        const shortDropdownName = p.name && p.name.length > 16 
                                                            ? p.name.substring(0, 13) + "..." 
                                                            : p.name;

                                                        return (
                                                            <option key={`opt-${p.name || pIdx}`} value={p.name} title={p.name}>
                                                                {shortDropdownName}
                                                            </option>
                                                        );
                                                    })
                                                }
                                            </select>
                                        )}
                                    </div>

                                    <div className="spine-card-stats-grid">
                                        <div className="spine-stat-item">
                                            <span className="stat-lbl">Avg:</span>
                                            <span className="stat-val">
                                                {typeof entry?.rawStats?.averages?.average === 'number' ? (entry.rawStats.averages.average * 100).toFixed(1) + "%" : "---"}
                                            </span>
                                        </div>
                                        <div className="spine-stat-item">
                                            <span className="stat-lbl">Med:</span>
                                            <span className="stat-val">
                                                {typeof entry?.rawStats?.averages?.median === 'number' ? (entry.rawStats.averages.median * 100).toFixed(1) + "%" : "---"}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </td>
                            
                            {/* Right Chart */}
                            <td className="cell-right-chart">
                                {entry ? renderBarChart(prepareChartData(entry, 'acc')) : <div style={{ height: '220px' }} />}
                            </td>

                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};