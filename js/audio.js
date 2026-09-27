// Musique et bruitages fabriqués directement par le jeu (aucun fichier son nécessaire).
// Sonorités douces et modernes : oscillateurs filtrés (enveloppe de coupure façon "pluck"),
// une pointe de réverbération, plutôt que des ondes carrées brutes façon borne d'arcade.
(function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null, reverb = null, reverbBus = null;
  let timer = null, nextTime = 0, stepIdx = 0, theme = 0, playing = false;
  let frVoice = null;

  const STEP = 60 / 132 / 2; // croche à 132 bpm
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const BASS = [36, 33, 29, 31];
  const LEAD = [
    [72, -1, 76, 79, -1, 76, 72, -1],
    [69, -1, 72, 76, -1, 72, 69, -1],
    [65, -1, 69, 72, -1, 69, 65, -1],
    [67, -1, 71, 74, -1, 71, 67, 74]
  ];
  const CHORD = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const TRANSPOSE = [0, 3, -2];

  function makeReverbIR(seconds, decay) {
    const len = Math.round(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = FM.save.music ? 0.18 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = FM.save.sfx ? 0.55 : 0; sfxGain.connect(master);
    // petite réverbération partagée : donne un rendu plus doux et « habité » qu'un bip sec
    reverb = ctx.createConvolver(); reverb.buffer = makeReverbIR(1.5, 2.4);
    const reverbOut = ctx.createGain(); reverbOut.gain.value = 0.55; reverb.connect(reverbOut); reverbOut.connect(master);
    reverbBus = ctx.createGain(); reverbBus.gain.value = 1; reverbBus.connect(reverb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // ton filtré : la coupure du filtre descend pendant la note ("pluck" doux plutôt qu'un bip carré cru)
  function tone(freq, t, dur, type, vol, dest, slideTo, opts) {
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.type = 'lowpass'; f.Q.value = 0.6;
    const cutStart = Math.max(freq * (opts.brightness || 5), 900), cutEnd = Math.max(freq * 1.3, 300);
    f.frequency.setValueAtTime(cutStart, t);
    f.frequency.exponentialRampToValueAtTime(cutEnd, t + dur * (opts.sweep || 1));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack || 0.014));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    if (reverbBus && opts.dry !== true) { const rg = ctx.createGain(); rg.gain.value = opts.wet != null ? opts.wet : 0.16; g.connect(rg); rg.connect(reverbBus); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  // second oscillateur légèrement désaccordé par-dessus le premier : chaleur façon "chorus", sans dureté
  function toneWarm(freq, t, dur, type, vol, dest, slideTo, opts) {
    tone(freq, t, dur, type, vol, dest, slideTo, opts);
    tone(freq * 1.006, t, dur, type, vol * 0.55, dest, slideTo ? slideTo * 1.006 : null, Object.assign({}, opts, { wet: 0.05 }));
  }

  function noise(t, dur, vol, dest, freq, q, opts) {
    opts = opts || {};
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = opts.type || 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = q || 1;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.lowpass || 9000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(lp); lp.connect(g); g.connect(dest);
    if (reverbBus && opts.wet) { const rg = ctx.createGain(); rg.gain.value = opts.wet; g.connect(rg); rg.connect(reverbBus); }
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  function playStep(i, t) {
    const bar = (i >> 3) & 3, k = i & 7, tr = TRANSPOSE[theme];
    if (k === 0 || k === 4) tone(mtof(BASS[bar] + tr - 12), t, STEP * 1.9, 'sine', 0.85, musicGain, null, { brightness: 2.2, wet: 0.06 });
    if (k === 2 || k === 6) tone(mtof(BASS[bar] + tr), t, STEP * 0.85, 'sine', 0.4, musicGain, null, { brightness: 2.5, wet: 0.06 });
    const n = LEAD[bar][k];
    if (n > 0) toneWarm(mtof(n + tr), t, STEP * 1.55, 'triangle', 0.26, musicGain, null, { brightness: 4, wet: 0.22 });
    if (k & 1) {
      const c = CHORD[bar];
      tone(mtof(c[(k >> 1) % 3] + 12 + tr), t, STEP * 0.9, 'sine', 0.075, musicGain, null, { brightness: 3, wet: 0.28 });
    }
    if (k === 0 || k === 4) noise(t, 0.1, 0.22, musicGain, 130, 0.9, { lowpass: 700 }); // grosse caisse, feutrée
    if (k === 2 || k === 6) noise(t, 0.05, 0.1, musicGain, 3200, 1.4, { lowpass: 6000, wet: 0.1 }); // clic léger, pas de sifflement métallique
  }

  function schedule() {
    if (!playing || !ctx) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.3) {
      playStep(stepIdx, nextTime);
      nextTime += STEP;
      stepIdx = (stepIdx + 1) & 31;
    }
  }

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    frVoice = vs.find((v) => /^fr/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  let coinCombo = 0, lastCoin = 0;

  const SFX = {
    click: (t) => { tone(720, t, 0.07, 'sine', 0.3, sfxGain, 980, { brightness: 6, wet: 0.1 }); },
    lane: (t) => { noise(t, 0.06, 0.28, sfxGain, 2200, 1.1, { lowpass: 5000, wet: 0.08 }); },
    jump: (t) => { tone(300, t, 0.2, 'sine', 0.32, sfxGain, 760, { brightness: 5, wet: 0.14 }); },
    superjump: (t) => { tone(280, t, 0.36, 'sine', 0.32, sfxGain, 1150, { brightness: 6, wet: 0.18 }); tone(560, t + 0.05, 0.3, 'triangle', 0.22, sfxGain, 1500, { brightness: 5, wet: 0.16 }); },
    land: (t) => { noise(t, 0.07, 0.3, sfxGain, 380, 0.8, { lowpass: 1200 }); },
    slide: (t) => { noise(t, 0.3, 0.4, sfxGain, 1000, 0.7, { lowpass: 3200, wet: 0.06 }); },
    coin: (t) => {
      const now = ctx.currentTime;
      coinCombo = (now - lastCoin < 0.5) ? Math.min(coinCombo + 1, 9) : 0;
      lastCoin = now;
      const f = 880 * Math.pow(2, coinCombo / 12 * 1.5);
      tone(f, t, 0.11, 'sine', 0.28, sfxGain, null, { brightness: 7, wet: 0.24 });
      tone(f * 2, t + 0.005, 0.09, 'sine', 0.12, sfxGain, null, { brightness: 8, wet: 0.24 });
      tone(f * 1.5, t + 0.07, 0.18, 'triangle', 0.22, sfxGain, null, { brightness: 6, wet: 0.24 });
    },
    power: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.07, 0.16, 'triangle', 0.34, sfxGain, null, { brightness: 5, wet: 0.22 })); },
    shield: (t) => { tone(320, t, 0.32, 'sine', 0.24, sfxGain, 780, { brightness: 4, wet: 0.2 }); noise(t, 0.22, 0.22, sfxGain, 1400, 1, { lowpass: 4000, wet: 0.14 }); },
    hit: (t) => { noise(t, 0.42, 0.7, sfxGain, 260, 0.6, { lowpass: 1500 }); tone(200, t, 0.4, 'sine', 0.35, sfxGain, 55, { brightness: 3, wet: 0.1 }); },
    fall: (t) => { tone(650, t, 0.85, 'sine', 0.32, sfxGain, 85, { brightness: 3, wet: 0.16 }); },
    buy: (t) => { [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.09, 0.17, 'triangle', 0.28, sfxGain, null, { brightness: 5, wet: 0.2 })); },
    nope: (t) => { tone(210, t, 0.16, 'sine', 0.28, sfxGain, 150, { brightness: 3, wet: 0.08 }); tone(170, t + 0.13, 0.2, 'sine', 0.28, sfxGain, 120, { brightness: 3, wet: 0.08 }); },
    unlock: (t) => { [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, 0.22, 'triangle', 0.4, sfxGain, null, { brightness: 5, wet: 0.26 })); },
    record: (t) => { [784, 988, 1175, 1568].forEach((f, i) => toneWarm(f, t + i * 0.12, 0.32, 'triangle', 0.26, sfxGain, null, { brightness: 5, wet: 0.28 })); },
    theme: (t) => { tone(400, t, 0.7, 'sine', 0.34, sfxGain, 1150, { brightness: 3, wet: 0.3 }); noise(t, 0.6, 0.16, sfxGain, 3500, 0.7, { lowpass: 5000, wet: 0.2 }); }
  };

  FM.audio = {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    sfx(name) {
      if (!FM.save.sfx || !ensure() || !SFX[name]) return;
      if (ctx.state === 'suspended') ctx.resume();
      SFX[name](ctx.currentTime + 0.005);
    },
    startMusic(th) {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      theme = th || 0;
      if (playing) return;
      playing = true; stepIdx = 0; nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 60);
    },
    setTheme(th) { theme = th; },
    stopMusic() { playing = false; if (timer) { clearInterval(timer); timer = null; } },
    applySettings() {
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(FM.save.music ? 0.18 : 0, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(FM.save.sfx ? 0.55 : 0, ctx.currentTime, 0.05);
      if (!FM.save.sfx && 'speechSynthesis' in window) speechSynthesis.cancel();
    },
    // Petite voix (seulement si le PC a une voix française installée)
    speak(text, charKey) {
      if (!FM.save.sfx || !frVoice || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = frVoice; u.lang = frVoice.lang;
        u.pitch = charKey === 'alien' ? 0.4 : charKey === 'princess' ? 1.8 : 1.4;
        u.rate = charKey === 'alien' ? 0.85 : 1.15;
        u.volume = 0.9;
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
})();
