/**
 * App-wide configuration. Edit these values and rebuild.
 */
export const CONFIG = {
  /**
   * Where learner progress is stored:
   *   'firebase': learners sign in (name, class, 6-digit PIN); progress follows them to any device.
   *   'local':    no sign-in; progress stays on each tablet (localStorage).
   */
  STORAGE: 'firebase' as 'firebase' | 'local',
  /** PIN for the hidden /teacher page in 'local' mode. In 'firebase' mode teachers sign in instead. */
  TEACHER_PIN: '5454',
  /** Default Paper 1 mock timer in minutes (0 = no timer). The teacher page can override this per tablet. */
  DEFAULT_MOCK_MINUTES: 50,
  /** Shuffle Paper 1 mock questions by default. The teacher page can override this per tablet. */
  DEFAULT_SHUFFLE: false,
  /** Accepted relative tolerance for calculation answers (0.01 = plus or minus 1%). */
  CALC_TOLERANCE: 0.01,
  /**
   * First day of the WASSCE Robotics papers, for the countdown on the home page (YYYY-MM-DD).
   * ESTIMATE: replace with the date on the official WAEC timetable when it is published.
   */
  WASSCE_DATE: '2027-05-03',
  WASSCE_LABEL: 'Robotics, May/June 2027',
  SCHOOL: 'Koase STEM SHS',
  APP_NAME: 'WASSCE Robotics Practice',
} as const;
