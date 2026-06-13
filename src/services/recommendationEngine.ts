import { TeacherProfile, InstituteProfile, Lecture, Playlist, WatchHistoryItem, UserProfile } from '../types';

export interface RecommendationResult {
  continueWatching: (WatchHistoryItem & { lectureDetail?: Lecture })[];
  personalizedFeed: Lecture[];
  trendingLectures: Lecture[];
  trendingPlaylists: Playlist[];
  subjectRecommendations: {
    [examType: string]: {
      lectures: Lecture[];
      playlists: Playlist[];
    };
  };
}

/**
 * Clean deterministic recommendation engine operating on direct verification data.
 */
export class RecommendationEngine {
  /**
   * Filters and associates watch history progress items for unfinished sessions.
   */
  static getContinueWatching(
    history: WatchHistoryItem[],
    lectures: Lecture[]
  ): (WatchHistoryItem & { lectureDetail?: Lecture })[] {
    // Sort by recent update and filter out completed or legacy empty items
    return history
      .filter((h) => !h.completed && h.progressSeconds > 1)
      .map((item) => {
        const detail = lectures.find((l) => l.id === item.lectureId);
        return {
          ...item,
          lectureDetail: detail,
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Builds a personalized feed based on user preferences, followed educators, and trusted scores.
   */
  static getPersonalizedFeed(
    user: UserProfile | null,
    followedTeachers: string[],
    lectures: Lecture[],
    likedLectureIds: string[] = []
  ): Lecture[] {
    const scoredLectures = lectures.map((lecture) => {
      let score = 0;

      // 1. Followed educators boost
      if (followedTeachers.includes(lecture.teacherId)) {
        score += 500;
      }

      // 2. Exam Stream Match of the User
      if (user) {
        if (user.examType === 'Both') {
          score += 100;
        } else if (lecture.examType === user.examType || lecture.examType === 'Both') {
          score += 200;
        }
      }

      // 3. User interaction category boost
      const likedLecturesInCategory = lectures.filter(
        (l) => likedLectureIds.includes(l.id) && l.subject === lecture.subject
      );
      score += likedLecturesInCategory.length * 50;

      // 4. Verification/Views popularity metrics scaling
      score += Math.min(150, lecture.viewsCount / 5000);
      score += Math.min(100, lecture.likesCount / 500);

      return { lecture, score };
    });

    // Return sorted lectures
    return scoredLectures
      .sort((a, b) => b.score - a.score)
      .map((item) => item.lecture);
  }

  /**
   * Identifies trending streamable lessons and playlists based on popularity scoring.
   */
  static getTrending(
    lectures: Lecture[],
    playlists: Playlist[]
  ): { lectures: Lecture[]; playlists: Playlist[] } {
    const trendingLectures = [...lectures]
      .sort((a, b) => {
        const scoreA = a.viewsCount + a.likesCount * 10;
        const scoreB = b.viewsCount + b.likesCount * 10;
        return scoreB - scoreA;
      })
      .slice(0, 8);

    const trendingPlaylists = [...playlists]
      .sort((a, b) => b.lecturesCount - a.lecturesCount)
      .slice(0, 4);

    return { lectures: trendingLectures, playlists: trendingPlaylists };
  }

  /**
   * Segment recommendations dynamically across major examination channels.
   */
  static getSubjectBasedRecommendations(
    lectures: Lecture[],
    playlists: Playlist[]
  ): { [examType: string]: { lectures: Lecture[]; playlists: Playlist[] } } {
    const exams = ['JEE', 'NEET'];
    const result: { [examType: string]: { lectures: Lecture[]; playlists: Playlist[] } } = {};

    exams.forEach((exam) => {
      // Direct exam match or Both
      const matchingLectures = lectures.filter(
        (l) => l.examType.toUpperCase() === exam.toUpperCase() || l.examType === 'Both'
      ).sort((a, b) => b.viewsCount - a.viewsCount);

      const matchingPlaylists = playlists.filter(
        (p) => p.examType.toUpperCase() === exam.toUpperCase() || p.examType === 'Both'
      );

      result[exam] = {
        lectures: matchingLectures,
        playlists: matchingPlaylists,
      };
    });

    return result;
  }

  /**
   * Generate related contents (such as teachers, lectures, and playlists) for active view items.
   */
  static getRelatedContent(
    activeLecture: Lecture,
    lectures: Lecture[],
    playlists: Playlist[],
    teachers: TeacherProfile[],
    institutes: InstituteProfile[]
  ): {
    teachers: TeacherProfile[];
    institutes: InstituteProfile[];
    lectures: Lecture[];
    playlists: Playlist[];
  } {
    // 1. Same subject or exam stream educators
    const relatedTeachers = teachers
      .filter(
        (t) =>
          t.id !== activeLecture.teacherId &&
          (t.subject === activeLecture.subject || t.exams.some((ex) => ex === activeLecture.examType))
      )
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 3);

    // 2. Same exam streaming institutes
    const relatedInstitutes = institutes
      .filter((inst) => inst.exams.some((ex) => ex === activeLecture.examType || activeLecture.examType === 'Both'))
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 3);

    // 3. Similar lectures of same teacher/subject, excluding the original
    const relatedLectures = lectures
      .filter(
        (l) =>
          l.id !== activeLecture.id &&
          (l.teacherId === activeLecture.teacherId || l.subject === activeLecture.subject)
      )
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 4);

    // 4. Playlists of the same teacher or matching subject
    const relatedPlaylists = playlists
      .filter((p) => p.teacherId === activeLecture.teacherId || p.subject === activeLecture.subject)
      .slice(0, 2);

    return {
      teachers: relatedTeachers,
      institutes: relatedInstitutes,
      lectures: relatedLectures,
      playlists: relatedPlaylists,
    };
  }
}
