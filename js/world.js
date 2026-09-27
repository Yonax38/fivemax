// Effets 2D dessinés par-dessus le monde 3D (particules, ombres au sol, vignette).
// Le décor, les obstacles et le personnage sont maintenant rendus en vraie 3D par js/game3d.js (world3d).
(function () {
  const W = 1280, H = 720;
  const TAU = Math.PI * 2;
  let c = null;

  FM.K = FM.K || { PZ: 6.2, ZFAR: 92 }; // repli si le module 3D n'a pas encore tourné

  // pastilles de bonus affichées dans le HUD (emoji + couleur) — utilisé par game.js
  FM.POWER = { magnet: ['🧲', '#ff5a5a'], shield: ['🛡️', '#4db8ff'], jump: ['🦘', '#5be85b'], slow: ['⏱️', '#ffd23f'] };

  // point d'écran pour une position du jeu (voie x, hauteur y, distance devant la caméra)
  FM.project = function (x, y, zAhead) {
    if (FM.world3d && FM.world3d.ready) return FM.world3d.project(x, y, zAhead);
    return [W / 2 + x * 40, H / 2 - y * 40];
  };

  function drawShadow(x, zAhead, scale, alpha) {
    const p = FM.project(x, 0, zAhead);
    c.globalAlpha = alpha;
    c.fillStyle = 'rgba(0,0,0,.32)';
    c.beginPath(); c.ellipse(p[0], p[1] + 3, 30 * scale, 9 * scale, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }

  // ---------- particules ----------
  function drawParticles(G) {
    for (const p of G.particles) {
      const k = Math.max(0, Math.min(1, p.life / p.max));
      c.globalAlpha = k;
      c.fillStyle = p.color;
      if (p.kind === 'star') {
        c.font = Math.round(p.size * 3) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('✦', p.x, p.y);
      } else if (p.kind === 'conf') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); c.restore();
      } else { c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  let vign = null;
  function vignette() {
    if (!vign) {
      vign = document.createElement('canvas'); vign.width = 320; vign.height = 180;
      const v = vign.getContext('2d');
      const g = v.createRadialGradient(160, 90, 60, 160, 90, 200);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,20,.45)');
      v.fillStyle = g; v.fillRect(0, 0, 320, 180);
    }
    c.drawImage(vign, 0, 0, W, H);
  }

  // ---------- rendu des effets (appelé après le rendu 3D, sur le canvas transparent #fx) ----------
  FM.renderFX = function (ctx, G, scale) {
    c = ctx;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!G.falling) {
      const pl = G.player, sh = Math.max(0.35, 1 - pl.y * 0.12);
      drawShadow(pl.x, FM.K.PZ, sh, 1);
    }
    // (les obstacles n'ont plus d'ombre 2D : leur propre géométrie 3D et l'éclairage suffisent à les ancrer au sol)
    drawParticles(G);
    vignette();
  };
})();
