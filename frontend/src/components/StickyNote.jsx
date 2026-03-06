import React from 'react';
import '../App.css';

/**
 * StickyNote Component
 * @param {string} color - Color variant: 'yellow', 'pink', 'blue', 'green', 'orange'
 * @param {string} title - The title/heading of the sticky note
 * @param {React.ReactNode} children - The content of the sticky note
 * @param {string} className - Additional CSS classes
 * @param {boolean} animated - Whether to apply floating animation
 */
export default function StickyNote({ 
  color = 'yellow', 
  title, 
  children, 
  className = '',
  animated = true 
}) {
  const stickyClass = `sticky ${color} ${animated ? 'animate' : ''} ${className}`;
  
  return (
    <div className={stickyClass}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}
