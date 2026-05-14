const RING_CIRCUMFERENCE = 565.48;

const PHASE_LABELS = {
  'work': '工作中',
  'short-break': '短休息',
  'long-break': '长休息',
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * @param {object} store - taskStore instance
 * @param {object} timer - timer instance
 * @param {object} dialog - dialog instance
 */
export function createUI(store, timer, dialog) {
  const els = {
    statusLabel: document.getElementById('statusLabel'),
    timerDisplay: document.getElementById('timerDisplay'),
    ringProgress: document.getElementById('ringProgress'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    todayCount: document.getElementById('todayCount'),
    taskList: document.getElementById('taskList'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    noTaskHint: document.getElementById('noTaskHint'),
    emptyListHint: document.getElementById('emptyListHint'),
    closeDialogOverlay: document.getElementById('closeDialogOverlay'),
  };

  function updateTimerDisplay(remaining, total) {
    els.timerDisplay.textContent = formatTime(remaining);
    const progress = 1 - remaining / total;
    els.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
  }

  function updatePhaseDisplay(phase) {
    const label = PHASE_LABELS[phase] || phase;
    const active = store.getActive();
    if (active) {
      els.statusLabel.textContent = label + ' - ' + active.name;
    } else {
      els.statusLabel.textContent = label;
    }
    document.body.className = phase;
  }

  function updateStats() {
    els.todayCount.textContent = store.getTodayCount();
  }

  function renderTaskList() {
    const tasks = store.getAll();
    const active = store.getActive();

    els.taskList.innerHTML = '';
    tasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-item' + (task.id === (active && active.id) ? ' active' : '');
      item.dataset.id = task.id;

      const info = document.createElement('div');
      info.className = 'task-info';

      const name = document.createElement('span');
      name.className = 'task-name';
      name.textContent = task.name;

      const count = document.createElement('span');
      count.className = 'task-count';
      count.textContent = task.completedPomodoros + '';

      info.appendChild(name);
      info.appendChild(count);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'task-action-btn';
      editBtn.textContent = 'E';
      editBtn.title = '编辑';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEditTask(task);
      });

      actions.appendChild(editBtn);
      item.appendChild(info);
      item.appendChild(actions);

      item.addEventListener('click', () => {
        handleSelectTask(task.id);
      });

      els.taskList.appendChild(item);
    });

    updateNoTaskHint();
  }

  function updateNoTaskHint() {
    const tasks = store.getAll();
    const active = store.getActive();

    if (tasks.length === 0) {
      els.noTaskHint.classList.add('hidden');
      els.emptyListHint.classList.remove('hidden');
    } else {
      els.emptyListHint.classList.add('hidden');
      if (active) {
        els.noTaskHint.classList.add('hidden');
      } else {
        els.noTaskHint.classList.remove('hidden');
      }
    }
  }

  async function handleSelectTask(id) {
    const active = store.getActive();
    if (active && active.id === id) return;

    if (timer.getIsRunning()) {
      timer.pause();
      els.startBtn.textContent = '开始';
    }

    await store.setActive(id);
    const task = store.getById(id);
    if (task) {
      timer.setDurations(task.workMinutes, task.shortBreakMinutes, task.longBreakMinutes);
      timer.setPhase('work');
    }
    renderTaskList();
    updateStats();
  }

  async function handleEditTask(task) {
    const result = await dialog.show(task);
    if (!result) return;

    if (result.action === 'delete') {
      if (timer.getIsRunning()) {
        timer.pause();
        els.startBtn.textContent = '开始';
      }
      await store.remove(task.id);
      renderTaskList();
      updateStats();
    } else if (result.action === 'save') {
      await store.update(task.id, result.data);
      const active = store.getActive();
      if (active && active.id === task.id) {
        timer.setDurations(result.data.workMinutes, result.data.shortBreakMinutes, result.data.longBreakMinutes);
        if (!timer.getIsRunning()) {
          timer.setPhase('work');
        }
      }
      renderTaskList();
    }
  }

  async function handleAddTask() {
    const result = await dialog.show(null);
    if (!result || result.action !== 'save') return;

    const newTask = await store.create(result.data);
    await store.setActive(newTask.id);
    timer.setDurations(newTask.workMinutes, newTask.shortBreakMinutes, newTask.longBreakMinutes);
    timer.setPhase('work');
    renderTaskList();
    updateStats();
  }

  function showCloseDialog() {
    els.closeDialogOverlay.classList.remove('hidden');
  }

  function hideCloseDialog() {
    els.closeDialogOverlay.classList.add('hidden');
  }

  els.closeDialogOverlay.addEventListener('click', (e) => {
    if (e.target === els.closeDialogOverlay) {
      hideCloseDialog();
    }
  });

  function getStartBtn() {
    return els.startBtn;
  }

  function getResetBtn() {
    return els.resetBtn;
  }

  function setStartBtnText(text) {
    els.startBtn.textContent = text;
  }

  els.addTaskBtn.addEventListener('click', handleAddTask);

  renderTaskList();
  updateStats();

  return {
    updateTimerDisplay,
    updatePhaseDisplay,
    updateStats,
    renderTaskList,
    getStartBtn,
    getResetBtn,
    setStartBtnText,
    showCloseDialog,
    hideCloseDialog,
    store,
  };
}
