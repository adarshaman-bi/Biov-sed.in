import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export class MediaResolverService {
  private static cache: Record<string, string> = {};

  /**
   * Resolves a relative storage path (e.g. avatars/channels/xyz.webp) 
   * into an absolute delivery URL using custom CDN or Firebase Storage.
   */
  public static resolveUrl(relativePath: string, isPrivate: boolean = false): string {
    if (!relativePath) {
      return '';
    }

    // If it's already a full absolute URL (like a YouTube direct link), return it
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }

    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    // Support custom CDN if provided via env
    const customCdn = (import.meta as any).env?.VITE_MEDIA_CDN || null;
    if (customCdn && customCdn.toLowerCase() !== 'none' && customCdn.trim() !== '') {
      const normalizedCdn = customCdn.replace(/\/$/, '');
      return `${normalizedCdn}/${cleanPath}`;
    }

    // Fallback to Firebase Storage bucket resolution
    if (this.cache[cleanPath]) {
      return this.cache[cleanPath];
    }

    // Trigger asynchronous authenticated link retrieval and cache it
    try {
      const storageRef = ref(storage, cleanPath);
      getDownloadURL(storageRef)
        .then((url) => {
          this.cache[cleanPath] = url;
        })
        .catch((err) => {
          console.warn(`Failed to resolve authenticated download URL for ${cleanPath}:`, err);
        });
    } catch (e) {
      console.warn(`Error creating storage ref or executing getDownloadURL for ${cleanPath}:`, e);
    }

    // Return direct web-friendly fallback while the background fetch completes
    const bucket = storage.app.options.storageBucket || 'yodeling-elevator-k07pf.firebasestorage.app';
    const encodedPath = encodeURIComponent(cleanPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }
}

