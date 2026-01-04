
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Exercise {
  id: string;
  name: string;
  completed: boolean;
  isHero?: boolean;
}

export interface DayPlan {
  dateKey: string; // YYYY-MM-DD
  exercises: Exercise[];
  bonusAwarded?: boolean;
}

export interface AppState {
  workouts: Record<string, Exercise[]>; // dateKey -> exercises
  totalPoints: number;
  currentStreak: number;
  streakGoal: number;
}

export interface Artifact {
  id: string;
  html: string;
  styleName: string;
  status: 'streaming' | 'completed';
}
