import { useState } from 'react';
import { FormatChart_Compare } from '../Manage_Chart/FormatChart_Compare';
import { HelpTrigger }         from '../Help/HelpTrigger';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Line, Tooltip } from 'recharts';
import { getComparison } from '../app/Portfolio';
import { setComparison } from '../app/Portfolio';

import './Style_ChartUI.css';
import './Style_ChartUI_Compare.css';
import '../Styles/Containers/Portfolio.css';


export const ChartUI_Compare = ({ Type: inType = "compare", portfolio, allPortfolios = [] }) => {

  const portfolioY = portfolio;
  const portfolioNames = allPortfolios.map(p => p.name);

  const [renderTrigger, setRenderTrigger] = useState(0);

  const rawCache = portfolioY.getComparison(); 

  // Step 1: Extract the saved portfolio names exactly as they are without filtering.
  // This prevents the matrix layout from losing its state if a portfolio is briefly uncomputed.
  const slots = Array.from({ length: 4 }).map((_, i) => {
    return rawCache[i] || null;
  });

  // Step 2: Ensure the base portfolio tracks these saved slots natively.
  portfolioY.setComparison(slots);

  const handleSelect = (slotId, name) => {
    const nextSlots = [...slots];
    nextSlots[slotId] = name;
    portfolioY.setComparison(nextSlots);
    setRenderTrigger(prev => prev + 1);
  };

  return (
    <div className="compare-section-wrapper">

      <div 
          id="compare-section-header" 
          className="chart-ui-header" 
          style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0px' }}
      >
           <div className="header-region-title-2" >
              {/*Portfolio Comparison Matrix: (X-Axis: Comparison, Y-Axis: Current Portfolio) <HelpTrigger keyName="comparison-plot" size="sm" />   */}
              Compare <HelpTrigger keyName="comparison-plot" size="sm" /> 
          </div>

          <p className="header-region-hint">
              Return (X,Y) above the diagonal line indicate Portfolio Y outperformed Portfolio X; points below indicate Portfolio X performed better.
          </p>
      </div>


    <table className="compare-quad-table">
      <tbody>
        <tr>
          <td className="quad-cell cell-border-right cell-border-bottom">
            <CompareQuadrant
              slotId={0}
              portfolioY={portfolioY}
              allPortfolios={allPortfolios}
              portfolioNames={portfolioNames}
              selectedName={slots[0]}
              onSelect={(name) => handleSelect(0, name)}
            />
          </td>
          <td className="quad-cell cell-border-bottom">
            <CompareQuadrant
              slotId={1}
              portfolioY={portfolioY}
              allPortfolios={allPortfolios}
              portfolioNames={portfolioNames}
              selectedName={slots[1]}
              onSelect={(name) => handleSelect(1, name)}
            />
          </td>
        </tr>
        <tr>
          <td className="quad-cell cell-border-right">
            <CompareQuadrant
              slotId={2}
              portfolioY={portfolioY}
              allPortfolios={allPortfolios}
              portfolioNames={portfolioNames}
              selectedName={slots[2]}
              onSelect={(name) => handleSelect(2, name)}
            />
          </td>
          <td className="quad-cell">
            <CompareQuadrant
              slotId={3}
              portfolioY={portfolioY}
              allPortfolios={allPortfolios}
              portfolioNames={portfolioNames}
              selectedName={slots[3]}
              onSelect={(name) => handleSelect(3, name)}
            />
          </td>
        </tr>
      </tbody>
    </table>

    </div>
  );
};


function CompareQuadrant({ slotId, portfolioY, allPortfolios, portfolioNames, selectedName, onSelect }) {
  
  let points = null;
  let stats = null;
  let bounds = null;
  let xTicks = [];
  let yTicks = [];
  let vectorLines = [];
  let isReady = false;

  if (selectedName) {
    // CRITICAL FIX: Match the saved slot name directly against the live allPortfolios (the Library bible)
    // to pull down the newest, fully calculated data engine instance.
    const freshMatchedPortfolio = allPortfolios.find(p => p.name === selectedName);

    if (freshMatchedPortfolio && freshMatchedPortfolio.instance && freshMatchedPortfolio.instance.isComputed) {
      const engineInstance = new FormatChart_Compare(freshMatchedPortfolio.instance, portfolioY);
      const dataPayload = engineInstance.chartData;
      
      if (dataPayload) {
        points = dataPayload.points;
        stats = dataPayload.stats;
        bounds = dataPayload.bounds;
        xTicks = dataPayload.xTicks;
        yTicks = dataPayload.yTicks;
        vectorLines = dataPayload.vectorLines;
        isReady = true;
      }
    }
  }

  const truncateText = (text, maxLength = 25) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
    
  const renderAxes = () => {
    const xDomain = isReady ? [bounds.minX, bounds.maxX] : [-10, 10];
    const yDomain = isReady ? [bounds.minY, bounds.maxY] : [-10, 10];
    const activeXTicks = isReady ? xTicks : [-10, -5, 0, 5, 10];
    const activeYTicks = isReady ? yTicks : [-10, -5, 0, 5, 10];

    return (
      <>
        <XAxis 
          type="number" 
          dataKey="x" 
          domain={xDomain} 
          ticks={activeXTicks}
          unit="%" 
          stroke="#444" 
          tick={{ fill: '#ffffff', fontSize: 10, fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          domain={yDomain} 
          ticks={activeYTicks}
          unit="%" 
          stroke="#444" 
          tick={{ fill: '#ffffff', fontSize: 10, fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        />
        <ZAxis type="number" range={[35, 35]} />
      </>
    );
  };

  const renderLine = () => {
    if (!isReady || !vectorLines || vectorLines.length === 0) return null;

    return (
      <Line
        data={vectorLines}
        type="linear"
        dataKey="y"
        stroke="white"
        strokeWidth={1}
        dot={false}
        activeDot={false}
      />
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0].payload.isExtreme) {
        const data = payload[0].payload; 

        return (
            <div style={{
                backgroundColor: '#ffffff',
                padding: '8px 12px',
                border: '1px solid #475569',
                borderRadius: '4px',            
                color: '#000000',
                fontSize: '11px',
                fontFamily: 'sans-serif',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0)',
                lineHeight: '1.4'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#000000' }}>
                    {data.label}
                </div>
                <div>
                    <span style={{ color: '#000000' }}>X return: </span>
                    <strong style={{ color: '#000000' }}>{data.rawX}%</strong>
                </div>
                <div>
                    <span style={{ color: '#000000' }}>Y return: </span>
                    <strong style={{ color: '#000000' }}>{data.rawY}%</strong>
                </div>
                <div>
                    <span style={{ color: '#000000' }}>Year: </span>
                    <strong style={{ color: '#000000' }}>{data.year}</strong>
                </div>
                <div>
                    <span style={{ color: '#000000' }}>Period: </span>
                    <strong style={{ color: '#000000' }}>{data.period}</strong>
                </div>
            </div>
        );
    }
    return null;
};

  const renderScatters = () => {
    const SimpleDot = (props) => {
      const { cx, cy, dotSize, dotFill, dotStroke } = props;
      
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={dotSize}
          fill={dotFill}
          stroke={dotStroke}
          strokeWidth={1} 
        />
      );
    };

   return (
      <>
        <Tooltip content={<CustomTooltip />} />
        {points?.neutral && <Scatter name="Neutral" data={points.neutral} dataKey="y" shape={SimpleDot} />}
        {points?.success && <Scatter name="Success" data={points.success} dataKey="y" shape={SimpleDot} />}
        {points?.failure && <Scatter name="Fail"    data={points.failure} dataKey="y" shape={SimpleDot} />}
      </>
    );
  };

  return (
    <div className="quad-stack-container">

      <div className="quad-control-strip">
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          
          <span className="label-bold">X axis:</span>

          <select 
              value={selectedName || ''} 
              onChange={(e) => onSelect(e.target.value || null)}
              className="quad-selector"
              title={selectedName || "Select Comparison"} /* Keeps full title text on hover */
            >
              <option value="">Select Comparison</option>
              
              {/* 1. Fix for the Unavailable string condition */}
              {selectedName && !portfolioNames.includes(selectedName) && (
                <option value={selectedName} title={selectedName}>
                  {truncateText(selectedName, 22)} (Unavailable)
                </option>
              )}
              
              {/* 2. Fix for the main library portfolio array list loops */}
              {portfolioNames.map((name, idx) => (
                <option key={idx} value={name} title={name}>
                  {truncateText(name, 25)}
                </option>
              ))}
          </select>

          <span className="label-bold" style={{ marginLeft: '20px' }}>Y axis:</span>
          
          <strong className="portfolio-name-label" 
                  title={portfolioY?.name || "Unknown"}
                  style={{ fontWeight: 'bold' }}
          >
            {portfolioY?.name || "Unknown"}
          </strong>

          {isReady && stats.startYear && stats.endYear && (
            <div className="badge-year" >
              {stats.startYear}–{stats.endYear}
            </div>
          )}

        </div>
      </div>

      <div className="quad-ledger-row">
        <div 
          className="metric-badge badge-success"
          title={isReady ? `${stats.successCount} (${stats.successPercent}%)   Y ≥ X` : '0 (0.0%)'}
        >
          {isReady ? `${stats.successCount} (${stats.successPercent}%)   Y ≥ X` : '0 (0.0%)'}
        </div>

        <div 
          className="metric-badge badge-failure"
          title={isReady ? `${stats.failureCount} (${stats.failurePercent}%)   Y < X` : '0 (0.0%)'}
        >
          {isReady ? `${stats.failureCount} (${stats.failurePercent}%)   Y < X` : '0 (0.0%)'}
        </div>

        <div 
          className="metric-badge badge-neutral"
          title={isReady ? `${stats.neutralCount} (${stats.neutralPercent}%)   < MHP` : '0 (< MHP)'}
        >
          {isReady ? `${stats.neutralCount} (${stats.neutralPercent}%)   < MHP` : '0 (< MHP)'}
        </div>
      </div>

      <div className="quad-canvas-wrapper" style={{ backgroundColor: 'black', borderRadius: '4px' }}>
        
        {!isReady && (
          <div className="canvas-placeholder-hint">
            {selectedName ? `Portfolio "${selectedName}" data is uncomputed or missing` : "Select a comparison portfolio X to populate chart"}
          </div>
        )}

        <ScatterChart width={530} height={330} margin={{ top: 15, right: 15, bottom: 15, left: -15}}>  
          <CartesianGrid stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" fill="black" />
          <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(255, 255, 255, 0.2)' }} 
          />
          {renderAxes()}
          {renderLine()}
          {isReady && renderScatters()}
        </ScatterChart>

      </div>
      
    </div>
  );
}