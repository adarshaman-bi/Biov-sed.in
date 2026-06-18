// src/services/LectureSerializer.ts
import { MediaResolverService } from './MediaResolverService'; // Implemented in Phase 2

export interface RawRowJoinResult {
  video_id: string;
  video_title: string;
  video_description: string | null;
  video_thumbnail_path: string; // Aligned with updated SQL alias
  video_duration: number;
  channel_id: string;
  channel_name: string;
  channel_avatar_path: string | null;
  channel_banner_path: string | null;
  raw_subscriber_count: number;
}

export interface LectureWithChannelDTO {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    bannerUrl: string | null;
    subscriberCountFormatted: string;
  };
}

export function formatSubscriberCount(count: number): string {
  if (!count || isNaN(count)) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return count.toString();
}

/**
 * FIXED CORE CONTROLLER
 * Explicitly resolves relative DB storage tags into absolute CDN Delivery Edge addresses
 */
export function serializeRelationToDTO(rawRow: RawRowJoinResult): LectureWithChannelDTO {
  return {
    id: rawRow.video_id,
    title: rawRow.video_title,
    description: rawRow.video_description || "",
    
    // ✅ FIX: Resolving the relative thumbnail path through the CDN layer
    thumbnailUrl: MediaResolverService.resolveUrl(rawRow.video_thumbnail_path, false),
    
    duration: Number(rawRow.video_duration) || 0,
    channel: {
      id: rawRow.channel_id,
      name: rawRow.channel_name || "Verified Educator",
      
      // ✅ FIX: Resolving the channel profile avatar via CDN layer
      avatarUrl: MediaResolverService.resolveUrl(rawRow.channel_avatar_path || '', false),
      
      // ✅ FIX: Resolving the channel top banner via CDN layer
      bannerUrl: rawRow.channel_banner_path ? MediaResolverService.resolveUrl(rawRow.channel_banner_path, false) : null,
      
      subscriberCountFormatted: formatSubscriberCount(Number(rawRow.raw_subscriber_count) || 0)
    }
  };
}
