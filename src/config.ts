/**
 * App-wide configuration. Edit these values and rebuild.
 */
export const CONFIG = {
  /** PIN for the hidden /teacher page. Change it before sharing the link with learners. */
  TEACHER_PIN: '1234',
  /** Default Paper 1 mock timer in minutes (0 = no timer). The teacher page can override this per tablet. */
  DEFAULT_MOCK_MINUTES: 50,
  /** Shuffle Paper 1 mock questions by default. The teacher page can override this per tablet. */
  DEFAULT_SHUFFLE: false,
  /** Accepted relative tolerance for calculation answers (0.01 = plus or minus 1%). */
  CALC_TOLERANCE: 0.01,
  SCHOOL: 'Koase STEM SHS',
  APP_NAME: 'WASSCE Robotics Practice',
} as const;
