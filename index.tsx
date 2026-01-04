
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Exercise } from './types';
import { WEEKDAYS, DAILY_HERO_EXERCISES, DAY_COLORS } from './constants';
import { generateId } from './utils';
import { ShareIcon } from './components/Icons';

const POINTS_PER_EXERCISE = 10;
const BONUS_PER_DAY = 30;

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    dayName: WEEKDAYS[date.getDay()],
    dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
    year: y
  };
};

const Celebration = () => (
  <div className="celebration-overlay">
    <div className="confetti-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="confetti" style={{ 
          left: `${Math.random() * 100}%`, 
          animationDelay: `${Math.random() * 2}s`,
          backgroundColor: DAY_COLORS[Math.floor(Math.random() * DAY_COLORS.length)],
          borderRadius: Math.random() > 0.5 ? '50%' : '2px'
        }} />
      ))}
    </div>
  </div>
);

function App() {
  const [workouts, setWorkouts] = useState<Record<string, { exercises: Exercise[], bonusAwarded?: boolean }>>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pointPopup, setPointPopup] = useState<{id: number, val: number} | null>(null);

  // Generate all days for 2026
  const allDays2026 = useMemo(() => {
    const dates = [];
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    let current = new Date(start);
    while (current <= end) {
      dates.push(getDateKey(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('evans-exercises-v4');
    if (saved) {
      const data = JSON.parse(saved);
      setWorkouts(data.workouts || {});
      setTotalPoints(data.totalPoints || 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('evans-exercises-v4', JSON.stringify({
      workouts,
      totalPoints,
    }));
  }, [workouts, totalPoints]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let checkDate = new Date(today);
    const todayKey = getDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday);
    
    if (!workouts[todayKey]?.bonusAwarded && !workouts[yesterdayKey]?.bonusAwarded) {
      return 0;
    }

    if (!workouts[todayKey]?.bonusAwarded) {
      checkDate = yesterday;
    }

    while (true) {
      const key = getDateKey(checkDate);
      if (workouts[key]?.bonusAwarded) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [workouts]);

  const getDayData = (dateKey: string) => {
    if (workouts[dateKey]) return workouts[dateKey];
    return {
      exercises: DAILY_HERO_EXERCISES.map(name => ({
        id: generateId(),
        name,
        completed: false,
        isHero: true
      })),
      bonusAwarded: false
    };
  };

  const showPoints = (val: number) => {
    setPointPopup({ id: Date.now(), val });
    setTimeout(() => setPointPopup(null), 1000);
  };

  const toggleExercise = (dateKey: string, exerciseId: string) => {
    const dayData = getDayData(dateKey);
    const newList = dayData.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const completed = !ex.completed;
        if (completed) {
          setTotalPoints(p => p + POINTS_PER_EXERCISE);
          showPoints(POINTS_PER_EXERCISE);
        } else {
          setTotalPoints(p => Math.max(0, p - POINTS_PER_EXERCISE));
        }
        return { ...ex, completed };
      }
      return ex;
    });

    setWorkouts(prev => ({ 
      ...prev, 
      [dateKey]: { 
        ...dayData, 
        exercises: newList 
      } 
    }));
  };

  const collectBonus = (dateKey: string) => {
    const dayData = getDayData(dateKey);
    if (dayData.bonusAwarded) return;
    
    const completedCount = dayData.exercises.filter(e => e.completed).length;
    if (completedCount < 4) return;

    setTotalPoints(p => p + BONUS_PER_DAY);
    showPoints(BONUS_PER_DAY);
    triggerCelebration();

    setWorkouts(prev => ({
      ...prev,
      [dateKey]: {
        ...dayData,
        bonusAwarded: true
      }
    }));

    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  };

  const addExercise = (dateKey: string, name: string) => {
    if (!name.trim()) return;
    const dayData = getDayData(dateKey);
    const newList = [...dayData.exercises, {
      id: generateId(),
      name: name.trim(),
      completed: false,
      isHero: false
    }];
    setWorkouts(prev => ({ 
      ...prev, 
      [dateKey]: { 
        ...dayData, 
        exercises: newList 
      } 
    }));
  };

  const removeExercise = (dateKey: string, exerciseId: string) => {
    const dayData = getDayData(dateKey);
    const newList = dayData.exercises.filter(ex => ex.id !== exerciseId);
    setWorkouts(prev => ({ 
      ...prev, 
      [dateKey]: { 
        ...dayData, 
        exercises: newList 
      } 
    }));
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const sendStreakText = () => {
    const text = `I have a ${currentStreak} day streak on Evan's Exercises! ⭐ Can you beat it?`;
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  const sendReminderText = () => {
    const text = `Hey! Don't forget to do your Evan's Exercises today! 🚀 Let's stay strong!`;
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  const goToToday = () => {
    const todayKey = getDateKey(new Date());
    const element = document.getElementById(`day-${todayKey}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="app-shell">
      {showCelebration && <Celebration />}
      
      <div className="sticky-top">
        <div className="stats-bar">
          <div className="stats-side left">
            <div className="streak-tracker">
              <span className="stat-icon">🔥</span>
              <div className="stat-details">
                <span className="stat-label">STREAK</span>
                <span className="stat-value">{currentStreak}</span>
              </div>
            </div>
            <button className="share-btn streak-btn" onClick={sendStreakText}>
              <ShareIcon /> Share Streak
            </button>
          </div>

          <div className="stats-center">
            <button className="today-btn" onClick={goToToday}>
              Go to Today 📅
            </button>
          </div>

          <div className="stats-side right">
            <button className="share-btn reminder-btn" onClick={sendReminderText}>
               🔔 Remind Friends
            </button>
            <div className="points-tracker">
              {pointPopup && <div className="point-popup">+{pointPopup.val}</div>}
              <div className="stat-details text-right">
                <span className="stat-label">POWER XP</span>
                <span className="stat-value">{totalPoints.toLocaleString()}</span>
              </div>
              <span className="stat-icon star-rotate">⭐</span>
            </div>
          </div>
        </div>
      </div>

      <header className="hero-header">
        <h1>Evan's Exercises</h1>
      </header>

      <main className="calendar-grid">
        {allDays2026.map((dateKey, idx) => {
          const display = formatDateDisplay(dateKey);
          const dayData = getDayData(dateKey);
          const exList = dayData.exercises;
          const bonusCollected = dayData.bonusAwarded;
          const completedCount = exList.filter(e => e.completed).length;
          const canCollectBonus = completedCount >= 4 && !bonusCollected;
          
          return (
            <div 
              key={dateKey} 
              id={`day-${dateKey}`}
              className={`day-card ${bonusCollected ? 'day-complete' : ''}`} 
              style={{ '--accent': DAY_COLORS[idx % DAY_COLORS.length] } as any}
            >
              <div className="day-header" style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}>
                <h2>{display.dayName}</h2>
                <span className="date-subtitle">{display.dateStr}</span>
              </div>
              
              <div className="exercise-list">
                {exList.map(ex => (
                  <div key={ex.id} className={`exercise-item ${ex.completed ? 'is-completed' : ''}`}>
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={ex.completed} 
                        onChange={() => toggleExercise(dateKey, ex.id)}
                      />
                      <span className="checkmark"></span>
                      <div className="exercise-text-group">
                        <span className="exercise-name">{ex.name}</span>
                        <span className="pts-badge">+10 pts</span>
                      </div>
                    </label>
                    <div className="fun-decor">
                       {ex.completed ? '⭐' : '✨'}
                    </div>
                    <button className="delete-btn" onClick={() => removeExercise(dateKey, ex.id)} title="Remove Exercise">✖</button>
                  </div>
                ))}
              </div>

              <div className="day-bonus-zone">
                {bonusCollected ? (
                  <div className="bonus-pill earned">
                    🏆 DAY BONUS EARNED!
                  </div>
                ) : (
                  <button 
                    className={`collect-bonus-btn ${canCollectBonus ? 'ready' : ''}`}
                    disabled={!canCollectBonus}
                    onClick={() => collectBonus(dateKey)}
                  >
                    {canCollectBonus ? '🟢 Collect Daily Bonus!' : `🎁 Bonus: +${BONUS_PER_DAY} XP`}
                  </button>
                )}
              </div>

              <div className="add-zone">
                <input 
                  type="text" 
                  placeholder="New Power?" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addExercise(dateKey, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button className="add-btn" onClick={(e) => {
                  const i = (e.currentTarget.previousSibling as HTMLInputElement);
                  addExercise(dateKey, i.value);
                  i.value = '';
                }}>+</button>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="hub-footer">
        <p className="footer-note">Super Strong Since 2026! 🚀</p>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
