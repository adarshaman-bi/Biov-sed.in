import React, { useState } from 'react';

interface YoutubeThumbnailImgProps {
  videoId: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function YoutubeThumbnailImg({
  videoId,
  alt = 'Video thumbnail',
  className = 'w-full h-full object-cover',
  loading = 'lazy'
}: YoutubeThumbnailImgProps) {
  // Priority Order: maxresdefault -> sddefault -> hqdefault -> mqdefault
  const [qualityIndex, setQualityIndex] = useState(0);
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (qualityIndex < qualities.length - 1) {
      setQualityIndex(prev => prev + 1);
    }
  };

  const getUrl = () => {
    const q = qualities[qualityIndex];
    return `https://img.youtube.com/vi/${videoId}/${q}.jpg`;
  };

  return (
    <img
      src={getUrl()}
      onError={handleImageError}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy="no-referrer"
    />
  );
}
