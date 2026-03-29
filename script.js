/* ============================================================
   DAILY PROGRESS TRACKER — script.js
   Architecture:
     Storage  → read/write localStorage
     Entries  → CRUD operations on entry data
     Dashboard → render stats, heatmap, recent list
     History  → render full history with inline edit/delete
     Form     → new entry + edit form logic
     UI       → navigation, toast, utilities
   ============================================================ */

'use strict';

/* ============================================================
   STORAGE MODULE
   All localStorage access lives here.
   ============================================================ */
const Storage = (() => {
  const KEY = 'progressTracker_entries';

  /** Returns parsed array of all entries, newest-first */
  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  /** Saves the full entries array */
  function saveAll(entries) {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }

  /** Adds a new entry object, returns updated list */
  function add(entry) {
    const entries = getAll();
    entries.push(entry);
    saveAll(entries);
    return entries;
  }

  /** Updates an entry by id */
  function update(id, updated) {
    const entries = getAll().map(e => e.id === id ? { ...e, ...updated } : e);
    saveAll(entries);
    return entries;
  }

  /** Removes an entry by id */
  function remove(id) {
    const entries = getAll().filter(e => e.id !== id);
    saveAll(entries);
    return entries;
  }

  /** Find one entry by id */
  function getById(id) {
    return getAll().find(e => e.id === id) || null;
  }

  return { getAll, saveAll, add, update, remove, getById };
})();


/* ============================================================
   ENTRIES MODULE
   Business logic around entries.
   ============================================================ */
const Entries = (() => {

  /** Generates a unique ID */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Returns today's date as YYYY-MM-DD string */
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Checks if an entry exists for today */
  function hasTodayEntry() {
    return Storage.getAll().some(e => e.date === todayISO());
  }

  /** Returns total study hours across all entries */
  function totalHours() {
    return Storage.getAll().reduce((sum, e) => sum + (parseFloat(e.studyHours) || 0), 0);
  }

  /** Returns hours for the last 7 days as an array of {dateISO, hours} */
  function last7Days() {
    const entries = Storage.getAll();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayEntries = entries.filter(e => e.date === iso);
      const hours = dayEntries.reduce((s, e) => s + (parseFloat(e.studyHours) || 0), 0);
      result.push({ date: iso, hours });
    }
    return result;
  }

  /** Calculates current streak (consecutive days ending today or yesterday) */
  function currentStreak() {
    const entries = Storage.getAll();
    if (!entries.length) return 0;

    // Collect unique dates with entries
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
    if (!uniqueDates.length) return 0;

    const today = todayISO();
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    // Streak must start from today or yesterday
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streak = 0;
    let expected = uniqueDates[0] === today ? new Date() : (() => {
      const d = new Date(); d.setDate(d.getDate() - 1); return d;
    })();

    for (const dateStr of uniqueDates) {
      const expectedISO = expected.toISOString().slice(0, 10);
      if (dateStr === expectedISO) {
        streak++;
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  /** Returns hours logged this week (Mon–Sun) */
  function thisWeekHours() {
    const entries = Storage.getAll();
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    return entries
      .filter(e => new Date(e.date) >= monday)
      .reduce((s, e) => s + (parseFloat(e.studyHours) || 0), 0);
  }

  /** Build a new entry object from form values */
  function buildEntry({ date, studyHours, topicStudied, practiceDone, keyLearning, mistakesMade, notes }) {
    return {
      id: generateId(),
      date,
      studyHours: parseFloat(studyHours) || 0,
      topicStudied: topicStudied.trim(),
      practiceDone: practiceDone.trim(),
      keyLearning: keyLearning.trim(),
      mistakesMade: mistakesMade.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  /** Motivational message based on streak */
  function getMotivation(streak, total) {
    if (total === 0) return 'Log your first entry to start tracking your growth.';
    if (streak === 0) return 'No recent activity detected. Come back strong today.';
    if (streak === 1) return 'One day at a time. Every expert was once a beginner.';
    if (streak < 4)  return `${streak}-day streak. The habit is forming — don't break it.`;
    if (streak < 7)  return `${streak} days straight. Consistency is your superpower.`;
    if (streak < 14) return `${streak}-day streak. You're building something real. Keep going.`;
    if (streak < 30) return `${streak} days in. Most people quit here — you haven't.`;
    return `${streak}-day streak. Elite-level discipline. Remarkable.`;
  }

  return {
    hasTodayEntry, totalHours, last7Days,
    currentStreak, thisWeekHours,
    buildEntry, getMotivation,
    todayISO,
  };
})();


/* ============================================================
   UI MODULE
   Navigation, toast, helpers
   ============================================================ */
const UI = (() => {

  let toastTimer = null;

  /** Show a toast message. type: 'success' | 'error' | 'info' */
  function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
  }

  /** Switches the active view and nav button */
  function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));

    // Refresh data when switching views
    if (viewId === 'dashboard') Dashboard.render();
    if (viewId === 'history')   History.render();
    if (viewId === 'new-entry') Form.prepareNew();
  }

  /** Formats ISO date string to readable form */
  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
  }

  /** Truncates text to N chars */
  function truncate(str, n) {
    return str && str.length > n ? str.slice(0, n) + '…' : str;
  }

  /** Returns abbreviated day name from ISO date */
  function dayAbbr(iso) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return days[new Date(iso + 'T12:00:00').getDay()];
  }

  return { toast, navigate, formatDate, truncate, dayAbbr };
})();


/* ============================================================
   DASHBOARD MODULE
   ============================================================ */
const Dashboard = (() => {

  function render() {
    renderStats();
    renderTodayStatus();
    renderMotivation();
    renderHeatmap();
    renderRecentEntries();
  }

  function renderStats() {
    const total   = Entries.totalHours();
    const streak  = Entries.currentStreak();
    const entries = Storage.getAll();
    const week    = Entries.thisWeekHours();

    document.getElementById('totalHours').textContent   = total % 1 === 0 ? total : total.toFixed(1);
    document.getElementById('currentStreak').innerHTML  = `${streak}<span class="stat-unit">d</span>`;
    document.getElementById('totalEntries').textContent = entries.length;
    document.getElementById('weekHours').innerHTML      = `${week % 1 === 0 ? week : week.toFixed(1)}<span class="stat-unit">h</span>`;
  }

  function renderTodayStatus() {
    const el   = document.getElementById('todayStatus');
    const done = Entries.hasTodayEntry();
    el.className = `today-status ${done ? 'done' : 'pending'}`;
    el.innerHTML = `<span class="status-dot"></span><span class="status-text">${done ? 'Today: Done ✓' : 'Today: Pending'}</span>`;
  }

  function renderMotivation() {
    const streak = Entries.currentStreak();
    const total  = Storage.getAll().length;
    document.getElementById('motivationText').textContent = Entries.getMotivation(streak, total);
  }

  function renderHeatmap() {
    const days    = Entries.last7Days();
    const maxHrs  = Math.max(...days.map(d => d.hours), 1);
    const container = document.getElementById('heatmapRow');
    container.innerHTML = '';

    days.forEach(({ date, hours }) => {
      // Level 0–4 based on relative hours
      let level = 0;
      if (hours > 0) {
        const ratio = hours / maxHrs;
        if (ratio <= 0.25)      level = 1;
        else if (ratio <= 0.5)  level = 2;
        else if (ratio <= 0.75) level = 3;
        else                    level = 4;
      }

      const tooltip = hours > 0
        ? `${UI.formatDate(date)}: ${hours}h`
        : `${UI.formatDate(date)}: no entry`;

      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.innerHTML = `
        <div class="heatmap-box" data-level="${level}" data-tooltip="${tooltip}"></div>
        <span class="heatmap-day-label">${UI.dayAbbr(date)}</span>
        <span class="heatmap-hours-label">${hours > 0 ? hours + 'h' : '—'}</span>
      `;
      container.appendChild(cell);
    });
  }

  function renderRecentEntries() {
    const container = document.getElementById('recentEntriesList');
    const entries   = Storage.getAll()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    if (!entries.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">◈</span>
          No entries yet. Create your first log.
        </div>`;
      return;
    }

    container.innerHTML = entries.map(e => `
      <div class="recent-item">
        <span class="recent-date">${UI.formatDate(e.date)}</span>
        <span class="recent-topic">${UI.truncate(e.topicStudied || 'No topic', 50)}</span>
        <span class="recent-hours">${e.studyHours}h</span>
      </div>
    `).join('');
  }

  return { render };
})();


/* ============================================================
   FORM MODULE
   New entry + (used by History for pre-filling edits)
   ============================================================ */
const Form = (() => {

  function prepareNew() {
    clearForm();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'New Entry';
    document.getElementById('cancelEdit').style.display = 'none';
    document.getElementById('saveEntryBtn').textContent = 'Save Entry';
    // Auto-fill today's date
    document.getElementById('entryDate').value = Entries.todayISO();
    document.getElementById('formDate').textContent = UI.formatDate(Entries.todayISO());
  }

  function clearForm() {
    ['entryDate','studyHours','topicStudied','practiceDone',
     'keyLearning','mistakesMade','notes'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }

  function getValues() {
    return {
      date:         document.getElementById('entryDate').value,
      studyHours:   document.getElementById('studyHours').value,
      topicStudied: document.getElementById('topicStudied').value,
      practiceDone: document.getElementById('practiceDone').value,
      keyLearning:  document.getElementById('keyLearning').value,
      mistakesMade: document.getElementById('mistakesMade').value,
      notes:        document.getElementById('notes').value,
    };
  }

  function validate(values) {
    if (!values.date) return 'Please select a date.';
    if (!values.studyHours || isNaN(parseFloat(values.studyHours)) || parseFloat(values.studyHours) < 0)
      return 'Please enter valid study hours (0 or more).';
    if (!values.topicStudied) return 'Please enter the topic studied.';
    return null; // valid
  }

  /** Handle Save button click — either new or update */
  function handleSave() {
    const values  = getValues();
    const error   = validate(values);
    if (error) { UI.toast(error, 'error'); return; }

    const editId = document.getElementById('editId').value;

    if (editId) {
      // Updating existing entry via main form (shouldn't normally be used;
      // inline editing is in History — but kept as fallback)
      Storage.update(editId, values);
      UI.toast('Entry updated.', 'success');
      prepareNew();
    } else {
      // Check for duplicate date
      const existing = Storage.getAll().find(e => e.date === values.date);
      if (existing) {
        UI.toast('An entry for this date already exists. Edit it in History.', 'error');
        return;
      }
      const entry = Entries.buildEntry(values);
      Storage.add(entry);
      UI.toast('Entry saved! Keep it up.', 'success');
      clearForm();
      document.getElementById('entryDate').value = Entries.todayISO();
    }

    Dashboard.render();
  }

  return { prepareNew, clearForm, getValues, validate, handleSave };
})();


/* ============================================================
   HISTORY MODULE
   Full history list with inline editing and deletion.
   ============================================================ */
const History = (() => {

  let searchQuery = '';
  let openCardId  = null; // track which card is expanded
  let editingId   = null; // track which card is in edit mode

  function render() {
    const allEntries = Storage.getAll()
      .sort((a, b) => b.date.localeCompare(a.date));

    const filtered = searchQuery
      ? allEntries.filter(e =>
          [e.topicStudied, e.practiceDone, e.keyLearning, e.notes, e.date]
            .some(f => f && f.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : allEntries;

    const container = document.getElementById('historyList');

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">≡</span>
          ${searchQuery ? 'No entries match your search.' : 'No entries yet. Create your first log.'}
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(e => buildCard(e)).join('');

    // Restore open state
    if (openCardId) {
      const body = document.getElementById(`card-body-${openCardId}`);
      if (body) body.classList.add('open');
    }

    // Re-attach edit form if mid-edit
    if (editingId) {
      showInlineEdit(editingId);
    }

    attachCardEvents();
  }

  /** Builds a single history card HTML string */
  function buildCard(e) {
    return `
      <div class="history-card" id="card-${e.id}">
        <div class="history-card-header" data-card-toggle="${e.id}">
          <div class="history-card-meta">
            <span class="history-card-date">${UI.formatDate(e.date)}</span>
            <span class="history-card-topic">${UI.truncate(e.topicStudied || '(no topic)', 60)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <span class="history-card-hours">${e.studyHours}h</span>
            <div class="history-card-actions" onclick="event.stopPropagation()">
              <button class="icon-btn edit"   data-edit="${e.id}">Edit</button>
              <button class="icon-btn delete" data-delete="${e.id}">Delete</button>
            </div>
          </div>
        </div>
        <div class="history-card-body" id="card-body-${e.id}">
          ${buildReadView(e)}
        </div>
      </div>`;
  }

  /** Read-only detail HTML for a card body */
  function buildReadView(e) {
    return `
      <div class="entry-detail-grid" id="read-view-${e.id}">
        <div class="entry-detail-item">
          <div class="entry-detail-label">Practice Done</div>
          <div class="entry-detail-value">${e.practiceDone || '—'}</div>
        </div>
        <div class="entry-detail-item">
          <div class="entry-detail-label">Study Hours</div>
          <div class="entry-detail-value">${e.studyHours}h</div>
        </div>
        <div class="entry-detail-item full-width">
          <div class="entry-detail-label">Key Learning</div>
          <div class="entry-detail-value">${e.keyLearning || '—'}</div>
        </div>
        <div class="entry-detail-item full-width">
          <div class="entry-detail-label">Mistakes Made</div>
          <div class="entry-detail-value">${e.mistakesMade || '—'}</div>
        </div>
        ${e.notes ? `
        <div class="entry-detail-item full-width">
          <div class="entry-detail-label">Notes</div>
          <div class="entry-detail-value">${e.notes}</div>
        </div>` : ''}
      </div>`;
  }

  /** Replaces card body with inline edit form */
  function showInlineEdit(id) {
    editingId = id;
    const entry = Storage.getById(id);
    if (!entry) return;

    const body = document.getElementById(`card-body-${id}`);
    if (!body) return;
    body.classList.add('open');

    body.innerHTML = `
      <div class="inline-edit-form">
        <div class="form-row two-col">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="ie-date-${id}" value="${entry.date}" />
          </div>
          <div class="form-group">
            <label>Study Hours</label>
            <input type="number" id="ie-hours-${id}" value="${entry.studyHours}" min="0" max="24" step="0.5" />
          </div>
        </div>
        <div class="form-group">
          <label>Topic Studied</label>
          <input type="text" id="ie-topic-${id}" value="${escapeHtml(entry.topicStudied)}" />
        </div>
        <div class="form-group">
          <label>Practice Done</label>
          <input type="text" id="ie-practice-${id}" value="${escapeHtml(entry.practiceDone)}" />
        </div>
        <div class="form-group">
          <label>Key Learning</label>
          <textarea id="ie-learning-${id}" rows="2">${escapeHtml(entry.keyLearning)}</textarea>
        </div>
        <div class="form-group">
          <label>Mistakes Made</label>
          <textarea id="ie-mistakes-${id}" rows="2">${escapeHtml(entry.mistakesMade)}</textarea>
        </div>
        <div class="form-group">
          <label>Notes <span class="optional-tag">optional</span></label>
          <textarea id="ie-notes-${id}" rows="2">${escapeHtml(entry.notes)}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" data-cancel-edit="${id}">Cancel</button>
          <button class="btn-primary" data-save-edit="${id}">Save Changes</button>
        </div>
      </div>`;

    // Attach inline form events
    body.querySelector(`[data-save-edit="${id}"]`).addEventListener('click', () => saveInlineEdit(id));
    body.querySelector(`[data-cancel-edit="${id}"]`).addEventListener('click', () => cancelInlineEdit(id));
  }

  function saveInlineEdit(id) {
    const updated = {
      date:         document.getElementById(`ie-date-${id}`).value,
      studyHours:   parseFloat(document.getElementById(`ie-hours-${id}`).value) || 0,
      topicStudied: document.getElementById(`ie-topic-${id}`).value.trim(),
      practiceDone: document.getElementById(`ie-practice-${id}`).value.trim(),
      keyLearning:  document.getElementById(`ie-learning-${id}`).value.trim(),
      mistakesMade: document.getElementById(`ie-mistakes-${id}`).value.trim(),
      notes:        document.getElementById(`ie-notes-${id}`).value.trim(),
    };

    if (!updated.date) { UI.toast('Date is required.', 'error'); return; }
    if (!updated.topicStudied) { UI.toast('Topic is required.', 'error'); return; }

    Storage.update(id, updated);
    editingId = null;
    openCardId = id;
    UI.toast('Entry updated successfully.', 'success');
    Dashboard.render();
    render();
  }

  function cancelInlineEdit(id) {
    editingId = null;
    openCardId = id;
    render();
  }

  /** Attach click events to cards */
  function attachCardEvents() {
    // Toggle expand/collapse
    document.querySelectorAll('[data-card-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const id   = header.dataset.cardToggle;
        const body = document.getElementById(`card-body-${id}`);
        if (!body) return;
        const isOpen = body.classList.toggle('open');
        openCardId = isOpen ? id : null;
      });
    });

    // Edit button
    document.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.edit;
        openCardId = id;
        showInlineEdit(id);
      });
    });

    // Delete button
    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.delete;
        if (confirm('Delete this entry? This cannot be undone.')) {
          Storage.remove(id);
          if (editingId === id) editingId = null;
          if (openCardId === id) openCardId = null;
          UI.toast('Entry deleted.', 'info');
          Dashboard.render();
          render();
        }
      });
    });
  }

  /** Set search filter and re-render */
  function setSearch(query) {
    searchQuery = query;
    render();
  }

  /** Escapes HTML entities to prevent XSS in inline forms */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render, setSearch };
})();


/* ============================================================
   DATA IMPORT / EXPORT MODULE
   ============================================================ */
const DataIO = (() => {

  function exportJSON() {
    const entries = Storage.getAll();
    if (!entries.length) {
      UI.toast('Nothing to export yet.', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `progress_tracker_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast(`Exported ${entries.length} entries.`, 'success');
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');

        // Basic validation: each entry needs id and date
        const valid = data.filter(e => e.id && e.date);
        if (!valid.length) {
          UI.toast('No valid entries found in file.', 'error');
          return;
        }

        // Merge: skip entries whose id already exists
        const existing = Storage.getAll();
        const existingIds = new Set(existing.map(e => e.id));
        const newEntries  = valid.filter(e => !existingIds.has(e.id));
        Storage.saveAll([...existing, ...newEntries]);

        UI.toast(`Imported ${newEntries.length} new entries (${valid.length - newEntries.length} skipped as duplicates).`, 'success');
        Dashboard.render();
      } catch {
        UI.toast('Failed to import: invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  return { exportJSON, importJSON };
})();


/* ============================================================
   INIT — wire up all event listeners
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // ── Navigation ──
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.navigate(btn.dataset.view);
      // Close mobile nav if open
      document.getElementById('mobileOverlay').classList.remove('open');
    });
  });

  // ── Mobile menu ──
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobileOverlay').classList.add('open');
  });

  document.getElementById('mobileClose').addEventListener('click', () => {
    document.getElementById('mobileOverlay').classList.remove('open');
  });

  // Close overlay when clicking outside the nav panel
  document.getElementById('mobileOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('mobileOverlay')) {
      document.getElementById('mobileOverlay').classList.remove('open');
    }
  });

  // ── Save entry button ──
  document.getElementById('saveEntryBtn').addEventListener('click', Form.handleSave);

  // ── Cancel edit (main form, used if navigated via code) ──
  document.getElementById('cancelEdit').addEventListener('click', () => {
    Form.prepareNew();
    UI.navigate('history');
  });

  // ── History search ──
  document.getElementById('historySearch').addEventListener('input', (e) => {
    History.setSearch(e.target.value.trim());
  });

  // ── Export ──
  document.getElementById('exportBtn').addEventListener('click', DataIO.exportJSON);
  document.getElementById('exportBtnMobile').addEventListener('click', DataIO.exportJSON);

  // ── Import ──
  const importFile = document.getElementById('importFile');

  function triggerImport() {
    importFile.value = ''; // reset so same file can be re-imported
    importFile.click();
  }

  document.getElementById('importBtn').addEventListener('click', triggerImport);
  document.getElementById('importBtnMobile').addEventListener('click', triggerImport);

  importFile.addEventListener('change', (e) => {
    DataIO.importJSON(e.target.files[0]);
  });

  // ── Allow pressing Enter to submit in single-line form inputs ──
  ['topicStudied','practiceDone','studyHours'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Form.handleSave();
    });
  });

  // ── Initial render ──
  Dashboard.render();
  Form.prepareNew();

});
