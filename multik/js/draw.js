/*
 * Кисти мультфильма: простые фигуры, персонажи, машина, ёлки, горы, тексты.
 * Всё рисуется на Canvas 1920×1080. Ничего случайного: кадр зависит только от времени,
 * поэтому браузер и видео показывают одно и то же.
 */
(function () {
  'use strict';
  var M = window.M = window.M || {};
  var TAU = Math.PI * 2;
  var OUT = M.OUT = '#2b2735';   // цвет контура
  var LW = M.LW = 5;             // толщина контура

  // ---------- математика и плавность ----------
  M.clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, v)); };
  M.lerp = function (a, b, u) { return a + (b - a) * u; };
  M.prog = function (t, a, b) { return M.clamp((t - a) / (b - a)); };
  M.ease = function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
  M.easeOut = function (u) { return 1 - Math.pow(1 - u, 3); };
  M.easeIn = function (u) { return u * u * u; };
  M.back = function (u) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  M.hash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // «окно» видимости: 0 → 1 → 0 с плавными краями
  M.win = function (t, a, b, fade) { fade = fade || 0.2; return M.clamp(Math.min((t - a) / fade, (b - t) / fade)); };

  // ---------- базовые фигуры ----------
  function shape(ctx, fill, build, lw, stroke) {
    lw = lw === undefined ? LW : lw;
    ctx.beginPath(); build(ctx);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  M.shape = shape;
  M.circle = function (ctx, x, y, r, fill, lw) { shape(ctx, fill, function (c) { c.arc(x, y, Math.max(0.1, r), 0, TAU); }, lw); };
  M.ell = function (ctx, x, y, rx, ry, fill, lw, rot) { shape(ctx, fill, function (c) { c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }, lw); };
  M.rrect = function (ctx, x, y, w, h, r, fill, lw) { shape(ctx, fill, function (c) { c.roundRect(x, y, w, h, r); }, lw); };
  M.poly = function (ctx, pts, fill, lw) {
    shape(ctx, fill, function (c) { c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }, lw);
  };
  // «Колбаска» с контуром — руки, ноги, палки
  M.limb = function (ctx, pts, w, color) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    function build() { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
    build(); ctx.strokeStyle = OUT; ctx.lineWidth = w + LW * 2; ctx.stroke();
    build(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  };
  M.line = function (ctx, x1, y1, x2, y2, color, w) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || OUT; ctx.lineWidth = w || LW; ctx.lineCap = 'round'; ctx.stroke();
  };
  // Перевод/поворот/масштаб на время рисования fn
  M.at = function (ctx, x, y, rot, s, fn) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s && s !== 1) ctx.scale(s, s); fn(); ctx.restore();
  };

  // ---------- персонажи ----------
  // leg — длина ног, torso — туловище, head — радиус головы, w — ширина куртки
  M.CHAR = {
    dad:    { leg: 118, torso: 112, head: 50, w: 92, skin: '#f5c6a5', jacket: '#f28c28', jacket2: '#c8650c', pants: '#34508f', hat: '#2f7fd1', hat2: '#1f5ea3', pom: null, hair: '#6b4426', mitten: '#1f5ea3', boots: '#3a3440' },
    mom:    { leg: 90,  torso: 86,  head: 44, w: 72, skin: '#f8d2b8', jacket: '#ee4d86', jacket2: '#c22d64', pants: '#4b3f7a', hat: '#ffffff', hat2: '#ee4d86', pom: '#ffd23f', hair: '#9a4a24', mitten: '#ffd23f', boots: '#3a3440' },
    nikita: { leg: 70,  torso: 64,  head: 40, w: 60, skin: '#f8cfb0', jacket: '#3fae5a', jacket2: '#2a8443', pants: '#2e4a7a', hat: '#e63946', hat2: '#b8222f', pom: '#ffffff', hair: '#d19a45', mitten: '#e63946', boots: '#3a3440' },
    katya:  { leg: 40,  torso: 46,  head: 35, w: 52, skin: '#fad6bd', jacket: '#9b6bd6', jacket2: '#7447b0', pants: '#9b6bd6', hat: '#ff9ecb', hat2: '#e66aa6', pom: '#ffffff', hair: '#e5ad5c', mitten: '#ffffff', boots: '#e66aa6' }
  };

  // Голова. x,y — центр головы. o: dir, eyes, mouth, look, hat(true/false), t, snowHead, foam
  M.head = function (ctx, kind, x, y, o) {
    o = o || {};
    var C = M.CHAR[kind], r = C.head, dir = o.dir || 1;
    var look = (o.look !== undefined ? o.look : dir * 0.5);
    var hat = o.hat !== false;
    ctx.save(); ctx.translate(x, y);
    if (o.tilt) ctx.rotate(o.tilt);

    // волосы сзади: хвостик мамы, хвостики Кати
    if (kind === 'mom') {
      var sw = Math.sin((o.t || 0) * 6) * 0.15;
      M.at(ctx, -look * r * 0.9, r * 0.05, -look * 0.5 + sw, 1, function () {
        M.ell(ctx, -Math.sign(look || 1) * r * 0.25, r * 0.55, r * 0.32, r * 0.62, C.hair);
      });
    }
    if (kind === 'katya') {
      [-1, 1].forEach(function (sd) {
        var bob = Math.sin((o.t || 0) * 7 + sd) * 0.12;
        M.at(ctx, sd * r * 0.92, r * 0.1, sd * (0.5 + bob), 1, function () {
          M.ell(ctx, 0, r * 0.3, r * 0.26, r * 0.4, C.hair);
          M.circle(ctx, 0, -r * 0.05, r * 0.1, '#ff5d8f', 3);
        });
      });
    }
    // лицо
    M.circle(ctx, 0, 0, r, C.skin);
    // уши, если без шапки
    if (!hat) {
      M.circle(ctx, -r * 0.98, r * 0.08, r * 0.2, C.skin, 4);
      M.circle(ctx, r * 0.98, r * 0.08, r * 0.2, C.skin, 4);
      M.circle(ctx, 0, 0, r - 2.5, C.skin, 0);
    }
    var fx = look * r * 0.22; // смещение черт лица по направлению взгляда
    // щёки
    ctx.globalAlpha = 0.45;
    M.circle(ctx, fx - r * 0.55, r * 0.28, r * 0.17, '#ff8a8a', 0);
    M.circle(ctx, fx + r * 0.55, r * 0.28, r * 0.17, '#ff8a8a', 0);
    ctx.globalAlpha = 1;
    if (kind === 'nikita') { // веснушки
      ctx.fillStyle = '#c47a4a';
      [[-.5, .12], [-.38, .2], [-.58, .24], [.5, .12], [.38, .2], [.58, .24]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(fx + p[0] * r, p[1] * r, r * 0.035, 0, TAU); ctx.fill();
      });
    }
    // глаза
    var eyes = o.eyes || 'open';
    if (eyes === 'open' && o.t !== undefined) {
      var ph = (o.t + (kind.length * 0.71)) % 3.3;
      if (ph < 0.12) eyes = 'closed';
    }
    var ex = r * 0.34, ey = -r * 0.08;
    [-1, 1].forEach(function (sd) {
      var cx = fx + sd * ex, e = eyes;
      if (eyes === 'wink') e = sd > 0 ? 'happy' : 'open';
      if (e === 'open') {
        M.ell(ctx, cx, ey, r * 0.1, r * 0.14, OUT, 0);
        M.circle(ctx, cx + r * 0.035, ey - r * 0.05, r * 0.04, '#fff', 0);
        if (kind === 'mom' || kind === 'katya') { // реснички
          M.line(ctx, cx + sd * r * 0.09, ey - r * 0.1, cx + sd * r * 0.19, ey - r * 0.17, OUT, 3);
        }
      } else if (e === 'happy') {
        ctx.beginPath(); ctx.arc(cx, ey + r * 0.06, r * 0.12, Math.PI * 1.1, Math.PI * 1.9);
        ctx.lineWidth = Math.max(3, r * 0.08); ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
      } else if (e === 'closed') {
        ctx.beginPath(); ctx.arc(cx, ey - r * 0.04, r * 0.11, Math.PI * 0.15, Math.PI * 0.85);
        ctx.lineWidth = Math.max(3, r * 0.07); ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
      } else if (e === 'wide') {
        M.circle(ctx, cx, ey, r * 0.17, '#fff', 3.5);
        M.circle(ctx, cx + look * r * 0.05, ey, r * 0.07, OUT, 0);
      } else if (e === 'dizzy') {
        ctx.beginPath();
        for (var a = 0; a < 14; a++) {
          var ang = a * 0.75 + (o.t || 0) * 12 * sd, rr = r * 0.02 + a * r * 0.011;
          var px = cx + Math.cos(ang) * rr, py = ey + Math.sin(ang) * rr;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
      }
    });
    if (o.brows) { // удивлённые брови
      [-1, 1].forEach(function (sd) {
        ctx.beginPath(); ctx.arc(fx + sd * ex, ey - r * 0.2, r * 0.13, Math.PI * 1.2, Math.PI * 1.8);
        ctx.lineWidth = 3.5; ctx.strokeStyle = OUT; ctx.stroke();
      });
    }
    // нос
    M.ell(ctx, fx + look * r * 0.08, r * 0.13, r * 0.11, r * 0.09, o.redNose ? '#ff6b6b' : shade(C.skin, -18), 3);
    // рот
    var mx = fx + look * r * 0.05, my = r * 0.45, mouth = o.mouth || 'smile';
    if (kind === 'dad') my = r * 0.5;
    ctx.lineCap = 'round';
    if (mouth === 'smile') {
      ctx.beginPath(); ctx.arc(mx, my - r * 0.18, r * 0.22, Math.PI * 0.2, Math.PI * 0.8);
      ctx.lineWidth = Math.max(3, r * 0.07); ctx.strokeStyle = OUT; ctx.stroke();
    } else if (mouth === 'grin' || mouth === 'laugh') {
      var mw = mouth === 'laugh' ? r * 0.3 : r * 0.32, mh = mouth === 'laugh' ? r * 0.32 : r * 0.24;
      var open = mouth === 'laugh' ? 0.8 + 0.2 * Math.sin((o.t || 0) * 30) : 1;
      shape(ctx, '#7a1f2b', function (c) {
        c.moveTo(mx - mw, my - r * 0.08);
        c.quadraticCurveTo(mx, my - r * 0.14, mx + mw, my - r * 0.08);
        c.quadraticCurveTo(mx + mw * 0.9, my + mh * open, mx, my + mh * open);
        c.quadraticCurveTo(mx - mw * 0.9, my + mh * open, mx - mw, my - r * 0.08);
      }, 3.5);
      if (mouth === 'laugh') M.ell(ctx, mx, my + mh * open * 0.62, mw * 0.45, mh * 0.25 * open, '#ff7d8f', 0);
      else M.rrect(ctx, mx - mw * 0.75, my - r * 0.1, mw * 1.5, r * 0.09, 3, '#fff', 0);
    } else if (mouth === 'o') {
      M.ell(ctx, mx, my, r * 0.1, r * 0.13, '#7a1f2b', 3);
    } else if (mouth === 'sip') {
      M.ell(ctx, mx, my - r * 0.02, r * 0.07, r * 0.06, '#7a1f2b', 3);
    }
    // усы у папы
    if (kind === 'dad') {
      [-1, 1].forEach(function (sd) {
        M.ell(ctx, fx + look * r * 0.08 + sd * r * 0.17, r * 0.29, r * 0.2, r * 0.09, C.hair, 3, sd * 0.25);
      });
      if (o.snowHead) {
        ctx.globalAlpha = o.snowHead;
        M.ell(ctx, fx + look * r * 0.08, r * 0.27, r * 0.22, r * 0.07, '#fff', 0);
        ctx.globalAlpha = 1;
      }
    }
    // пенка от какао
    if (o.foam) {
      ctx.globalAlpha = o.foam;
      [-1, 1].forEach(function (sd) { M.ell(ctx, fx + look * r * 0.06 + sd * r * 0.17, r * 0.29, r * 0.2, r * 0.1, '#a8693f', 3, sd * 0.3); });
      ctx.globalAlpha = 1;
    }
    // шапка или причёска
    if (hat) {
      shape(ctx, C.hat, function (c) {
        c.moveTo(-r * 1.04, -r * 0.3);
        c.bezierCurveTo(-r * 1.04, -r * 1.45, r * 1.04, -r * 1.45, r * 1.04, -r * 0.3);
        c.closePath();
      });
      M.rrect(ctx, -r * 1.1, -r * 0.5, r * 2.2, r * 0.36, r * 0.18, C.hat2);
      if (kind === 'dad') { // очки-маска на шапке
        M.rrect(ctx, -r * 0.72, -r * 0.84, r * 1.44, r * 0.42, r * 0.2, '#3a3440', 4);
        M.rrect(ctx, -r * 0.62, -r * 0.78, r * 0.56, r * 0.3, r * 0.14, '#ffb347', 0);
        M.rrect(ctx, r * 0.06, -r * 0.78, r * 0.56, r * 0.3, r * 0.14, '#ffb347', 0);
        ctx.globalAlpha = 0.6;
        M.rrect(ctx, -r * 0.55, -r * 0.74, r * 0.18, r * 0.08, r * 0.04, '#fff', 0);
        ctx.globalAlpha = 1;
      }
      if (C.pom) {
        var pb = Math.sin((o.t || 0) * 9) * r * 0.04;
        M.circle(ctx, pb, -r * 1.22, r * (kind === 'katya' ? 0.36 : 0.28), C.pom);
      }
    } else {
      hair(ctx, kind, r, C, look);
    }
    // снежная «шапка» после сугроба
    if (o.snowHead) {
      ctx.globalAlpha = o.snowHead;
      shape(ctx, '#ffffff', function (c) {
        c.moveTo(-r * 1.15, -r * 0.55);
        c.bezierCurveTo(-r * 1.3, -r * 1.3, -r * 0.6, -r * 1.25, -r * 0.4, -r * 1.35);
        c.bezierCurveTo(-r * 0.2, -r * 2.1, r * 0.5, -r * 1.9, r * 0.45, -r * 1.35);
        c.bezierCurveTo(r * 0.9, -r * 1.4, r * 1.35, -r * 1.0, r * 1.15, -r * 0.55);
        c.bezierCurveTo(r * 0.7, -r * 0.45, -r * 0.7, -r * 0.45, -r * 1.15, -r * 0.55);
      }, 4);
      M.circle(ctx, -r * 0.1, -r * 1.65, r * 0.12, '#dff3ff', 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  function hair(ctx, kind, r, C, look) {
    var tipsY = kind === 'dad' ? -r * 0.5 : -r * 0.32;
    shape(ctx, C.hair, function (c) {
      c.moveTo(-r * 1.03, kind === 'mom' || kind === 'katya' ? r * 0.25 : -r * 0.15);
      c.bezierCurveTo(-r * 1.15, -r * 1.35, r * 1.15, -r * 1.35, r * 1.03, kind === 'mom' || kind === 'katya' ? r * 0.25 : -r * 0.15);
      c.lineTo(r * 0.85, tipsY + r * 0.05);
      var n = kind === 'nikita' ? 6 : 5;
      for (var i = 0; i < n; i++) {
        var x0 = r * 0.85 - (i + 0.5) * (1.7 * r / n), x1 = r * 0.85 - (i + 1) * (1.7 * r / n);
        c.lineTo(x0 + look * r * 0.05, tipsY + r * (kind === 'nikita' ? 0.12 : 0.08));
        c.lineTo(x1, tipsY - r * 0.14);
      }
      c.closePath();
    }, 4);
    if (kind === 'katya') { // бантик
      M.at(ctx, r * 0.55, -r * 0.85, 0.3, 1, function () {
        M.poly(ctx, [[0, 0], [-r * 0.32, -r * 0.2], [-r * 0.32, r * 0.2]], '#ff5d8f', 3);
        M.poly(ctx, [[0, 0], [r * 0.32, -r * 0.2], [r * 0.32, r * 0.2]], '#ff5d8f', 3);
        M.circle(ctx, 0, 0, r * 0.1, '#ff5d8f', 3);
      });
    }
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = M.clamp((n >> 16) + amt, 0, 255), g = M.clamp(((n >> 8) & 255) + amt, 0, 255), b = M.clamp((n & 255) + amt, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  M.shade = shade;

  /*
   * Персонаж целиком. Начало координат — между ступнями на земле (y вверх — отрицательный).
   * o: dir (1 вправо, -1 влево), crouch 0..1, lean (рад), armL/armR [плечо, локоть],
   *    gear 'skis'|'board', poles, mug 'L'|'R', sit (без ног), feet [dxL,dyL,dxR,dyR],
   *    eyes, mouth, look, hat, t, snowHead, foam, colors {jacket, jacket2}, sweater
   */
  M.person = function (ctx, kind, o) {
    o = o || {};
    var C = Object.assign({}, M.CHAR[kind], o.colors || {});
    var dir = o.dir || 1, crouch = o.crouch || 0;
    var leg = C.leg, torso = C.torso, w = C.w;
    var hipY = o.sit ? 0 : -leg * (1 - 0.22 * crouch);
    var spread = o.spread !== undefined ? o.spread : w * 0.42;
    var fk = o.feet || [0, 0, 0, 0];
    var feetL = [-spread / 2 + fk[0], fk[1]], feetR = [spread / 2 + fk[2], fk[3]];
    var legW = w * 0.24;

    // --- снаряжение под ногами (рисуем первым) ---
    if (!o.sit && o.gear === 'skis') {
      var sl = leg * 2.3;
      [[-3, '#ffd23f'], [5, '#ff7a3d']].forEach(function (sk, i) {
        var yy = sk[0] + 8;
        shape(ctx, sk[1], function (c) {
          c.moveTo(-sl / 2, yy - 4);
          c.lineTo(sl / 2 - 18, yy - 4);
          c.quadraticCurveTo(dir > 0 ? sl / 2 + 12 : sl / 2, yy - (dir > 0 ? 22 : 4), sl / 2, yy - (dir > 0 ? 18 : 0));
          c.lineTo(sl / 2 - 12, yy + 4);
          c.lineTo(-sl / 2 + 10, yy + 4);
          c.quadraticCurveTo(dir < 0 ? -sl / 2 - 12 : -sl / 2, yy - (dir < 0 ? 22 : 4), -sl / 2, yy - (dir < 0 ? 18 : 0));
          c.closePath();
        }, 4);
      });
    }
    if (!o.sit && o.gear === 'board') {
      var bx = (feetL[0] + feetR[0]) / 2, by = (feetL[1] + feetR[1]) / 2 + 9;
      var ba = Math.atan2(feetR[1] - feetL[1], feetR[0] - feetL[0]);
      var bl = w * 2.75;
      M.at(ctx, bx, by, ba, 1, function () {
        M.rrect(ctx, -bl / 2, -9, bl, 18, 9, '#18b6b0');
        M.rrect(ctx, -bl / 2 + 30, -3, bl - 60, 6, 3, '#ffd23f', 0);
        M.rrect(ctx, -bl * 0.32 - 16, -16, 32, 12, 4, '#3a3440', 3);
        M.rrect(ctx, bl * 0.32 - 16, -16, 32, 12, 4, '#3a3440', 3);
      });
    }

    // --- ноги ---
    if (!o.sit) {
      [[-1, feetL], [1, feetR]].forEach(function (p) {
        var sd = p[0], f = p[1];
        var hx = sd * w * 0.2, kx = (hx + f[0]) / 2 + sd * (6 + crouch * leg * 0.25), ky = (hipY + f[1]) / 2;
        M.limb(ctx, [[hx, hipY], [kx, ky], [f[0], f[1] - 10]], legW, C.pants);
        M.rrect(ctx, f[0] - legW * 0.75 + dir * 4, f[1] - 18, legW * 1.6, 18, 7, C.boots, 4);
      });
    }

    // --- туловище (с наклоном) ---
    ctx.save();
    ctx.translate(0, hipY + (o.bounce || 0));
    ctx.rotate(o.lean || 0);
    // палки (за телом)
    var sh = -torso + 16;
    function armPts(sd, arm) {
      var a = arm[0], e = arm[1];
      var ua = torso * 0.5, fa = torso * 0.46;
      var sx = sd * (w / 2 - 6);
      var ex = sx + sd * Math.sin(a) * ua, ey = sh + Math.cos(a) * ua;
      var hx = ex + sd * Math.sin(a + e) * fa, hy = ey + Math.cos(a + e) * fa;
      return [[sx, sh], [ex, ey], [hx, hy]];
    }
    var armL = o.armL || [0.25, -0.2], armR = o.armR || [0.25, -0.2];
    var pL = armPts(-1, armL), pR = armPts(1, armR);
    if (o.poles) {
      [pL[2], pR[2]].forEach(function (h, i) {
        var gx = h[0] - dir * leg * 1.05 + (i ? 10 : -10), gy = -hipY - 4;
        M.limb(ctx, [[h[0], h[1] - 12], [gx, gy]], 4, '#9aa3b5');
        M.ell(ctx, gx + dir * 6, gy - 14, 10, 4, '#3a3440', 3);
      });
    }
    // туловище
    M.rrect(ctx, -w / 2, -torso, w, torso + 10, [w * 0.38, w * 0.38, 12, 12], C.jacket);
    if (o.sweater) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -torso + 3, w - 6, torso + 4, [w * 0.36, w * 0.36, 10, 10]); ctx.clip();
      ctx.fillStyle = C.jacket2; ctx.fillRect(-w / 2, -torso * 0.62, w, torso * 0.22);
      ctx.beginPath();
      for (var zx = -w / 2; zx <= w / 2 + 10; zx += 12) {
        ctx.lineTo(zx, -torso * 0.55); ctx.lineTo(zx + 6, -torso * 0.47);
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      M.ell(ctx, 0, -torso + 2, w * 0.24, 8, C.jacket2, 4);
    } else {
      M.rrect(ctx, -w / 2 + 2, -6, w - 4, 14, [0, 0, 10, 10], C.jacket2, 0);
      M.line(ctx, 0, -torso + 12, 0, 2, C.jacket2, 4);
      M.ell(ctx, 0, -torso + 2, w * 0.3, 10, C.jacket2, 4);
    }
    // руки
    [[pL, armL], [pR, armR]].forEach(function (q) {
      M.limb(ctx, q[0], w * 0.21, C.jacket);
      var h = q[0][2];
      M.circle(ctx, h[0], h[1], w * 0.12, o.sweater ? C.skin : C.mitten, 4);
    });
    // кружка с какао
    if (o.mug) {
      var hm = o.mug === 'L' ? pL[2] : pR[2];
      var mr = w * 0.15;
      M.at(ctx, hm[0] + (o.mug === 'L' ? mr * 0.4 : -mr * 0.4), hm[1] - mr * 0.6, o.mugTilt || 0, 1, function () {
        ctx.beginPath(); ctx.arc(mr * 1.15, 0, mr * 0.55, -Math.PI / 2, Math.PI / 2);
        ctx.lineWidth = 6 + LW; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.lineWidth = 6; ctx.strokeStyle = o.mugColor || '#ffffff'; ctx.stroke();
        M.rrect(ctx, -mr, -mr * 1.1, mr * 2.1, mr * 2.3, [3, 3, mr * 0.6, mr * 0.6], o.mugColor || '#ffffff');
        M.ell(ctx, mr * 0.05, -mr * 1.05, mr * 0.92, mr * 0.22, '#6b3a1f', 3);
        M.circle(ctx, mr * 0.05, mr * 0.15, mr * 0.32, '#ff5d8f', 0);
        if (o.out) { var pt = ctx.getTransform().transformPoint(new DOMPoint(mr * 0.05, -mr * 1.1)); o.out.mug = [pt.x, pt.y]; }
      });
      M.circle(ctx, hm[0], hm[1], w * 0.12, o.sweater ? C.skin : C.mitten, 4);
    }
    // голова
    var headY = -torso - C.head * 0.82;
    M.head(ctx, kind, 0, headY, {
      dir: dir, eyes: o.eyes, mouth: o.mouth, look: o.look, hat: o.hat, t: o.t,
      snowHead: o.snowHead, tilt: o.headTilt, brows: o.brows, foam: o.foam, redNose: o.redNose
    });
    ctx.restore();
  };
  // Высота центра тела над ступнями — для вращений
  M.bodyCenter = function (kind) { var C = M.CHAR[kind]; return C.leg + C.torso * 0.45; };

  // ---------- ватрушка с детьми ----------
  M.tube = function (ctx, x, y, t, kids) {
    // kids: функция, рисующая детей (вызывается между задней и передней частью ватрушки)
    M.ell(ctx, x, y - 34, 150, 46, '#ff6b35');
    M.ell(ctx, x, y - 44, 96, 24, '#b8401a', 4);
    if (kids) kids();
    shape(ctx, '#ff6b35', function (c) {
      c.ellipse(x, y - 34, 150, 46, 0, 0, Math.PI);
      c.ellipse(x, y - 44, 96, 24, 0, Math.PI, 0, true);
      c.closePath();
    });
    ctx.globalAlpha = 0.35;
    M.ell(ctx, x - 70, y - 4, 36, 8, '#fff', 0, 0.15);
    ctx.globalAlpha = 1;
  };

  // ---------- машина ----------
  M.car = function (ctx, x, y, t, opts) {
    opts = opts || {};
    var bob = Math.sin(t * 13) * 2.2 + Math.sin(t * 4.7) * 1.6;
    var wheelA = t * (opts.speed || 900) / 48;
    ctx.save(); ctx.translate(x, y);
    // выхлоп
    for (var i = 0; i < 5; i++) {
      var ph = (t * 1.6 + i / 5) % 1;
      ctx.globalAlpha = 0.5 * (1 - ph);
      M.circle(ctx, -285 - ph * 160, -70 - ph * 40, 10 + ph * 26, '#e8eef5', 3);
    }
    ctx.globalAlpha = 1;
    ctx.translate(0, bob);
    // багажник на крыше
    M.rrect(ctx, -200, -282, 360, 10, 5, '#3a3440', 0);
    M.rrect(ctx, -150, -290, 10, 24, 3, '#3a3440', 0);
    M.rrect(ctx, 100, -290, 10, 24, 3, '#3a3440', 0);
    M.rrect(ctx, -230, -304, 410, 16, 8, '#18b6b0', 4);        // сноуборд папы
    M.rrect(ctx, -190, -318, 360, 10, 5, '#ffd23f', 3.5);      // лыжи мамы
    M.rrect(ctx, -180, -330, 360, 10, 5, '#ff7a3d', 3.5);
    // кузов
    shape(ctx, '#e94f37', function (c) {
      c.moveTo(-262, -80);
      c.lineTo(-262, -232); c.quadraticCurveTo(-262, -262, -232, -262);
      c.lineTo(120, -262); c.quadraticCurveTo(150, -262, 168, -240);
      c.lineTo(222, -165); c.quadraticCurveTo(262, -158, 268, -120);
      c.lineTo(270, -82); c.quadraticCurveTo(270, -58, 246, -58);
      c.lineTo(-240, -58); c.quadraticCurveTo(-262, -58, -262, -80);
    });
    // полоса
    M.rrect(ctx, -258, -142, 524, 16, 0, '#ffd23f', 0);
    // окна с семьёй
    var wins = [
      { p: function (c) { c.moveTo(92, -240); c.lineTo(150, -240); c.quadraticCurveTo(160, -240, 168, -228); c.lineTo(210, -168); c.lineTo(92, -168); c.closePath(); } },
      { p: function (c) { c.roundRect(-60, -240, 136, 72, 10); } },
      { p: function (c) { c.roundRect(-240, -240, 162, 72, 10); } }
    ];
    var look = opts.look || 0.6, tt = t;
    var faces = opts.faces || {};
    wins.forEach(function (wn, i) {
      ctx.save();
      ctx.beginPath(); wn.p(ctx); ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.clip();
      if (i === 0) {
        M.at(ctx, 138, -192, 0, 0.62, function () { M.head(ctx, 'dad', 0, 0, Object.assign({ look: 0.8, t: tt }, faces.dad)); });
        M.limb(ctx, [[190, -150], [175, -190]], 6, '#3a3440');
        M.ell(ctx, 172, -186, 6, 20, '#3a3440', 0, 0.4);
      } else if (i === 1) {
        M.at(ctx, 12, -190, 0, 0.62, function () { M.head(ctx, 'mom', 0, 0, Object.assign({ look: -0.6, t: tt }, faces.mom)); });
      } else {
        M.at(ctx, -118, -194, 0, 0.62, function () { M.head(ctx, 'nikita', 0, 0, Object.assign({ look: 0.7, t: tt }, faces.nikita)); });
        M.at(ctx, -200, -188, 0, 0.62, function () { M.head(ctx, 'katya', 0, 0, Object.assign({ look: 0.7, t: tt }, faces.katya)); });
      }
      // блик
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-300, -170); ctx.lineTo(-250, -170); ctx.lineTo(-180, -260); ctx.lineTo(-230, -260); ctx.closePath();
      ctx.translate(i === 0 ? 330 : i === 1 ? 210 : 40, 0); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.beginPath(); wn.p(ctx); ctx.lineWidth = LW; ctx.strokeStyle = OUT; ctx.stroke();
    });
    // двери, ручки, фары
    M.line(ctx, 82, -236, 82, -64, '#a8331f', 4);
    M.line(ctx, -70, -236, -70, -64, '#a8331f', 4);
    M.rrect(ctx, 44, -128, 26, 8, 4, '#a8331f', 0);
    M.rrect(ctx, -108, -128, 26, 8, 4, '#a8331f', 0);
    M.ell(ctx, 254, -118, 12, 16, '#fff6a8', 4);
    M.rrect(ctx, -266, -132, 12, 30, 5, '#ff3b3b', 4);
    M.rrect(ctx, -270, -78, 545, 22, 11, '#c7ccd6', 4);
    // колёса
    [-160, 165].forEach(function (wx) {
      M.circle(ctx, wx, -48, 50, '#3a3440');
      M.circle(ctx, wx, -48, 24, '#d6dbe4', 4);
      for (var s = 0; s < 4; s++) {
        var a = wheelA + s * Math.PI / 2;
        M.line(ctx, wx + Math.cos(a) * 8, -48 + Math.sin(a) * 8, wx + Math.cos(a) * 22, -48 + Math.sin(a) * 22, '#8a91a0', 4);
      }
    });
    ctx.restore();
  };

  // ---------- природа ----------
  M.pine = function (ctx, x, y, h, o) {
    o = o || {};
    var w = h * 0.55, col = o.color || '#2f8a5b', col2 = o.color2 || '#256f49';
    ctx.save(); ctx.translate(x, y);
    if (o.sway) ctx.rotate(o.sway);
    M.rrect(ctx, -h * 0.05, -h * 0.18, h * 0.1, h * 0.2, 3, '#7a4a2a', o.lw === undefined ? 4 : o.lw);
    for (var i = 0; i < 3; i++) {
      var ty = -h * (0.15 + i * 0.27), tw = w * (1 - i * 0.24), th = h * 0.42;
      M.poly(ctx, [[-tw / 2, ty], [tw / 2, ty], [0, ty - th]], i % 2 ? col2 : col, o.lw === undefined ? 4 : o.lw);
      // снег на ветках
      if (o.snow !== false) {
        shape(ctx, '#ffffff', function (c) {
          var sx = tw * 0.36, sy = ty - th * 0.62;
          c.moveTo(-sx * 0.55, sy + th * 0.08);
          c.lineTo(0, ty - th);
          c.lineTo(sx * 0.55, sy + th * 0.08);
          c.quadraticCurveTo(sx * 0.3, sy + th * 0.2, sx * 0.1, sy + th * 0.1);
          c.quadraticCurveTo(-sx * 0.15, sy + th * 0.22, -sx * 0.55, sy + th * 0.08);
        }, 0);
      }
    }
    ctx.restore();
  };

  // Горная гряда. off — сдвиг (параллакс), period — шаг между вершинами
  M.mountains = function (ctx, o) {
    var W = 1920, period = o.period, off = o.off || 0;
    var k0 = Math.floor((off - period) / period), k1 = Math.ceil((off + W + period) / period);
    for (var k = k0; k <= k1; k++) {
      var hx = M.hash(k * 3.1 + o.seed), hh = M.hash(k * 7.7 + o.seed * 2);
      var px = k * period - off + (hx - 0.5) * period * 0.5;
      var ph = o.height * (0.65 + 0.35 * hh);
      var bw = period * 1.15;
      var top = o.baseY - ph;
      M.poly(ctx, [[px - bw, o.baseY + 4], [px - bw * 0.15, top + ph * 0.08], [px, top], [px + bw * 0.12, top + ph * 0.06], [px + bw, o.baseY + 4]], o.color, o.lw === undefined ? 4 : o.lw);
      // снежная шапка
      var cap = ph * 0.32;
      M.poly(ctx, [
        [px - bw * 0.15 - (bw * 0.85) * (cap - ph * 0.08) / (ph * 0.92) * 0.6, top + cap],
        [px - bw * 0.15, top + ph * 0.08], [px, top], [px + bw * 0.12, top + ph * 0.06],
        [px + bw * 0.12 + bw * 0.88 * (cap - ph * 0.06) / (ph * 0.94) * 0.6, top + cap],
        [px + bw * 0.18, top + cap * 0.75], [px + bw * 0.06, top + cap * 1.05],
        [px - bw * 0.06, top + cap * 0.7], [px - bw * 0.18, top + cap * 1.0]
      ], o.snow || '#ffffff', o.lw === undefined ? 4 : o.lw);
    }
  };

  M.cloud = function (ctx, x, y, s) {
    M.at(ctx, x, y, 0, s, function () {
      shape(ctx, '#ffffff', function (c) {
        c.moveTo(-120, 30); c.arc(-80, 10, 45, Math.PI * 0.6, Math.PI * 1.5);
        c.arc(-10, -15, 60, Math.PI * 1.1, Math.PI * 1.9);
        c.arc(70, 5, 50, Math.PI * 1.3, Math.PI * 0.4);
        c.closePath();
      }, 4);
    });
  };

  // Падающий снег. Позиции зависят только от времени и номера снежинки.
  M.snowfall = function (ctx, t, o) {
    o = o || {};
    var n = o.n || 80, W = o.w || 1920, H = o.h || 1080, x0 = o.x || 0, y0 = o.y || 0;
    ctx.fillStyle = o.color || '#ffffff';
    ctx.globalAlpha = o.alpha === undefined ? 0.9 : o.alpha;
    for (var i = 0; i < n; i++) {
      var sp = (o.speed || 60) * (0.6 + M.hash(i + 0.7 + (o.seed || 0)) * 0.8);
      var y = (M.hash(i + 0.5 + (o.seed || 0)) * (H + 40) + t * sp) % (H + 40) - 20;
      var x = (M.hash(i + 0.1 + (o.seed || 0)) * W + Math.sin(t * 0.9 + i) * 18 + (o.wind || 0) * t) % W;
      if (x < 0) x += W;
      var r = (o.size || 3) * (0.5 + M.hash(i + 0.3) * 0.9);
      ctx.beginPath(); ctx.arc(x0 + x, y0 + y, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Пар над кружкой
  M.steam = function (ctx, x, y, t, s) {
    s = s || 1;
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var ph = ((t * 0.55 + i / 3) % 1);
      ctx.globalAlpha = 0.45 * Math.sin(Math.PI * ph);
      ctx.beginPath();
      for (var k = 0; k <= 12; k++) {
        var u = k / 12;
        var px = x + (i - 1) * 9 * s + Math.sin(u * 6 + t * 3 + i) * 7 * s;
        var py = y - ph * 40 * s - u * 46 * s;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * s; ctx.stroke();
    }
    ctx.restore();
  };

  // Сердечко
  M.heart = function (ctx, x, y, s, fill) {
    M.at(ctx, x, y, 0, s, function () {
      shape(ctx, fill || '#ff4d6d', function (c) {
        c.moveTo(0, 30);
        c.bezierCurveTo(-60, -10, -35, -55, 0, -25);
        c.bezierCurveTo(35, -55, 60, -10, 0, 30);
      }, 5);
      ctx.globalAlpha = 0.5; M.ell(ctx, -18, -22, 9, 6, '#fff', 0, -0.6); ctx.globalAlpha = 1;
    });
  };

  // ---------- тексты ----------
  M.font = function (size, weight) { return (weight || 800) + ' ' + size + 'px Rubik, "Segoe UI", Arial, sans-serif'; };
  M.text = function (ctx, str, x, y, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.scale !== undefined) ctx.scale(o.scale, o.scale);
    ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
    ctx.font = M.font(o.size || 60, o.weight);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(str, 0, (o.size || 60) * 0.08); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 12; ctx.strokeText(str, 0, 0); }
    ctx.fillStyle = o.fill || '#fff'; ctx.fillText(str, 0, 0);
    ctx.restore();
  };

  // Облачко реплики. (x,y) — центр, (tx,ty) — куда смотрит хвостик
  M.bubble = function (ctx, str, x, y, tx, ty, lt, dur, o) {
    o = o || {};
    if (lt < 0 || lt > dur) return;
    var size = o.size || 46;
    var pop = M.back(M.clamp(lt / 0.28));
    var alpha = M.clamp((dur - lt) / 0.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop);
    ctx.font = M.font(size, 800);
    var tw = ctx.measureText(str).width, bw = tw + size * 1.1, bh = size * 1.75;
    var dx = tx - x, dy = ty - y, base = Math.max(-bw / 2 + 30, Math.min(bw / 2 - 60, dx * 0.3));
    function tail(c) { c.moveTo(base - 4, bh / 2 - 6); c.lineTo(dx, dy); c.lineTo(base + 34, bh / 2 - 6); c.closePath(); }
    function box(c) { c.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); }
    ctx.lineJoin = 'round';
    ctx.beginPath(); box(ctx); tail(ctx); ctx.lineWidth = LW * 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); box(ctx); ctx.fillStyle = o.fill || '#fff'; ctx.fill();
    ctx.beginPath(); tail(ctx); ctx.fill();
    ctx.fillStyle = o.color || OUT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, size * 0.04);
    ctx.restore();
  };

  // Комикс-вспышка «БУХ!»
  M.burst = function (ctx, x, y, r, fill, t) {
    shape(ctx, fill, function (c) {
      var n = 14;
      for (var i = 0; i <= n * 2; i++) {
        var a = i / (n * 2) * TAU + t * 0.6;
        var rr = i % 2 ? r * 0.62 : r * (0.95 + 0.1 * M.hash(i));
        if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    });
  };
})();
