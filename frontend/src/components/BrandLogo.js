import React from 'react';
import BRANDING from '../branding';

const SIZES = {
  xs: { box: 'w-7 h-7', text: 'text-[11px]' },
  sm: { box: 'w-9 h-9', text: 'text-sm' },
  md: { box: 'w-16 h-16', text: 'text-2xl' },
  lg: { box: 'w-28 h-28', text: 'text-5xl' },
};

const BrandLogo = ({ size = 'md', className = '' }) => {
  const s = SIZES[size] || SIZES.md;

  return (
    <div
      className={`${s.box} bg-white rounded-full flex items-center justify-center border-2 border-blue-600/30 shadow-xl shadow-blue-900/20 ${className}`}
      aria-label={`${BRANDING.logoText} logo`}
    >
      <span className={`${s.text} font-black text-blue-600 tracking-tighter leading-none select-none`}>
        {BRANDING.logoText}
      </span>
    </div>
  );
};

export default BrandLogo;
