
"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  form: $("#task-form"),
  input: $("#task-input"),
  date: $("#task-date"),
  time: $("#task-time"),
  priority: $("#task-priority"),
  category: $("#task-category"),
  editingId: $("#editing-id"),
  saveBtn: $("#save-task-btn"),
  cancelBtn: $("#cancel-edit-btn"),
  message: $("#form-message"),
  list: $("#task-list"),
  empty: $("#empty-message"),
  visibleCount: $("#visible-count"),
  search: $("#search-input"),
  sort: $("#sort-select"),
  filters: $$(".filter-btn"),
  nav: $$(".nav-item"),
  title: $("#page-title"),
  currentDate: $("#current-date"),
  total: $("#total-count"),
  pending: $("#pending-count"),
  completed: $("#completed-count"),
  overdue: $("#overdue-count"),
  progressRing: $("#progress-ring"),
  progressPercent: $("#progress-percent"),
  progressCaption: $("#progress-caption"),
  progressBar: $("#progress-bar"),
  progressFraction: $("#progress-fraction"),
  categoryStats: $("#category-stats"),
  upcoming: $("#upcoming-list"),
  taskSectionTitle: $("#task-section-title"),
  taskPanel: $("#task-panel"),
  calendarPanel: $("#calendar-panel"),
  calendarGrid: $("#calendar-grid"),
  calendarMonth: $("#calendar-month"),
  calendarDayTasks: $("#calendar-day-tasks")
};

const STORAGE_KEY = "taskFlowProTasksV2";
const CATEGORIES = ["Study", "Work", "Personal", "Health", "Other"];
const PRIORITIES = ["high", "medium", "low"];

let tasks = loadTasks();
let currentView = "dashboard";
let currentFilter = "all";
let calendarDate = new Date();
let selectedDate = toDateKey(new Date());

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    return saved
      .filter(task => task && typeof task.title === "string")
      .map(task => ({
        id: String(task.id ?? Date.now() + Math.random()),
        title: task.title,
        date: task.date || "",
        time: task.time || "",
        priority: PRIORITIES.includes(task.priority)
          ? task.priority : "medium",
        category: CATEGORIES.includes(task.category)
          ? task.category : "Other",
        completed: Boolean(task.completed),
        createdAt: Number(task.createdAt) || Date.now()
      }));
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showMessage("Could not save changes. Check browser storage.");
    return false;
  }
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(date, time = "23:59") {
  if (!date) return null;
  const result = new Date(`${date}T${time}`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message) {
  els.message.textContent = message;
}

function isOverdue(task) {
  if (!task.date || task.completed) return false;
  const deadline = parseLocalDate(task.date, task.time || "23:59");
  return deadline !== null && deadline < new Date();
}

function formatDate(date, time = "") {
  if (!date) return "No deadline";
  const parsed = parseLocalDate(date, "12:00");
  if (!parsed) return "Invalid date";

  const formatted = parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return time ? `${formatted} · ${time}` : formatted;
}

function formatShortDate(date) {
  const parsed = parseLocalDate(date, "12:00");
  if (!parsed) return "--";
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

// ADD OR UPDATE TASK
els.form.addEventListener("submit", event => {
  event.preventDefault();

  const title = els.input.value.trim();
  if (!title) {
    showMessage("Please enter a task name.");
    els.input.focus();
    return;
  }

  const editingId = els.editingId.value;

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);
    if (!task) {
      resetForm();
      showMessage("Task not found. Please try again.");
      return;
    }

    task.title = title;
    task.date = els.date.value;
    task.time = els.time.value;
    task.priority = els.priority.value;
    task.category = els.category.value;

    showMessage("Task updated successfully! ✨");
  } else {
    tasks.push({
      id: (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`),
      title,
      date: els.date.value,
      time: els.time.value,
      priority: els.priority.value,
      category: els.category.value,
      completed: false,
      createdAt: Date.now()
    });

    showMessage("New task added! 🚀");
  }

  saveTasks();
  resetForm(false);
  renderAll();
});

function resetForm(clearMessage = true) {
  els.form.reset();
  els.editingId.value = "";
  els.saveBtn.textContent = "＋ Add Task";
  els.cancelBtn.classList.add("hidden");
  if (clearMessage) showMessage("");
}

els.cancelBtn.addEventListener("click", () => resetForm());

// EDIT TASK
function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  els.editingId.value = task.id;
  els.input.value = task.title;
  els.date.value = task.date;
  els.time.value = task.time;
  els.priority.value = task.priority;
  els.category.value = task.category;

  els.saveBtn.textContent = "Save Changes";
  els.cancelBtn.classList.remove("hidden");
  showMessage("Edit your task and save the changes.");

  els.taskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  els.input.focus({ preventScroll: true });
}

// COMPLETE TASK
function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderAll();
}

// DELETE TASK
function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(item => item.id !== id);

  if (els.editingId.value === id) resetForm();

  saveTasks();
  renderAll();
  showMessage("Task deleted.");
}

// SEARCH, FILTER AND SORT
function getVisibleTasks() {
  const query = els.search.value.trim().toLowerCase();

  let result = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      task.category.toLowerCase().includes(query) ||
      task.priority.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (currentFilter === "pending" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;

    const today = toDateKey(new Date());

    if (currentView === "today" && task.date !== today) return false;

    if (currentView === "upcoming") {
      if (!task.date || task.completed || task.date < today) return false;
    }

    if (currentView === "completed" && !task.completed) return false;

    return true;
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  result.sort((a, b) => {
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    switch (els.sort.value) {
      case "priority":
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case "newest":
        return b.createdAt - a.createdAt;
      case "name":
        return a.title.localeCompare(b.title);
      case "date":
      default:
        if (!a.date && !b.date) return b.createdAt - a.createdAt;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return `${a.date}T${a.time || "23:59"}`
          .localeCompare(`${b.date}T${b.time || "23:59"}`);
    }
  });

  return result;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();

  els.list.replaceChildren();
  els.visibleCount.textContent =
    `${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"}`;

  els.empty.classList.toggle("hidden", visibleTasks.length > 0);

  if (!visibleTasks.length) {
    els.empty.querySelector("h3").textContent =
      els.search.value.trim()
        ? "No matching tasks"
        : "No tasks here yet";

    els.empty.querySelector("p").textContent =
      els.search.value.trim()
        ? "Try another search or filter."
        : "Add a task and start making progress.";
  }

  visibleTasks.forEach(task => {
    const item = document.createElement("article");
    item.className = "task-item";
    if (task.completed) item.classList.add("completed");

    const deadlineText = isOverdue(task)
      ? `${formatDate(task.date, task.time)} · Overdue`
      : formatDate(task.date, task.time);

    item.innerHTML = `
      <input class="task-checkbox" type="checkbox"
        aria-label="Mark ${escapeAttribute(task.title)} completed"
        ${task.completed ? "checked" : ""}>

      <div class="task-content">
        <p class="task-title">${escapeHTML(task.title)}</p>
        <div class="task-meta">
          <span class="task-badge priority-${task.priority}">
            ${task.priority.toUpperCase()}
          </span>
          <span class="task-badge category-badge">
            ${escapeHTML(task.category)}
          </span>
          <span class="task-date ${isOverdue(task) ? "overdue" : ""}">
            ${escapeHTML(deadlineText)}
          </span>
        </div>
      </div>

      <div class="task-actions">
        <button type="button" class="edit-btn">Edit</button>
        <button type="button" class="delete-btn">Delete</button>
      </div>
    `;

    item.querySelector(".task-checkbox")
      .addEventListener("change", () => toggleTask(task.id));

    item.querySelector(".edit-btn")
      .addEventListener("click", () => editTask(task.id));

    item.querySelector(".delete-btn")
      .addEventListener("click", () => deleteTask(task.id));

    els.list.appendChild(item);
  });
}

// DASHBOARD STATISTICS AND PROGRESS
function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  els.total.textContent = total;
  els.pending.textContent = pending;
  els.completed.textContent = completed;
  els.overdue.textContent = overdue;
  els.progressPercent.textContent = `${percentage}%`;
  els.progressFraction.textContent = `${completed} / ${total}`;
  els.progressBar.style.width = `${percentage}%`;

  els.progressRing.style.background =
    `conic-gradient(var(--purple) 0deg, var(--cyan) ${percentage * 3.6}deg, #292943 ${percentage * 3.6}deg)`;

  els.progressCaption.textContent =
    total === 0 ? "Your journey starts here." :
    percentage === 100 ? "Amazing! Every task is complete! 🎉" :
    `${pending} task${pending === 1 ? "" : "s"} left to finish.`;

  const categoryCounts = CATEGORIES.map(category => {
    const categoryTasks = tasks.filter(task => task.category === category);
    const done = categoryTasks.filter(task => task.completed).length;

    return {
      category,
      total: categoryTasks.length,
      percent: categoryTasks.length
        ? Math.round(done / categoryTasks.length * 100) : 0
    };
  }).filter(item => item.total > 0);

  els.categoryStats.innerHTML = categoryCounts.length
    ? categoryCounts.map(item => `
      <div class="category-row">
        <span>${escapeHTML(item.category)}</span>
        <strong>${item.total} · ${item.percent}%</strong>
        <div class="category-track">
          <div style="width:${item.percent}%"></div>
        </div>
      </div>
    `).join("")
    : `<p class="mini-empty">Your task categories will appear here.</p>`;
}

// UPCOMING DEADLINES
function renderUpcoming() {
  const today = toDateKey(new Date());

  const upcoming = tasks
    .filter(task => task.date && !task.completed && task.date >= today)
    .sort((a, b) => {
      const dateA = `${a.date}T${a.time || "23:59"}`;
      const dateB = `${b.date}T${b.time || "23:59"}`;
      return dateA.localeCompare(dateB);
    })
    .slice(0, 5);

  if (!upcoming.length) {
    els.upcoming.innerHTML =
      `<p class="mini-empty">No upcoming deadlines. Add a due date to a task.</p>`;
    return;
  }

  els.upcoming.innerHTML = upcoming.map(task => `
    <div class="upcoming-item">
      <div class="upcoming-date">${escapeHTML(formatShortDate(task.date))}</div>
      <div class="upcoming-detail">
        <strong>${escapeHTML(task.title)}</strong>
        <span>${escapeHTML(task.category)} · ${escapeHTML(task.time || "Any time")}</span>
      </div>
    </div>
  `).join("");
}

// CALENDAR
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  els.calendarMonth.textContent =
    calendarDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  const today = toDateKey(new Date());

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = weekdays.map(day =>
    `<div class="calendar-weekday">${day}</div>`
  ).join("");

  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);

    const key = toDateKey(day);
    const dayTasks = tasks.filter(task => task.date === key);
    const classes = ["calendar-day"];

    if (day.getMonth() !== month) classes.push("outside");
    if (key === today) classes.push("today");
    if (key === selectedDate) classes.push("selected");

    html += `
      <button type="button" class="${classes.join(" ")}"
        data-date="${key}" aria-label="${key}, ${dayTasks.length} tasks">
        <span>${day.getDate()}</span>
        <span class="calendar-dots">
          ${dayTasks.slice(0, 3).map(() => "<i></i>").join("")}
        </span>
      </button>
    `;
  }

  els.calendarGrid.innerHTML = html;

  els.calendarGrid.querySelectorAll(".calendar-day").forEach(button => {
    button.addEventListener("click", () => {
      selectedDate = button.dataset.date;
      renderCalendar();
      renderCalendarDayTasks();
    });
  });

  renderCalendarDayTasks();
}

function renderCalendarDayTasks() {
  const dayTasks = tasks.filter(task => task.date === selectedDate);

  if (!dayTasks.length) {
    els.calendarDayTasks.innerHTML =
      `<p class="mini-empty">No tasks scheduled for ${escapeHTML(selectedDate)}.</p>`;
    return;
  }

  els.calendarDayTasks.innerHTML = dayTasks.map(task => `
    <div class="calendar-task">
      <strong>${task.completed ? "✓ " : ""}${escapeHTML(task.title)}</strong>
      <p class="task-date">
        ${escapeHTML(task.time || "Any time")} ·
        ${escapeHTML(task.category)} ·
        ${escapeHTML(task.priority)}
        ${task.completed ? " · Completed" : ""}
      </p>
    </div>
  `).join("");
}

$("#prev-month").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("#next-month").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

// NAVIGATION
function setView(view) {
  currentView = view;

  els.nav.forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    dashboard: ["Dashboard", "Overview"],
    all: ["All Tasks", ""],
    today: ["Today's", "Tasks"],
    upcoming: ["Upcoming", "Tasks"],
    completed: ["Completed", "Tasks"],
    calendar: ["Task", "Calendar"]
  };

  const [first, second] = titles[view] || titles.dashboard;
  els.title.innerHTML =
    `${escapeHTML(first)} ${second ? `<span class="accent">${escapeHTML(second)}</span>` : ""}`;

  els.taskSectionTitle.textContent =
    view === "dashboard" ? "Manage Tasks" :
    view === "today" ? "Today's Tasks" :
    view === "upcoming" ? "Upcoming Tasks" :
    view === "completed" ? "Completed Tasks" :
    view === "calendar" ? "Tasks by Date" : "All Tasks";

  els.calendarPanel.classList.toggle("hidden", view !== "calendar");
  els.taskPanel.classList.toggle("hidden", view === "calendar");
  $(".content-grid").classList.toggle("hidden", view === "calendar");
  $(".welcome-banner").classList.toggle("hidden", view !== "dashboard");
  $(".stats-grid").classList.toggle("hidden", view !== "dashboard");

  currentFilter = view === "completed" ? "completed" : "all";

  els.filters.forEach(button => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });

  renderTasks();

  if (view === "calendar") renderCalendar();
  if (view !== "calendar") {
    els.taskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

els.nav.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

els.filters.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    els.filters.forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderTasks();
  });
});

els.search.addEventListener("input", renderTasks);
els.sort.addEventListener("change", renderTasks);

function focusNewTask() {
  setView("dashboard");
  resetForm();
  els.input.focus();
  els.taskPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#top-add-btn").addEventListener("click", focusNewTask);

// RENDER EVERYTHING
function renderAll() {
  renderStats();
  renderTasks();
  renderUpcoming();

  if (currentView === "calendar") {
    renderCalendar();
  }
}

els.currentDate.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

renderAll();
