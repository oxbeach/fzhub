import React, { useRef } from 'react';

//export function Hint({ text, position = 'bottom', children }) {

export function Hint({ text, position = 'bottom', as: Component = 'span', children, style, ...props }) {


  const timeoutRef = useRef(null);

  const showHint = (e) => {
    const hintEl = document.getElementById('global-hint-root');
    if (!hintEl) return;

    const target = e.currentTarget;

    // Clear any existing timer so fast movements don't trigger previous hints
    clearTimeout(timeoutRef.current);

    // Set exact delay here (e.g. 800ms)
    timeoutRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();

      let top = rect.bottom;
      let left = rect.left + rect.width / 2;

      if (position === 'top') {
        top = rect.top;
      } else if (position === 'right') {
        top = rect.top + rect.height / 2;
        left = rect.right;
      } else if (position === 'left') {
        top = rect.top + rect.height / 2;
        left = rect.left;
      }

      hintEl.setAttribute('data-hint', text);
      hintEl.setAttribute('data-hint-pos', position);

      hintEl.style.position = 'fixed';
      hintEl.style.top = `${top}px`;
      hintEl.style.left = `${left}px`;

      hintEl.classList.add('is-active');
    }, 500); // <--- CONTROL DELAY IN MS HERE (800ms = 0.8s)
  };

  const hideHint = () => {
    clearTimeout(timeoutRef.current);
    const hintEl = document.getElementById('global-hint-root');
    if (hintEl) {
      hintEl.classList.remove('is-active');
      hintEl.removeAttribute('data-hint');
      hintEl.removeAttribute('data-hint-pos');
    }
  };

  /*
  return (
    <span
      onMouseEnter={showHint}
      onMouseLeave={hideHint}
      onFocus={showHint}
      onBlur={hideHint}
      style={{ display: 'inline-flex' }}
    >
      {children}
    </span>
  )*/

    return (
      <Component
        onMouseEnter={showHint}
        onMouseLeave={hideHint}
        onFocus={showHint}
        onBlur={hideHint}
        style={Component === 'span' ? { display: 'inline-flex', ...style } : style}
        {...props}
      >
        {children}
      </Component>
    );
}


