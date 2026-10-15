// Small Spotify player shown on every page (bottom-left).
// Type a song name to search, or paste a Spotify link. When you open another page, the song continues from the same spot.
// Searching by name goes through the Supabase function in supabase/functions/spotify-search.
(function () {
  const LINK_KEY = "bb_spotify_url";     // last link, remembered across visits
  const LABEL_KEY = "bb_spotify_label";  // "song — artist" shown in the box for that link
  const STATE_KEY = "bb_spotify_state";  // what this tab is playing, picked up by the next page
  const SEARCH_URL = "https://fhvxlyrdvzimgzfyjdxo.supabase.co/functions/v1/spotify-search";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodnhseXJkdnppbWd6ZnlqZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzE3MjksImV4cCI6MjEwNDM0NzcyOX0.EFi5L9-ahYr4Jv2IdJae5gvJ81Wbhd399RclkwToTbg";

  const TEXTS = {
    ar: {
      title: "مشغل Spotify",
      placeholder: "اكتب اسم الأغنية أو الصق رابط Spotify",
      play: "تشغيل",
      search: "بحث",
      searching: "جارٍ البحث…",
      noResults: "ما لقيت أغاني بهذا الاسم.",
      searchOff: "البحث بالاسم مو مفعّل بعد. الصق رابط Spotify بداله.",
      searchError: "تعذّر البحث، حاول مرة ثانية.",
      invalid: "الرابط غير صحيح. من Spotify اضغط مشاركة ← نسخ الرابط والصقه هنا.",
      hint: "بدون تسجيل دخول في Spotify بالمتصفح يشتغل مقطع 30 ثانية بس. الصوت يتحكم فيه من الجهاز.",
      toggle: "مشغل الأغاني",
      minimize: "تصغير",
      seek: "وقت الأغنية"
    },
    en: {
      title: "Spotify Player",
      placeholder: "Type a song name or paste a Spotify link",
      play: "Play",
      search: "Search",
      searching: "Searching…",
      noResults: "No songs found with that name.",
      searchOff: "Search by name isn't set up yet. Paste a Spotify link instead.",
      searchError: "Search failed, please try again.",
      invalid: "That isn't a Spotify link. In Spotify, tap Share → Copy link and paste it here.",
      hint: "If you're not logged in to Spotify in this browser, only 30-second previews play. Use your device for volume.",
      toggle: "Music player",
      minimize: "Minimize",
      seek: "Song position"
    }
  };
  let lang = "en";
  try { lang = localStorage.getItem("lang") === "ar" ? "ar" : "en"; } catch (e) {}
  const t = TEXTS[lang];

  // Accepts open.spotify.com links (any locale prefix) and spotify: URIs.
  function toUri(input) {
    const s = (input || "").trim();
    let m = s.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/);
    if (!m) {
      let u;
      try { u = new URL(s); } catch (e) { return null; }
      if (u.hostname !== "open.spotify.com") return null;
      m = u.pathname.match(/\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
    }
    return m ? `spotify:${m[1]}:${m[2]}` : null;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key) || "null"); } catch (e) { return null; }
  }

  // ---------- UI ----------
  const style = document.createElement("style");
  style.textContent = `
    #bbSpotify{position:fixed;left:10px;bottom:10px;z-index:9998;display:flex;flex-direction:column;align-items:flex-start;gap:8px;direction:ltr;
      font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
    #bbSpotify .sp-toggle{width:46px;height:46px;padding:0;margin:0;border:0;border-radius:50%;background:#1db954;cursor:pointer;
      display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.5)}
    #bbSpotify .sp-toggle svg{width:26px;height:26px}
    #bbSpotify.waiting .sp-toggle{animation:bbSpPulse 1.6s ease-in-out infinite}
    @keyframes bbSpPulse{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 7px #1db95455}}
    #bbSpotify .sp-panel{box-sizing:border-box;width:min(320px,calc(100vw - 20px));background:#111625f2;color:#f7f8ff;border:1px solid #252d46;
      border-radius:16px;padding:12px;box-shadow:0 18px 40px #0008;backdrop-filter:blur(12px)}
    #bbSpotify:not(.open) .sp-panel{position:absolute;left:0;bottom:0;visibility:hidden;opacity:0;pointer-events:none}
    #bbSpotify .sp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:14px;font-weight:700}
    #bbSpotify .sp-min{background:#1b2235;color:#dbe2ff;border:0;padding:2px 10px;margin:0;font-size:16px;border-radius:8px;cursor:pointer}
    #bbSpotify .sp-form{display:flex;gap:8px;margin:0}
    #bbSpotify .sp-url{box-sizing:border-box;flex:1;min-width:0;width:auto;margin:0;padding:9px 12px;border-radius:10px;font-size:16px;
      background:#0a0e19;border:1px solid #303750;color:#fff;outline:none}
    #bbSpotify .sp-url:focus{border-color:#1db954}
    #bbSpotify .sp-play{padding:9px 14px;margin:0;border:0;border-radius:10px;font-size:13px;font-weight:800;background:#1db954;color:#fff;white-space:nowrap;cursor:pointer}
    #bbSpotify .sp-msg{color:#ff6686;font-size:12px;margin-top:6px}
    #bbSpotify .sp-msg.info{color:#aeb7cf}
    #bbSpotify .sp-msg:empty{display:none}
    #bbSpotify .sp-results{margin-top:8px;max-height:230px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
    #bbSpotify .sp-results:empty{display:none}
    #bbSpotify .sp-result{display:flex;align-items:center;gap:10px;width:100%;padding:6px;margin:0;border:0;border-radius:10px;
      background:transparent;color:#f7f8ff;text-align:start;font:inherit;cursor:pointer;box-shadow:none}
    #bbSpotify .sp-result:hover{background:#1b2235;transform:none;filter:none}
    #bbSpotify .sp-cover{width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#1b2235}
    #bbSpotify .sp-result-text{min-width:0;display:flex;flex-direction:column}
    #bbSpotify .sp-result-text b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #bbSpotify .sp-result-text span{font-size:11.5px;color:#8490af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #bbSpotify .sp-frame iframe{display:block;width:100%;height:152px;border:0;border-radius:12px;margin-top:10px}
    #bbSpotify .sp-controls{display:flex;align-items:center;gap:8px;margin-top:8px;direction:ltr;font-size:11px;color:#aeb7cf}
    #bbSpotify .sp-controls.hidden{display:none}
    #bbSpotify .sp-seek{flex:1;min-width:0;width:auto;margin:0;padding:0;height:auto;border:0;background:transparent;accent-color:#1db954;cursor:pointer}
    #bbSpotify .sp-hint{color:#7f8aa7;font-size:11px;margin-top:8px;line-height:1.5}
  `;
  document.head.appendChild(style);

  const widget = document.createElement("div");
  widget.id = "bbSpotify";
  widget.innerHTML = `
    <div class="sp-panel" dir="${lang === "ar" ? "rtl" : "ltr"}">
      <div class="sp-head"><span>${t.title}</span><button type="button" class="sp-min" title="${t.minimize}" aria-label="${t.minimize}">–</button></div>
      <form class="sp-form" autocomplete="off">
        <input class="sp-url" type="text" inputmode="url" placeholder="${t.placeholder}">
        <button type="submit" class="sp-play">${t.search}</button>
      </form>
      <div class="sp-msg"></div>
      <div class="sp-results"></div>
      <div class="sp-frame"></div>
      <div class="sp-controls hidden">
        <span class="sp-pos">0:00</span>
        <input class="sp-seek" type="range" min="0" max="0" step="1" value="0" aria-label="${t.seek}">
        <span class="sp-dur">0:00</span>
      </div>
      <div class="sp-hint">${t.hint}</div>
    </div>
    <button type="button" class="sp-toggle" title="${t.toggle}" aria-label="${t.toggle}">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 9.2c4.6-1.6 9.6-1.2 14 1"/><path d="M6 12.9c3.8-1.2 7.8-.8 11.2 1"/><path d="M7 16.3c3-.8 6-.5 8.6.8"/></svg>
    </button>`;
  document.body.appendChild(widget);

  const q = (sel) => widget.querySelector(sel);
  const urlInput = q(".sp-url"), msg = q(".sp-msg"), frame = q(".sp-frame"), results = q(".sp-results"), submitBtn = q(".sp-play");
  const controls = q(".sp-controls"), seek = q(".sp-seek"), posLabel = q(".sp-pos"), durLabel = q(".sp-dur");

  // Sit above any bottom bar already on the left (Back, Messages, language buttons…).
  function place() {
    let bottom = 10;
    document.querySelectorAll(".bottom-bar").forEach((bar) => {
      const r = bar.getBoundingClientRect();
      if (r.width && r.height && r.left < 70) bottom = Math.max(bottom, Math.round(window.innerHeight - r.top) + 8);
    });
    widget.style.bottom = bottom + "px";
  }
  place();
  window.addEventListener("resize", place);
  const watcher = new MutationObserver(place);
  document.querySelectorAll(".bottom-bar").forEach((bar) => watcher.observe(bar, { attributes: true }));

  // ---------- Spotify ----------
  let api = null, controller = null, currentUri = null;
  let position = 0, duration = 0, paused = true, dragging = false, wantPlay = false;

  function loadApi() {
    if (!api) {
      api = new Promise((resolve) => {
        window.onSpotifyIframeApiReady = resolve;
        const s = document.createElement("script");
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        document.head.appendChild(s);
      });
    }
    return api;
  }

  function saveState() {
    if (!currentUri) return;
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ uri: currentUri, pos: position, playing: !paused || wantPlay, at: Date.now() }));
    } catch (e) {}
  }

  function onUpdate(d) {
    if (!d) return;
    duration = (d.duration || 0) / 1000;
    position = (d.position || 0) / 1000;
    paused = !!d.isPaused;
    if (!paused) {
      wantPlay = false;
      widget.classList.remove("waiting");
      stopWaiting();
    }
    controls.classList.toggle("hidden", !duration);
    seek.max = Math.floor(duration);
    if (!dragging) {
      seek.value = Math.floor(position);
      posLabel.textContent = fmt(position);
    }
    durLabel.textContent = fmt(duration);
    saveState();
  }

  async function openSong(uri, startAt, autoplay) {
    const sameSong = uri === currentUri;
    wantPlay = !!autoplay;
    currentUri = uri;
    const IFrameAPI = await loadApi();
    if (controller) {
      if (sameSong) {
        // Spotify ignores loading the song that's already loaded, so jump and play directly.
        controller.seek(startAt || 0);
        if (autoplay) controller.play();
      } else {
        controller.loadEntity(uri, false, startAt || 0);
      }
      return;
    }
    const host = document.createElement("div");
    frame.innerHTML = "";
    frame.appendChild(host);
    // Spotify marks its iframe as lazy, which never loads while the panel is minimized.
    const loadNow = () => { const f = frame.querySelector("iframe"); if (f) f.setAttribute("loading", "eager"); };
    IFrameAPI.createController(host, { uri, width: "100%", height: 152, startAt: startAt || 0 }, (c) => {
      controller = c;
      loadNow();
      c.addListener("ready", () => { if (wantPlay) c.play(); });
      c.addListener("playback_update", (e) => onUpdate(e.data));
    });
    loadNow();
  }

  // Browsers can block sound until the person taps the page; resume on the first tap.
  const GESTURES = ["pointerdown", "keydown", "touchend"];
  function onGesture() {
    stopWaiting();
    if (controller && wantPlay) controller.play();
  }
  function waitForGesture() {
    widget.classList.add("waiting");
    GESTURES.forEach((ev) => document.addEventListener(ev, onGesture, true));
  }
  function stopWaiting() {
    GESTURES.forEach((ev) => document.removeEventListener(ev, onGesture, true));
  }

  // ---------- Search by name ----------
  function showMsg(text, info) {
    msg.textContent = text || "";
    msg.classList.toggle("info", !!info);
  }

  function remember(link, label) {
    savedLink = link;
    try {
      localStorage.setItem(LINK_KEY, link);
      if (label) localStorage.setItem(LABEL_KEY, label); else localStorage.removeItem(LABEL_KEY);
    } catch (e) {}
  }

  function renderResults(tracks) {
    results.innerHTML = "";
    tracks.forEach((tr) => {
      if (!tr || !/^[A-Za-z0-9]+$/.test(tr.id || "")) return;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sp-result";
      const cover = document.createElement(tr.image ? "img" : "div");
      cover.className = "sp-cover";
      if (tr.image) { cover.src = tr.image; cover.alt = ""; cover.loading = "lazy"; }
      const text = document.createElement("div");
      text.className = "sp-result-text";
      const name = document.createElement("b");
      name.textContent = tr.name || "";
      const artists = document.createElement("span");
      artists.textContent = tr.artists || "";
      text.append(name, artists);
      row.append(cover, text);
      row.addEventListener("click", () => {
        const label = tr.artists ? `${tr.name} — ${tr.artists}` : tr.name;
        remember("https://open.spotify.com/track/" + tr.id, label);
        urlInput.value = label;
        updateSubmitLabel();
        results.innerHTML = "";
        openSong("spotify:track:" + tr.id, 0, true);
      });
      results.appendChild(row);
    });
  }

  let searchId = 0;
  async function searchSongs(text) {
    const id = ++searchId;
    results.innerHTML = "";
    showMsg(t.searching, true);
    try {
      const res = await fetch(SEARCH_URL + "?q=" + encodeURIComponent(text), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
      });
      const data = await res.json().catch(() => ({}));
      if (id !== searchId) return; // a newer search started
      if (res.status === 404 || data.error === "missing_spotify_keys") { showMsg(t.searchOff); return; }
      if (!res.ok) { showMsg(t.searchError); return; }
      const tracks = Array.isArray(data.tracks) ? data.tracks : [];
      if (!tracks.length) { showMsg(t.noResults, true); return; }
      showMsg("");
      renderResults(tracks);
    } catch (e) {
      // Also lands here while the Supabase function isn't deployed (the browser blocks the 404).
      if (id === searchId) showMsg(t.searchOff);
    }
  }

  function looksLikeLink(s) {
    return /^(https?:\/\/|spotify:)/i.test(s.trim());
  }
  function updateSubmitLabel() {
    submitBtn.textContent = looksLikeLink(urlInput.value) ? t.play : t.search;
  }

  // ---------- Events ----------
  q(".sp-toggle").addEventListener("click", () => {
    widget.classList.toggle("open");
    // First time the panel opens on this page, load the remembered song (paused, at its last spot).
    if (widget.classList.contains("open") && !controller) {
      const uri = toUri(savedLink);
      if (uri) {
        const st = readJSON(sessionStorage, STATE_KEY);
        openSong(uri, st && st.uri === uri ? Math.floor(st.pos) : 0, false);
      }
    }
  });
  q(".sp-min").addEventListener("click", () => widget.classList.remove("open"));

  urlInput.addEventListener("input", updateSubmitLabel);

  q(".sp-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = urlInput.value.trim();
    if (!value) return;
    if (!looksLikeLink(value)) { searchSongs(value); return; }
    const uri = toUri(value);
    if (!uri) { showMsg(t.invalid); return; }
    showMsg("");
    results.innerHTML = "";
    remember(value, "");
    openSong(uri, 0, true);
  });

  seek.addEventListener("input", () => {
    dragging = true;
    posLabel.textContent = fmt(seek.value);
  });
  seek.addEventListener("change", () => {
    dragging = false;
    position = Number(seek.value);
    if (controller) controller.seek(Math.floor(position));
  });

  window.addEventListener("pagehide", saveState);

  // ---------- Start ----------
  let savedLink = "", savedLabel = "";
  try {
    savedLink = localStorage.getItem(LINK_KEY) || "";
    savedLabel = localStorage.getItem(LABEL_KEY) || "";
  } catch (e) {}
  urlInput.value = savedLabel || savedLink;
  updateSubmitLabel();

  // The previous page was playing: continue the same song from the same spot.
  const st = readJSON(sessionStorage, STATE_KEY);
  if (st && st.uri && st.playing) {
    const elapsed = Math.min(5, Math.max(0, (Date.now() - st.at) / 1000));
    position = st.pos + elapsed;
    openSong(st.uri, Math.floor(position), true);
    setTimeout(() => { if (wantPlay && paused) waitForGesture(); }, 4000);
  }
})();
