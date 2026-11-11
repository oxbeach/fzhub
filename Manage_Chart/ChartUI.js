import React, { useState } from 'react';
import { getStatColor } from '../Utils/getStatColor';
import { getStatistics } from '../app/Portfolio';
import './Style_ChartUI.css';

import { 
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, ReferenceArea, ComposedChart, Bar,
    CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

/**
 * ChartUI: The Main Orchestrator
 */
export const ChartUI = ({ Type, buttons, portfolio }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const portfolioName = portfolio.name;

  const currentSubtype = buttons[activeIndex];
  const scorecard = getScorecardDefinition(Type, currentSubtype);
  {/*const rawStats = getStatistics(portfolio.chartLibrary, Type, currentSubtype);*/}




  return (
    <div id={`${Type}-div-main`} className="chart-ui-main">
      
      {/* YELLOW ZONE: HEADER */}
      <div id={`${Type}-div-header`} className="chart-ui-header">
        <div style={{ fontWeight: 'bold' }}>{portfolioName}</div>
        
        <div id={`${Type}-div-ui`} className="chart-ui-block">
          UI CONTROLS (BROWN)
        </div>

        <div id={`${Type}-div-buttons`} className="chart-button-block">
          {buttons.map((name, index) => (
            <button 
              key={name}
              onClick={() => setActiveIndex(index)}
              style={{
                backgroundColor: activeIndex === index ? '#f6b26b' : '#fff',
                cursor: 'pointer'
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {/*
        <div id={`${Type}-div-score`} className="chart-score-block">
          {renderScoreStats(rawStats, scorecard)}
        </div>
        */}

      </div>

      {/* BLUE ZONE: STAGES */}
      <div className="chart-stage-container">
        {buttons.map((subType, index) => {
          const isVisible = activeIndex === index;
          return (
            <div 
              key={index}
              id={`${Type}-div-chart${index + 1}`}
              className={`chart-stage ${isVisible ? 'is-visible' : ''}`}
            >
              {isVisible && renderChartContent(Type, currentSubtype, portfolio)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * POLICY: getScorecardDefinition
 */
export const getScorecardDefinition = (Type, subType) => {
    const activeType = Type?.toLowerCase();
    const activeSubtype = subType?.toLowerCase();

    if (activeType === 'plot') {
        switch (activeSubtype) {
            case 'period': return ["Avg", "Success", "Fail", "Win"];
            case 'year':   return ["Avg", "Total Mature", "Win", "Total Immature"];
            case 'age':    return ["Avg", "Success", "Fail", "Total Mature"];
            default:       return ["Avg", "Success", "Win"];
        }
    }

    if (activeType === 'risk') {
        return ["Max DD", "Sharpe", "Volatility"];
    }

    return ["Success"];
};

/**
 * LANDLORD: renderScoreStats
 */
const renderScoreStats = (rawStats = [], scorecard = []) => {
    const displayItems = scorecard.map(label => 
        rawStats.find(stat => stat.label.toLowerCase() === label.toLowerCase())
    ).filter(Boolean);

    const slots = Array.from({ length: 8 });

    return (
        <div id="scoreChart-div">
            {slots.map((_, index) => {
                const item      = displayItems[index];
                const isVisible = !!item;
                const bgColor   = isVisible ? getStatColor(item.label, item.value) : 'transparent';

                return (
                    <div 
                        key={index} 
                        className="score-stat-row"
                        style={{ display: isVisible ? 'flex' : 'none' }} 
                    >
                        <span className="stat-label">{item?.label}:</span>
                        <span 
                            className="stat-value"
                            style={{ 
                                backgroundColor: bgColor,
                                padding: '2px 8px',
                                borderRadius: '3px',
                                color: 'black',
                                fontWeight: 'bold'
                            }}
                        >
                            {item?.value}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * DISPATCHER: renderChartContent
 */
const renderChartContent = (Type, subType, portfolio) => {

  if (!Type || !subType) return null;
  const activeType    = Type.toLowerCase();
  const activeSubtype = subType.toLowerCase();

  // Fixed typo: used activeSubtype (consistent casing)
  const chartData = portfolio.getChartCollection(activeType, activeSubtype);

  if (!chartData || chartData.length === 0) return null;

  switch (activeType) {
    case 'plot': return renderPlotEngine(activeSubtype, chartData);
    case 'risk': return renderRiskEngine(activeSubtype, chartData);
    default:     return <div className="chart-stage is-visible">Unknown Type: {Type}</div>;
  }
};


/**
 * SPECIALIST: Plot Engine
 */
const renderPlotEngine = (subType, chartData) => {
    switch (subType) {
        case 'period': return renderPlotPeriod(chartData);
        case 'year':   return renderPlotYear(chartData);
        case 'age':    return renderPlotAge(chartData);
        default:       return <div>Unknown Plot Subtype: {subType}</div>;
    }
};

/**
 * SPECIALIST: Risk Engine (Placeholder)
 */
const renderRiskEngine = (subType, collection) => {
    return (
        <div className="chart-stage is-visible">
            <h3>Risk: {subType.toUpperCase()}</h3>
            <p>Risk calculation logic pending implementation.</p>
        </div>
    );
};

const renderPlotYear = (data) => (
    <div><h3>Plot: Year Analysis</h3></div>
);

const renderPlotAge = (data) => (
    <div><h3>Plot: Age Analysis</h3></div>
);



/**
 * specialist engine: renderPlotPeriod
 * Visualizes the Matrix: X = Period, Y = Return.
 * Each column (X) contains the stack of returns for that specific Period.
 */


const roundDown = (val, step = 10) => Math.floor(val / step) * step;
const roundUp = (val, step = 10) => Math.ceil(val / step) * step;


const getCleanStep = (min, max, maxSteps = 5) => {
    // Determine the largest spread from zero
    const largestRange = Math.max(Math.abs(min), Math.abs(max));
    const idealStep = largestRange / maxSteps;

    // Filter for the best "clean" increment
    if (idealStep <= 5) return 5;
    if (idealStep <= 10) return 10;
    if (idealStep <= 20) return 20;
    if (idealStep <= 25) return 25;
    return 50; 
};

const generateYTicks = (min, max, maxSteps = 5) => {
    const step = getCleanStep(min, max, maxSteps);
    const ticks = [];
    
    // Operation 1: Negative to 0
    // Start at 0 and move down to ensure 0 is the anchor
    for (let val = 0; val >= min; val -= step) {
        ticks.unshift(val); // Add to beginning of array
    }
    
    // Operation 2: 0 to Positive
    // Start from step to avoid duplicating zero
    for (let val = step; val <= max; val += step) {
        ticks.push(val);
    }
    
    return ticks;
};


const renderPlotPeriod = (chartData) => {
    if (!chartData || chartData.length === 0) {
        return <div className="chart-stage is-visible">Initializing Matrix Plot...</div>;
    }
            //
            //chartData.forEach((chart, chartIdx) => {
            //    chart.chartData.bars.forEach((bar, barIdx) => {
            //        alert(`Chart [${chartIdx}] | Bar [${barIdx}]\nx1: ${bar.x1}\nx2: ${bar.x2}\ny: ${bar.y}%`);
            //    });
            //});






    const CEILING = 100;
    const FLOOR = -60;

    const clampY = (val, min, max) => Math.min(Math.max(val, min), max);

    const allBars = chartData.flatMap(chart => chart.chartData.bars);

    const rawMinX = Math.min(...chartData.map(chart => chart.chartData.bounds.minX));
    const rawMaxX = Math.max(...chartData.map(chart => chart.chartData.bounds.maxX));
    const rawMinY = Math.min(...chartData.map(chart => chart.chartData.bounds.minY));
    const rawMaxY = Math.max(...chartData.map(chart => chart.chartData.bounds.maxY));

    let globalMinY = roundDown(Math.max(rawMinY, FLOOR), 10);
    let globalMaxY = roundUp(Math.min(rawMaxY, CEILING), 10);

    const globalMinX = rawMinX - 0.5;
    const globalMaxX = rawMaxX + 0.5;

    const allSuccess = chartData.flatMap(chart => 
        chart.chartData.points.success.map(p => ({
            ...p,
            actualY: p.y, 
            y: clampY(p.y, globalMinY, globalMaxY) 
        }))
    );

    const allFail = chartData.flatMap(chart => 
        chart.chartData.points.fail.map(p => ({
            ...p,
            actualY: p.y,
            y: clampY(p.y, globalMinY, globalMaxY)
        }))
    );

    const allNeutral = chartData.flatMap(chart => 
        chart.chartData.points.neutral.map(p => ({
            ...p,
            actualY: p.y,
            y: clampY(p.y, globalMinY, globalMaxY)
        }))
    );

    const yTicks = generateYTicks(globalMinY, globalMaxY, 5);
    const xTicks = Array.from({length: Math.ceil(rawMaxX)}, (_, index) => index + 1);

    return (
        <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    {/* Horizontal Dotted Lines */}
                    <CartesianGrid 
                        stroke="#999" 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        horizontal={true}
                    />
                    
                    {/* Solid Vertical Lines at every Period */}
                    {xTicks.map(tick => (
                        <ReferenceLine 
                            key={`v-line-${tick}`} 
                            x={tick} 
                            stroke="#bbb" 
                            strokeWidth={1} 
                        />
                    ))}

                    <ReferenceLine 
                        y={0} 
                        stroke="#000" 
                        strokeWidth={2} 
                        label={{ position: 'right', fill: '#000', fontWeight: 'bold' }} 
                    />

                    {allBars.map((bars, i) => (
                        <ReferenceArea
                            key={`ghost-bar-${i}`}
                            x1={bars.x1}
                            x2={bars.x2}
                            y1={0}
                            y2={bars.y}
                            stroke="none"
                            fill={bars.y >= 0 ? "#2ecc71" : "#e74c3c"}
                            fillOpacity={0.30}
                        />
                    ))}

                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Period" 
                        ticks={xTicks}
                        domain={[globalMinX, globalMaxX]} 
                        stroke="#888"
                        tick={{ fill: '#000000', fontWeight: 300 }}
                        padding={{ left: 30, right: 30 }}
                    />
                    
                    <YAxis 
                        type="number" 
                        dataKey="y"
                        name="Return"
                        domain={[globalMinY, globalMaxY]} 
                        ticks={yTicks} 
                        tick={{ fill: '#000', fontWeight: 300 }} 
                        unit="%"
                        stroke="#888"
                        interval={0} 
                    />

                    <ZAxis type="number" range={[60, 60]} />
                    
                     <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#333', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />

                    {/* Invisible Scatter to catch Tooltip events for the bars */}
                    {/*
                    <Scatter 
                        name="Bar Data" 
                        data={allBars.map(b => ({ x: (b.x2), y: b.y, label: "Average Return" }))} 
                        fillOpacity={0} 
                    />
                    */}

                    <Scatter name="Neutral" data={allNeutral} fill="#FFFFFF" stroke="#71797e" />
                    <Scatter name="Success" data={allSuccess} fill="#4ec54e" stroke="#71797e" />
                    <Scatter name="Fail"    data={allFail}    fill="#e74c3c" stroke="#71797e"/>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};


