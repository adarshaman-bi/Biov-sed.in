import React, { useState } from 'react';

// Robust RegExp parser to dynamically isolate the 11-character videoId from incoming URL fields
export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (clean.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = clean.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

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
  const [resolving, setResolving] = useState(true);
  const parsedVideoId = extractYoutubeVideoId(videoId) || videoId || '';

  const imgUrl = parsedVideoId 
    ? `https://img.youtube.com/vi/${parsedVideoId}/maxresdefault.jpg`
    : '';

  return (
    <div className="relative w-full h-full min-h-[50px] overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
      {resolving && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse z-10" />
      )}
      {imgUrl ? (
        <img
          src={imgUrl}
          onLoad={() => setResolving(false)}
          onError={() => setResolving(false)}
          alt={alt}
          className={`${className} ${resolving ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          loading={loading}
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  );
}
