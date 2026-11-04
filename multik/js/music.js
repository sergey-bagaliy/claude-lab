/*
 * Музыка и звуки мультфильма — всё генерируется кодом, без чужих записей.
 * Один и тот же файл работает в браузере (window.MultikMusic) и в Node (require).
 *
 * render(sampleRate) -> { L: Float32Array, R: Float32Array, sampleRate, duration }
 *
 * Время везде в секундах от начала мультфильма. Если вы сдвигаете сцены
 * в js/scenes.js — сдвиньте и события здесь (раздел «РАСПИСАНИЕ»).
 */
(function (root) {
  'use strict';
  var DURATION = 42;
  var TAU = Math.PI * 2;
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function freq(name) {
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    var semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    var midi = 12 * (parseInt(m[3], 10) + 1) + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Детерминированный «шум» — чтобы звук был одинаковым при каждой сборке
  function makeNoise(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s / 4294967296) * 2 - 1;
    };
  }

  function tri(ph) { var p = ph - Math.floor(ph); return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; }

  // ---------- Инструменты: каждая функция возвращает (tt) => отсчёт ----------
  function lead(f, dur) {
    return function (tt) {
      var a = Math.min(1, tt / 0.012);
      var env = a * (0.55 + 0.45 * Math.exp(-tt * 9));
      if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / 0.07);
      var vib = 1 + 0.004 * Math.sin(TAU * 5.5 * tt) * Math.min(1, tt / 0.25);
      var ph = f * vib * tt;
      return env * (0.55 * tri(ph) + 0.22 * Math.tanh(3 * Math.sin(TAU * ph)) + 0.12 * Math.sin(TAU * 2 * ph));
    };
  }
  function bass(f, dur) {
    return function (tt) {
      var env = Math.min(1, tt / 0.006) * Math.exp(-tt * 5);
      if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / 0.05);
      return env * (0.7 * tri(f * tt) + 0.5 * Math.sin(TAU * f * 0.5 * tt));
    };
  }
  function stab(fs) {
    return function (tt) {
      var env = Math.min(1, tt / 0.005) * Math.exp(-tt * 11);
      var v = 0;
      for (var i = 0; i < fs.length; i++) v += Math.sin(TAU * fs[i] * tt) + 0.3 * Math.sin(TAU * 2 * fs[i] * tt);
      return env * v / fs.length;
    };
  }
  function pad(fs, dur) {
    return function (tt) {
      var env = Math.min(1, tt / 0.6) * Math.min(1, Math.max(0, (dur - tt) / 0.8));
      var v = 0;
      for (var i = 0; i < fs.length; i++) v += Math.sin(TAU * fs[i] * tt + 0.3 * Math.sin(TAU * 0.4 * tt + i));
      return env * v / fs.length;
    };
  }
  function bell(f) { // музыкальная шкатулка
    return function (tt) {
      var a = Math.min(1, tt / 0.003);
      return a * (Math.sin(TAU * f * tt) * Math.exp(-tt * 2.2) +
        0.35 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt * 5) +
        0.12 * Math.sin(TAU * 3.98 * f * tt) * Math.exp(-tt * 9));
    };
  }
  function kick() {
    return function (tt) {
      var ph = 48 * tt + (110 / 28) * (1 - Math.exp(-28 * tt));
      return Math.sin(TAU * ph) * Math.exp(-tt * 10);
    };
  }
  function snare(seed) {
    var n = makeNoise(seed);
    return function (tt) {
      return 0.55 * n() * Math.exp(-tt * 22) + 0.35 * Math.sin(TAU * 185 * tt) * Math.exp(-tt * 25);
    };
  }
  function hat(seed) {
    var n = makeNoise(seed), prev = 0;
    return function (tt) {
      var x = n(), v = x - prev; prev = x;
      return 0.5 * v * Math.exp(-tt * 45);
    };
  }
  // плавное скольжение частоты (свисток / «бойнг»)
  function glide(f0, f1, dur, wobble) {
    var ph = 0, last = 0;
    return function (tt) {
      var u = Math.min(1, tt / dur);
      var f = f0 * Math.pow(f1 / f0, u) * (1 + (wobble || 0) * Math.sin(TAU * 9 * tt));
      ph += f * (tt - last); last = tt;
      var env = Math.min(1, tt / 0.01) * Math.min(1, Math.max(0, (dur - tt) / 0.06));
      return env * (Math.sin(TAU * ph) + 0.15 * Math.sin(TAU * 2 * ph));
    };
  }
  function thump(seed) { // «БУХ» в сугроб
    var n = makeNoise(seed), lp = 0;
    return function (tt) {
      var ph = 34 * tt + (70 / 9) * (1 - Math.exp(-9 * tt));
      lp += (n() - lp) * 0.08;
      return 0.9 * Math.sin(TAU * ph) * Math.exp(-tt * 5) + 1.6 * lp * Math.exp(-tt * 3.5);
    };
  }
  function whoosh(seed, dur) {
    var n = makeNoise(seed), lp = 0, lp2 = 0;
    return function (tt) {
      var u = tt / dur;
      var k = 0.02 + 0.25 * Math.sin(Math.PI * Math.min(1, u));
      lp += (n() - lp) * k; lp2 += (lp - lp2) * k;
      return (lp - lp2) * 2.2 * Math.sin(Math.PI * Math.min(1, u));
    };
  }

  // ---------- Сборка дорожки ----------
  function render(sr) {
    sr = sr || 44100;
    var N = Math.ceil(DURATION * sr);
    var L = new Float32Array(N), R = new Float32Array(N);

    function add(t0, len, fn, gain, pan) {
      pan = pan || 0;
      var gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2;
      var gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
      var i0 = Math.round(t0 * sr), i1 = Math.min(N, Math.round((t0 + len) * sr));
      for (var i = Math.max(0, i0); i < i1; i++) {
        var v = fn((i - i0) / sr);
        L[i] += v * gl; R[i] += v * gr;
      }
    }
    // мелодия: список [длительность в долях, нота|null]
    function melody(t0, beat, list, inst, gain, pan) {
      var t = t0;
      for (var i = 0; i < list.length; i++) {
        var d = list[i][0] * beat, n = list[i][1];
        if (n) add(t, d + 0.12, inst(freq(n), d * 0.9), gain, pan);
        t += d;
      }
      return t;
    }
    var CH = {
      C: ['C4', 'E4', 'G4'], G: ['B3', 'D4', 'G4'], Am: ['C4', 'E4', 'A4'], F: ['C4', 'F4', 'A4'],
      Dm: ['D4', 'F4', 'A4'], G7: ['B3', 'F4', 'G4']
    };
    var ROOT = { C: 'C3', G: 'G2', Am: 'A2', F: 'F2', Dm: 'D3', G7: 'G2' };
    var FIFTH = { C: 'G2', G: 'D3', Am: 'E3', F: 'C3', Dm: 'A2', G7: 'D3' };

    // «Умпа»-аккомпанемент: бас на 1 и 3, аккорд на 2 и 4, барабаны
    function oompah(t0, beat, chords, drums) {
      for (var b = 0; b < chords.length; b++) {
        var bar = t0 + b * 4 * beat, c = chords[b];
        var c1 = Array.isArray(c) ? c[0] : c, c2 = Array.isArray(c) ? c[1] : c;
        add(bar, beat, bass(freq(ROOT[c1]), beat * 0.8), 0.32, -0.1);
        add(bar + beat, beat, stab(CH[c1].map(freq)), 0.16, 0.25);
        add(bar + 2 * beat, beat, bass(freq(FIFTH[c2]), beat * 0.8), 0.3, -0.1);
        add(bar + 3 * beat, beat, stab(CH[c2].map(freq)), 0.16, 0.25);
        if (drums) {
          add(bar, 0.4, kick(), 0.42, 0); add(bar + 2 * beat, 0.4, kick(), 0.42, 0);
          add(bar + beat, 0.3, snare(11 + b), 0.16, 0.05); add(bar + 3 * beat, 0.3, snare(31 + b), 0.16, 0.05);
          for (var h = 0; h < 8; h++) add(bar + h * beat / 2, 0.1, hat(77 + b * 8 + h), h % 2 ? 0.08 : 0.05, 0.35);
        }
      }
    }

    // ===================== РАСПИСАНИЕ =====================
    var B = 0.5; // 120 ударов в минуту

    // 0–16 с: дорога + вершина + спуск — весёлая тема (8 тактов)
    melody(0, B, [
      [1, 'G4'], [.5, 'C5'], [.5, 'D5'], [1, 'E5'], [1, 'G5'],
      [.5, 'F5'], [.5, 'E5'], [1, 'D5'], [1, 'B4'], [1, 'D5'],
      [.5, 'C5'], [.5, 'D5'], [1, 'E5'], [1, 'A5'], [1, 'G5'],
      [.5, 'F5'], [.5, 'E5'], [.5, 'D5'], [.5, 'C5'], [2, 'D5'],
      [1, 'G4'], [.5, 'C5'], [.5, 'D5'], [1, 'E5'], [1, 'G5'],
      [.5, 'A5'], [.5, 'G5'], [1, 'F5'], [1, 'D5'], [1, 'B4'],
      [.5, 'A4'], [.5, 'C5'], [1, 'F5'], [.5, 'E5'], [.5, 'D5'], [1, 'C5'],
      [1, 'D5'], [.5, 'E5'], [.5, 'D5'], [2, 'C5']
    ], lead, 0.2, 0.05);
    oompah(0, B, ['C', 'G', 'Am', 'F', 'C', 'G', 'F', ['G', 'C']], true);

    // 16–17.5: разгон перед трамплином — гамма вверх и барабанная дробь
    melody(16, B, [[.5, 'C5'], [.5, 'D5'], [.5, 'E5'], [.5, 'F5'], [.5, 'G5'], [.5, 'A5']], lead, 0.2, 0.05);
    for (var i = 0; i < 6; i++) add(16 + i * B, B, bass(freq('G2'), B * 0.7), 0.3, -0.1);
    for (var r = 0; r < 24; r++) add(16 + r * 0.0625, 0.1, snare(200 + r), 0.05 + 0.1 * r / 24, 0.05);

    // 17.5–18.6: полёт — трель и «бойнг»
    add(17.5, 0.5, glide(260, 900, 0.45, 0.04), 0.22, 0);
    for (var k = 0; k < 9; k++) add(17.55 + k * 0.115, 0.14, lead(freq(k % 2 ? 'D6' : 'C6'), 0.1), 0.13, 0.1);
    add(17.5, 0.3, stab(['G4', 'B4', 'D5', 'F5'].map(freq)), 0.25, 0);
    // 18.6–19.3: свисток вниз — падение
    add(18.6, 0.72, glide(1500, 260, 0.7, 0.01), 0.2, 0);
    // 19.3: БУХ!
    add(19.3, 1.4, thump(5), 0.75, 0);
    add(19.32, 1.2, whoosh(9, 1.2), 0.35, 0.3);

    // 21–29: «хохочущая» тема
    melody(21, B, [
      [.5, 'G5'], [.5, 'E5'], [.5, 'G5'], [.5, 'E5'], [1, 'C6'], [1, null],
      [.5, 'A5'], [.5, 'F5'], [.5, 'A5'], [.5, 'F5'], [1, 'C6'], [1, null],
      [.5, 'B5'], [.5, 'G5'], [.5, 'D6'], [.5, 'B5'], [.5, 'G5'], [.5, 'F5'], [1, 'D5'],
      [.5, 'E5'], [.5, 'G5'], [1, 'C6'], [1, 'C5'], [1, null]
    ], lead, 0.19, 0.05);
    oompah(21, B, ['C', 'F', 'G', 'C'], true);
    add(25.0, 0.4, glide(180, 720, 0.35, 0.06), 0.2, -0.2);   // папа выпрыгивает
    add(25.0, 0.6, whoosh(21, 0.6), 0.25, -0.2);

    // Переходы между сценами — лёгкий «вжух»
    [6.7, 12.85, 15.85].forEach(function (t, j) { add(t, 0.5, whoosh(40 + j, 0.5), 0.22, j % 2 ? 0.4 : -0.4); });
    add(10.55, 0.7, whoosh(51, 0.7), 0.2, 0.5);               // мама стартует

    // 29.8–42: уютная шкатулка у камина (80 ударов в минуту)
    var C = 0.75, t0 = 29.8;
    var cozy = [['F', ['A5', 'C6', 'A5', 'G5']], ['C', ['E5', 'G5', 'C6', null]], ['G', ['D6', 'C6', 'B5', 'G5']], ['C', ['C6', null, null, null]]];
    var ARP = { F: ['F3', 'C4', 'F4', 'A4'], C: ['C3', 'G3', 'C4', 'E4'], G: ['G2', 'D3', 'G3', 'B3'] };
    var PADC = { F: ['F3', 'A3', 'C4'], C: ['C3', 'E3', 'G3'], G: ['G2', 'B3', 'D4'] };
    cozy.forEach(function (bar, bi) {
      var bt = t0 + bi * 4 * C, ch = bar[0];
      var dur = bi === 3 ? 4.6 : 4 * C + 0.4;
      add(bt, dur, pad(PADC[ch].map(freq), dur), 0.13, 0);
      bar[1].forEach(function (n, j) {
        if (n) add(bt + j * C, bi === 3 ? 4 : 2.5, bell(freq(n)), 0.26, 0.1);
      });
      var steps = bi === 3 ? 4 : 8;
      for (var a = 0; a < steps; a++) {
        var arp = ARP[ch][[0, 1, 2, 3, 2, 1, 2, 1][a]];
        add(bt + a * C / 2, 1.6, bell(freq(arp) * 2), 0.09, a % 2 ? 0.4 : -0.4);
      }
    });
    add(32.5, 1.5, bell(freq('C7')), 0.16, 0.3);  // «Дзынь!» — кружки
    add(32.56, 1.5, bell(freq('E7')), 0.14, -0.3);
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'].forEach(function (n, j) { // титр «Наша семья»
      add(34.5 + j * 0.07, 2.5, bell(freq(n)), 0.1, -0.5 + j / 6);
    });

    // ---------- «Комната»: простое стерео-эхо ----------
    var dL = Math.round(0.137 * sr), dR = Math.round(0.173 * sr), fb = 0.18;
    for (var s = 0; s < N; s++) {
      if (s >= dL) L[s] += fb * R[s - dL];
      if (s >= dR) R[s] += fb * L[s - dR];
    }
    // ---------- Мягкий лимитер и плавный финал ----------
    var peak = 0;
    for (s = 0; s < N; s++) {
      var fade = Math.min(1, (DURATION - s / sr) / 1.2, (s / sr) / 0.05);
      L[s] = Math.tanh(L[s] * 1.1) * fade; R[s] = Math.tanh(R[s] * 1.1) * fade;
      peak = Math.max(peak, Math.abs(L[s]), Math.abs(R[s]));
    }
    var norm = peak > 0 ? 0.89 / peak : 1;
    for (s = 0; s < N; s++) { L[s] *= norm; R[s] *= norm; }
    return { L: L, R: R, sampleRate: sr, duration: DURATION };
  }

  var api = { render: render, DURATION: DURATION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MultikMusic = api;
})(typeof window !== 'undefined' ? window : this);
