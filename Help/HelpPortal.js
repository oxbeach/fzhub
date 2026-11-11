

"use client";

import React from 'react';
import { useHelp } from './HelpContext';
import { HelpCard } from './HelpCard';
           
export function xxxHelpPortal() {
  const { activeCards } = useHelp();

  return (
    <div className="help-portal-root">
      {activeCards.map((card) => (
        <HelpCard key={card.id} card={card} />
      ))}
    </div>
  );
}



export function HelpPortal() {
  const { activeCards } = useHelp();

  // Check if a fixed card (e.g. Terms of Service) is currently open
  const hasFixedCard = activeCards.some((card) => card.isFixed);

  return (
    <div className="help-portal-root">
      {hasFixedCard && <div className="help-backdrop" />}

      {activeCards.map((card) => (
        <HelpCard key={card.id} card={card} />
      ))}
    </div>
  );
}