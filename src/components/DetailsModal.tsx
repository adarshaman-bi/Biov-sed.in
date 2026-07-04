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
      <div className="w-full min-h-screen bg-black flex flex-col relative font-sans">
        
        {/* Modern Minimal Header */}
        <div className="sticky top-0 z-30 backdrop-blur-md bg-black/80 border-b border-zinc-900/80 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800">
              {targetType} profile
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Verified Entry</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-all group px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-full cursor-pointer"
          >
            <span className="font-medium">Close</span>
            <X className="w-4 h-4 group-hover:scale-110 transition-transform duration-150" />
          </button>
        </div>

        {/* Primary Container */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10 pb-24">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] tracking-widest text-zinc-500 uppercase font-medium">Loading credentials & metrics...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
              <AlertOctagon className="w-8 h-8 text-rose-500/80" />
              <h4 className="text-sm font-medium text-zinc-300">Query Verification Failed</h4>
              <p className="text-xs text-zinc-500 max-w-md">{errorMsg}</p>
            </div>
          ) : targetType === 'playlist' ? (
            <div className="space-y-8">
              <div className="border-b border-zinc-900 pb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{profile?.name}</h2>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed max-w-3xl">{profile?.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[9px] font-bold uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded">
                    Curated learning sequence
                  </span>
                  <span className="text-xs text-zinc-500">Verified: {profile?.isVerified ? 'Yes' : 'Pending Review'}</span>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900">
                  Course Chapter Lectures ({lectures.length})
                </h3>

                {lectures.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-12 text-center bg-zinc-950 rounded-2xl border border-zinc-900">
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
                        className="p-3 bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center gap-4 hover:bg-zinc-900/40 cursor-pointer transition-all"
                      >
                        <img src={getLectureThumbnail(lec)} alt={lec.title} className="aspect-video w-24 object-cover rounded-lg border border-zinc-950" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white line-clamp-1 truncate uppercase tracking-wide">{lec.title}</h4>
                          <p className="text-[10px] text-zinc-500 mt-1">Teacher: {lec.teacherName}</p>
                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[8px] font-bold bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full uppercase border border-zinc-800">
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
                <div key={b.id} className="p-6 sm:p-8 bg-zinc-900/20 border border-zinc-900 rounded-2xl space-y-6 text-left">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] font-bold uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-full">
                        {b.examType} BATCH COHORT
                      </span>
                      <h2 className="text-2xl font-bold text-white tracking-tight mt-3">{b.name}</h2>
                    </div>
                    {b.price && (
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 line-through block">₹{b.price * 1.2}</span>
                        <span className="text-2xl font-bold text-white">₹{b.price}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{b.description || 'Comprehensive learning path including lectures, mock papers and structured mentorship.'}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-t border-b border-zinc-900 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block uppercase tracking-wider font-semibold">Subject Expertise</span>
                      <span className="text-zinc-200 font-medium block mt-1">{b.subject}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase tracking-wider font-semibold">Launch Date</span>
                      <span className="text-zinc-200 font-medium block mt-1">{b.startDate}</span>
                    </div>
                    {b.couponCode && (
                      <div>
                        <span className="text-zinc-500 block uppercase tracking-wider font-semibold">Coupon Code</span>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center md:items-start border-b border-zinc-900 pb-8">
                  {/* Avatar section */}
                  <div className="col-span-1 flex justify-center md:justify-start">
                    <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
                      <img
                        src={targetType === 'teacher' ? (profile as TeacherProfile).avatar : (profile as InstituteProfile).logo}
                        alt={profile.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="col-span-1 md:col-span-2 space-y-3 text-center md:text-left">
                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        {profile.name}
                      </h2>
                      {profile.isVerified && (
                        <div className="flex items-center gap-1 text-[9px] font-bold tracking-wider bg-zinc-900/80 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full uppercase">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>Verified Channel</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto md:mx-0">
                      {targetType === 'teacher' ? (profile as TeacherProfile).bio : (profile as InstituteProfile).description}
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                      {profile.officialLinks?.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="text-[11px] text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-3 py-1 rounded-full flex items-center gap-1.5 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" /> Official Link
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic metrics block */}
                  <div className="col-span-1 w-full bg-[#0D0D0F] border border-zinc-900 p-5 rounded-2xl text-center md:text-left space-y-4">
                    <div>
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Aggregate Score</span>
                      {dynamicAverageRating ? (
                        <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                          <span className="text-3xl font-black text-white tracking-tight">{dynamicAverageRating}</span>
                          <span className="text-xl text-[#FFEFD5]">★</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-zinc-500 block uppercase tracking-wide mt-1">No ratings yet</span>
                      )}
                    </div>
                    <div className="pt-3 border-t border-zinc-900">
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Review Volume</span>
                      <span className="text-xs font-medium text-zinc-400 block mt-1">{dynamicRatingCount} Student reviews</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Trust Breakdown Indicators */}
              {profile?.isVerified ? (
                <div className="bg-[#070708] border border-zinc-900 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                  {/* Trust score overview block */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0D0D0F] border border-zinc-900/60 p-5 rounded-xl">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" /> Explainable Trust Score
                      </h4>
                      <p className="text-[11px] text-zinc-400">Multi-dimensional verification signals aggregated from platform activity & logs.</p>
                    </div>
                    {trustBreakdown && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Aggregated</span>
                          <span className="text-2xl font-black text-white">
                            {(!trustBreakdown.totalScore || trustBreakdown.partial) ? '0' : trustBreakdown.totalScore}
                            <span className="text-xs text-zinc-500 font-normal">/100</span>
                          </span>
                        </div>
                        <div className="w-[1px] h-8 bg-zinc-800" />
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Audit Sync</span>
                          <span className="text-[11px] text-zinc-300 font-medium block mt-0.5">
                            {new Date(trustBreakdown.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {(!trustBreakdown || trustBreakdown.partial) && (
                    <div className="flex gap-3 p-4 bg-amber-950/10 border border-amber-900/30 rounded-xl text-left">
                      <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        This channel currently has partial directory indicators. Missing watch metrics, unlinked media profiles, or pending review volumes contribute 0 points to prevent inflated ratings.
                      </p>
                    </div>
                  )}

                  {trustBreakdown && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Card 1: Profile Completeness */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Profile Info</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.profileCompleteness}/3</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Verified bio, academic details, and complete directory info cataloged.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(trustBreakdown.profileCompleteness / 3) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Official Links */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Official Links</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.officialLinksScore}/2</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Authenticated links to official channels, websites, or test portals.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(trustBreakdown.officialLinksScore / 2) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Review Reliability */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Review Trust</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.reviewReliability}/40</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Aggregated score calculated purely from verified student feedback.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(trustBreakdown.reviewReliability / 40) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Consistency Index */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Consistency</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.contentConsistency}/1</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Active syllabus coverage, lesson updates, and regular scheduling.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${(trustBreakdown.contentConsistency / 1) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card 5: Engagement */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Engagement</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.communityEngagement || 0}/40</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Active student interactions, answered doubts, and updates shared.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${((trustBreakdown.communityEngagement || 0) / 40) * 100}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Card 6: Credentials */}
                      <div className="bg-[#0D0D0F] border border-zinc-900/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-850 transition-all duration-150">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Credentials</span>
                            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{trustBreakdown.verifiedCredentials || 0}/14</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal mt-2">Degrees, verification awards, and institutional alignments cataloged.</p>
                        </div>
                        <div className="mt-4">
                          <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${((trustBreakdown.verifiedCredentials || 0) / 14) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#070708] border border-zinc-900 rounded-2xl p-6 text-left shadow-lg">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-zinc-650" /> Explainable Trust Indicators disabled
                  </h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    Unverified profiles do not qualify for trust rating indices. Once this instructor profile is systematically verified, the system will calibrate the multi-dimensional trust score signals.
                  </p>
                </div>
              )}

              {/* Section 3: Related Content Lists */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900">
                  Academic Discovery Material
                </h3>
                
                {lectures.length > 0 && (
                  <div>
                    <h4 className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider font-semibold">Streamable Lectures ({lectures.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lectures.map(lec => (
                        <div
                          key={lec.id}
                          onClick={() => { onSelectLecture(lec); onClose(); }}
                          className="p-3 bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center gap-4 hover:bg-zinc-900/40 cursor-pointer transition-all"
                        >
                          <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-20 h-12 object-cover rounded-lg border border-zinc-950" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-200 hover:text-white font-medium leading-tight truncate">{lec.title}</p>
                            <span className="text-[9px] text-zinc-500 uppercase mt-1 block font-medium">{lec.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {playlists.length > 0 && (
                  <div className="pt-4 border-t border-zinc-900/60">
                    <h4 className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider font-semibold">Structured Curriculums</h4>
                    <div className="flex flex-wrap gap-4">
                      {playlists.map(p => (
                        <div key={p.id} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl text-left w-52 hover:bg-zinc-900/40 transition-all">
                          <p className="text-xs text-zinc-200 font-medium truncate leading-tight">{p.title}</p>
                          <span className="text-[9px] text-zinc-500 uppercase mt-1.5 block font-semibold">{p.lecturesCount} Video chapters</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {batches.length > 0 && (
                  <div className="pt-4 border-t border-zinc-900/60">
                    <h4 className="text-[10px] text-zinc-500 mb-3 uppercase tracking-wider font-semibold">Active Batches</h4>
                    <div className="flex flex-wrap gap-4">
                      {batches.map(b => (
                        <div key={b.id} className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl text-left w-60 hover:bg-zinc-900/40 transition-all">
                          <p className="text-xs text-zinc-200 font-medium truncate leading-tight">{b.name}</p>
                          <span className="text-[9px] text-zinc-500 uppercase mt-1.5 block font-semibold">Starts: {b.startDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Reviews & Opinions List */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-900">
                  Verified Student Commentary ({reviews.length})
                </h3>

                {reviews.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8 bg-[#070708] border border-zinc-900 rounded-2xl">
                    No reports submitted yet by students. If you took classes with this educator, leave feedback below!
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-900">
                    {reviews.map((r) => (
                      <div key={r.id} className="py-4 space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-500" />
                            <span className="text-xs font-semibold text-zinc-350">{r.userDisplayName}</span>
                            {r.isVerifiedStudent && (
                              <span className="text-[8px] uppercase bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold">
                                Verified Candidate
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 text-[#FFEFD5] text-xs font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {r.rating}★
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 italic leading-relaxed">"{r.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: Leave Feedback + Report abusive triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-900">
                {/* Review form */}
                <div className="bg-[#070708] border border-zinc-900 rounded-2xl p-6 space-y-5 text-left">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-zinc-300" /> Log Class Feedback
                  </h3>

                  {reviewSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs rounded-xl">
                      {reviewSuccess}
                    </div>
                  )}

                  {reviewError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-350 text-xs rounded-xl">
                      {reviewError}
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-wide font-semibold">Rating Indicator</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setRating(index)}
                            className={`text-sm py-1.5 px-3.5 rounded-lg border transition-all cursor-pointer font-semibold ${
                              rating >= index ? 'border-white bg-white text-black font-semibold' : 'border-zinc-900 bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            {index}★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Commentary Details</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Describe class pedagogy, syllabus coverage, lecture quality..."
                        rows={3}
                        maxLength={100}
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl p-3.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
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
                <div className="bg-[#070708] border border-zinc-900 rounded-2xl p-6 space-y-5 text-left">
                  <h3 className="text-xs font-bold text-red-400/85 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-400/85" /> Moderation Reporting
                  </h3>

                  {reportError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-350 text-xs rounded-xl">
                      {reportError}
                    </div>
                  )}

                  {reportSuccess ? (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs rounded-xl">
                      {reportSuccess}
                    </div>
                  ) : !showReportForm ? (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        If this channel broadcasts copied, unverified or inaccurate material, flag it for moderator analysis.
                      </p>
                      <button
                        onClick={() => setShowReportForm(true)}
                        className="w-full bg-transparent hover:bg-red-950/10 text-red-400 border border-red-900/40 hover:border-red-900/85 font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer"
                      >
                        Flag Profile Abuse
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-wide font-semibold">Reason</label>
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
                        <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-wide font-semibold">Evidence details</label>
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
