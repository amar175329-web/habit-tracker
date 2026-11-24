/**
 * Centralized streak calculation and badge milestones for Habbitrack / DailyOS.
 */
export {
  BADGE_MILESTONES,
  getNextAward,
  isCelebrationMilestone,
  shouldCelebrateStreak,
  getShownMilestones,
  recordMilestoneShown,
  clearShownMilestones,
  calculateHabitBestStreak,
  getLastCelebrationDate,
  setLastCelebrationDate,
  saveShownMilestone,
  type ShouldCelebrateOptions,
} from "./streakMilestones";

export {
  STREAK_BADGES,
  streakDays,
  calculateOverallStreak,
  isHabitActiveOnDate,
} from "./habitRules";
