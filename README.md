# Task Tracker

A lightweight task management app built with plain HTML, CSS, and JavaScript. It runs in your browser and stores tasks locally on your device.

## Features

- Create, edit, and delete tasks
- Add descriptions, due dates, categories, priorities, and statuses
- Mark tasks complete from the task list
- View all tasks, active tasks, completed tasks, or important tasks
- Browse tasks by due date in a monthly calendar
- Sort by due date, latest due date, or recently added
- See task totals, pending and missed tasks, completion progress, and remaining tasks
- Responsive dark interface
- Save task data in browser `localStorage`

## Getting started

No installation or build step is required.

1. Download or clone this project.
2. Open `index.html` in a modern web browser.
3. Select **Add task** to create your first task.

If your browser restricts local storage for pages opened directly from disk, serve the project with a local static web server and open its local URL instead.

## Task details

Each task can include:

- **Title** (required; up to 120 characters)
- Description (up to 500 characters)
- Priority (Important)
- Category (Work, Personal, Study, or Other)
- Due date
- Status (Pending, In Progress, or Completed)

Tasks with past due dates are counted as missed unless completed. Data is stored in this browser under the `task-tracker.tasks.v1` local storage key. It does not automatically sync between browsers or devices. Clearing this site's browser data will remove saved tasks.

## Project files

- `index.html` — app structure and task form
- `style.css` — layout, theme, and responsive styles
- `script.js` — task behavior, rendering, calendar, and local storage

## Built with

- HTML
- CSS
- Vanilla JavaScript
