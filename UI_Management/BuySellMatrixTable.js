import React, { useState } from 'react';
import { calculateDataStats } from '../Utils/Math';
import { getStatColor } from '../Utils/getStatColor';
import '../Styles/RollingReturnMatrix/RollingMatrix.css';

export const BuySellMatrixTable = ({ thisPortfolio }) => {
  const rollingMatrix = thisPortfolio.RollingMatrix;

  const hoverTimer = React.useRef(null);

  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 }); 
  const [clickedRows, setClickedRows] = useState(new Set());
  const [clickedCols, setClickedCols] = useState(new Set());
  const [clickedDiagonals, setClickedDiagonals] = useState(new Set());

  if (!rollingMatrix || !rollingMatrix.isValid) return null;

  // --- TRANSLATION LAYER: CHRONOLOGICAL BOUNDS ---
  const headerRow = rollingMatrix.matrix[0] || [];
  const startColIdx = rollingMatrix.idxPeriod_1 + 1;
  const endColIdx = rollingMatrix.idxPeriod_2;
  
  const calendarYears = headerRow
    .slice(startColIdx, endColIdx)
    .map(cell => (cell && typeof cell === 'object' ? cell.d : cell));

  const computeStats = (rowDataArray) => {
    const threshold = thisPortfolio.threshold ?? 0.0; 

    const rawStats = calculateDataStats(rowDataArray, threshold, 'AVG', 0.04); 

    if (!rowDataArray || rowDataArray.length === 0) {
      return { AVG: "", HI: "", LO: "", SD: "", THRS: "" };
    }

    return {
      AVG:  (rawStats.average * 100).toFixed(1),
      HI:   (rawStats.hi * 100).toFixed(1),
      LO:   (rawStats.lo * 100).toFixed(1),
      SD:   (rawStats.stdDev * 100).toFixed(1),
      THRS: (100*rawStats.threshold).toFixed(1)       // must put decimal float to user percentage format
    };
  };

  // --- STRUCTURAL STRING MATCHERS ---
  const isHeaderType = (t) => t && t.includes("header-");
  const isLabelType  = (t) => t && t.includes("label-");
    
  const onCellClick = (r, c, type) => {
    if (isLabelType(type)) {
      const next = new Set(clickedRows);
      next.has(r) ? next.delete(r) : next.add(r);
      setClickedRows(next);
    } else if (isHeaderType(type)) {
      const next = new Set(clickedCols);
      next.has(c) ? next.delete(c) : next.add(c);
      setClickedCols(next);
    } else if (type === "matrix-data-cell" && r === 1) {
      const diag = c - r;
      const next = new Set(clickedDiagonals);
      next.has(diag) ? next.delete(diag) : next.add(diag);
      setClickedDiagonals(next);
    }
  };

  // --- SINGLE EXCLUSIVE TARGETING LAYER (TOOLTIP REFERENCE) ---
  let activeCellObj = null;
  if (
    hovered && 
    hovered.type === "matrix-data-cell" && 
    hovered.r > 0 && 
    hovered.r < rollingMatrix.idxColStats && 
    hovered.c < rollingMatrix.idxPeriod_2
  ) {
    const buyYear = calendarYears[hovered.r - 1];
    const sellYear = calendarYears[hovered.c - startColIdx];
    if (sellYear >= buyYear) {
      const targetPeriod = sellYear - buyYear + 1;
      activeCellObj = rollingMatrix.matrix[targetPeriod]?.[hovered.c] || null;
    }
  }

  const activeCellValue = activeCellObj && typeof activeCellObj === 'object' 
    ? activeCellObj.d 
    : (activeCellObj ?? "");

  return (
    <div style={{ position: 'relative' }}> 
      <table className="rm-table">
        <tbody onMouseLeave={() => setHovered(null)}>
          {rollingMatrix.matrix.map((row, rIdx) => {
            
            // --- 1. COLLECT TRUE HORIZONTAL ROW RETURNS ---
            let rowData = [];
            if (rIdx > 0 && rIdx < rollingMatrix.idxColStats) { 
              const buyYear = calendarYears[rIdx - 1];
              calendarYears.forEach((sellYear, idx) => {
                const cIdx = startColIdx + idx;
                if (sellYear >= buyYear) {
                  const targetPeriod = sellYear - buyYear + 1;
                  const targetCell = rollingMatrix.matrix[targetPeriod]?.[cIdx];
                  const val = targetCell && typeof targetCell === 'object' ? targetCell.v : targetCell;
                  if (val !== null && val !== undefined && val !== "") {
                    rowData.push(Number(val));
                  }
                }
              });
            }

            const rowStats = (rIdx > 0 && rIdx < rollingMatrix.idxColStats) ? computeStats(rowData) : null;

            // --- ROW BOUNDARIES ---
            const firstDataIdx = row.findIndex((cell, cIdx) => {
              const val = cell && typeof cell === 'object' ? cell.d : cell;
              const isDataCol = cIdx > rollingMatrix.idxPeriod_1 && cIdx < rollingMatrix.idxPeriod_2;
              return isDataCol && val !== null && val !== undefined && val !== "";
            });

            const lastDataIdx = row.findLastIndex((cell, cIdx) => {
              const val = cell && typeof cell === 'object' ? cell.d : cell;
              return val !== null && val !== undefined && val !== "";
            });

            const isStatFloorStart = rIdx === rollingMatrix.idxColStats;
            const isInsideStatFloorZone = rIdx >= rollingMatrix.idxColStats;

            return (
              <tr key={rIdx}>
                {row.map((originalCell, cIdx) => {
                  let cell = originalCell;
                  let type = "matrix-data-cell";

                  if (rIdx === 0) type = "header-cell";
                  else if (cIdx === rollingMatrix.idxPeriod_1 || cIdx === rollingMatrix.idxPeriod_2) type = "label-cell";

                  const isDataColumn = cIdx > rollingMatrix.idxPeriod_1 && cIdx < rollingMatrix.idxPeriod_2;
                  const isSummaryColumn = cIdx > rollingMatrix.idxPeriod_2;

                  if (rIdx === 0 && isDataColumn) {
                    type = "header-cell axis-sell-cell";
                  } else if (cIdx === rollingMatrix.idxPeriod_1 && rIdx > 0) {
                    type = "label-cell axis-buy-cell";
                  }

                  // --- 2. DATA LOOKUP (TRANSPOSED VS BOTTOM COL STATS) ---
                  if (type === "matrix-data-cell" && isDataColumn) {
                    if (isInsideStatFloorZone) {
                      cell = rollingMatrix.matrix[rIdx]?.[cIdx] || null;
                    } else {
                      const buyYear = calendarYears[rIdx - 1];
                      const sellYear = calendarYears[cIdx - startColIdx];
                      
                      if (sellYear >= buyYear) {
                        const targetPeriod = sellYear - buyYear + 1;
                        cell = rollingMatrix.matrix[targetPeriod]?.[cIdx] || null;
                      } else {
                        cell = null; 
                      }
                    }
                  }

                  // --- 3. SUMMARY COLUMN ROUTING VIA UTIL RESULT ---
                  let summaryCellColor = undefined;

                  if (type === "matrix-data-cell" && isSummaryColumn && rIdx > 0 && rowStats) {
                    const statHeader = headerRow[cIdx];
                    const statLabel = statHeader && typeof statHeader === 'object' ? statHeader.d : statHeader;

                    if (rowStats[statLabel] !== undefined) {
                      cell = rowStats[statLabel];
                      summaryCellColor = getStatColor(
                        statLabel, 
                        cell, 
                        rowStats.HI, 
                        rowStats.LO, 
                        rowStats.AVG
                      );
                    }
                  }

                  let cellValue = cell && typeof cell === 'object' ? cell.d : (cell ?? "");
                  if (!cell || cellValue === "") {
                    if (type === "matrix-data-cell" && !isSummaryColumn) type = "empty-cell";
                  }

                  if (rIdx === 0) {
                    if (cIdx === 0) {
                      cellValue = "BuySell";
                    } else if (cIdx === rollingMatrix.idxPeriod_2) {
                      cellValue = "Buy";
                    }
                  }

                  if (isLabelType(type) && rIdx > 0) {
                    if (isInsideStatFloorZone) {
                      const originalLabelCell = rollingMatrix.matrix[rIdx]?.[cIdx];
                      cellValue = originalLabelCell && typeof originalLabelCell === 'object' ? originalLabelCell.d : (originalLabelCell ?? "");
                    } else {
                      const yearOffset = rIdx - 1;
                      if (yearOffset < calendarYears.length) {
                        cellValue = calendarYears[yearOffset];
                      }
                    }
                  }

                  const currentDiag = cIdx - rIdx;
                  
                  // --- 4. IDENTIFY HITS ---
                  const isRowHit = clickedRows.has(rIdx) || (isLabelType(hovered?.type) && hovered.r === rIdx);
                  const isColHit = clickedCols.has(cIdx) || (isHeaderType(hovered?.type) && hovered.c === cIdx);

                  const isDiagHit = (clickedDiagonals.has(currentDiag) || 
                                    (hovered?.r === 1 && hovered?.type === "matrix-data-cell" && (hovered.c - hovered.r) === currentDiag))
                                    && isDataColumn && rIdx > 0 && !isInsideStatFloorZone; 
                  const isHoveredTarget = hovered?.r === rIdx && hovered?.c === cIdx && (type === "matrix-data-cell" || type === "empty-cell");

                  // --- 5. THE HIGHLIGHT WINNER'S CIRCLE ---
                  let finalHighlightClass = "";
                  
                  if (type === "matrix-data-cell" || type === "empty-cell") {
                    const hitCount = [isRowHit, isColHit, isDiagHit].filter(Boolean).length;

                    if (isHoveredTarget || isDiagHit || hitCount > 1) {
                      finalHighlightClass = "is-halo";
                    } 
                    else if (isColHit) {
                      if (rIdx === 1) {
                        finalHighlightClass = "is-highlight-col-top";
                      } else {
                        // 🎯 Continuous tracking boundary check anchor
                        const isLastCellBeforeStats = (rIdx + 1) === rollingMatrix.idxColStats;
                        finalHighlightClass = isLastCellBeforeStats ? "is-highlight-col-bottom" : "is-highlight-col-interior";
                      }
                    } 
                    else if (isRowHit && type === "matrix-data-cell") {
                      if (cIdx === firstDataIdx) finalHighlightClass = "is-highlight-row-left";
                      else if (cIdx === lastDataIdx) finalHighlightClass = "is-highlight-row-right";
                      else finalHighlightClass = "is-highlight-row-interior";
                    }
                  }

                  const isTriggerActive = (isHeaderType(type) && isColHit) || (isLabelType(type) && isRowHit);
                  const showTriggerBold = isTriggerActive || (hovered?.r === rIdx && hovered?.c === cIdx);

                  const floorClass = isStatFloorStart ? "stat-floor-delimiter" : "";

                  return (
                    <td 
                      key={cIdx} 
                      onMouseEnter={() => setHovered({ r: rIdx, c: cIdx, type })}
                      onMouseMove={(e) => {
                        setTooltipPos({
                          x: e.clientX + 15,  // 170
                          y: e.clientY + 15   // 170
                        });
                      }}
                      onMouseLeave={() => {
                        if (hoverTimer.current) clearTimeout(hoverTimer.current);
                        setHovered(null);
                      }}
                      onClick={() => onCellClick(rIdx, cIdx, type)}
                      className={`${type} ${finalHighlightClass} ${showTriggerBold ? 'is-bold' : ''} ${isTriggerActive ? 'axis-active' : ''} ${floorClass}`}
                      style={{ 
                           backgroundColor: type === "matrix-data-cell" 
                             ? (isDataColumn ? (cell?.c || 'transparent') : (isSummaryColumn ? summaryCellColor : undefined)) 
                             : undefined 
                       }}  
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* --- FLOATING VIEWPORT TOOLTIP CONTAINER --- */}
      {activeCellObj && typeof activeCellObj === 'object' && (
        <div 
          className="chart-tooltip-summary"
          style={{ 
            position: 'fixed', 
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            backgroundColor: activeCellObj.c || '#333', 
            color: 'black',
            pointerEvents: 'none', 
            zIndex: 1000
          }}
        >
          <strong>Return:</strong> {activeCellValue}%<br />
          <strong>Jan Buy:</strong> {activeCellObj.year - activeCellObj.period + 1}<br />
          <strong>Dec Sell:</strong> {activeCellObj.year}<br />
          <strong>Hold Time:</strong> {activeCellObj.period} years
        </div>
      )}
    </div>
  );
};