import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Star, 
  Award, 
  CheckCircle, 
  TrendingUp, 
  ChevronRight, 
  Clock, 
  Lock, 
  Unlock, 
  Layers, 
  BookOpen, 
  Sparkles,
  Zap,
  Users,
  Video,
  MessageSquare
} from 'lucide-react';
import { Lecture, TeacherProfile, InstituteProfile } from '../types';
import { TEST_SERIES_CATALOG } from '../data/testSeriesData';
import { SafeImage } from './SafeImage';

interface HomeDashboardProps {
  lectures: Lecture[];
  teachers: TeacherProfile[];
  institutes: InstituteProfile[];
  onViewAll: (tab: 'lecture' | 'teachers' | 'tests' | 'institutes' | 'playlists' | 'batches') => void;
  onSelectLecture: (lecture: Lecture) => void;
  onSelectTeacher: (id: string) => void;
  onSelectInstitute: (id: string) => void;
}

export default function HomeDashboard({
  lectures,
  teachers,
  institutes,
  onViewAll,
  onSelectLecture,
  onSelectTeacher,
  onSelectInstitute
}: HomeDashboardProps) {
  // Personalized Stream Switch: NEET or JEE focus
  const [examFocus, setExamFocus] = useState<'NEET' | 'JEE'>('NEET');
  const [showDemoVideo, setShowDemoVideo] = useState(false);

  // Toggle Exam Focus
  const handleToggleFocus = () => {
    setExamFocus(prev => prev === 'NEET' ? 'JEE' : 'NEET');
  };

  // 1. FILTERING DATA BASED ON FOCUS
  // Filter and pick 5 lectures to represent "Continue Learning"
  const getContinueLearningLectures = () => {
    const list = lectures.filter(l => {
      const match = l.examType?.toUpperCase();
      if (examFocus === 'NEET') {
        return match?.includes('NEET') || l.subject?.toLowerCase() === 'biology' || l.subject?.toLowerCase() === 'chemistry';
      } else {
        return match?.includes('JEE') || l.subject?.toLowerCase() === 'mathematics' || l.subject?.toLowerCase() === 'physics';
      }
    });
    // Fallback if no direct subject matches
    const pool = list.length > 0 ? list : lectures;
    return pool.slice(0, 5).map((l, index) => ({
      ...l,
      // Inject simulated progress values for "Continue Learning" horizontal cards
      progress: [68, 42, 85, 15, 90][index % 5],
      totalLectures: [12, 8, 24, 16, 10][index % 5]
    }));
  };

  // Filter top 5 teachers this week
  const getTopTeachers = () => {
    const list = teachers.filter(t => {
      const examsStr = t.exams?.map(e => e.toUpperCase()).join(' ') || '';
      return examFocus === 'NEET' ? (examsStr.includes('NEET') || t.subject?.toLowerCase() === 'biology') : (examsStr.includes('JEE') || t.subject?.toLowerCase() === 'mathematics');
    });
    const pool = list.length > 0 ? list : teachers;
    return pool.slice(0, 5);
  };

  // Filter 4 mock test series matching stream
  const getMockTests = () => {
    const list = TEST_SERIES_CATALOG.filter((test: any) => {
      const tags = test.examTags?.map((tag: string) => tag.toUpperCase()) || [];
      return examFocus === 'NEET' ? tags.includes('NEET') : tags.includes('JEE MAIN') || tags.includes('JEE ADVANCED') || tags.includes('JEE');
    });
    return list.slice(0, 4);
  };

  // Filter featured channels/institutes
  const getFeaturedChannels = () => {
    return institutes.slice(0, 4); // Always pull the high level brands (PW, Allen, Unacademy, etc)
  };

  const continueLearningPool = getContinueLearningLectures();
  const topTeachersPool = getTopTeachers();
  const mockTestsPool = getMockTests();
  const featuredChannelsPool = getFeaturedChannels();

  // Demo play click action
  const handlePlayDemo = () => {
    // Pick the absolute first lecture or a standard youtube embed payload to display
    const demoLecture = lectures[0] || {
      id: 'demo_video',
      title: 'NEET/JEE General Chemistry Chapter 1 - High Yield Revision',
      description: 'Quick walkthrough of key foundational standards for chemistry entrance prep.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
      subject: 'Chemistry',
      examType: 'Both',
      contentType: 'lecture',
      teacherId: 'demo_teacher',
      teacherName: 'Senior Academic Faculty',
      duration: '45:10',
      viewsCount: 38200,
      likesCount: 1942,
      createdAt: new Date().toISOString()
    };
    onSelectLecture(demoLecture);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xs:px-5 py-4 space-y-9 pb-28 text-left font-sans select-none overflow-x-hidden">
      
      {/* SECTION 2: HERO BANNER */}
      <section id="biovised-premium-hero" className="relative w-full rounded-3xl border border-[#1A1A22] bg-gradient-to-br from-[#000000] via-[#101010] to-[#0F0F0F] shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 group">
        {/* Subtle decorative glowing background blur */}
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full filter blur-[80px] pointer-events-none group-hover:bg-white/8 transition-all duration-700" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-zinc-850/10 rounded-full filter blur-[60px] pointer-events-none" />

        {/* Hero Left Content */}
        <div className="flex-1 space-y-4 md:pr-4 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101010] border border-[#1A1A1A]">
            <Sparkles className="w-3 h-3 text-[#EEEEEE]" />
            <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
              {examFocus} Focus
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight uppercase font-sans">
            <span className="block text-zinc-500">DISCOVER.</span>
            <span className="block text-[#F4FEFF]">LEARN.</span>
            <span className="block text-white">GROW.</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans leading-relaxed max-w-lg">
            Track and master curriculum topics with validated, high-yield playlists, structured test series, verified Kota educator classes, and NEET/JEE strategic mock sets. Free from brand-funded bias.
          </p>
        </div>

        {/* Hero Right Content: Premium SVG Science/Orbit Illustration */}
        <div className="hidden md:flex items-center justify-center shrink-0 w-56 h-56 relative z-10 select-none">
          <svg viewBox="0 0 200 200" className="w-full h-full text-zinc-700">
            {/* Center core nucleus of learning */}
            <circle cx="100" cy="100" r="16" className="fill-[#101010] stroke-[#1A1A1A] stroke-2" />
            <circle cx="100" cy="100" r="8" className="fill-[#F4FEFF]" />
            
            {/* Outer orbits */}
            <ellipse cx="100" cy="100" rx="72" ry="24" transform="rotate(-30 100 100)" className="fill-none stroke-zinc-800 stroke-[1.5] animate-[spin_20s_linear_infinite]" />
            <ellipse cx="100" cy="100" rx="72" ry="24" transform="rotate(30 100 100)" className="fill-none stroke-zinc-800 stroke-[1.5]" />
            <ellipse cx="100" cy="100" rx="60" ry="34" transform="rotate(90 100 100)" className="fill-none stroke-white/10 stroke-[1]" />

            {/* Orbit electrons / markers */}
            <circle cx="48" cy="70" r="4.5" className="fill-white" />
            <circle cx="148" cy="120" r="3.5" className="fill-[#EEEEEE]" />
            <circle cx="100" cy="40" r="4" className="fill-zinc-500" />
            
            {/* Floating science items labels */}
            <text x="100" y="30" textAnchor="middle" className="fill-zinc-650 font-mono text-[8px] tracking-wider uppercase font-extrabold font-sans">PHYSICS</text>
            <text x="35" y="145" textAnchor="middle" className="fill-zinc-650 font-mono text-[8px] tracking-wider uppercase font-extrabold font-sans">BIO</text>
            <text x="165" y="145" textAnchor="middle" className="fill-zinc-650 font-mono text-[8px] tracking-wider uppercase font-extrabold font-sans">CHEM</text>
          </svg>
        </div>
      </section>

      {/* SECTION 4: CONTINUE LEARNING (LECTURE) */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider font-sans">
              Continue Learning
            </h3>
            <span className="text-[10px] font-bold text-zinc-500 px-2 py-0.5 rounded bg-zinc-950 font-mono">
              In-Progress
            </span>
          </div>
          <button
            onClick={() => onViewAll('lecture')}
            className="text-[10px] font-bold uppercase tracking-widest text-[#EEEEEE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {continueLearningPool.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900 rounded-2xl bg-[#000000]">
            No lecture modules loaded in database registry.
          </div>
        ) : (
          /* Horizontal scroll container with hidden scrollbar but standard swiping */
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none scroll-smooth">
            {continueLearningPool.map((item, idx) => {
              const videoId = item.youtubeVideoId || item.id;
              const hasThumbnail = !!item.thumbnailUrl;
              return (
                <div
                  key={item.id || idx}
                  onClick={() => onSelectLecture(item)}
                  className="w-[240px] xs:w-[270px] shrink-0 snap-start bg-[#101010] hover:bg-[#131313] border border-[#1A1A1A] hover:border-zinc-700 rounded-2xl overflow-hidden p-3.5 space-y-3 cursor-pointer shadow-md transition-all group duration-300"
                >
                  {/* Thumbnail area with duration + play overlay */}
                  <div className="relative w-full aspect-video rounded-xl bg-zinc-950 border border-zinc-900/60 overflow-hidden shrink-0">
                    <img 
                      src={item.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 group-hover:border-white group-hover:bg-white/10 flex items-center justify-center transition-colors">
                        <Play className="w-4 h-4 text-white group-hover:text-white fill-current pl-0.5" />
                      </div>
                    </div>
                    {/* Timestamp tag */}
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded font-mono text-[9px] text-zinc-350 tracking-wider">
                      {item.duration || '24:12'}
                    </div>
                  </div>

                  {/* Header labels */}
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        {item.subject}
                      </span>
                      <span className="text-[9px] text-[#A0A0A0] font-mono">
                        {item.totalLectures} Lectures Remaining
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white tracking-tight line-clamp-1 leading-snug uppercase pt-1">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-[#A0A0A0] font-sans truncate">
                      by <span className="text-white font-medium">{item.teacherName}</span>
                    </p>
                  </div>

                  {/* Progress indicator */}
                  <div className="space-y-1.5 pt-1.5 border-t border-[#1A1A1A]">
                    <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500">
                      <span className="uppercase">Progress</span>
                      <span className="text-zinc-300">{item.progress}%</span>
                    </div>
                    {/* Custom progress background with thin layout */}
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 5: TOP TEACHERS THIS WEEK (TEACHERS) */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider font-sans">
              Top Teachers This Week
            </h3>
            <span className="text-[10px] font-bold bg-zinc-900 text-white border border-zinc-800 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              <Award className="w-3 h-3" /> Kota Active List
            </span>
          </div>
          <button
            onClick={() => onViewAll('teachers')}
            className="text-[10px] font-bold uppercase tracking-widest text-[#EEEEEE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {topTeachersPool.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900 rounded-2xl bg-[#000000]">
            No verified mentor registry active this week.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none scroll-smooth">
            {topTeachersPool.map((teacher: any, index) => {
              const radius = 24;
              const circumference = 2 * Math.PI * radius;
              const accuracy = teacher?.accuracy || 0;
              const strokeDashoffset = circumference - (accuracy / 100) * circumference;

              return (
                <div
                  key={teacher?.id || index}
                  onClick={() => onSelectTeacher(teacher?.id || '')}
                  className="w-[200px] xs:w-[220px] shrink-0 snap-start bg-[#101010] hover:bg-[#131313] border border-[#1A1A1A] hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between gap-4 cursor-pointer shadow-md transition-all group duration-350 hover:-translate-y-0.5"
                >
                  {/* Card Header aligned to left, with golden star on high contrast pills at top right */}
                  <div className="flex justify-between items-start w-full">
                    <div className="text-left">
                      <SafeImage 
                        src={teacher?.avatar} 
                        alt={teacher?.name || 'Teacher'}
                        variant="avatar" 
                        className="shrink-0 w-12 h-12 rounded-full border border-zinc-800 group-hover:border-zinc-600 transition-colors"
                        fallbackInitials={teacher?.name ? teacher.name.slice(0, 2) : 'TR'} 
                      />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="text-[10px] font-mono font-bold">
                        {teacher?.rating || 0}
                      </span>
                    </div>
                  </div>

                  {/* Typography & Badges: dynamic subject capsule and name */}
                  <div className="space-y-1 text-left">
                    <span className="inline-block px-2 py-0.5 rounded bg-zinc-950 text-[9px] text-zinc-400 font-bold tracking-wide uppercase font-mono">
                      {teacher?.subject}
                    </span>
                    <h4 className="text-xs font-bold text-white tracking-tight uppercase truncate leading-tight mt-0.5">
                      {teacher?.name}
                    </h4>
                  </div>

                  {/* Progress Graphic: vivid green SVG circular progress ring */}
                  <div className="flex justify-center items-center py-1">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          className="stroke-zinc-900"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          className="stroke-emerald-500 transition-all duration-500"
                          strokeWidth="3.5"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-[10px] font-extrabold text-white">
                        {accuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Bottom Statistics & Actions */}
                  <div className="space-y-3">
                    {/* Metrics row */}
                    <div className="flex justify-around items-center text-zinc-400 border-t border-zinc-900/60 pt-2.5">
                      <div className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span className="text-[10px] font-mono font-medium">{teacher?.videoCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 stroke-[1.5]" />
                        <span className="text-[10px] font-mono font-medium">{teacher?.followersCount || 0}</span>
                      </div>
                    </div>

                    {/* Stack three distinct horizontal action buttons side-by-side */}
                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          console.log('Follow clicked for', teacher?.name);
                        }}
                        className="flex-1 px-2 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-bold rounded-full transition-all uppercase tracking-wide cursor-pointer font-sans text-center"
                      >
                        Follow
                      </button>
                      <button
                        onClick={() => onSelectTeacher(teacher?.id || '')}
                        className="flex-1 px-2 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-350 text-[9px] font-bold rounded-full transition-all uppercase tracking-wide cursor-pointer backdrop-blur border border-zinc-850 text-center"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          console.log('Contact clicked for', teacher?.name);
                        }}
                        className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800 shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 6: MOCK TEST SERIES (TESTS) */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider font-sans">
              Test Series
            </h3>
            <span className="text-[10px] font-bold text-zinc-500 px-2 py-0.5 rounded bg-zinc-950 font-mono">
              Syllabus-mapped
            </span>
          </div>
          <button
            onClick={() => onViewAll('tests')}
            className="text-[10px] font-bold uppercase tracking-widest text-[#EEEEEE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {mockTestsPool.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900 rounded-2xl bg-[#000000]">
            No mock test series catalogs loaded in database.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockTestsPool.map((test, idx) => {
              const isFree = test.price === 'free' || test.price === 'bundled' || ((test.price as any)?.amount === 0);
              return (
                <div
                  key={test.id || idx}
                  className="bg-[#101010] hover:bg-[#131313] border border-[#1A1A1A] hover:border-zinc-700 rounded-2xl p-4.5 flex flex-col justify-between gap-4 cursor-pointer shadow-md transition-all group duration-300"
                  onClick={() => onViewAll('tests')}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="space-y-1 text-left min-w-0">
                      {/* Subject tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[8.5px] font-extrabold text-white uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {test.examTags?.[0] || 'NEET'}
                        </span>
                        <span className="text-[8.5px] font-extrabold text-zinc-400 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {test.type === 'online' ? 'Online CBT' : 'OMR Offline'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight uppercase line-clamp-1 group-hover:text-white transition-colors leading-snug pt-1">
                        {test.name}
                      </h4>
                      <p className="text-[10px] text-zinc-550 font-mono">
                        Provider: <span className="text-zinc-400 font-bold">{test.provider}</span>
                      </p>
                    </div>

                    {/* Price stamp badge */}
                    <span className={`px-2 py-1 rounded font-mono text-[9px] font-extrabold uppercase ${
                      isFree 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'bg-zinc-900 text-zinc-350 border border-zinc-800'
                    }`}>
                      {isFree ? 'Free to Unlock' : `₹${(test.price as any)?.amount || '499'}`}
                    </span>
                  </div>

                  {/* Test description summaries */}
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed text-left line-clamp-2">
                    {test.shortDescription}
                  </p>

                  {/* Summary parameters and Unlock button */}
                  <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-between w-full">
                    {/* Specs metrics */}
                    <div className="flex items-center gap-4 text-zinc-400 text-[10px] font-mono font-bold">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{test.testCount} Tests</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{test.validity || '12 Months'}</span>
                      </div>
                    </div>

                    {/* Immediate Action element */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewAll('tests');
                      }}
                      className="px-3.5 py-1.5 bg-zinc-900 border border-[#1A1A1A] hover:border-zinc-700 text-zinc-100 hover:text-white group-hover:bg-white/10 group-hover:text-white transition-all text-[9.5px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 px-3 ml-2 shrink-0"
                    >
                      {isFree ? (
                        <>
                          <Unlock className="w-3 h-3 text-white" /> Start Test
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Get Pass
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 7: FEATURED CHANNELS */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider font-sans">
              YT Channel
            </h3>
          </div>
          <button
            onClick={() => onViewAll('institutes')}
            className="text-[10px] font-bold uppercase tracking-widest text-[#EEEEEE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {featuredChannelsPool.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900 rounded-2xl bg-[#000000]">
            No premium learning institutes online.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredChannelsPool.map((channel, idx) => {
              return (
                <div
                  key={channel.id || idx}
                  onClick={() => onSelectInstitute(channel.id)}
                  className="bg-[#101010] hover:bg-[#131313] border border-[#1A1A1A] hover:border-zinc-700 rounded-2xl p-4.5 flex flex-col items-center text-center gap-3 cursor-pointer shadow-md transition-all group duration-300 hover:-translate-y-0.5"
                >
                  {/* Brand Channel Logo layout */}
                  <div className="relative w-14 h-14 rounded-2xl border-2 border-zinc-850 group-hover:border-white overflow-hidden bg-zinc-950 flex items-center justify-center transition-colors">
                    <img 
                      src={channel.logo} 
                      alt={channel.name} 
                      className="w-full h-full object-cover p-1"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Channel details tags */}
                  <div className="space-y-0.5 text-center min-w-0 w-full">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate flex items-center justify-center gap-1 uppercase">
                      <span>{channel.name}</span>
                      {channel.isVerified !== false && (
                        <CheckCircle className="w-3.5 h-3.5 text-white fill-current text-black stroke-[2.5] shrink-0" />
                      )}
                    </h4>
                    <p className="text-[9px] text-zinc-500 font-mono tracking-wide uppercase">
                      Verified Brand
                    </p>
                  </div>

                  {/* Trust indicator review metrics */}
                  <div className="pt-2.5 w-full border-t border-[#1A1A1A] flex items-center justify-between text-[10px] font-mono font-bold">
                    <div className="flex items-center gap-1 font-sans">
                      <Star className="w-3 h-3 text-[#FFEFD5] fill-[#FFEFD5]" />
                      <span className="text-zinc-200">{channel.rating || '4.6'}</span>
                    </div>
                    <span className="text-[#EEEEEE]">
                      {channel.trustScore || '94'}% Trust
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>



    </div>
  );
}
