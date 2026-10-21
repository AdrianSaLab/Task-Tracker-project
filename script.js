(() => {
    'use strict';
    const STORAGE_KEY = 'task-tracker.tasks.v1';
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const dateInputToday = new Date();
    const isoToday = localISODate(dateInputToday);
    const currentDate = $('#current-date');
    currentDate.dateTime = isoToday;
    currentDate.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(dateInputToday);
    let tasks = loadTasks();
    let filter = 'all';
    let sortMode = 'due-asc';
    let view = 'dashboard';
    let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selectedCalendarDate = localISODate(new Date());
    const dialog = $('#task-dialog');
    const form = $('#task-form');
    let submitting = false;

    function localISODate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    function loadTasks() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return [];
            const value = JSON.parse(saved);
            if (!Array.isArray(value)) return [];
            return value.filter(task => task && typeof task === 'object' && typeof task.title === 'string' && task.title.trim()).map(task => ({
                id: String(task.id || makeId()), title: task.title.trim(), description: typeof task.description === 'string' ? task.description : '',
                important: task.important === true, category: typeof task.category === 'string' ? task.category : 'Work',
                dueDate: validDate(task.dueDate) ? task.dueDate : '', status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
                createdAt: Number(task.createdAt) || Date.now()
            }));
        } catch { return []; }
    }
    function saveTasks() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { /* Storage can be unavailable in private browsing. */ } }
    function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()); }
    function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
    function isCompleted(task) { return task.status === 'Completed'; }
    function isMissed(task) { return !isCompleted(task) && task.dueDate && task.dueDate < localISODate(new Date()); }
    function formatDue(task) {
        if (isCompleted(task)) return 'Completed';
        if (!task.dueDate) return 'No date';
        const today = localISODate(new Date());
        if (task.dueDate === today) return 'Today';
        const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        if (task.dueDate === localISODate(tomorrowDate)) return 'Tomorrow';
        const parsed = new Date(`${task.dueDate}T00:00:00`);
        return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parsed);
    }
    function render() {
        renderSummary(); renderTaskList(); renderFooter();
        $$('.tab').forEach(tab => { const selected = tab.dataset.filter === filter; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); });
        $$('.nav-item').forEach(item => { const selected = item.dataset.view === view; item.classList.toggle('active', selected); if (selected) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); });
        document.body.classList.toggle('view-calendar', view === 'calendar');
        document.body.classList.toggle('view-my-task', view === 'important-task');
        $('#view-title').textContent = view === 'calendar' ? 'Calendar' : view === 'important-task' ? 'Important task' : 'My tasks';
        $('#view-kicker').textContent = view === 'calendar' ? 'TASKS BY DUE DATE' : view === 'important-task' ? 'PRIORITY TASKS' : 'YOUR WORKSPACE';
    }
    function renderSummary() {
        const pending = tasks.filter(t => !isCompleted(t) && t.status === 'Pending').length;
        $('#total-count').textContent = tasks.length;
        $('#pending-count').textContent = pending;
        $('#missed-count').textContent = tasks.filter(isMissed).length;
        $('#completed-count').textContent = tasks.filter(isCompleted).length;
        $('#all-tab-count').textContent = tasks.length;
        $('#active-tab-count').textContent = tasks.filter(t => !isCompleted(t)).length;
        $('#completed-tab-count').textContent = tasks.filter(isCompleted).length;
    }
    function visibleTasks() {
        let result = tasks.filter(task => filter === 'all' || (filter === 'active' ? !isCompleted(task) : isCompleted(task)));
        if (view === 'important-task') result = result.filter(task => task.important);
        result = [...result];
        result.sort((a, b) => {
            if (sortMode === 'created-desc') return b.createdAt - a.createdAt;
            const ad = a.dueDate || '9999-12-31'; const bd = b.dueDate || '9999-12-31';
            return sortMode === 'due-desc' ? bd.localeCompare(ad) : ad.localeCompare(bd);
        });
        return result;
    }
    function renderTaskList() {
        const list = $('#task-list');
        const shown = visibleTasks();
        if (view === 'calendar') {
            renderCalendar(list, shown);
            return;
        }
        if (!shown.length) {
            const heading = view === 'important-task' ? 'No important tasks' : filter === 'completed' ? 'No completed tasks yet' : filter === 'active' ? 'You are all caught up' : 'No tasks yet';
            const message = view === 'important-task' ? 'Mark a task Important to see it here.' : 'Add a task to get your day moving.';
            list.innerHTML = `<div class="empty-state"><strong>${heading}</strong>${message}</div>`;
            return;
        }
        list.innerHTML = shown.map(renderTaskRow).join('');
    }
    function renderCalendar(list, shown) {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = localISODate(new Date());
        const byDate = new Map();
        shown.filter(task => task.dueDate).forEach(task => {
            if (!byDate.has(task.dueDate)) byDate.set(task.dueDate, []);
            byDate.get(task.dueDate).push(task);
        });
        const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarMonth);
        let html = `<div class="calendar-toolbar"><button type="button" class="calendar-nav" data-calendar-shift="-1" aria-label="Previous month">&#8249;</button><h2>${escapeHTML(monthName)}</h2><button type="button" class="calendar-nav" data-calendar-shift="1" aria-label="Next month">&#8250;</button><button type="button" class="calendar-today" data-calendar-today>Today</button></div>`;
        html += '<div class="calendar-grid" role="grid" aria-label="Calendar month"><div class="calendar-weekdays" role="row">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => { html += `<span role="columnheader">${day}</span>`; });
        html += '</div><div class="calendar-days">';
        const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
        for (let cell = 0; cell < cellCount; cell++) {
            const day = cell - firstWeekday + 1;
            if (day < 1 || day > daysInMonth) {
                html += '<div class="calendar-day outside-month" aria-hidden="true"></div>';
                continue;
            }
            const date = localISODate(new Date(year, month, day));
            const dayTasks = byDate.get(date) || [];
            const classes = ['calendar-day', date === today ? 'is-today' : '', date === selectedCalendarDate ? 'is-selected' : ''].filter(Boolean).join(' ');
            const markers = dayTasks.slice(0, 2).map(task => `<span class="calendar-task-chip ${isCompleted(task) ? 'is-done' : ''}" title="${escapeHTML(task.description || 'No description provided.')}">${escapeHTML(task.title)}</span>`).join('');
            const more = dayTasks.length > 2 ? `<span class="calendar-more">+${dayTasks.length - 2} more</span>` : '';
            html += `<button type="button" class="${classes}" role="gridcell" data-calendar-date="${date}" aria-label="${date}, ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'}"><span class="calendar-day-number">${day}</span>${markers}${more}</button>`;
        }
        html += '</div></div>';
        const selectedTasks = byDate.get(selectedCalendarDate) || [];
        const selectedLabel = new Date(`${selectedCalendarDate}T00:00:00`);
        const selectedHeading = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedLabel);
        html += `<section class="calendar-day-detail"><h3>${escapeHTML(selectedHeading)}</h3>${selectedTasks.length ? selectedTasks.map(renderTaskRow).join('') : '<p class="calendar-no-tasks">No tasks due on this day.</p>'}</section>`;
        if (!shown.some(task => task.dueDate)) html += '<p class="calendar-no-dates">Tasks with due dates will appear on the calendar.</p>';
        list.innerHTML = html;
    }
    function renderTaskRow(task) {
        const dueClass = isMissed(task) ? 'overdue' : (!isCompleted(task) && task.dueDate === localISODate(new Date()) ? 'today' : '');
        const completedLabel = isCompleted(task) ? (task.dueDate === localISODate(new Date()) ? 'Completed today' : 'Completed') : formatDue(task);
        return `<article class="task-row" data-task-id="${escapeHTML(task.id)}" title="${escapeHTML(task.description || 'No description provided.')}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} completed" ${isCompleted(task) ? 'checked' : ''}>
      <span class="task-title ${isCompleted(task) ? 'done' : ''}" title="${escapeHTML(task.description || task.title)}">${escapeHTML(task.title)}</span>
      <span class="task-meta"><span class="category-badge">${escapeHTML(task.category)}</span>${task.important ? '<span class="important-badge">Important</span>' : ''}</span>
      <time class="due-label ${dueClass}" ${task.dueDate ? `datetime="${escapeHTML(task.dueDate)}"` : ''}>${escapeHTML(completedLabel)}</time>
      <span class="row-menu-wrap"><button class="row-menu-button" aria-label="Actions for ${escapeHTML(task.title)}" aria-haspopup="true" aria-expanded="false">&#8942;</button></span>
    </article>`;
    }
    function renderFooter() {
        const completed = tasks.filter(isCompleted).length; const total = tasks.length; const remaining = total - completed;
        const percent = total ? Math.round(completed / total * 100) : 0;
        $('#remaining-label').textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`;
        $('#progress-label').textContent = `${completed} of ${total} completed`;
        $('#progress-fill').style.width = `${percent}%`;
        const bar = $('.progress-track'); bar.setAttribute('aria-valuenow', String(percent));
    }
    function escapeHTML(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
    function openForm(task = null) {
        form.reset(); $('#task-id').value = task?.id || '';
        $('#dialog-title').textContent = task ? 'Edit task' : 'Add a task'; $('#save-task').textContent = task ? 'Save changes' : 'Add task';
        $('#task-title').value = task?.title || ''; $('#task-description').value = task?.description || '';
        $('#task-important').checked = task?.important === true; $('#task-category').value = task?.category || 'Work';
        $('#task-due').value = task?.dueDate || ''; $('#task-status').value = task?.status || 'Pending';
        $('#title-error').textContent = ''; dialog.showModal(); setTimeout(() => $('#task-title').focus(), 0);
    }
    function submitForm(event) {
        event.preventDefault(); if (submitting) return;
        const title = $('#task-title').value.trim(); const titleError = $('#title-error');
        if (!title) { titleError.textContent = 'Enter a title for this task.'; $('#task-title').setAttribute('aria-invalid', 'true'); $('#task-title').focus(); return; }
        const dueDate = $('#task-due').value;
        if (dueDate && !validDate(dueDate)) { titleError.textContent = 'Choose a valid due date.'; $('#task-due').focus(); return; }
        submitting = true; $('#save-task').disabled = true;
        const id = $('#task-id').value;
        const record = { id: id || makeId(), title, description: $('#task-description').value.trim(), important: $('#task-important').checked, category: $('#task-category').value, dueDate, status: $('#task-status').value, createdAt: id ? (tasks.find(t => t.id === id)?.createdAt || Date.now()) : Date.now() };
        const index = tasks.findIndex(task => task.id === id);
        if (index >= 0) tasks[index] = record; else tasks.unshift(record);
        saveTasks(); dialog.close(); submitting = false; $('#save-task').disabled = false; render();
    }
    function deleteTask(id) { const task = tasks.find(item => item.id === id); if (!task || !window.confirm(`Delete “${task.title}”?`)) return; tasks = tasks.filter(item => item.id !== id); saveTasks(); render(); }

    $('#add-task-button').addEventListener('click', () => openForm());
    $('#mobile-add-task').addEventListener('click', () => openForm());
    $$('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    form.addEventListener('submit', submitForm);
    $('#task-title').addEventListener('input', () => { $('#title-error').textContent = ''; $('#task-title').removeAttribute('aria-invalid'); });
    $$('.tab').forEach(tab => tab.addEventListener('click', () => { filter = tab.dataset.filter; render(); }));
    $('#sort-select').addEventListener('change', event => { sortMode = event.target.value; renderTaskList(); });
    $$('.nav-item').forEach(item => item.addEventListener('click', () => { view = item.dataset.view; filter = 'all'; render(); }));
    $('#task-list').addEventListener('change', event => {
        if (!event.target.matches('.task-check')) return;
        const row = event.target.closest('.task-row'); const task = tasks.find(item => item.id === row.dataset.taskId); if (!task) return;
        task.status = event.target.checked ? 'Completed' : 'Pending'; saveTasks(); render();
    });
    $('#task-list').addEventListener('click', event => {
        const shift = event.target.closest('[data-calendar-shift]');
        if (shift) { calendarMonth.setMonth(calendarMonth.getMonth() + Number(shift.dataset.calendarShift)); selectedCalendarDate = localISODate(calendarMonth); renderTaskList(); return; }
        if (event.target.closest('[data-calendar-today]')) { calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); selectedCalendarDate = localISODate(new Date()); renderTaskList(); return; }
        const dayButton = event.target.closest('[data-calendar-date]');
        if (dayButton) { selectedCalendarDate = dayButton.dataset.calendarDate; renderTaskList(); return; }
        const button = event.target.closest('.row-menu-button');
        if (button) {
            const wrapper = button.closest('.row-menu-wrap'); const open = wrapper.querySelector('.row-menu');
            $$('.row-menu').forEach(menu => menu.remove());
            if (open) { button.setAttribute('aria-expanded', 'false'); return; }
            const row = button.closest('.task-row'); const task = tasks.find(item => item.id === row.dataset.taskId); if (!task) return;
            const menu = document.createElement('div'); menu.className = 'row-menu';
            menu.innerHTML = '<button type="button" data-action="edit">Edit task</button><button type="button" data-action="status">Change status</button><button type="button" data-action="delete">Delete task</button>';
            wrapper.append(menu); button.setAttribute('aria-expanded', 'true'); return;
        }
        const action = event.target.closest('[data-action]'); if (!action) return;
        const row = action.closest('.task-row'); const task = tasks.find(item => item.id === row.dataset.taskId); if (!task) return;
        if (action.dataset.action === 'edit') openForm(task);
        if (action.dataset.action === 'delete') deleteTask(task.id);
        if (action.dataset.action === 'status') { const statuses = ['Pending', 'In Progress', 'Completed']; task.status = statuses[(statuses.indexOf(task.status) + 1) % statuses.length]; saveTasks(); render(); }
    });
    document.addEventListener('click', event => { if (!event.target.closest('.row-menu-wrap')) $$('.row-menu').forEach(menu => menu.remove()); });
    render();
})();







