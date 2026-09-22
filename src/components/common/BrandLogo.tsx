import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'header' | 'bar';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const BrandColorBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`inline-flex items-center rounded-full p-1 bg-slate-200/80 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/60 shadow-inner ${className}`}>
    <div className="flex items-center h-2.5 rounded-full overflow-hidden space-x-0.5">
      <div className="w-2.5 h-full rounded-l-full bg-[#ec4899]" title="Magenta Pink" />
      <div className="w-2.5 h-full bg-[#eab308]" title="Gold Yellow" />
      <div className="w-2.5 h-full bg-[#f97316]" title="Vibrant Orange" />
      <div className="w-2.5 h-full bg-[#94a3b8]" title="Silver Grey" />
      <div className="w-2.5 h-full bg-[#06b6d4]" title="Cyan Teal" />
      <div className="w-2.5 h-full bg-[#84cc16]" title="Lime Green" />
      <div className="w-2.5 h-full rounded-r-full bg-[#8b5cf6]" title="Royal Purple" />
    </div>
  </div>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const { themeMode } = useAuth();

  const heightClasses = {
    sm: 'h-7',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-16',
  };

  const imgHeight = heightClasses[size] || 'h-10';
  const logoSrc = themeMode === 'light' ? '/popular_paints_logo_dark.png' : '/popular_paints_logo.png';

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center p-1.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-md ${className}`}>
        <img
          src={logoSrc}
          alt="Popular Paints Logo"
          className={`${imgHeight} w-auto object-contain drop-shadow-xs`}
        />
      </div>
    );
  }

  if (variant === 'bar') {
    return <BrandColorBar className={className} />;
  }

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <div className="flex items-center">
        <img
          src={logoSrc}
          alt="Popular Paints & Chemicals"
          className={`${imgHeight} w-auto max-w-[200px] object-contain drop-shadow-xs`}
        />
      </div>
      {showTagline && (
        <div className="flex items-center gap-2">
          <BrandColorBar />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase font-mono">
            Sales Portal
          </span>
        </div>
      )}
    </div>
  );
};
