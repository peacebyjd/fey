import React, { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';

interface SplashScreenProps {
  onFinish: () => void;
}

/**
 * Lightweight 1.5s app-launch sequence:
 *   1. Logo fades + scales in
 *   2. Company name reveals
 *   3. Motto fades in
 *   4. Seamless cross-fade into the dashboard / login
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), 1150);
    const done = setTimeout(onFinish, 1550);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream transition-opacity duration-[400ms] ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient warm glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(128,0,32,0.06)_0%,transparent_65%)]" />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Logo — fade-in + scale-up */}
        <div className="animate-splash-in">
          <BrandMark className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] shadow-soft ring-8 ring-sand/70" />
        </div>

        {/* Company name reveal */}
        <h1 className="animate-splash-rise mt-6 text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
          Feyamet Auto Garage
          <span className="block text-sm sm:text-base font-semibold text-ink-muted tracking-normal mt-1">
            Management System
          </span>
        </h1>

        {/* Rule */}
        <div className="animate-splash-rule mt-4 h-[3px] w-20 rounded-full bg-coral" />

        {/* Motto fade-in */}
        <p
          className="animate-splash-rise mt-4 text-sm sm:text-base font-medium italic text-ink-muted"
          style={{ animationDelay: '0.35s' }}
        >
          Excellence in Automotive Service
        </p>
      </div>

      <div className="absolute bottom-6 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-muted/60">
        Addis Ababa · Ethiopia
      </div>
    </div>
  );
};
