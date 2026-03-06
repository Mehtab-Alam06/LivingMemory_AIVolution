import React from 'react';
import '../App.css';

/**
 * PaperCard Component - Displays content on a parchment-style card
 * @param {string} variant - 'default' or 'alt' for different background styles
 * @param {React.ReactNode} children - The content of the card
 * @param {string} className - Additional CSS classes
 */
export default function PaperCard({ 
  variant = 'default',
  children, 
  className = '' 
}) {
  const classes = `paper-card ${variant === 'alt' ? 'alt' : ''} ${className}`;
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
}
