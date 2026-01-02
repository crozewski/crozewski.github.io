// Milo Tap & Listen
// Static, no frameworks, GitHub Pages friendly.

const $ = (sel) => document.querySelector(sel);

const state = {
  data: null,
  modeKey: null,
  target: null,
  choices: [],
  attempts: 0,
  stars: 0,
  idleTimer: null,
  audio: null,
  audioUnlocked: false,
  settings: {
    difficulty: "standard",
    idleReplay: "off"
  }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem("milo_settings_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.difficulty) state.settings.difficulty = parsed.difficulty;
    if (parsed?.idleReplay) state.settings.idleReplay = parsed.idleReplay;
  } catch {}
}

function saveSettings() {
  localStorage.setItem("milo_settings_v1", JSON.stringify(state.settings));
}

function setScreen(screenId) {
  ["#screenHome", "#screenGame"].forEach(id => {
    $(id).classList.toggle("screen--active", id === screenId);
  });
}

function randInt(n) { return Math.floor(Math.random() * n); }
function pickOne(arr) { return arr[randInt(arr.length)]; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultyChoicesCount() {
  const map = state.data.app?.choices || { easy: 4, standard: 6, challenge: 6 };
  return map[state.settings.difficulty] ?? 6;
}

function modeTitle(key) {
  return state.data.modes[key]?.title ?? key;
}

async function fetchData() {
  const res = await fetch("./data/content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return await res.json();
}

// iOS Safari: audio must be started from a user gesture.
async function unlockAudio() {
  if (state.audioUnlocked) return true;
  try {
    state.audio = new Audio();
    state.audio.volume = 1.0;
    // Attempt a silent-ish play with an empty src won't work; instead we mark unlocked after first real play.
    return true;
  } catch {
    return false;
  }
}

function stopAudio() {
  if (!state.audio) return;
  try {
    state.audio.pause();
    state.audio.currentTime = 0;
  } catch {}
}

function playAudio(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(false);

    const audio = state.audio || new Audio();
    state.audio = audio;

    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);

    stopAudio();
    audio.src = src;

    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        state.audioUnlocked = true;
      }).catch(() => {
        // If play is blocked, we fail silently; user can tap replay.
        resolve(false);
      });
    }
  });
}

async function playFromPool(pool) {
  if (!pool || pool.length === 0) return false;
  const src = pickOne(pool);
  return await playAudio(src);
}

function setToast(msg) {
  $("#toast").textContent = msg || "";
}

function setStars(n) {
  state.stars = n;
  $("#star1").textContent = n >= 1 ? "⭐" : "☆";
  $("#star2").textContent = n >= 2 ? "⭐" : "☆";
  $("#star3").textContent = n >= 3 ? "⭐" : "☆";
}

function celebrate() {
  const el = $("#celebrate");
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 850);
}

function clearIdleTimer() {
  if (state.idleTimer) clearTimeout(state.idleTimer);
  state.idleTimer = null;
}

function startIdleTimer() {
  clearIdleTimer();
  if (state.settings.idleReplay !== "on") return;
  state.idleTimer = setTimeout(() => {
    // gentle replay after idle
    replayPrompt();
  }, 7000);
}

function getModeItems() {
  return state.data.modes[state.modeKey].items;
}

function pickTargetAndChoices() {
  const items = getModeItems();
  const count = Math.min(difficultyChoicesCount(), items.length);

  const target = pickOne(items);
  const rest = items.filter(x => x.id !== target.id);

  // easy mode: prefer visually distinct distractors (best effort)
  const distractors = shuffle(rest).slice(0, count - 1);

  state.target = target;
  state.choices = shuffle([target, ...distractors]);
  state.attempts = 0;
}

function renderChoices() {
  const box = $("#choices");
  box.innerHTML = "";

  // 4 choices => 2x2 layout (still in a 3-col grid, but we'll span nicely)
  if (difficultyChoicesCount() === 4) {
    box.style.gridTemplateColumns = "repeat(2, 1fr)";
  } else {
    box.style.gridTemplateColumns = "repeat(3, 1fr)";
  }

  state.choices.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.dataset.id = item.id;

    const main = document.createElement("div");
    main.textContent = item.display ?? item.id;
    btn.appendChild(main);

    // small label for parents (optional)
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = item.id;
    btn.appendChild(sub);

    btn.addEventListener("click", () => onChoice(item, btn));
    box.appendChild(btn);
  });

  startIdleTimer();
}

async function replayPrompt() {
  clearIdleTimer();
  setToast("");
  await playFromPool(state.target.prompt);
  startIdleTimer();
}

async function onChoice(item, btnEl) {
  clearIdleTimer();
  stopAudio();

  // prevent double taps during feedback
  disableChoices(true);

  const correct = item.id === state.target.id;

  if (correct) {
    btnEl.classList.add("correct");
    setToast("Nice!");
    celebrate();

    // reinforce label first, then a generic praise
    await playFromPool(state.target.label);
    await playFromPool(state.data.feedback.correct);

    state.stars = (state.stars + 1) % 4; // cycles 0-3
    setStars(state.stars);

    setTimeout(() => {
      nextRound();
    }, 250);
  } else {
    btnEl.classList.add("wrong");
    state.attempts += 1;

    // gentle retry
    await playFromPool(state.data.feedback.tryagain);

    // hints escalate
    if (state.attempts === 1) {
      // wiggle correct
      hintCorrectTile();
    } else if (state.attempts >= 2 && state.settings.difficulty === "easy") {
      // in easy mode, reduce choices after 2 misses
      reduceChoicesForEasy();
    }

    // allow trying again
    disableChoices(false);
    startIdleTimer();
  }
}

function disableChoices(disabled) {
  document.querySelectorAll(".choiceBtn").forEach(b => b.disabled = !!disabled);
}

function hintCorrectTile() {
  const correctBtn = [...document.querySelectorAll(".choiceBtn")]
    .find(b => b.dataset.id === state.target.id);
  if (!correctBtn) return;
  correctBtn.classList.remove("hint");
  // reflow
  void correctBtn.offsetWidth;
  correctBtn.classList.add("hint");
}

function reduceChoicesForEasy() {
  // Keep correct + 2 distractors
  const keep = new Set([state.target.id]);
  const distractors = state.choices.filter(x => x.id !== state.target.id);
  shuffle(distractors).slice(0, 2).forEach(x => keep.add(x.id));
  state.choices = state.choices.filter(x => keep.has(x.id));
  renderChoices();
  // keep choices enabled
  disableChoices(false);
}

async function startMode(modeKey) {
  state.modeKey = modeKey;
  $("#modeBadge").textContent = modeTitle(modeKey);
  setStars(0);
  setToast("");
  setScreen("#screenGame");

  pickTargetAndChoices();
  renderChoices();

  // Try autoplay prompt (will work after a user gesture on most devices)
  await replayPrompt();
  disableChoices(false);
}

function nextRound() {
  setToast("");
  pickTargetAndChoices();
  renderChoices();
  disableChoices(false);
  replayPrompt();
}

function wireUI() {
  // Mode buttons
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await unlockAudio();
      await startMode(btn.dataset.mode);
    });
  });

  // Replay
  $("#replayBtn").addEventListener("click", async () => {
    await unlockAudio();
    await replayPrompt();
  });

  // Back
  $("#backBtn").addEventListener("click", () => {
    stopAudio();
    clearIdleTimer();
    setScreen("#screenHome");
  });

  // Parent settings (press-and-hold)
  const holdBtn = $("#settingsHold");
  let holdTimer = null;

  const openSettings = () => {
    $("#difficultySelect").value = state.settings.difficulty;
    $("#idleReplaySelect").value = state.settings.idleReplay;
    $("#settingsModal").classList.add("open");
  };

  const closeSettings = () => {
    $("#settingsModal").classList.remove("open");
  };

  const startHold = () => {
    holdTimer = setTimeout(() => {
      openSettings();
    }, 1600);
  };

  const cancelHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  };

  holdBtn.addEventListener("touchstart", startHold);
  holdBtn.addEventListener("touchend", cancelHold);
  holdBtn.addEventListener("touchcancel", cancelHold);
  holdBtn.addEventListener("mousedown", startHold);
  holdBtn.addEventListener("mouseup", cancelHold);
  holdBtn.addEventListener("mouseleave", cancelHold);

  $("#closeSettingsBtn").addEventListener("click", () => {
    state.settings.difficulty = $("#difficultySelect").value;
    state.settings.idleReplay = $("#idleReplaySelect").value;
    saveSettings();
    closeSettings();

    // If in game, rerender with new choice count
    if ($("#screenGame").classList.contains("screen--active")) {
      pickTargetAndChoices();
      renderChoices();
      disableChoices(false);
      replayPrompt();
    }
  });

  // Tap outside modal card closes (parent convenience)
  $("#settingsModal").addEventListener("click", (e) => {
    if (e.target.id === "settingsModal") {
      closeSettings();
    }
  });
}

async function main() {
  loadSettings();
  wireUI();
  state.data = await fetchData();
}

main().catch(err => {
  console.error(err);
  alert("Could not load app data. Check console for details.");
});
