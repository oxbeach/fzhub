import React, { useState } from 'react';
import '../Styles/RollingReturnMatrix/RollingMatrix.css';

export const RollingMatrixTable = ({ rollingMatrix }) => {

  const hoverTimer = React.useRef(null);

  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 }); // 🎯 Track real-time mouse position
  const [clickedRows, setClickedRows] = useState(new Set());
  const [clickedCols, setClickedCols] = useState(new Set());
  const [clickedDiagonals, setClickedDiagonals] = useState(new Set());

  if (!rollingMatrix || !rollingMatrix.isValid) return null;

  const onCellClick = (r, c, type) => {
    if (type === "label-cell") {
      const next = new Set(clickedRows);
      next.has(r) ? next.delete(r) : next.add(r);
      setClickedRows(next);
    } else if (type === "header-cell") {
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

  // 🎯 FIXED TRACKER: Matches the true data triangle boundaries identically
  const activeCellObj = hovered && 
                        hovered.type === "matrix-data-cell" && 
                        hovered.r > 0 &&
                        hovered.r < rollingMatrix.idxColStats && 
                        hovered.c < rollingMatrix.idxPeriod_2
    ? rollingMatrix.matrix[hovered.r]?.[hovered.c]
    : null;

  const activeCellValue = activeCellObj && typeof activeCellObj === 'object' 
    ? activeCellObj.d 
    : (activeCellObj ?? "");

  return (
    <div style={{ position: 'relative' }}> {/* Boundary container for coordinate safety */}
      <table className="rm-table">
        <tbody onMouseLeave={() => setHovered(null)}>
          {rollingMatrix.matrix.map((row, rIdx) => {
            
            // --- 1. ROW BOUNDARIES ---
            const firstDataIdx = row.findIndex((cell, cIdx) => {
              const val = cell && typeof cell === 'object' ? cell.d : cell;
              const isDataCol = cIdx > rollingMatrix.idxPeriod_1 && cIdx < rollingMatrix.idxPeriod_2;
              return isDataCol && val !== null && val !== undefined && val !== "";
            });

            const lastDataIdx = row.findLastIndex((cell, cIdx) => {
              const val = cell && typeof cell === 'object' ? cell.d : cell;
              return val !== null && val !== undefined && val !== "";
            });

            // Check if this row is the start of the bottom statistical summary block (AVG row)
            const isStatFloorStart = rIdx === rollingMatrix.idxColStats;

            return (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => {
                  const cellValue = cell && typeof cell === 'object' ? cell.d : (cell ?? "");
                  
                  let type = "matrix-data-cell";
                  if (rIdx === 0) type = "header-cell";
                  else if (cIdx === rollingMatrix.idxPeriod_1 || cIdx === rollingMatrix.idxPeriod_2) type = "label-cell";
                  else if (!cell || cellValue === "") type = "empty-cell";

                  const currentDiag = cIdx - rIdx;
                  const isDataColumn = cIdx > rollingMatrix.idxPeriod_1 && cIdx < rollingMatrix.idxPeriod_2;
                  
                  // --- 2. IDENTIFY HITS ---
                  const isRowHit = clickedRows.has(rIdx) || (hovered?.type === "label-cell" && hovered.r === rIdx);
                  const isColHit = clickedCols.has(cIdx) || (hovered?.type === "header-cell" && hovered.c === cIdx);
                  const isDiagHit = (clickedDiagonals.has(currentDiag) || 
                                    (hovered?.r === 1 && hovered?.type === "matrix-data-cell" && (hovered.c - hovered.r) === currentDiag))
                                    && isDataColumn && rIdx > 0;
                  const isHoveredTarget = hovered?.r === rIdx && hovered?.c === cIdx && (type === "matrix-data-cell" || type === "empty-cell");

                  // --- 3. THE WINNER'S CIRCLE ---
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
                        // 🎯 SOLID SPINE CAP: Terminate exactly before hitting the statistical summary container floor
                        const isLastCellBeforeStats = (rIdx + 1) === rollingMatrix.idxColStats;
                        finalHighlightClass = isLastCellBeforeStats ? "is-highlight-col-bottom" : "is-highlight-col-interior";
                      }
                    } 
                    else if (isRowHit && type === "matrix-data-cell") {
                      // Confine horizontal row highlighting strictly to true metrics to prevent bleeding leftward
                      if (cIdx === firstDataIdx) finalHighlightClass = "is-highlight-row-left";
                      else if (cIdx === lastDataIdx) finalHighlightClass = "is-highlight-row-right";
                      else finalHighlightClass = "is-highlight-row-interior";
                    }
                  }

                  const isTriggerActive = (type === "header-cell" && isColHit) || (type === "label-cell" && isRowHit);
                  const showTriggerBold = isTriggerActive || (hovered?.r === rIdx && hovered?.c === cIdx);

                  const floorClass = isStatFloorStart ? "stat-floor-delimiter" : "";

                  return (
                    <td 
                      key={cIdx} 
                      onMouseEnter={() => setHovered({ r: rIdx, c: cIdx, type })}
                      onMouseMove={(e) => {
                        setTooltipPos({
                          x: e.clientX + 15, //170
                          y: e.clientY + 15  //170
                        });
                      }}
                      onMouseLeave={() => {
                        if (hoverTimer.current) clearTimeout(hoverTimer.current);
                        setHovered(null);
                      }}
                      onClick={() => onCellClick(rIdx, cIdx, type)}
                      className={`${type} ${finalHighlightClass} ${showTriggerBold ? 'is-bold' : ''} ${isTriggerActive ? 'axis-active' : ''} ${floorClass}`}
                      style={{ backgroundColor: type === "matrix-data-cell" ? (cell?.c || 'transparent') : undefined }}
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

      {/* 🎯 SINGLE CENTRALIZED TOOLTIP COMPONENT */}
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