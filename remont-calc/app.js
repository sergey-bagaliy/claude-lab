/*
 * app.js — интерфейс калькулятора: ввод комнат, параметры материалов, итог,
 * сохранение в браузере, печать в PDF. Все расчёты — в formulas.js.
 */
(function () {
  'use strict';

  var F = window.RemontFormulas;
  var CURRENT_KEY = 'remontCalc.current.v1';
  var SAVED_KEY = 'remontCalc.saved.v1';

  /* ================================================================== *
   * Описание полей для форм
   * ================================================================== */

  var TILE_FIELDS = [
    { key: 'tileLength', label: 'Длина плитки', unit: 'см' },
    { key: 'tileWidth', label: 'Ширина плитки', unit: 'см' },
    { key: 'piecesPerPack', label: 'Штук в упаковке', unit: 'шт.' }
  ];
  var PAINT_FIELDS = [
    { key: 'coverage', label: 'Укрывистость, 1 слой', unit: 'м²/л', typical: true },
    { key: 'coats', label: 'Количество слоёв', unit: 'слоя' },
    { key: 'canVolume', label: 'Объём банки', unit: 'л' }
  ];

  var MATERIAL_FIELDS = {
    tileFloor: TILE_FIELDS,
    tileWall: TILE_FIELDS,
    laminate: [{ key: 'packArea', label: 'Площадь в упаковке', unit: 'м²' }],
    paintWall: PAINT_FIELDS,
    paintCeiling: PAINT_FIELDS,
    wallpaper: [
      { key: 'rollWidth', label: 'Ширина рулона', unit: 'м' },
      { key: 'rollLength', label: 'Длина рулона', unit: 'м' },
      { key: 'rapport', label: 'Раппорт (0 — без подгонки)', unit: 'м' },
      { key: 'trim', label: 'Припуск на полосу', unit: 'м', typical: true },
      { key: 'subtractOpenings', label: 'Вычитать ширину окон и дверей', type: 'checkbox' }
    ],
    plaster: [
      { key: 'consumptionPerMm', label: 'Расход на 1 мм слоя', unit: 'кг/м²', typical: true },
      { key: 'thickness', label: 'Средняя толщина слоя', unit: 'мм' },
      { key: 'bagWeight', label: 'Вес мешка', unit: 'кг' }
    ],
    putty: [
      { key: 'consumptionPerMm', label: 'Расход на 1 мм слоя', unit: 'кг/м²', typical: true },
      { key: 'thickness', label: 'Толщина всех слоёв', unit: 'мм' },
      { key: 'bagWeight', label: 'Вес мешка', unit: 'кг' }
    ],
    primer: [
      { key: 'consumption', label: 'Расход на 1 слой', unit: 'л/м²', typical: true },
      { key: 'coats', label: 'Количество слоёв', unit: 'слоя' },
      { key: 'canisterVolume', label: 'Объём канистры', unit: 'л' }
    ]
  };

  // Цена: за что именно платим. У плитки и ламината можно выбрать — за м² или за упаковку.
  var PRICE_LABELS = {
    paintWall: 'Цена банки', paintCeiling: 'Цена банки', wallpaper: 'Цена рулона',
    plaster: 'Цена мешка', putty: 'Цена мешка', primer: 'Цена канистры'
  };
  var SWITCHABLE_PRICE = { tileFloor: true, tileWall: true, laminate: true };
  // «цена за …» — винительный падеж
  var PRICE_PER = { paintWall: 'банку', paintCeiling: 'банку', wallpaper: 'рулон', plaster: 'мешок', putty: 'мешок', primer: 'канистру' };

  var MATERIAL_HINTS = {
    tileFloor: 'Размер и количество штук — с этикетки упаковки. Запас: 10 % при прямой укладке, 15 % по диагонали (типовое значение).',
    tileWall: 'Размер и количество штук — с этикетки упаковки. Запас 10 % — типовое значение, при сложной раскладке берите больше.',
    laminate: 'Площадь в упаковке написана на коробке. Запас: 7 % при прямой укладке, 10–15 % по диагонали (типовое значение).',
    paintWall: 'Укрывистость (сколько м² покрывает 1 литр в один слой) — на банке. Если там «л/м²», разделите 1 на это число: 0,125 л/м² = 8 м²/л.',
    paintCeiling: 'Укрывистость — на банке. Если там «л/м²», разделите 1 на это число: 0,125 л/м² = 8 м²/л.',
    wallpaper: 'Считается полосами на высоту комнаты. Раппорт (шаг рисунка) — на этикетке рулона. Проёмы по умолчанию не вычитаются: обрезки уходят над дверями и под окна.',
    plaster: 'Расход на 1 мм — в инструкции на мешке (у гипсовых обычно 0,8–0,9 кг/м², у цементных больше). Толщину оцените по перепадам стен.',
    putty: 'Расход на 1 мм — на мешке. Толщина 1,5 мм — условное значение для финишного слоя, укажите свою.',
    primer: 'Расход — на канистре (обычно 0,1–0,2 л/м²). Слоёв: сколько раз грунтуете (перед штукатуркой, шпаклёвкой, покраской).'
  };

  var PLURALS = {
    tileFloor: ['упаковка', 'упаковки', 'упаковок'],
    tileWall: ['упаковка', 'упаковки', 'упаковок'],
    laminate: ['упаковка', 'упаковки', 'упаковок'],
    paintWall: ['банка', 'банки', 'банок'],
    paintCeiling: ['банка', 'банки', 'банок'],
    wallpaper: ['рулон', 'рулона', 'рулонов'],
    plaster: ['мешок', 'мешка', 'мешков'],
    putty: ['мешок', 'мешка', 'мешков'],
    primer: ['канистра', 'канистры', 'канистр']
  };

  var FLOOR_OPTIONS = [['none', 'нет'], ['laminate', 'Ламинат'], ['tile', 'Плитка']];
  var WALL_OPTIONS = [['none', 'нет'], ['paint', 'Покраска'], ['wallpaper', 'Обои'], ['tile', 'Плитка']];
  var CEILING_OPTIONS = [['none', 'нет'], ['paint', 'Покраска']];

  var ICONS = {
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ================================================================== *
   * Состояние
   * ================================================================== */

  var state = null;     // текущий расчёт
  var calc = null;      // результат F.calculateProject(state)
  var openMaterials = {}; // какие карточки материалов раскрыты пользователем

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function newOpening(type) {
    return type === 'door'
      ? { id: uid('o'), type: 'door', width: '0,9', height: '2,1', count: '1' }
      : { id: uid('o'), type: 'window', width: '1,4', height: '1,5', count: '1' };
  }

  function newRoom(number, height) {
    return {
      id: uid('r'),
      name: 'Комната ' + number,
      length: '',
      width: '',
      height: height || '2,7',
      openings: [],
      floor: 'laminate',
      walls: 'wallpaper',
      ceiling: 'paint',
      prep: {
        walls: { plaster: false, putty: true, primer: true },
        ceiling: { plaster: false, putty: true, primer: true },
        floor: { primer: false }
      },
      collapsed: false
    };
  }

  function exampleProject() {
    var room = newRoom(1);
    room.length = '4';
    room.width = '3';
    room.openings = [newOpening('window'), newOpening('door')];
    return { id: uid('p'), name: '', rooms: [room], materials: clone(F.DEFAULT_MATERIALS) };
  }

  /** Приводит загруженный расчёт к нужному виду (на случай старых или чужих файлов). */
  function normalizeProject(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.rooms)) return null;
    var materials = {};
    F.MATERIAL_ORDER.forEach(function (key) {
      materials[key] = F.materialParams(p.materials, key);
    });
    var rooms = p.rooms.map(function (r, i) {
      var base = newRoom(i + 1);
      var room = Object.assign(base, r);
      room.id = r.id || uid('r');
      room.openings = Array.isArray(r.openings) ? r.openings.map(function (o) {
        return Object.assign({ id: uid('o'), type: 'window', width: '', height: '', count: '1' }, o);
      }) : [];
      room.prep = {
        walls: Object.assign({}, base.prep.walls, r.prep && r.prep.walls),
        ceiling: Object.assign({}, base.prep.ceiling, r.prep && r.prep.ceiling),
        floor: Object.assign({}, base.prep.floor, r.prep && r.prep.floor)
      };
      return room;
    });
    return { id: p.id || uid('p'), name: p.name || '', rooms: rooms, materials: materials };
  }

  /* ---------- Хранилище браузера (может быть недоступно — тогда просто не сохраняем) ---------- */

  function readStorage(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  var saveTimer = null;
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { writeStorage(CURRENT_KEY, state); }, 300);
  }

  function getSaved() {
    var list = readStorage(SAVED_KEY);
    return Array.isArray(list) ? list : [];
  }

  function isSavedVersion() {
    var entry = getSaved().find(function (s) { return s.id === state.id; });
    return !!entry && JSON.stringify(entry.project) === JSON.stringify(state);
  }

  function hasContent() {
    return state.rooms.some(function (r) { return F.toNumber(r.length) > 0 || F.toNumber(r.width) > 0; });
  }

  /* ================================================================== *
   * Форматирование
   * ================================================================== */

  var nf = {};
  function fmt(n, digits) {
    var d = digits === undefined ? 2 : digits;
    if (!nf[d]) nf[d] = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d });
    return nf[d].format(F.round(n, d));
  }
  function money(n) { return fmt(Math.round(n), 0) + ' ₽'; }

  function plural(n, forms) {
    var a = Math.abs(n) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Значение для поля ввода: числа показываем с запятой. */
  function inputValue(v) {
    if (typeof v === 'number') return String(v).replace('.', ',');
    return v === undefined || v === null ? '' : String(v);
  }

  function isInvalidNumber(v) {
    var s = String(v === undefined || v === null ? '' : v).trim();
    if (s === '') return false;
    var n = F.parseNumber(s);
    return !isFinite(n) || n < 0;
  }

  function formatDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  /* ================================================================== *
   * Комнаты
   * ================================================================== */

  function numberField(label, field, value, extra) {
    return '<label class="field"><span>' + label + '</span>' +
      '<input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" ' + extra +
      ' data-field="' + field + '" value="' + esc(inputValue(value)) + '"' +
      (isInvalidNumber(value) ? ' class="invalid"' : '') + '></label>';
  }

  function selectHTML(options, value, attrs) {
    return '<select class="select" ' + attrs + '>' + options.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === value ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }

  function chip(label, path, checked) {
    return '<label class="chip"><input type="checkbox" data-prep="' + path + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + label + '</span></label>';
  }

  function openingHTML(o) {
    function f(label, field, value, mode) {
      return '<label class="field"><span>' + label + '</span><input type="text" inputmode="' + (mode || 'decimal') +
        '" autocomplete="off" enterkeyhint="next" data-ofield="' + field + '" value="' + esc(inputValue(value)) + '"' +
        (isInvalidNumber(value) ? ' class="invalid"' : '') + '></label>';
    }
    return '<div class="opening" data-opening="' + o.id + '">' +
      '<label class="field"><span>Проём</span>' +
      selectHTML([['window', 'Окно'], ['door', 'Дверь']], o.type, 'data-ofield="type"') + '</label>' +
      f('Ширина', 'width', o.width) +
      f('Высота', 'height', o.height) +
      f('Шт.', 'count', o.count, 'numeric') +
      '<button type="button" class="icon-btn danger" data-action="delete-opening" aria-label="Удалить проём">' + ICONS.close + '</button>' +
      '</div>';
  }

  function roomHTML(room) {
    var p = room.prep;
    return '<section class="card room' + (room.collapsed ? ' collapsed' : '') + '" data-room="' + room.id + '">' +
      '<div class="room-head">' +
        '<input class="room-name" type="text" data-field="name" value="' + esc(room.name) + '" aria-label="Название комнаты" autocomplete="off" enterkeyhint="next">' +
        '<button type="button" class="icon-btn" data-action="copy-room" aria-label="Копировать комнату" title="Копировать">' + ICONS.copy + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-room" aria-label="Удалить комнату" title="Удалить">' + ICONS.trash + '</button>' +
        '<button type="button" class="icon-btn toggle" data-action="toggle-room" aria-label="Свернуть или развернуть" title="Свернуть">' + ICONS.chevron + '</button>' +
      '</div>' +
      '<div class="room-body">' +
        '<div class="grid3">' +
          numberField('Длина, м', 'length', room.length, '') +
          numberField('Ширина, м', 'width', room.width, '') +
          numberField('Высота, м', 'height', room.height, '') +
        '</div>' +
        '<div class="subhead">Окна и двери <span class="muted small">(размеры в метрах)</span></div>' +
        room.openings.map(openingHTML).join('') +
        '<div class="row-btns">' +
          '<button type="button" class="btn btn-small" data-action="add-window">+ Окно</button>' +
          '<button type="button" class="btn btn-small" data-action="add-door">+ Дверь</button>' +
        '</div>' +
        '<div class="subhead">Отделка</div>' +
        '<div class="surface"><div class="surface-row"><b>Пол</b>' + selectHTML(FLOOR_OPTIONS, room.floor, 'data-field="floor" aria-label="Пол"') + '</div>' +
          '<div class="chips">' + chip('грунт', 'floor.primer', p.floor.primer) + '</div></div>' +
        '<div class="surface"><div class="surface-row"><b>Стены</b>' + selectHTML(WALL_OPTIONS, room.walls, 'data-field="walls" aria-label="Стены"') + '</div>' +
          '<div class="chips">' + chip('штукатурка', 'walls.plaster', p.walls.plaster) + chip('шпаклёвка', 'walls.putty', p.walls.putty) +
          chip('грунт', 'walls.primer', p.walls.primer) + '</div></div>' +
        '<div class="surface"><div class="surface-row"><b>Потолок</b>' + selectHTML(CEILING_OPTIONS, room.ceiling, 'data-field="ceiling" aria-label="Потолок"') + '</div>' +
          '<div class="chips">' + chip('штукатурка', 'ceiling.plaster', p.ceiling.plaster) + chip('шпаклёвка', 'ceiling.putty', p.ceiling.putty) +
          chip('грунт', 'ceiling.primer', p.ceiling.primer) + '</div></div>' +
      '</div>' +
      '<div class="room-summary" data-room-summary></div>' +
      '</section>';
  }

  function renderRooms() {
    var box = document.getElementById('rooms');
    box.innerHTML = state.rooms.length
      ? state.rooms.map(roomHTML).join('')
      : '<div class="card empty">Комнат пока нет. Нажмите «Добавить комнату».</div>';
  }

  function roomSummaryHTML(r) {
    var g = r.geometry;
    var parts = [];
    if (g.floorArea > 0) parts.push('Пол <b>' + fmt(g.floorArea) + ' м²</b>');
    if (g.wallGross > 0) {
      parts.push('Стены <b>' + fmt(g.wallNet) + ' м²</b>' +
        (g.openingsArea > 0 ? ' (без проёмов ' + fmt(g.openingsArea) + ' м²)' : ''));
    }
    if (g.perimeter > 0) parts.push('Периметр ' + fmt(g.perimeter) + ' м');
    var html = parts.join(' · ');
    if (g.warnings.length) {
      html += (html ? '<br>' : '') + '<span class="warn">⚠ ' + esc(g.warnings.join('; ')) + '</span>';
    }
    return html || '<span class="muted">Введите размеры</span>';
  }

  function updateRoomSummaries() {
    calc.rooms.forEach(function (r) {
      var el = document.querySelector('[data-room="' + r.id + '"] [data-room-summary]');
      if (el) el.innerHTML = roomSummaryHTML(r);
    });
  }

  function findRoom(id) {
    return state.rooms.find(function (r) { return r.id === id; });
  }

  /* ================================================================== *
   * Материалы
   * ================================================================== */

  function materialFieldHTML(key, f, params) {
    var value = params[f.key];
    var attrs = 'data-mat="' + key + '" data-param="' + f.key + '"';
    if (f.type === 'checkbox') {
      return '<label class="check-field"><input type="checkbox" ' + attrs + (value ? ' checked' : '') + '>' + f.label + '</label>';
    }
    return '<label class="field"><span>' + f.label + (f.typical ? ' <i class="typical">типовое</i>' : '') + '</span>' +
      '<span class="unit-input"><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" ' + attrs +
      ' value="' + esc(inputValue(value)) + '"' + (isInvalidNumber(value) ? ' class="invalid"' : '') + '><em>' + f.unit + '</em></span></label>';
  }

  function priceFieldHTML(key, params) {
    var attrs = 'data-mat="' + key + '" data-param="price"';
    var input = '<input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" ' + attrs +
      ' value="' + esc(params.price ? inputValue(params.price) : '') + '" placeholder="0"' +
      (isInvalidNumber(params.price) ? ' class="invalid"' : '') + '>';
    if (SWITCHABLE_PRICE[key]) {
      return '<label class="field"><span>Цена, ₽</span><span class="unit-input">' + input + '<em>₽</em></span></label>' +
        '<label class="field"><span>Цена указана</span>' +
        selectHTML([['m2', 'за м²'], ['pack', 'за упаковку']], params.priceUnit, 'data-mat="' + key + '" data-param="priceUnit"') +
        '</label>';
    }
    return '<label class="field"><span>' + PRICE_LABELS[key] + '</span><span class="unit-input">' + input + '<em>₽</em></span></label>';
  }

  function renderMaterials() {
    var html = F.MATERIAL_ORDER.map(function (key) {
      var params = state.materials[key];
      var fields = MATERIAL_FIELDS[key].map(function (f) { return materialFieldHTML(key, f, params); }).join('');
      var reserve = materialFieldHTML(key, { key: 'reserve', label: 'Запас', unit: '%', typical: true }, params);
      return '<details class="card material" data-material="' + key + '">' +
        '<summary><span><span class="mat-title">' + F.MATERIAL_TITLES[key] + '</span><br>' +
        '<span class="mat-usage" data-mat-usage="' + key + '"></span></span></summary>' +
        '<div class="grid2">' + fields + reserve + priceFieldHTML(key, params) + '</div>' +
        '<p class="mat-hint">' + MATERIAL_HINTS[key] + '</p>' +
        '</details>';
    }).join('');
    document.getElementById('materials').innerHTML = html;
    updateMaterialUsage();
  }

  /**
   * Строка под названием материала: сколько нужно и в каких комнатах.
   * Карточка раскрыта, если материал используется, — пока пользователь сам её не открыл или не закрыл.
   */
  function updateMaterialUsage() {
    F.MATERIAL_ORDER.forEach(function (key) {
      var details = document.querySelector('[data-material="' + key + '"]');
      if (!details) return;
      var m = calc.materials.find(function (x) { return x.key === key; });
      var rooms = calc.rooms.filter(function (r) { return r.areas[key] > 0; }).map(function (r) { return r.name || 'без названия'; });
      var usage = details.querySelector('[data-mat-usage]');
      if (m) {
        usage.textContent = m.packs + ' ' + plural(m.packs, PLURALS[key]) + ' · ' + fmt(m.area) + ' м² · ' + rooms.join(', ');
      } else {
        usage.textContent = 'не выбран ни в одной комнате';
      }
      details.classList.toggle('unused', !m);
      var shouldOpen = openMaterials[key] !== undefined ? openMaterials[key] : !!m;
      if (details.open !== shouldOpen) details.open = shouldOpen;
    });
  }

  /* ================================================================== *
   * Итог
   * ================================================================== */

  /** Пояснение расчёта по материалу — строки «откуда взялись цифры». */
  function materialLines(m, p) {
    var r = F.toNumber(p.reserve);
    var reserve = r > 0 ? ' (+' + fmt(r, 1) + ' %)' : '';
    var lines = [];
    var units = PLURALS[m.key];
    switch (m.key) {
      case 'tileFloor':
      case 'tileWall':
        lines.push('Площадь ' + fmt(m.area) + ' м², с запасом' + reserve + ' ' + fmt(m.amount) + ' м²');
        lines.push(m.pieces + ' шт. плитки ' + fmt(F.toNumber(p.tileLength), 1) + '×' + fmt(F.toNumber(p.tileWidth), 1) +
          ' см → ' + m.packs + ' ' + plural(m.packs, units) + ' по ' + fmt(m.packArea, 3) + ' м² = ' + fmt(m.boughtArea, 3) + ' м²');
        break;
      case 'laminate':
        lines.push('Площадь ' + fmt(m.area) + ' м², с запасом' + reserve + ' ' + fmt(m.amount) + ' м²');
        lines.push(m.packs + ' ' + plural(m.packs, units) + ' по ' + fmt(m.packArea, 3) + ' м² = ' + fmt(m.boughtArea, 3) + ' м²');
        break;
      case 'paintWall':
      case 'paintCeiling':
        lines.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(F.toNumber(p.coats), 1) + ' ' +
          plural(F.toNumber(p.coats), ['слой', 'слоя', 'слоёв']) + ' ÷ ' + fmt(F.toNumber(p.coverage)) + ' м²/л');
        lines.push('С запасом' + reserve + ' ' + fmt(m.amount) + ' л → ' + m.packs + ' ' + plural(m.packs, units) + ' по ' + fmt(F.toNumber(p.canVolume)) + ' л');
        break;
      case 'wallpaper':
        lines.push('Стены ' + fmt(m.area) + ' м²; полос ' + m.strips + ', с запасом' + reserve + ' ' + m.stripsWithReserve);
        m.groups.forEach(function (g) {
          lines.push('Полоса ' + fmt(g.stripLength) + ' м: ' + g.stripsPerRoll + ' из рулона → ' + g.rolls + ' ' + plural(g.rolls, units));
        });
        break;
      case 'plaster':
      case 'putty':
        lines.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(F.toNumber(p.thickness)) + ' мм × ' + fmt(F.toNumber(p.consumptionPerMm)) + ' кг/м²');
        lines.push('С запасом' + reserve + ' ' + fmt(m.amount, 1) + ' кг → ' + m.packs + ' ' + plural(m.packs, units) + ' по ' + fmt(F.toNumber(p.bagWeight)) + ' кг');
        break;
      case 'primer':
        lines.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(F.toNumber(p.coats), 1) + ' ' +
          plural(F.toNumber(p.coats), ['слой', 'слоя', 'слоёв']) + ' × ' + fmt(F.toNumber(p.consumption), 3) + ' л/м²');
        lines.push('С запасом' + reserve + ' ' + fmt(m.amount) + ' л → ' + m.packs + ' ' + plural(m.packs, units) + ' по ' + fmt(F.toNumber(p.canisterVolume)) + ' л');
        break;
    }
    return lines;
  }

  function priceText(m, p) {
    if (!m.priced) return 'цена не указана';
    var unit = SWITCHABLE_PRICE[m.key] ? (p.priceUnit === 'pack' ? 'упаковку' : 'м²') : PRICE_PER[m.key];
    return fmt(F.toNumber(p.price)) + ' ₽ за ' + unit;
  }

  function buyText(m) {
    var s = m.packs + ' ' + plural(m.packs, PLURALS[m.key]);
    if (m.boughtArea) s += ' (' + fmt(m.boughtArea, 2) + ' м²)';
    return s;
  }

  function renderSummary() {
    var box = document.getElementById('summary');
    if (!calc.materials.length) {
      box.innerHTML = '<div class="card empty">Пока нечего считать: введите размеры комнат и выберите отделку.</div>';
      return;
    }
    var rows = calc.materials.map(function (m) {
      var p = state.materials[m.key];
      var lines = materialLines(m, p);
      lines.push(priceText(m, p));
      return '<div class="result-row">' +
        '<div class="result-head"><b>' + esc(m.title) + '</b><span class="result-cost">' + (m.priced ? money(m.cost) : '—') + '</span></div>' +
        '<div class="result-buy">' + buyText(m) + '</div>' +
        '<div class="result-lines">' + lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
        (m.errors.length ? '<div class="error small">⚠ ' + esc(m.errors.join('; ')) + '</div>' : '') +
        '</div>';
    }).join('');

    var missing = calc.materials.filter(function (m) { return !m.priced; }).map(function (m) { return m.title; });
    var roomRows = calc.rooms.map(function (r) {
      var g = r.geometry;
      var areas = F.MATERIAL_ORDER.filter(function (k) { return r.areas[k] > 0; }).map(function (k) {
        return F.MATERIAL_TITLES[k].toLowerCase() + ' ' + fmt(r.areas[k]) + ' м²';
      });
      return '<div class="room-break"><b>' + esc(r.name || 'Без названия') + '</b> — ' +
        fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height) + ' м<br>' +
        '<span class="muted">' + (areas.length ? esc(areas.join(', ')) : 'отделка не выбрана') + '</span></div>';
    }).join('');

    box.innerHTML =
      '<div class="card"><h2 class="card-title">Что купить</h2>' + rows +
        '<div class="grand-total"><span>Итого</span><span>' + money(calc.totalCost) + '</span></div>' +
        (missing.length ? '<p class="error small">Не указаны цены: ' + esc(missing.join(', ')) +
          '. Введите их на вкладке «Материалы».</p>' : '') +
        '<p class="small muted">Нормы расхода — типовые значения, проверьте по упаковке.</p>' +
      '</div>' +
      '<div class="card"><h2 class="card-title">По комнатам</h2>' + roomRows + '</div>';
  }

  function renderHeader() {
    document.getElementById('header-total').textContent = money(calc.totalCost);
    var note = '';
    if (calc.missingPrices > 0) note = 'нет цен: ' + calc.missingPrices;
    document.getElementById('header-note').textContent = note;
  }

  /* ---------- Сохранённые расчёты ---------- */

  function renderSaved() {
    var list = getSaved().slice().sort(function (a, b) { return b.savedAt - a.savedAt; });
    var box = document.getElementById('saved-list');
    if (!list.length) {
      box.innerHTML = '<p class="small muted">Пока ничего не сохранено.</p>';
      return;
    }
    box.innerHTML = list.map(function (s) {
      var rooms = (s.project.rooms || []).length;
      return '<div class="saved-item' + (s.id === state.id ? ' current' : '') + '" data-saved="' + esc(s.id) + '">' +
        '<div class="saved-info"><b>' + esc(s.name) + '</b><span>' + formatDate(s.savedAt) + ' · ' + rooms + ' ' +
        plural(rooms, ['комната', 'комнаты', 'комнат']) + (s.total ? ' · ' + money(s.total) : '') + '</span></div>' +
        '<button type="button" class="btn btn-small" data-action="open-saved">Открыть</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-saved" aria-label="Удалить расчёт">' + ICONS.trash + '</button>' +
        '</div>';
    }).join('');
  }

  /* ================================================================== *
   * Печать / PDF
   * ================================================================== */

  function renderPrint() {
    var title = state.name ? esc(state.name) : 'Без названия';
    var roomRows = calc.rooms.map(function (r) {
      var src = findRoom(r.id) || {};
      var g = r.geometry;
      var finish = [
        'пол: ' + optionLabel(FLOOR_OPTIONS, src.floor),
        'стены: ' + optionLabel(WALL_OPTIONS, src.walls),
        'потолок: ' + optionLabel(CEILING_OPTIONS, src.ceiling)
      ].join('; ');
      return '<tr><td>' + esc(r.name) + '</td><td class="num">' + fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height) +
        '</td><td class="num">' + fmt(g.floorArea) + '</td><td class="num">' + fmt(g.wallNet) + '</td><td class="num">' +
        fmt(g.openingsArea) + '</td><td class="calc">' + esc(finish) + '</td></tr>';
    }).join('');

    var matRows = calc.materials.map(function (m) {
      var p = state.materials[m.key];
      return '<tr><td><b>' + esc(m.title) + '</b></td><td class="calc">' + materialLines(m, p).map(esc).join('<br>') +
        (m.errors.length ? '<br>⚠ ' + esc(m.errors.join('; ')) : '') + '</td>' +
        '<td class="buy"><b>' + esc(buyText(m)) + '</b></td><td class="num">' + esc(m.priced ? priceText(m, p) : '—') +
        '</td><td class="num">' + (m.priced ? money(m.cost) : '—') + '</td></tr>';
    }).join('');

    document.getElementById('print').innerHTML =
      '<h1>Расчёт материалов для ремонта</h1>' +
      '<div class="meta">Объект: <b>' + title + '</b><br>Дата: ' + new Date().toLocaleDateString('ru-RU') + '</div>' +
      '<h2>Комнаты</h2>' +
      (roomRows ? '<table class="room-table"><thead><tr><th>Комната</th><th class="num">Д × Ш × В, м</th><th class="num">Пол, м²</th>' +
        '<th class="num">Стены, м²</th><th class="num">Проёмы, м²</th><th>Отделка</th></tr></thead><tbody>' + roomRows + '</tbody></table>'
        : '<p>Комнаты не заданы.</p>') +
      '<h2>Материалы</h2>' +
      (matRows ? '<table class="mat-table"><thead><tr><th>Материал</th><th>Расчёт</th><th>Купить</th><th class="num">Цена</th>' +
        '<th class="num">Сумма</th></tr></thead><tbody>' + matRows + '</tbody>' +
        '<tfoot><tr><td colspan="4">Итого</td><td class="num">' + money(calc.totalCost) + '</td></tr></tfoot></table>'
        : '<p>Материалы не выбраны.</p>') +
      '<p class="footnote">Нормы расхода — типовые значения, перед покупкой проверьте по упаковке. ' +
      'Количество округлено вверх до целых упаковок, запас указан в расчёте. ' +
      'Не учтены: клей для плитки, затирка, подложка, плинтус, откосы.</p>';
  }

  function optionLabel(options, value) {
    var o = options.find(function (x) { return x[0] === value; });
    return o ? o[1].toLowerCase() : 'нет';
  }

  /* ================================================================== *
   * Общий пересчёт
   * ================================================================== */

  function refresh() {
    calc = F.calculateProject(state);
    renderHeader();
    updateRoomSummaries();
    updateMaterialUsage();
    renderSummary();
    scheduleAutosave();
  }

  function renderAll() {
    calc = F.calculateProject(state);
    document.getElementById('project-name').value = state.name || '';
    renderRooms();
    renderMaterials();
    renderSaved();
    refresh();
  }

  /* ================================================================== *
   * Обработчики событий
   * ================================================================== */

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (name === 'summary') renderSaved();
    window.scrollTo(0, 0);
  }

  var toastTimer = null;
  function toast(text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function onInput(e) {
    var t = e.target;
    var roomEl = t.closest('[data-room]');

    if (t.dataset.project === 'name') {
      state.name = t.value;
      scheduleAutosave();
      return;
    }

    if (t.dataset.mat && t.dataset.param) {
      var params = state.materials[t.dataset.mat];
      params[t.dataset.param] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.type === 'text') t.classList.toggle('invalid', isInvalidNumber(t.value));
      refresh();
      return;
    }

    if (!roomEl) return;
    var room = findRoom(roomEl.dataset.room);
    if (!room) return;

    if (t.dataset.prep) {
      var path = t.dataset.prep.split('.');
      room.prep[path[0]][path[1]] = t.checked;
    } else if (t.dataset.ofield) {
      var oEl = t.closest('[data-opening]');
      var opening = room.openings.find(function (o) { return o.id === oEl.dataset.opening; });
      if (opening) opening[t.dataset.ofield] = t.value;
      if (t.type === 'text') t.classList.toggle('invalid', isInvalidNumber(t.value));
    } else if (t.dataset.field) {
      room[t.dataset.field] = t.value;
      if (t.type === 'text' && t.dataset.field !== 'name') t.classList.toggle('invalid', isInvalidNumber(t.value));
    }
    refresh();
  }

  function confirmLeave() {
    if (!hasContent() || isSavedVersion()) return true;
    return window.confirm('Текущий расчёт не сохранён в списке. Продолжить? (Сохранить можно кнопкой «Сохранить».)');
  }

  function saveCurrent() {
    var list = getSaved();
    var name = (state.name || '').trim() || 'Расчёт от ' + new Date().toLocaleDateString('ru-RU');
    var entry = { id: state.id, name: name, savedAt: Date.now(), total: calc.totalCost, project: clone(state) };
    var i = list.findIndex(function (s) { return s.id === state.id; });
    if (i >= 0) list[i] = entry; else list.push(entry);
    if (writeStorage(SAVED_KEY, list)) {
      toast('Сохранено: ' + name);
    } else {
      toast('Не удалось сохранить: браузер запретил хранение. Скачайте файл.');
    }
    renderSaved();
  }

  function shareText() {
    var lines = ['Материалы' + (state.name ? ': ' + state.name : '')];
    calc.materials.forEach(function (m) {
      lines.push('• ' + m.title + ' — ' + buyText(m) + (m.priced ? ' — ' + money(m.cost) : ''));
    });
    lines.push('Итого: ' + money(calc.totalCost));
    return lines.join('\n');
  }

  function share() {
    if (!calc.materials.length) { toast('Сначала введите комнаты'); return; }
    var text = shareText();
    if (navigator.share) {
      navigator.share({ title: 'Расчёт материалов', text: text }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Список скопирован — вставьте в мессенджер'); },
        function () { window.prompt('Скопируйте список:', text); });
    } else {
      window.prompt('Скопируйте список:', text);
    }
  }

  function exportFile() {
    var data = JSON.stringify({ app: 'remont-calc', version: 1, project: state }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    var name = (state.name || 'расчёт').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'расчёт';
    a.href = URL.createObjectURL(blob);
    a.download = 'ремонт - ' + name + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try { parsed = JSON.parse(reader.result); } catch (e) { parsed = null; }
      var project = normalizeProject(parsed && parsed.project ? parsed.project : parsed);
      if (!project) { toast('Это не файл расчёта'); return; }
      if (!confirmLeave()) return;
      state = project;
      renderAll();
      showTab('rooms');
      toast('Расчёт загружен');
    };
    reader.readAsText(file);
  }

  function onClick(e) {
    var tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { showTab(tabBtn.dataset.tab); return; }

    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var roomEl = btn.closest('[data-room]');
    var room = roomEl ? findRoom(roomEl.dataset.room) : null;

    switch (action) {
      case 'goto-summary':
        showTab('summary');
        break;

      case 'add-room': {
        var last = state.rooms[state.rooms.length - 1];
        var r = newRoom(state.rooms.length + 1, last ? last.height : undefined);
        state.rooms.push(r);
        renderRooms();
        refresh();
        var el = document.querySelector('[data-room="' + r.id + '"]');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.querySelector('[data-field="length"]').focus({ preventScroll: true });
        break;
      }

      case 'copy-room': {
        var copy = clone(room);
        copy.id = uid('r');
        copy.name = room.name + ' (копия)';
        copy.collapsed = false;
        copy.openings.forEach(function (o) { o.id = uid('o'); });
        state.rooms.splice(state.rooms.indexOf(room) + 1, 0, copy);
        renderRooms();
        refresh();
        document.querySelector('[data-room="' + copy.id + '"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Комната скопирована');
        break;
      }

      case 'delete-room':
        if (window.confirm('Удалить «' + (room.name || 'комнату') + '»?')) {
          state.rooms.splice(state.rooms.indexOf(room), 1);
          renderRooms();
          refresh();
        }
        break;

      case 'toggle-room':
        room.collapsed = !room.collapsed;
        roomEl.classList.toggle('collapsed', room.collapsed);
        scheduleAutosave();
        break;

      case 'add-window':
      case 'add-door': {
        var o = newOpening(action === 'add-door' ? 'door' : 'window');
        room.openings.push(o);
        renderRooms();
        refresh();
        var oEl = document.querySelector('[data-opening="' + o.id + '"] [data-ofield="width"]');
        if (oEl) oEl.focus();
        break;
      }

      case 'delete-opening': {
        var id = btn.closest('[data-opening]').dataset.opening;
        room.openings = room.openings.filter(function (x) { return x.id !== id; });
        renderRooms();
        refresh();
        break;
      }

      case 'reset-norms':
        if (window.confirm('Вернуть типовые нормы расхода и запас для всех материалов? Цены останутся.')) {
          F.MATERIAL_ORDER.forEach(function (key) {
            var d = clone(F.DEFAULT_MATERIALS[key]);
            d.price = state.materials[key].price;
            d.priceUnit = state.materials[key].priceUnit || d.priceUnit;
            state.materials[key] = d;
          });
          renderMaterials();
          refresh();
          toast('Нормы сброшены');
        }
        break;

      case 'save':
        saveCurrent();
        break;

      case 'print':
        renderPrint();
        window.print();
        break;

      case 'share':
        share();
        break;

      case 'export':
        exportFile();
        break;

      case 'new-project':
        if (!confirmLeave()) return;
        var materials = clone(state.materials); // цены и нормы переносим в новый расчёт
        state = { id: uid('p'), name: '', rooms: [newRoom(1)], materials: materials };
        renderAll();
        showTab('rooms');
        toast('Новый расчёт. Цены и нормы сохранены.');
        break;

      case 'open-saved': {
        var sid = btn.closest('[data-saved]').dataset.saved;
        var entry = getSaved().find(function (s) { return s.id === sid; });
        if (!entry) return;
        if (entry.id !== state.id && !confirmLeave()) return;
        state = normalizeProject(entry.project);
        renderAll();
        showTab('rooms');
        toast('Открыт: ' + entry.name);
        break;
      }

      case 'delete-saved': {
        var did = btn.closest('[data-saved]').dataset.saved;
        var list = getSaved();
        var item = list.find(function (s) { return s.id === did; });
        if (item && window.confirm('Удалить сохранённый расчёт «' + item.name + '»?')) {
          writeStorage(SAVED_KEY, list.filter(function (s) { return s.id !== did; }));
          renderSaved();
        }
        break;
      }
    }
  }

  /** Enter в поле — переход к следующему полю (удобно на телефоне). */
  function onKeydown(e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'file') return;
    var panel = e.target.closest('.panel');
    if (!panel) return;
    e.preventDefault();
    var inputs = Array.prototype.filter.call(panel.querySelectorAll('input[type="text"]'), function (el) {
      return el.offsetParent !== null;
    });
    var next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus(); else e.target.blur();
  }

  /** При входе в числовое поле выделяем значение, чтобы сразу ввести новое. */
  function onFocusIn(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' && t.inputMode && (t.inputMode === 'decimal' || t.inputMode === 'numeric')) {
      setTimeout(function () { try { t.select(); } catch (err) { /* ничего */ } }, 0);
    }
  }

  /* ================================================================== *
   * Запуск
   * ================================================================== */

  function init() {
    state = normalizeProject(readStorage(CURRENT_KEY)) || exampleProject();

    document.addEventListener('input', onInput);
    document.addEventListener('change', function (e) {
      // select и checkbox: на некоторых телефонах событие input у них не приходит
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onInput(e);
      if (e.target.id === 'import-file' && e.target.files[0]) {
        importFile(e.target.files[0]);
        e.target.value = '';
      }
    });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('focusin', onFocusIn);
    // Запоминаем, что пользователь сам открыл или закрыл карточку материала.
    document.getElementById('materials').addEventListener('click', function (e) {
      var summary = e.target.closest('summary');
      if (!summary) return;
      var details = summary.parentElement;
      openMaterials[details.dataset.material] = !details.open;
    });
    window.addEventListener('beforeprint', renderPrint);

    renderAll();

    // Работа без интернета: кэшируем файлы сайта (только при открытии по http/https).
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  init();
})();
