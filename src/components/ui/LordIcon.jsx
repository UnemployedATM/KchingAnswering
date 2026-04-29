import React from 'react';

// Wrapper for LordIcon animated icons (loaded via CDN in index.html)
// Icon IDs: https://lordicon.com/icons (free tier)
export default function LordIcon({ src, trigger = 'hover', size = 20, primary = '#6366f1', secondary = '#818cf8', style }) {
  return React.createElement('lord-icon', {
    src,
    trigger,
    colors: `primary:${primary},secondary:${secondary}`,
    style: { width: size, height: size, display: 'block', flexShrink: 0, ...style },
  });
}
