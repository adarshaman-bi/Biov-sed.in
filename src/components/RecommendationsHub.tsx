import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  fetchLectures,
  fetchPlaylists,
  fetchTeachers,
  fetchInstitutes,
  fetchWatchHistory,
  fetchFollowingList,
  toggleFollow
} from '../services/dbService';
import { RecommendationEngine } from '../services/recommendationEngine';
import { Lecture, Playlist, TeacherProfile, InstituteProfile, WatchHistoryItem } from '../types';
import { getLectureThumbnail, getPlaylistThumbnail } from '../services/thumbnailHelper';
import {
  Sparkles,
  Play,
  Clock,
  TrendingUp,
  GraduationCap,
  Bookmark,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  FolderOpen,
  User,
  Heart,
  Calendar
} from 'lucide-react';

interface RecommendationsHubProps {
  onSelectLecture: (lecture: Lecture) => void;
  activeLecture: Lecture | null;
}

export default function RecommendationsHub({ onSelectLecture, activeLecture }: RecommendationsHubProps) {
  const { user } = useAuth();
  
  // Dynamic state
  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [institutes, setInstitutes] = useState<InstituteProfile[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  // Sub-tabs
  const [activeStreamTab, setActiveStreamTab] = useState<string>(() => localStorage.getItem('biovised_onboarding_exam') || user?.examType || 'JEE');

  useEffect(() => {
    const freshStream = localStorage.getItem('biovised_onboarding_exam') || user?.examType || 'JEE';
    setActiveStreamTab(freshStream);
  }, [user]);

  // Load everything needed for recommendation scoring
  const loadData = async () => {
    setLoading(true);
    try {
      const lecs = await fetchLectures();
      const plays = await fetchPlaylists();
      const tcs = await fetchTeachers();
      const insts = await fetchInstitutes();
      
      let hist: WatchHistoryItem[] = [];
      let follows: string[] = [];
      
      if (user) {
        hist = await fetchWatchHistory();
        follows = await fetchFollowingList();
      }

      setLectures(lecs);
      setPlaylists(plays);
      setTeachers(tcs);
      setInstitutes(insts);
      setWatchHistory(hist);
      setFollowedIds(follows);
    } catch (e) {
      console.warn('Failed to compile recommendations data: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle follow state
  const handleFollowClick = async (teacherId: string) => {
    if (!user) return;
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const isFollowing = followedIds.includes(teacherId);
    try {
      await toggleFollow(teacherId, teacher.name, teacher.avatar, isFollowing);
      setFollowedIds(prev =>
        prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
      );
    } catch (e) {
      console.error(e);
    }
  };

  const chosenExam = localStorage.getItem('biovised_onboarding_exam') || user?.examType || 'JEE';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400 font-mono text-xs space-y-4">
        <RefreshCw className="w-5 h-5 animate-spin text-white" />
        <span>Preparing your study recommendations...</span>
      </div>
    );
  }

  // Run Recommendation Logic and filter strictly by chosen exam
  const rawContinueWatching = RecommendationEngine.getContinueWatching(watchHistory, lectures);
  const continueWatching = rawContinueWatching.filter(item => {
    if (!item.lectureDetail) return false;
    return item.lectureDetail.examType === chosenExam || item.lectureDetail.examType === 'Both';
  });

  const rawPersonalizedFeed = RecommendationEngine.getPersonalizedFeed(user, followedIds, lectures);
  const personalizedFeed = rawPersonalizedFeed.filter(lec => lec.examType === chosenExam || lec.examType === 'Both');

  const rawTrending = RecommendationEngine.getTrending(lectures, playlists);
  const trending = {
    lectures: rawTrending.lectures.filter(lec => lec.examType === chosenExam || lec.examType === 'Both'),
    playlists: rawTrending.playlists.filter(p => p.examType === chosenExam || p.examType === 'Both'),
  };

  const subjectRecs = RecommendationEngine.getSubjectBasedRecommendations(lectures, playlists);

  // Active lecture recommendations
  const activeSubjectRecs = activeLecture
    ? RecommendationEngine.getRelatedContent(activeLecture, lectures, playlists, teachers, institutes)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12 font-sans selection:bg-white selection:text-black">
      
      {/* 1. Continue Watching (Conditional) */}
      {continueWatching.length > 0 && (
        <section className="space-y-4 text-left">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">
              Continue Learning Session
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {continueWatching.map((item) => {
              if (!item.lectureDetail) return null;
              const progressPct = Math.min(100, Math.max(5, (item.progressSeconds / 3600) * 100)); // approximated
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-500 transition-all flex flex-col justify-between"
                >
                  <div className="p-4 flex gap-4 text-left">
                    <img
                      src={getLectureThumbnail(item.lectureDetail)}
                      alt={item.lectureDetail.title}
                      className="w-20 h-14 rounded-lg object-cover border border-neutral-800"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[9px] font-mono uppercase bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                        {item.lectureDetail.examType} Focus
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase truncate tracking-tight">{item.lectureDetail.title}</h4>
                      <p className="text-[10px] text-neutral-500 font-mono">By {item.lectureDetail.teacherName}</p>
                    </div>
                  </div>
                  {/* Progress tracker bar */}
                  <div className="px-4 pb-4 space-y-2">
                    <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-neutral-500">Progress: {item.durationString || 'Resume'}</span>
                      <button
                        onClick={() => onSelectLecture(item.lectureDetail!)}
                        className="flex items-center gap-1 text-[10px] bg-white text-black hover:bg-neutral-200 font-mono px-3 py-1 rounded-full uppercase font-bold tracking-wider cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-black" /> Resume
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Personalized Learning Feed Banner */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6 md:p-8 text-left">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
          Personalized Learning Feed
        </h2>
        <p className="text-xs text-zinc-400 mt-2 max-w-xl">
          Curated selection of verified curriculum lessons, educator profiles, and study channels matching your target exam goals.
        </p>
      </div>

      {/* 3. Related To Currently Playing Lecture (Only if some lecture is playing!) */}
      {activeLecture && activeSubjectRecs && (
        <section className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-6 text-left">
          <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">Active Session Context</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Related to "{activeLecture.title}"
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-400">
              {activeLecture.subject}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Related Lectures & Playlists catalog */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Recommended Continuous Lessons</h4>
              
              {activeSubjectRecs.lectures.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 font-mono">No other related lectures found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeSubjectRecs.lectures.map((lec) => (
                    <div
                      key={lec.id}
                      onClick={() => onSelectLecture(lec)}
                      className="group bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex gap-3 hover:border-neutral-500 transition-all cursor-pointer text-left"
                    >
                      <img
                        src={getLectureThumbnail(lec)}
                        alt={lec.title}
                        className="w-16 h-12 rounded object-cover border border-neutral-800"
                      />
                      <div className="min-w-0">
                        <h5 className="text-[11px] font-bold text-white uppercase truncate group-hover:text-white">
                          {lec.title}
                        </h5>
                        <p className="text-[10px] text-neutral-400 truncate">{lec.teacherName}</p>
                        <span className="text-[9px] text-neutral-500 font-mono block mt-1 uppercase">Views: {lec.viewsCount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSubjectRecs.playlists.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Recommended Playlists</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeSubjectRecs.playlists.map((play) => (
                      <div
                        key={play.id}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center hover:border-neutral-500 transition-all text-left"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white uppercase truncate tracking-tight">{play.title}</h5>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{play.lecturesCount} Lessons • {play.subject}</p>
                        </div>
                        <FolderOpen className="w-5 h-5 text-neutral-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Related Faculty & Institutions */}
            <div className="space-y-6 lg:border-l lg:border-neutral-800 lg:pl-8">
              <h4 className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Highly Rated Experts in {activeLecture.subject}</h4>
              
              <div className="space-y-4">
                {activeSubjectRecs.teachers.map((tc) => (
                  <div key={tc.id} className="flex items-center gap-3 bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-all">
                    <img src={tc.avatar} alt={tc.name} className="w-10 h-10 rounded-full object-cover border border-neutral-800" />
                    <div className="flex-1 min-w-0 text-left">
                      <h5 className="text-xs font-bold text-white uppercase truncate">{tc.name}</h5>
                      <p className="text-[10px] text-neutral-400 truncate font-mono">
                        {tc.isVerified ? (
                          (tc.trustScore === null || tc.trustScore === undefined || tc.trustScore === 0) 
                            ? "Trust: Not enough data yet" 
                            : `Trust Rank: ${tc.trustScore}%`
                        ) : "Unverified Profile"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFollowClick(tc.id)}
                      className={`text-[9px] font-mono px-2.5 py-1 rounded-full border transition-all cursor-pointer uppercase font-bold tracking-wide ${
                        followedIds.includes(tc.id)
                          ? 'border-white bg-[#171717] text-white'
                          : 'border-neutral-800 bg-[#0A0A0A] hover:border-neutral-400 text-neutral-400'
                      }`}
                    >
                      {followedIds.includes(tc.id) ? 'Followed' : 'Follow'}
                    </button>
                  </div>
                ))}

                {activeSubjectRecs.institutes.map((inst) => (
                  <div key={inst.id} className="flex items-center gap-3 bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-all">
                    <img src={inst.logo} alt={inst.name} className="w-10 h-10 rounded-xl object-cover border border-neutral-800" />
                    <div className="flex-1 min-w-0 text-left">
                      <h5 className="text-xs font-bold text-white uppercase truncate">{inst.name}</h5>
                      <span className="text-[9px] uppercase tracking-wide bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300 font-mono">
                        {inst.isVerified ? (
                          (inst.trustScore === null || inst.trustScore === undefined || inst.trustScore === 0)
                            ? "Not enough data yet"
                            : `Score ${inst.trustScore}%`
                        ) : "Unverified"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Segmented Subject Channels (Locked to chosen exam) */}
      <section className="space-y-6 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-neutral-400" />
            <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">
              Subject Prep Channels
            </h3>
          </div>
          {/* Locked to chosen exam tab */}
          <div className="flex flex-wrap gap-2">
            {[activeStreamTab].map((tab) => (
              <button
                key={tab}
                disabled
                className="text-xs font-mono py-1.5 px-4 rounded-full border border-white bg-white text-black font-bold uppercase tracking-wider cursor-default"
              >
                {tab} Channel
              </button>
            ))}
          </div>
        </div>

        {/* Channel suggestions content output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Channel Lectures */}
          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">Top Catalog Lessons for {activeStreamTab}</h4>
            
            {!subjectRecs[activeStreamTab] || subjectRecs[activeStreamTab].lectures.length === 0 ? (
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-12 text-center text-neutral-500 font-mono space-y-2">
                <p className="text-xs font-bold">EDUCATOR REGISTRY OPEN</p>
                <p className="text-[11px] max-w-sm mx-auto text-neutral-400 leading-snug">
                  No verified curriculum uploads yet indexable for {activeStreamTab}. If you are a certified {activeStreamTab} educator, submit your platform to begin trust verification.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {subjectRecs[activeStreamTab].lectures.map((lec) => (
                  <div
                    key={lec.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-500 transition-all flex flex-col group text-left"
                  >
                    <div className="relative aspect-video w-full overflow-hidden border-b border-neutral-800">
                      <img
                        src={getLectureThumbnail(lec)}
                        alt={lec.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSelectLecture(lec)}
                          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
                        >
                          <Play className="w-5 h-5 fill-black pl-0.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-[10px] font-mono text-white px-2 py-0.5 rounded">
                        {lec.duration}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                          <span className="uppercase">{lec.subject}</span>
                          <span>{lec.viewsCount?.toLocaleString() || '0'} Views</span>
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-tight mt-2 leading-relaxed">
                          {lec.title}
                        </h4>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                          {lec.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400">By {lec.teacherName}</span>
                        <button
                          onClick={() => onSelectLecture(lec)}
                          className="text-[11px] font-mono text-white hover:underline uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Play Lesson
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Channel Suggested Playlists */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">Interactive play-series</h4>
            
            {!subjectRecs[activeStreamTab] || subjectRecs[activeStreamTab].playlists.length === 0 ? (
              <p className="text-xs text-neutral-500 font-mono italic py-4">No companion play-series available.</p>
            ) : (
              <div className="space-y-4">
                {subjectRecs[activeStreamTab].playlists.map((play) => (
                  <div
                    key={play.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 hover:border-neutral-500 transition-all text-left"
                  >
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                        {play.subject}
                      </span>
                      <h5 className="text-xs font-bold text-white uppercase tracking-tight mt-2 leading-snug">{play.title}</h5>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1 leading-snug">{play.description}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1 font-mono border-t border-neutral-850 text-neutral-500">
                      <span>{play.lecturesCount} Curriculum lessons</span>
                      <span className="text-white hover:underline cursor-pointer uppercase font-bold text-[9px] tracking-wide">
                        View Track list
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Trending Content Grid */}
      <section className="space-y-6 text-left">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
          <TrendingUp className="w-4 h-4 text-neutral-400" />
          <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">
            Biovised Hot Trending Analytics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trending.lectures.map((lec) => (
            <div
              key={lec.id}
              onClick={() => onSelectLecture(lec)}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-500 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 group text-left"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500">
                  <span className="uppercase">{lec.subject}</span>
                  <span className="bg-neutral-800 text-white px-1 py-0.2 rounded uppercase">TOP</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase truncate tracking-tight">{lec.title}</h4>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">{lec.teacherName}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-850 text-[10px] font-mono text-neutral-500">
                <span>{lec.viewsCount?.toLocaleString() || '0'} Plays</span>
                <span className="text-neutral-400 group-hover:text-white uppercase font-bold text-[9px]">Play Video</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Personalized Algorithm Feed Track */}
      <section className="space-y-6 text-left">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
          <Sparkles className="w-4 h-4 text-neutral-400" />
          <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest">
            For You Algorithm Stream Feed
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {personalizedFeed.map((lec) => (
            <div
              key={lec.id}
              className="bg-neutral-905 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-500 transition-all flex flex-col justify-between text-left"
            >
              <div className="relative aspect-video border-b border-neutral-800">
                <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-full h-full object-cover" />
                <button
                  onClick={() => onSelectLecture(lec)}
                  className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
                >
                  <Play className="w-4 h-4 fill-black pl-0.5" />
                </button>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                    <span className="uppercase">{lec.subject} • {lec.examType}</span>
                    <span className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">MATCH SCORE</span>
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-tight mt-2 leading-relaxed">
                    {lec.title}
                  </h4>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-mono text-neutral-400">By {lec.teacherName}</span>
                  <button
                    onClick={() => onSelectLecture(lec)}
                    className="text-[10px] font-mono text-white font-bold hover:underline uppercase"
                  >
                    Study Lesson
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
