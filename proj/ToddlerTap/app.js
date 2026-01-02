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
  settings: { difficulty: "standard", idleReplay: "off" },
  fx: { canvas: null, ctx: null, dpr: 1, particles: [], raf: null }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem("toddler_tap_settings_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.difficulty) state.settings.difficulty = parsed.difficulty;
    if (parsed?.idleReplay) state.settings.idleReplay = parsed.idleReplay;
  } catch {}
}
function saveSettings() {
  localStorage.setItem("toddler_tap_settings_v1", JSON.stringify(state.settings));
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

async function fetchData() {
  const res = await fetch("./data/content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return await res.json();
}

async function unlockAudio() {
  if (state.audioUnlocked) return true;
  try { state.audio = new Audio(); state.audio.volume = 1.0; return true; }
  catch { return false; }
}
function stopAudio() {
  if (!state.audio) return;
  try { state.audio.pause(); state.audio.currentTime = 0; } catch {}
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
      p.then(() => { state.audioUnlocked = true; }).catch(() => resolve(false));
    }
  });
}
async function playFromPool(pool) {
  if (!pool || pool.length === 0) return false;
  return await playAudio(pickOne(pool));
}

function setToast(msg) { $("#toast").textContent = msg || ""; }
function setStars(n) {
  state.stars = n;
  $("#star1").textContent = n >= 1 ? "⭐" : "☆";
  $("#star2").textContent = n >= 2 ? "⭐" : "☆";
  $("#star3").textContent = n >= 3 ? "⭐" : "☆";
}

function clearIdleTimer() { if (state.idleTimer) clearTimeout(state.idleTimer); state.idleTimer = null; }
function startIdleTimer() {
  clearIdleTimer();
  if (state.settings.idleReplay !== "on") return;
  state.idleTimer = setTimeout(() => replayPrompt(), 7000);
}

function getModeItems() {
  return state.data.modes[state.modeKey].items;
}

function pickTargetAndChoices() {
  const items = getModeItems();
  const count = Math.min(difficultyChoicesCount(), items.length);
  const target = pickOne(items);
  const rest = items.filter(x => x.id !== target.id);
  const distractors = shuffle(rest).slice(0, count - 1);
  state.target = target;
  state.choices = shuffle([target, ...distractors]);
  state.attempts = 0;
}

function disableChoices(disabled) {
  document.querySelectorAll(".choiceBtn").forEach(b => b.disabled = !!disabled);
}

function renderChoices() {
  const box = $("#choices");
  box.innerHTML = "";
  const count = difficultyChoicesCount();
  box.style.gridTemplateColumns = count === 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

  state.choices.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.dataset.id = item.id;

    if (item.image) {
      const img = document.createElement("img");
      img.className = "choiceImg";
      img.src = item.image;
      img.alt = item.id;
      img.loading = "lazy";
      btn.appendChild(img);
    } else {
      const t = document.createElement("div");
      t.className = "choiceText";
      t.textContent = item.display ?? item.id;
      btn.appendChild(t);
    }

    // tiny parent label (optional)
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

function hintCorrectTile() {
  const correctBtn = [...document.querySelectorAll(".choiceBtn")]
    .find(b => b.dataset.id === state.target.id);
  if (!correctBtn) return;
  correctBtn.classList.remove("hint");
  void correctBtn.offsetWidth;
  correctBtn.classList.add("hint");
}

function reduceChoicesForEasy() {
  const keep = new Set([state.target.id]);
  const distractors = state.choices.filter(x => x.id !== state.target.id);
  shuffle(distractors).slice(0, 2).forEach(x => keep.add(x.id));
  state.choices = state.choices.filter(x => keep.has(x.id));
  renderChoices();
  disableChoices(false);
}

async function onChoice(item, btnEl) {
  clearIdleTimer();
  stopAudio();
  disableChoices(true);

  const correct = item.id === state.target.id;

  if (correct) {
    btnEl.classList.add("correct");
    setToast("Yay!");
    burstCelebrate(btnEl);

    await playFromPool(state.target.label);
    await playFromPool(state.data.feedback.correct);

    state.stars = (state.stars + 1) % 4;
    setStars(state.stars);

    setTimeout(() => nextRound(), 250);
  } else {
    btnEl.classList.add("wrong");
    state.attempts += 1;

    await playFromPool(state.data.feedback.tryagain);

    if (state.attempts === 1) hintCorrectTile();
    else if (state.attempts >= 2 && state.settings.difficulty === "easy") reduceChoicesForEasy();

    disableChoices(false);
    startIdleTimer();
  }
}

function nextRound() {
  setToast("");
  pickTargetAndChoices();
  renderChoices();
  disableChoices(false);
  replayPrompt();
}

async function startMode(modeKey) {
  state.modeKey = modeKey;

  $("#modeChipText").textContent = state.data.modes[modeKey]?.title ?? modeKey;
  const icon = state.data.app?.modeIcons?.[modeKey];
  if (icon) $("#modeChipIconImg").src = icon;

  setStars(0);
  setToast("");
  setScreen("#screenGame");

  pickTargetAndChoices();
  renderChoices();

  await replayPrompt();
  disableChoices(false);
}

/* --- Celebration FX (canvas confetti + emoji pops) --- */

function initFX() {
  const canvas = $("#fxCanvas");
  const ctx = canvas.getContext("2d");
  state.fx.canvas = canvas;
  state.fx.ctx = ctx;

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    state.fx.dpr = dpr;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener("resize", resize);
  resize();
}

function burstCelebrate(fromEl) {
  const rect = fromEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const emojis = ["⭐","✨","🎉","💛","🟡","🟠","🟢","🔵"];
  const colors = ["#ff5aa5","#ffd36e","#7ee081","#78c8ff","#b892ff","#ff8b5f"];

  for (let i = 0; i < 28; i++) state.fx.particles.push(makeConfetti(x, y, colors));
  for (let i = 0; i < 10; i++) state.fx.particles.push(makeEmojiPop(x, y, pickOne(emojis)));

  if (!state.fx.raf) {
    const tick = () => { state.fx.raf = requestAnimationFrame(tick); stepFX(); };
    state.fx.raf = requestAnimationFrame(tick);

    setTimeout(() => {
      cancelAnimationFrame(state.fx.raf);
      state.fx.raf = null;
      clearFX();
    }, 750);
  }
}

function makeConfetti(x, y, colors) {
  const angle = (Math.random() * Math.PI * 2);
  const speed = 6 + Math.random() * 8;
  return {
    type: "confetti",
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (3 + Math.random() * 3),
    g: 0.45 + Math.random() * 0.25,
    w: 6 + Math.random() * 8,
    h: 3 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (-0.2 + Math.random() * 0.4),
    life: 1.0,
    decay: 0.03 + Math.random() * 0.02,
    color: pickOne(colors)
  };
}
function makeEmojiPop(x, y, ch) {
  const angle = (-Math.PI/2) + (Math.random() * Math.PI);
  const speed = 3 + Math.random() * 6;
  return {
    type: "emoji",
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (2 + Math.random() * 2),
    g: 0.25,
    s: 22 + Math.random() * 18,
    rot: (-0.3 + Math.random() * 0.6),
    vr: (-0.08 + Math.random() * 0.16),
    life: 1.0,
    decay: 0.045 + Math.random() * 0.02,
    ch
  };
}
function clearFX() {
  const { ctx } = state.fx;
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  state.fx.particles = [];
}
function stepFX() {
  const { ctx } = state.fx;
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const p = state.fx.particles;
  for (let i = p.length - 1; i >= 0; i--) {
    const a = p[i];
    a.life -= a.decay;
    if (a.life <= 0) { p.splice(i, 1); continue; }

    a.vy += a.g;
    a.x += a.vx;
    a.y += a.vy;
    a.rot += a.vr;

    ctx.save();
    ctx.globalAlpha = Math.max(0, a.life);
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);

    if (a.type === "confetti") {
      ctx.fillStyle = a.color;
      ctx.fillRect(-a.w/2, -a.h/2, a.w, a.h);
    } else {
      ctx.font = `${Math.round(a.s)}px ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(a.ch, 0, 0);
    }

    ctx.restore();
  }
}

/* --- UI wiring --- */
function wireUI() {
  document.querySelectorAll(".modeRow").forEach(btn => {
    btn.addEventListener("click", async () => {
      await unlockAudio();
      await startMode(btn.dataset.mode);
    });
  });

  $("#replayBtn").addEventListener("click", async () => { await unlockAudio(); await replayPrompt(); });
  $("#promptBigReplay").addEventListener("click", async () => { await unlockAudio(); await replayPrompt(); });

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
  const closeSettings = () => $("#settingsModal").classList.remove("open");

  const startHold = () => { holdTimer = setTimeout(openSettings, 1600); };
  const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null; };

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

    if ($("#screenGame").classList.contains("screen--active")) {
      pickTargetAndChoices();
      renderChoices();
      disableChoices(false);
      replayPrompt();
    }
  });

  $("#settingsModal").addEventListener("click", (e) => {
    if (e.target.id === "settingsModal") closeSettings();
  });
}

async function main() {
  loadSettings();
  initFX();
  wireUI();
  state.data = await fetchData();
}

main().catch(err => {
  console.error(err);
  alert("Could not load app data. Check console for details.");
});
