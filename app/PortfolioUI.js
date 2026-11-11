'use client';

import React, { useState, memo } from 'react';
import { PortfolioModal_Define } from '../PortfolioManagement/PortfolioModal_Define';
import { RollingMatrixTable } from '../UI_Management/RollingMatrixTable';
import { BuySellMatrixTable } from '../UI_Management/BuySellMatrixTable';
import { PlotUI } from '../Manage_Chart/PlotUI';
import { ChartUI_Compare } from '../Manage_Chart/ChartUI_Compare';
import { DistributeUI } from '../Manage_Chart/DistributeUI';
import { AnalyzeUI } from '../Manage_Chart/AnalyzeUI';
import { Hint } from '../Help/Hint';
import { HelpTrigger } from '../Help/HelpTrigger';
import { useHelp } from '../Help/HelpContext';
import { RetrieveReturns } from '../src/data/RetrieveReturns';
import { ProgressBar, ProgressCountdown } from '../Utils/ProgressBar';

// CSS Imports
import '../Styles/Buttons/PrimaryActions.css'; 
import '../Styles/Containers/Portfolio.css';
import '../Styles/Buttons/UtilityButtons.css';
import '../Styles/RollingReturnMatrix/RollingMatrix.css';
import '../Styles/Style_RollingMatrix.css';
import '../Styles/Style_PortfolioUI.css';

function PortfolioUI({ 
  name, 
  color, 
  portfolioLogic, 
  allPortfolios, 
  symbolList, 
  repository, 
  updateRepository, 
  handleComputeCleanup,
  setPortfolios
}) {
  const { openHelp } = useHelp();
  const [assetCount, setAssetCount]     = useState(portfolioLogic?.assets?.length || 0);
  const [isDefining, setIsDefining]     = useState(false);
  const [refreshTick, setRefreshTick]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [views, setViews] = useState({
    rrTable: false,
    plot: false,
    distribution: false,
    compare: false,
    buysell: false,
    analyze: false
  });



  const cleanUpPortfolios = (targetName) => {
    if (allPortfolios && allPortfolios.length > 0) {
      allPortfolios.forEach(p => {
        if (p.instance && typeof p.instance.cleanUpPortfolios === 'function') {
          p.instance.cleanUpPortfolios(targetName);
        }
      });
    }
  };

  const countdown = ProgressCountdown(isProcessing);





  const handleAccept = (assetData, areWeightsEqual) => {
    portfolioLogic.SetAssets(assetData, areWeightsEqual); 
    setAssetCount(assetData.length);
    setIsDefining(false); 
    handleCompute();
  };

  const handleCompute = async () => {
    if (!portfolioLogic) return;

    setIsProcessing(true); // <--- Triggers the full-screen progress bar and countdown

    try {
      //////////// simple time out testing
      //await new Promise(resolve => setTimeout(resolve, 5000));

      if (typeof handleComputeCleanup === 'function') {
        handleComputeCleanup(portfolioLogic.name);
      }

      // Reset active views
      setViews({ rrTable: false, plot: false, distribution: false, compare: false, buysell: false, analyze: false });

      // Extract tickers and retrieve data
      const tickers = portfolioLogic.assetsPercent
        .map(a => a.ticker)
        .filter(t => t && t.trim() !== "");

      const rawDbMap = await RetrieveReturns(tickers);
      const calcResult = portfolioLogic.buildRM_AllData(rawDbMap);

      if (!calcResult || !calcResult.success) {
        if (typeof openHelp === 'function' && calcResult?.error?.code) {
          openHelp(calcResult.error.code);
        }
        return; // The finally block will still catch and clear the progress bar safely
      }

      // Sync state for ANY portfolio where the instance's isStale flag differs from React state
      setPortfolios(currentPortfolios => {
        return currentPortfolios.map(p => {
          const instanceStale = p.instance?.isStale;

          // If the instance state differs from the wrapper state, update & trigger re-render
          if (instanceStale !== undefined && p.isStale !== instanceStale) {
            return {
              ...p,
              isStale: instanceStale
            };
          }

          return p; // Unchanged reference
        });
      });

      setViews({ rrTable: true, plot: false, distribution: false, compare: false, buysell: false, analyze: false });
    } finally {
      setIsProcessing(false); // <--- Guarantees the overlay clears out when done
    }
  };

  const toggleView = (view) => {
    setViews(prev => ({ ...prev, [view]: !prev[view] }));
  };

  // Render Views (Short-circuited to avoid Virtual DOM evaluation when hidden)
  const renderBuySellMatrix = () => {
    if (!views.buysell) return null;
    return (
      <div className="view-placeholder is-visible">
        <div className="matrix-content-layout">
          <div className="tombstone-header">
            <div className="header-region-title-2">
              Buy/Sell Matrix <HelpTrigger keyName="buysell-matrix" size="lg" />
            </div>
          </div>
          <BuySellMatrixTable thisPortfolio={portfolioLogic} />   
        </div>
      </div>
    );
  };

  const renderRollingMatrix = () => {
    if (!views.rrTable) return null;
    return (
      <div className="view-placeholder is-visible">
        <div className="matrix-content-layout">
          <div className="tombstone-header">
            <div className="header-region-title-2">
              {"Rolling Matrix\u2122"}
              <HelpTrigger keyName="rolling-matrix" size="lg" />
            </div>
          </div>
          <RollingMatrixTable rollingMatrix={portfolioLogic.RollingMatrix} />
        </div>
      </div>
    );
  };

  const renderPlotView = () => {
    if (!views.plot || !portfolioLogic?.isComputed) return null;
    return (
      <div className="view-placeholder is-visible">
        <PlotUI 
          portfolio={portfolioLogic}
          buttons={["Period", "Year", "Rolling", "Age"]} 
        />
      </div>
    );
  };

  const renderDistributionView = () => {
    if (!views.distribution || !portfolioLogic?.isComputed) return null;
    return (
      <div className="view-placeholder is-visible">
        <DistributeUI 
          portfolio={portfolioLogic}
          allPortfolios={allPortfolios}
        />
      </div>
    );
  };

  const renderCompareView = () => {
    if (!views.compare || !portfolioLogic?.isComputed) return null;
    return (
      <div className="view-placeholder is-visible">
        <ChartUI_Compare 
          Type="compare" 
          portfolio={portfolioLogic}
          allPortfolios={allPortfolios}
        />
      </div>
    );
  };

  const renderAnalyzeView = () => {
    if (!views.analyze || !portfolioLogic?.isComputed) return null;
    return (
      <div className="view-placeholder is-visible">
        <AnalyzeUI 
          buttons={["Hi/Lo", "Avg/Median", "Std Dev", "Sharpe", "Sortino", "SharpeFZ", "SortinoFZ"]} 
          portfolio={portfolioLogic}
        />
      </div>
    );
  };

/*******************************************************
  <div className="rbl-header">
        <Hint text={name} position="right">
          <div className="fz-rbl-id">
            <strong className="portfolio-name-label">
              {name}
            </strong>
          </div>
        </Hint>
**************************************************/

  return (
    <div style={{ borderRadius: '4px', marginBottom: '1px', padding: '1px' }}>

       <ProgressBar isProcessing={isProcessing} countdown={countdown} />
      
      {/* HEADER PANEL */}
      <div className="rbl-header">
        <div className="fz-rbl-id">
          <strong className="portfolio-name-label" title={name}>
            {name}
          </strong>
        </div>

        <div className="fz-rbl-action">
          <Hint text={"Initial definition or edit parameters of this portfolio"} position="bottom">
            <button 
              onClick={() => setIsDefining(!isDefining)} 
              className="fz-btn-compute" 
            >
              DEFINE Portfolio
            </button>
          </Hint>
          <HelpTrigger keyName="portfolio" size="sm" /> 
        </div>

        {portfolioLogic?.scoreRM_Total?.isPopulated > 0 && (
          <>
            <div className="fz-rbl-analysis">
              <Hint text={"Display the Rolling Matrix\u2122"} position="bottom">
                <button onClick={() => toggleView('rrTable')} className={`btn-push-utility ${views.rrTable ? 'active' : ''}`}>Rolling</button>
              </Hint>

              <Hint text={"Display the Buy/Sell Matrix"} position="bottom">
                <button onClick={() => toggleView('buysell')} className={`btn-push-utility ${views.buysell ? 'active' : ''}`}>Buy/Sell</button>
              </Hint>

              <Hint text={"Display Plots of Rolling Matrix\u2122"} position="bottom">
                <button onClick={() => toggleView('plot')} className={`btn-push-utility ${views.plot ? 'active' : ''}`}>Plot</button>
              </Hint>

              <Hint text={"Compare the Rolling Matrix\u2122 Distribution and Cumulation of multiple portfolios"} position="bottom">
                <button onClick={() => toggleView('distribution')} className={`btn-push-utility ${views.distribution ? 'active' : ''}`}>Distribute</button>
              </Hint>  

              <Hint text={"Compare Rolling Matrix\u2122 CAGR of multiple portfolios"} position="bottom">
                <button onClick={() => toggleView('compare')} className={`btn-push-utility ${views.compare ? 'active' : ''}`}>Compare</button>
              </Hint>

              <Hint text={"Analyze Rolling Matrix\u2122 CAGR"} position="bottom">
                <button onClick={() => toggleView('analyze')} className={`btn-push-utility ${views.analyze ? 'active' : ''}`}>Analyze</button>
              </Hint>
            </div>

            <div className="rbl-score">
              {portfolioLogic?.scoreRM_Total?.isPopulated && 
                portfolioLogic.scoreRM_Total.displayCache.map((metric, idx) => (
                  <Hint text={metric.hint || metric.label} position="left" key={idx}>
                    <div className="score-column">
                      <div className="score-header">{metric.label}</div>
                      <div className="score-value" style={{ backgroundColor: metric.color }}>
                        {metric.text}
                      </div>
                    </div>
                  </Hint>
                ))
              }    
            </div>
          </>
        )}        
      </div>

      {/* WORKING TOOLS FOOTPRINT */}
      {isDefining && (
        <PortfolioModal_Define 
          isOpen={isDefining}
          onClose={() => setIsDefining(false)} 
          currentPortfolio={portfolioLogic} 
          allPortfolios={allPortfolios}
          symbolList={symbolList}
          repository={repository}
          onAccept={handleAccept}
        />
      )}

      {/* WORKING PANELS */}
      {renderRollingMatrix()}
      {renderBuySellMatrix()}
      {renderPlotView()}
      {renderDistributionView()}
      {renderCompareView()}
      {renderAnalyzeView()}

    </div>
  );
}

/**
 * Pure delegation guard: lets portfolioLogic.isEqual() 
 * make the sole determination on re-rendering.
 */
const arePropsEqual = (prevProps, nextProps) => {

  return false;



  const prevLogic = prevProps.portfolioLogic;
  const nextLogic = nextProps.portfolioLogic;

  // Handles null/undefined checks without using reference equality.
  // If one is defined and the other isn't, they are not equal -> re-render.
  if (!prevLogic || !nextLogic) {
    return !prevLogic && !nextLogic;
  }

  // Delegate directly to your Portfolio class's isEqual()
  if (typeof prevLogic.isEqual === 'function') {
    return prevLogic.isEqual(nextLogic);
  }

  // Fallback if isEqual isn't implemented (assumes changed to force render)
  return false;
};

//export default memo(PortfolioUI, arePropsEqual);
export default PortfolioUI;