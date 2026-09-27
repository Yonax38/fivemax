// Musique et bruitages fabriqués directement par le jeu (aucun fichier son nécessaire)
(function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let timer = null, nextTime = 0, stepIdx = 0, theme = 0, playing = false;
  let frVoice = null;

  const STEP = 60 / 138 / 2; // croche à 138 bpm
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
  const LEADWAVE = ['square', 'triangle', 'square'];

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = FM.save.music ? 0.16 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = FM.save.sfx ? 0.5 : 0; sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, t, dur, type, vol, dest, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(t, dur, vol, dest, freq, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  function playStep(i, t) {
    const bar = (i >> 3) & 3, k = i & 7, tr = TRANSPOSE[theme];
    if (k === 0 || k === 4) tone(mtof(BASS[bar] + tr), t, STEP * 1.8, 'triangle', 0.9, musicGain);
    if (k === 2 || k === 6) tone(mtof(BASS[bar] + 12 + tr), t, STEP * 0.8, 'triangle', 0.5, musicGain);
    const n = LEAD[bar][k];
    if (n > 0) tone(mtof(n + tr), t, STEP * 1.6, LEADWAVE[theme], 0.32, musicGain);
    if (k & 1) {
      const c = CHORD[bar];
      tone(mtof(c[(k >> 1) % 3] + 12 + tr), t, STEP * 0.7, 'square', 0.1, musicGain);
      noise(t, 0.05, 0.25, musicGain, 7000, 2);
    }
    if (k === 0 || k === 4) noise(t, 0.09, 0.32, musicGain, 180, 1); // grosse caisse
    if (k === 2 || k === 6) noise(t, 0.08, 0.2, musicGain, 1800, 1); // caisse claire
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
    click: (t) => { tone(660, t, 0.08, 'square', 0.35, sfxGain, 880); },
    lane: (t) => { noise(t, 0.09, 0.4, sfxGain, 2500, 0.8); },
    jump: (t) => { tone(280, t, 0.22, 'square', 0.3, sfxGain, 720); },
    superjump: (t) => { tone(250, t, 0.4, 'square', 0.3, sfxGain, 1100); tone(500, t + 0.05, 0.35, 'triangle', 0.3, sfxGain, 1500); },
    land: (t) => { noise(t, 0.08, 0.35, sfxGain, 500, 0.7); },
    slide: (t) => { noise(t, 0.35, 0.5, sfxGain, 1200, 0.6); },
    coin: (t) => {
      const now = ctx.currentTime;
      coinCombo = (now - lastCoin < 0.5) ? Math.min(coinCombo + 1, 9) : 0;
      lastCoin = now;
      const f = 880 * Math.pow(2, coinCombo / 12 * 1.5);
      tone(f, t, 0.09, 'square', 0.3, sfxGain);
      tone(f * 1.5, t + 0.07, 0.16, 'square', 0.3, sfxGain);
    },
    power: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'triangle', 0.4, sfxGain)); },
    shield: (t) => { tone(300, t, 0.3, 'sawtooth', 0.2, sfxGain, 100); noise(t, 0.25, 0.4, sfxGain, 900, 1); },
    hit: (t) => { noise(t, 0.5, 0.9, sfxGain, 300, 0.5); tone(220, t, 0.5, 'sawtooth', 0.5, sfxGain, 50); },
    fall: (t) => { tone(700, t, 0.9, 'sine', 0.4, sfxGain, 90); },
    buy: (t) => { [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.09, 0.16, 'square', 0.3, sfxGain)); },
    nope: (t) => { tone(200, t, 0.18, 'square', 0.3, sfxGain, 140); tone(160, t + 0.14, 0.22, 'square', 0.3, sfxGain, 110); },
    unlock: (t) => { [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, 0.2, 'triangle', 0.45, sfxGain)); },
    record: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.12, 0.3, 'square', 0.28, sfxGain)); },
    theme: (t) => { tone(400, t, 0.6, 'sine', 0.4, sfxGain, 1200); noise(t, 0.6, 0.3, sfxGain, 4000, 0.6); }
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
      musicGain.gain.setTargetAtTime(FM.save.music ? 0.16 : 0, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(FM.save.sfx ? 0.5 : 0, ctx.currentTime, 0.05);
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
