import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-16 h-16' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    className={className}
    role="img"
    aria-label="Feyamet Auto Garage"
  >
    <rect width="64" height="64" rx="14" fill="#800020" />
    <g fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 46V18" stroke="#FFFFFF" />
      <path d="M14 18L32 36" stroke="#2F80ED" />
      <path d="M32 36L50 18" stroke="#F2C94C" />
      <path d="M50 18V46" stroke="#FFFFFF" />
    </g>
  </svg>
);

export default BrandMark;
