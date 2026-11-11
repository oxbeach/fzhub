import React from 'react';
import './FzLogo.css';

export function FzLogo3d({ 
  width = 44, 
  height = 44, 
  faceColor = '#FDFBF7', 
  bevelColor = '#D4CEBC', 
  className = '' 
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 420 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`fz-logo-svg ${className}`}
      aria-label="Financial Zone 3D Logo"
    >
      {/* --- BEVEL / SHADOW LAYER --- */}
      <g fill={bevelColor}>
        {/* F Bevels */}
        <polygon points="74,42 88,56 88,323 74,337" />
        <polygon points="74,337 200,337 186,323 74,323" opacity="0.7" />
        <polygon points="121,158 228,159 214,173 121,173" />
        <polygon points="121,202 200,202 186,216 121,216" opacity="0.7" />
        
        {/* Z Bevels */}
        <polygon points="234,42 354,42 340,56 248,56" />
        <polygon points="339,293 339,337 325,323 325,293" />
        <polygon points="158,337 339,337 325,323 172,323" opacity="0.7" />
      </g>

      {/* --- MAIN FACE LAYER --- */}
      {/* Letter F */}
      <path
        fill={faceColor}
        d="M 74 42 L 212 42 L 184 87 L 121 87 L 121 158 L 228 159 L 200 202 L 121 202 L 121 337 L 74 337 Z"
      />
      
      {/* Letter Z */}
      <path
        fill={faceColor}
        d="M 234 42 L 354 42 L 354 82 L 215 293 L 339 293 L 339 337 L 158 337 L 158 293 L 295 87 L 206 87 Z"
      />
    </svg>
  );
}

export default FzLogo3d;