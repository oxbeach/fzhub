"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const HelpContext = createContext(null);

export function HelpProvider({ children, initialTopics = {} }) {
  const [activeCards, setActiveCards] = useState([]);
  
  // Ref tracks initialTopics passed down from Home.js
  const topicsRef = useRef(initialTopics);

  useEffect(() => {
    topicsRef.current = initialTopics;
  }, [initialTopics]);

  const openHelp = useCallback((key, showGlossary = true, fixedPosition = false, errorCard = false) => {
      setActiveCards(prevCards => {
        const highestZ = prevCards.length > 0 
          ? Math.max(...prevCards.map(c => c.zIndex)) 
          : 10000;
        const nextZ = highestZ + 1;

        const CARD_WIDTH = 350; 
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

        // Read directly from topicsRef
        const topicData = topicsRef.current[key] || {
          title: key,
          html: `<p>Help content for <b>"${key}"</b> is currently unavailable.</p> 
          <p>Please report this issue to FZhub using the contact button on the home page.</p>`,
          width: CARD_WIDTH
        };

        const isError = errorCard || (typeof key === 'string' && key.toUpperCase().startsWith('ERR_'));

        const actualWidth = topicData.width || CARD_WIDTH;

        let posX;
        let posY;

        // --- FIXED / CENTERED POSITIONING BRANCH ---
        if (fixedPosition) {
          // Center horizontally in viewport, pin near top (e.g., 60px)
          posX = Math.max(20, Math.round((screenWidth - actualWidth) / 2));
          posY = 60; 
        } else {
          // --- EXISTING CASCADE LOGIC ---
          const BASE_TOP = 60;
          const OFFSET_X = 20;
          const OFFSET_Y = 42;

          const puntX = 100 + ((prevCards.length * 20) % 100);
          const puntY = 100 + ((prevCards.length * 20) % 100);

          const topCard = prevCards.length > 0
            ? prevCards.reduce((top, c) => (c.zIndex > top.zIndex ? c : top), prevCards[0])
            : null;

          if (topCard) {
            posX = topCard.x + OFFSET_X;
            posY = topCard.y + OFFSET_Y;
          } else {
            posX = Math.round((screenWidth - actualWidth) / 2);
            posY = BASE_TOP;
          }

          const maxAllowedX = screenWidth - 200;
          const maxAllowedY = screenHeight - 50;

          if (posX > maxAllowedX || posY > maxAllowedY) {
            posX = puntX;
            posY = puntY;
          }
        }

        const existing = prevCards.find(card => card.key === key);
        if (existing) {
          return prevCards.map(c => 
            c.key === key ? { ...c, x: posX, y: posY, zIndex: nextZ, showGlossary, isFixed: !!fixedPosition } : c
          );
        }

        const newCard = {
          id: `help-${key}-${Date.now()}`,
          key,
          title:      topicData.title,
          htmlContent: topicData.html || topicData.body,
          width:      actualWidth,
          x:          posX,
          y:          posY,
          zIndex:     nextZ,
          showGlossary,
          errorCard:  isError,
          isFixed:    !!fixedPosition
        };

        return [...prevCards, newCard];
      });
  }, []);

  const bringToFront = useCallback((id) => {
    setActiveCards(prevCards => {
      const highestZ = prevCards.length > 0 
        ? Math.max(...prevCards.map(c => c.zIndex)) 
        : 10000;
      const nextZ = highestZ + 1;

      return prevCards.map(card => 
        card.id === id ? { ...card, zIndex: nextZ } : card
      );
    });
  }, []);

  const updatePosition = useCallback((id, x, y) => {
    setActiveCards(cards =>
      cards.map(card => card.id === id ? { ...card, x, y } : card)
    );
  }, []);

  const closeHelp = useCallback((id) => {
    setActiveCards(cards => cards.filter(card => card.id !== id));
  }, []);

  const resetHelp = useCallback(() => {
    setActiveCards([]);
  }, []);

  // --- NEW UTILITY FUNCTION ---
  // Checks if any active card key strictly starts with the given prefix
  const hasCardStartingWith = useCallback((prefix) => {
    return activeCards.some(card => typeof card.key === 'string' && card.key.startsWith(prefix));
  }, [activeCards]);

  return (
    <HelpContext.Provider value={{ 
      activeCards, 
      openHelp, 
      closeHelp, 
      bringToFront, 
      updatePosition, 
      resetHelp, 
      hasCardStartingWith, 
      helpTopics: topicsRef.current 
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};