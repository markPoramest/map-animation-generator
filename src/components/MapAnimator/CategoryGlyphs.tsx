import React from 'react';
import { ModeCategory } from '@/types/route';

export const CATEGORY_SVG_PATHS: Record<ModeCategory, string> = {
  walk: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
  bicycle: 'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm7-6.5l-1.9-3.2c-.4-.6-1-1-1.7-1.1-.3 0-.5.1-.8.2L4 11.4v2.6h2v-1.4l2.1-.9 2.5 4.3H9v2h3.5l1.6 2.7c.3.5.8.8 1.4.8h4.5v-2h-3.8l-1.7-2.9 2-3.4c.5.8 1.4 1.3 2.5 1.3V13c-1.1 0-2-.5-2.5-1.3L16 7.5c-.3-.5-.8-.8-1.4-.8h-3v2h2.2l-1.8 3.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z',
  car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
  bus: 'M12 2c-4.42 0-8 .5-8 4v10c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4zm5.5 14c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-11 0c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11.5-5H6V7h12v4z',
  train: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zm0 2c3.51 0 4.96.48 5.57 1H6.43c.61-.52 2.06-1 5.57-1zM6 7h12v3H6V7zm6 10c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm6-2H6v-3h12v3z',
  shinkansen: 'M12 2c-4 0-7 2-7 7v6.5C5 17.43 6.57 19 8.5 19L7 20.5v.5h10v-.5L15.5 19c1.93 0 3.5-1.57 3.5-3.5V9c0-5-3-7-7-7zm-4.5 14c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm.5-5.5h-10V8.5c0-1.5 1-2.5 5-2.5s5 1 5 2.5v2z',
  flight: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  ship: 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.33-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.27.08-.48.26-.6.5s-.15.51-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z',
};

export const CATEGORY_LABELS: Record<ModeCategory, string> = {
  walk: 'Walk',
  bicycle: 'Bicycle',
  car: 'Car',
  bus: 'Bus',
  train: 'Train',
  shinkansen: 'Shinkansen',
  flight: 'Flight',
  ship: 'Ferry / Ship',
};

interface CategoryGlyphProps {
  category: ModeCategory;
  className?: string;
  size?: number;
  color?: string;
}

export const CategoryGlyph: React.FC<CategoryGlyphProps> = ({
  category,
  className = 'w-4 h-4',
  size = 20,
  color = 'currentColor',
}) => {
  const path = CATEGORY_SVG_PATHS[category] || CATEGORY_SVG_PATHS.train;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={path} />
    </svg>
  );
};

export function getCategoryGlyphRawSvg(category: ModeCategory, color: string = '#EB5E28'): string {
  const path = CATEGORY_SVG_PATHS[category] || CATEGORY_SVG_PATHS.train;
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`;
}

export function getCategoryGlyphDataUri(category: ModeCategory, color: string = '#EB5E28'): string {
  const svg = getCategoryGlyphRawSvg(category, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
