// Logique du jeu, contrôles et menus
(function () {
  const $ = (s) => document.querySelector(s);
  const K = FM.K, PZ = K.PZ;
  const save = FM.save;
  const canvas = $('#game'), fx = $('#fx'), fctx = fx.getContext('2d'), stage = $('#stage');

  const G = {
    mode: 'menu', time: 0, animT: 0, dist: 0, camX: 0, speed: 9, t: 0, shake: 0,
    objs: [], nextD: 0, coinsRun: 0, particles: [], rowIndex: 0,
    player: { lane: 0, prevLane: 0, x: 0, y: 0, vy: 0, slide: 0, slideOnLand: false, jumpBuf: 0, stumbleT: 0 },
    powers: { magnet: 0, shield: 0, jump: 0, slow: 0 },
    invuln: 0, dead: false, falling: false, deadRot: 0, deadT: 0, charKey: 'boy', outfit: 0, vehicle: 'none',
    lastPowerD: 0, themeShown: 0, recordShown: false, milestone: 0
  };
  window.FMG = G; // pratique pour déboguer (tests automatiques)

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.random() * a.length | 0];
  const RECORD_MIN = 300; // on ne fête un record que s'il est significatif
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- affichage / mise à l'échelle ----------
  let pxScale = 1;
  function fit() {
    const k = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(clamp(1280 * k * dpr, 640, 2560)), ph = Math.round(pw * 720 / 1280);
    canvas.width = pw; canvas.height = ph;
    fx.width = pw; fx.height = ph;
    pxScale = pw / 1280;
    G.stageK = k;
    if (FM.world3d) FM.world3d.resize(pw, ph);
  }
  addEventListener('resize', fit);
  fit();

  // ---------- écrans ----------
  const SCREENS = ['menu', 'wardrobe', 'pause', 'over'];
  function showScreen(name) {
    SCREENS.forEach((s) => $('#screen-' + s).classList.toggle('hidden', s !== name));
    $('#hud').classList.toggle('hidden', !(G.mode === 'play' || G.mode === 'paused'));
  }
  function toast(text) {
    const t = $('#toast'); t.textContent = text; t.classList.remove('hidden');
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  function banner(text) {
    const b = $('#banner'); b.textContent = text; b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(banner.h); banner.h = setTimeout(() => b.classList.add('hidden'), 1800);
  }
  function refreshCoins() { document.querySelectorAll('.coin-total').forEach((e) => { e.textContent = save.coins; }); }
  function refreshMenuTag() { const n = FM.CHARS.filter((c) => save.unlocked[c.key]).length; $('#menu-unlock-tag').textContent = n + '/' + FM.CHARS.length; }
  function refreshSound() {
    ['#btn-music', '#btn-music2'].forEach((s) => { const b = $(s); b.classList.toggle('off', !save.music); b.textContent = save.music ? '🎵' : '🔕'; });
    ['#btn-sfx', '#btn-sfx2'].forEach((s) => { const b = $(s); b.classList.toggle('off', !save.sfx); b.textContent = save.sfx ? '🔊' : '🔇'; });
  }

  // ---------- partie ----------
  function resetPlayer() {
    Object.assign(G.player, { lane: 0, prevLane: 0, x: 0, y: 0, vy: 0, slide: 0, slideOnLand: false, jumpBuf: 0, stumbleT: 0 });
  }
  function resetRun() {
    G.objs = []; G.dist = 0; G.t = 0; G.nextD = 55; G.rowIndex = 0; G.coinsRun = 0; G.particles = [];
    G.powers = { magnet: 0, shield: 0, jump: 0, slow: 0 };
    G.invuln = 0; G.dead = false; G.falling = false; G.deadRot = 0; G.deadT = 0; G.shake = 0;
    G.lastPowerD = 0; G.recordShown = false; G.milestone = 0; G.speed = 0; G.camX = 0;
    G.themeShown = curTheme();
    coinsBanked = false;
    resetPlayer();
  }
  function curTheme() { const t = FM.themeAt(G.dist + 30); return t.k >= 0.5 ? t.b : t.a; }

  function startGame() {
    FM.audio.unlock();
    G.charKey = save.selected; G.outfit = save.equipped[save.selected] || 0; G.vehicle = save.selectedVehicle || 'none';
    resetRun();
    G.mode = 'play';
    FM.audio.startMusic(G.themeShown);
    showScreen(null);
    FM.audio.speak("C'est parti !", G.charKey);
    if (save.runs < 3) {
      $('#hint').classList.remove('hidden');
      clearTimeout(startGame.h); startGame.h = setTimeout(() => $('#hint').classList.add('hidden'), 6500);
    } else $('#hint').classList.add('hidden');
    updateHud(true);
  }

  function goMenu() {
    endRunCoins();
    G.mode = 'menu'; resetMenuWorld();
    $('#menu-best').textContent = save.best;
    refreshCoins(); refreshSound(); refreshMenuTag(); showScreen('menu');
  }
  function resetMenuWorld() {
    G.objs = []; G.dead = false; G.falling = false; G.deadRot = 0; G.powers = { magnet: 0, shield: 0, jump: 0, slow: 0 };
    G.invuln = 0; G.shake = 0; G.particles = []; resetPlayer(); G.charKey = save.selected; G.outfit = save.equipped[save.selected] || 0; G.vehicle = save.selectedVehicle || 'none';
    $('#hint').classList.add('hidden');
  }
  let coinsBanked = true;
  function endRunCoins() {
    if (!coinsBanked) { save.coins += G.coinsRun; coinsBanked = true; FM.persist(); }
  }

  // ---------- génération des obstacles ----------
  const ROWS = [['low1', 30, 0], ['big1', 22, 0], ['low2', 14, 90], ['low3', 8, 110], ['bar3', 14, 130], ['hole1', 10, 190],
    ['bar2', 8, 250], ['big2', 10, 300], ['hole2', 8, 350], ['hole3', 6, 420], ['mix', 18, 650]];

  function addObj(o) { o.seed = (Math.random() * 1e6) | 0; G.objs.push(o); return o; }

  function genRow() {
    const d0 = G.nextD;
    let kind;
    if (G.rowIndex === 0) kind = 'low1'; else if (G.rowIndex === 1) kind = 'big1'; else if (G.rowIndex === 2) kind = 'low3';
    else {
      const pool = ROWS.filter((r) => d0 >= r[2]);
      let tot = pool.reduce((s, r) => s + r[1], 0), x = Math.random() * tot;
      kind = pool[0][0];
      for (const r of pool) { x -= r[1]; if (x <= 0) { kind = r[0]; break; } }
    }
    G.rowIndex++;
    const cfg = ['n', 'n', 'n'], free = (Math.random() * 3) | 0;
    const others = (t) => { for (let i = 0; i < 3; i++) if (i !== free) cfg[i] = t; };
    switch (kind) {
      case 'low1': cfg[free] = 'low'; break;
      case 'low2': others('low'); break;
      case 'low3': cfg.fill('low'); break;
      case 'big1': cfg[free] = 'big'; break;
      case 'big2': others('big'); break;
      case 'bar3': cfg.fill('bar'); break;
      case 'bar2': others('bar'); break;
      case 'hole1': cfg[free] = 'hole'; break;
      case 'hole2': others('hole'); break;
      case 'hole3': cfg.fill('hole'); break;
      case 'mix': for (let i = 0; i < 3; i++) if (i !== free) cfg[i] = pick(['low', 'big', 'bar', 'hole']); break;
    }
    const th = FM.themeAt(d0).idx;
    const bigLen = th === 0 ? rnd(5, 13) : rnd(3, 7);
    const allHole = cfg.every((t) => t === 'hole');
    const LEN = { low: 1.2, bar: 1.0, hole: allHole ? 3.6 : 4.6, big: bigLen };
    let rowLen = 0;
    // regroupe les voies voisines pour les barres et les trous
    for (let i = 0; i < 3;) {
      const t = cfg[i];
      if (t === 'n') { i++; continue; }
      if (t === 'bar' || t === 'hole') {
        let j = i; while (j + 1 < 3 && cfg[j + 1] === t) j++;
        const n = j - i + 1, len = LEN[t];
        addObj({ type: t, x: ((i - 1) + (j - 1)), w: n * 2 - (t === 'hole' ? 0.2 : 0.1), len, h: 0, d: d0 + len / 2 });
        rowLen = Math.max(rowLen, len); i = j + 1; continue;
      }
      const len = LEN[t], h = t === 'low' ? 1.0 : 3.0;
      addObj({ type: t, x: (i - 1) * 2, w: 1.7, len, h, d: d0 + len / 2 });
      rowLen = Math.max(rowLen, len); i++;
    }
    // pièces en arc au-dessus des obstacles bas, sous les barres
    const lowLanes = cfg.map((t, i) => (t === 'low' ? i : -1)).filter((i) => i >= 0);
    if (lowLanes.length && lowLanes.length < 3 && Math.random() < 0.6) {
      const ln = pick(lowLanes);
      for (let k = 0; k < 5; k++) addObj({ type: 'coin', x: (ln - 1) * 2, y: 1.5 + Math.sin(k / 4 * Math.PI) * 0.9, len: 0.6, d: d0 + 0.6 + (k - 2) * 1.2 });
    } else if (cfg.every((t) => t === 'low' || t === 'hole') && cfg.some((t) => t === 'low') && Math.random() < 0.6) {
      for (let k = 0; k < 5; k++) addObj({ type: 'coin', x: 0, y: 1.5 + Math.sin(k / 4 * Math.PI) * 0.9, len: 0.6, d: d0 + 0.6 + (k - 2) * 1.2 });
    }
    cfg.forEach((t, i) => {
      if (t === 'bar' && Math.random() < 0.6) for (let k = -1; k <= 1; k++) addObj({ type: 'coin', x: (i - 1) * 2, y: 0.7, len: 0.6, d: d0 + 0.5 + k * 2 });
    });

    // espace avant le prochain groupe : pièces ou bonus
    const proj = 14 + 16 * (1 - Math.exp(-(G.t + 6) / 90));
    const gap = proj * 0.95 + 4 + rnd(0, 5) + (d0 < 300 ? 5 : 0);
    const freeLanes = cfg.map((t, i) => (t === 'n' ? i : -1)).filter((i) => i >= 0);
    const gapStart = d0 + rowLen + 2.5, gapEnd = d0 + rowLen + gap - 3;
    const coinLane = freeLanes.length ? pick(freeLanes) : (Math.random() * 3 | 0);
    if (Math.random() < 0.8) {
      const n = Math.min(9, Math.floor((gapEnd - gapStart) / 1.6));
      const start = gapStart + ((gapEnd - gapStart) - (n - 1) * 1.6) / 2;
      for (let k = 0; k < n; k++) addObj({ type: 'coin', x: (coinLane - 1) * 2, y: 0.8, len: 0.6, d: start + k * 1.6 });
    }
    if (d0 > 200 && d0 - G.lastPowerD > 650 && Math.random() < 0.45) {
      let ln = (Math.random() * 3 | 0); if (ln === coinLane) ln = (ln + 1) % 3;
      addObj({ type: 'power', kind: pick(['magnet', 'shield', 'jump', 'slow']), x: (ln - 1) * 2, y: 1.2, len: 1, d: (gapStart + gapEnd) / 2 });
      G.lastPowerD = d0;
    }
    G.nextD = d0 + rowLen + gap;
  }

  // ---------- particules ----------
  function screenPos(x, y, z) { return FM.project(x, y, z); }
  function burst(sx, sy, n, colors, kind, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rnd(0.3, 1) * (speed || 240);
      G.particles.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rnd(0.4, 0.9), max: 0.9, size: rnd(3, 7), color: pick(colors), kind: kind || 'dot', rot: rnd(0, 6) });
    }
  }
  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === 'conf' ? 500 : 700) * dt; p.rot += dt * 6;
      if (p.life <= 0) G.particles.splice(i, 1);
    }
  }

  // ---------- actions du joueur ----------
  function act(a) {
    if (G.mode !== 'play' || G.dead) return;
    const pl = G.player;
    if (a === 'left' || a === 'right') {
      const nl = clamp(pl.lane + (a === 'left' ? -1 : 1), -1, 1);
      if (nl !== pl.lane) { pl.prevLane = pl.lane; pl.lane = nl; FM.audio.sfx('lane'); }
    } else if (a === 'up') {
      if (pl.y <= 0.02) doJump(); else pl.jumpBuf = 0.15;
    } else if (a === 'down') {
      if (pl.y > 0.05) { pl.vy = Math.min(pl.vy, -26); pl.slideOnLand = true; }
      else { pl.slide = 0.75; FM.audio.sfx('slide'); }
    }
  }
  function doJump() {
    const pl = G.player, sup = G.powers.jump > 0;
    pl.vy = sup ? 17.5 : 12.8; pl.y = 0.02; pl.slide = 0; pl.jumpBuf = 0;
    FM.audio.sfx(sup ? 'superjump' : 'jump');
    const p = screenPos(pl.x, 0, PZ); burst(p[0], p[1], 6, ['#ffffff', '#dddddd'], 'dot', 110);
  }

  function die(kind) {
    if (G.dead) return;
    G.dead = true; G.deadT = 0; G.shake = 1;
    const pl = G.player;
    if (kind === 'fall') { G.falling = true; pl.vy = -2; FM.audio.sfx('fall'); }
    else { pl.vy = 7; pl.y = 0.05; FM.audio.sfx('hit'); const p = screenPos(pl.x, 1, PZ); burst(p[0], p[1], 26, ['#ffe14a', '#ff8a3d', '#ffffff'], 'star', 380); }
    FM.audio.speak('Aïe !', G.charKey);
    endRunCoinsNow();
  }
  function endRunCoinsNow() { if (!coinsBanked) { save.coins += G.coinsRun; coinsBanked = true; FM.persist(); } }

  function hit(o, frontal) {
    const pl = G.player;
    if (G.invuln > 0) return;
    if (G.powers.shield > 0) {
      G.powers.shield = 0; G.invuln = 1.6; G.shake = 0.6; o.gone = true;
      FM.audio.sfx('shield');
      const p = screenPos(pl.x, 1, PZ); burst(p[0], p[1], 30, ['#7fd4ff', '#ffffff', '#b9f0ff'], 'dot', 420);
      return;
    }
    if (!frontal && pl.stumbleT <= 0) { // petit choc sur le côté : on rebondit
      pl.stumbleT = 2.5; pl.lane = pl.prevLane; G.invuln = 0.35; G.shake = 0.4; FM.audio.sfx('nope');
      const p = screenPos(pl.x, 1, PZ); burst(p[0], p[1], 10, ['#ffe14a', '#ffffff'], 'star', 200);
      return;
    }
    die('crash');
  }

  function collect(o) {
    o.gone = true;
    const pl = G.player, p = screenPos(o.x, o.y, Math.max(1.5, o.d - G.dist));
    if (o.type === 'coin') {
      G.coinsRun++; FM.audio.sfx('coin');
      burst(p[0], p[1], 4, ['#ffd52e', '#fff2a0'], 'star', 160);
    } else {
      const dur = { magnet: 8, shield: 20, jump: 8, slow: 6 }[o.kind];
      G.powers[o.kind] = dur; FM.audio.sfx('power');
      const names = { magnet: '🧲 Aimant à pièces !', shield: '🛡️ Bouclier !', jump: '🦘 Super saut !', slow: '⏱️ Ralenti !' };
      banner(names[o.kind]);
      burst(p[0], p[1], 20, ['#ffffff', '#ffe14a', '#7fd4ff'], 'star', 300);
    }
  }

  function checkCollisions(dt) {
    const pl = G.player, ph = pl.slide > 0 ? 0.85 : 1.9;
    for (const o of G.objs) {
      if (o.gone) continue;
      const zc = o.d - G.dist, zn = zc - o.len / 2, zf = zc + o.len / 2;
      if (zf < PZ - 0.45 || zn > PZ + 0.45) continue;
      const dx = Math.abs(o.x - pl.x);
      switch (o.type) {
        case 'low': if (dx < o.w / 2 + 0.35 && pl.y < o.h - 0.2) hit(o, zn > PZ - 0.25); break;
        case 'big': if (dx < o.w / 2 + 0.35 && pl.y < o.h - 0.1) hit(o, zn > PZ - 0.25); break;
        case 'bar': if (dx < o.w / 2 + 0.2 && pl.y < 2.3 && pl.y + ph > 1.3) hit(o, true); break;
        case 'hole': if (!G.invuln && dx < o.w / 2 - 0.1 && pl.y < 0.25 && zn + 0.2 < PZ && zf - 0.2 > PZ) die('fall'); break;
        case 'coin': case 'power': {
          const cy = pl.y + (pl.slide > 0 ? 0.45 : 0.95);
          if (dx < 1.0 && Math.abs(o.y - cy) < 1.4) collect(o);
          break;
        }
      }
      if (G.dead) return;
    }
  }

  // ---------- mise à jour ----------
  function update(dt) {
    pollGamepad();
    G.time += dt;
    const pl = G.player;

    if (G.mode === 'paused') return;

    if (G.mode === 'menu' || G.mode === 'wardrobe') {
      G.speed = 9; G.dist += G.speed * dt; G.animT += dt * 0.65;
      G.camX += (0 - G.camX) * Math.min(1, dt * 4);
      updateParticles(dt);
      return;
    }
    if (G.mode === 'over') { G.animT += dt * 0.5; updateParticles(dt); G.shake = Math.max(0, G.shake - dt * 2); return; }

    // ----- partie en cours -----
    if (!G.dead) G.t += dt;
    const base = 14 + 16 * (1 - Math.exp(-G.t / 90));
    const ramp = Math.min(1, 0.3 + G.t / 1.3 * 0.7);
    let sp = base * ramp * (G.powers.slow > 0 ? 0.65 : 1);
    if (G.dead) { G.deadT += dt; sp = Math.max(0, G.speed - 50 * dt); }
    G.speed = sp; G.dist += sp * dt; G.animT += dt * (sp / 14 + 0.3);

    for (const k in G.powers) if (G.powers[k] > 0) G.powers[k] = Math.max(0, G.powers[k] - dt);
    G.invuln = Math.max(0, G.invuln - dt); pl.stumbleT = Math.max(0, pl.stumbleT - dt);
    G.shake = Math.max(0, G.shake - dt * 2.2);

    if (!G.dead) {
      while (G.nextD < G.dist + K.ZFAR + 15) genRow();
    }
    // nettoyage
    if (G.objs.length && G.objs.some((o) => o.d - G.dist < -8 || o.gone)) G.objs = G.objs.filter((o) => o.d - G.dist > -8 && !o.gone);

    // déplacement latéral
    pl.x += (pl.lane * 2 - pl.x) * Math.min(1, 16 * dt);
    G.camX += (pl.x * 0.55 - G.camX) * Math.min(1, 6 * dt);

    // saut / gravité
    if (G.falling) { pl.vy -= 20 * dt; pl.y += pl.vy * dt; }
    else if (pl.y > 0 || pl.vy > 0) {
      pl.vy -= 34 * dt; pl.y += pl.vy * dt;
      if (pl.y <= 0) {
        pl.y = 0; pl.vy = 0;
        if (!G.dead) {
          FM.audio.sfx('land');
          const p = screenPos(pl.x, 0, PZ); burst(p[0], p[1], 5, ['#ffffff', '#cccccc'], 'dot', 130);
          if (pl.slideOnLand) { pl.slide = 0.6; pl.slideOnLand = false; FM.audio.sfx('slide'); }
          else if (pl.jumpBuf > 0) doJump();
        }
      }
    }
    if (pl.jumpBuf > 0) pl.jumpBuf -= dt;
    if (pl.slide > 0) pl.slide = Math.max(0, pl.slide - dt);

    if (G.dead) {
      G.deadRot = Math.min(G.deadRot + dt * 9, 1.55);
      if (G.deadT > (G.falling ? 1.1 : 1.0)) showOver();
      updateParticles(dt);
      return;
    }

    // aimant
    if (G.powers.magnet > 0) {
      for (const o of G.objs) {
        if (o.type !== 'coin' || o.gone) continue;
        const zc = o.d - G.dist;
        if (zc > 1 && zc < 26 && Math.abs(o.x - pl.x) < 4.5) {
          o.x += (pl.x - o.x) * Math.min(1, 9 * dt);
          o.y += ((pl.y + 0.9) - o.y) * Math.min(1, 9 * dt);
          o.d += ((G.dist + PZ) - o.d) * Math.min(1, 7 * dt);
        }
      }
    }
    if (G.invuln <= 0 || true) checkCollisions(dt);
    updateParticles(dt);

    // changements de décor, étapes
    const th = curTheme();
    if (th !== G.themeShown) {
      G.themeShown = th; FM.audio.setTheme(th); FM.audio.sfx('theme');
      banner(['🏙️ La grande ville !', '🚀 Direction l\'espace !', '🏰 Le royaume du château !'][th]);
    } else {
      const m = Math.floor(G.dist / 500);
      if (m > G.milestone && m > 0 && G.dist < m * 500 + 30) { G.milestone = m; banner(m * 500 + ' mètres !'); FM.audio.speak(m === 1 ? 'Bravo !' : 'Super !', G.charKey); }
    }
    const score = Math.floor(G.dist) + G.coinsRun * 10;
    if (!G.recordShown && save.best >= RECORD_MIN && score > save.best) {
      G.recordShown = true; banner('⭐ Record battu ! ⭐'); FM.audio.sfx('record');
      const c = ['#ff5a5a', '#ffe14a', '#5be85b', '#4db8ff', '#ff5fd6'];
      for (let i = 0; i < 40; i++) G.particles.push({ x: rnd(200, 1080), y: -10, vx: rnd(-60, 60), vy: rnd(50, 200), life: 1.6, max: 1.6, size: rnd(4, 8), color: pick(c), kind: 'conf', rot: rnd(0, 6) });
    }
    updateHud();
  }

  G.step = update; G.act = act; G.startGame = startGame;

  // ---------- HUD ----------
  let hudCache = {};
  function updateHud(force) {
    const score = Math.floor(G.dist) + G.coinsRun * 10;
    if (force || hudCache.s !== score) { $('#hud-score').textContent = score; hudCache.s = score; }
    if (force || hudCache.c !== G.coinsRun) { $('#hud-coins').textContent = G.coinsRun; hudCache.c = G.coinsRun; }
    const maxes = { magnet: 8, shield: 20, jump: 8, slow: 6 };
    let html = '';
    for (const k in G.powers) {
      if (G.powers[k] > 0) html += '<div class="pchip"><span>' + FM.POWER[k][0] + '</span><i style="width:' + Math.round(G.powers[k] / maxes[k] * 100) + '%;background:' + FM.POWER[k][1] + '"></i></div>';
    }
    if (html !== hudCache.p) { $('#hud-power').innerHTML = html; hudCache.p = html; }
  }

  function showOver() {
    G.mode = 'over';
    const dist = Math.floor(G.dist), score = dist + G.coinsRun * 10;
    const rec = score > save.best;
    if (rec) save.best = score;
    save.runs++;
    FM.persist();
    $('#over-title').textContent = pick(['Aïe !', 'Oups !', 'Dommage !', 'Presque !']);
    $('#over-dist').textContent = dist + ' m';
    $('#over-coins').textContent = G.coinsRun + ' 🪙';
    $('#over-score').textContent = score;
    $('#over-best').textContent = save.best;
    const bigRec = rec && score >= RECORD_MIN;
    $('#over-record').classList.toggle('hidden', !bigRec);
    if (bigRec) {
      FM.audio.sfx('record'); FM.audio.speak('Nouveau record !', G.charKey);
      const c = ['#ff5a5a', '#ffe14a', '#5be85b', '#4db8ff', '#ff5fd6'];
      for (let i = 0; i < 60; i++) G.particles.push({ x: rnd(100, 1180), y: rnd(-100, 0), vx: rnd(-60, 60), vy: rnd(50, 200), life: 2.4, max: 2.4, size: rnd(4, 9), color: pick(c), kind: 'conf', rot: rnd(0, 6) });
    }
    refreshCoins();
    showScreen('over');
  }

  // ---------- vestiaire (héros + véhicules) ----------
  let wardrobeTab = 'hero';
  let viewKey = save.selected, viewOutfit = 0, viewVehicle = save.selectedVehicle || 'none', pendingBuy = null;
  const thumbCache = new Map(), thumbQueue = [];
  let thumbBusy = false;
  const fmt = (n) => n.toLocaleString('fr-FR');
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function setPending(key) { pendingBuy = key; clearTimeout(setPending.h); if (key) setPending.h = setTimeout(() => { pendingBuy = null; if (G.mode === 'wardrobe') renderDetail(); }, 3500); }
  const charOf = (key) => FM.CHARS.find((c) => c.key === key) || FM.CHARS[0];
  const vehicleList = () => [{ key: 'none', name: 'À pied', desc: "Cours sur tes deux jambes, comme d'habitude !", cost: 0 }].concat(FM.VEHICLES);
  const vehicleOf = (key) => vehicleList().find((v) => v.key === key) || vehicleList()[0];
  const vehicleUnlocked = (key) => key === 'none' || !!save.vehicleUnlocked[key];

  // vignettes : dessinées une seule fois puis mises en mémoire (héros ou véhicule, même mécanique)
  function makeThumbGeneric(draw) {
    const big = document.createElement('canvas'); big.width = 320; big.height = 320;
    const bc = big.getContext('2d', { willReadFrequently: true });
    draw(bc);
    const px = bc.getImageData(0, 0, 320, 320).data;
    let x0 = 320, x1 = 0, y0 = 320, y1 = 0;
    for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) if (px[(y * 320 + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const out = document.createElement('canvas'); out.width = 240; out.height = 240;
    if (x1 > x0 && y1 > y0) {
      const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(228 / w, 228 / h, 1.5);
      const dw = w * k, dh = h * k;
      out.getContext('2d').drawImage(big, x0, y0, w, h, (240 - dw) / 2, 236 - dh, dw, dh);
    }
    return out.toDataURL('image/png');
  }
  function thumbInto(img, id, draw) {
    if (thumbCache.has(id)) { img.src = thumbCache.get(id); return; }
    thumbQueue.push({ img, id, draw });
    if (!thumbBusy) pumpThumbs();
  }
  function pumpThumbs() {
    thumbBusy = true;
    let n = 0;
    while (thumbQueue.length && n < 3) {
      const t = thumbQueue.shift();
      if (!thumbCache.has(t.id)) thumbCache.set(t.id, makeThumbGeneric(t.draw));
      t.img.src = thumbCache.get(t.id); n++;
    }
    if (thumbQueue.length) setTimeout(pumpThumbs, 16); else thumbBusy = false;
  }
  const charThumb = (key, outfit) => (bc) => FM.drawChar(bc, key, outfit, { x: 160, y: 300, size: 260, pose: 'idle', view: 'front', t: 0.4, instant: true });
  const vehicleThumb = (key) => (bc) => { if (key === 'none') FM.drawChar(bc, save.selected, save.equipped[save.selected] || 0, { x: 160, y: 300, size: 260, pose: 'idle', view: 'front', t: 0.4, instant: true }); else FM.drawVehicle(bc, key, { x: 160, y: 300, size: 190, view: 'front', t: 0.4 }); };

  function buyChar(ch) {
    if (pendingBuy !== 'c:' + ch.key) { setPending('c:' + ch.key); FM.audio.sfx('click'); renderDetail(); return; }
    if (save.coins < ch.cost) { FM.audio.sfx('nope'); toast('Il te manque ' + fmt(ch.cost - save.coins) + ' pièces 🪙 — continue à courir !'); setPending(null); renderDetail(); return; }
    save.coins -= ch.cost; save.unlocked[ch.key] = true; save.selected = ch.key; viewKey = ch.key; viewOutfit = save.equipped[ch.key] || 0;
    G.charKey = ch.key; G.outfit = viewOutfit;
    FM.persist(); FM.audio.sfx('unlock'); toast('🎉 ' + ch.name + ' est débloqué !'); setPending(null);
    refreshCoins(); buildWardrobe();
  }
  function buyOutfit(ch, i) {
    const of = ch.outfits[i], id = 'o:' + ch.key + i;
    viewOutfit = i;
    if (pendingBuy !== id) { setPending(id); FM.audio.sfx('click'); renderDetail(); return; }
    if (save.coins < of.cost) { FM.audio.sfx('nope'); toast('Il te manque ' + fmt(of.cost - save.coins) + ' pièces 🪙'); setPending(null); renderDetail(); return; }
    save.coins -= of.cost; save.owned[ch.key][i] = true; save.equipped[ch.key] = i;
    if (save.selected === ch.key) G.outfit = i;
    FM.persist(); FM.audio.sfx('buy'); toast('👕 Nouvelle tenue : ' + of.name + ' !'); setPending(null);
    refreshCoins(); buildWardrobe();
  }
  function selectChar(ch) {
    viewKey = ch.key; viewOutfit = save.equipped[ch.key] || 0; setPending(null);
    if (save.unlocked[ch.key]) { save.selected = ch.key; FM.persist(); G.charKey = ch.key; G.outfit = viewOutfit; }
    buildWardrobe();
  }
  function buyVehicle(v) {
    if (pendingBuy !== 'v:' + v.key) { setPending('v:' + v.key); FM.audio.sfx('click'); renderDetail(); return; }
    if (save.coins < v.cost) { FM.audio.sfx('nope'); toast('Il te manque ' + fmt(v.cost - save.coins) + ' pièces 🪙 — continue à courir !'); setPending(null); renderDetail(); return; }
    save.coins -= v.cost; save.vehicleUnlocked[v.key] = true; save.selectedVehicle = v.key; viewVehicle = v.key; G.vehicle = v.key;
    FM.persist(); FM.audio.sfx('unlock'); toast('🎉 ' + v.name + ' est débloqué !'); setPending(null);
    refreshCoins(); buildWardrobe();
  }
  function selectVehicle(v) {
    viewVehicle = v.key; setPending(null);
    if (vehicleUnlocked(v.key)) { save.selectedVehicle = v.key; FM.persist(); G.vehicle = v.key; }
    buildWardrobe();
  }

  function switchTab(tab) {
    if (wardrobeTab === tab) return;
    wardrobeTab = tab; setPending(null); FM.audio.sfx('click'); buildWardrobe();
    scrollCarouselToViewing();
  }
  function scrollCarouselToViewing() {
    const list = wardrobeTab === 'hero' ? FM.CHARS : vehicleList();
    const key = wardrobeTab === 'hero' ? viewKey : viewVehicle;
    const i = list.findIndex((x) => x.key === key), card = $('#cards').children[i];
    if (card) { const cards = $('#cards'); cards.style.scrollBehavior = 'auto'; cards.scrollLeft = Math.max(0, card.offsetLeft - cards.clientWidth / 2 + 79); cards.style.scrollBehavior = ''; }
  }

  function buildWardrobe() {
    $('#tab-hero').classList.toggle('active', wardrobeTab === 'hero');
    $('#tab-vehicle').classList.toggle('active', wardrobeTab === 'vehicle');
    $('#outfit-col').classList.toggle('hidden', wardrobeTab !== 'hero');
    if (wardrobeTab === 'hero') buildHeroCards(); else buildVehicleCards();
  }

  function buildHeroCards() {
    const cards = $('#cards');
    const keep = cards.scrollLeft;
    cards.innerHTML = '';
    let n = 0;
    FM.CHARS.forEach((ch) => {
      const unlocked = save.unlocked[ch.key]; if (unlocked) n++;
      const card = el('div', 'card' + (save.selected === ch.key ? ' selected' : '') + (unlocked ? '' : ' locked') + (viewKey === ch.key ? ' viewing' : ''));
      const img = document.createElement('img'); img.alt = ch.name; thumbInto(img, ch.key + ':' + (save.equipped[ch.key] || 0), charThumb(ch.key, save.equipped[ch.key] || 0));
      card.appendChild(img);
      card.appendChild(el('div', 'cname', ch.name));
      if (!unlocked) { card.appendChild(el('div', 'lock', '🔒')); card.appendChild(el('div', 'tag', '🪙 ' + fmt(ch.cost))); }
      else if (save.selected === ch.key) card.appendChild(el('div', 'tag ok', '✔ Choisi'));
      card.onclick = () => { FM.audio.sfx('click'); selectChar(ch); };
      cards.appendChild(card);
    });
    cards.style.scrollBehavior = 'auto'; cards.scrollLeft = keep; cards.style.scrollBehavior = '';
    $('#unlock-count').textContent = n + ' / ' + FM.CHARS.length + ' héros débloqués';
    renderDetail();
  }

  function buildVehicleCards() {
    const cards = $('#cards');
    const keep = cards.scrollLeft;
    cards.innerHTML = '';
    let n = 0;
    vehicleList().forEach((v) => {
      const unlocked = vehicleUnlocked(v.key); if (unlocked && v.key !== 'none') n++;
      const card = el('div', 'card' + (save.selectedVehicle === v.key ? ' selected' : '') + (unlocked ? '' : ' locked') + (viewVehicle === v.key ? ' viewing' : ''));
      const img = document.createElement('img'); img.alt = v.name; thumbInto(img, 'v:' + v.key, vehicleThumb(v.key));
      card.appendChild(img);
      card.appendChild(el('div', 'cname', v.name));
      if (!unlocked) { card.appendChild(el('div', 'lock', '🔒')); card.appendChild(el('div', 'tag', '🪙 ' + fmt(v.cost))); }
      else if (save.selectedVehicle === v.key) card.appendChild(el('div', 'tag ok', '✔ Choisi'));
      card.onclick = () => { FM.audio.sfx('click'); selectVehicle(v); };
      cards.appendChild(card);
    });
    cards.style.scrollBehavior = 'auto'; cards.scrollLeft = keep; cards.style.scrollBehavior = '';
    $('#unlock-count').textContent = n + ' / ' + FM.VEHICLES.length + ' véhicules débloqués';
    renderDetail();
  }

  function renderDetail() { if (wardrobeTab === 'hero') renderHeroDetail(); else renderVehicleDetail(); }

  function renderHeroDetail() {
    const ch = charOf(viewKey), unl = save.unlocked[ch.key];
    $('#info-name').textContent = ch.name; $('#info-desc').textContent = ch.desc;
    $('#big-lock').classList.toggle('hidden', unl);
    const act = $('#info-action'); act.innerHTML = '';
    if (!unl) {
      const conf = pendingBuy === 'c:' + ch.key;
      const b = el('button', 'btn ' + (conf ? 'red' : 'green'), conf ? 'Sûr ? Clique encore !' : '🔓 Débloquer 🪙 ' + fmt(ch.cost));
      b.onclick = () => buyChar(ch); act.appendChild(b);
    } else if (save.selected === ch.key) act.appendChild(el('div', 'hud-box', '✔ Héros choisi'));
    else { const b = el('button', 'btn blue', '✔ Choisir ce héros'); b.onclick = () => { FM.audio.sfx('click'); selectChar(ch); }; act.appendChild(b); }

    $('#outfit-title').textContent = 'Tenues de ' + ch.name;
    const outs = $('#outfits'); outs.innerHTML = '';
    ch.outfits.forEach((of, i) => {
      const owned = save.owned[ch.key][i], worn = save.equipped[ch.key] === i;
      const box = el('div', 'outfit' + (worn && unl ? ' selected' : '') + (owned && unl ? '' : ' locked') + (viewOutfit === i ? ' viewing' : ''));
      const img = document.createElement('img'); img.alt = of.name; thumbInto(img, ch.key + ':' + i, charThumb(ch.key, i)); box.appendChild(img);
      box.appendChild(el('div', 'oname', of.name));
      let tag;
      if (!unl) tag = '<span>🔒</span>';
      else if (worn) tag = '<span class="ok">✔ Porté</span>';
      else if (owned) tag = '<span class="ok">Choisir</span>';
      else if (pendingBuy === 'o:' + ch.key + i) tag = '<span class="confirm">Sûr ? Clique !</span>';
      else tag = '<span>🪙 ' + fmt(of.cost) + '</span>';
      box.appendChild(el('div', 'oprice', tag));
      box.onclick = () => {
        viewOutfit = i;
        if (!unl) { FM.audio.sfx('nope'); toast("Débloque d'abord " + ch.name + ' !'); renderDetail(); return; }
        if (owned) { save.equipped[ch.key] = i; FM.persist(); FM.audio.sfx('click'); if (save.selected === ch.key) G.outfit = i; setPending(null); buildWardrobe(); }
        else buyOutfit(ch, i);
      };
      outs.appendChild(box);
    });
  }

  function renderVehicleDetail() {
    const v = vehicleOf(viewVehicle), unl = vehicleUnlocked(v.key);
    $('#info-name').textContent = v.name; $('#info-desc').textContent = v.desc;
    $('#big-lock').classList.toggle('hidden', unl);
    const act = $('#info-action'); act.innerHTML = '';
    if (!unl) {
      const conf = pendingBuy === 'v:' + v.key;
      const b = el('button', 'btn ' + (conf ? 'red' : 'green'), conf ? 'Sûr ? Clique encore !' : '🔓 Débloquer 🪙 ' + fmt(v.cost));
      b.onclick = () => buyVehicle(v); act.appendChild(b);
    } else if (save.selectedVehicle === v.key) act.appendChild(el('div', 'hud-box', '✔ Véhicule choisi'));
    else { const b = el('button', 'btn blue', '✔ Choisir ce véhicule'); b.onclick = () => { FM.audio.sfx('click'); selectVehicle(v); }; act.appendChild(b); }
  }

  // grand aperçu animé (héros ou véhicule observé)
  function drawBig(t) {
    const cv = $('#big'), c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 290, 340);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(145, 318, 78, 15, 0, 0, Math.PI * 2); c.fill();
    if (wardrobeTab === 'hero') FM.drawChar(c, viewKey, viewOutfit, { x: 145, y: 318, size: 252, pose: 'idle', view: 'front', t });
    else if (viewVehicle === 'none') FM.drawChar(c, save.selected, save.equipped[save.selected] || 0, { x: 145, y: 318, size: 252, pose: 'idle', view: 'front', t });
    else FM.drawVehicle(c, viewVehicle, { x: 145, y: 318, size: 190, view: 'front', t });
  }

  function drawMenuHero(t) {
    const cv = $('#menu-hero'), c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 300, 360);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(150, 338, 80, 15, 0, 0, Math.PI * 2); c.fill();
    if (save.selectedVehicle && save.selectedVehicle !== 'none') FM.drawVehicle(c, save.selectedVehicle, { x: 150, y: 336, size: 220, view: 'front', t });
    else FM.drawChar(c, save.selected, save.equipped[save.selected] || 0, { x: 150, y: 336, size: 260, pose: 'idle', view: 'front', t });
  }

  function stepView(d) {
    if (wardrobeTab === 'hero') {
      const i = Math.max(0, Math.min(FM.CHARS.length - 1, FM.CHARS.findIndex((c) => c.key === viewKey) + d));
      FM.audio.sfx('click'); selectChar(FM.CHARS[i]);
    } else {
      const list = vehicleList(), i = Math.max(0, Math.min(list.length - 1, list.findIndex((v) => v.key === viewVehicle) + d));
      FM.audio.sfx('click'); selectVehicle(list[i]);
    }
    scrollCarouselToViewing();
  }

  function openWardrobe() {
    G.mode = 'wardrobe'; wardrobeTab = 'hero'; viewKey = save.selected; viewOutfit = save.equipped[viewKey] || 0; viewVehicle = save.selectedVehicle || 'none'; setPending(null);
    showScreen('wardrobe'); buildWardrobe(); refreshCoins();
    scrollCarouselToViewing();
  }

  // ---------- boutons ----------
  function click(id, fn) { $(id).addEventListener('click', (e) => { FM.audio.unlock(); FM.audio.sfx('click'); e.currentTarget.blur(); fn(e); }); }
  click('#btn-play', startGame);
  click('#btn-wardrobe', openWardrobe);
  click('#btn-wback', goMenu);
  $('#tab-hero').onclick = () => switchTab('hero');
  $('#tab-vehicle').onclick = () => switchTab('vehicle');
  click('#btn-wplay', startGame);
  click('#btn-pause', pauseGame);
  click('#btn-resume', resumeGame);
  click('#btn-pmenu', goMenu);
  click('#btn-again', startGame);
  click('#btn-omenu', goMenu);
  click('#btn-owardrobe', openWardrobe);
  $('#car-prev').onclick = () => { FM.audio.sfx('click'); $('#cards').scrollBy({ left: -510 }); };
  $('#car-next').onclick = () => { FM.audio.sfx('click'); $('#cards').scrollBy({ left: 510 }); };

  // ----- remise à zéro (avec confirmation) -----
  const confirmOpen = () => !$('#screen-confirm').classList.contains('hidden');
  click('#btn-reset', () => { $('#screen-confirm').classList.remove('hidden'); });
  click('#btn-keep', () => { $('#screen-confirm').classList.add('hidden'); });
  click('#btn-wipe', () => {
    $('#screen-confirm').classList.add('hidden');
    FM.resetSave();
    viewKey = save.selected; viewOutfit = 0; viewVehicle = 'none'; wardrobeTab = 'hero'; pendingBuy = null; coinsBanked = true;
    FM.audio.applySettings(); if (save.music) FM.audio.startMusic(G.themeShown);
    resetMenuWorld(); refreshCoins(); refreshSound(); refreshMenuTag(); $('#menu-best').textContent = save.best;
    toast('Tout est effacé : on repart de zéro !');
  });
  function toggleMusic() { save.music = !save.music; FM.persist(); FM.audio.applySettings(); if (save.music) FM.audio.startMusic(G.themeShown); refreshSound(); }
  function toggleSfx() { save.sfx = !save.sfx; FM.persist(); FM.audio.applySettings(); refreshSound(); FM.audio.sfx('click'); }
  $('#btn-music').onclick = $('#btn-music2').onclick = () => { FM.audio.unlock(); toggleMusic(); };
  $('#btn-sfx').onclick = $('#btn-sfx2').onclick = () => { FM.audio.unlock(); toggleSfx(); };
  function toggleFull() {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
  }
  $('#btn-full').onclick = toggleFull;

  function pauseGame() {
    if (G.mode !== 'play' || G.dead) return;
    G.mode = 'paused'; refreshSound(); $('#screen-pause').classList.remove('hidden');
  }
  function resumeGame() {
    if (G.mode !== 'paused') return;
    G.mode = 'play'; $('#screen-pause').classList.add('hidden');
  }

  // ---------- clavier / tactile ----------
  const KEYS = {
    ArrowLeft: 'left', a: 'left', q: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'up', w: 'up', z: 'up', ' ': 'up', ArrowDown: 'down', s: 'down'
  };
  addEventListener('keydown', (e) => {
    FM.audio.unlock();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (confirmOpen()) { if (k === 'Escape') $('#screen-confirm').classList.add('hidden'); return; }
    if (G.mode === 'wardrobe' && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); stepView(k === 'ArrowLeft' ? -1 : 1); return; }
    if (KEYS[k]) { if (G.mode === 'play') e.preventDefault(); if (!e.repeat) act(KEYS[k]); return; }
    if (k === 'Escape' || k === 'p') { if (G.mode === 'play') pauseGame(); else if (G.mode === 'paused') resumeGame(); return; }
    if (k === 'f' || k === 'F11') { e.preventDefault(); toggleFull(); return; }
    if (k === 'm') { toggleMusic(); return; }
    if (k === 'Enter') {
      if (document.activeElement && document.activeElement !== document.body) return;
      if (G.mode === 'menu' || G.mode === 'over' || G.mode === 'wardrobe') startGame();
      else if (G.mode === 'paused') resumeGame();
    }
  });

  // ---------- manette de jeu ----------
  const padPrev = { left: false, right: false, up: false, down: false, start: false };
  function padEdge(now, key) { const was = padPrev[key]; padPrev[key] = now; return now && !was; }
  addEventListener('gamepadconnected', (e) => {
    $('#pad-badge').classList.remove('hidden');
    toast('🎮 Manette connectée : ' + (e.gamepad.id || 'manette').split('(')[0].trim());
  });
  addEventListener('gamepaddisconnected', () => { $('#pad-badge').classList.add('hidden'); });
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p) { gp = p; break; }
    if (!gp) return;
    $('#pad-badge').classList.remove('hidden');
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const B = gp.buttons;
    const left = ax < -0.5 || (B[14] && B[14].pressed);
    const right = ax > 0.5 || (B[15] && B[15].pressed);
    const up = ay < -0.5 || (B[12] && B[12].pressed) || (B[0] && B[0].pressed);
    const down = ay > 0.5 || (B[13] && B[13].pressed) || (B[1] && B[1].pressed);
    const start = (B[9] && B[9].pressed) || (B[8] && B[8].pressed);
    const eLeft = padEdge(left, 'left'), eRight = padEdge(right, 'right'), eUp = padEdge(up, 'up'), eDown = padEdge(down, 'down'), eStart = padEdge(start, 'start');
    if (!eLeft && !eRight && !eUp && !eDown && !eStart) return;
    FM.audio.unlock();
    if (confirmOpen()) return;
    if (G.mode === 'play') {
      if (eLeft) act('left'); if (eRight) act('right'); if (eUp) act('up'); if (eDown) act('down');
      if (eStart) pauseGame();
    } else if (G.mode === 'paused') { if (eStart || eUp) resumeGame(); }
    else if (G.mode === 'wardrobe') { if (eLeft) stepView(-1); if (eRight) stepView(1); if (eUp) startGame(); if (eDown) goMenu(); }
    else if (G.mode === 'menu' || G.mode === 'over') { if (eUp) startGame(); }
  }

  // ---------- installation (PWA Android / navigateur) ----------
  let deferredInstall = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#btn-install').classList.remove('hidden'); });
  click('#btn-install', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt(); await deferredInstall.userChoice;
    deferredInstall = null; $('#btn-install').classList.add('hidden');
  });
  addEventListener('appinstalled', () => { $('#btn-install').classList.add('hidden'); toast('🎉 Fivemax est installé !'); });

  let sw = null;
  canvas.addEventListener('pointerdown', (e) => {
    FM.audio.unlock();
    sw = { x: e.clientX, y: e.clientY, done: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!sw || sw.done || G.mode !== 'play') return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, th = 26;
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    sw.done = true;
    if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? 'left' : 'right'); else act(dy < 0 ? 'up' : 'down');
  });
  const endSwipe = () => { sw = null; };
  canvas.addEventListener('pointerup', endSwipe);
  canvas.addEventListener('pointercancel', endSwipe);

  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  addEventListener('blur', pauseGame);

  // ---------- boucle principale ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try {
      update(dt);
      if (FM.world3d) FM.world3d.render(G, pxScale);
      FM.renderFX(fctx, G, pxScale);
      if (G.mode === 'wardrobe') drawBig(G.time);
      else if (G.mode === 'menu') drawMenuHero(G.time);
    } catch (err) { // une erreur ne doit jamais figer le jeu
      FM.frameErrors = (FM.frameErrors || 0) + 1;
      if (FM.frameErrors < 5) console.error('frame', err);
    }
    requestAnimationFrame(frame);
  }

  // ---------- démarrage ----------
  G.charKey = save.selected; G.outfit = save.equipped[save.selected] || 0;
  $('#menu-best').textContent = save.best;
  refreshCoins(); refreshSound(); refreshMenuTag(); showScreen('menu');
  requestAnimationFrame(frame);
})();
