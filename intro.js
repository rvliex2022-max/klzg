// Logo animation shown when the site opens and between pages.
// First page of a visit: the two brain halves fly in and meet, then "Brain Battle" appears.
// Every page after that: a quick spark, then the page. Clicking a link fades into the logo before leaving.
// A random tip from TIPS shows under the logo each time.
// Load it in <head> without "defer" so the page never flashes before the animation.
(function () {
  const SEEN_KEY = "bb_intro_seen";
  const LAST_TIP_KEY = "bb_intro_last_tip";
  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Keep both lists the same length and order: tip N in Arabic is tip N in English.
  const TIPS = {
    ar: [
      "كل ما جاوبت أسرع، أخذت نقاط أكثر ⚡",
      "الإجابة الغلط ما تنقص نقاطك، جرّب حظك",
      "كل سؤال له 18 ثانية، لا تضيّع وقتك",
      "تقدر تلعب مع لين 8 أشخاص في نفس الغرفة",
      "اختار عدد الأسئلة من 5 إلى 50 قبل ما تنشئ الغرفة",
      "شارك رمز الغرفة مع أصحابك عشان يدخلون معك",
      "ما فيه أحد معك؟ اضغط زر البحث عن خصم",
      "كل فوز يرفعك في لوحة المتصدرين 🏆",
      "سجّل دخولك عشان تنحفظ انتصاراتك ومستواك",
      "أضف أصدقاءك من صفحة الرسائل وتكلّم معهم",
      "غيّر صورتك ونبذتك من الملف الشخصي",
      "شغّل أغنيتك المفضلة من زر Spotify الأخضر 🎵"
    ],
    en: [
      "The faster you answer, the more points you get ⚡",
      "Wrong answers don't cost points, so take a guess",
      "Each question has 18 seconds, don't waste them",
      "Up to 8 people can play in the same room",
      "Pick 5 to 50 questions before you create a room",
      "Share the room code so your friends can join you",
      "Nobody around? Press \"Find Opponent Now\"",
      "Every win moves you up the leaderboard 🏆",
      "Log in so your wins and brain level are saved",
      "Add friends from the Messages page and chat with them",
      "Change your photo and bio from your Profile",
      "Play your favorite song with the green Spotify button 🎵"
    ]
  };
  let lang = "en";
  try { lang = localStorage.getItem("lang") === "ar" ? "ar" : "en"; } catch (e) {}

  function pickTip() {
    const list = TIPS[lang];
    let last = -1;
    try { last = Number(sessionStorage.getItem(LAST_TIP_KEY)); } catch (e) {}
    let i = Math.floor(Math.random() * list.length);
    if (i === last) i = (i + 1) % list.length; // never the same tip twice in a row
    try { sessionStorage.setItem(LAST_TIP_KEY, String(i)); } catch (e) {}
    return list[i];
  }

  let firstVisit = true;
  try {
    firstVisit = !sessionStorage.getItem(SEEN_KEY);
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch (e) {}

  const style = document.createElement("style");
  style.textContent = `
    #bbIntro{position:fixed;inset:0;z-index:2147483647;background:#080b14;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;opacity:1;transition:opacity .5s ease;cursor:pointer}
    #bbIntro.bbi-hide{opacity:0;pointer-events:none}
    #bbIntro.bbi-exit{transition-duration:.3s}
    #bbIntro svg{width:132px;height:132px;overflow:visible}
    #bbIntro .bbi-word{font:800 26px/1.2 'Cairo','Segoe UI',system-ui,sans-serif;color:#f5f6ff;letter-spacing:.5px;opacity:0;margin:0}
    #bbIntro .bbi-part{transform-box:fill-box;transform-origin:center}
    #bbIntro .bbi-ring{opacity:0}
    #bbIntro.bbi-full .bbi-left{animation:bbiLeft .95s cubic-bezier(.2,.9,.3,1.25) both}
    #bbIntro.bbi-full .bbi-right{animation:bbiRight .95s cubic-bezier(.2,.9,.3,1.25) both}
    #bbIntro.bbi-full .bbi-spark{animation:bbiSpark .6s .8s cubic-bezier(.3,1.6,.5,1) both}
    #bbIntro.bbi-full .bbi-ring{animation:bbiRing .9s .8s ease-out both}
    #bbIntro.bbi-full .bbi-word{animation:bbiWord .65s 1.2s ease-out both}
    #bbIntro.bbi-quick svg{animation:bbiPop .65s ease-out both}
    #bbIntro.bbi-quick .bbi-spark{animation:bbiSpark .55s cubic-bezier(.3,1.6,.5,1) both}
    #bbIntro.bbi-quick .bbi-ring{animation:bbiRing .75s ease-out both}
    #bbIntro .bbi-tip{max-width:min(360px,86vw);margin:10px 0 0;text-align:center;opacity:0;
      font:500 15px/1.7 'Cairo','Segoe UI',system-ui,sans-serif;color:#aeb7cf}
    #bbIntro .bbi-tip-label{display:block;margin-bottom:2px;font-size:12px;font-weight:800;letter-spacing:.5px;color:#a78bfa}
    #bbIntro.bbi-full .bbi-tip{animation:bbiWord .5s .9s ease-out both}
    #bbIntro.bbi-quick .bbi-tip{animation:bbiWord .4s .1s ease-out both}
    @keyframes bbiLeft{from{transform:translateX(-70px) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbiRight{from{transform:translateX(70px) rotate(12deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbiSpark{from{transform:scale(0) rotate(-90deg);opacity:0}to{transform:none;opacity:1}}
    @keyframes bbiRing{from{transform:scale(.2);opacity:.9}to{transform:scale(3.2);opacity:0}}
    @keyframes bbiWord{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes bbiPop{0%{transform:scale(.92)}50%{transform:scale(1.05)}100%{transform:none}}
    @media (prefers-reduced-motion: reduce){#bbIntro *{animation:none!important}}
  `;
  document.head.appendChild(style);

  // Same drawing as logo.svg, split into parts so each can move on its own.
  const LOGO = `
    <svg viewBox="0 0 128 128" aria-hidden="true">
      <g transform="translate(-276 -21)">
        <g class="bbi-part bbi-left">
          <path d="M334 58 C324 50 306 50 302 62 C288 62 280 76 288 86 C278 96 284 112 298 114 C300 128 316 132 326 124 C330 128 334 128 334 126 Z" fill="#7c5cff"/>
          <path d="M318 72 C312 78 314 88 322 90 M304 98 C312 96 318 102 316 110" fill="none" stroke="#080b14" stroke-width="4" stroke-linecap="round"/>
        </g>
        <g class="bbi-part bbi-right">
          <path d="M346 58 C356 50 374 50 378 62 C392 62 400 76 392 86 C402 96 396 112 382 114 C380 128 364 132 354 124 C350 128 346 128 346 126 Z" fill="#2fd4c8"/>
          <path d="M362 72 C368 78 366 88 358 90 M376 98 C368 96 362 102 364 110" fill="none" stroke="#080b14" stroke-width="4" stroke-linecap="round"/>
        </g>
        <circle class="bbi-part bbi-ring" cx="340" cy="56" r="10" fill="none" stroke="#ffd166" stroke-width="3"/>
        <polygon class="bbi-part bbi-spark" points="340,40 344,52 356,52 346,59 350,71 340,64 330,71 334,59 324,52 336,52" fill="#ffd166"/>
      </g>
    </svg>`;

  function makeOverlay(mode) {
    const el = document.createElement("div");
    el.id = "bbIntro";
    el.className = "bbi-" + mode;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = LOGO + (mode === "full" ? '<p class="bbi-word">Brain Battle</p>' : "");
    if (mode !== "exit") {
      const tip = document.createElement("p");
      tip.className = "bbi-tip";
      tip.dir = lang === "ar" ? "rtl" : "ltr";
      const label = document.createElement("span");
      label.className = "bbi-tip-label";
      label.textContent = lang === "ar" ? "💡 نصيحة" : "💡 Tip";
      tip.append(label, pickTip());
      el.appendChild(tip);
    }
    return el;
  }

  // ---------- Opening animation ----------
  // The body doesn't exist yet this early, so attach to <html>; it still covers the whole page.
  let overlay = makeOverlay(firstVisit ? "full" : "quick");
  document.documentElement.appendChild(overlay);

  let hidden = false;
  function hide() {
    if (hidden || !overlay) return;
    hidden = true;
    const el = overlay;
    el.classList.add("bbi-hide");
    setTimeout(() => el.remove(), 550);
  }
  overlay.addEventListener("click", hide);

  // Long enough to read the tip.
  const animationTime = reduceMotion ? 0 : firstVisit ? 2800 : 1400;
  const started = Date.now();
  function hideWhenReady() {
    setTimeout(hide, Math.max(0, animationTime - (Date.now() - started)));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hideWhenReady);
  else hideWhenReady();
  setTimeout(hide, 5000); // never block the page for long, even if something goes wrong

  // ---------- Leaving the page ----------
  // Fade into the logo before following a link to another page of the site.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest && e.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // same-page jump
    if (reduceMotion) return;

    e.preventDefault();
    const exit = makeOverlay("exit");
    exit.classList.add("bbi-hide");
    document.body.appendChild(exit);
    exit.getBoundingClientRect(); // start from transparent so the fade-in runs
    exit.classList.remove("bbi-hide");
    setTimeout(() => { location.href = url.href; }, 300);
    setTimeout(() => exit.remove(), 6000); // if the next page never arrives, give this one back
  });

  // Coming back with the Back button can restore the page with the fade still on screen.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) document.querySelectorAll("#bbIntro").forEach((el) => el.remove());
  });
})();
