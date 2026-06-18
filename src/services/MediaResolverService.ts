import { MediaUrlResolver } from './cdnVerifyScript';

export class MediaResolverService {
  private static resolver = new MediaUrlResolver('https://cdn.biovised.com', 'biovised-media-prod');

  /**
   * Resolves a relative storage path (e.g. avatars/channels/xyz.webp) 
   * into an absolute CDN delivery URL (https://cdn.biovised.com/media/...).
   */
  public static resolveUrl(relativePath: string, isPrivate: boolean = false): string {
    if (!relativePath) {
      return '';
    }
    return this.resolver.resolveAssetUrl(relativePath, isPrivate);
  }
}
