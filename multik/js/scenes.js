/*
 * СЦЕНЫ МУЛЬТФИЛЬМА «Семья едет в горы»
 *
 * Каждая сцена — функция draw(ctx, lt), где lt — время в секундах от начала сцены.
 * Список сцен и их длительность — в массиве M.SCENES внизу файла.
 * Все реплики собраны в объекте TEXT — их можно менять, не трогая остальной код.
 */
(function () {
  'use strict';
  var M = window.M;
  var W = 1920, H = 1080;
  var TAU = Math.PI * 2;

  // ======================= ТЕКСТЫ =======================
  var TEXT = {
    tagline: 'мультфильм',
    title: 'Семья едет в горы',
    roadSign: 'ГОРЫ',
    nikitaCar: 'Ура, горы!',
    topSign: 'ВЕРШИНА',
    momGo: 'Догоняйте!',
    dadShow: 'Смотрите, как я умею!',
    dadRace: 'Вика, смотри!',
    bang: 'БУХ!',
    momWhere: 'Дорогой, ты где?',
    laughs: ['Ха-ха-ха!', 'Хи-хи!', 'Ха-ха!', 'Хи-хи-хи!'],
    dadPlan: 'Я так и задумал!',
    katyaMore: 'Ещё!',
    finish: 'ФИНИШ',
    clink: 'Дзынь!',
    end: 'Наша семья'
  };
  M.TEXT = TEXT;

  // ======================= ОБЩЕЕ =======================
  function sky(ctx, top, bottom) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function sun(ctx, x, y, t) {
    var g = ctx.createRadialGradient(x, y, 40, x, y, 220);
    g.addColorStop(0, 'rgba(255,240,170,0.8)'); g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 220, y - 220, 440, 440);
    M.circle(ctx, x, y, 70 + Math.sin(t * 2) * 2, '#ffe27a', 0);
  }
  function clouds(ctx, lt, speed, list) {
    list.forEach(function (c, i) {
      var x = ((c[0] - lt * speed * (1 + i * 0.15)) % 2500 + 2500) % 2500 - 300;
      M.cloud(ctx, x, c[1], c[2]);
    });
  }
  // Снежная равнина у подножия гор (закрывает нижний край гор)
  function horizon(ctx, y, color) {
    ctx.fillStyle = color || '#eaf4ff'; ctx.fillRect(0, y, W, H - y + 10);
    M.line(ctx, -10, y, W + 10, y, M.OUT, 4);
  }
  // Камера для «мировых» сцен
  function camApply(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); }
  function w2s(c, x, y) { return [W / 2 + (x - c.x) * c.z, H / 2 + (y - c.y) * c.z]; }
  // Брызги снега из-под лыж/доски (в системе координат райдера)
  function spray(ctx, lt, seed, power) {
    for (var i = 0; i < 16; i++) {
      var age = (lt * 2.6 + i / 16 + seed) % 1;
      var h = M.hash(i + seed * 10);
      ctx.globalAlpha = (1 - age) * power;
      var px = -40 - age * 220 - h * 30, py = -8 - Math.sin(age * Math.PI) * (30 + h * 50), pr = (5 + h * 9) * (1 - age * 0.6);
      M.shape(ctx, '#ffffff', function (c) { c.arc(px, py, pr, 0, TAU); }, 2.5, '#8fb9e0');
    }
    ctx.globalAlpha = 1;
  }
  // Заголовок: слова появляются по очереди
  function popWords(ctx, str, x, y, lt, o) {
    var words = str.split(' ');
    ctx.font = M.font(o.size, 900);
    var gap = o.size * 0.4, widths = words.map(function (w) { return ctx.measureText(w).width; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (words.length - 1);
    var cx = x - total / 2;
    words.forEach(function (w, i) {
      var u = M.clamp((lt - i * 0.18) / 0.4);
      if (u <= 0) { cx += widths[i] + gap; return; }
      var s = M.back(u);
      var wob = Math.sin(lt * 3 + i) * 0.03;
      M.text(ctx, w, cx + widths[i] / 2, y + Math.sin(lt * 2.5 + i * 0.8) * 6, {
        size: o.size, weight: 900, fill: o.colors[i % o.colors.length], stroke: M.OUT, lw: o.size * 0.16,
        shadow: 'rgba(0,0,0,0.25)', scale: s, rot: wob, alpha: o.alpha
      });
      cx += widths[i] + gap;
    });
  }

  // ======================= 1. ДОРОГА (0–7 с) =======================
  function sceneRoad(ctx, lt) {
    sky(ctx, '#5bbcf5', '#d6f1ff');
    sun(ctx, 1640, 150, lt);
    clouds(ctx, lt, 25, [[300, 150, 1], [1000, 100, 0.8], [1650, 260, 0.9], [2250, 150, 0.7]]);
    M.mountains(ctx, { off: lt * 30, baseY: 700, height: 430, period: 430, seed: 1, color: '#a9c1e3', snow: '#f5faff' });
    M.mountains(ctx, { off: lt * 70 + 200, baseY: 730, height: 290, period: 520, seed: 5, color: '#7f9fd0' });
    horizon(ctx, 726);
    // снежные холмы
    M.shape(ctx, '#eef7ff', function (c) {
      c.moveTo(-10, 760);
      for (var x = -10; x <= W + 20; x += 40) c.lineTo(x, 740 + Math.sin((x + lt * 160) * 0.006) * 22);
      c.lineTo(W + 20, H + 10); c.lineTo(-10, H + 10); c.closePath();
    });
    // дальние ёлки
    var sp = 150, span = 15 * sp;
    for (var i = 0; i < 15; i++) {
      var x = ((i * sp - lt * 240) % span + span) % span - 120;
      M.pine(ctx, x, 800 + (i % 3) * 8, 110 + (i % 4) * 26);
    }
    // дорога
    M.rrect(ctx, -20, 822, W + 40, 160, 0, '#636b7c');
    for (var dx = -((lt * 900) % 200) - 200; dx < W + 200; dx += 200) M.rrect(ctx, dx, 900, 100, 12, 6, '#ffffff', 0);
    // указатель «ГОРЫ»
    var sx = 2150 - (lt - 2.4) * 900;
    if (sx > -300 && sx < 2300) {
      M.rrect(ctx, sx - 8, 690, 16, 140, 4, '#8a5a3b');
      M.rrect(ctx, sx - 130, 600, 260, 100, 16, '#2f6fd1');
      M.poly(ctx, [[sx - 105, 680], [sx - 75, 625], [sx - 45, 680]], '#ffffff', 3);
      M.text(ctx, TEXT.roadSign, sx + 30, 652, { size: 52, fill: '#ffffff' });
    }
    // машина с семьёй
    var carX = lt < 2.4 ? M.lerp(-420, 820, M.easeOut(lt / 2.4)) : 820 + Math.sin((lt - 2.4) * 1.3) * 25;
    carX += M.easeIn(M.prog(lt, 5.8, 7)) * 1500;
    var happy = lt > 3.4 && lt < 5.6;
    M.at(ctx, carX, 930, 0, 1.22, function () { M.car(ctx, 0, 0, lt, {
      faces: {
        dad: { mouth: 'grin' },
        mom: { mouth: 'smile', look: lt > 3.4 ? 0.7 : -0.6 },
        nikita: { mouth: happy ? 'laugh' : 'grin', eyes: happy ? 'happy' : 'open' },
        katya: { mouth: happy ? 'laugh' : 'smile', eyes: happy ? 'happy' : 'open' }
      }
    }); });
    // сугробы на обочине (передний план)
    M.shape(ctx, '#ffffff', function (c) {
      c.moveTo(-10, H + 10);
      for (var x = -10; x <= W + 20; x += 30) c.lineTo(x, 1000 + Math.sin((x + lt * 1100) * 0.008) * 16 + Math.sin((x + lt * 1100) * 0.021) * 8);
      c.lineTo(W + 20, H + 10); c.closePath();
    });
    // реплика Никиты
    M.bubble(ctx, TEXT.nikitaCar, carX - 230, 400, carX - 190, 520, lt - 3.5, 1.9);
    // титр
    var ta = 1 - M.prog(lt, 5.2, 5.8);
    if (ta > 0) {
      var ty = -M.easeIn(M.prog(lt, 5.2, 5.8)) * 60;
      var u0 = M.back(M.clamp((lt - 0.15) / 0.4));
      if (lt > 0.15) M.text(ctx, TEXT.tagline, W / 2, 150 + ty, { size: 50, fill: '#ffd23f', stroke: M.OUT, lw: 10, scale: u0, alpha: ta });
      popWords(ctx, TEXT.title, W / 2, 270 + ty, lt - 0.4, { size: 132, colors: ['#ffffff', '#ffffff', '#ffd23f', '#ffffff'], alpha: ta });
    }
  }

  // ======================= 2. ВЕРШИНА (7–13 с) =======================
  function topGround(x) { return x < 1400 ? 832 : 832 + Math.pow((x - 1400) / 520, 1.7) * 190; }
  function sceneTop(ctx, lt) {
    sky(ctx, '#4aaeee', '#e3f6ff');
    sun(ctx, 300, 150, lt);
    clouds(ctx, lt, 18, [[700, 140, 0.9], [1500, 90, 0.7], [2200, 200, 1]]);
    M.mountains(ctx, { off: 120 + lt * 6, baseY: 780, height: 540, period: 620, seed: 9, color: '#a3bce2' });
    M.mountains(ctx, { off: 300 + lt * 12, baseY: 820, height: 320, period: 470, seed: 3, color: '#7896c8' });
    horizon(ctx, 816);
    // подъёмник
    M.line(ctx, -40, 230, 230, 330, '#3a3440', 4);
    M.line(ctx, 230, 330, 700, -40, '#3a3440', 4);
    M.rrect(ctx, 205, 320, 50, 18, 6, '#9aa3b5');
    M.limb(ctx, [[230, 330], [230, 830]], 22, '#9aa3b5');
    var chairX = 90 + ((lt * 30) % 60);
    M.line(ctx, chairX, 230 + (chairX + 40) * 0.37 - 15, chairX, 330, '#3a3440', 4);
    M.rrect(ctx, chairX - 40, 320, 80, 16, 6, '#e94f37');
    // плато
    M.shape(ctx, '#ffffff', function (c) {
      c.moveTo(-10, 832);
      for (var x = -10; x <= W + 20; x += 20) c.lineTo(x, topGround(x) - 12 + Math.sin(x * 0.02) * 3);
      c.lineTo(W + 20, H + 10); c.lineTo(-10, H + 10); c.closePath();
    });
    ctx.globalAlpha = 0.5;
    M.ell(ctx, 520, 960, 380, 40, '#d6e9fb', 0);
    M.ell(ctx, 1300, 1010, 420, 36, '#d6e9fb', 0);
    ctx.globalAlpha = 1;
    // ёлки по краям
    M.pine(ctx, 70, 860, 330); M.pine(ctx, 1840, 1000, 300); M.pine(ctx, 1700, 940, 220);
    // указатель «ВЕРШИНА» и флаг
    M.rrect(ctx, 352, 690, 16, 150, 4, '#8a5a3b');
    M.rrect(ctx, 235, 620, 250, 80, 14, '#c98b4a');
    M.text(ctx, TEXT.topSign, 360, 662, { size: 36, fill: '#ffffff', stroke: '#7a4a2a', lw: 6 });
    M.limb(ctx, [[1480, 840], [1480, 480]], 8, '#c7ccd6');
    M.shape(ctx, '#ff4d6d', function (c) {
      c.moveTo(1484, 490);
      for (var k = 0; k <= 10; k++) c.lineTo(1484 + k * 15, 490 + Math.sin(lt * 7 - k * 0.6) * 8 * k / 10);
      for (var k2 = 10; k2 >= 0; k2--) c.lineTo(1484 + k2 * 15, 570 + Math.sin(lt * 7 - k2 * 0.6) * 8 * k2 / 10);
      c.closePath();
    }, 4);
    // ватрушка
    M.tube(ctx, 610, 815, lt);

    // --- семья ---
    var gy = 838;
    // Катя прыгает от радости
    var hop = lt < 2.4 ? -Math.abs(Math.sin(lt * 7.5)) * 26 : 0;
    var clap = Math.sin(lt * 14) * 0.35;
    M.at(ctx, 500, gy + hop, 0, 1.12, function () {
      M.person(ctx, 'katya', {
        t: lt, look: lt > 3.6 ? 0.9 : 0.3, mouth: lt < 2.4 || lt > 3.6 ? 'laugh' : 'smile',
        eyes: lt < 2.4 ? 'happy' : 'open',
        armL: lt < 2.4 ? [2.5, 0.3] : [0.9 + clap, -1.6], armR: lt < 2.4 ? [2.5, 0.3] : [0.9 + clap, -1.6]
      });
    });
    // Никита машет
    var wave = Math.sin(lt * 9) * 0.35;
    M.at(ctx, 700, gy, 0, 1.12, function () {
      M.person(ctx, 'nikita', {
        t: lt, look: lt > 3.6 ? 0.9 : 0.4, mouth: lt > 3.6 ? 'laugh' : 'grin', eyes: lt > 3.6 && lt < 5 ? 'happy' : 'open',
        armL: [0.3, -0.3], armR: lt < 2 ? [2.5 + wave, 0.4] : lt > 3.6 ? [1.6, 0] : [0.3, -0.3]
      });
    });
    // Папа на сноуборде
    var dadX = 990 + M.easeIn(M.prog(lt, 4.9, 6.0)) * 650;
    var dGy = topGround(dadX), dAng = Math.atan((topGround(dadX + 5) - topGround(dadX - 5)) / 10);
    var pose = lt > 3.5 && lt < 4.9;
    var flail = lt > 5.1;
    M.at(ctx, dadX, dGy + 6, dAng, 1.12, function () {
      M.person(ctx, 'dad', {
        t: lt, gear: 'board', spread: 78, crouch: flail ? 0.5 : 0.15,
        look: lt < 1.4 ? -0.2 : 0.7, mouth: flail ? 'o' : 'grin', eyes: flail ? 'wide' : 'open',
        armL: flail ? [2 + Math.sin(lt * 22) * 0.8, 0.3] : pose ? [0.7, -2.3] : [0.35, -0.2],
        armR: flail ? [2 + Math.cos(lt * 22) * 0.8, 0.3] : pose ? [2.75, 0.35] : [0.35, -0.2]
      });
    });
    // Мама на лыжах — стартует первой
    var mU = M.prog(lt, 3.6, 5.3);
    var momX = 1260 + M.easeIn(mU) * 1000;
    var mGy = topGround(momX), mAng = Math.atan((topGround(momX + 5) - topGround(momX - 5)) / 10);
    M.at(ctx, momX, mGy, mAng, 1.12, function () {
      if (mU > 0) spray(ctx, lt, 0.3, M.clamp(mU * 4));
      M.person(ctx, 'mom', {
        t: lt, gear: 'skis', poles: true, crouch: mU > 0 ? 0.55 : 0.1, lean: mU > 0 ? 0.15 : 0,
        look: lt < 1.2 ? -0.7 : 0.8, mouth: 'smile', eyes: lt > 1.3 && lt < 1.8 ? 'wink' : 'open',
        armL: mU > 0 ? [0.7, -1.0] : [0.45, -0.5], armR: mU > 0 ? [0.7, -1.0] : [0.45, -0.5]
      });
    });
    M.snowfall(ctx, lt, { n: 40, speed: 50, size: 3, alpha: 0.8 });
    M.bubble(ctx, TEXT.momGo, 1340, 440, 1280, 525, lt - 1.4, 2.1);
    M.bubble(ctx, TEXT.dadShow, 900, 350, 980, 440, lt - 3.5, 2.2);
  }

  // ======================= 3. СПУСК (13–16 с) =======================
  var RA = Math.atan(0.323);
  function rgy(x) { return 300 + x * 0.323; }
  function sceneRace(ctx, lt) {
    sky(ctx, '#58b8f2', '#e2f5ff');
    M.mountains(ctx, { off: lt * 50, baseY: 560, height: 360, period: 480, seed: 21, color: '#a9c1e3' });
    horizon(ctx, 556);
    var v = 900, vx = v * Math.cos(RA);
    // дальний склон
    M.shape(ctx, '#e4f1ff', function (c) {
      c.moveTo(-10, rgy(-10) - 150);
      c.lineTo(W + 10, rgy(W + 10) - 150); c.lineTo(W + 10, H + 10); c.lineTo(-10, H + 10); c.closePath();
    }, 4);
    var span = 2400;
    for (var i = 0; i < 10; i++) {
      var x = ((i * 240 + M.hash(i) * 80 - lt * vx * 0.8) % span + span) % span - 240;
      M.pine(ctx, x, rgy(x) - 150 + 18 + (i % 2) * 10, 150 + (i % 3) * 40);
    }
    // основной склон
    M.shape(ctx, '#ffffff', function (c) {
      c.moveTo(-10, rgy(-10));
      for (var x2 = -10; x2 <= W + 20; x2 += 20) c.lineTo(x2, rgy(x2) + Math.sin((x2 + lt * vx) * 0.012) * 5);
      c.lineTo(W + 20, H + 10); c.lineTo(-10, H + 10); c.closePath();
    });
    // полосы скорости
    ctx.lineCap = 'round';
    for (var k = 0; k < 12; k++) {
      var sx = ((M.hash(k + 4) * 2600 - lt * 2600) % 2600 + 2600) % 2600 - 300;
      var sy = rgy(sx) - 60 - M.hash(k + 9) * 380, len = 120 + M.hash(k) * 160;
      ctx.globalAlpha = 0.7; M.line(ctx, sx, sy, sx + len * Math.cos(RA), sy + len * Math.sin(RA), '#ffffff', 5); ctx.globalAlpha = 1;
    }
    // папа (сзади, догоняет)
    var dx = 600 + lt * 70 + Math.sin(lt * 2.3) * 25;
    var hopU = M.prog(lt, 2.05, 2.6), hop = -Math.sin(Math.PI * hopU) * 80;
    M.at(ctx, dx, rgy(dx) + 6 + hop, RA - Math.sin(Math.PI * hopU) * 0.35, 1, function () {
      spray(ctx, lt, 0.6, 1);
      M.person(ctx, 'dad', {
        t: lt, gear: 'board', spread: 80, crouch: 0.45, lean: -0.15,
        look: 0.8, mouth: 'grin', eyes: 'open',
        armL: [1.3 + Math.sin(lt * 5) * 0.2, 0.2], armR: hopU > 0 ? [2.7, 0.3] : [1.3 - Math.sin(lt * 5) * 0.2, 0.2]
      });
    });
    // мама впереди — уверенно и красиво
    var mx = 1250 + Math.sin(lt * 1.7) * 18;
    var glance = lt > 1.4 && lt < 2.2;
    M.at(ctx, mx, rgy(mx) + 2, RA, 1, function () {
      spray(ctx, lt, 0.1, 1);
      M.person(ctx, 'mom', {
        t: lt, gear: 'skis', poles: true, crouch: 0.5, lean: -0.05 + Math.sin(lt * 3) * 0.04,
        look: glance ? -0.8 : 0.8, mouth: 'smile', eyes: glance ? 'wink' : 'open',
        armL: [0.75, -1.1], armR: [0.75, -1.1]
      });
    });
    // ёлки на переднем плане
    for (var f = 0; f < 3; f++) {
      var fx = ((f * 1000 + 400 - lt * vx * 1.5) % 3000 + 3000) % 3000 - 400;
      M.pine(ctx, fx, rgy(fx) + 420, 520);
    }
    M.snowfall(ctx, lt, { n: 30, speed: 120, size: 3, wind: -300, alpha: 0.7, seed: 3 });
    M.bubble(ctx, TEXT.dadRace, dx - 40, rgy(dx) - 430, dx, rgy(dx) - 340, lt - 0.3, 1.8);
  }

  // ======================= 4. ТРАМПЛИН, СУГРОБ И СМЕХ (16–29.5 с) =======================
  var SL = 0.35, KS = 200, F0 = -250;      // склон, плавно переходящий в ровную площадку
  var K = -1300, KH = 60, KW = 220;        // трамплин
  var D = 250, DH = 170, DW = 230;         // сугроб
  var DAD_END = 520, MOM_END = 760, KIDS_END = -180;
  function slopeY(x) { var u = x - F0; return SL * (u - KS * Math.log(1 + Math.exp(u / KS))); }
  function kick(x) { return x > K - KW && x <= K ? KH * Math.pow((x - (K - KW)) / KW, 1.6) : 0; }
  function surf(x) { return slopeY(x) - kick(x); }
  function surfAng(x) { return Math.atan((surf(x + 4) - surf(x - 4)) / 8); }
  function driftTop() { return slopeY(D) - DH; }

  var BC = M.bodyCenter('dad');
  var FLIGHT = 1.8, G = 1300, T_OFF = 1.5;
  var VX = (D - K) / FLIGHT;
  var Y0C = surf(K) - BC;
  var TARGET = driftTop() + 36;
  var VY = (Y0C + 0.5 * G * FLIGHT * FLIGHT - TARGET) / FLIGHT;
  var T_HIT = T_OFF + FLIGHT;              // 3.3 → 19.3 с от начала фильма
  var T_POP = 9.0, T_POP_END = 9.7;        // папа выбирается из сугроба

  function momX(lt) {
    var v = 800, x0 = -1000, tFlat = -x0 / v;
    if (lt < tFlat) return x0 + v * lt;
    var a = v * v / (2 * MOM_END), u = Math.min(lt - tFlat, v / a);
    return v * u - 0.5 * a * u * u;
  }
  function dadState(lt) {
    if (lt < T_OFF) {
      var r = T_OFF - lt, x = K - VX * r + 150 * r * r;
      return { feet: [x, surf(x)], ang: surfAng(x), mode: 'ride' };
    }
    if (lt < T_HIT) {
      var tau = lt - T_OFF;
      var rot = TAU * M.ease(M.prog(tau, 0.1, 0.85)) + Math.PI * M.ease(M.prog(tau, 1.0, 1.75));
      return { center: [K + VX * tau, Y0C - VY * tau + 0.5 * G * tau * tau], rot: rot, mode: tau < 0.95 ? 'spin' : 'fall' };
    }
    if (lt < T_POP) return { center: [D, TARGET], rot: Math.PI, mode: 'stuck' };
    if (lt < T_POP_END) {
      var u = M.prog(lt, T_POP, T_POP_END);
      return {
        center: [M.lerp(D, DAD_END, u), M.lerp(TARGET, slopeY(DAD_END) - BC, u) - Math.sin(Math.PI * u) * 300],
        rot: Math.PI + Math.PI * M.ease(u), mode: 'pop'
      };
    }
    return { feet: [DAD_END, slopeY(DAD_END)], ang: 0, mode: 'stand' };
  }
  function camJump(lt) {
    var d = dadState(Math.min(lt, T_HIT));
    var px = d.feet ? d.feet[0] : d.center[0], pcy = d.feet ? d.feet[1] - BC : d.center[1];
    var a = { x: px + 380, y: 0.5 * slopeY(px) + 0.5 * pcy - 120, z: 0.85 }, b = { x: 300, y: -290, z: 1.25 };
    var u = M.ease(M.prog(lt, 3.7, 5.1));
    var c = { x: M.lerp(a.x, b.x, u), y: M.lerp(a.y, b.y, u), z: Math.exp(M.lerp(Math.log(a.z), Math.log(b.z), u)) };
    var sh = Math.max(0, 1 - (lt - T_HIT) / 0.55) * (lt > T_HIT ? 1 : 0);
    c.x += Math.sin(lt * 70) * 22 * sh; c.y += Math.cos(lt * 83) * 16 * sh;
    return c;
  }
  function drift(ctx, lt) {
    var top = driftTop(), base = slopeY(D);
    function curve(c) {
      c.moveTo(D - DW - 30, base + 8);
      c.bezierCurveTo(D - DW + 40, base - 20, D - 150, top + 30, D - 90, top + 18);
      c.bezierCurveTo(D - 60, top - 10, D - 10, top - 4, D + 20, top + 6);
      c.bezierCurveTo(D + 60, top - 16, D + 120, top + 8, D + 140, top + 30);
      c.bezierCurveTo(D + 190, top + 70, D + DW - 20, base - 20, D + DW + 30, base + 8);
    }
    M.shape(ctx, '#ffffff', function (c) { curve(c); c.ellipse(D, base + 8, DW + 30, 70, 0, 0, Math.PI); c.closePath(); }, 0);
    M.shape(ctx, null, curve);
    ctx.globalAlpha = 0.6;
    M.ell(ctx, D + 60, base - 40, 120, 26, '#d6e9fb', 0, -0.1);
    ctx.globalAlpha = 1;
  }
  function burstParticles(ctx, lt) {
    var tau = lt - T_HIT;
    if (tau < 0 || tau > 1.6) return;
    var top = driftTop();
    for (var i = 0; i < 40; i++) {
      var a = -Math.PI * (0.08 + 0.84 * M.hash(i + 1)), sp = 350 + 650 * M.hash(i + 7);
      var x = D + Math.cos(a) * sp * tau, y = top + 20 + Math.sin(a) * sp * tau + 0.5 * 1500 * tau * tau;
      if (y > slopeY(x) + 10) continue;
      ctx.globalAlpha = M.clamp(1.4 - tau);
      M.circle(ctx, x, y, 8 + 14 * M.hash(i + 3), '#ffffff', 3);
    }
    ctx.globalAlpha = M.clamp(1 - tau * 1.4) * 0.8;
    M.ell(ctx, D, top + 30, 120 + tau * 380, 50 + tau * 120, '#ffffff', 0);
    ctx.globalAlpha = 1;
  }

  function sceneJump(ctx, lt) {
    var c = camJump(lt);
    sky(ctx, '#56b6f1', '#e6f6ff');
    sun(ctx, 1650, 140, lt);
    clouds(ctx, lt, 15, [[400, 130, 0.9], [1200, 210, 0.7], [1900, 120, 0.8]]);
    var hy = 640 - (c.y + 380) * 0.12;
    M.mountains(ctx, { off: 600 + c.x * 0.08, baseY: hy, height: 400, period: 520, seed: 13, color: '#a9c1e3' });
    horizon(ctx, hy - 4);

    ctx.save();
    camApply(ctx, c);
    // ёлки за трассой
    [[-2900, 330], [-2650, 380], [-2400, 300], [-2150, 360], [-1900, 300], [-1650, 380], [-1420, 310], [-1080, 340], [-820, 300],
      [-560, 360], [-380, 280], [1000, 330], [1250, 400], [1550, 300]].forEach(function (p) {
      M.pine(ctx, p[0], slopeY(p[0]) - 40, p[1]);
    });
    // склон с трамплином
    M.shape(ctx, '#ffffff', function (cc) {
      cc.moveTo(-3000, 1500); cc.lineTo(-3000, surf(-3000));
      for (var x = -3000; x <= 2200; x += 16) cc.lineTo(x, surf(x));
      cc.lineTo(2200, 1500); cc.closePath();
    });
    M.shape(ctx, '#e8f3ff', function (cc) {
      cc.moveTo(K - KW, surf(K - KW)); for (var x = K - KW; x <= K; x += 10) cc.lineTo(x, surf(x)); cc.lineTo(K, slopeY(K)); cc.closePath();
    }, 4);
    // табличка «ФИНИШ»
    M.rrect(ctx, 952, slopeY(960) - 260, 16, 270, 4, '#8a5a3b');
    M.rrect(ctx, 860, slopeY(960) - 330, 200, 80, 14, '#ff4d6d');
    M.text(ctx, TEXT.finish, 960, slopeY(960) - 289, { size: 42, fill: '#ffffff' });
    // следы от лыж и тени на снегу
    ctx.globalAlpha = 0.55;
    [[-1400, 60], [-900, 110], [-200, 70], [600, 120], [1100, 60]].forEach(function (p) { M.ell(ctx, p[0], slopeY(p[0]) + p[1], 220, 22, '#d6e9fb', 0); });
    ctx.globalAlpha = 1;
    [4, 14].forEach(function (off) {
      ctx.beginPath();
      for (var x = -2600; x <= MOM_END - 60; x += 30) { var y = slopeY(x) + off; if (x === -2600) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = '#cfe2f5'; ctx.lineWidth = 5; ctx.stroke();
    });
    // флажки у трамплина
    [K - KW - 20, K + 10].forEach(function (fx, i) {
      M.limb(ctx, [[fx, slopeY(fx) + 6], [fx, slopeY(fx) - 150]], 6, '#ffffff');
      M.poly(ctx, [[fx + 3, slopeY(fx) - 150], [fx + 60, slopeY(fx) - 128], [fx + 3, slopeY(fx) - 106]], i ? '#ff4d6d' : '#ffd23f', 4);
    });

    // мама
    var mx = momX(lt), mStop = mx >= MOM_END - 0.5;
    var mMoving = !mStop;
    var surprised = lt > T_HIT && lt < T_HIT + 0.7;
    var momLaugh = lt > 6.6 && !(lt > T_POP && lt < T_POP + 0.5);
    M.at(ctx, mx, surf(mx) + 2, surfAng(mx), 1, function () {
      if (mMoving) spray(ctx, lt, 0.2, 1);
      if (lt > 2.6 && lt < 3.4) { // эффектная остановка — веер снега
        var su = M.prog(lt, 2.6, 3.4);
        for (var i = 0; i < 14; i++) {
          ctx.globalAlpha = 1 - su;
          M.circle(ctx, 60 + su * 240 * M.hash(i), -su * 160 * M.hash(i + 2) + su * su * 90, 7 + 10 * M.hash(i + 5), '#ffffff', 2.5);
        }
        ctx.globalAlpha = 1;
      }
      var b = momLaugh ? -Math.abs(Math.sin(lt * 9)) * 6 : 0;
      M.person(ctx, 'mom', {
        t: lt, gear: 'skis', poles: true, dir: mStop ? -1 : 1, bounce: b,
        crouch: mMoving ? 0.5 : 0.05, lean: mMoving ? -0.05 : 0,
        look: lt > 3.0 ? -0.8 : 0.8,
        eyes: surprised ? 'wide' : momLaugh ? 'happy' : 'open', brows: surprised,
        mouth: surprised ? 'o' : momLaugh ? 'laugh' : 'smile',
        armL: momLaugh ? [0.3, -1.9] : mMoving ? [0.75, -1.1] : [0.4, -0.5],
        armR: momLaugh ? [0.3, -1.9] : mMoving ? [0.75, -1.1] : [0.4, -0.5]
      });
    });

    // папа
    var d = dadState(lt);
    var dadOpts = { t: lt, gear: 'board', spread: 80, look: 0.8, mouth: 'grin', eyes: 'open' };
    if (d.mode === 'ride') {
      Object.assign(dadOpts, { crouch: 0.45, armL: [1.2, 0.2], armR: [1.2, 0.2] });
    } else if (d.mode === 'spin') {
      Object.assign(dadOpts, { crouch: 0.75, armL: [0.9, -1.4], armR: [0.9, -1.4], mouth: 'grin', eyes: 'happy' });
    } else if (d.mode === 'fall') {
      Object.assign(dadOpts, { crouch: 0.2, eyes: 'wide', brows: true, mouth: 'o',
        armL: [2.1 + Math.sin(lt * 26) * 0.9, 0.3], armR: [2.1 + Math.cos(lt * 26) * 0.9, 0.3] });
    } else if (d.mode === 'stuck') {
      var wg = Math.sin(lt * 15);
      Object.assign(dadOpts, { feet: [wg * 18, -Math.abs(wg) * 10, -wg * 18, -Math.abs(-wg) * 6], spread: 70 });
    } else if (d.mode === 'pop') {
      Object.assign(dadOpts, { snowHead: 1, eyes: 'wide', mouth: 'o', armL: [2.6, 0.2], armR: [2.6, 0.2], crouch: 0.3 });
    } else {
      var dizzy = lt < T_POP_END + 0.7;
      var talk = lt > 10.2 && lt < 12.4;
      Object.assign(dadOpts, {
        snowHead: 1, crouch: 0.1, look: talk ? -0.6 : -0.3,
        eyes: dizzy ? 'dizzy' : lt > 12.4 ? 'happy' : 'open', mouth: dizzy ? 'o' : lt > 12.4 ? 'laugh' : 'grin',
        headTilt: dizzy ? Math.sin(lt * 9) * 0.15 : 0,
        armL: talk ? [0.6, -1.7] : [0.35, -0.2], armR: talk ? [2.75, 0.35] : [0.35, -0.2],
        bounce: lt > 12.4 ? -Math.abs(Math.sin(lt * 9)) * 6 : 0
      });
    }
    if (d.feet) {
      M.at(ctx, d.feet[0], d.feet[1] + 6, d.ang, 1, function () {
        if (d.mode === 'ride') spray(ctx, lt, 0.5, 1);
        M.person(ctx, 'dad', dadOpts);
      });
    } else {
      M.at(ctx, d.center[0], d.center[1], d.rot, 1, function () {
        M.at(ctx, 0, BC, 0, 1, function () { M.person(ctx, 'dad', dadOpts); });
      });
    }
    drift(ctx, lt);
    burstParticles(ctx, lt);
    // снежный «пуф», когда папа выбирается
    if (lt > T_POP && lt < T_POP + 0.9) {
      var pu = M.prog(lt, T_POP, T_POP + 0.9);
      for (var p = 0; p < 18; p++) {
        var pa = -Math.PI * M.hash(p + 11);
        ctx.globalAlpha = 1 - pu;
        M.circle(ctx, D + Math.cos(pa) * pu * 260, driftTop() + 20 + Math.sin(pa) * pu * 200 + pu * pu * 120, 8 + 10 * M.hash(p), '#ffffff', 3);
      }
      ctx.globalAlpha = 1;
    }

    // дети на ватрушке
    if (lt > 4.9) {
      var ku = M.easeOut(M.prog(lt, 4.9, 6.6));
      var kx = M.lerp(-1150, KIDS_END, ku);
      var arrived = lt > 6.6, kidsShock = lt > T_POP && lt < T_POP + 0.5;
      var jump = lt > 11.2 && lt < 13.2 ? -Math.abs(Math.sin(lt * 8)) * 14 : 0;
      var lb = arrived && !kidsShock ? -Math.abs(Math.sin(lt * 10)) * 6 : 0;
      M.at(ctx, kx, slopeY(kx) + 4, Math.atan((slopeY(kx + 4) - slopeY(kx - 4)) / 8), 1, function () {
        if (!arrived) spray(ctx, lt, 0.8, 1 - ku);
        M.tube(ctx, 0, 0, lt, function () {
          M.at(ctx, -48, -26 + lb, 0, 1, function () {
            M.person(ctx, 'nikita', {
              t: lt, sit: true, look: 0.8,
              eyes: kidsShock ? 'wide' : 'happy', mouth: kidsShock ? 'o' : 'laugh',
              armL: arrived ? [0.3, -1.9] : [2.6, 0.3], armR: arrived ? [1.55, -0.05] : [2.6, 0.3]
            });
          });
          M.at(ctx, 52, -28 + lb + jump, 0, 1, function () {
            var clap = Math.sin(lt * 16) * 0.3;
            M.person(ctx, 'katya', {
              t: lt, sit: true, look: 0.6,
              eyes: kidsShock ? 'wide' : 'happy', mouth: kidsShock ? 'o' : 'laugh',
              armL: arrived && !jump ? [0.9 + clap, -1.7] : [2.6, 0.3], armR: arrived && !jump ? [0.9 + clap, -1.7] : [2.6, 0.3]
            });
          });
        });
      });
    }
    ctx.restore();

    // --- надписи в экранных координатах ---
    if (lt > T_HIT && lt < T_HIT + 1.3) {
      var bu = lt - T_HIT, bs = M.back(M.clamp(bu / 0.25)), ba = M.clamp((1.3 - bu) / 0.3);
      var bp = w2s(c, D - 260, driftTop() - 230);
      ctx.save(); ctx.globalAlpha = ba;
      M.at(ctx, bp[0], bp[1], -0.12, bs, function () {
        M.burst(ctx, 0, 0, 170, '#ffd23f', lt);
        M.text(ctx, TEXT.bang, 0, 6, { size: 104, weight: 900, fill: '#ff4d2e', stroke: M.OUT, lw: 14 });
      });
      ctx.restore();
    }
    var mh = w2s(c, MOM_END, slopeY(MOM_END) - 300);
    M.bubble(ctx, TEXT.momWhere, mh[0] - 150, mh[1] - 80, mh[0] - 20, mh[1] - 5, lt - 4.1, 2.2);
    var dh = w2s(c, DAD_END, slopeY(DAD_END) - 360);
    M.bubble(ctx, TEXT.dadPlan, dh[0] - 30, dh[1] - 95, dh[0], dh[1] - 10, lt - 10.2, 2.3);
    var kh = w2s(c, KIDS_END + 52, slopeY(KIDS_END) - 200);
    M.bubble(ctx, TEXT.katyaMore, kh[0] + 30, kh[1] - 120, kh[0] + 10, kh[1] - 20, lt - 11.4, 1.9);
    // летающие «Ха-ха!»
    for (var h = 0; h < 13; h++) {
      var st = 6.8 + h * 0.48;
      if (st > T_POP - 0.3 && st < T_POP + 0.6) continue;
      var age = lt - st;
      if (age < 0 || age > 1.3) continue;
      var who = h % 3; // 0 — Никита, 1 — Катя, 2 — мама
      var src = who === 0 ? [KIDS_END - 48, -200] : who === 1 ? [KIDS_END + 52, -170] : [MOM_END, -300];
      var sp = w2s(c, src[0], src[1]);
      var str = TEXT.laughs[(h + who) % TEXT.laughs.length];
      M.text(ctx, str, sp[0] + (who === 2 ? 110 : -90 + who * 80) + Math.sin(age * 6 + h) * 12, sp[1] - 50 - age * 110, {
        size: 50, fill: ['#ff7a3d', '#b04fd6', '#ee4d86'][who], stroke: '#ffffff', lw: 11,
        alpha: M.clamp(age / 0.15) * M.clamp((1.3 - age) / 0.3), rot: Math.sin(h) * 0.15, scale: 0.8 + 0.2 * M.back(M.clamp(age / 0.25))
      });
    }
    M.snowfall(ctx, lt, { n: 35, speed: 50, size: 3, alpha: 0.75, seed: 7 });
  }

  // ======================= 5. КАКАО У КАМИНА (29.5–42 с) =======================
  function sceneCocoa(ctx, lt) {
    // стена из брёвен
    ctx.fillStyle = '#a8682f'; ctx.fillRect(0, 0, W, H);
    for (var y = 0; y < 920; y += 64) {
      M.rrect(ctx, -20, y + 2, W + 40, 60, 30, y % 128 ? '#b9773f' : '#b0703a', 4);
      ctx.globalAlpha = 0.25; M.line(ctx, 40, y + 22, W - 40, y + 22, '#ffd9a8', 4); ctx.globalAlpha = 1;
    }
    // окно с ночными горами
    var wx = 1640, wy = 170, ww = 250, wh = 320;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 16); ctx.clip();
    var g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#16224d'); g.addColorStop(1, '#3d4f92');
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    for (var s = 0; s < 22; s++) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(lt * 3 + s * 1.7);
      M.circle(ctx, wx + M.hash(s) * ww, wy + M.hash(s + 40) * wh * 0.55, 2 + M.hash(s + 9) * 2, '#fff8c8', 0);
    }
    ctx.globalAlpha = 1;
    M.circle(ctx, wx + 180, wy + 70, 32, '#fff3b0', 0);
    M.circle(ctx, wx + 193, wy + 61, 28, '#1a2754', 0);
    ctx.save(); ctx.translate(wx - 100, 0);
    M.mountains(ctx, { off: 0, baseY: wy + wh + 10, height: 190, period: 200, seed: 31, color: '#2f3f7a', snow: '#c9d6ff', lw: 0 });
    ctx.restore();
    M.snowfall(ctx, lt, { n: 40, w: ww, h: wh, x: wx, y: wy, speed: 40, size: 3 });
    ctx.restore();
    M.rrect(ctx, wx, wy, ww, wh, 16, null, 14);
    M.rrect(ctx, wx, wy, ww, wh, 16, null, 6);
    M.limb(ctx, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 10, '#7a4a2a');
    M.limb(ctx, [[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], 10, '#7a4a2a');
    M.rrect(ctx, wx - 20, wy + wh - 6, ww + 40, 24, 8, '#7a4a2a');
    // шторы
    M.shape(ctx, '#d64545', function (c) { c.moveTo(wx - 50, wy - 30); c.lineTo(wx + 40, wy - 30); c.quadraticCurveTo(wx + 10, wy + 200, wx + 30, wy + wh + 40); c.lineTo(wx - 50, wy + wh + 40); c.closePath(); });
    M.shape(ctx, '#d64545', function (c) { c.moveTo(wx + ww + 50, wy - 30); c.lineTo(wx + ww - 40, wy - 30); c.quadraticCurveTo(wx + ww - 10, wy + 200, wx + ww - 30, wy + wh + 40); c.lineTo(wx + ww + 50, wy + wh + 40); c.closePath(); });
    M.rrect(ctx, wx - 80, wy - 44, ww + 160, 20, 10, '#7a4a2a');
    // пол и коврик
    M.rrect(ctx, -20, 920, W + 40, 200, 0, '#6b4430');
    for (var fx = 0; fx < W; fx += 160) M.line(ctx, fx, 925, fx - 60, H, '#5a3826', 4);
    M.ell(ctx, 1060, 1010, 700, 62, '#c0392b');
    ctx.setLineDash([18, 14]); M.ell(ctx, 1060, 1010, 640, 48, null, 4); ctx.setLineDash([]);

    // камин (уменьшен и сдвинут влево)
    ctx.save(); ctx.translate(-70, 70); ctx.scale(0.9, 0.9);
    M.rrect(ctx, 80, 300, 480, 640, [30, 30, 0, 0], '#9a8f88');
    for (var st = 0; st < 26; st++) {
      var sx = 100 + M.hash(st) * 440, sy = 320 + M.hash(st + 50) * 600;
      if (sx > 150 && sx < 490 && sy > 540) continue;
      M.ell(ctx, sx, sy, 26 + M.hash(st + 3) * 16, 16 + M.hash(st + 4) * 8, '#857a74', 3);
    }
    M.shape(ctx, '#2b1d18', function (c) { c.moveTo(150, 940); c.lineTo(150, 650); c.arc(320, 650, 170, Math.PI, 0); c.lineTo(490, 940); c.closePath(); });
    // огонь
    var fl = 0.85 + 0.15 * Math.sin(lt * 13) * Math.sin(lt * 7.3);
    [['#ff5a1f', 1], ['#ffa62b', 0.72], ['#fff1a1', 0.42]].forEach(function (layer, li) {
      for (var k = 0; k < 5; k++) {
        var cx = 230 + k * 45, hgt = (150 + 60 * Math.sin(lt * (6 + k) + k * 2)) * layer[1] * fl, wd = 52 * layer[1] + 12;
        M.shape(ctx, layer[0], function (c) {
          c.moveTo(cx - wd, 900);
          c.quadraticCurveTo(cx - wd * 0.9, 900 - hgt * 0.6, cx + Math.sin(lt * 9 + k) * 18, 900 - hgt);
          c.quadraticCurveTo(cx + wd * 0.9, 900 - hgt * 0.6, cx + wd, 900);
          c.closePath();
        }, 0);
      }
    });
    M.rrect(ctx, 190, 890, 260, 34, 16, '#7a4a2a'); M.rrect(ctx, 220, 870, 200, 30, 15, '#8f5a33');
    // полка и рамка с горами
    M.rrect(ctx, 50, 270, 540, 40, 10, '#7a4a2a');
    M.rrect(ctx, 250, 150, 140, 115, 8, '#ffd23f');
    M.rrect(ctx, 266, 166, 108, 83, 4, '#8fd3ff', 3);
    M.poly(ctx, [[268, 247], [300, 190], [330, 225], [350, 200], [372, 247]], '#ffffff', 3);
    [140, 500].forEach(function (cx, i) {
      M.rrect(ctx, cx - 14, 200, 28, 70, 6, '#fff3d6');
      var f2 = Math.sin(lt * 11 + i) * 2;
      M.shape(ctx, '#ffb347', function (c) { c.moveTo(cx - 9, 198); c.quadraticCurveTo(cx, 160 + f2, cx + 9, 198); c.closePath(); }, 3);
    });
    ctx.restore();

    // диван с семьёй — крупным планом
    var GS = 1.42;
    ctx.save(); ctx.translate(1050, 950); ctx.scale(GS, GS); ctx.translate(-1055, -940);

    // диван
    M.rrect(ctx, 640, 590, 830, 250, 50, '#4f6fc9');
    M.rrect(ctx, 670, 620, 380, 160, 40, '#5d7fd8', 4);
    M.rrect(ctx, 1060, 620, 380, 160, 40, '#5d7fd8', 4);

    // семья
    var raiseU = M.ease(M.prog(lt, 2.2, 3.0)) * (1 - M.ease(M.prog(lt, 3.8, 4.4)));
    var sipU = M.ease(M.prog(lt, 4.4, 4.8)) * (1 - M.ease(M.prog(lt, 5.7, 6.1)));
    var foam = M.prog(lt, 5.9, 6.1);
    var laugh = lt > 6.3 && lt < 8.5;
    function arms(sd) {
      var hold = [0.2, -2.0], up = [2.55, 0.35], sip = [-0.25, -2.45];
      var a = M.lerp(hold[0], up[0], raiseU), e = M.lerp(hold[1], up[1], raiseU);
      a = M.lerp(a, sip[0], sipU); e = M.lerp(e, sip[1], sipU);
      return [a, e];
    }
    var people = [
      { k: 'nikita', x: 770, y: 812, mug: 'R', mc: '#ffd23f', col: { jacket: '#2e86de', jacket2: '#1f5fa3' }, look: 0.6 },
      { k: 'dad', x: 960, y: 812, mug: 'R', mc: '#7fb8ff', col: { jacket: '#d64545', jacket2: '#a82f2f' }, look: lt > 6 ? 0.7 : 0.3, red: true },
      { k: 'katya', x: 1145, y: 790, mug: 'L', mc: '#ff9ecb', col: { jacket: '#ffc93c', jacket2: '#e0a019' }, look: -0.3 },
      { k: 'mom', x: 1320, y: 812, mug: 'L', mc: '#ffffff', col: { jacket: '#f27aa6', jacket2: '#c94b7c' }, look: -0.7 }
    ];
    var outs = [];
    people.forEach(function (p, i) {
      var out = {};
      var ar = arms();
      var free = [0.25, -1.75];
      var eyes = sipU > 0.5 ? 'closed' : (laugh || raiseU > 0.5) ? 'happy' : 'open';
      var mouth = sipU > 0.5 ? 'sip' : laugh ? 'laugh' : raiseU > 0.5 ? 'grin' : 'smile';
      if (p.k === 'katya' && foam > 0 && sipU < 0.5) { mouth = 'smile'; if (lt < 6.6) eyes = 'open'; }
      var bob = laugh ? -Math.abs(Math.sin(lt * 9 + i)) * 5 : Math.sin(lt * 1.6 + i) * 1.5;
      M.at(ctx, p.x, p.y, 0, 1, function () {
        M.person(ctx, p.k, {
          t: lt, sit: true, hat: false, sweater: true, colors: p.col, look: p.look, bounce: bob,
          eyes: eyes, mouth: mouth, redNose: p.red, foam: p.k === 'katya' ? foam : 0,
          mug: p.mug, mugColor: p.mc, mugTilt: sipU * (p.mug === 'L' ? 0.5 : -0.5), out: out,
          armL: p.mug === 'L' ? ar : free, armR: p.mug === 'R' ? ar : free
        });
      });
      outs.push(out);
    });
    // плед
    M.shape(ctx, '#c0392b', function (c) {
      c.moveTo(690, 960);
      c.lineTo(680, 815);
      for (var x = 680; x <= 1420; x += 40) c.quadraticCurveTo(x + 20, 798 + Math.sin(x * 0.05) * 6, x + 40, 812);
      c.lineTo(1430, 960); c.closePath();
    });
    ctx.save();
    ctx.beginPath(); ctx.rect(685, 812, 740, 150); ctx.clip();
    ctx.globalAlpha = 0.35;
    for (var px = 700; px < 1430; px += 70) M.line(ctx, px, 800, px - 20, 960, '#ffd1c4', 10);
    for (var py = 840; py < 960; py += 50) M.line(ctx, 680, py, 1430, py, '#ffd1c4', 10);
    ctx.restore();
    // подлокотники и низ дивана
    M.rrect(ctx, 600, 700, 110, 240, 40, '#4f6fc9');
    M.rrect(ctx, 1400, 700, 110, 240, 40, '#4f6fc9');
    M.rrect(ctx, 650, 920, 810, 50, 20, '#3f5ab0');
    ctx.restore();
    // пар над кружками
    outs.forEach(function (o, i) { if (o.mug && sipU < 0.3) M.steam(ctx, o.mug[0], o.mug[1] - 4, lt + i * 0.4, 0.8 * GS); });

    // «Дзынь!»
    if (lt > 2.95 && lt < 4.0) {
      var cu = lt - 2.95;
      outs.forEach(function (o, i) {
        if (!o.mug) return;
        for (var r = 0; r < 6; r++) {
          var a = r / 6 * TAU + i, d = 20 + cu * 90;
          ctx.globalAlpha = M.clamp(1 - cu);
          M.line(ctx, o.mug[0] + Math.cos(a) * d, o.mug[1] + Math.sin(a) * d, o.mug[0] + Math.cos(a) * (d + 16), o.mug[1] + Math.sin(a) * (d + 16), '#fff3a3', 5);
        }
      });
      ctx.globalAlpha = 1;
      M.text(ctx, TEXT.clink, 1050, 330, { size: 64, fill: '#ffd23f', stroke: M.OUT, lw: 12, scale: M.back(M.clamp(cu / 0.25)), alpha: M.clamp((1.05 - cu) / 0.25), rot: -0.08 });
    }
    // тёплый свет от камина
    var glow = ctx.createRadialGradient(220, 760, 50, 220, 760, 1300);
    glow.addColorStop(0, 'rgba(255,170,70,' + (0.28 * fl) + ')'); glow.addColorStop(1, 'rgba(255,170,70,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    var vg = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1150);
    vg.addColorStop(0, 'rgba(40,15,5,0)'); vg.addColorStop(1, 'rgba(40,15,5,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // сердечки
    for (var hh = 0; hh < 10; hh++) {
      var hs = 6.2 + hh * 0.55, ha = lt - hs;
      if (ha < 0 || ha > 2.6) continue;
      var hx = 560 + M.hash(hh + 2) * 980 + Math.sin(ha * 3 + hh) * 20;
      ctx.globalAlpha = M.clamp(ha / 0.3) * M.clamp((2.6 - ha) / 0.6);
      M.heart(ctx, hx, 430 - ha * 110, 0.5 + M.hash(hh) * 0.35, ['#ff4d6d', '#ff8fab', '#ffd23f'][hh % 3]);
      ctx.globalAlpha = 1;
    }
    // финальный титр
    if (lt > 5.0) {
      var tu = M.back(M.clamp((lt - 5.0) / 0.6));
      var pulse = 1 + Math.sin(lt * 4) * 0.06;
      M.text(ctx, TEXT.end, 1010, 140, { size: 150, weight: 900, fill: '#fff4d6', stroke: '#5a2d1a', lw: 22, shadow: 'rgba(0,0,0,0.35)', scale: tu });
      ctx.save(); ctx.font = M.font(150, 900);
      var half = ctx.measureText(TEXT.end).width / 2; ctx.restore();
      M.heart(ctx, 1010 - half * tu - 90, 140, 1.1 * pulse * tu, '#ff4d6d');
      M.heart(ctx, 1010 + half * tu + 90, 140, 1.1 * pulse * tu, '#ff4d6d');
    }
  }

  // ======================= СПИСОК СЦЕН =======================
  // start/end — секунды от начала фильма. Меняете длительность — поправьте и музыку (js/music.js).
  M.SCENES = [
    { name: 'Дорога в горы', start: 0, end: 7, draw: sceneRoad },
    { name: 'На вершине', start: 7, end: 13, draw: sceneTop },
    { name: 'Спуск', start: 13, end: 16, draw: sceneRace },
    { name: 'Трамплин и сугроб', start: 16, end: 29.5, draw: sceneJump },
    { name: 'Какао у камина', start: 29.5, end: 42, draw: sceneCocoa }
  ];
  M.DURATION = 42;
  // Переходы: в момент t экран закрыт цветом color, h — полуширина перехода
  M.TRANSITIONS = [
    { t: 0, h: 0.6, color: '#000000', side: 'after' },
    { t: 7, h: 0.35, color: '#ffffff' },
    { t: 13, h: 0.15, color: '#ffffff' },
    { t: 16, h: 0.15, color: '#ffffff' },
    { t: 29.5, h: 0.45, color: '#1a0e08' },
    { t: 42, h: 1.0, color: '#000000', side: 'before' }
  ];

  M.render = function (ctx, t) {
    t = M.clamp(t, 0, M.DURATION - 1e-6);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    var sc = M.SCENES[0];
    for (var i = 0; i < M.SCENES.length; i++) if (t >= M.SCENES[i].start) sc = M.SCENES[i];
    sc.draw(ctx, t - sc.start);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    M.TRANSITIONS.forEach(function (tr) {
      if (tr.side === 'after' && t < tr.t) return;
      if (tr.side === 'before' && t > tr.t) return;
      var a = 1 - Math.abs(t - tr.t) / tr.h;
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = tr.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    });
    ctx.restore();
  };
})();
