import React from 'react';

interface ZunoLogoProps {
  accentColor: string;
  size?: number;
}

export const ZunoLogo: React.FC<ZunoLogoProps> = ({ accentColor, size = 28 }) => {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="34"
          height="34"
          rx="11"
          fill={accentColor}
          fillOpacity="0.16"
          stroke={accentColor}
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
        <path
          d="M11 12.5H25L12 23.5H25"
          stroke={accentColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24.5" cy="12.5" r="2.1" fill={accentColor} />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">ZUNO</span>
    </div>
  );
};
