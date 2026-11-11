"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useHelp } from './HelpContext';
import '../Styles/Global/Help.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Update this list with active letters in your glossary as you add terms
const ACTIVE_LETTERS = new Set(['A', 'B', 'C', 'D', 'F', 'H', 'L', 'M', 'P', 'R', 'S', 'T', 'W']);

export function HelpCard({ card }) {
  const { closeHelp, bringToFront, updatePosition, openHelp } = useHelp();
  const [position, setPosition] = useState({ x: card.x, y: card.y });
  const [selectedLetter, setSelectedLetter] = useState(null);

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: card.x, y: card.y });

  useEffect(() => {
    setPosition({ x: card.x, y: card.y });
  }, [card.x, card.y]);

  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  const handleHeaderMouseDown = (e) => {
    e.stopPropagation();
    bringToFront(card.id);

    // Lock dragging if card is marked as fixed
    if (card.isFixed) return;

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleBodyMouseDown = (e) => {
    e.stopPropagation();
    const btn = e.target.closest('[data-help-key]');
    if (btn) {
      const key = btn.getAttribute('data-help-key');
      if (key) openHelp(key);
    } else {
      bringToFront(card.id);
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      // Guard: Exit if drag hasn't been initiated or if card is fixed
      if (!isDraggingRef.current || card.isFixed) return;

      const MIN_VISIBLE = 200;       // Minimum pixels of title bar kept on screen horizontally
      const TITLE_BAR_HEIGHT = 50;  // Height of title bar kept on screen vertically

      // Title-bar visibility limits
      const minX = -(card.width - MIN_VISIBLE);
      const maxX = Math.max(minX, window.innerWidth - MIN_VISIBLE);
      const minY = 0;
      const maxY = Math.max(0, window.innerHeight - TITLE_BAR_HEIGHT);

      const rawX = e.clientX - dragOffsetRef.current.x;
      const rawY = e.clientY - dragOffsetRef.current.y;

      setPosition({
        x: Math.max(minX, Math.min(rawX, maxX)),
        y: Math.max(minY, Math.min(rawY, maxY)),
      });
    };

    const handleWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updatePosition(card.id, currentPosRef.current.x, currentPosRef.current.y);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [card.id, card.isFixed, updatePosition]);

  const isGlossary = card.title?.toLowerCase() === 'glossary';

  const handleLetterClick = (e, letter, isActive) => {
    e.stopPropagation();
    if (!isActive) return;
    
    setSelectedLetter(letter);

    const targetId = `anchor-${letter.toUpperCase()}`;
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="help-card"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: card.width ? `${card.width}px` : '350px',
        zIndex: card.zIndex,
      }}
      onMouseDown={() => bringToFront(card.id)}
    >
      <div 
        className="help-card-header" 
        onMouseDown={handleHeaderMouseDown}
        style={{ cursor: card.isFixed ? 'default' : 'grab' }}
      >
        <span className="help-card-title">{card.title}</span>
        <div className="help-card-actions">
          
          {card.showGlossary && (
            <button
              type="button"
              className="help-card-btn help-card-btn-glossary"
              onMouseDown={(e) => {
                e.stopPropagation();
                openHelp('glossary');
              }}
              aria-label="Open Glossary"
            >
              Glossary
            </button>
          )}

          <button
            type="button"
            className={`help-card-btn help-card-btn-close ${card.isFixed ? 'help-card-btn-close-fixed' : ''}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              closeHelp(card.id);
            }}
            aria-label="Close Help Card"
          >
            {card.isFixed ? 'CLOSE' : '✕'}
          </button>

        </div>
      </div>

      {isGlossary && (
        <div className="help-card-nav-strip">
          {ALPHABET.map((letter) => {
            const isActive = ACTIVE_LETTERS.has(letter);
            const isSelected = selectedLetter === letter;

            let className = 'help-card-nav-letter';
            if (!isActive) {
              className += ' help-card-nav-letter-dead';
            } else if (isSelected) {
              className += ' help-card-nav-letter-selected';
            }

            return (
              <div
                key={letter}
                className={className}
                onClick={(e) => handleLetterClick(e, letter, isActive)}
              >
                {letter}
              </div>
            );
          })}
        </div>
      )}

      <div 
        className={`help-card-body ${card.errorCard ? 'help-card-error' : ''}`} 
        onMouseDown={handleBodyMouseDown}
      >
        <div dangerouslySetInnerHTML={{ __html: card.htmlContent }} />
      </div>
    </div>
  );
}