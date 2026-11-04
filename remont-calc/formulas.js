/*
 * formulas.js — все формулы калькулятора материалов для ремонта.
 *
 * Файл не зависит от страницы. В браузере он доступен как window.RemontFormulas,
 * в Node.js — через require('./formulas.js') (так его подключают тесты).
 *
 * Единицы измерения:
 *   размеры комнат, окон и дверей — метры (м);
 *   площадь — м², длина плинтуса, профиля, кабеля — м;
 *   размер плитки — сантиметры (см);
 *   толщина слоя — миллиметры (мм);
 *   краска и грунт — литры (л), сухие смеси — килограммы (кг);
 *   мощность — ватты (Вт); запас — проценты (%); цены — рубли.
 *
 * ВАЖНО: все значения в DEFAULT_MATERIALS — типовые.
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

  /* ================================================================== *
   * 1. Каталог материалов
   * ================================================================== */

  var CATEGORIES = [
    { key: 'floor', title: 'Напольные покрытия' },
    { key: 'walls', title: 'Стены' },
    { key: 'ceiling', title: 'Потолок' },
    { key: 'tile', title: 'Плиточные работы' },
    { key: 'rough', title: 'Черновые работы' },
    { key: 'openings', title: 'Окна и двери' },
    { key: 'electric', title: 'Электрика' },
    { key: 'heating', title: 'Отопление' },
    { key: 'custom', title: 'Свои позиции' }
  ];

  /*
   * kind — каким способом считается материал (см. раздел 4):
   *   area     — площадь ÷ площадь упаковки/листа/рулона
   *   tile     — плитка: штуки, затем упаковки
   *   roll     — линолеум, ковролин: отрезы с рулона под каждую комнату
   *   pieces   — длина ÷ длина планки/профиля
   *   paint    — краска; wallpaper — обои полосами; glue — клей для обоев
   *   adhesive — плиточный клей; grout — затирка
   *   layered  — грунт, гидроизоляция (расход на слой × слоёв)
   *   drymix   — сухие смеси (расход на 1 мм × толщина)
   *   measured — платим за м² или м.п. (натяжной потолок, окна, подоконники, откосы)
   *   count    — штуки (двери, розетки, терморегуляторы)
   *   cable    — кабель в метрах; radiator — секции радиаторов; heatingMat — тёплый пол
   * baseUnit — в чём считается потребность по комнатам.
   */
  var MATERIALS = {
    laminate:       { title: 'Ламинат', category: 'floor', kind: 'area', baseUnit: 'м²' },
    vinyl:          { title: 'Кварцвинил (SPC)', category: 'floor', kind: 'area', baseUnit: 'м²' },
    parquet:        { title: 'Паркетная доска', category: 'floor', kind: 'area', baseUnit: 'м²' },
    tileFloor:      { title: 'Плитка на пол', category: 'floor', kind: 'tile', baseUnit: 'м²' },
    linoleum:       { title: 'Линолеум', category: 'floor', kind: 'roll', baseUnit: 'м²' },
    carpet:         { title: 'Ковролин', category: 'floor', kind: 'roll', baseUnit: 'м²' },
    underlay:       { title: 'Подложка под ламинат', category: 'floor', kind: 'area', baseUnit: 'м²' },
    floorPlinth:    { title: 'Плинтус напольный', category: 'floor', kind: 'pieces', baseUnit: 'м' },

    paintWall:      { title: 'Краска для стен', category: 'walls', kind: 'paint', baseUnit: 'м²' },
    wallpaper:      { title: 'Обои', category: 'walls', kind: 'wallpaper', baseUnit: 'м²' },
    wallpaperGlue:  { title: 'Клей для обоев', category: 'walls', kind: 'glue', baseUnit: 'м²' },
    tileWall:       { title: 'Плитка на стены', category: 'walls', kind: 'tile', baseUnit: 'м²' },
    panels:         { title: 'Панели ПВХ / МДФ', category: 'walls', kind: 'area', baseUnit: 'м²' },
    fiberglass:     { title: 'Стеклохолст (паутинка)', category: 'walls', kind: 'area', baseUnit: 'м²' },

    paintCeiling:   { title: 'Краска для потолка', category: 'ceiling', kind: 'paint', baseUnit: 'м²' },
    stretchCeiling: { title: 'Натяжной потолок', category: 'ceiling', kind: 'measured', baseUnit: 'м²' },
    ceilingPlinth:  { title: 'Потолочный плинтус', category: 'ceiling', kind: 'pieces', baseUnit: 'м' },

    tileAdhesive:   { title: 'Клей для плитки', category: 'tile', kind: 'adhesive', baseUnit: 'м²' },
    grout:          { title: 'Затирка для швов', category: 'tile', kind: 'grout', baseUnit: 'м²' },
    waterproofing:  { title: 'Гидроизоляция', category: 'tile', kind: 'layered', baseUnit: 'м²' },

    screed:         { title: 'Стяжка пола', category: 'rough', kind: 'drymix', baseUnit: 'м²' },
    leveler:        { title: 'Наливной пол', category: 'rough', kind: 'drymix', baseUnit: 'м²' },
    plaster:        { title: 'Штукатурка', category: 'rough', kind: 'drymix', baseUnit: 'м²' },
    puttyStart:     { title: 'Шпаклёвка стартовая', category: 'rough', kind: 'drymix', baseUnit: 'м²' },
    putty:          { title: 'Шпаклёвка финишная', category: 'rough', kind: 'drymix', baseUnit: 'м²' },
    primer:         { title: 'Грунт', category: 'rough', kind: 'layered', baseUnit: 'м²' },
    drywall:        { title: 'Гипсокартон (ГКЛ)', category: 'rough', kind: 'area', baseUnit: 'м²' },
    profileCD:      { title: 'Профиль стоечный/потолочный (ПП 60×27)', category: 'rough', kind: 'pieces', baseUnit: 'м' },
    profileUD:      { title: 'Профиль направляющий (ПН 28×27)', category: 'rough', kind: 'pieces', baseUnit: 'м' },

    windowPVC:      { title: 'Окна ПВХ', category: 'openings', kind: 'measured', baseUnit: 'м²' },
    windowAlu:      { title: 'Остекление алюминиевое (холодное)', category: 'openings', kind: 'measured', baseUnit: 'м²' },
    windowWood:     { title: 'Окна деревянные', category: 'openings', kind: 'measured', baseUnit: 'м²' },
    windowSill:     { title: 'Подоконники', category: 'openings', kind: 'measured', baseUnit: 'м' },
    windowSlopes:   { title: 'Откосы', category: 'openings', kind: 'measured', baseUnit: 'м' },
    doorInterior:   { title: 'Двери межкомнатные', category: 'openings', kind: 'count', baseUnit: 'шт.' },
    doorEntrance:   { title: 'Дверь входная', category: 'openings', kind: 'count', baseUnit: 'шт.' },

    cableSocket:    { title: 'Кабель 3×2,5 (розетки)', category: 'electric', kind: 'cable', baseUnit: 'м' },
    cableLight:     { title: 'Кабель 3×1,5 (освещение)', category: 'electric', kind: 'cable', baseUnit: 'м' },
    elSocket:       { title: 'Розетки', category: 'electric', kind: 'count', baseUnit: 'шт.' },
    elSwitch:       { title: 'Выключатели', category: 'electric', kind: 'count', baseUnit: 'шт.' },
    elBox:          { title: 'Подрозетники', category: 'electric', kind: 'count', baseUnit: 'шт.' },
    elLight:        { title: 'Светильники', category: 'electric', kind: 'count', baseUnit: 'шт.' },

    radiator:       { title: 'Радиаторы (секции)', category: 'heating', kind: 'radiator', baseUnit: 'Вт' },
    floorHeating:   { title: 'Тёплый пол (нагревательный мат)', category: 'heating', kind: 'heatingMat', baseUnit: 'м²' },
    thermostat:     { title: 'Терморегуляторы', category: 'heating', kind: 'count', baseUnit: 'шт.' }
  };

  var MATERIAL_ORDER = Object.keys(MATERIALS);
  var MATERIAL_TITLES = {};
  MATERIAL_ORDER.forEach(function (k) { MATERIAL_TITLES[k] = MATERIALS[k].title; });

  /* ================================================================== *
   * 2. Нормы и параметры по умолчанию.
   *    Каждое значение — «типовое значение, проверить по упаковке».
   *    Цены по умолчанию 0 — их вводит пользователь.
   * ================================================================== */

  var DEFAULT_MATERIALS = {
    // --- Напольные покрытия ---
    // Ламинат: в упаковке 2,397 м² (например, 9 досок 1380×193 мм). Запас 7 % — прямая укладка.
    laminate: { packArea: 2.397, reserve: 7, price: 0, priceUnit: 'm2' },
    // Кварцвинил: 2,196 м² (например, 10 досок 1220×180 мм). Запас 7 %.
    vinyl: { packArea: 2.196, reserve: 7, price: 0, priceUnit: 'm2' },
    // Паркетная доска: 2,2 м² в упаковке — условно, фасовка сильно отличается. Запас 7 %.
    parquet: { packArea: 2.2, reserve: 7, price: 0, priceUnit: 'm2' },
    // Плитка на пол: 60×60 см, 4 шт. = 1,44 м². Запас 10 % (по диагонали — 15 %).
    tileFloor: { tileLength: 60, tileWidth: 60, piecesPerPack: 4, reserve: 10, price: 0, priceUnit: 'm2' },
    // Линолеум: ширины рулонов в продаже, припуск 0,1 м на отрез. Ширина подбирается сама.
    linoleum: { rollWidths: '2; 2,5; 3; 3,5; 4', trim: 0.1, reserve: 0, price: 0 },
    // Ковролин: ширины рулонов 3, 4, 5 м, припуск 0,1 м.
    carpet: { rollWidths: '3; 4; 5', trim: 0.1, reserve: 0, price: 0 },
    // Подложка: 10 м² в рулоне/упаковке. Запас 5 %.
    underlay: { packArea: 10, reserve: 5, price: 0 },
    // Плинтус напольный: планка 2,5 м. Запас 10 % — на подрезку в углах.
    floorPlinth: { pieceLength: 2.5, reserve: 10, price: 0 },

    // --- Стены ---
    // Краска: 8 м² с 1 литра на слой, 2 слоя, банка 9 л, запас 10 %.
    paintWall: { coverage: 8, coats: 2, canVolume: 9, reserve: 10, price: 0 },
    // Обои: рулон 1,06 × 10,05 м, раппорт 0, припуск 0,1 м на полосу, запас 5 % полос.
    wallpaper: { rollWidth: 1.06, rollLength: 10.05, rapport: 0, trim: 0.1, subtractOpenings: false, reserve: 5, price: 0 },
    // Клей для обоев: одной пачки хватает на 30 м² (у разных марок 25–60 м²).
    wallpaperGlue: { coverage: 30, reserve: 10, price: 0 },
    // Плитка на стены: 30×60 см, 8 шт. = 1,44 м². Запас 10 %.
    tileWall: { tileLength: 30, tileWidth: 60, piecesPerPack: 8, reserve: 10, price: 0, priceUnit: 'm2' },
    // Панели ПВХ: 0,25 × 2,7 м. Запас 10 %.
    panels: { panelWidth: 0.25, panelLength: 2.7, reserve: 10, price: 0 },
    // Стеклохолст: рулон 50 м² (1 × 50 м). Запас 10 % — нахлёст и подрезка.
    fiberglass: { rollArea: 50, reserve: 10, price: 0 },

    // --- Потолок ---
    paintCeiling: { coverage: 8, coats: 2, canVolume: 9, reserve: 10, price: 0 },
    // Натяжной потолок: цена за м² (обычно с монтажом). Полотно делают по размеру — запас 0.
    stretchCeiling: { reserve: 0, price: 0 },
    // Потолочный плинтус (галтель): планка 2 м. Запас 10 %.
    ceilingPlinth: { pieceLength: 2, reserve: 10, price: 0 },

    // --- Плиточные работы ---
    // Клей для плитки: 1,2 кг/м² на 1 мм слоя (Ceresit CM 11). Слой на стенах 3 мм ≈ зуб 8 мм
    // для плитки до 25 см (≈3,6 кг/м²); на полу 4 мм — условно для крупной плитки. Мешок 25 кг.
    tileAdhesive: { consumptionPerMm: 1.2, wallThickness: 3, floorThickness: 4, bagWeight: 25, reserve: 10, price: 0 },
    // Затирка: шов 2 мм, глубина = толщина плитки 9 мм, коэффициент 1,6 кг/дм³, упаковка 2 кг.
    grout: { jointWidth: 2, tileThickness: 9, density: 1.6, packWeight: 2, reserve: 10, price: 0 },
    // Гидроизоляция обмазочная: 0,7 кг/м² на слой, 2 слоя (у Ceresit CL 51 ~1,4 кг/м² на 2 слоя),
    // заход на стены 0,2 м, ведро 5 кг.
    waterproofing: { consumption: 0.7, coats: 2, upturn: 0.2, bucketWeight: 5, reserve: 10, price: 0 },

    // --- Черновые работы ---
    // Стяжка: 2 кг/м² на 1 мм (Ceresit «Стяжка»), средняя толщина 40 мм, мешок 25 кг.
    screed: { consumptionPerMm: 2, thickness: 40, bagWeight: 25, reserve: 10, price: 0 },
    // Наливной пол: 1,6 кг/м² на 1 мм (так у Mapei Nivoplan Plus), толщина 5 мм, мешок 25 кг.
    leveler: { consumptionPerMm: 1.6, thickness: 5, bagWeight: 25, reserve: 10, price: 0 },
    // Штукатурка гипсовая: 0,85 кг/м² на 1 мм (Кнауф-Ротбанд ~8,5 кг/м² при 10 мм), 10 мм, мешок 30 кг.
    plaster: { consumptionPerMm: 0.85, thickness: 10, bagWeight: 30, reserve: 10, price: 0 },
    // Шпаклёвка стартовая: 1,0 кг/м² на 1 мм (у гипсовых обычно 0,8–1,0), 3 мм, мешок 25 кг.
    puttyStart: { consumptionPerMm: 1, thickness: 3, bagWeight: 25, reserve: 10, price: 0 },
    // Шпаклёвка финишная: 1,2 кг/м² на 1 мм (Vetonit LR+), 1,5 мм — условно, мешок 20 кг.
    putty: { consumptionPerMm: 1.2, thickness: 1.5, bagWeight: 20, reserve: 10, price: 0 },
    // Грунт: 0,15 л/м² на слой (Ceresit CT 17: 0,1–0,2), 2 слоя, канистра 10 л.
    primer: { consumption: 0.15, coats: 2, canisterVolume: 10, reserve: 10, price: 0 },
    // Гипсокартон: лист 1,2 × 2,5 м. Запас 10 %.
    drywall: { sheetWidth: 1.2, sheetLength: 2.5, reserve: 10, price: 0 },
    // Профиль ПП 60×27: длина 3 м, шаг стоек 0,6 м (под лист шириной 1,2 м). Запас 10 %.
    profileCD: { pieceLength: 3, step: 0.6, reserve: 10, price: 0 },
    // Профиль ПН 28×27: длина 3 м. Запас 10 %.
    profileUD: { pieceLength: 3, reserve: 10, price: 0 },

    // --- Окна и двери --- (цена за м² окна; подоконники и откосы — за погонный метр)
    windowPVC: { price: 0 },
    windowAlu: { price: 0 },
    windowWood: { price: 0 },
    // Подоконник: длина = ширина окна + 0,1 м (заход по 5 см за откосы с каждой стороны).
    windowSill: { overhang: 0.1, price: 0 },
    windowSlopes: { price: 0 },
    doorInterior: { price: 0 },
    doorEntrance: { price: 0 },

    // --- Электрика ---
    // Кабель: среднее расстояние от щита до комнаты 7 м, бухта 100 м, запас 15 %.
    cableSocket: { toPanel: 7, coilLength: 100, reserve: 15, price: 0, priceUnit: 'm' },
    cableLight: { toPanel: 7, coilLength: 100, reserve: 15, price: 0, priceUnit: 'm' },
    elSocket: { price: 0 },
    elSwitch: { price: 0 },
    elBox: { price: 0 },
    elLight: { price: 0 },

    // --- Отопление ---
    // Радиаторы: 100 Вт на 1 м² при потолке до 2,7 м; секция 180 Вт (биметалл 500 мм — смотрите паспорт).
    radiator: { wattsPerM2: 100, sectionPower: 180, reserve: 10, price: 0 },
    // Тёплый пол: мат 150 Вт/м² на 70 % площади пола, размеры матов с шагом 0,5 м². Цена за м² мата.
    floorHeating: { share: 70, power: 150, matStep: 0.5, price: 0 },
    thermostat: { price: 0 }
  };

  /* ================================================================== *
   * 3. Вспомогательные функции
   * ================================================================== */

  // Допуск для сравнения дробных чисел: 0,1 + 0,2 в компьютере = 0,30000000000000004.
  var EPS = 1e-9;

  /** Разбор числа, введённого человеком: «2,5», «1 200». Пустая строка или мусор → NaN. */
  function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return NaN;
    var s = String(value).replace(/[\s  ]/g, '').replace(',', '.');
    if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }

  /** Число для расчёта: мусор и отрицательные значения считаем нулём. */
  function toNumber(value) {
    var n = parseNumber(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /** Список чисел через «;» или пробел: «2; 2,5; 3» → [2, 2.5, 3] (по возрастанию, без нулей). */
  function parseList(value) {
    return String(value === undefined || value === null ? '' : value)
      .split(/[;\s]+/)
      .map(toNumber)
      .filter(function (n) { return n > 0; })
      .sort(function (a, b) { return a - b; });
  }

  /** Округление вверх до целого с защитой от погрешности: 4,0000000001 → 4. */
  function ceilSafe(x) {
    return Math.max(0, Math.ceil(x - EPS));
  }

  /** Округление вниз до целого с защитой от погрешности: 2,9999999999 → 3. */
  function floorSafe(x) {
    return Math.max(0, Math.floor(x + EPS));
  }

  /** Округление вверх до шага: ceilStep(6,2; 0,5) = 6,5. Шаг 0 — без округления. */
  function ceilStep(x, step) {
    var s = toNumber(step);
    return s > 0 ? ceilSafe(x / s) * s : x;
  }

  /** Количество с запасом: q × (1 + запас% / 100). */
  function withReserve(quantity, reservePercent) {
    return quantity * (1 + toNumber(reservePercent) / 100);
  }

  /** Сколько целых упаковок нужно. Если размер упаковки не задан — 0. */
  function packsNeeded(quantity, perPack) {
    var p = toNumber(perPack);
    if (p <= 0) return 0;
    return ceilSafe(quantity / p);
  }

  /** Округление до заданного числа знаков (для показа). */
  function round(x, digits) {
    var f = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round((x + (x >= 0 ? EPS : -EPS)) * f) / f;
  }

  /* ================================================================== *
   * 4. Геометрия комнаты
   * ================================================================== */

  /** Площадь проёмов: сумма (ширина × высота × количество). */
  function openingsArea(openings) {
    return (openings || []).reduce(function (sum, o) {
      return sum + toNumber(o.width) * toNumber(o.height) * toNumber(o.count);
    }, 0);
  }

  /** Суммарная ширина проёмов: сумма (ширина × количество). type — только окна или только двери. */
  function openingsWidth(openings, type) {
    return (openings || []).reduce(function (sum, o) {
      if (type && (o.type || 'window') !== type) return sum;
      return sum + toNumber(o.width) * toNumber(o.count);
    }, 0);
  }

  /** Количество окон в комнате (с учётом поля «Шт.»). */
  function windowsCount(openings) {
    return (openings || []).reduce(function (sum, o) {
      return (o.type || 'window') === 'window' ? sum + toNumber(o.count) : sum;
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
      doorsWidth: openingsWidth(room.openings, 'door'),
      windowsCount: windowsCount(room.openings),
      wallNet: Math.max(0, wallGross - openArea),
      warnings: warnings
    };
  }

  /* ================================================================== *
   * 5. Расчёт материалов
   *    Каждая функция получает потребность (площадь, длину, штуки) и параметры,
   *    возвращает количество, число упаковок и стоимость.
   * ================================================================== */

  /**
   * Материал «по площади»: ламинат, кварцвинил, паркет, подложка, ГКЛ, панели, стеклохолст.
   *   упаковок = ⌈ площадь × (1 + запас%) / площадь упаковки (листа, панели, рулона) ⌉
   *   стоимость: цена за м² × (упаковок × площадь упаковки)  или  цена за упаковку × упаковок
   */
  function calcByArea(area, p, unitArea) {
    var u = toNumber(unitArea);
    var amount = withReserve(area, p.reserve);
    var errors = [];
    if (u <= 0) errors.push('не задан размер упаковки (листа, рулона)');
    var packs = packsNeeded(amount, u);
    var boughtArea = packs * u;
    var price = toNumber(p.price);
    var cost = p.priceUnit === 'm2' ? boughtArea * price : packs * price;
    return {
      area: area, amount: amount, amountUnit: 'м²',
      packs: packs, packArea: u, boughtArea: boughtArea, cost: cost, errors: errors
    };
  }

  /** Ламинат — частный случай «по площади»: площадь упаковки = packArea. */
  function calcLaminate(area, p) {
    var r = calcByArea(area, p, p.packArea);
    if (toNumber(p.packArea) <= 0) r.errors = ['не задана площадь в упаковке'];
    return r;
  }

  /** Площадь одной единицы для материалов «по площади». */
  function unitAreaOf(key, p) {
    if (key === 'drywall') return toNumber(p.sheetWidth) * toNumber(p.sheetLength);
    if (key === 'panels') return toNumber(p.panelWidth) * toNumber(p.panelLength);
    if (key === 'fiberglass') return toNumber(p.rollArea);
    return toNumber(p.packArea);
  }

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
   * Отрез с рулона (линолеум, ковролин) для одной комнаты.
   * Перебираем все ширины рулона и оба направления укладки:
   *   полос = ⌈ поперечная сторона / ширина рулона ⌉
   *   длина отреза = продольная сторона + припуск
   *   площадь покупки = полос × ширина рулона × длина отреза
   * Выбираем вариант с наименьшей площадью (при равенстве — с меньшим числом швов).
   */
  function bestRollCut(length, width, widths, trim) {
    var best = null;
    var t = toNumber(trim);
    (widths || []).forEach(function (w) {
      [[length, width], [width, length]].forEach(function (dir) {
        var strips = ceilSafe(dir[1] / w);
        var cutLength = dir[0] + t;
        var area = strips * w * cutLength;
        if (!best || area < best.area - EPS || (Math.abs(area - best.area) <= EPS && strips < best.strips)) {
          best = { rollWidth: w, strips: strips, cutLength: cutLength, area: area };
        }
      });
    });
    return best;
  }

  /**
   * Линолеум, ковролин: по каждой комнате — свой отрез (см. bestRollCut).
   *   м² к покупке = сумма площадей отрезов × (1 + запас%)
   *   стоимость = м² × цена за м²
   * rooms — массив { name, length, width, area }.
   */
  function calcRollCovering(rooms, p) {
    var widths = parseList(p.rollWidths);
    var errors = [];
    if (!widths.length) errors.push('не заданы ширины рулона');
    var area = 0;
    var cutArea = 0;
    var cuts = 0;
    var details = [];
    (rooms || []).forEach(function (r) {
      area += r.area || r.length * r.width;
      if (!widths.length || r.length <= 0 || r.width <= 0) return;
      var c = bestRollCut(r.length, r.width, widths, p.trim);
      c.name = r.name;
      details.push(c);
      cutArea += c.area;
      cuts += c.strips;
    });
    var amount = withReserve(cutArea, p.reserve);
    return {
      area: area, cutArea: cutArea, amount: amount, amountUnit: 'м²', boughtArea: amount,
      packs: cuts, cuts: details, cost: amount * toNumber(p.price), errors: errors
    };
  }

  /**
   * Плинтус, профиль — по длине.
   *   штук = ⌈ длина × (1 + запас%) / длина планки ⌉
   *   стоимость = штук × цена планки
   */
  function calcPieces(length, p) {
    var piece = toNumber(p.pieceLength);
    var errors = [];
    if (piece <= 0) errors.push('не задана длина планки');
    var amount = withReserve(length, p.reserve);
    var packs = packsNeeded(amount, piece);
    return {
      area: length, amount: amount, amountUnit: 'м',
      packs: packs, pieceLength: piece, cost: packs * toNumber(p.price), errors: errors
    };
  }

  /**
   * Краска.
   *   литров = площадь × слоёв / укрывистость (м² с 1 л) × (1 + запас%)
   *   банок = ⌈ литров / объём банки ⌉
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
   * Длина полосы обоев: высота + припуск;
   * с раппортом — округляется вверх до целого числа раппортов.
   */
  function wallpaperStripLength(height, trim, rapport) {
    var base = toNumber(height) + toNumber(trim);
    var r = toNumber(rapport);
    if (r > 0) return ceilSafe(base / r) * r;
    return base;
  }

  /**
   * Обои — полосами.
   *   полос в комнате = ⌈ (периметр − ширина проёмов, если вычитаем) / ширина рулона ⌉
   *   полос в рулоне = ⌊ длина рулона / длина полосы ⌋
   *   полос с запасом = ⌈ полос × (1 + запас%) ⌉
   *   рулонов = ⌈ полос с запасом / полос в рулоне ⌉
   * Комнаты с одинаковой длиной полосы считаются вместе, с разной — отдельно.
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
      var key = Math.round(stripLength * 1000);
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
        if (g.strips > 0 && rollLength > 0) errors.push('полоса ' + round(g.stripLength, 2) + ' м длиннее рулона');
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
   * Клей для обоев.
   *   пачек = ⌈ площадь × (1 + запас%) / м² на одну пачку ⌉
   */
  function calcCoverage(area, p) {
    var errors = [];
    if (toNumber(p.coverage) <= 0) errors.push('не задано, на сколько м² хватает пачки');
    var amount = withReserve(area, p.reserve);
    var packs = packsNeeded(amount, p.coverage);
    return { area: area, amount: amount, amountUnit: 'м²', packs: packs, cost: packs * toNumber(p.price), errors: errors };
  }

  /**
   * Сухие смеси — штукатурка, шпаклёвка, стяжка, наливной пол.
   *   кг = площадь × расход (кг/м² на 1 мм) × толщина (мм) × (1 + запас%)
   *   мешков = ⌈ кг / вес мешка ⌉
   */
  function calcDryMix(area, p) {
    var errors = [];
    if (toNumber(p.consumptionPerMm) <= 0) errors.push('не задан расход на 1 мм');
    if (toNumber(p.thickness) <= 0) errors.push('не задана толщина слоя');
    if (toNumber(p.bagWeight) <= 0) errors.push('не задан вес мешка');

    var kg = withReserve(area * toNumber(p.consumptionPerMm) * toNumber(p.thickness), p.reserve);
    var packs = packsNeeded(kg, p.bagWeight);
    return { area: area, amount: kg, amountUnit: 'кг', packs: packs, cost: packs * toNumber(p.price), errors: errors };
  }

  /**
   * Клей для плитки — пол и стены считаются с разной толщиной слоя.
   *   кг = (плитка на полу × толщина на полу + плитка на стенах × толщина на стенах)
   *        × расход (кг/м² на 1 мм) × (1 + запас%)
   *   мешков = ⌈ кг / вес мешка ⌉
   */
  function calcTileAdhesive(floorArea, wallArea, p) {
    var errors = [];
    if (toNumber(p.consumptionPerMm) <= 0) errors.push('не задан расход на 1 мм');
    if (toNumber(p.bagWeight) <= 0) errors.push('не задан вес мешка');
    var kg = withReserve((floorArea * toNumber(p.floorThickness) + wallArea * toNumber(p.wallThickness)) *
      toNumber(p.consumptionPerMm), p.reserve);
    var packs = packsNeeded(kg, p.bagWeight);
    return {
      area: floorArea + wallArea, floorArea: floorArea, wallArea: wallArea,
      amount: kg, amountUnit: 'кг', packs: packs, cost: packs * toNumber(p.price), errors: errors
    };
  }

  /**
   * Расход затирки на 1 м², кг:
   *   (A + B) / (A × B) × C × D × k
   *   A, B — длина и ширина плитки, мм; C — ширина шва, мм; D — глубина шва (толщина плитки), мм;
   *   k — коэффициент (масса смеси на 1 литр шва, кг/дм³).
   * Откуда: на 1 м² приходится 1 000 000 / (A × B) плиток, у каждой ≈ (A + B) мм шва
   * сечением C × D мм² → объём (A + B) / (A × B) × C × D литров на м².
   */
  function groutRate(tileLengthCm, tileWidthCm, jointMm, depthMm, density) {
    var a = toNumber(tileLengthCm) * 10;
    var b = toNumber(tileWidthCm) * 10;
    if (a <= 0 || b <= 0) return 0;
    return (a + b) / (a * b) * toNumber(jointMm) * toNumber(depthMm) * toNumber(density);
  }

  /**
   * Затирка.
   *   кг = Σ (площадь плитки × расход на м² для её размера) × (1 + запас%)
   *   упаковок = ⌈ кг / вес упаковки ⌉
   * parts — массив { area, tileLength, tileWidth } (плитка на пол, на стены).
   */
  function calcGrout(parts, p) {
    var errors = [];
    if (toNumber(p.jointWidth) <= 0) errors.push('не задана ширина шва');
    if (toNumber(p.packWeight) <= 0) errors.push('не задан вес упаковки');
    var area = 0;
    var kg = 0;
    var rates = [];
    (parts || []).forEach(function (part) {
      if (!(part.area > 0)) return;
      var rate = groutRate(part.tileLength, part.tileWidth, p.jointWidth, p.tileThickness, p.density);
      rates.push({ area: part.area, rate: rate, tileLength: part.tileLength, tileWidth: part.tileWidth });
      area += part.area;
      kg += part.area * rate;
    });
    var amount = withReserve(kg, p.reserve);
    var packs = packsNeeded(amount, p.packWeight);
    return { area: area, amount: amount, amountUnit: 'кг', rates: rates, packs: packs, cost: packs * toNumber(p.price), errors: errors };
  }

  /**
   * Послойные материалы — грунт, гидроизоляция.
   *   количество = площадь × расход на 1 слой × слоёв × (1 + запас%)
   *   упаковок = ⌈ количество / объём (вес) упаковки ⌉
   */
  function calcLayered(area, consumption, coats, packSize, reserve, price, unit) {
    var errors = [];
    if (toNumber(consumption) <= 0) errors.push('не задан расход');
    if (toNumber(coats) <= 0) errors.push('не задано количество слоёв');
    if (toNumber(packSize) <= 0) errors.push('не задан объём упаковки');
    var amount = withReserve(area * toNumber(consumption) * toNumber(coats), reserve);
    var packs = packsNeeded(amount, packSize);
    return { area: area, amount: amount, amountUnit: unit, packs: packs, cost: packs * toNumber(price), errors: errors };
  }

  /** Грунт: литры, канистры. */
  function calcPrimer(area, p) {
    return calcLayered(area, p.consumption, p.coats, p.canisterVolume, p.reserve, p.price, 'л');
  }

  /** Гидроизоляция: килограммы, вёдра. Площадь = пол + заход на стены (см. roomNeeds). */
  function calcWaterproofing(area, p) {
    return calcLayered(area, p.consumption, p.coats, p.bucketWeight, p.reserve, p.price, 'кг');
  }

  /**
   * Оплата за измеренное количество: натяжной потолок (м²), окна (м²), подоконники и откосы (м.п.).
   *   количество = потребность × (1 + запас%);  стоимость = количество × цена
   */
  function calcMeasured(base, p) {
    var amount = withReserve(base, p.reserve);
    return { area: base, amount: amount, packs: 0, cost: amount * toNumber(p.price), errors: [] };
  }

  /** Штучные позиции: штук = ⌈ потребность × (1 + запас%) ⌉;  стоимость = штук × цена. */
  function calcCount(base, p) {
    var packs = ceilSafe(withReserve(base, p.reserve));
    return { area: base, amount: packs, packs: packs, cost: packs * toNumber(p.price), errors: [] };
  }

  /**
   * Кабель.
   *   метров = ⌈ длина трасс × (1 + запас%) ⌉
   *   бухт = ⌈ метров / длина бухты ⌉
   *   стоимость: цена за метр × метров  или  цена бухты × бухт
   */
  function calcCable(length, p) {
    var meters = ceilSafe(withReserve(length, p.reserve));
    var coils = packsNeeded(meters, p.coilLength);
    var price = toNumber(p.price);
    var cost = p.priceUnit === 'pack' ? coils * price : meters * price;
    var errors = [];
    if (p.priceUnit === 'pack' && toNumber(p.coilLength) <= 0) errors.push('не задана длина бухты');
    return { area: length, amount: meters, amountUnit: 'м', meters: meters, coils: coils, packs: coils, cost: cost, errors: errors };
  }

  /**
   * Тепловая мощность комнаты, Вт:
   *   площадь × Вт на м² × (высота / 2,7, если потолок выше 2,7 м)
   */
  function roomHeatPower(floorArea, height, wattsPerM2) {
    var k = height > 2.7 ? height / 2.7 : 1;
    return floorArea * toNumber(wattsPerM2) * k;
  }

  /**
   * Радиаторы — по каждой комнате отдельно.
   *   секций = ⌈ мощность × (1 + запас%) / мощность секции ⌉
   *   радиаторов = по одному под каждое окно (если окон нет — один)
   *   секций в радиаторе = ⌈ секций / радиаторов ⌉
   *   стоимость = секций всего × цена секции
   * rooms — массив { name, watts, radiators }.
   */
  function calcRadiators(rooms, p) {
    var section = toNumber(p.sectionPower);
    var errors = [];
    if (section <= 0) errors.push('не задана мощность секции');
    var watts = 0;
    var sections = 0;
    var radiators = 0;
    var details = [];
    (rooms || []).forEach(function (r) {
      watts += r.watts;
      if (section <= 0 || r.watts <= 0) return;
      var need = ceilSafe(withReserve(r.watts, p.reserve) / section);
      var count = Math.max(1, ceilSafe(r.radiators));
      var perRadiator = ceilSafe(need / count);
      details.push({ name: r.name, watts: r.watts, radiators: count, perRadiator: perRadiator, sections: perRadiator * count });
      sections += perRadiator * count;
      radiators += count;
    });
    return {
      area: watts, watts: watts, amount: sections, amountUnit: 'секций', radiators: radiators,
      rooms: details, packs: sections, cost: sections * toNumber(p.price), errors: errors
    };
  }

  /**
   * Тёплый пол (нагревательный мат).
   *   площадь мата в комнате = площадь пола × доля укладки, округлённая вверх до шага размеров матов
   *   мощность = площадь матов × Вт/м²;  стоимость = площадь матов × цена за м²
   */
  function matArea(floorArea, p) {
    return ceilStep(floorArea * toNumber(p.share) / 100, p.matStep);
  }

  function calcHeatingMat(area, p) {
    return {
      area: area, amount: area, amountUnit: 'м²', boughtArea: area, packs: 0,
      watts: area * toNumber(p.power), cost: area * toNumber(p.price), errors: []
    };
  }

  /**
   * Свои позиции.
   *   от площади/периметра: количество = (сумма по выбранным комнатам) × расход на единицу × (1 + запас%)
   *   штучные: количество = указанное количество × (1 + запас%)
   *   упаковок = ⌈ количество / в упаковке ⌉ (если «в упаковке» не задано — по 1)
   *   стоимость = упаковок × цена
   */
  function calcCustom(base, item) {
    var rate = item.basis === 'count' ? 1 : toNumber(item.rate);
    var amount = withReserve(base * rate, item.reserve);
    var packSize = toNumber(item.packSize) || 1;
    var packs = ceilSafe(amount / packSize);
    var errors = [];
    if (item.basis !== 'count' && rate <= 0) errors.push('не задан расход на единицу');
    return { area: base, amount: amount, amountUnit: item.unit || 'шт.', packSize: packSize, packs: packs, cost: packs * toNumber(item.price), errors: errors };
  }

  /* ================================================================== *
   * 6. Что нужно для комнаты
   * ================================================================== */

  var FLOOR_AREA_KEYS = { laminate: 'laminate', vinyl: 'vinyl', parquet: 'parquet', tile: 'tileFloor', linoleum: 'linoleum', carpet: 'carpet' };
  var UNDERLAY_FLOORS = { laminate: true, parquet: true };
  var PLINTH_FLOORS = { laminate: true, vinyl: true, parquet: true, linoleum: true, carpet: true };
  var WINDOW_KEYS = { pvc: 'windowPVC', alu: 'windowAlu', wood: 'windowWood' };
  var DOOR_KEYS = { interior: 'doorInterior', entrance: 'doorEntrance' };

  /** Параметры материала: значения по умолчанию, поверх — введённые пользователем. */
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
   * Потребность комнаты по материалам (в м², м, шт. или Вт — см. baseUnit в каталоге).
   * Что куда идёт:
   *   пол: покрытие → площадь пола; подложка — под ламинат и паркетную доску;
   *        плинтус — периметр минус ширина дверей (кроме плитки);
   *        стяжка, наливной пол, грунт — площадь пола;
   *        гидроизоляция — пол + полоса на стены высотой «заход» по периметру без дверей;
   *   стены: краска, обои (+ клей), плитка, панели, штукатурка, шпаклёвки, стеклохолст, грунт,
   *          ГКЛ — «чистая» площадь стен;
   *   потолок: краска, натяжной, панели, штукатурка, шпаклёвки, грунт, ГКЛ — площадь потолка;
   *            потолочный плинтус — периметр;
   *   каркас ГКЛ на стенах: стоек = ⌈ периметр / шаг ⌉, ПП = стоек × высота, ПН = 2 × периметр;
   *   каркас ГКЛ на потолке: рядов = ⌈ короткая сторона / шаг ⌉ − 1 (не меньше 1),
   *                          ПП = рядов × длинная сторона, ПН = периметр;
   *   окна: площадь окна → тип остекления; подоконник = (ширина + заход) × шт.;
   *         откосы = (2 × высота + ширина) × шт.;  двери — штуки;
   *   электрика: кабель розеток = до щита + периметр + розеток × высота потолка,
   *              кабель света = до щита + (длина + ширина) + (выключателей + светильников) × высота;
   *              подрозетники = розетки + выключатели;
   *   отопление: радиаторы — мощность комнаты (Вт); тёплый пол — площадь мата.
   */
  function roomNeeds(room, geometry, paramsOf) {
    var P = paramsOf || function (key) { return materialParams(null, key); };
    var g = geometry || roomGeometry(room);
    var prep = room.prep || {};
    var pw = prep.walls || {};
    var pc = prep.ceiling || {};
    var pf = prep.floor || {};
    var el = room.electric || {};
    var heat = room.heating || {};
    var n = {};
    var out = { needs: n, wallpaper: null, roll: null, radiator: null };

    function add(key, value) {
      if (value > 0) n[key] = (n[key] || 0) + value;
    }

    var floorKey = FLOOR_AREA_KEYS[room.floor];
    var floorRest = Math.max(0, g.perimeter - g.doorsWidth);

    // Пол
    if (floorKey) add(floorKey, g.floorArea);
    if (UNDERLAY_FLOORS[room.floor]) add('underlay', g.floorArea);
    if (PLINTH_FLOORS[room.floor]) add('floorPlinth', floorRest);
    if (room.floor === 'linoleum' || room.floor === 'carpet') {
      out.roll = { key: room.floor, name: room.name, length: g.length, width: g.width, area: g.floorArea };
    }
    if (pf.screed) add('screed', g.floorArea);
    if (pf.leveler) add('leveler', g.floorArea);
    if (pf.primer) add('primer', g.floorArea);
    if (pf.waterproofing) add('waterproofing', g.floorArea + floorRest * toNumber(P('waterproofing').upturn));

    // Стены
    if (room.walls === 'paint') add('paintWall', g.wallNet);
    if (room.walls === 'tile') add('tileWall', g.wallNet);
    if (room.walls === 'panels') add('panels', g.wallNet);
    if (room.walls === 'wallpaper') {
      add('wallpaper', g.wallNet);
      add('wallpaperGlue', g.wallNet);
      if (g.perimeter > 0 && g.height > 0) {
        out.wallpaper = { perimeter: g.perimeter, height: g.height, openingsWidth: g.openingsWidth, area: g.wallNet };
      }
    }
    if (pw.plaster) add('plaster', g.wallNet);
    if (pw.puttyStart) add('puttyStart', g.wallNet);
    if (pw.putty) add('putty', g.wallNet);
    if (pw.fiberglass) add('fiberglass', g.wallNet);
    if (pw.primer) add('primer', g.wallNet);

    // Потолок
    if (room.ceiling === 'paint') add('paintCeiling', g.ceilingArea);
    if (room.ceiling === 'stretch') add('stretchCeiling', g.ceilingArea);
    if (room.ceiling === 'panels') add('panels', g.ceilingArea);
    if (pc.plaster) add('plaster', g.ceilingArea);
    if (pc.puttyStart) add('puttyStart', g.ceilingArea);
    if (pc.putty) add('putty', g.ceilingArea);
    if (pc.primer) add('primer', g.ceilingArea);
    if (pc.plinth) add('ceilingPlinth', g.perimeter);

    // Плиточные работы: клей и затирка — на всю плитку комнаты
    var tileArea = (room.floor === 'tile' ? g.floorArea : 0) + (room.walls === 'tile' ? g.wallNet : 0);
    add('tileAdhesive', tileArea);
    add('grout', tileArea);

    // Гипсокартон и каркас
    var step = toNumber(P('profileCD').step);
    if (pw.drywall) {
      add('drywall', g.wallNet);
      if (step > 0) add('profileCD', ceilSafe(g.perimeter / step) * g.height);
      add('profileUD', 2 * g.perimeter);
    }
    if (pc.drywall) {
      add('drywall', g.ceilingArea);
      var shortSide = Math.min(g.length, g.width);
      var longSide = Math.max(g.length, g.width);
      if (step > 0 && shortSide > 0) add('profileCD', Math.max(1, ceilSafe(shortSide / step) - 1) * longSide);
      add('profileUD', g.perimeter);
    }

    // Окна и двери
    var sillOverhang = toNumber(P('windowSill').overhang);
    (room.openings || []).forEach(function (o) {
      var w = toNumber(o.width);
      var h = toNumber(o.height);
      var c = toNumber(o.count);
      if ((o.type || 'window') === 'window') {
        if (WINDOW_KEYS[o.replace]) add(WINDOW_KEYS[o.replace], w * h * c);
        if (o.sill) add('windowSill', (w + sillOverhang) * c);
        if (o.slopes) add('windowSlopes', (2 * h + w) * c);
      } else if (DOOR_KEYS[o.replace]) {
        add(DOOR_KEYS[o.replace], c);
      }
    });

    // Электрика
    var sockets = toNumber(el.sockets);
    var switches = toNumber(el.switches);
    var lights = toNumber(el.lights);
    add('elSocket', sockets);
    add('elSwitch', switches);
    add('elBox', sockets + switches);
    add('elLight', lights);
    if (sockets > 0) add('cableSocket', toNumber(P('cableSocket').toPanel) + g.perimeter + sockets * g.height);
    if (switches + lights > 0) {
      add('cableLight', toNumber(P('cableLight').toPanel) + g.length + g.width + (switches + lights) * g.height);
    }

    // Отопление
    if (heat.radiators) {
      var watts = roomHeatPower(g.floorArea, g.height, P('radiator').wattsPerM2);
      add('radiator', watts);
      if (watts > 0) out.radiator = { name: room.name, watts: watts, radiators: g.windowsCount };
    }
    if (heat.floor) {
      var mat = matArea(g.floorArea, P('floorHeating'));
      add('floorHeating', mat);
      if (mat > 0) add('thermostat', 1);
    }

    return out;
  }

  /** Для совместимости: только потребность комнаты по материалам. */
  function roomMaterialAreas(room, geometry, paramsOf) {
    return roomNeeds(room, geometry, paramsOf).needs;
  }

  /* ================================================================== *
   * 7. Расчёт всего объекта
   * ================================================================== */

  var CUSTOM_BASIS = {
    floor: 'floorArea', walls: 'wallNet', ceiling: 'ceilingArea', perimeter: 'perimeter'
  };

  /** Сумма по комнатам для своей позиции (rooms: null — все комнаты). */
  function customBase(item, roomResults) {
    if (item.basis === 'count' || !CUSTOM_BASIS[item.basis]) return toNumber(item.quantity);
    var field = CUSTOM_BASIS[item.basis];
    var selected = Array.isArray(item.rooms) ? item.rooms : null;
    return roomResults.reduce(function (sum, r) {
      if (selected && selected.indexOf(r.id) < 0) return sum;
      return sum + r.geometry[field];
    }, 0);
  }

  /**
   * Полный расчёт: project = { rooms, materials, disabled, custom }.
   * Потребности всех комнат по каждому материалу складываются, и только потом считаются
   * упаковки — так покупается меньше лишнего, чем при округлении по каждой комнате.
   * Исключения — то, что режется или ставится в каждой комнате отдельно:
   * обои (по высоте), линолеум и ковролин (отрезы), радиаторы (секции).
   */
  function calculateProject(project) {
    project = project || {};
    var rooms = project.rooms || [];
    var disabled = project.disabled || {};
    var cache = {};
    function P(key) {
      if (!cache[key]) cache[key] = materialParams(project.materials, key);
      return cache[key];
    }

    var totals = {};
    var wallpaperWalls = [];
    var rollRooms = { linoleum: [], carpet: [] };
    var radiatorRooms = [];

    var roomResults = rooms.map(function (room) {
      var g = roomGeometry(room);
      var r = roomNeeds(room, g, P);
      Object.keys(r.needs).forEach(function (k) { totals[k] = (totals[k] || 0) + r.needs[k]; });
      if (r.wallpaper) wallpaperWalls.push(r.wallpaper);
      if (r.roll) rollRooms[r.roll.key].push(r.roll);
      if (r.radiator) radiatorRooms.push(r.radiator);
      return { id: room.id, name: room.name, geometry: g, areas: r.needs };
    });

    var materials = [];
    var skipped = [];
    MATERIAL_ORDER.forEach(function (key) {
      if (!(totals[key] > 0)) return;
      if (disabled[key]) { skipped.push(key); return; }
      var p = P(key);
      var meta = MATERIALS[key];
      var base = totals[key];
      var r;
      switch (meta.kind) {
        case 'area': r = key === 'laminate' ? calcLaminate(base, p) : calcByArea(base, p, unitAreaOf(key, p)); break;
        case 'tile': r = calcTile(base, p); break;
        case 'roll': r = calcRollCovering(rollRooms[key], p); break;
        case 'pieces': r = calcPieces(base, p); break;
        case 'paint': r = calcPaint(base, p); break;
        case 'wallpaper': r = calcWallpaper(wallpaperWalls, p); break;
        case 'glue': r = calcCoverage(base, p); break;
        case 'adhesive': r = calcTileAdhesive(totals.tileFloor || 0, totals.tileWall || 0, p); break;
        case 'grout':
          r = calcGrout([
            { area: totals.tileFloor || 0, tileLength: P('tileFloor').tileLength, tileWidth: P('tileFloor').tileWidth },
            { area: totals.tileWall || 0, tileLength: P('tileWall').tileLength, tileWidth: P('tileWall').tileWidth }
          ], p);
          break;
        case 'layered': r = key === 'primer' ? calcPrimer(base, p) : calcWaterproofing(base, p); break;
        case 'drymix': r = calcDryMix(base, p); break;
        case 'measured': r = calcMeasured(base, p); break;
        case 'count': r = calcCount(base, p); break;
        case 'cable': r = calcCable(base, p); break;
        case 'radiator': r = calcRadiators(radiatorRooms, p); break;
        case 'heatingMat': r = calcHeatingMat(base, p); break;
      }
      r.key = key;
      r.title = meta.title;
      r.category = meta.category;
      r.kind = meta.kind;
      r.baseUnit = meta.baseUnit;
      r.priced = toNumber(p.price) > 0;
      materials.push(r);
    });

    (project.custom || []).forEach(function (item) {
      var base = customBase(item, roomResults);
      if (!(base > 0)) return;
      var r = calcCustom(base, item);
      r.key = 'custom:' + item.id;
      r.title = item.name || 'Без названия';
      r.category = 'custom';
      r.kind = 'custom';
      r.basis = item.basis;
      r.priced = toNumber(item.price) > 0;
      materials.push(r);
    });

    var totalCost = materials.reduce(function (s, m) { return s + m.cost; }, 0);
    var missingPrices = materials.filter(function (m) { return !m.priced; }).length;

    return {
      rooms: roomResults,
      materials: materials,
      skipped: skipped,
      totals: totals,
      totalCost: totalCost,
      missingPrices: missingPrices
    };
  }

  return {
    CATEGORIES: CATEGORIES,
    MATERIALS: MATERIALS,
    DEFAULT_MATERIALS: DEFAULT_MATERIALS,
    MATERIAL_ORDER: MATERIAL_ORDER,
    MATERIAL_TITLES: MATERIAL_TITLES,
    parseNumber: parseNumber,
    toNumber: toNumber,
    parseList: parseList,
    ceilSafe: ceilSafe,
    floorSafe: floorSafe,
    ceilStep: ceilStep,
    withReserve: withReserve,
    packsNeeded: packsNeeded,
    round: round,
    openingsArea: openingsArea,
    openingsWidth: openingsWidth,
    windowsCount: windowsCount,
    roomGeometry: roomGeometry,
    calcByArea: calcByArea,
    calcLaminate: calcLaminate,
    unitAreaOf: unitAreaOf,
    calcTile: calcTile,
    bestRollCut: bestRollCut,
    calcRollCovering: calcRollCovering,
    calcPieces: calcPieces,
    calcPaint: calcPaint,
    wallpaperStripLength: wallpaperStripLength,
    calcWallpaper: calcWallpaper,
    calcCoverage: calcCoverage,
    calcDryMix: calcDryMix,
    calcTileAdhesive: calcTileAdhesive,
    groutRate: groutRate,
    calcGrout: calcGrout,
    calcLayered: calcLayered,
    calcPrimer: calcPrimer,
    calcWaterproofing: calcWaterproofing,
    calcMeasured: calcMeasured,
    calcCount: calcCount,
    calcCable: calcCable,
    roomHeatPower: roomHeatPower,
    calcRadiators: calcRadiators,
    matArea: matArea,
    calcHeatingMat: calcHeatingMat,
    calcCustom: calcCustom,
    customBase: customBase,
    roomNeeds: roomNeeds,
    roomMaterialAreas: roomMaterialAreas,
    materialParams: materialParams,
    calculateProject: calculateProject
  };
});
