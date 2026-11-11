

"use client";

import React from 'react';
import { useHelp } from './HelpContext';

import '../Styles/Global/Help.css';

export function HelpTrigger({ keyName, size = 'sm', style = {} }) {
  const { openHelp } = useHelp();

  const handleClick = (e) => {
    e.stopPropagation(); // Prevents triggering parent clicks (like cards or accordion headers)
    openHelp(keyName);
  };

  return (
    <button
      type=       "button"
      className=  {`help-trigger help-trigger-${size}`}
      onClick=    {handleClick}
      title=      "Open Help"
      aria-label= {`Open help for ${keyName}`}
      style=      {style}
    >
      ?
    </button>
  );
}