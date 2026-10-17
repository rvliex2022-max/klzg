// Battle start screens with sound. Both return a Promise that resolves once the screen is gone,
// so the game can wait for it before the first question.
//   showMatchFound({ me, opponent, meAvatar, opponentAvatar, texts })   VS screen for two players. texts: { title, you, opponent, go }
//   showBattleStart({ players, meId, texts })     for a room: VS screen for 2 players, a circle of players for 3–8.
//                                                 players: [{ id, name, avatar }], texts: { title, subtitle, you, opponent, go }
(function () {
  // Timeline in ms. Sounds and visuals both follow these.
  const HIT = 650;                       // the two sides collide
  const CHIME = 900;                     // "VS" settles
  const COUNT = [1300, 1900, 2500];      // 3, 2, 1
  const GO = 3100;                       // "Go!"
  const FADE = 3600;                     // screen starts fading out
  const DONE = 3950;                     // screen removed, game may start

  const LEFT_HALF = '<svg viewBox="278 46 58 88" aria-hidden="true"><path d="M334 58 C324 50 306 50 302 62 C288 62 280 76 288 86 C278 96 284 112 298 114 C300 128 316 132 326 124 C330 128 334 128 334 126 Z" fill="#7c5cff"/><path d="M318 72 C312 78 314 88 322 90 M304 98 C312 96 318 102 316 110" fill="none" stroke="#080b14" stroke-width="4" stroke-linecap="round"/></svg>';
  const RIGHT_HALF = '<svg viewBox="344 46 58 88" aria-hidden="true"><path d="M346 58 C356 50 374 50 378 62 C392 62 400 76 392 86 C402 96 396 112 382 114 C380 128 364 132 354 124 C350 128 346 128 346 126 Z" fill="#2fd4c8"/><path d="M362 72 C368 78 366 88 358 90 M376 98 C368 96 362 102 364 110" fill="none" stroke="#080b14" stroke-width="4" stroke-linecap="round"/></svg>';
  const SPARK = '<svg viewBox="322 38 36 36" aria-hidden="true"><polygon points="340,40 344,52 356,52 346,59 350,71 340,64 330,71 334,59 324,52 336,52" fill="#ffd166"/></svg>';

  const CSS = `
    #bbMatch{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
      background:radial-gradient(circle at 50% 45%,#2a1d63 0%,#080b14 62%);color:#f5f6ff;overflow:hidden;
      font-family:'Cairo','Segoe UI',system-ui,sans-serif;animation:bbmIn .15s ease-out both}
    #bbMatch.bbm-out{animation:bbmOut .35s ease-in both}
    #bbMatch .bbm-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;animation:bbmFlash .35s ${HIT}ms ease-out both}
    #bbMatch .bbm-title{margin:0;font-size:clamp(26px,6vw,46px);font-weight:900;letter-spacing:.5px;text-align:center;
      text-shadow:0 0 24px #7c5cff;animation:bbmPop .45s cubic-bezier(.3,1.6,.5,1) both}
    #bbMatch .bbm-arena{display:flex;align-items:center;justify-content:center;gap:clamp(4px,2vw,18px);animation:bbmShake .4s ${HIT}ms both}
    #bbMatch .bbm-side{display:flex;flex-direction:column;align-items:center;gap:6px;width:clamp(110px,30vw,220px)}
    #bbMatch .bbm-side svg{height:clamp(110px,22vw,170px);width:auto;overflow:visible}
    #bbMatch .bbm-me{animation:bbmFromLeft ${HIT}ms cubic-bezier(.55,0,.9,.4) both}
    #bbMatch .bbm-opp{animation:bbmFromRight ${HIT}ms cubic-bezier(.55,0,.9,.4) both}
    #bbMatch .bbm-name{max-width:100%;font-size:clamp(17px,3.4vw,26px);font-weight:800;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #bbMatch .bbm-role{font-size:13px;font-weight:700;letter-spacing:.5px;color:#aeb7cf}
    #bbMatch .bbm-me .bbm-role{color:#a78bfa}
    #bbMatch .bbm-opp .bbm-role{color:#2fd4c8}
    #bbMatch .bbm-vs{position:relative;display:flex;align-items:center;justify-content:center;width:clamp(64px,12vw,96px);
      font-size:clamp(34px,7vw,56px);font-weight:900;font-style:italic;color:#ffd166;text-shadow:0 0 18px #ffd16688;
      animation:bbmVs .5s ${HIT}ms cubic-bezier(.3,1.6,.5,1) both}
    #bbMatch .bbm-vs svg{position:absolute;width:150%;height:150%;opacity:.35;animation:bbmSpin 2.4s ${HIT}ms linear infinite}
    #bbMatch .bbm-ring{position:absolute;left:50%;top:50%;width:80px;height:80px;margin:-40px 0 0 -40px;border:4px solid #ffd166;border-radius:50%;
      opacity:0;pointer-events:none;animation:bbmRing .7s ${HIT}ms ease-out both}
    #bbMatch .bbm-count{margin:0;height:1.2em;font-size:clamp(40px,9vw,72px);font-weight:900;line-height:1.2}
    #bbMatch .bbm-count span{display:inline-block;animation:bbmPop .4s cubic-bezier(.3,1.6,.5,1) both}
    #bbMatch .bbm-count .bbm-go{color:#2bd28b}
    @keyframes bbmIn{from{opacity:0}to{opacity:1}}
    @keyframes bbmOut{to{opacity:0;transform:scale(1.06)}}
    @keyframes bbmFlash{0%{opacity:.75}100%{opacity:0}}
    @keyframes bbmPop{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:none}}
    @keyframes bbmFromLeft{from{transform:translateX(-70vw) rotate(-14deg)}to{transform:none}}
    @keyframes bbmFromRight{from{transform:translateX(70vw) rotate(14deg)}to{transform:none}}
    @keyframes bbmVs{0%{opacity:0;transform:scale(3) rotate(-20deg)}100%{opacity:1;transform:none}}
    @keyframes bbmSpin{to{transform:rotate(360deg)}}
    @keyframes bbmRing{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(6)}}
    @keyframes bbmShake{0%,100%{transform:none}20%{transform:translate(-10px,4px)}40%{transform:translate(9px,-5px)}60%{transform:translate(-6px,3px)}80%{transform:translate(4px,-2px)}}

    #bbMatch .bbm-sub{margin:-18px 0 0;font-size:15px;font-weight:700;color:#aeb7cf;animation:bbmIn .4s .2s both}
    #bbMatch .bbm-stage{position:relative;flex-shrink:0;animation:bbmShake .4s ${HIT}ms both}
    #bbMatch .bbm-center{position:absolute;left:50%;top:50%;width:clamp(84px,18vmin,120px);height:clamp(84px,18vmin,120px);transform:translate(-50%,-50%)}
    #bbMatch .bbm-center svg{width:100%;height:100%;overflow:visible}
    #bbMatch .bbm-part{transform-box:fill-box;transform-origin:center}
    #bbMatch .bbm-hl{animation:bbmHalfL ${HIT}ms cubic-bezier(.55,0,.9,.4) both}
    #bbMatch .bbm-hr{animation:bbmHalfR ${HIT}ms cubic-bezier(.55,0,.9,.4) both}
    #bbMatch .bbm-hs{animation:bbmSpark .5s ${HIT}ms cubic-bezier(.3,1.6,.5,1) both}
    #bbMatch .bbm-player{position:absolute;left:50%;top:50%;display:flex;flex-direction:column;align-items:center;gap:4px;width:var(--w,110px);
      transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y)));animation:bbmChipIn both cubic-bezier(.55,0,.9,.4)}
    #bbMatch .bbm-player .bbm-avatar{width:var(--av,64px);height:var(--av,64px);font-size:calc(var(--av,64px) * .42)}
    #bbMatch .bbm-avatar{display:flex;align-items:center;justify-content:center;width:clamp(48px,11vmin,64px);height:clamp(48px,11vmin,64px);border-radius:50%;
      background:var(--c);color:#080b14;font-size:clamp(20px,4.6vmin,28px);font-weight:900;box-shadow:0 0 0 3px #080b14,0 0 22px var(--c)}
    #bbMatch .bbm-player.bbm-is-me .bbm-avatar{box-shadow:0 0 0 3px #fff,0 0 26px var(--c)}
    #bbMatch .bbm-avatar{overflow:hidden;flex-shrink:0}
    #bbMatch .bbm-avatar img{display:block;width:100%;height:100%;object-fit:cover;border:3px solid var(--c);border-radius:50%;box-sizing:border-box}
    #bbMatch .bbm-side .bbm-avatar{position:relative;margin-top:-42px;width:clamp(78px,17vmin,106px);height:clamp(78px,17vmin,106px);
      font-size:clamp(30px,7vmin,42px)}
    #bbMatch .bbm-player .bbm-name{font-size:clamp(13px,2.6vw,16px)}
    #bbMatch .bbm-player .bbm-role{font-size:11px;color:var(--c)}
    @keyframes bbmHalfL{from{transform:translateX(-60px) rotate(-14deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbmHalfR{from{transform:translateX(60px) rotate(14deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbmSpark{from{transform:scale(0) rotate(-90deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbmChipIn{from{transform:translate(calc(-50% + var(--fx)),calc(-50% + var(--fy))) scale(.5);opacity:0}
      to{transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y)));opacity:1}}

    @media (prefers-reduced-motion: reduce){
      #bbMatch .bbm-me,#bbMatch .bbm-opp,#bbMatch .bbm-arena,#bbMatch .bbm-vs svg,#bbMatch .bbm-ring,#bbMatch .bbm-flash,
      #bbMatch .bbm-stage,#bbMatch .bbm-hl,#bbMatch .bbm-hr,#bbMatch .bbm-player{animation:none}
      #bbMatch .bbm-vs{animation:bbmIn .3s ${HIT}ms both}
    }
  `;

  // ---------- Sound (made in the browser, no audio files) ----------
  function playSounds() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    let ctx;
    try { ctx = new Ctx(); } catch (e) { return; }
    if (ctx.state === "suspended") ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    const at = (ms) => ctx.currentTime + 0.05 + ms / 1000;

    function noise(seconds) {
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    }
    function envelope(t, peak, attack, length) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length);
      g.connect(master);
      return g;
    }
    function tone(t, freq, length, peak, type) {
      const o = ctx.createOscillator();
      o.type = type || "triangle";
      o.frequency.value = freq;
      o.connect(envelope(t, peak, 0.015, length));
      o.start(t);
      o.stop(t + length + 0.05);
    }

    // Whoosh while the two sides fly in.
    const w = noise(HIT / 1000 + 0.1);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(300, at(0));
    band.frequency.exponentialRampToValueAtTime(2600, at(HIT));
    w.connect(band).connect(envelope(at(0), 0.4, HIT / 1000 * 0.75, HIT / 1000 + 0.05));
    w.start(at(0));
    w.stop(at(HIT) + 0.1);

    // Boom when they collide: a falling low tone plus a short burst of noise.
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(170, at(HIT));
    boom.frequency.exponentialRampToValueAtTime(38, at(HIT) + 0.5);
    boom.connect(envelope(at(HIT), 0.9, 0.005, 0.6));
    boom.start(at(HIT));
    boom.stop(at(HIT) + 0.65);
    const crack = noise(0.3);
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 1400;
    crack.connect(low).connect(envelope(at(HIT), 0.55, 0.003, 0.25));
    crack.start(at(HIT));
    crack.stop(at(HIT) + 0.3);

    // Chime for "VS", ticks for 3-2-1, a bright double note for "Go!".
    [1046.5, 1318.5, 1568].forEach((f, i) => tone(at(CHIME) + i * 0.08, f, 0.55, 0.22));
    COUNT.forEach((ms) => tone(at(ms), 880, 0.14, 0.28, "square"));
    tone(at(GO), 1318.5, 0.45, 0.3);
    tone(at(GO), 1760, 0.45, 0.22);

    setTimeout(() => { try { ctx.close(); } catch (e) {} }, DONE + 800);
  }

  // ---------- Screens ----------
  // One color per seat in the room, so each player is easy to tell apart.
  const COLORS = ["#7c5cff", "#2fd4c8", "#ff6686", "#ffd166", "#2bd28b", "#60a5fa", "#f97316", "#e879f9"];

  // Round profile picture in the player's color; their first letter when there's no picture (or it fails to load).
  function makeAvatar(name, url, color) {
    const box = document.createElement("div");
    box.className = "bbm-avatar";
    box.style.setProperty("--c", color);
    const letter = () => { box.textContent = (name || "?").trim().charAt(0).toUpperCase() || "?"; };
    if (url) {
      const img = document.createElement("img");
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.onerror = letter;
      img.src = url;
      box.appendChild(img);
    } else {
      letter();
    }
    return box;
  }

  function newScreen() {
    if (!document.getElementById("bbMatchStyle")) {
      const style = document.createElement("style");
      style.id = "bbMatchStyle";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    document.getElementById("bbMatch")?.remove();
    const el = document.createElement("div");
    el.id = "bbMatch";
    el.setAttribute("role", "status");
    return el;
  }

  // Shows the screen, plays the sounds and the 3-2-1-Go countdown, then removes it.
  function run(el, goText) {
    // Arabic or English text each keep their own reading direction ("!" and numbers on the right side).
    el.querySelectorAll(".bbm-title,.bbm-sub,.bbm-name,.bbm-role,.bbm-count").forEach((t) => { t.dir = "auto"; });
    document.body.appendChild(el);
    playSounds();

    const count = el.querySelector(".bbm-count");
    const show = (text, go) => {
      const span = document.createElement("span");
      span.textContent = text;
      if (go) span.className = "bbm-go";
      count.replaceChildren(span);
    };
    ["3", "2", "1"].forEach((n, i) => setTimeout(() => show(n), COUNT[i]));
    setTimeout(() => show(goText, true), GO);
    setTimeout(() => el.classList.add("bbm-out"), FADE);

    return new Promise((resolve) => setTimeout(() => { el.remove(); resolve(); }, DONE));
  }

  window.showMatchFound = function ({ me, opponent, meAvatar, opponentAvatar, texts }) {
    const el = newScreen();
    el.innerHTML = `
      <div class="bbm-flash"></div>
      <p class="bbm-title"></p>
      <div class="bbm-arena">
        <div class="bbm-side bbm-me">${LEFT_HALF}<span class="bbm-name"></span><span class="bbm-role"></span></div>
        <div class="bbm-vs">${SPARK}<span>VS</span><div class="bbm-ring"></div></div>
        <div class="bbm-side bbm-opp">${RIGHT_HALF}<span class="bbm-name"></span><span class="bbm-role"></span></div>
      </div>
      <p class="bbm-count"></p>`;
    // Names come from players, so they only ever go in as text.
    el.querySelector(".bbm-title").textContent = texts.title;
    el.querySelector(".bbm-me .bbm-name").textContent = me;
    el.querySelector(".bbm-me .bbm-role").textContent = texts.you;
    el.querySelector(".bbm-opp .bbm-name").textContent = opponent;
    el.querySelector(".bbm-opp .bbm-role").textContent = texts.opponent;
    el.querySelector(".bbm-me").insertBefore(makeAvatar(me, meAvatar, COLORS[0]), el.querySelector(".bbm-me .bbm-name"));
    el.querySelector(".bbm-opp").insertBefore(makeAvatar(opponent, opponentAvatar, COLORS[1]), el.querySelector(".bbm-opp .bbm-name"));
    return run(el, texts.go);
  };

  window.showBattleStart = function ({ players, meId, texts }) {
    if (players.length === 2) {
      // Two players: the classic VS screen, with you always on the left.
      const me = players.find((p) => p.id === meId) || players[0];
      const other = players.find((p) => p !== me);
      return window.showMatchFound({ me: me.name, opponent: other.name, meAvatar: me.avatar, opponentAvatar: other.avatar, texts });
    }

    const el = newScreen();
    el.innerHTML = `
      <div class="bbm-flash"></div>
      <p class="bbm-title"></p>
      <p class="bbm-sub"></p>
      <div class="bbm-stage">
        <div class="bbm-center">
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <g transform="translate(-276 -21)">
              <g class="bbm-part bbm-hl">${LEFT_HALF.replace(/<\/?svg[^>]*>/g, "")}</g>
              <g class="bbm-part bbm-hr">${RIGHT_HALF.replace(/<\/?svg[^>]*>/g, "")}</g>
              <g class="bbm-part bbm-hs">${SPARK.replace(/<\/?svg[^>]*>/g, "")}</g>
            </g>
          </svg>
          <div class="bbm-ring"></div>
        </div>
      </div>
      <p class="bbm-count"></p>`;
    el.querySelector(".bbm-title").textContent = texts.title;
    el.querySelector(".bbm-sub").textContent = texts.subtitle || "";

    // Seat everyone around the logo, first player at the top. On tall phone screens the circle
    // stretches into an oval to make room. Photos are as big as possible without neighbors overlapping.
    const stage = el.querySelector(".bbm-stage");
    const n = players.length;
    let photo = Math.round(Math.min(96, Math.max(68, Math.min(innerWidth, innerHeight) * 0.17)));
    const rx = Math.max(100, Math.min(innerWidth / 2 - 64, 240));
    // Leave ~250px for the title, player count and countdown, plus room for a photo and name at top and bottom.
    const ry = Math.max(90, Math.min((innerHeight - 250 - photo - 60) / 2, rx * 1.6, 240));
    const seats = players.map((p, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
    });
    const nameWidth = Math.min(120, Math.max(84, innerWidth * 0.22));
    const overlaps = (size) => seats.some((a, i) => seats.some((b, j) => j > i &&
      Math.abs(a.x - b.x) < Math.max(size, nameWidth) && Math.abs(a.y - b.y) < size + 42));
    while (photo > 48 && overlaps(photo)) photo -= 4;
    const chipWidth = Math.max(photo, nameWidth);
    stage.style.setProperty("--av", photo + "px");
    stage.style.setProperty("--w", chipWidth + "px");
    stage.style.width = Math.round(rx * 2 + chipWidth + 8) + "px";
    stage.style.height = Math.round(ry * 2 + photo + 60) + "px";
    players.forEach((p, i) => {
      const { x, y } = seats[i];
      const chip = document.createElement("div");
      chip.className = "bbm-player" + (p.id === meId ? " bbm-is-me" : "");
      chip.style.setProperty("--x", x.toFixed(1) + "px");
      chip.style.setProperty("--y", y.toFixed(1) + "px");
      chip.style.setProperty("--fx", (x * 3).toFixed(1) + "px"); // fly in from far out along the same direction
      chip.style.setProperty("--fy", (y * 3).toFixed(1) + "px");
      chip.style.setProperty("--c", COLORS[i % COLORS.length]);
      // Staggered starts that all land together on the hit.
      const delay = Math.min(i * 45, HIT - 250);
      chip.style.animationDelay = delay + "ms";
      chip.style.animationDuration = (HIT - delay) + "ms";

      const avatar = makeAvatar(p.name, p.avatar, COLORS[i % COLORS.length]);
      const name = document.createElement("span");
      name.className = "bbm-name";
      name.textContent = p.name || "?";
      chip.append(avatar, name);
      if (p.id === meId) {
        const role = document.createElement("span");
        role.className = "bbm-role";
        role.textContent = texts.you;
        chip.append(role);
      }
      stage.appendChild(chip);
    });
    return run(el, texts.go);
  };
})();
