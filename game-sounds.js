// Game sound effects, made in the browser (no audio files):
//   gameSounds.join()     someone enters the room
//   gameSounds.correct()  right answer
//   gameSounds.wrong()    wrong answer or time ran out
//   gameSounds.win()      won the match
//   gameSounds.lose()     lost the match
(function () {
  let ctx = null;
  let master = null;

  function audio() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { ctx = new Ctx(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  // Browsers only allow sound after the player has clicked or typed, so get ready on the first one.
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, audio, { once: true, capture: true }));

  // One note. freq is in Hz, or [from, to] to slide between them; start and length are in seconds.
  function tone(freq, start, length, opts) {
    const c = audio();
    if (!c) return;
    const { type = "triangle", volume = 0.4, filter = 0, vibrato = 0 } = opts || {};
    const t0 = c.currentTime + 0.02 + start;
    const [from, to] = Array.isArray(freq) ? freq : [freq, freq];

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

    let out = osc;
    if (filter) {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = filter;
      osc.connect(lp);
      out = lp;
    }
    out.connect(gain);
    gain.connect(master);

    if (vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = vibrato;
      lfo.connect(depth);
      depth.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + length + 0.05);
    }
    osc.start(t0);
    osc.stop(t0 + length + 0.05);
  }

  const sounds = {
    // A friendly "ding-dong" going up.
    join() {
      tone(659.25, 0, 0.2, { volume: 0.45 });
      tone(987.77, 0.13, 0.35, { volume: 0.45 });
    },
    // Two quick bright notes going up, with a little sparkle.
    correct() {
      tone(880, 0, 0.13, { volume: 0.4 });
      tone(1318.5, 0.09, 0.3, { volume: 0.4 });
      tone(2637, 0.09, 0.22, { type: "sine", volume: 0.07 });
    },
    // A short low buzz, twice.
    wrong() {
      tone([220, 160], 0, 0.15, { type: "square", volume: 0.22, filter: 900 });
      tone([185, 110], 0.17, 0.32, { type: "square", volume: 0.22, filter: 900 });
    },
    // A rising fanfare that ends on a held chord.
    win() {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.12, 0.16, { volume: 0.38 }));
      [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, 0.38, 1, { volume: 0.2, vibrato: 3 }));
      [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 0.46 + i * 0.08, 0.25, { type: "sine", volume: 0.06 }));
    },
    // A sad "wah wah wah wahhh" going down.
    lose() {
      [392, 369.99, 349.23].forEach((f, i) => tone(f, i * 0.32, 0.3, { type: "sawtooth", volume: 0.2, filter: 1100 }));
      tone(329.63, 0.96, 1, { type: "sawtooth", volume: 0.2, filter: 1100, vibrato: 6 });
    },
  };

  window.gameSounds = sounds;
})();
