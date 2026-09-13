(() => {
  "use strict";

  const STORAGE_KEY = "staircount_sessions_v1";
  const SETTINGS_KEY = "staircount_settings_v1";

  // Base kcal per single stair step at a "normal" pace, calibrated for a 70kg person.
  // Climbing costs roughly 3-4x more than descending for the same step count.
  const KCAL_PER_STEP_UP = 0.17;
  const KCAL_PER_STEP_DOWN = 0.05;

  // Pace tiers in combined steps/minute -> intensity multiplier applied on top
  // of the base kcal/step. Faster pace costs disproportionately more per step
  // (harder push-off, higher heart rate), matching how stair-climbing MET
  // values rise with speed. Descending is affected less by pace than climbing.
  const PACE_TIERS = [
    { max: 40, label: "여유", mult: 0.8 },
    { max: 70, label: "보통", mult: 1.0 },
    { max: 110, label: "빠름", mult: 1.4 },
    { max: Infinity, label: "전력질주", mult: 1.9 },
  ];
  const MIN_DURATION_MIN = 0.1; // guards against divide-by-zero on near-instant taps
  const DOWN_PACE_SENSITIVITY = 0.4; // descending intensity scales at 40% of climbing's

  // In-workout coaching cues, rotated while a session is running.
  const COACH_TIPS = [
    "💡 올라갈 때: 발 전체를 딛고, 무릎을 발끝 방향으로 유지하세요",
    "💡 올라갈 때: 반동 대신 엉덩이 힘으로 밀어 올리세요",
    "💡 내려갈 때: 서두르지 말고 무릎을 살짝 굽힌 채로 받아내세요",
    "💡 내려갈 때: 무릎이 안쪽으로 무너지지 않게 주의하세요",
    "💡 무릎 안쪽·슬개골에 통증이 오면 즉시 멈추세요",
  ];
  const COACH_TIP_INTERVAL_SEC = 8;
  const FAST_DOWN_PACE_MULT = 1.4; // "빠름" tier and above triggers the slow-down warning

  // Step detection from devicemotion's accelerationIncludingGravity magnitude:
  // a footstep shows up as a brief spike above a slow-moving baseline (which
  // tracks gravity + the phone's average orientation). Direction (up/down)
  // can't be derived from the accelerometer alone, so the user selects it.
  const STEP_THRESHOLD = 1.2; // m/s^2 deviation from baseline that counts as a step
  const STEP_RESET_THRESHOLD = 0.5; // deviation must fall back below this before the next step can fire
  const STEP_MIN_INTERVAL_MS = 250; // fastest plausible step cadence guard
  const BASELINE_SMOOTHING = 0.85; // low-pass filter coefficient tracking gravity/orientation
  const MOTION_DATA_TIMEOUT_MS = 3000; // how long to wait for a first sensor reading before warning

  const el = (id) => document.getElementById(id);

  const timerDisplay = el("timerDisplay");
  const sessionStatus = el("sessionStatus");
  const coachTip = el("coachTip");
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
  const healthWorkerUrlInput = el("healthWorkerUrl");
  const healthSyncTokenInput = el("healthSyncToken");

  const healthFlightsEl = el("healthFlights");
  const healthStepsEl = el("healthSteps");
  const healthSyncedAtEl = el("healthSyncedAt");
  const healthSyncBtn = el("healthSyncBtn");

  const autoDetectBtn = el("autoDetectBtn");
  const autoDirectionGroup = el("autoDirectionGroup");
  const autoDirUpBtn = el("autoDirUpBtn");
  const autoDirDownBtn = el("autoDirDownBtn");
  const motionStatus = el("motionStatus");

  const summaryModal = el("summaryModal");
  const summaryBody = el("summaryBody");
  const closeSummaryBtn = el("closeSummaryBtn");

  const weekChart = el("weekChart");

  /** @typedef {{id:string, startedAt:number, endedAt:number, up:number, down:number}} Session */

  let sessions = loadSessions();
  let settings = loadSettings();

  let current = null; // { startedAt, up, down, actions: [{type:'up'|'down', amount:number}] }
  let timerInterval = null;

  const motionState = {
    active: false,
    direction: "up", // which counter detected steps add to
    baseline: null,
    aboveThreshold: false,
    lastStepAt: 0,
    detectedSteps: 0,
    firstEventAt: 0,
    gotFirstEvent: false,
    watchdogTimer: null,
  };

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
    const defaults = { weight: 60, healthWorkerUrl: "", healthSyncToken: "" };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function paceTier(stepsPerMinute) {
    return PACE_TIERS.find((t) => stepsPerMinute < t.max);
  }

  /** Steps/minute and intensity tier for a session (or the in-progress one). */
  function paceInfo({ up, down, startedAt, endedAt }) {
    const durationMin = Math.max((endedAt - startedAt) / 60000, MIN_DURATION_MIN);
    const stepsPerMinute = (up + down) / durationMin;
    return { stepsPerMinute, tier: paceTier(stepsPerMinute) };
  }

  /** Calorie estimate for one session, factoring in weight and time-based pace. */
  function kcalForSession(session) {
    const { tier } = paceInfo(session);
    const weightFactor = settings.weight / 70;
    const upMult = tier.mult;
    const downMult = 1 + (tier.mult - 1) * DOWN_PACE_SENSITIVITY;
    return (
      session.up * KCAL_PER_STEP_UP * weightFactor * upMult +
      session.down * KCAL_PER_STEP_DOWN * weightFactor * downMult
    );
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
    if (motionState.active) {
      stopAutoDetect();
    }

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
    coachTip.textContent = "💡 시작 전 5분, 발목·무릎 가볍게 풀어주세요";
    coachTip.classList.remove("warning");
    renderCurrentCounts();
    renderAll();
  }

  function updateTimer() {
    if (!current) return;
    const now = Date.now();
    timerDisplay.textContent = formatTime(now - current.startedAt);

    const elapsedSec = (now - current.startedAt) / 1000;
    if (elapsedSec < 5 || current.up + current.down === 0) {
      sessionStatus.textContent = "운동 중...";
      updateCoachTip(elapsedSec, null);
      return;
    }
    const { stepsPerMinute, tier } = paceInfo({ ...current, endedAt: now });
    sessionStatus.textContent = `운동 중 · ${tier.label} 페이스 (${Math.round(stepsPerMinute)}걸음/분)`;
    updateCoachTip(elapsedSec, tier);
  }

  /**
   * Warns when the most recent step was a fast descent (highest knee impact);
   * otherwise rotates through general form reminders.
   */
  function updateCoachTip(elapsedSec, tier) {
    const lastAction = current.actions[current.actions.length - 1];
    const descendingFast = lastAction && lastAction.type === "down" && tier && tier.mult >= FAST_DOWN_PACE_MULT;

    if (descendingFast) {
      coachTip.textContent = "⚠️ 내려가는 속도가 빠릅니다 — 천천히, 무릎을 살짝 굽혀 받으세요";
      coachTip.classList.add("warning");
      return;
    }

    coachTip.classList.remove("warning");
    const tipIndex = Math.floor(elapsedSec / COACH_TIP_INTERVAL_SEC) % COACH_TIPS.length;
    coachTip.textContent = COACH_TIPS[tipIndex];
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
    updateTimer();
  }

  function undoLast() {
    if (!current || current.actions.length === 0) return;
    const last = current.actions.pop();
    current[last.type] -= last.amount;
    undoBtn.disabled = current.actions.length === 0;
    renderCurrentCounts();
    updateTimer();
  }

  function renderCurrentCounts() {
    upCountEl.textContent = current ? current.up : 0;
    downCountEl.textContent = current ? current.down : 0;
    undoBtn.disabled = !current || current.actions.length === 0;
  }

  function showSummary(session) {
    const duration = formatTime(session.endedAt - session.startedAt);
    const kcal = kcalForSession(session).toFixed(1);
    const { stepsPerMinute, tier } = paceInfo(session);
    summaryBody.innerHTML = `
      <div>⏱️ 운동 시간: <strong>${duration}</strong></div>
      <div>⬆️ 오른 계단: <span class="up-txt">${session.up}칸</span></div>
      <div>⬇️ 내린 계단: <span class="down-txt">${session.down}칸</span></div>
      <div>🏃 페이스: <strong>${tier.label}</strong> (${Math.round(stepsPerMinute)}걸음/분)</div>
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

    let todayUp = 0, todayDown = 0, todayKcal = 0;
    let weekUp = 0, weekDown = 0;
    let totalUp = 0, totalDown = 0, totalKcal = 0;

    for (const s of sessions) {
      const kcal = kcalForSession(s);
      totalUp += s.up;
      totalDown += s.down;
      totalKcal += kcal;
      if (s.startedAt >= weekStart) {
        weekUp += s.up;
        weekDown += s.down;
      }
      if (s.startedAt >= todayStart) {
        todayUp += s.up;
        todayDown += s.down;
        todayKcal += kcal;
      }
    }

    todayUpEl.textContent = todayUp;
    todayDownEl.textContent = todayDown;
    weekUpEl.textContent = weekUp;
    weekDownEl.textContent = weekDown;
    totalUpEl.textContent = totalUp;
    totalDownEl.textContent = totalDown;
    todayCaloriesEl.textContent = `${todayKcal.toFixed(1)} kcal`;
    totalCaloriesEl.textContent = `${totalKcal.toFixed(1)} kcal`;
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
      const kcal = kcalForSession(s).toFixed(1);
      const duration = formatTime(s.endedAt - s.startedAt);
      const { tier } = paceInfo(s);
      li.innerHTML = `
        <div class="h-main">
          <div class="h-date">${fmt.format(s.startedAt)} · ${duration} · ${tier.label} · ${kcal} kcal</div>
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

    const styles = getComputedStyle(document.documentElement);
    const upColor = styles.getPropertyValue("--up").trim() || "#c85a28";
    const downColor = styles.getPropertyValue("--down").trim() || "#2a6c8f";
    const mutedColor = styles.getPropertyValue("--muted").trim() || "#5c6570";

    ctx.font = "600 12px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";

    const weekdayFmt = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

    data.forEach((d, i) => {
      const groupX = padding.left + i * groupW;
      const upH = (d.up / maxVal) * chartH;
      const downH = (d.down / maxVal) * chartH;

      ctx.fillStyle = upColor;
      ctx.fillRect(groupX + groupW / 2 - barW - 2, padding.top + chartH - upH, barW, upH);

      ctx.fillStyle = downColor;
      ctx.fillRect(groupX + groupW / 2 + 2, padding.top + chartH - downH, barW, downH);

      ctx.fillStyle = mutedColor;
      ctx.fillText(weekdayFmt.format(d.dayStart), groupX + groupW / 2, h - 10);
    });
  }

  function renderAll() {
    renderStats();
    renderHistory();
    renderChart();
  }

  /**
   * Pulls today's Apple Health "Flights Climbed" / "Steps" from the
   * Cloudflare Worker bridge (fed by an iOS Shortcuts automation).
   * See healthsync/README.md for how the bridge is set up.
   */
  async function syncHealthData() {
    const url = settings.healthWorkerUrl.trim();
    const token = settings.healthSyncToken.trim();

    if (!url) {
      healthSyncedAtEl.textContent = "설정에서 연동 주소를 먼저 입력해주세요";
      return;
    }

    healthSyncedAtEl.textContent = "동기화 중...";
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${url.replace(/\/$/, "")}/latest?date=${today}`, {
        headers: { "X-Sync-Token": token },
      });

      if (res.status === 401) {
        healthSyncedAtEl.textContent = "인증 실패 — 토큰을 확인해주세요";
        return;
      }
      if (!res.ok) {
        healthSyncedAtEl.textContent = "동기화 실패 — 잠시 후 다시 시도해주세요";
        return;
      }

      const data = await res.json();
      if (!data) {
        healthFlightsEl.textContent = "—";
        healthStepsEl.textContent = "—";
        healthSyncedAtEl.textContent = "오늘 아직 전송된 데이터가 없어요";
        return;
      }

      healthFlightsEl.textContent = `${data.flightsClimbed}층`;
      healthStepsEl.textContent = `${data.steps}보`;
      const syncedTime = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(
        data.syncedAt
      );
      healthSyncedAtEl.textContent = `마지막 동기화: ${syncedTime}`;
    } catch {
      healthSyncedAtEl.textContent = "연동 주소에 연결할 수 없어요";
    }
  }

  /**
   * Peak-detects footsteps in the combined accelerationIncludingGravity
   * magnitude: a step shows up as a brief spike above a slow-adapting
   * baseline that tracks gravity/orientation. Hysteresis (rise above
   * STEP_THRESHOLD, must fall back below STEP_RESET_THRESHOLD) plus a
   * minimum interval keeps one physical step from firing multiple counts.
   */
  function handleDeviceMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.x === undefined) return;

    if (!motionState.gotFirstEvent) {
      motionState.gotFirstEvent = true;
      clearTimeout(motionState.watchdogTimer);
    }

    const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);

    if (motionState.baseline === null) {
      motionState.baseline = magnitude;
      return;
    }

    const deviation = Math.abs(magnitude - motionState.baseline);
    const now = Date.now();

    if (
      !motionState.aboveThreshold &&
      deviation > STEP_THRESHOLD &&
      now - motionState.lastStepAt > STEP_MIN_INTERVAL_MS
    ) {
      // Step peak: count it and freeze the baseline so the spike itself
      // doesn't drag the baseline toward it and mask the very next step.
      motionState.aboveThreshold = true;
      motionState.lastStepAt = now;
      motionState.detectedSteps += 1;
      addCount(motionState.direction);
      updateMotionStatus();
      return;
    }

    if (motionState.aboveThreshold) {
      if (deviation < STEP_RESET_THRESHOLD) {
        motionState.aboveThreshold = false;
        motionState.baseline = motionState.baseline * BASELINE_SMOOTHING + magnitude * (1 - BASELINE_SMOOTHING);
      }
      return; // still settling from the last spike; hold the baseline
    }

    motionState.baseline = motionState.baseline * BASELINE_SMOOTHING + magnitude * (1 - BASELINE_SMOOTHING);
  }

  function updateMotionStatus() {
    motionStatus.hidden = false;
    motionStatus.classList.remove("warning");
    motionStatus.textContent = `센서 연결됨 · 감지된 걸음 ${motionState.detectedSteps}`;
  }

  async function startAutoDetect() {
    if (typeof DeviceMotionEvent === "undefined") {
      motionStatus.hidden = false;
      motionStatus.classList.add("warning");
      motionStatus.textContent = "이 기기/브라우저는 동작 센서를 지원하지 않아요. 수동으로 탭해주세요.";
      return;
    }

    if (typeof DeviceMotionEvent.requestPermission === "function") {
      let result;
      try {
        result = await DeviceMotionEvent.requestPermission();
      } catch {
        result = "denied";
      }
      if (result !== "granted") {
        motionStatus.hidden = false;
        motionStatus.classList.add("warning");
        motionStatus.textContent = "센서 접근 권한이 거부됐어요. 설정 > Safari > 모션 및 방향 접근을 확인해주세요.";
        return;
      }
    }

    motionState.active = true;
    motionState.baseline = null;
    motionState.aboveThreshold = false;
    motionState.detectedSteps = 0;
    motionState.gotFirstEvent = false;

    window.addEventListener("devicemotion", handleDeviceMotion);

    motionState.watchdogTimer = setTimeout(() => {
      if (!motionState.gotFirstEvent) {
        motionStatus.hidden = false;
        motionStatus.classList.add("warning");
        motionStatus.textContent = "센서 데이터를 받지 못했어요. 기기가 지원하지 않거나 권한이 꺼져 있을 수 있어요.";
      }
    }, MOTION_DATA_TIMEOUT_MS);

    autoDetectBtn.textContent = "⏹️ 자동 감지 중지";
    autoDetectBtn.classList.add("active");
    autoDirectionGroup.hidden = false;
    motionStatus.hidden = false;
    motionStatus.classList.remove("warning");
    motionStatus.textContent = "센서 연결 중...";
  }

  function stopAutoDetect() {
    motionState.active = false;
    clearTimeout(motionState.watchdogTimer);
    window.removeEventListener("devicemotion", handleDeviceMotion);

    autoDetectBtn.textContent = "📡 자동 감지 시작 (가속도·자이로 센서)";
    autoDetectBtn.classList.remove("active");
    autoDirectionGroup.hidden = true;
    motionStatus.hidden = true;
  }

  function setAutoDirection(direction) {
    motionState.direction = direction;
    autoDirUpBtn.classList.toggle("active", direction === "up");
    autoDirDownBtn.classList.toggle("active", direction === "down");
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
    healthWorkerUrlInput.value = settings.healthWorkerUrl;
    healthSyncTokenInput.value = settings.healthSyncToken;
    settingsModal.classList.remove("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => {
    const w = parseInt(weightInput.value, 10);
    if (Number.isFinite(w) && w > 0) {
      settings.weight = w;
    }
    const urlChanged = settings.healthWorkerUrl !== healthWorkerUrlInput.value.trim();
    const tokenChanged = settings.healthSyncToken !== healthSyncTokenInput.value.trim();
    settings.healthWorkerUrl = healthWorkerUrlInput.value.trim();
    settings.healthSyncToken = healthSyncTokenInput.value.trim();
    saveSettings();
    settingsModal.classList.add("hidden");
    renderAll();
    if ((urlChanged || tokenChanged) && settings.healthWorkerUrl) {
      syncHealthData();
    }
  });

  healthSyncBtn.addEventListener("click", syncHealthData);

  autoDetectBtn.addEventListener("click", () => {
    if (motionState.active) {
      stopAutoDetect();
    } else {
      startAutoDetect();
    }
  });

  autoDirUpBtn.addEventListener("click", () => setAutoDirection("up"));
  autoDirDownBtn.addEventListener("click", () => setAutoDirection("down"));

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
  if (settings.healthWorkerUrl) {
    syncHealthData();
  }
})();
