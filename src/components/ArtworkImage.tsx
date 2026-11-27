import React from 'react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import {
  COVER_HORIZON,
  COVER_NOCTURNE,
  COVER_PRISM,
  COVER_SUBZERO,
  COVER_VELVET,
} from '../data/zunoCatalog';

const FALLBACK_COVERS = [
  COVER_NOCTURNE,
  COVER_HORIZON,
  COVER_VELVET,
  COVER_PRISM,
  COVER_SUBZERO,
];

function fallbackFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_COVERS[hash % FALLBACK_COVERS.length];
}

type ArtworkImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
};

export const ArtworkImage: React.FC<ArtworkImageProps> = ({ src, alt, onError, ...props }) => {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    const image = event.currentTarget;
    if (image.dataset.zunoFallback === '1') return;
    image.dataset.zunoFallback = '1';
    image.src = fallbackFor(alt || src);
  };

  return <img {...props} src={src} alt={alt} onError={handleError} />;
};
