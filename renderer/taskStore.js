let data = null;

function isOldFormat(d) {
  return d && ('today' in d || 'completedPomodoros' in d);
}

function migrateFromOld(old) {
  const now = Date.now();
  const defaultTask = {
    id: 't_' + now,
    name: '默认任务',
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    completedPomodoros: old.completedPomodoros || 0,
    createdAt: now,
  };

  const history = (old.history || []).map((entry) => ({
    taskId: defaultTask.id,
    taskName: defaultTask.name,
    date: entry.date,
    completedAt: new Date(entry.date + 'T12:00:00').getTime(),
  }));

  return {
    tasks: [defaultTask],
    history,
    activeTaskId: defaultTask.id,
    windowBounds: old.windowBounds || { width: 450, height: 650 },
  };
}

function normalize(d) {
  if (!d) {
    return {
      tasks: [],
      history: [],
      activeTaskId: null,
      windowBounds: { width: 450, height: 650 },
    };
  }
  if (!Array.isArray(d.tasks)) d.tasks = [];
  if (!Array.isArray(d.history)) d.history = [];
  if (!d.windowBounds) d.windowBounds = { width: 450, height: 650 };
  return d;
}

async function save() {
  try {
    await window.api.data.save(data);
  } catch {}
}

export async function createTaskStore() {
  let loaded = null;
  try {
    loaded = await window.api.data.load();
  } catch {}

  if (isOldFormat(loaded)) {
    await window.api.data.backup();
    data = migrateFromOld(loaded);
    await save();
  } else {
    data = normalize(loaded);
  }

  return {
    getAll() {
      return data.tasks;
    },

    getById(id) {
      return data.tasks.find((t) => t.id === id) || null;
    },

    async create(task) {
      const newTask = {
        id: 't_' + Date.now(),
        name: task.name || '新任务',
        workMinutes: task.workMinutes || 25,
        shortBreakMinutes: task.shortBreakMinutes || 5,
        longBreakMinutes: task.longBreakMinutes || 15,
        completedPomodoros: 0,
        createdAt: Date.now(),
      };
      data.tasks = [...data.tasks, newTask];
      await save();
      return newTask;
    },

    async update(id, updates) {
      data.tasks = data.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, id: t.id, createdAt: t.createdAt } : t
      );
      await save();
    },

    async remove(id) {
      data.tasks = data.tasks.filter((t) => t.id !== id);
      if (data.activeTaskId === id) {
        data.activeTaskId = null;
      }
      data.history = data.history.filter((h) => h.taskId !== id);
      await save();
    },

    getActive() {
      return data.tasks.find((t) => t.id === data.activeTaskId) || null;
    },

    async setActive(id) {
      data.activeTaskId = id;
      await save();
    },

    async addHistory(taskId, taskName) {
      const today = new Date().toISOString().slice(0, 10);
      data.history = [
        ...data.history,
        { taskId, taskName, date: today, completedAt: Date.now() },
      ];
      await save();
    },

    getHistory() {
      return data.history;
    },

    getTodayCount() {
      const today = new Date().toISOString().slice(0, 10);
      return data.history.filter((h) => h.date === today).length;
    },

    getTodayCountForTask(taskId) {
      const today = new Date().toISOString().slice(0, 10);
      return data.history.filter((h) => h.taskId === taskId && h.date === today).length;
    },

    async saveWindowBounds(bounds) {
      data.windowBounds = bounds;
      await save();
    },

    getWindowBounds() {
      return data.windowBounds;
    },
  };
}
