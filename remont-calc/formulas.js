/*
 * formulas.js — все формулы калькулятора материалов для ремонта.
 *
 * Файл не зависит от страницы. В браузере он доступен как window.RemontFormulas,
 * в Node.js — через require('./formulas.js') (так его подключают тесты).
 *
 * Единицы измерения:
 *   размеры комнат, окон и дверей — метры (м);
 *   площадь — квадратные метры (м²);
 *   размер плитки — сантиметры (см);
 *   толщина слоя штукатурки и шпаклёвки — миллиметры (мм);
 *   краска и грунт — литры (л), сухие смеси — килограммы (кг);
 *   запас — проценты (%), цены — рубли.
 *
 * ВАЖНО: нормы расхода в DEFAULT_MATERIALS — типовые значения.
 * Перед покупкой их нужно проверить по упаковке конкретного материала.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RemontFormulas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. Нормы и параметры материалов по умолчанию
   *    Все значения — «типовое значение, проверить по упаковке».
   * ------------------------------------------------------------------ */

  var DEFAULT_MATERIALS = {
    // Плитка на пол. 60×60 см, 4 шт. в упаковке = 1,44 м² — частая фасовка керамогранита.
    // Запас 10 % — на подрезку при прямой укладке (по диагонали берут 15 %).
    tileFloor: { tileLength: 60, tileWidth: 60, piecesPerPack: 4, reserve: 10, price: 0, priceUnit: 'm2' },

    // Плитка на стены. 30×60 см, 8 шт. в упаковке = 1,44 м².
    tileWall: { tileLength: 30, tileWidth: 60, piecesPerPack: 8, reserve: 10, price: 0, priceUnit: 'm2' },

    // Ламинат. В упаковке 2,397 м² (например, 9 досок 1380×193 мм).
    // Запас 7 % — прямая укладка (по диагонали берут 10–15 %).
    laminate: { packArea: 2.397, reserve: 7, price: 0, priceUnit: 'm2' },

    // Краска для стен. Укрывистость 8 м² с 1 литра на один слой
    // (у разных красок — примерно от 7 до 14 м²/л, смотрите на банке). 2 слоя, банка 9 л.
    paintWall: { coverage: 8, coats: 2, canVolume: 9, reserve: 10, price: 0 },

    // Краска для потолка — те же типовые значения, что и для стен.
    paintCeiling: { coverage: 8, coats: 2, canVolume: 9, reserve: 10, price: 0 },

    // Обои. Метровые: ширина 1,06 м, длина рулона 10,05 м. Раппорт 0 — без подгонки рисунка.
    // Припуск на подрезку 0,1 м на полосу (по 5 см сверху и снизу).
    // subtractOpenings: false — ширину окон и дверей не вычитаем (обрезки уйдут над/под проёмы).
    wallpaper: { rollWidth: 1.06, rollLength: 10.05, rapport: 0, trim: 0.1, subtractOpenings: false, reserve: 5, price: 0 },

    // Штукатурка гипсовая. 0,85 кг/м² на 1 мм слоя
    // (у Кнауф-Ротбанд по данным производителя ~8,5 кг/м² при слое 10 мм).
    // Средняя толщина слоя 10 мм, мешок 30 кг.
    plaster: { consumptionPerMm: 0.85, thickness: 10, bagWeight: 30, reserve: 10, price: 0 },

    // Шпаклёвка финишная. 1,2 кг/м² на 1 мм слоя (так у Vetonit LR+ по техкарте).
    // Суммарная толщина 1,5 мм — условное значение, задайте своё. Мешок 20 кг.
    putty: { consumptionPerMm: 1.2, thickness: 1.5, bagWeight: 20, reserve: 10, price: 0 },

    // Грунт. 0,15 л/м² на один слой (у Ceresit CT 17 по данным производителя 0,1–0,2 л/м²).
    // 2 слоя — грунтуют перед штукатуркой/шпаклёвкой и перед финишной отделкой. Канистра 10 л.
    primer: { consumption: 0.15, coats: 2, canisterVolume: 10, reserve: 10, price: 0 }
  };

  // Порядок вывода и названия материалов.
  var MATERIAL_ORDER = ['tileFloor', 'tileWall', 'laminate', 'paintWall', 'paintCeiling',
    'wallpaper', 'plaster', 'putty', 'primer'];

  var MATERIAL_TITLES = {
    tileFloor: 'Плитка на пол',
    tileWall: 'Плитка на стены',
    laminate: 'Ламинат',
    paintWall: 'Краска для стен',
    paintCeiling: 'Краска для потолка',
    wallpaper: 'Обои',
    plaster: 'Штукатурка',
    putty: 'Шпаклёвка',
    primer: 'Грунт'
  };

  // Чем считается упаковка у каждого материала (для подписи в итоге).
  var PACK_UNITS = {
    tileFloor: 'уп.', tileWall: 'уп.', laminate: 'уп.',
    paintWall: 'банок', paintCeiling: 'банок',
    wallpaper: 'рулонов',
    plaster: 'мешков', putty: 'мешков',
    primer: 'канистр'
  };

  /* ------------------------------------------------------------------ *
   * 2. Вспомогательные функции
   * ------------------------------------------------------------------ */

  // Допуск для сравнения дробных чисел: 0,1 + 0,2 в компьютере = 0,30000000000000004.
  var EPS = 1e-9;

  /**
   * Разбор числа, введённого человеком: понимает запятую («2,5»), пробелы («1 200»).
   * Пустая строка или мусор → NaN.
   */
  function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return NaN;
    var s = String(value).replace(/[\s  ]/g, '').replace(',', '.');
    if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  /** Число для расчёта: всё, что не удалось разобрать, и отрицательные значения считаем нулём. */
  function toNumber(value) {
    var n = parseNumber(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /** Округление вверх до целого с защитой от погрешности: 4,0000000001 → 4, а не 5. */
  function ceilSafe(x) {
    return Math.max(0, Math.ceil(x - EPS));
  }

  /** Округление вниз до целого с защитой от погрешности: 2,9999999999 → 3, а не 2. */
  function floorSafe(x) {
    return Math.max(0, Math.floor(x + EPS));
  }

  /** Количество с запасом: q × (1 + запас% / 100). */
  function withReserve(quantity, reservePercent) {
    return quantity * (1 + toNumber(reservePercent) / 100);
  }

  /** Сколько целых упаковок нужно, чтобы покрыть количество. Если размер упаковки не задан — 0. */
  function packsNeeded(quantity, perPack) {
    var p = toNumber(perPack);
    if (p <= 0) return 0;
    return ceilSafe(quantity / p);
  }

  /* ------------------------------------------------------------------ *
   * 3. Геометрия комнаты
   * ------------------------------------------------------------------ */

  /** Площадь окон и дверей: сумма (ширина × высота × количество). */
  function openingsArea(openings) {
    return (openings || []).reduce(function (sum, o) {
      return sum + toNumber(o.width) * toNumber(o.height) * toNumber(o.count);
    }, 0);
  }

  /** Суммарная ширина окон и дверей: сумма (ширина × количество). Нужна для обоев. */
  function openingsWidth(openings) {
    return (openings || []).reduce(function (sum, o) {
      return sum + toNumber(o.width) * toNumber(o.count);
    }, 0);
  }

  /**
   * Площади комнаты.
   *   пол = потолок = длина × ширина
   *   периметр = 2 × (длина + ширина)
   *   стены «грязные» = периметр × высота
   *   стены «чистые» = стены «грязные» − окна и двери (не меньше нуля)
   */
  function roomGeometry(room) {
    var length = toNumber(room.length);
    var width = toNumber(room.width);
    var height = toNumber(room.height);
    var floorArea = length * width;
    var perimeter = 2 * (length + width);
    var wallGross = perimeter * height;
    var openArea = openingsArea(room.openings);
    var warnings = [];

    if (length <= 0 || width <= 0) warnings.push('не заданы длина или ширина');
    if (height <= 0) warnings.push('не задана высота');
    if (openArea > wallGross + EPS && wallGross > 0) {
      warnings.push('окна и двери больше площади стен — проверьте размеры');
    }

    return {
      length: length,
      width: width,
      height: height,
      floorArea: floorArea,
      ceilingArea: floorArea,
      perimeter: perimeter,
      wallGross: wallGross,
      openingsArea: openArea,
      openingsWidth: openingsWidth(room.openings),
      wallNet: Math.max(0, wallGross - openArea),
      warnings: warnings
    };
  }

  /* ------------------------------------------------------------------ *
   * 4. Расчёт материалов
   *    Каждая функция получает площадь (или стены для обоев) и параметры,
   *    возвращает количество, число упаковок и стоимость.
   * ------------------------------------------------------------------ */

  /**
   * Плитка.
   *   площадь одной плитки = (длина, см / 100) × (ширина, см / 100)
   *   плиток, шт = ⌈ площадь × (1 + запас%) / площадь плитки ⌉
   *   упаковок = ⌈ плиток / штук в упаковке ⌉
   *   стоимость: цена за м² × (упаковок × м² в упаковке)  или  цена за упаковку × упаковок
   */
  function calcTile(area, p) {
    var tileArea = (toNumber(p.tileLength) / 100) * (toNumber(p.tileWidth) / 100);
    var perPack = toNumber(p.piecesPerPack);
    var amount = withReserve(area, p.reserve);
    var errors = [];
    if (tileArea <= 0) errors.push('не задан размер плитки');
    if (perPack <= 0) errors.push('не задано количество штук в упаковке');

    var pieces = tileArea > 0 ? ceilSafe(amount / tileArea) : 0;
    var packs = packsNeeded(pieces, perPack);
    var packArea = tileArea * perPack;
    var boughtArea = packs * packArea;
    var price = toNumber(p.price);
    var cost = p.priceUnit === 'pack' ? packs * price : boughtArea * price;

    return {
      area: area, amount: amount, amountUnit: 'м²', pieces: pieces,
      packs: packs, packArea: packArea, boughtArea: boughtArea,
      cost: cost, errors: errors
    };
  }

  /**
   * Ламинат.
   *   упаковок = ⌈ площадь × (1 + запас%) / м² в упаковке ⌉
   *   стоимость: цена за м² × (упаковок × м² в упаковке)  или  цена за упаковку × упаковок
   */
  function calcLaminate(area, p) {
    var packArea = toNumber(p.packArea);
    var amount = withReserve(area, p.reserve);
    var errors = [];
    if (packArea <= 0) errors.push('не задана площадь в упаковке');

    var packs = packsNeeded(amount, packArea);
    var boughtArea = packs * packArea;
    var price = toNumber(p.price);
    var cost = p.priceUnit === 'pack' ? packs * price : boughtArea * price;

    return {
      area: area, amount: amount, amountUnit: 'м²',
      packs: packs, packArea: packArea, boughtArea: boughtArea,
      cost: cost, errors: errors
    };
  }

  /**
   * Краска.
   *   литров = площадь × слоёв / укрывистость (м² с 1 л) × (1 + запас%)
   *   банок = ⌈ литров / объём банки ⌉
   *   стоимость = банок × цена банки
   */
  function calcPaint(area, p) {
    var coverage = toNumber(p.coverage);
    var coats = toNumber(p.coats);
    var errors = [];
    if (coverage <= 0) errors.push('не задана укрывистость (м² с 1 литра)');
    if (coats <= 0) errors.push('не задано количество слоёв');
    if (toNumber(p.canVolume) <= 0) errors.push('не задан объём банки');

    var liters = coverage > 0 ? withReserve(area * coats / coverage, p.reserve) : 0;
    var packs = packsNeeded(liters, p.canVolume);

    return {
      area: area, amount: liters, amountUnit: 'л',
      packs: packs, cost: packs * toNumber(p.price), errors: errors
    };
  }

  /**
   * Длина одной полосы обоев.
   *   без раппорта: высота стены + припуск на подрезку
   *   с раппортом: (высота + припуск), округлённая вверх до целого числа раппортов,
   *   чтобы рисунок на соседних полосах совпал.
   */
  function wallpaperStripLength(height, trim, rapport) {
    var base = toNumber(height) + toNumber(trim);
    var r = toNumber(rapport);
    if (r > 0) return ceilSafe(base / r) * r;
    return base;
  }

  /**
   * Обои — считаются полосами, а не по площади.
   *   полос в комнате = ⌈ (периметр − ширина проёмов, если их вычитаем) / ширина рулона ⌉
   *   полос в рулоне = ⌊ длина рулона / длина полосы ⌋
   *   полос с запасом = ⌈ полос × (1 + запас%) ⌉
   *   рулонов = ⌈ полос с запасом / полос в рулоне ⌉
   * Комнаты с одинаковой длиной полосы считаются вместе: остаток рулона из одной комнаты
   * идёт в другую. Комнаты с разной высотой считаются отдельно и складываются.
   *
   * walls — массив { perimeter, height, openingsWidth, area } по комнатам.
   */
  function calcWallpaper(walls, p) {
    var rollWidth = toNumber(p.rollWidth);
    var rollLength = toNumber(p.rollLength);
    var errors = [];
    if (rollWidth <= 0) errors.push('не задана ширина рулона');
    if (rollLength <= 0) errors.push('не задана длина рулона');

    var groups = {};
    var area = 0;
    var strips = 0;

    (walls || []).forEach(function (w) {
      area += w.area || 0;
      if (rollWidth <= 0) return;
      var width = w.perimeter - (p.subtractOpenings ? (w.openingsWidth || 0) : 0);
      var roomStrips = ceilSafe(Math.max(0, width) / rollWidth);
      var stripLength = wallpaperStripLength(w.height, p.trim, p.rapport);
      var key = Math.round(stripLength * 1000); // группируем с точностью до миллиметра
      if (!groups[key]) groups[key] = { stripLength: stripLength, strips: 0 };
      groups[key].strips += roomStrips;
      strips += roomStrips;
    });

    var rolls = 0;
    var stripsWithReserve = 0;
    var groupList = Object.keys(groups).map(function (k) { return groups[k]; });
    groupList.forEach(function (g) {
      g.stripsPerRoll = rollLength > 0 ? floorSafe(rollLength / g.stripLength) : 0;
      g.stripsWithReserve = ceilSafe(withReserve(g.strips, p.reserve));
      if (g.stripsPerRoll <= 0) {
        if (g.strips > 0 && rollLength > 0) {
          errors.push('полоса ' + round(g.stripLength, 2) + ' м длиннее рулона');
        }
        g.rolls = 0;
      } else {
        g.rolls = ceilSafe(g.stripsWithReserve / g.stripsPerRoll);
      }
      rolls += g.rolls;
      stripsWithReserve += g.stripsWithReserve;
    });

    return {
      area: area, amount: stripsWithReserve, amountUnit: 'полос',
      strips: strips, stripsWithReserve: stripsWithReserve, groups: groupList,
      packs: rolls, cost: rolls * toNumber(p.price), errors: errors
    };
  }

  /**
   * Сухие смеси — штукатурка и шпаклёвка.
   *   кг = площадь × расход (кг/м² на 1 мм) × толщина слоя (мм) × (1 + запас%)
   *   мешков = ⌈ кг / вес мешка ⌉
   *   стоимость = мешков × цена мешка
   */
  function calcDryMix(area, p) {
    var errors = [];
    if (toNumber(p.consumptionPerMm) <= 0) errors.push('не задан расход на 1 мм');
    if (toNumber(p.thickness) <= 0) errors.push('не задана толщина слоя');
    if (toNumber(p.bagWeight) <= 0) errors.push('не задан вес мешка');

    var kg = withReserve(area * toNumber(p.consumptionPerMm) * toNumber(p.thickness), p.reserve);
    var packs = packsNeeded(kg, p.bagWeight);

    return {
      area: area, amount: kg, amountUnit: 'кг',
      packs: packs, cost: packs * toNumber(p.price), errors: errors
    };
  }

  /**
   * Грунт.
   *   литров = площадь × расход (л/м² на 1 слой) × слоёв × (1 + запас%)
   *   канистр = ⌈ литров / объём канистры ⌉
   *   стоимость = канистр × цена канистры
   */
  function calcPrimer(area, p) {
    var errors = [];
    if (toNumber(p.consumption) <= 0) errors.push('не задан расход');
    if (toNumber(p.coats) <= 0) errors.push('не задано количество слоёв');
    if (toNumber(p.canisterVolume) <= 0) errors.push('не задан объём канистры');

    var liters = withReserve(area * toNumber(p.consumption) * toNumber(p.coats), p.reserve);
    var packs = packsNeeded(liters, p.canisterVolume);

    return {
      area: area, amount: liters, amountUnit: 'л',
      packs: packs, cost: packs * toNumber(p.price), errors: errors
    };
  }

  /* ------------------------------------------------------------------ *
   * 5. Какие площади уходят под какой материал
   * ------------------------------------------------------------------ */

  /**
   * Площади комнаты по материалам — по выбранной отделке:
   *   пол: ламинат или плитка → площадь пола; грунт пола → площадь пола
   *   стены: краска / плитка → «чистая» площадь стен; обои → считаются полосами
   *   потолок: краска → площадь потолка
   *   штукатурка, шпаклёвка, грунт — на те поверхности, где они отмечены.
   */
  function roomMaterialAreas(room, geometry) {
    var g = geometry || roomGeometry(room);
    var prep = room.prep || {};
    var walls = prep.walls || {};
    var ceiling = prep.ceiling || {};
    var floor = prep.floor || {};
    var a = {};

    function add(key, value) {
      if (value > 0) a[key] = (a[key] || 0) + value;
    }

    if (room.floor === 'laminate') add('laminate', g.floorArea);
    if (room.floor === 'tile') add('tileFloor', g.floorArea);

    if (room.walls === 'paint') add('paintWall', g.wallNet);
    if (room.walls === 'tile') add('tileWall', g.wallNet);
    if (room.walls === 'wallpaper') add('wallpaper', g.wallNet);

    if (room.ceiling === 'paint') add('paintCeiling', g.ceilingArea);

    if (walls.plaster) add('plaster', g.wallNet);
    if (ceiling.plaster) add('plaster', g.ceilingArea);
    if (walls.putty) add('putty', g.wallNet);
    if (ceiling.putty) add('putty', g.ceilingArea);
    if (walls.primer) add('primer', g.wallNet);
    if (ceiling.primer) add('primer', g.ceilingArea);
    if (floor.primer) add('primer', g.floorArea);

    return a;
  }

  /* ------------------------------------------------------------------ *
   * 6. Расчёт всего объекта
   * ------------------------------------------------------------------ */

  /** Параметры материала: значения по умолчанию, поверх них — введённые пользователем. */
  function materialParams(materials, key) {
    var result = {};
    var defaults = DEFAULT_MATERIALS[key];
    var custom = (materials && materials[key]) || {};
    Object.keys(defaults).forEach(function (k) {
      result[k] = custom[k] !== undefined ? custom[k] : defaults[k];
    });
    return result;
  }

  /**
   * Полный расчёт: project = { rooms: [...], materials: {...} }.
   * Площади по всем комнатам складываются, и только потом считаются упаковки —
   * так покупается меньше лишнего, чем при округлении по каждой комнате.
   */
  function calculateProject(project) {
    var rooms = (project && project.rooms) || [];
    var totals = {};
    var wallpaperWalls = [];

    var roomResults = rooms.map(function (room) {
      var g = roomGeometry(room);
      var areas = roomMaterialAreas(room, g);
      Object.keys(areas).forEach(function (k) {
        totals[k] = (totals[k] || 0) + areas[k];
      });
      if (room.walls === 'wallpaper' && g.perimeter > 0 && g.height > 0) {
        wallpaperWalls.push({
          perimeter: g.perimeter, height: g.height,
          openingsWidth: g.openingsWidth, area: g.wallNet
        });
      }
      return { id: room.id, name: room.name, geometry: g, areas: areas };
    });

    var materials = [];
    MATERIAL_ORDER.forEach(function (key) {
      var p = materialParams(project && project.materials, key);
      var r;
      if (key === 'wallpaper') {
        if (!wallpaperWalls.length) return;
        r = calcWallpaper(wallpaperWalls, p);
      } else {
        var area = totals[key] || 0;
        if (area <= 0) return;
        if (key === 'tileFloor' || key === 'tileWall') r = calcTile(area, p);
        else if (key === 'laminate') r = calcLaminate(area, p);
        else if (key === 'paintWall' || key === 'paintCeiling') r = calcPaint(area, p);
        else if (key === 'plaster' || key === 'putty') r = calcDryMix(area, p);
        else if (key === 'primer') r = calcPrimer(area, p);
      }
      r.key = key;
      r.title = MATERIAL_TITLES[key];
      r.packUnit = PACK_UNITS[key];
      r.priced = toNumber(p.price) > 0;
      materials.push(r);
    });

    var totalCost = materials.reduce(function (s, m) { return s + m.cost; }, 0);
    var missingPrices = materials.filter(function (m) { return !m.priced; }).length;

    return {
      rooms: roomResults,
      materials: materials,
      totalCost: totalCost,
      missingPrices: missingPrices
    };
  }

  /** Округление до заданного числа знаков после запятой (для показа). */
  function round(x, digits) {
    var f = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round((x + (x >= 0 ? EPS : -EPS)) * f) / f;
  }

  return {
    DEFAULT_MATERIALS: DEFAULT_MATERIALS,
    MATERIAL_ORDER: MATERIAL_ORDER,
    MATERIAL_TITLES: MATERIAL_TITLES,
    PACK_UNITS: PACK_UNITS,
    parseNumber: parseNumber,
    toNumber: toNumber,
    ceilSafe: ceilSafe,
    floorSafe: floorSafe,
    withReserve: withReserve,
    packsNeeded: packsNeeded,
    round: round,
    openingsArea: openingsArea,
    openingsWidth: openingsWidth,
    roomGeometry: roomGeometry,
    calcTile: calcTile,
    calcLaminate: calcLaminate,
    calcPaint: calcPaint,
    wallpaperStripLength: wallpaperStripLength,
    calcWallpaper: calcWallpaper,
    calcDryMix: calcDryMix,
    calcPrimer: calcPrimer,
    roomMaterialAreas: roomMaterialAreas,
    materialParams: materialParams,
    calculateProject: calculateProject
  };
});
