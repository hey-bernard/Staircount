(() => {
  "use strict";

  const STORAGE_KEY = "staircount_sessions_v1";
  const SETTINGS_KEY = "staircount_settings_v1";

  // kcal per single stair step, calibrated for a 70kg person.
  // Climbing costs roughly 3-4x more than descending for the same step count.
  const KCAL_PER_STEP_UP = 0.17;
  const KCAL_PER_STEP_DOWN = 0.05;

  const el = (id) => document.getElementById(id);

  const timerDisplay = el("timerDisplay");
  const sessionStatus = el("sessionStatus");
  const upBtn = el("upBtn");
  const downBtn = el("downBtn");
  const upCountEl = el("upCount");
  const downCountEl = el("downCount");
  const undoBtn = el("undoBtn");
  const startStopBtn = el("startStopBtn");
  const stepSizeInput = el("stepSize");

  const todayUpEl = el("todayUp");
  const todayDownEl = el("todayDown");
  const weekUpEl = el("weekUp");
  const weekDownEl = el("weekDown");
  const totalUpEl = el("totalUp");
  const totalDownEl = el("totalDown");
  const todayCaloriesEl = el("todayCalories");
  const totalCaloriesEl = el("totalCalories");

  const historyList = el("historyList");
  const emptyHistoryMsg = el("emptyHistoryMsg");

  const settingsBtn = el("settingsBtn");
  const settingsModal = el("settingsModal");
  const closeSettingsBtn = el("closeSettingsBtn");
  const resetDataBtn = el("resetDataBtn");
  const weightInput = el("weightInput");

  const summaryModal = el("summaryModal");
  const summaryBody = el("summaryBody");
  const closeSummaryBtn = el("closeSummaryBtn");

  const weekChart = el("weekChart");

  /** @typedef {{id:string, startedAt:number, endedAt:number, up:number, down:number}} Session */

  let sessions = loadSessions();
  let settings = loadSettings();

  let current = null; // { startedAt, up, down, actions: [{type:'up'|'down', amount:number}] }
  let timerInterval = null;

  function loadSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { weight: 60 };
    } catch {
      return { weight: 60 };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function kcalFor(up, down) {
    const factor = settings.weight / 70;
    return up * KCAL_PER_STEP_UP * factor + down * KCAL_PER_STEP_DOWN * factor;
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function startSession() {
    current = { startedAt: Date.now(), up: 0, down: 0, actions: [] };
    timerInterval = setInterval(updateTimer, 1000);
    startStopBtn.textContent = "⏹️ 운동 종료";
    startStopBtn.classList.add("stop");
    sessionStatus.textContent = "운동 중...";
    updateTimer();
    renderCurrentCounts();
  }

  function endSession() {
    if (!current) return;
    clearInterval(timerInterval);
    timerInterval = null;

    const session = {
      id: `${current.startedAt}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: current.startedAt,
      endedAt: Date.now(),
      up: current.up,
      down: current.down,
    };

    if (session.up > 0 || session.down > 0) {
      sessions.push(session);
      saveSessions();
      showSummary(session);
    }

    current = null;
    startStopBtn.textContent = "▶️ 운동 시작";
    startStopBtn.classList.remove("stop");
    sessionStatus.textContent = "운동을 시작해보세요";
    timerDisplay.textContent = "00:00";
    renderCurrentCounts();
    renderAll();
  }

  function updateTimer() {
    if (!current) return;
    timerDisplay.textContent = formatTime(Date.now() - current.startedAt);
  }

  function getStepSize() {
    const v = parseInt(stepSizeInput.value, 10);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function addCount(type) {
    if (!current) {
      startSession();
    }
    const amount = getStepSize();
    current[type] += amount;
    current.actions.push({ type, amount });
    undoBtn.disabled = false;
    renderCurrentCounts();
  }

  function undoLast() {
    if (!current || current.actions.length === 0) return;
    const last = current.actions.pop();
    current[last.type] -= last.amount;
    undoBtn.disabled = current.actions.length === 0;
    renderCurrentCounts();
  }

  function renderCurrentCounts() {
    upCountEl.textContent = current ? current.up : 0;
    downCountEl.textContent = current ? current.down : 0;
    undoBtn.disabled = !current || current.actions.length === 0;
  }

  function showSummary(session) {
    const duration = formatTime(session.endedAt - session.startedAt);
    const kcal = kcalFor(session.up, session.down).toFixed(1);
    summaryBody.innerHTML = `
      <div>⏱️ 운동 시간: <strong>${duration}</strong></div>
      <div>⬆️ 오른 계단: <span class="up-txt">${session.up}칸</span></div>
      <div>⬇️ 내린 계단: <span class="down-txt">${session.down}칸</span></div>
      <div>🔥 소모 칼로리: <strong>${kcal} kcal</strong></div>
    `;
    summaryModal.classList.remove("hidden");
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfWeek(ts) {
    const d = new Date(ts);
    const day = d.getDay(); // 0 = Sunday
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }

  function renderStats() {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    let todayUp = 0, todayDown = 0;
    let weekUp = 0, weekDown = 0;
    let totalUp = 0, totalDown = 0;

    for (const s of sessions) {
      totalUp += s.up;
      totalDown += s.down;
      if (s.startedAt >= weekStart) {
        weekUp += s.up;
        weekDown += s.down;
      }
      if (s.startedAt >= todayStart) {
        todayUp += s.up;
        todayDown += s.down;
      }
    }

    todayUpEl.textContent = todayUp;
    todayDownEl.textContent = todayDown;
    weekUpEl.textContent = weekUp;
    weekDownEl.textContent = weekDown;
    totalUpEl.textContent = totalUp;
    totalDownEl.textContent = totalDown;
    todayCaloriesEl.textContent = `${kcalFor(todayUp, todayDown).toFixed(1)} kcal`;
    totalCaloriesEl.textContent = `${kcalFor(totalUp, totalDown).toFixed(1)} kcal`;
  }

  function renderHistory() {
    const items = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
    historyList.innerHTML = "";

    if (items.length === 0) {
      historyList.appendChild(emptyHistoryMsg);
      return;
    }

    const fmt = new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const s of items) {
      const li = document.createElement("li");
      li.className = "history-item";
      const kcal = kcalFor(s.up, s.down).toFixed(1);
      const duration = formatTime(s.endedAt - s.startedAt);
      li.innerHTML = `
        <div class="h-main">
          <div class="h-date">${fmt.format(s.startedAt)} · ${duration} · ${kcal} kcal</div>
          <div class="h-counts">
            <span class="up-txt">⬆️ ${s.up}</span>&nbsp;&nbsp;
            <span class="down-txt">⬇️ ${s.down}</span>
          </div>
        </div>
        <button class="h-delete" aria-label="삭제" data-id="${s.id}">🗑️</button>
      `;
      historyList.appendChild(li);
    }

    historyList.querySelectorAll(".h-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        sessions = sessions.filter((s) => s.id !== id);
        saveSessions();
        renderAll();
      });
    });
  }

  function renderChart() {
    const ctx = weekChart.getContext("2d");
    const w = weekChart.width;
    const h = weekChart.height;
    ctx.clearRect(0, 0, w, h);

    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d.getTime());
    }

    const data = days.map((dayStart) => {
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      let up = 0, down = 0;
      for (const s of sessions) {
        if (s.startedAt >= dayStart && s.startedAt < dayEnd) {
          up += s.up;
          down += s.down;
        }
      }
      return { up, down, dayStart };
    });

    const maxVal = Math.max(1, ...data.map((d) => Math.max(d.up, d.down)));
    const padding = { top: 10, bottom: 30, left: 10, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const groupW = chartW / data.length;
    const barW = groupW * 0.32;

    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    const weekdayFmt = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

    data.forEach((d, i) => {
      const groupX = padding.left + i * groupW;
      const upH = (d.up / maxVal) * chartH;
      const downH = (d.down / maxVal) * chartH;

      ctx.fillStyle = "#16a34a";
      ctx.fillRect(groupX + groupW / 2 - barW - 2, padding.top + chartH - upH, barW, upH);

      ctx.fillStyle = "#2563eb";
      ctx.fillRect(groupX + groupW / 2 + 2, padding.top + chartH - downH, barW, downH);

      ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
      ctx.fillText(weekdayFmt.format(d.dayStart), groupX + groupW / 2, h - 10);
    });
  }

  function renderAll() {
    renderStats();
    renderHistory();
    renderChart();
  }

  // Event listeners
  upBtn.addEventListener("click", () => addCount("up"));
  downBtn.addEventListener("click", () => addCount("down"));
  undoBtn.addEventListener("click", undoLast);

  startStopBtn.addEventListener("click", () => {
    if (current) {
      endSession();
    } else {
      startSession();
    }
  });

  settingsBtn.addEventListener("click", () => {
    weightInput.value = settings.weight;
    settingsModal.classList.remove("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => {
    const w = parseInt(weightInput.value, 10);
    if (Number.isFinite(w) && w > 0) {
      settings.weight = w;
      saveSettings();
    }
    settingsModal.classList.add("hidden");
    renderAll();
  });

  resetDataBtn.addEventListener("click", () => {
    if (confirm("모든 운동 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      sessions = [];
      saveSessions();
      settingsModal.classList.add("hidden");
      renderAll();
    }
  });

  closeSummaryBtn.addEventListener("click", () => {
    summaryModal.classList.add("hidden");
  });

  weightInput.value = settings.weight;
  renderAll();
})();
