// Dessin des personnages (tout est dessiné en code, coordonnées : pieds en (0,0), le haut est négatif)
(function () {
  const TAU = Math.PI * 2;
  const OUT = '#2b1a2e';

  function circ(c, x, y, r, fill, out) {
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill();
    if (out) { c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); }
  }
  function ell(c, x, y, rx, ry, fill, out, rot) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); c.fillStyle = fill; c.fill();
    if (out) { c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); }
  }
  function rr(c, x, y, w, h, r, fill, out) {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
    if (out) { c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); }
  }
  function poly(c, pts, fill, out) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fillStyle = fill; c.fill();
    if (out) { c.lineWidth = 2.5; c.lineJoin = 'round'; c.strokeStyle = OUT; c.stroke(); }
  }
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w + 5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = col; c.stroke();
  }
  function seg(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = col; c.stroke();
  }
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- posture ----------
  function computeRig(pose, t, o) {
    const r = { hipY: 46, torsoH: 36, bob: 0, legs: [{ dx: 0, lift: 0 }, { dx: 0, lift: 0 }], arms: [{ ax: 0, ay: 0 }, { ax: 0, ay: 0 }], crouch: 0 };
    const ph = t * 12, s = Math.sin(ph);
    if (pose === 'run') {
      r.legs[0].lift = Math.max(0, s) * 16; r.legs[1].lift = Math.max(0, -s) * 16;
      r.bob = -Math.abs(Math.cos(ph)) * 3.5;
      r.arms[0].ay = -s * 11; r.arms[1].ay = s * 11;
    } else if (pose === 'jump') {
      r.legs[0].lift = 24; r.legs[1].lift = 10; r.legs[0].dx = -3; r.legs[1].dx = 3;
      r.arms[0] = { ax: 6, ay: -52 }; r.arms[1] = { ax: -6, ay: -52 };
    } else if (pose === 'slide') {
      r.hipY = 17; r.torsoH = 30; r.crouch = 1;
      r.legs[0].dx = -8; r.legs[1].dx = 8;
      r.arms[0] = { ax: 8, ay: -10 }; r.arms[1] = { ax: -8, ay: -10 };
    } else if (pose === 'dead') {
      r.legs[0].lift = 14; r.legs[1].lift = 5; r.legs[0].dx = -6; r.legs[1].dx = 6;
      r.arms[0] = { ax: 12, ay: -40 + Math.sin(ph) * 8 }; r.arms[1] = { ax: -12, ay: -40 - Math.sin(ph) * 8 };
    } else { // idle / happy (vue de face)
      r.bob = Math.sin(t * 3.2) * 2.2;
      r.arms[0].ay = Math.sin(t * 3.2) * 3;
      r.arms[1] = { ax: -4, ay: -46 + Math.sin(t * 6) * 8 }; // petit coucou
    }
    return r;
  }

  // ---------- les 3 personnages ----------
  const SPECS = {};

  // ===== LÉO, le petit garçon pauvre =====
  SPECS.boy = function (v) {
    const sp = {
      skin: '#f3c39c', shirt: '#c9b48a', pants: '#7a6350', shoe: '#5c4a3b', sleeve: '#c9b48a',
      pantsLen: 0.55, headScale: 1, longSleeve: false, hair: '#5b3a1e'
    };
    if (v === 1) { sp.shirt = '#ffd23f'; sp.sleeve = '#ffd23f'; sp.pants = '#2f6bd8'; sp.pantsLen = 0.62; sp.shoe = '#f4f4f4'; }
    if (v === 2) { sp.shirt = '#4b78d1'; sp.sleeve = '#4b78d1'; sp.pants = '#9aa3b0'; sp.pantsLen = 1; sp.shoe = '#6b4527'; sp.longSleeve = true; }

    sp.behind = function (c, view, r) {
      if (v === 2 && view === 'front') { // cape vue de face
        poly(c, [-20, -(r.hipY + r.torsoH - 4), 20, -(r.hipY + r.torsoH - 4), 30, -(r.hipY - 4), -30, -(r.hipY - 4)], '#d8323c', true);
      }
    };
    sp.overTorso = function (c, view, r, t) {
      const top = -(r.hipY + r.torsoH), bot = -r.hipY;
      if (v === 0) {
        // patchs et déchirures
        rr(c, view === 'back' ? -12 : 2, top + 8, 13, 13, 2, '#6d8fb5', false);
        c.setLineDash([3, 3]); c.lineWidth = 1.5; c.strokeStyle = '#4a3a2a'; c.strokeRect(view === 'back' ? -12 : 2, top + 8, 13, 13); c.setLineDash([]);
        rr(c, view === 'back' ? 3 : -13, top + 21, 10, 10, 2, '#b5645a', false);
        // bas de chemise déchiré
        c.beginPath(); c.moveTo(-17, bot - 5);
        for (let i = 0; i <= 6; i++) c.lineTo(-17 + i * 5.7, bot + (i % 2 ? 4 : -2));
        c.lineTo(17, bot - 5); c.closePath(); c.fillStyle = sp.shirt; c.fill();
        // bretelle
        seg(c, -8, top, -8, bot, 4, '#8a5a3a');
      } else if (v === 1) {
        if (view === 'back') {
          c.font = '900 26px "Arial Black", Arial'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = '#1b3a8a'; c.lineWidth = 4;
          c.strokeText('5', 0, top + 28); c.fillText('5', 0, top + 28);
        } else { rr(c, -6, top + 8, 12, 4, 2, '#fff', false); }
        seg(c, -17, top + 3, 17, top + 3, 3, '#fff');
      } else {
        if (view === 'back') {
          // cape rouge dans le dos
          const sw = Math.sin(t * 9) * 3;
          poly(c, [-19, top + 2, 19, top + 2, 27 + sw, bot + 8, -27 + sw, bot + 8], '#d8323c', true);
          seg(c, -19, top + 3, 19, top + 3, 5, '#ffd23f');
        } else {
          c.beginPath(); c.moveTo(0, top + 2); c.lineTo(0, top + 18); c.lineWidth = 3; c.strokeStyle = '#ffd23f'; c.stroke();
          rr(c, -7, top + 8, 14, 14, 3, '#ffd23f', true);
        }
        seg(c, -17, bot - 4, 17, bot - 4, 6, '#6b4527');
      }
    };
    sp.drawHead = function (c, view, R, t) {
      const front = view === 'front';
      circ(c, -R + 1, 2, 5, sp.skin, true); circ(c, R - 1, 2, 5, sp.skin, true); // oreilles
      circ(c, 0, 0, R, sp.skin, true);
      if (v === 0) {
        if (!front) { circ(c, 0, 0, R + 0.5, sp.hair, true); }
        else {
          c.beginPath(); c.arc(0, 0, R + 1, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(R - 2, -6); c.lineTo(-R + 2, -6); c.closePath();
          c.fillStyle = sp.hair; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        }
        // mèches en pagaille
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * (1.08 + i * 0.16), x = Math.cos(a) * R, y = Math.sin(a) * R;
          poly(c, [x - 4, y + 2, x + 4, y + 2, x + Math.cos(a) * 9 + (i % 2 ? 4 : -4), y + Math.sin(a) * 9], sp.hair, true);
        }
      } else if (v === 1) { // casquette bleue
        if (!front) { circ(c, 0, 0, R + 0.5, '#5b3a1e', true); }
        c.beginPath(); c.arc(0, -2, R + 2, Math.PI, TAU); c.closePath(); c.fillStyle = '#2f6bd8'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        circ(c, 0, -R - 1, 3, '#ffd23f', true);
        if (front) rr(c, -R - 4, -5, 2 * R + 8, 7, 3, '#1f4fb0', true);
        else rr(c, -8, 2, 16, 6, 3, '#1f4fb0', true); // sangle arrière
      } else { // casque de chevalier
        if (!front) { circ(c, 0, 0, R + 1.5, '#b9c3cf', true); seg(c, 0, -R, 0, R - 3, 3, '#8f9aa8'); }
        else {
          c.beginPath(); c.arc(0, -1, R + 2.5, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(R + 2, 4); c.lineTo(-R - 2, 4); c.closePath();
          c.fillStyle = '#b9c3cf'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
          seg(c, 0, -R - 1, 0, -2, 4, '#8f9aa8');
        }
        poly(c, [-3, -R - 2, 3, -R - 2, 9, -R - 16, -2, -R - 12], '#d8323c', true); // plumet
      }
      if (front) {
        circ(c, -6.5, 1, 4.2, '#fff', true); circ(c, 6.5, 1, 4.2, '#fff', true);
        circ(c, -6, 1.5, 2.4, '#2b1a2e'); circ(c, 7, 1.5, 2.4, '#2b1a2e');
        circ(c, -5.2, 0.6, 0.9, '#fff'); circ(c, 7.8, 0.6, 0.9, '#fff');
        c.beginPath(); c.arc(0, 6, 7, 0.2, Math.PI - 0.2); c.lineWidth = 2.5; c.strokeStyle = '#8a3a2a'; c.stroke();
        if (v === 0) { // taches de rousseur + saleté
          [[-9, 7], [-6, 9], [9, 7], [6, 9]].forEach((p) => circ(c, p[0], p[1], 1, '#c9855a'));
          ell(c, -11, 10, 4, 2.5, 'rgba(70,50,30,.35)');
        }
      }
    };
    return sp;
  };

  // ===== ZORK, l'extraterrestre =====
  SPECS.alien = function (v) {
    const sp = {
      skin: '#7fe04c', shirt: '#c8d3e0', pants: '#a9b5c4', shoe: '#5d6b7d', sleeve: '#c8d3e0',
      pantsLen: 1, headScale: 1.22, longSleeve: true
    };
    if (v === 1) { sp.shirt = '#f4f6fa'; sp.sleeve = '#f4f6fa'; sp.pants = '#e6e9ef'; sp.shoe = '#ff8a3d'; }
    if (v === 2) { sp.shirt = '#26262f'; sp.sleeve = '#26262f'; sp.pants = '#c0322f'; sp.shoe = '#151515'; }

    sp.behind = function (c, view, r, t) {
      if (view === 'front') {
        if (v === 1) rr(c, -22, -(r.hipY + r.torsoH - 2), 44, r.torsoH - 2, 8, '#dfe4ec', true);
      }
    };
    sp.overTorso = function (c, view, r, t) {
      const top = -(r.hipY + r.torsoH), bot = -r.hipY;
      seg(c, -17, bot - 6, 17, bot - 6, 5, v === 1 ? '#ff8a3d' : v === 2 ? '#8a8a99' : '#3ec6ff');
      if (view === 'back') {
        if (v === 0) { rr(c, -11, top + 6, 22, 24, 6, '#7d8ca0', true); circ(c, 0, top + 18, 6, '#5ff3ff', true); }
        if (v === 1) { rr(c, -15, top + 3, 30, 30, 8, '#cfd6e2', true); circ(c, 0, top + 18, 5, '#ff8a3d', true); seg(c, -15, top + 12, 15, top + 12, 3, '#ff8a3d'); }
        if (v === 2) { for (let i = 0; i < 5; i++) circ(c, -10 + i * 5, top + 8 + (i % 2) * 8, 2.2, '#dfe3ea'); }
      } else {
        if (v === 0) { circ(c, 0, top + 12, 6, '#5ff3ff', true); seg(c, 0, top + 20, 0, bot - 10, 3, '#3ec6ff'); }
        if (v === 1) { rr(c, -10, top + 6, 20, 12, 4, '#ff8a3d', true); }
        if (v === 2) { seg(c, 0, top + 2, 0, bot - 6, 3, '#8a8a99'); circ(c, -9, top + 10, 2.2, '#dfe3ea'); circ(c, 9, top + 10, 2.2, '#dfe3ea'); }
      }
    };
    sp.drawHead = function (c, view, R, t) {
      const front = view === 'front';
      const W = R * 1.02, Hh = R * 1.12;
      // antennes
      const wob = Math.sin(t * 6) * 2;
      [[-1], [1]].forEach((a) => {
        const s = a[0];
        c.beginPath(); c.moveTo(s * 6, -Hh + 2); c.quadraticCurveTo(s * 10, -Hh - 12, s * (16 + wob), -Hh - 20);
        c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
        circ(c, s * (16 + wob), -Hh - 21, 5, s < 0 ? '#ff5fa2' : '#ffe14a', true);
      });
      if (v === 2) { // crête violette
        for (let i = -3; i <= 3; i++) poly(c, [i * 5 - 3, -Hh + 4, i * 5 + 3, -Hh + 4, i * 5, -Hh - 13 + Math.abs(i) * 2], '#b46bff', true);
      }
      ell(c, 0, 0, W, Hh, sp.skin, true);
      if (v === 1) { // bulle d'astronaute
        circ(c, 0, 0, R * 1.42, 'rgba(160,220,255,.22)', false);
        c.beginPath(); c.arc(0, 0, R * 1.42, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke();
        c.beginPath(); c.arc(0, 0, R * 1.28, Math.PI * 1.15, Math.PI * 1.4); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke();
      }
      if (front) {
        ell(c, -8.5, 1, 7, 10, '#12101c', true, 0.5); ell(c, 8.5, 1, 7, 10, '#12101c', true, -0.5);
        circ(c, -10, -3, 2.2, '#fff'); circ(c, 7, -3, 2.2, '#fff');
        circ(c, -1.5, 12, 1, '#3f9c2a'); circ(c, 1.5, 12, 1, '#3f9c2a');
        c.beginPath(); c.arc(0, 13, 6, 0.25, Math.PI - 0.25); c.lineWidth = 2.5; c.strokeStyle = '#2f6d1c'; c.stroke();
        if (v === 2) { rr(c, -19, -6, 38, 11, 4, '#111', true); seg(c, -15, -3, -8, -3, 2, 'rgba(255,255,255,.6)'); }
      } else {
        for (let i = -1; i <= 1; i++) ell(c, i * 8, -Hh + 9, 2.5, 4, '#5cba33');
        seg(c, 0, -2, 0, Hh - 6, 2, 'rgba(0,0,0,.15)');
      }
    };
    return sp;
  };

  // ===== ROSE, la princesse =====
  SPECS.princess = function (v) {
    const sp = {
      skin: '#ffd8b8', shirt: '#ff5fa8', pants: '#ffd8b8', shoe: '#ff7fbe', sleeve: '#ffffff',
      pantsLen: 1, headScale: 1, longSleeve: false, hair: '#f6c945', dress: '#ff7fbe', trim: '#ffffff', hand: '#ffffff'
    };
    if (v === 1) { sp.shirt = '#4d9cf0'; sp.dress = '#6fb8ff'; sp.shoe = '#a06bff'; sp.hair = '#ffb3d9'; }
    if (v === 2) { sp.shirt = '#7a3bc4'; sp.dress = '#8f4fd8'; sp.trim = '#ffd23f'; sp.shoe = '#ffd23f'; sp.hair = '#7a3b1e'; sp.sleeve = '#ffd23f'; sp.hand = '#ffd23f'; }

    sp.behind = function (c, view, r, t) {
      const top = -(r.hipY + r.torsoH);
      if (v === 1) { // ailes de fée
        const fl = Math.sin(t * 14) * 0.12 + (view === 'front' ? 0 : 0);
        c.save(); c.translate(0, top + 16);
        [-1, 1].forEach((s) => {
          c.save(); c.scale(s, 1); c.rotate(-fl);
          ell(c, 30, -14, 22, 12, 'rgba(190,235,255,.85)', true, -0.5);
          ell(c, 27, 8, 16, 9, 'rgba(210,190,255,.85)', true, 0.5);
          c.restore();
        });
        c.restore();
      }
      if (v === 2 && view === 'front') poly(c, [-20, top + 2, 20, top + 2, 34, -r.hipY + 12, -34, -r.hipY + 12], '#c22f4b', true);
    };
    sp.skirt = function (c, r, t) {
      const waist = -(r.hipY + 2), hemY = -Math.max(7, r.hipY - 30), sway = Math.sin(t * 12) * 2;
      const hw = r.crouch ? 34 : 33;
      c.beginPath(); c.moveTo(-15, waist);
      c.lineTo(-hw + sway, hemY);
      for (let i = 0; i <= 6; i++) c.lineTo(-hw + sway + i * (hw * 2 / 6), hemY + (i % 2 ? 4 : 0));
      c.lineTo(15, waist); c.closePath();
      c.fillStyle = sp.dress; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
      // volants
      c.beginPath(); c.moveTo(-hw + sway + 2, hemY - 3);
      for (let i = 0; i <= 6; i++) c.lineTo(-hw + sway + 2 + i * ((hw * 2 - 4) / 6), hemY - 3 + (i % 2 ? 4 : 0));
      c.lineWidth = 4; c.strokeStyle = sp.trim; c.stroke();
      seg(c, -6, waist + 3, -12 + sway * 0.4, hemY - 6, 2, 'rgba(0,0,0,.14)');
      seg(c, 6, waist + 3, 12 + sway * 0.4, hemY - 6, 2, 'rgba(0,0,0,.14)');
    };
    sp.overTorso = function (c, view, r, t) {
      const top = -(r.hipY + r.torsoH), bot = -r.hipY;
      rr(c, -17, bot - 12, 34, 8, 4, sp.trim, false);
      if (view === 'back') {
        // longs cheveux dans le dos
        const sw = Math.sin(t * 10) * 3;
        c.beginPath(); c.moveTo(-19, top + 2);
        c.quadraticCurveTo(-25, top + 22, -20 + sw, bot + 2); c.lineTo(20 + sw, bot + 2);
        c.quadraticCurveTo(25, top + 22, 19, top + 2); c.closePath();
        c.fillStyle = sp.hair; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        for (let i = -1; i <= 1; i++) seg(c, i * 8, top + 8, i * 8 + sw * 0.6, bot - 2, 2, 'rgba(0,0,0,.14)');
        if (v === 2) { poly(c, [-20, top + 3, 20, top + 3, 31 + sw, bot + 6, -31 + sw, bot + 6], '#c22f4b', true); rr(c, -21, top - 1, 42, 9, 5, '#ffffff', true); }
        else rr(c, -6, top + 4, 12, 8, 3, '#ff3d8b', true);
      } else {
        rr(c, -14, top + 2, 28, 12, 6, sp.trim, true);
        circ(c, 0, top + 20, 4, v === 2 ? '#ffd23f' : '#ffe14a', true);
        if (v === 2) rr(c, -22, top - 1, 44, 9, 5, '#ffffff', true);
      }
    };
    sp.drawHead = function (c, view, R, t) {
      const front = view === 'front';
      if (front) {
        // cheveux derrière le visage
        c.beginPath(); c.ellipse(0, 6, R + 5, R + 10, 0, 0, TAU); c.fillStyle = sp.hair; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        circ(c, 0, 0, R, sp.skin, true);
        c.beginPath(); c.arc(0, -1, R + 1.5, Math.PI * 1.03, Math.PI * 1.97); c.quadraticCurveTo(6, -6, -2, -10); c.quadraticCurveTo(-10, -6, -R - 1, -2);
        c.closePath(); c.fillStyle = sp.hair; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
        // yeux
        ell(c, -6.5, 2, 4, 5, '#fff', true); ell(c, 6.5, 2, 4, 5, '#fff', true);
        ell(c, -6.5, 3, 2.6, 3.6, v === 1 ? '#a06bff' : '#2f8cff'); ell(c, 6.5, 3, 2.6, 3.6, v === 1 ? '#a06bff' : '#2f8cff');
        circ(c, -5.6, 1.3, 1, '#fff'); circ(c, 7.4, 1.3, 1, '#fff');
        seg(c, -10, -3, -4, -4.5, 1.8, OUT); seg(c, 10, -3, 4, -4.5, 1.8, OUT);
        ell(c, -10.5, 8.5, 3.5, 2.2, 'rgba(255,90,130,.45)'); ell(c, 10.5, 8.5, 3.5, 2.2, 'rgba(255,90,130,.45)');
        c.beginPath(); c.arc(0, 7, 5, 0.25, Math.PI - 0.25); c.lineWidth = 2.5; c.strokeStyle = '#c23a5a'; c.stroke();
      } else {
        circ(c, 0, 0, R + 1, sp.hair, true);
        for (let i = -1; i <= 1; i++) seg(c, i * 7, -R + 3, i * 8, R - 3, 2, 'rgba(0,0,0,.13)');
      }
      // couronne
      if (v === 0) {
        poly(c, [-11, -R + 3, -11, -R - 8, -5, -R - 2, 0, -R - 11, 5, -R - 2, 11, -R - 8, 11, -R + 3], '#ffd23f', true);
        circ(c, 0, -R - 3, 2.6, '#ff3d5a', true);
      } else if (v === 1) {
        [-9, -3, 3, 9].forEach((x, i) => { circ(c, x, -R + 1 + Math.abs(x) * 0.15, 4.2, i % 2 ? '#fff' : '#ff8fc7', true); });
      } else {
        poly(c, [-13, -R + 3, -14, -R - 12, -7, -R - 4, -3, -R - 15, 0, -R - 5, 3, -R - 15, 7, -R - 4, 14, -R - 12, 13, -R + 3], '#ffd23f', true);
        circ(c, 0, -R - 1, 2.8, '#ff3d5a', true); circ(c, -8, -R - 1, 2, '#3ec6ff', true); circ(c, 8, -R - 1, 2, '#3ec6ff', true);
      }
    };
    return sp;
  };

  // ---------- assemblage ----------
  FM.drawChar2D = function (c, key, outfit, o) {
    const sp = (SPECS[key] || SPECS.boy)(outfit | 0);
    const view = o.view || 'back', pose = o.pose || 'run', t = o.t || 0;
    const r = computeRig(pose, t, o);
    c.save();
    c.translate(o.x, o.y);
    const sc = o.size / 112;
    c.scale(sc, sc);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (pose === 'dead') { c.translate(0, -55); c.rotate(o.rot || 0); c.translate(0, 55); }
    c.translate(0, r.bob);
    c.lineJoin = 'round';

    if (sp.behind) sp.behind(c, view, r, t);

    // jambes
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, L = r.legs[i];
      const hx = s * 9, hy = -r.hipY + 4, fx = s * (9 + L.dx), fy = -L.lift - 5;
      if (sp.pantsLen < 1) {
        limb(c, hx, hy, fx, fy, 12, sp.skin);
        limb(c, hx, hy, lerp(hx, fx, sp.pantsLen), lerp(hy, fy, sp.pantsLen), 13, sp.pants);
      } else limb(c, hx, hy, fx, fy, 13, sp.pants);
      ell(c, fx + s * 1, fy + 5, 9, 5.5, sp.shoe, true);
    }
    if (sp.skirt) sp.skirt(c, r, t);

    // torse
    const top = -(r.hipY + r.torsoH);
    rr(c, -17, top, 34, r.torsoH, 10, sp.shirt, true);
    if (sp.overTorso) sp.overTorso(c, view, r, t);

    // bras
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, A = r.arms[i];
      const sx = s * 19, sy = top + 8;
      const handX = s * 24 + s * A.ax, handY = sy + 28 + A.ay;
      if (sp.longSleeve) limb(c, sx, sy, handX, handY, 9, sp.sleeve);
      else {
        limb(c, sx, sy, handX, handY, 8, sp.skin);
        limb(c, sx, sy, lerp(sx, handX, 0.45), lerp(sy, handY, 0.45), 10, sp.sleeve);
      }
      circ(c, handX, handY + 2, 5.5, sp.hand || sp.skin, true);
    }

    // tête
    const R = 17 * (sp.headScale || 1);
    c.save();
    c.translate(0, top - R * 0.78);
    if (pose === 'slide') c.rotate(0.12);
    sp.drawHead(c, view, R, t);
    c.restore();

    if (pose === 'dead') { // étoiles autour de la tête
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * TAU / 3, sx = Math.cos(a) * 30, sy = top - R * 0.78 - 22 + Math.sin(a) * 6;
        c.beginPath();
        for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? 4 : 9, an = k * Math.PI / 5 - Math.PI / 2; c.lineTo(sx + Math.cos(an) * rr2, sy + Math.sin(an) * rr2); }
        c.closePath(); c.fillStyle = '#ffe14a'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#b8860b'; c.stroke();
      }
    }
    c.restore();
  };

  // Utilise les personnages 3D quand ils sont disponibles, sinon le dessin 2D
  FM.drawChar = function (c, key, outfit, o) {
    if (FM.draw3D && FM.draw3D(c, key, outfit, o)) return;
    FM.drawChar2D(c, key, outfit, o);
  };
})();
