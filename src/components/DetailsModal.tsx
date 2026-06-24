import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Award,
  Star,
  ExternalLink,
  ShieldCheck,
  Send,
  User,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { TeacherProfile, InstituteProfile, Review, EntityTrustScoreBreakdown as TrustScoreBreakdown, Lecture, Playlist, Batch } from '../types';
import { getLectureThumbnail, getPlaylistThumbnail } from '../services/thumbnailHelper';
import {
  fetchReviews,
  submitReview,
  fetchTrustScore,
  submitReport,
  fetchLectures,
  fetchPlaylists,
  fetchBatches
} from '../services/dbService';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'teacher' | 'institute' | 'playlist' | 'batch';
  targetId: string;
  onSelectLecture: (lecture: Lecture) => void;
}

export default function DetailsModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  onSelectLecture
}: DetailsModalProps) {
  const { user, isGuest } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | InstituteProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [trustBreakdown, setTrustBreakdown] = useState<TrustScoreBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Associated resources lists
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Submitting review form states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Submitting report layout
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Reset state parameters
    setIsLoading(true);
    setErrorMsg(null);
    setReviewSuccess('');
    setReviewError('');
    setReportError('');
    setShowReportForm(false);
    setReportDetails('');
    setProfile(null);
    setReviews([]);
    setTrustBreakdown(null);
    setLectures([]);
    setPlaylists([]);
    setBatches([]);

    // Resolve entity details
    import('../services/dbService').then(async (dbService) => {
      try {
        if (targetType === 'teacher') {
          const prof = await dbService.fetchTeacherById(targetId);
          if (!prof) {
            setErrorMsg('Teacher profile not found.');
            setIsLoading(false);
            return;
          }
          setProfile(prof as any);

          const revs = await dbService.fetchReviews(targetId);
          setReviews(revs);

          const tb = await dbService.fetchTrustScore(targetId);
          setTrustBreakdown(tb);

          const lecs = await dbService.fetchLectures({ teacherId: targetId });
          setLectures(lecs);

          const plays = await dbService.fetchPlaylists({ teacherId: targetId });
          setPlaylists(plays);
        } else if (targetType === 'institute') {
          const prof = await dbService.fetchInstituteById(targetId);
          if (!prof) {
            setErrorMsg('Institute profile not found.');
            setIsLoading(false);
            return;
          }
          setProfile(prof as any);

          const revs = await dbService.fetchReviews(targetId);
          setReviews(revs);

          const tb = await dbService.fetchTrustScore(targetId);
          setTrustBreakdown(tb);

          const lecs = await dbService.fetchLectures({ instituteId: targetId });
          setLectures(lecs);

          const bts = await dbService.fetchBatches(targetId);
          setBatches(bts);
        } else if (targetType === 'playlist') {
          const pl = await dbService.fetchPlaylistById(targetId);
          if (!pl) {
            setErrorMsg('Curated learning playlist channel not found.');
            setIsLoading(false);
            return;
          }
          setProfile({
            id: pl.id,
            name: pl.title,
            description: pl.description || 'Curated series of core academic lectures',
            isVerified: pl.verified !== false,
            officialLinks: [],
            rating: 4.5,
            reviewCount: 0
          } as any);

          const allLecs = await dbService.fetchLectures();
          const plLecs = allLecs.filter(l => l.playlistId === targetId);
          setLectures(plLecs);
        } else if (targetType === 'batch') {
          const b = await dbService.fetchBatchById(targetId);
          if (!b) {
            setErrorMsg('Batch cohort program details not found.');
            setIsLoading(false);
            return;
          }
          setProfile({
            id: b.id,
            name: b.name,
            description: b.description || 'Comprehensive class batch curated with study guides.',
            isVerified: b.verified !== false,
            officialLinks: [],
            rating: 4.8,
            reviewCount: 0
          } as any);

          setBatches([b]);
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message || 'Failed loading targeted resource details.');
        setIsLoading(false);
      }
    });

  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (isGuest || !user) {
      setReviewError('Guest profiles cannot submit content. Sign in to post.');
      return;
    }

    if (!comment.trim()) {
      setReviewError('Please write review commentary first.');
      return;
    }

    try {
      await submitReview({
        targetId,
        targetType: targetType as 'teacher' | 'institute',
        rating,
        comment,
        trustImpact: user.role === 'teacher' || user.role === 'admin' ? 3 : 1,
        isVerifiedStudent: true
      });

      setReviewSuccess('Review cataloged and trust metrics re-aggregated successfully!');
      setComment('');
      
      // Refresh reviews and trustscore
      const dbService = await import('../services/dbService');
      
      // Trigger trust score recalibration
      try {
        await dbService.recalibrateTrustScore(targetId, targetType as 'teacher' | 'institute');
      } catch (calErr) {
        console.warn("Client-side direct recalibration skipped, trigger will handle it:", calErr);
      }
      
      const revs = await dbService.fetchReviews(targetId);
      setReviews(revs);
      const tb = await dbService.fetchTrustScore(targetId);
      setTrustBreakdown(tb);
    } catch (err: any) {
      setReviewError(err?.message || 'Database permissions aborted.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess('');
    setReportError('');
    if (isGuest || !user) {
      setReportError("Authenticated credentials required to flag reports. Guest mode is read-only.");
      return;
    }

    try {
      await submitReport({
        targetId,
        targetType: targetType === 'teacher' ? 'teacher' : 'institute',
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess('Report successfully lodged in the moderation queue.');
      setReportDetails('');
      setTimeout(() => setShowReportForm(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const dynamicRatingCount = reviews.length;
  const dynamicAverageRating = dynamicRatingCount > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / dynamicRatingCount).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto overflow-x-hidden flex flex-col text-left animate-in fade-in duration-300">
      <div className="w-full min-h-screen bg-black flex flex-col relative">
        
        {/* Modern Minimal Header */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-black/85 border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-zinc-850">
              {targetType} profile details
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Verified Directory Entry</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-all group px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-full cursor-pointer"
          >
            <span>Close Details</span>
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Primary Container */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 space-y-12 pb-24">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] tracking-widest font-mono text-zinc-500 uppercase">Loading credentials & metrics...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
              <AlertOctagon className="w-8 h-8 text-rose-500/80" />
              <h4 className="text-sm font-medium text-zinc-350">Query Verification Failed</h4>
              <p className="text-xs font-mono text-zinc-500 max-w-md">{errorMsg}</p>
            </div>
          ) : targetType === 'playlist' ? (
            <div className="space-y-8">
              <div className="border-b border-zinc-900/40 pb-8">
                <h2 className="text-2xl md:text-3xl font-display font-medium text-white tracking-tight">{profile?.name}</h2>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed max-w-3xl">{profile?.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[9px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-850 px-2.5 py-1 rounded">
                    Curated learning sequence
                  </span>
                  <span className="text-xs font-mono text-zinc-500">Verified: {profile?.isVerified ? 'Yes' : 'Pending Review'}</span>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900/40">
                  Course Chapter Lectures ({lectures.length})
                </h3>

                {lectures.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-12 text-center font-mono bg-zinc-950 rounded-2xl border border-zinc-900/40">
                    No validated chapters registered in this curriculum yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lectures.map((lec) => (
                      <div
                        key={lec.id}
                        onClick={() => {
                          onSelectLecture(lec);
                          onClose();
                        }}
                        className="p-3 bg-zinc-900/10 border border-zinc-900/40 hover:border-zinc-800 rounded-xl flex items-center gap-4 hover:bg-zinc-900/30 cursor-pointer transition-all"
                      >
                        <img src={getLectureThumbnail(lec)} alt={lec.title} className="aspect-video w-24 object-cover rounded-lg border border-zinc-950" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white line-clamp-1 truncate uppercase tracking-wide">{lec.title}</h4>
                          <p className="text-[10px] font-mono text-zinc-500 mt-1">Teacher: {lec.teacherName}</p>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[8px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full uppercase border border-zinc-850/50">
                              {lec.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : targetType === 'batch' ? (
            <div className="space-y-8 max-w-3xl mx-auto">
              {batches.map((b) => (
                <div key={b.id} className="p-8 bg-zinc-900/10 border border-zinc-900/40 rounded-2xl space-y-6 text-left">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-850 px-2.5 py-1 rounded-full">
                        {b.examType} BATCH COHORT
                      </span>
                      <h2 className="text-2xl font-display font-medium text-white tracking-tight mt-3">{b.name}</h2>
                    </div>
                    {b.price && (
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 line-through block">₹{b.price * 1.2}</span>
                        <span className="text-2xl font-semibold font-mono text-white">₹{b.price}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{b.description || 'Comprehensive learning path including lectures, mock papers and structured mentorship.'}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-t border-b border-zinc-900/40 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500 block uppercase tracking-wider">Subject Expertise</span>
                      <span className="text-zinc-200 font-medium block mt-1">{b.subject}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase tracking-wider">Launch Date</span>
                      <span className="text-zinc-200 font-medium block mt-1">{b.startDate}</span>
                    </div>
                    {b.couponCode && (
                      <div>
                        <span className="text-zinc-500 block uppercase tracking-wider">Coupon Code</span>
                        <span className="text-emerald-400 font-bold tracking-wider block mt-1">{b.couponCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <a
                      href={b.link || '#'}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold py-3 px-6 rounded-xl transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider"
                    >
                      Enroll in Cohort
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Section 1: Educator details row */}
              {profile && (
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 border-b border-zinc-900/40 pb-8">
                  <img
                    src={targetType === 'teacher' ? (profile as TeacherProfile).avatar : (profile as InstituteProfile).logo}
                    alt={profile.name}
                    className="w-24 h-24 rounded-2xl object-cover bg-zinc-950 shadow-xl"
                  />
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <h2 className="text-2xl md:text-3xl font-display font-medium text-white tracking-tight">
                        {profile.name}
                      </h2>
                      {profile.isVerified && (
                        <span className="text-[9px] font-mono tracking-wider bg-zinc-900 border border-zinc-850 text-zinc-300 px-2.5 py-1 rounded-full uppercase font-semibold">
                          Verified Channel
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                      {targetType === 'teacher' ? (profile as TeacherProfile).bio : (profile as InstituteProfile).description}
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                      {profile.officialLinks?.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="text-[11px] text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-full flex items-center gap-1.5 transition-all font-mono"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Official Link
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic metrics block */}
                  <div className="bg-zinc-900/10 border border-zinc-900/40 p-5 rounded-2xl min-w-[200px] text-left md:text-right space-y-4">
                    <div>
                      <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Aggregate Score</span>
                      {dynamicAverageRating ? (
                        <span className="text-3xl font-display font-bold text-[#FFEFD5] tracking-tight">{dynamicAverageRating}★</span>
                      ) : (
                        <span className="text-xs font-mono font-semibold text-zinc-500 block uppercase tracking-wide mt-1">No ratings yet</span>
                      )}
                    </div>
                    <div className="pt-3 border-t border-zinc-900/60">
                      <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Review Volume</span>
                      <span className="text-xs font-mono font-medium text-zinc-350 block mt-1">{dynamicRatingCount} Student reviews</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Trust Breakdown Indicators */}
              {profile?.isVerified ? (
                <div className="bg-zinc-900/10 border border-zinc-900/40 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-2 justify-between">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-zinc-400" /> Explainable Trust Indicators 
                      {(!trustBreakdown || trustBreakdown.totalScore === null || trustBreakdown.totalScore === undefined || trustBreakdown.partial) ? (
                        <span className="text-zinc-500 font-mono ml-1.5 font-semibold">(Not enough data yet)</span>
                      ) : (
                        <span className="text-zinc-300 font-mono ml-1.5">({trustBreakdown.totalScore}/100)</span>
                      )}
                    </h3>
                    {trustBreakdown && (
                      <span className="text-[10px] bg-zinc-900 border border-zinc-850/60 text-zinc-400 px-2.5 py-1 rounded font-mono">
                        Synced: {new Date(trustBreakdown.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {(!trustBreakdown || trustBreakdown.partial) && (
                    <p className="text-[10px] text-zinc-500 font-mono italic leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-900/40 text-left">
                      ⚠️ This educator has some partial or missing input signals (such as client watch metrics or reviews). Missing indicators contribute exactly 0, and the score is marked partial. "Not enough data yet" is shown instead of a manufactured standard rating.
                    </p>
                  )}

                  {trustBreakdown && (
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Profile completeness</span>
                          <span className="text-white font-semibold">{trustBreakdown.profileCompleteness}/3</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(trustBreakdown.profileCompleteness / 3) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Official links</span>
                          <span className="text-white font-semibold">{trustBreakdown.officialLinksScore}/2</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(trustBreakdown.officialLinksScore / 2) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Review reliability</span>
                          <span className="text-white font-semibold">{trustBreakdown.reviewReliability}/40</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(trustBreakdown.reviewReliability / 40) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Consistency index</span>
                          <span className="text-white font-semibold">{trustBreakdown.contentConsistency}/1</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(trustBreakdown.contentConsistency / 1) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Engagement score</span>
                          <span className="text-white font-semibold">{trustBreakdown.communityEngagement || 0}/40</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(((trustBreakdown.communityEngagement || 0) / 40) * 100)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                          <span>Credentials verification</span>
                          <span className="text-white font-semibold">{trustBreakdown.verifiedCredentials || 0}/14</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/20">
                          <div className="bg-white h-full" style={{ width: `${(((trustBreakdown.verifiedCredentials || 0) / 14) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900/10 border border-zinc-900/40 rounded-2xl p-6 text-left">
                  <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-zinc-600" /> Explainable Trust Indicators disabled
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-2 leading-relaxed">
                    Unverified profiles do not qualify for trust rating indices. Once this instructor profile is systematically verified, the server will calibrate the multi-dimensional trust score signals.
                  </p>
                </div>
              )}

              {/* Section 3: Related Content Lists */}
              <div className="space-y-6">
                <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900/40">
                  Academic Discovery Material
                </h3>
                
                {lectures.length > 0 && (
                  <div>
                    <h4 className="text-[10px] text-zinc-500 font-mono mb-3 uppercase tracking-wider">Streamable Lectures ({lectures.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lectures.map(lec => (
                        <div
                          key={lec.id}
                          onClick={() => { onSelectLecture(lec); onClose(); }}
                          className="p-3 bg-zinc-900/10 border border-zinc-900/40 hover:border-zinc-800 rounded-xl flex items-center gap-4 hover:bg-zinc-900/30 cursor-pointer transition-all"
                        >
                          <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-20 h-12 object-cover rounded-lg border border-zinc-950" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-200 hover:text-white font-medium leading-tight truncate">{lec.title}</p>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase mt-1 block">{lec.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {playlists.length > 0 && (
                  <div className="pt-4 border-t border-zinc-900/30">
                    <h4 className="text-[10px] text-zinc-500 font-mono mb-3 uppercase tracking-wider">Structured Curriculums</h4>
                    <div className="flex flex-wrap gap-4">
                      {playlists.map(p => (
                        <div key={p.id} className="p-4 bg-zinc-900/10 border border-zinc-900/40 rounded-xl text-left w-52 hover:bg-zinc-900/30 transition-all">
                          <p className="text-xs text-zinc-200 font-medium truncate leading-tight">{p.title}</p>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase mt-1.5 block">{p.lecturesCount} Video chapters</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {batches.length > 0 && (
                  <div className="pt-4 border-t border-zinc-900/30">
                    <h4 className="text-[10px] text-zinc-500 font-mono mb-3 uppercase tracking-wider">Active Batches</h4>
                    <div className="flex flex-wrap gap-4">
                      {batches.map(b => (
                        <div key={b.id} className="p-4 bg-zinc-900/10 border border-zinc-900/40 rounded-xl text-left w-60 hover:bg-zinc-900/30 transition-all">
                          <p className="text-xs text-zinc-200 font-medium truncate leading-tight">{b.name}</p>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase mt-1.5 block">Starts: {b.startDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Reviews & Opinions List */}
              <div className="space-y-6">
                <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900/40">
                  Verified Student Commentary ({reviews.length})
                </h3>

                {reviews.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono text-center py-8 bg-zinc-900/10 border border-zinc-900/40 rounded-2xl">
                    No reports submitted yet by students. If you took classes with this educator, leave feedback below!
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-900/60">
                    {reviews.map((r) => (
                      <div key={r.id} className="py-4 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-500" />
                            <span className="text-xs font-medium text-zinc-350 font-sans">{r.userDisplayName}</span>
                            {r.isVerifiedStudent && (
                              <span className="text-[8px] font-mono uppercase bg-zinc-900 border border-zinc-850/60 text-zinc-400 px-2 py-0.5 rounded font-bold">
                                Verified Candidate
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 text-[#FFEFD5] font-mono text-xs font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850/50">
                            {r.rating}★
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 font-sans italic leading-relaxed">"{r.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: Leave Feedback + Report abusive triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-900/40">
                {/* Review form */}
                <div className="bg-zinc-900/10 border border-zinc-900/40 rounded-2xl p-6 space-y-5 text-left">
                  <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-zinc-300" /> Log Class Feedback
                  </h3>

                  {reviewSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs rounded-xl font-mono">
                      {reviewSuccess}
                    </div>
                  )}

                  {reviewError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-350 text-xs rounded-xl font-mono">
                      {reviewError}
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">Rating Indicator</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setRating(index)}
                            className={`text-sm font-mono py-1.5 px-3.5 rounded-lg border transition-all cursor-pointer ${
                              rating >= index ? 'border-white bg-white text-black font-semibold shadow animate-scale' : 'border-zinc-900 bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            {index}★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wider">Commentary Details</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Describe class pedagogy, syllabus coverage, lecture quality..."
                        rows={3}
                        maxLength={100}
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl p-3.5 text-xs text-white placeholder-zinc-600 outline-none transition-all font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-white hover:bg-zinc-200 text-black transition-all font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Evaluation
                    </button>
                  </form>
                </div>

                {/* Abusive spam reporting console */}
                <div className="bg-zinc-900/10 border border-zinc-900/40 rounded-2xl p-6 space-y-5 text-left">
                  <h3 className="text-xs font-mono font-bold text-red-400/85 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-400/85" /> Moderation Reporting
                  </h3>

                  {reportError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-350 text-xs rounded-xl font-mono">
                      {reportError}
                    </div>
                  )}

                  {reportSuccess ? (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs rounded-xl font-mono">
                      {reportSuccess}
                    </div>
                  ) : !showReportForm ? (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        If this channel broadcasts copied, unverified or inaccurate material, flag it for moderator analysis.
                      </p>
                      <button
                        onClick={() => setShowReportForm(true)}
                        className="w-full bg-transparent hover:bg-red-950/10 text-red-400 border border-red-900/40 hover:border-red-900/80 font-medium text-xs py-3 rounded-xl transition-all cursor-pointer"
                      >
                        Flag Profile Abuse
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleReportSubmit} className="space-y-4 font-sans">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">Reason</label>
                        <select
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2.5 px-3 text-xs text-white outline-none focus:border-zinc-800"
                        >
                          <option value="unverified">Inaccurate/Unverified Details</option>
                          <option value="spam">Aggressive Advertising/Spam</option>
                          <option value="copy">Copyright Infringement</option>
                          <option value="abuse">Inappropriate Pedagogy</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">Evidence details</label>
                        <textarea
                          value={reportDetails}
                          required
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Indicate playlist names, timestamps, or reasons..."
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                        />
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          type="submit"
                          className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-900/60 text-red-200 font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          Lodge Complaint
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReportForm(false)}
                          className="bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-zinc-900 hover:border-zinc-800 font-medium text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
