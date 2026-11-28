import React from 'react';

interface ZunoLogoProps {
  accentColor: string;
  size?: number;
}

export const ZunoLogo: React.FC<ZunoLogoProps> = ({ size = 28 }) => {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <img
        src={`${import.meta.env.BASE_URL}zuno-icon.svg`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="shrink-0 rounded-full object-cover"
      />
      <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">ZUNO</span>
    </div>
  );
};
