import { Playlist, Lecture } from '../types';

const mappings: Record<string, string> = {
  'play_pw_alakh_pace_ktg': '9Bv_M6e8858',
  'play_jw_units': 'O3_D7T6z-fE',
  'play_jw_basic_math': 'X9bZ3c0s6Z0',
  'play_jw_mechanics_rj': '5H8H69Wz01k',
  'play_pw_botany_30d': 'bVbU1E_UqK0',
  'play_pw_neet_mindmaps': 'g4J3Wq_S7Fk',
  'play_comp_kinematics': 'lA9K8T4Gf7Y',
  'play_comp_goc': '0_d_D91cDwU',
  'play_comp_maths_notes': 'z86-ja0PSn0',
  'play_res_jee_celebration': 'Ltbn_ZF-pDs',
  'play_unac_current': 'IqP3r6O8LGs',
  'play_unac_amines': 'Djq88Ndp2A0',
  'play_unac_living': 'g4J3Wq_S7Fk',
  'play_unac_phys_journey': 'O3_D7T6z-fE',
  'play_unac_toppers_ioc': '0_d_D91cDwU',
  'play_ved_adv_kinematics': '1_W4rW9PUpA',
  'play_ved_physical_formula': '0_d_D91cDwU',
  'play_ved_redox': '0_d_D91cDwU',
  'play_ved_stats': 'z86-ja0PSn0',
  'play_ved_cell_life': 'g4J3Wq_S7Fk',
  'play_ved_biotonic_microbes': 'g4J3Wq_S7Fk',
  'play_neetprep_bio_revision': 'g4J3Wq_S7Fk',
  'play_neetprep_expected': '9Bv_M6e8858',
  'play_neetprep_genetics': 'bVbU1E_UqK0',
  'play_neetprep_rotational': '1_W4rW9PUpA',
  'play_allen_sir': 'O3_D7T6z-fE',
  'play_mat_jee2027': 'lA9K8T4Gf7Y',
  'play_motion_chemical_bonding': '0_d_D91cDwU',
  'play_motion_electrochemistry': '0_d_D91cDwU',
  'play_motion_abhyaas_physics': '9Bv_M6e8858',
  'play_doubtnut_neet_hindi': 'g4J3Wq_S7Fk',
  'play_aakash_nuclei': '1_W4rW9PUpA',
  'play_etoos_botany_oneshots': 'bVbU1E_UqK0',
  'play_learn_thermodynamics': '0_d_D91cDwU',
  'play_examrace_higher': 'lA9K8T4Gf7Y',
  'play_atpstar_concepts': 'O3_D7T6z-fE',
  'play_khan_metals': '0_d_D91cDwU',
  'play_esaral_complex': 'Djq88Ndp2A0',
  'play_esaral_neet_prep': 'g4J3Wq_S7Fk',
  'play_galaxy_rigid': '1_W4rW9PUpA',
  'play_vora_quadratic': 'Djq88Ndp2A0',
  'play_apni_goc': '0_d_D91cDwU',
  'play_biomentors_repeaters': 'g4J3Wq_S7Fk',
  'play_bewise_goc': '0_d_D91cDwU',
  'play_ssp_expected': '9Bv_M6e8858'
};

export const getPlaylistThumbnail = (playlist: Playlist): string => {
  if (playlist.thumbnailUrl && (playlist.thumbnailUrl.includes('ytimg.com') || playlist.thumbnailUrl.includes('googleusercontent.com') || playlist.thumbnailUrl.includes('youtube.543269865'))) {
    return playlist.thumbnailUrl;
  }

  const mappedVideoId = mappings[playlist.id] || (playlist.youtubePlaylistId ? mappings[playlist.youtubePlaylistId] : null);
  if (mappedVideoId) {
    return `https://img.youtube.com/vi/${mappedVideoId}/hqdefault.jpg`;
  }

  const subject = (playlist.subject || 'Physics').toLowerCase();
  if (subject.includes('biology') || subject.includes('botany') || subject.includes('zoology')) {
    return `https://img.youtube.com/vi/g4J3Wq_S7Fk/hqdefault.jpg`;
  } else if (subject.includes('chemistry') || subject.includes('organic') || subject.includes('inorganic')) {
    return `https://img.youtube.com/vi/0_d_D91cDwU/hqdefault.jpg`;
  } else if (subject.includes('math') || subject.includes('calc')) {
    return `https://img.youtube.com/vi/lA9K8T4Gf7Y/hqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/9Bv_M6e8858/hqdefault.jpg`;
};

export const getLectureThumbnail = (lec: Lecture): string => {
  if (lec.thumbnailUrl && (lec.thumbnailUrl.includes('ytimg.com') || lec.thumbnailUrl.includes('youtube.543269865') || lec.thumbnailUrl.includes('googleusercontent.com'))) {
    return lec.thumbnailUrl;
  }

  if (lec.id && lec.id.length === 11 && !lec.id.includes('/') && !lec.id.includes('?')) {
    return `https://img.youtube.com/vi/${lec.id}/hqdefault.jpg`;
  }

  if (lec.videoUrl) {
    const embedMatch = lec.videoUrl.match(/embed\/([^?]+)/);
    if (embedMatch && embedMatch[1] && embedMatch[1].length === 11) {
      return `https://img.youtube.com/vi/${embedMatch[1]}/hqdefault.jpg`;
    }
    const watchMatch = lec.videoUrl.match(/v=([^&]+)/);
    if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
      return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
    }
  }

  if (lec.playlistId && mappings[lec.playlistId]) {
    return `https://img.youtube.com/vi/${mappings[lec.playlistId]}/hqdefault.jpg`;
  }

  const subject = (lec.subject || 'Physics').toLowerCase();
  if (subject.includes('biology') || subject.includes('botany') || subject.includes('zoology')) {
    return `https://img.youtube.com/vi/g4J3Wq_S7Fk/hqdefault.jpg`;
  } else if (subject.includes('chemistry') || subject.includes('organic') || subject.includes('inorganic')) {
    return `https://img.youtube.com/vi/0_d_D91cDwU/hqdefault.jpg`;
  } else if (subject.includes('math') || subject.includes('calc')) {
    return `https://img.youtube.com/vi/lA9K8T4Gf7Y/hqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/9Bv_M6e8858/hqdefault.jpg`;
};
