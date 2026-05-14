const PHASES = {
  WORK: 'work',
  SHORT_BREAK: 'short-break',
  LONG_BREAK: 'long-break',
};

const POMODOROS_BEFORE_LONG = 4;

/**
 * @param {{
 *   onTick: (remaining: number, total: number) => void,
 *   onComplete: (phase: string) => void,
 *   onPhaseChange: (phase: string) => void
 * }} callbacks
 */
export function createTimer(callbacks) {
  let phase = PHASES.WORK;
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let isRunning = false;
  let intervalId = null;
  let completedPomodoros = 0;

  let workMinutes = 25;
  let shortBreakMinutes = 5;
  let longBreakMinutes = 15;

  function setDurations(work, shortBreak, longBreak) {
    workMinutes = work;
    shortBreakMinutes = shortBreak;
    longBreakMinutes = longBreak;
  }

  function setPhase(newPhase) {
    stop();
    phase = newPhase;
    const minutes = phase === PHASES.WORK
      ? workMinutes
      : phase === PHASES.SHORT_BREAK
        ? shortBreakMinutes
        : longBreakMinutes;
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    callbacks.onPhaseChange(phase);
    callbacks.onTick(remainingSeconds, totalSeconds);
  }

  function stop() {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    if (remainingSeconds <= 0) {
      stop();
      callbacks.onComplete(phase);
      return;
    }
    remainingSeconds--;
    callbacks.onTick(remainingSeconds, totalSeconds);
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      intervalId = setInterval(tick, 1000);
    },

    pause() {
      stop();
    },

    reset() {
      stop();
      const minutes = phase === PHASES.WORK
        ? workMinutes
        : phase === PHASES.SHORT_BREAK
          ? shortBreakMinutes
          : longBreakMinutes;
      totalSeconds = minutes * 60;
      remainingSeconds = totalSeconds;
      callbacks.onTick(remainingSeconds, totalSeconds);
    },

    setPhase(newPhase) {
      setPhase(newPhase);
    },

    advanceAfterComplete() {
      if (phase === PHASES.WORK) {
        completedPomodoros++;
        if (completedPomodoros % POMODOROS_BEFORE_LONG === 0) {
          setPhase(PHASES.LONG_BREAK);
        } else {
          setPhase(PHASES.SHORT_BREAK);
        }
      } else {
        setPhase(PHASES.WORK);
      }
    },

    setDurations,

    getState() {
      return {
        phase,
        totalSeconds,
        remainingSeconds,
        isRunning,
        completedPomodoros,
      };
    },

    getPhase() {
      return phase;
    },

    getIsRunning() {
      return isRunning;
    },

    getCompletedPomodoros() {
      return completedPomodoros;
    },

    incrementCompletedPomodoros() {
      completedPomodoros++;
    },
  };
}

export { PHASES };
