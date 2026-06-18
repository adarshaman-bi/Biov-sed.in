import React, { useState, useEffect } from 'react';
import { Image, User, Layers, GraduationCap } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  variant: 'thumbnail' | 'avatar' | 'banner';
  fallbackInitials?: string;
  customFallback?: React.ReactNode;
}

export function SafeImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  variant,
  fallbackInitials,
  customFallback,
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset error/loading states if the source URL changes dynamically
  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [src]);

  // Render Fallback UI if there's an error or no source provided
  if (error || !src) {
    if (customFallback) {
      return <div className={`relative overflow-hidden ${className}`}>{customFallback}</div>;
    }
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-[#121215] via-[#0D0D10] to-[#0A0A0C] text-zinc-500 border border-zinc-900/60 select-none ${className}`}
      >
        {variant === 'avatar' && (
          <span className="font-mono font-black text-xs tracking-tighter uppercase text-zinc-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {fallbackInitials || alt.slice(0, 2)}
          </span>
        )}
        
        {variant === 'thumbnail' && (
          <div className="flex flex-col items-center gap-1.5 text-center p-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-zinc-400">
              <Image className="w-4 h-4 opacity-75" />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-450 font-bold max-w-full truncate px-1">
              {alt || "No Preview"}
            </span>
          </div>
        )}
        
        {variant === 'banner' && (
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            {/* Elegant dark grid back pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#1f1f2e_25%,transparent_25%,transparent_50%,#1f1f2e_50%,#1f1f2e_75%,transparent_75%,transparent)] bg-[length:14px_14px] opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 via-transparent to-teal-500/5" />
            <Layers className="w-8 h-8 text-zinc-800/50 absolute bottom-3 right-4" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center animate-pulse border border-zinc-900/50">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-300 ${imageClassName} ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
