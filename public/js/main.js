/* =========================================================
   AUSTIN.EXE — a chaotic-good birthday desktop
   ========================================================= */

/* ---------- Gemini helper ---------- */
async function gemini(prompt, { temperature = 1.0, max = 300 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AUSTIN_CONFIG.GEMINI_MODEL}:generateContent?key=${AUSTIN_CONFIG.GEMINI_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: max },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`gemini ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

/* ---------- window manager ---------- */
const WM = {
  zTop: 10,
  windows: new Map(), // id -> { el, taskBtn }

  openApp(app) {
    if (this.windows.has(app)) {
      this.focus(app);
      return;
    }
    const win = this.createWindow(app);
    this.windows.set(app, win);
    this.focus(app);
  },

  closeApp(app) {
    const w = this.windows.get(app);
    if (!w) return;
    w.el.remove();
    w.taskBtn.remove();
    this.windows.delete(app);
  },

  focus(app) {
    const w = this.windows.get(app);
    if (!w) return;
    this.windows.forEach(other => other.el.classList.remove("focused"));
    w.el.classList.add("focused");
    w.el.style.zIndex = ++this.zTop;
  },

  createWindow(app) {
    const tpl = document.getElementById("tpl-window");
    const el = tpl.content.firstElementChild.cloneNode(true);
    const titleBar = el.querySelector(".title-bar-text");
    const body = el.querySelector(".window-body");
    const closeBtn = el.querySelector(".close-btn");

    const spec = APPS[app];
    titleBar.textContent = spec.title;
    body.innerHTML = "";

    // Position window — keep it fully on-screen, especially on mobile
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estW = Math.min(520, vw - 20);
    const estH = Math.min(460, vh - 60);
    const maxLeft = Math.max(10, vw - estW - 10);
    const maxTop = Math.max(10, vh - estH - 50);
    el.style.left = Math.min(maxLeft, 40 + this.windows.size * 24) + "px";
    el.style.top = Math.min(maxTop, 60 + this.windows.size * 24) + "px";
    el.style.maxWidth = (vw - 20) + "px";

    document.body.appendChild(el);
    spec.init(body, el);
    return el;

    // drag
    this.makeDraggable(el, el.querySelector(".title-bar"));

    const doClose = (e) => { e.preventDefault(); e.stopPropagation(); this.closeApp(app); };
    closeBtn.addEventListener("click", doClose);
    closeBtn.addEventListener("touchend", doClose, { passive: false });
    el.addEventListener("mousedown", () => this.focus(app));
    el.addEventListener("touchstart", () => this.focus(app), { passive: true });

    // taskbar
    const tb = document.getElementById("task-buttons");
    const btn = document.createElement("button");
    btn.className = "task-btn";
    btn.textContent = spec.title;
    btn.addEventListener("click", () => this.focus(app));
    tb.appendChild(btn);

    return { el, taskBtn: btn };
  },

  makeDraggable(el, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    const start = (e) => {
      const t = e.touches?.[0] || e;
      dragging = true;
      sx = t.clientX; sy = t.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      e.preventDefault();
    };
    const move = (e) => {
      if (!dragging) return;
      const t = e.touches?.[0] || e;
      el.style.left = (ox + t.clientX - sx) + "px";
      el.style.top = (oy + t.clientY - sy) + "px";
    };
    const end = () => { dragging = false; };
    handle.addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    handle.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
  },
};

/* ---------- TERMINAL ---------- */
const TERMINAL_SYSTEM = `You are AUSTIN.AI, a chaotic-good surf-punk AI trapped in a vintage beach-town desktop computer. You answer prompts from whoever opens the terminal. Speak casually, dark-humored, slightly unhinged, occasionally warm. Keep every response to 1-3 sentences. Do not use lists, headers, or markdown. You love: lo-fi beach rock, cursed hardware, small-town chaos, questionable life choices. Today is Austin's birthday — if it comes up, you play it cool. Never break character. Never say you are an AI language model. If asked about sensitive stuff, deflect with a joke.`;

const TerminalApp = {
  init(body) {
    body.classList.add("terminal");
    body.innerHTML = "";
    const history = [];
    const log = (html, cls = "term-line") => {
      const p = document.createElement("div");
      p.className = cls;
      p.innerHTML = html;
      body.appendChild(p);
      body.scrollTop = body.scrollHeight;
    };
    log(`<span class="term-system">austin@beach:~ — chaotic-good shell v3.14 — type anything and hit enter</span>`);
    log(`<span class="term-system">(the computer's been down since 2003, but it still works somehow)</span>`);
    log("");

    const inputLine = document.createElement("div");
    inputLine.className = "term-input-line";
    inputLine.innerHTML = `<span class="term-prompt">austin@beach:~$</span>`;
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    inputLine.appendChild(input);
    body.appendChild(inputLine);

    const submit = async () => {
      const text = input.value.trim();
      if (!text) return;
      inputLine.remove();
      log(`<span class="term-prompt">austin@beach:~$</span> ${escapeHtml(text)}`);
      input.value = "";

      if (text === "clear") {
        body.innerHTML = "";
        body.appendChild(inputLine);
        input.focus();
        return;
      }
      if (text === "help") {
        log(`<span class="term-system">commands: clear, help, whoami, birthday, exit(lol no). otherwise just talk.</span>`);
        body.appendChild(inputLine);
        input.focus();
        return;
      }
      if (text === "whoami") {
        log(`<span class="term-austin">austin, probably. some of you isn't accounted for.</span>`);
        body.appendChild(inputLine);
        input.focus();
        return;
      }

      log(`<span class="term-system">...</span>`);
      const thinking = body.querySelector(".term-line:last-child");
      try {
        history.push({ user: text });
        const prompt = `${TERMINAL_SYSTEM}\n\nConversation so far:\n${history.slice(-6).map(h => h.user ? `USER: ${h.user}` : `AUSTIN.AI: ${h.ai}`).join("\n")}\n\nAUSTIN.AI:`;
        const reply = await gemini(prompt, { temperature: 1.1, max: 180 });
        history[history.length - 1].ai = reply;
        thinking.outerHTML = `<div class="term-line"><span class="term-austin">austin.ai&gt;</span> ${escapeHtml(reply)}</div>`;
      } catch (e) {
        thinking.outerHTML = `<div class="term-line"><span class="term-system">[the modem made a noise and then nothing. try again? ${escapeHtml(e.message.slice(0, 80))}]</span></div>`;
      }
      body.appendChild(inputLine);
      input.focus();
      body.scrollTop = body.scrollHeight;
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    setTimeout(() => input.focus(), 100);
  },
};

/* ---------- WORDSALAD (short fragments, phrases, half-thoughts) ---------- */
const WORDSALAD_SEEDS = [
  "a programmer missing a deadline by choice",
  "a beach town slowly sinking",
  "a half-broken vintage synthesizer",
  "the ocean keeping secrets from the shore",
  "a man who knows too much about DNS",
  "a seagull that has seen things",
  "old servers humming in a garage",
  "a surfer who writes postgres for a living",
  "the ghost of a dial-up tone",
  "a bonfire that has outlived three relationships",
  "a todo list written in 2004",
  "a laptop sticker that still means something",
  "a friend who is older today than yesterday",
  "an overdue library book about the moon",
  "the exact moment a song turns from happy to sad",
  "a bar that has both surfboards and spreadsheets",
];

const NotepadApp = {
  init(body) {
    body.classList.add("notepad");
    body.innerHTML = `<div class="haiku">loading...</div><div><button class="reroll">Again</button></div>`;
    const out = body.querySelector(".haiku");
    const btn = body.querySelector(".reroll");
    const load = async () => {
      const seed = WORDSALAD_SEEDS[Math.floor(Math.random() * WORDSALAD_SEEDS.length)];
      out.textContent = "writing...";
      try {
        const text = await gemini(
          `Write a short fragment — 1 to 3 lines total. Could be a half-thought, a stray phrase, a single image, a tiny observation. Subject: ${seed}. Tone: darkly funny, bittersweet, slightly unhinged, with a glimmer of warmth. It does NOT need to be a haiku or any specific form. Output only the fragment. No title, no quotes, no commentary.`,
          { temperature: 1.15, max: 90 }
        );
        out.textContent = text;
      } catch (e) {
        out.textContent = `[notepad has crashed]\n${e.message.slice(0, 100)}`;
      }
    };
    btn.addEventListener("click", load);
    load();
  },
};

/* ---------- MEDIA PLAYER ---------- */
// YouTube embed of a lo-fi / beach rock mix. No hosting required.
const TRACKS = [
  {
    title: "Beach Rock Forever",
    artist: "Surf-Punk Mix",
    // Free lo-fi / surf-rock mixes on YouTube
    yt: "jfKfPfyJRdk", // lofi girl — always up
  },
  {
    title: "Sunset Sessions",
    artist: "Surf Vibes Radio",
    yt: "4xDzrJKXOOY",
  },
  {
    title: "The Bonfire Tape",
    artist: "Warm Static",
    yt: "7NOSDKb0HlU",
  },
];

const MediaPlayerApp = {
  init(body) {
    body.classList.add("mediaplayer");
    body.innerHTML = `
      <div class="mp-screen">
        <div class="mp-track-title">—</div>
        <div class="mp-track-artist">—</div>
      </div>
      <div class="mp-embed" style="margin-bottom:8px;"></div>
      <div class="mp-controls">
        <button class="mp-prev">◀◀</button>
        <button class="mp-play">▶</button>
        <button class="mp-next">▶▶</button>
      </div>
    `;
    let idx = 0;
    const title = body.querySelector(".mp-track-title");
    const artist = body.querySelector(".mp-track-artist");
    const embed = body.querySelector(".mp-embed");

    const render = () => {
      const t = TRACKS[idx];
      title.textContent = t.title;
      artist.textContent = t.artist;
      embed.innerHTML = `<iframe width="300" height="60" src="https://www.youtube.com/embed/${t.yt}?autoplay=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    };
    const next = () => { idx = (idx + 1) % TRACKS.length; render(); };
    const prev = () => { idx = (idx - 1 + TRACKS.length) % TRACKS.length; render(); };

    body.querySelector(".mp-prev").addEventListener("click", prev);
    body.querySelector(".mp-next").addEventListener("click", next);
    body.querySelector(".mp-play").addEventListener("click", () => {
      const iframe = embed.querySelector("iframe");
      if (iframe) iframe.src = iframe.src.replace("autoplay=0", "autoplay=1");
    });
    render();
  },
};

/* ---------- CALCULATOR (ominous numerology, no clichés) ---------- */
const OMENS = [
  n => `${n} is the exact number of times the phrase "I'm fine" was a lie this month.`,
  n => `A tide pool somewhere in ${n % 12 || 12} hours will contain something it shouldn't.`,
  n => `${n}: the number of photos on a dead relative's phone you will never see.`,
  n => `The chord progression you half-remember has ${((n % 7) + 2)} unresolved notes.`,
  n => `${n} minor characters in your life are currently thinking of you.`,
  n => `That's the wattage of the lamp in the room where someone is forgetting you.`,
  n => `A seagull on the coast just landed exactly ${n} meters from where it meant to.`,
  n => `${n} is the surface area, in barely-remembered parking lots, of your twenties.`,
  n => `The voicemail you never returned is ${n} characters long when transcribed.`,
  n => `${n}: count of misspelled street signs between here and the place you first felt old.`,
  n => `A warm server in a garage has been at ${((n % 40) + 60)}°C for ${n} days straight. It is fine. It is not fine.`,
  n => `${n} is the weight, in regrets, of a paperback you sold for $1.`,
  n => `An extremely good song was played ${n} times in a row in ${((n * 7) % 1997) + 1995}.`,
  n => `${n} is the speed, in miles per hour, of the dog you saw once and will think about again.`,
  n => `Somewhere, a DNS record expired ${n} days ago and nobody has noticed.`,
  n => `There are ${n} strangers in your phone's autocomplete dictionary whose names you typed in anger.`,
  n => `${n}: seconds until you remember what you were going to say.`,
  n => `The ocean has rehearsed this wave ${n} times. It still isn't confident.`,
  n => `An old Winamp playlist with ${n} tracks is waiting for you on a hard drive you can't find.`,
  n => `${n} is the number of tabs you will open today that you do not remember opening.`,
  n => `A ghost in a walkman somewhere just skipped ${n} times.`,
  n => `There is a drawer in your house with ${n} pens. ${n - 1} do not work. You know which one.`,
  n => `${n} is the distance in city blocks between the person you were and the person you almost became.`,
  n => `A man in a hardware store is currently thinking of you and the number ${n}. It is not coincidence.`,
  n => `${n} surfboards have been named after former lovers this year. One of them was yours.`,
  n => `${n}: parking tickets you never received but somehow earned.`,
  n => `A cat somewhere has been staring at the same wall for ${n} minutes. The wall stares back.`,
  n => `${n} is the exact number of emails you started and never sent since 2019.`,
  n => `Somewhere, ${n} people are Googling their own name right now. One is you. Probably.`,
  n => `${n} is the page number of the book you won't finish but will tell yourself you might.`,
  n => `A neighbor you can't name is having ${n} slices of bread this week.`,
  n => `${n}: the frame number of a home movie where you are briefly, accidentally, perfect.`,
  n => `A payphone in Arizona just rang ${n} times. Nobody answered. Good.`,
  n => `${n} crossed fingers in your lifetime, uncounted by you, uncounted by anyone.`,
  n => `There are ${n} copies of your voice in answering machines that no longer exist.`,
  n => `A half-finished tattoo you will never get is ${n} inches long.`,
  n => `${n} is the exact decibel level of your next awkward silence.`,
  n => `A stranger once described you as "${n}% correct" behind your back. They meant it as a compliment.`,
  n => `Somewhere it is ${((n % 12) + 1)}:${String(n % 60).padStart(2, "0")} AM and someone is awake thinking about a thing you said.`,
  n => `${n}: the number of times a friend will laugh at a joke you haven't made yet.`,
];

const CalculatorApp = {
  init(body) {
    body.classList.add("calculator");
    body.innerHTML = `
      <div class="calc-display" id="calc-disp">0</div>
      <div class="calc-omen" id="calc-omen"></div>
      <div class="calc-grid">
        <button class="clr" data-k="C">C</button>
        <button class="op" data-k="/">÷</button>
        <button class="op" data-k="*">×</button>
        <button class="op" data-k="-">−</button>
        <button data-k="7">7</button>
        <button data-k="8">8</button>
        <button data-k="9">9</button>
        <button class="op" data-k="+">+</button>
        <button data-k="4">4</button>
        <button data-k="5">5</button>
        <button data-k="6">6</button>
        <button data-k=".">.</button>
        <button data-k="1">1</button>
        <button data-k="2">2</button>
        <button data-k="3">3</button>
        <button data-k="0">0</button>
        <button class="eq" data-k="=">=</button>
      </div>
    `;
    let expr = "";
    const disp = body.querySelector("#calc-disp");
    const omen = body.querySelector("#calc-omen");
    const render = () => { disp.textContent = expr || "0"; };

    body.querySelectorAll("button[data-k]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.k;
        if (k === "C") { expr = ""; omen.classList.remove("visible"); render(); return; }
        if (k === "=") {
          try {
            if (!expr) return;
            // safe-ish eval: only digits + ops + dot
            if (!/^[\d+\-*/.\s()]+$/.test(expr)) throw new Error("nope");
            const result = Function(`"use strict"; return (${expr})`)();
            expr = String(result);
            render();
            const n = Math.abs(Math.floor(Number(result) || 0)) || Math.floor(Math.random() * 99) + 1;
            const om = OMENS[n % OMENS.length](n);
            omen.textContent = om;
            omen.classList.add("visible");
          } catch {
            expr = "ERR";
            render();
            omen.textContent = "the calculator refuses. it has seen that number before.";
            omen.classList.add("visible");
          }
          return;
        }
        omen.classList.remove("visible");
        expr += k;
        render();
      });
    });
    render();
  },
};

/* ---------- CAKE ---------- */
// Each clip has a matched spoken line. Audio generated by Gemini TTS
// (different voice per clip, so it feels varied).
const BIRTHDAY_CLIPS = [
  { file: "assets/audio/birthday_1.wav",  text: "happy birthday, austin. you beach-town legend. another year of chaotic good." },
  { file: "assets/audio/birthday_2.wav",  text: "austin. older than yesterday. more ominous than tomorrow. we love you." },
  { file: "assets/audio/birthday_3.wav",  text: "you opened the cake. of course you did. happy birthday, buddy." },
  { file: "assets/audio/birthday_4.wav",  text: "whatever version of yourself you are today — it's the good one. happy birthday, austin." },
  { file: "assets/audio/birthday_5.wav",  text: "hey austin. happy birthday. i know it's late. we love you. call your mom." },
  { file: "assets/audio/birthday_6.wav",  text: "happy birthday austin. every year you get a little weirder in the good direction. keep going." },
  { file: "assets/audio/birthday_7.wav",  text: "AUSTIN. IT IS YOUR BIRTHDAY. do something slightly questionable today. for the story." },
  { file: "assets/audio/birthday_8.wav",  text: "austin. you survived another one. most people don't notice how much that takes. we do." },
  { file: "assets/audio/birthday_9.wav",  text: "austin. another year. keep going." },
  { file: "assets/audio/birthday_10.wav", text: "i'm bad at this. happy birthday, austin. glad you exist." },
  { file: "assets/audio/birthday_11.wav", text: "happy birthday, kid. the ocean says hey." },
  { file: "assets/audio/birthday_12.wav", text: "austin! happy birthday! the cake is optional. you are not." },
];

let _lastClipIdx = -1;
function nextClip() {
  let i;
  do { i = Math.floor(Math.random() * BIRTHDAY_CLIPS.length); }
  while (BIRTHDAY_CLIPS.length > 1 && i === _lastClipIdx);
  _lastClipIdx = i;
  return BIRTHDAY_CLIPS[i];
}

const CakeApp = {
  init(body) {
    body.classList.add("cake-app");
    body.style.minWidth = "300px";
    body.innerHTML = `
      <div style="text-align:center; padding:14px 8px;">
        <div style="font-size:72px;">🎂</div>
        <div id="cake-msg" style="margin-top:12px; font-size:14px; min-height:3em;">
          you opened it. of course you did.
        </div>
        <button id="cake-again" style="margin-top:10px;">Again</button>
      </div>
    `;
    const msg = body.querySelector("#cake-msg");
    const btn = body.querySelector("#cake-again");
    let current = null;
    const fire = () => {
      // confetti
      if (window.confetti) {
        const end = Date.now() + 1200;
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 } });
          confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
      const clip = nextClip();
      msg.textContent = clip.text;
      // stop any in-flight audio before starting next
      if (current) { try { current.pause(); } catch (_) {} }
      current = new Audio(clip.file);
      current.volume = 0.9;
      current.play().catch(() => {
        // last-resort fallback: browser TTS (only fires if WAV fails to load)
        if ("speechSynthesis" in window) {
          try {
            const u = new SpeechSynthesisUtterance(clip.text);
            u.rate = 0.95;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          } catch (_) {}
        }
      });
    };
    btn.addEventListener("click", fire);
    setTimeout(fire, 250);
  },
};

/* ---------- MINESWEEPER ---------- */
const MinesweeperApp = {
  init(body, win) {
    body.classList.add("minesweeper");
    body.innerHTML = `
      <div class="ms-frame">
        <div class="ms-hud">
          <div class="ms-counter" id="ms-mines">010</div>
          <button class="ms-face" id="ms-face" title="New game">🙂</button>
          <div class="ms-counter" id="ms-timer">000</div>
        </div>
        <div class="ms-grid" id="ms-grid"></div>
      </div>
    `;
    const W = 9, H = 9, MINES = 10;
    const grid = body.querySelector("#ms-grid");
    const mineDisp = body.querySelector("#ms-mines");
    const timerDisp = body.querySelector("#ms-timer");
    const face = body.querySelector("#ms-face");
    let cells, state, flags, revealed, firstClick, timer, timerInt, done;

    const setCounter = (el, n) => { el.textContent = String(Math.max(-99, Math.min(999, n))).padStart(3, "0"); };

    function neighbors(x, y) {
      const out = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push([nx, ny]);
        }
      return out;
    }

    function placeMines(skipX, skipY) {
      // First-click safety: no mine on or adjacent to the first cell
      const safe = new Set([`${skipX},${skipY}`]);
      for (const [nx, ny] of neighbors(skipX, skipY)) safe.add(`${nx},${ny}`);
      let placed = 0;
      while (placed < MINES) {
        const x = Math.floor(Math.random() * W);
        const y = Math.floor(Math.random() * H);
        if (safe.has(`${x},${y}`)) continue;
        if (state[y][x] === -1) continue;
        state[y][x] = -1;
        placed++;
      }
      // Fill numbers
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (state[y][x] === -1) continue;
          let c = 0;
          for (const [nx, ny] of neighbors(x, y)) if (state[ny][nx] === -1) c++;
          state[y][x] = c;
        }
      }
    }

    function reset() {
      cells = [];
      state = Array.from({ length: H }, () => Array(W).fill(0));
      flags = Array.from({ length: H }, () => Array(W).fill(false));
      revealed = Array.from({ length: H }, () => Array(W).fill(false));
      firstClick = true;
      timer = 0;
      done = false;
      clearInterval(timerInt);
      setCounter(timerDisp, 0);
      setCounter(mineDisp, MINES);
      face.textContent = "🙂";
      grid.innerHTML = "";
      grid.style.gridTemplateColumns = `repeat(${W}, 22px)`;
      for (let y = 0; y < H; y++) {
        cells.push([]);
        for (let x = 0; x < W; x++) {
          const c = document.createElement("button");
          c.className = "ms-cell";
          c.dataset.x = x;
          c.dataset.y = y;
          c.addEventListener("mousedown", onMouseDown);
          c.addEventListener("touchstart", onTouchStart, { passive: false });
          c.addEventListener("touchend", onTouchEnd);
          c.addEventListener("contextmenu", (e) => e.preventDefault());
          cells[y].push(c);
          grid.appendChild(c);
        }
      }
    }

    function onMouseDown(e) {
      if (done) return;
      e.preventDefault();
      const x = +e.currentTarget.dataset.x;
      const y = +e.currentTarget.dataset.y;
      if (e.button === 2) { toggleFlag(x, y); return; }
      if (e.button === 0) reveal(x, y);
    }

    let touchTimer = null;
    let touchFlagged = false;
    function onTouchStart(e) {
      if (done) return;
      e.preventDefault();
      touchFlagged = false;
      const x = +e.currentTarget.dataset.x;
      const y = +e.currentTarget.dataset.y;
      touchTimer = setTimeout(() => {
        toggleFlag(x, y);
        touchFlagged = true;
        try { navigator.vibrate?.(20); } catch {}
      }, 350);
    }
    function onTouchEnd(e) {
      if (done) return;
      clearTimeout(touchTimer);
      if (touchFlagged) return;
      const x = +e.currentTarget.dataset.x;
      const y = +e.currentTarget.dataset.y;
      reveal(x, y);
    }

    function toggleFlag(x, y) {
      if (revealed[y][x]) return;
      flags[y][x] = !flags[y][x];
      updateCell(x, y);
      const remaining = MINES - countFlags();
      setCounter(mineDisp, remaining);
    }

    function countFlags() {
      let c = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (flags[y][x]) c++;
      return c;
    }

    function reveal(x, y) {
      if (revealed[y][x] || flags[y][x]) return;
      if (firstClick) {
        placeMines(x, y);
        firstClick = false;
        timerInt = setInterval(() => { setCounter(timerDisp, ++timer); }, 1000);
      }
      revealed[y][x] = true;
      updateCell(x, y);
      if (state[y][x] === -1) { return gameOver(x, y); }
      if (state[y][x] === 0) {
        for (const [nx, ny] of neighbors(x, y)) reveal(nx, ny);
      }
      checkWin();
    }

    function updateCell(x, y) {
      const c = cells[y][x];
      c.className = "ms-cell";
      c.textContent = "";
      if (flags[y][x]) { c.textContent = "🚩"; return; }
      if (!revealed[y][x]) return;
      c.classList.add("revealed");
      const v = state[y][x];
      if (v === -1) { c.textContent = "💣"; c.classList.add("mine"); }
      else if (v > 0) { c.textContent = v; c.classList.add(`n${v}`); }
    }

    function gameOver(lostX, lostY) {
      done = true;
      clearInterval(timerInt);
      face.textContent = "💀";
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (state[y][x] === -1) {
          revealed[y][x] = true;
          updateCell(x, y);
          if (x === lostX && y === lostY) cells[y][x].classList.add("exploded");
        }
      }
    }

    function checkWin() {
      let unrevealedSafe = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (!revealed[y][x] && state[y][x] !== -1) unrevealedSafe++;
      if (unrevealedSafe === 0) {
        done = true;
        clearInterval(timerInt);
        face.textContent = "😎";
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (state[y][x] === -1 && !flags[y][x]) { flags[y][x] = true; updateCell(x, y); }
        }
        setCounter(mineDisp, 0);
      }
    }

    face.addEventListener("click", reset);
    reset();

    // Clean up timer if window closes
    const origClose = win.querySelector(".close-btn");
    origClose && origClose.addEventListener("click", () => clearInterval(timerInt));
  },
};

/* ---------- app registry ---------- */
const APPS = {
  terminal: { title: "C:\\TERMINAL.EXE", init: TerminalApp.init },
  notepad: { title: "wordsalad.txt - Notepad", init: NotepadApp.init },
  mediaplayer: { title: "Media Player", init: MediaPlayerApp.init },
  calculator: { title: "Calc.exe", init: CalculatorApp.init },
  minesweeper: { title: "Minesweeper", init: MinesweeperApp.init },
  cake: { title: "DO NOT OPEN.exe", init: CakeApp.init },
};

/* ---------- boot ---------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function updateClock() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  document.getElementById("clock").textContent = `${h}:${m} ${ampm}`;
}

document.addEventListener("DOMContentLoaded", () => {
  // icons — single tap/click opens. Less 98-authentic, more mobile-friendly.
  document.querySelectorAll(".icon").forEach(icon => {
    const open = (e) => {
      e.preventDefault();
      WM.openApp(icon.dataset.app);
    };
    icon.addEventListener("click", open);
    icon.addEventListener("touchend", open, { passive: false });
  });

  // start menu
  const startBtn = document.getElementById("start-btn");
  const startMenu = document.getElementById("start-menu");
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startMenu.style.display = startMenu.style.display === "none" ? "flex" : "none";
  });
  document.addEventListener("click", () => { startMenu.style.display = "none"; });
  startMenu.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      startMenu.style.display = "none";
      WM.openApp(b.dataset.app);
    });
  });

  updateClock();
  setInterval(updateClock, 30000);
});
