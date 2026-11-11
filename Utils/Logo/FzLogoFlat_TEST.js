import React from 'react';
import './FzLogo.css';

// Ground-truth coordinates traced directly from Paint
const RAW_COORDINATES = {
  F: [
    [74, 42], [212, 42], [184, 87], [121, 87], 
    [121, 158], [228, 159], [200, 202], [121, 202], 
    [121, 337], [74, 337]
  ],
  Z: [
    [234, 42], [354, 42], [354, 82], [215, 293], 
    [339, 293], [339, 337], [158, 337], [158, 293], 
    [295, 87], [206, 87]
  ]
};

// Raw Paint bounds (Width: 280, Height: 295)
const ORIGINAL_BOUNDS = {
  minX: 74,
  minY: 42,
  origWidth: 280,
  origHeight: 295
};

function generateSvgPath(points, scaleX, scaleY) {
  const pathCommands = points.map(([x, y], index) => {
    const normX = Math.round((x - ORIGINAL_BOUNDS.minX) * scaleX);
    const normY = Math.round((y - ORIGINAL_BOUNDS.minY) * scaleY);
    const prefix = index === 0 ? 'M' : 'L';
    return `${prefix} ${normX} ${normY}`;
  });

  return `${pathCommands.join(' ')} Z`;
}

export function FzLogoFlat_TEST({ 
  width = 44, 
  height = 44, 
  fillColor = '#fffde7', 
  strokeColor = '#ff7300',
  strokeWidth = 8, // Adjust stroke thickness here...orginally 12
  className = '' 
}) {
  const targetWidth = 280;
  const targetHeight = 280;

  const scaleX = targetWidth / ORIGINAL_BOUNDS.origWidth;   
  const scaleY = targetHeight / ORIGINAL_BOUNDS.origHeight; 

  const pathF = generateSvgPath(RAW_COORDINATES.F, scaleX, scaleY);
  const pathZ = generateSvgPath(RAW_COORDINATES.Z, scaleX, scaleY);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${targetWidth} ${targetHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`fz-logo-svg ${className}`}
      aria-label="Financial Zone Flat Logo with Orange Border"
    >
    

      {/* --- STEP 2: DRAW FILLED LETTERS (ON TOP) --- */}
      <g fill={fillColor}>
        <path d={pathF} />
        <path d={pathZ} />
      </g>

        {/* --- STEP 1: DRAW ORANGE BORDERS (UNDERNEATH) --- */}
      <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="miter">
        <path d={pathF} />
        <path d={pathZ} />
      </g>


    </svg>
  );
}



export default FzLogoFlat_TEST;