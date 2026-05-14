import { playAlert } from './sound.js';
import { createTimer } from './timer.js';
import { createTaskStore } from './taskStore.js';
import { createUI } from './ui.js';
import { createDialog } from './dialog.js';

async function main() {
  const store = await createTaskStore();
  const dialog = createDialog();

  const timer = createTimer({
    onTick(remaining, total) {
      ui.updateTimerDisplay(remaining, total);
    },

    onComplete(phase) {
      playAlert();

      if (phase === 'work') {
        const active = store.getActive();
        if (active) {
          const newCount = active.completedPomodoros + 1;
          store.update(active.id, { completedPomodoros: newCount });
          store.addHistory(active.id, active.name);
        }
        ui.updateStats();
        ui.renderTaskList();
      }

      const completedCount = timer.getCompletedPomodoros() + 1;
      if (phase === 'work') {
        if (completedCount % 4 === 0) {
          window.api.notification.send('长休息', '完成 ' + completedCount + ' 个番茄！休息 15 分钟');
        } else {
          window.api.notification.send('短休息', '休息 5 分钟');
        }
      } else {
        window.api.notification.send('休息结束', '准备开始新的番茄');
      }

      timer.advanceAfterComplete();
      ui.setStartBtnText('开始');
    },

    onPhaseChange(phase) {
      ui.updatePhaseDisplay(phase);
      ui.updateTimerDisplay(0, timer.getState().totalSeconds);
    },
  });

  const ui = createUI(store, timer, dialog);

  // Initialize timer with active task durations
  const active = store.getActive();
  if (active) {
    timer.setDurations(active.workMinutes, active.shortBreakMinutes, active.longBreakMinutes);
  }
  timer.setPhase('work');

  // Start/Pause button
  ui.getStartBtn().addEventListener('click', () => {
    const activeTask = store.getActive();
    if (!activeTask) {
      ui.getStartBtn().textContent = '请先选择任务';
      setTimeout(() => { ui.getStartBtn().textContent = '开始'; }, 1500);
      return;
    }

    if (timer.getIsRunning()) {
      timer.pause();
      ui.setStartBtnText('继续');
    } else {
      timer.start();
      ui.setStartBtnText('暂停');
    }
  });

  // Reset button
  ui.getResetBtn().addEventListener('click', () => {
    timer.pause();
    timer.reset();
    ui.setStartBtnText('开始');
  });

  // Minimize button
  document.getElementById('minimizeBtn').addEventListener('click', () => {
    window.api.window.minimize();
  });

  // Close button — show confirmation dialog
  document.getElementById('closeBtn').addEventListener('click', () => {
    ui.showCloseDialog();
  });

  // Close dialog — minimize to tray
  document.getElementById('closeDialogMinimize').addEventListener('click', () => {
    ui.hideCloseDialog();
    window.api.window.minimize();
  });

  // Close dialog — confirm exit
  document.getElementById('closeDialogConfirm').addEventListener('click', () => {
    window.api.window.close();
  });
}

main();
