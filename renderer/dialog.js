export function createDialog() {
  const overlay = document.getElementById('dialogOverlay');
  const form = document.getElementById('taskForm');
  const titleEl = document.getElementById('dialogTitle');
  const nameInput = document.getElementById('taskNameInput');
  const workInput = document.getElementById('workMinutesInput');
  const shortBreakInput = document.getElementById('shortBreakInput');
  const longBreakInput = document.getElementById('longBreakInput');
  const cancelBtn = document.getElementById('dialogCancelBtn');
  const deleteBtn = document.getElementById('dialogDeleteBtn');

  let resolvePromise = null;

  function close() {
    overlay.classList.add('hidden');
    if (resolvePromise) {
      resolvePromise(null);
      resolvePromise = null;
    }
  }

  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return {
    /**
     * Show the dialog for creating or editing a task.
     * @param {object|null} task - Existing task to edit, or null for new task.
     * @returns {Promise<{action: 'save'|'delete', data: object}|null>}
     */
    show(task) {
      return new Promise((resolve) => {
        resolvePromise = resolve;

        if (task) {
          titleEl.textContent = '编辑任务';
          nameInput.value = task.name;
          workInput.value = task.workMinutes;
          shortBreakInput.value = task.shortBreakMinutes;
          longBreakInput.value = task.longBreakMinutes;
          deleteBtn.classList.remove('hidden');
        } else {
          titleEl.textContent = '新建任务';
          nameInput.value = '';
          workInput.value = 25;
          shortBreakInput.value = 5;
          longBreakInput.value = 15;
          deleteBtn.classList.add('hidden');
        }

        overlay.classList.remove('hidden');
        nameInput.focus();

        const onSubmit = (e) => {
          e.preventDefault();
          cleanup();
          resolve({
            action: 'save',
            data: {
              name: nameInput.value.trim() || '新任务',
              workMinutes: Math.max(1, parseInt(workInput.value, 10) || 25),
              shortBreakMinutes: Math.max(1, parseInt(shortBreakInput.value, 10) || 5),
              longBreakMinutes: Math.max(1, parseInt(longBreakInput.value, 10) || 15),
            },
          });
        };

        const onDelete = () => {
          cleanup();
          resolve({ action: 'delete', data: null });
        };

        const onKeydown = (e) => {
          if (e.key === 'Escape') {
            cleanup();
            close();
          }
        };

        function cleanup() {
          overlay.classList.add('hidden');
          form.removeEventListener('submit', onSubmit);
          deleteBtn.removeEventListener('click', onDelete);
          document.removeEventListener('keydown', onKeydown);
          resolvePromise = null;
        }

        form.addEventListener('submit', onSubmit);
        deleteBtn.addEventListener('click', onDelete);
        document.addEventListener('keydown', onKeydown);
      });
    },
  };
}
