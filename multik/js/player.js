/*
 * Плеер для браузера: кнопки, перемотка, звук.
 * Режим ?render=1 используется скриптом сборки видео (render/render.js):
 * интерфейс скрыт, кадры рисуются по команде window.__drawFrame(t).
 */
(function () {
  'use strict';
  var M = window.M;
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var isRender = /[?&]render=1/.test(location.search);
  var fontsReady = Promise.all([
    document.fonts.load(M.font(60, 800), 'Аа'), document.fonts.load(M.font(60, 900), 'Аа'),
    document.fonts.load(M.font(60, 800), 'Aa!'), document.fonts.load(M.font(60, 900), 'Aa!')
  ]).catch(function () {});

  if (isRender) {
    document.body.classList.add('render');
    window.__drawFrame = function (t) { M.render(ctx, t); };
    fontsReady.then(function () { M.render(ctx, 0); window.__ready = true; });
    return;
  }

  var D = M.DURATION;
  var t = 0, playing = false, startedAt = 0, startT = 0;
  var audio = null, buffer = null, source = null, gain = null, muted = false;
  var $ = function (id) { return document.getElementById(id); };
  var seek = $('seek'), timeEl = $('time'), playBtn = $('play'), muteBtn = $('mute');
  seek.max = D;

  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  // Кнопки сцен
  M.SCENES.forEach(function (sc, i) {
    var b = document.createElement('button');
    b.textContent = (i + 1) + '. ' + sc.name;
    b.onclick = function () { jump(sc.start + 0.01); if (!playing) play(); };
    $('scenes').appendChild(b);
  });
  function markScene() {
    var btns = $('scenes').children;
    for (var i = 0; i < btns.length; i++) {
      var sc = M.SCENES[i];
      btns[i].classList.toggle('on', t >= sc.start && t < sc.end);
    }
  }

  function ensureAudio() {
    if (audio) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
    gain = audio.createGain(); gain.connect(audio.destination);
    var r = window.MultikMusic.render(audio.sampleRate);
    buffer = audio.createBuffer(2, r.L.length, audio.sampleRate);
    buffer.getChannelData(0).set(r.L); buffer.getChannelData(1).set(r.R);
  }
  function startSound() {
    stopSound();
    if (!audio || !buffer) return;
    if (audio.state === 'suspended') audio.resume();
    source = audio.createBufferSource(); source.buffer = buffer; source.connect(gain);
    gain.gain.value = muted ? 0 : 1;
    source.start(0, Math.min(t, D - 0.01));
  }
  function stopSound() { if (source) { try { source.stop(); } catch (e) {} source.disconnect(); source = null; } }
  function now() { return audio ? audio.currentTime : performance.now() / 1000; }

  function play() {
    ensureAudio();
    if (t >= D - 0.05) t = 0;
    playing = true; startT = t; startedAt = now();
    startSound();
    playBtn.textContent = '❚❚';
    $('start').style.display = 'none';
  }
  function pause() { playing = false; stopSound(); playBtn.textContent = '▶'; }
  function jump(nt) {
    t = Math.max(0, Math.min(D, nt));
    if (playing) { startT = t; startedAt = now(); startSound(); }
    draw();
  }
  function draw() {
    M.render(ctx, t);
    seek.value = t; timeEl.textContent = fmt(t) + ' / ' + fmt(D);
    markScene();
  }
  function loop() {
    if (playing) {
      t = startT + (now() - startedAt);
      if (t >= D) { t = D; pause(); }
      draw();
    }
    requestAnimationFrame(loop);
  }

  $('start').onclick = play;
  playBtn.onclick = function () { playing ? pause() : play(); };
  seek.oninput = function () { jump(parseFloat(seek.value)); };
  muteBtn.onclick = function () { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; if (gain) gain.gain.value = muted ? 0 : 1; };
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') jump(t + 2);
    if (e.code === 'ArrowLeft') jump(t - 2);
  });

  fontsReady.then(function () { t = 2.2; draw(); t = 0; seek.value = 0; timeEl.textContent = fmt(0) + ' / ' + fmt(D); requestAnimationFrame(loop); });
})();
