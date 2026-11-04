// Тесты формул. Запуск: из папки remont-calc выполнить `npm test` или `node --test tests/`.
// Все ожидаемые значения посчитаны вручную — расчёт приведён в комментариях.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../formulas.js');

// Сравнение дробных чисел с допуском.
function near(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${msg || ''} ожидалось ${expected}, получено ${actual}`);
}

// Типовая комната для примеров: 4 × 3 м, потолок 2,7 м, окно 1,5×1,4, дверь 0,9×2,0.
function sampleRoom(extra) {
  return Object.assign({
    id: 'r1', name: 'Спальня', length: 4, width: 3, height: 2.7,
    openings: [
      { type: 'window', width: 1.5, height: 1.4, count: 1 },
      { type: 'door', width: 0.9, height: 2.0, count: 1 }
    ],
    floor: 'none', walls: 'none', ceiling: 'none',
    prep: { walls: {}, ceiling: {}, floor: {} }
  }, extra);
}

const params = (key, extra) => Object.assign(F.materialParams(null, key), extra);

/* ------------------------------------------------------------------ */
/* Вспомогательные функции                                             */
/* ------------------------------------------------------------------ */

test('разбор чисел: запятая, пробелы, мусор', () => {
  assert.equal(F.parseNumber('2,5'), 2.5);
  assert.equal(F.parseNumber('2.5'), 2.5);
  assert.equal(F.parseNumber(' 1 200 '), 1200);
  assert.equal(F.parseNumber(3), 3);
  assert.ok(Number.isNaN(F.parseNumber('')));
  assert.ok(Number.isNaN(F.parseNumber('abc')));
  assert.ok(Number.isNaN(F.parseNumber('1,2,3')));
  assert.equal(F.toNumber('abc'), 0);
  assert.equal(F.toNumber('-1'), 0, 'отрицательные размеры считаются нулём');
  assert.equal(F.toNumber('0,15'), 0.15);
});

test('список ширин и округление до шага', () => {
  assert.deepEqual(F.parseList('3; 2,5 2'), [2, 2.5, 3]);
  assert.deepEqual(F.parseList(''), []);
  assert.deepEqual(F.parseList('abc; 0; 4'), [4]);
  near(F.ceilStep(6.2, 0.5), 6.5);
  near(F.ceilStep(6, 0.5), 6);
  near(F.ceilStep(6.2, 0), 6.2, 'шаг 0 — без округления');
});

test('округление защищено от погрешности дробей', () => {
  assert.equal(F.ceilSafe(4.0000000001), 4);
  assert.equal(F.ceilSafe(4.1), 5);
  assert.equal(F.ceilSafe(0), 0);
  assert.equal(F.ceilSafe((0.1 + 0.2) / 0.3), 1); // в компьютере это 1,0000000000000002
  assert.equal(F.floorSafe(2.9999999999), 3);
  assert.equal(F.floorSafe(2.5), 2);
});

test('запас и упаковки', () => {
  near(F.withReserve(100, 10), 110);
  near(F.withReserve(100, '7,5'), 107.5);
  near(F.withReserve(100, ''), 100, 'пустой запас = 0 %');
  // 100 × 1,1 = 110,00000000000001 → ровно 11 упаковок по 10, а не 12
  assert.equal(F.packsNeeded(F.withReserve(100, 10), 10), 11);
  assert.equal(F.packsNeeded(10.1, 10), 2);
  assert.equal(F.packsNeeded(5, 0), 0, 'размер упаковки не задан');
});

/* ------------------------------------------------------------------ */
/* Геометрия                                                           */
/* ------------------------------------------------------------------ */

test('геометрия комнаты', () => {
  const g = F.roomGeometry(sampleRoom());
  near(g.floorArea, 12);          // 4 × 3
  near(g.ceilingArea, 12);
  near(g.perimeter, 14);          // 2 × (4 + 3)
  near(g.wallGross, 37.8);        // 14 × 2,7
  near(g.openingsArea, 3.9);      // 1,5 × 1,4 + 0,9 × 2,0 = 2,1 + 1,8
  near(g.wallNet, 33.9);          // 37,8 − 3,9
  near(g.openingsWidth, 2.4);     // 1,5 + 0,9
  near(g.doorsWidth, 0.9);
  assert.equal(g.windowsCount, 1);
  assert.deepEqual(g.warnings, []);
});

test('геометрия: количество проёмов и ввод с запятой', () => {
  const g = F.roomGeometry(sampleRoom({
    length: '5,2', width: '3,5', height: '2,75',
    openings: [{ width: '1,2', height: '1,5', count: '2' }]
  }));
  near(g.floorArea, 18.2);                 // 5,2 × 3,5
  near(g.perimeter, 17.4);                 // 2 × 8,7
  near(g.wallGross, 47.85);                // 17,4 × 2,75
  near(g.openingsArea, 3.6);               // 1,2 × 1,5 × 2
  near(g.wallNet, 44.25);
  assert.equal(g.windowsCount, 2, 'проём без типа считается окном');
});

test('геометрия: предупреждения', () => {
  const empty = F.roomGeometry({ length: '', width: 3, height: '' });
  assert.ok(empty.warnings.includes('не заданы длина или ширина'));
  assert.ok(empty.warnings.includes('не задана высота'));

  const tooBig = F.roomGeometry({ length: 1, width: 1, height: 1, openings: [{ width: 2, height: 2, count: 2 }] });
  near(tooBig.wallNet, 0, 'площадь стен не уходит в минус');
  assert.ok(tooBig.warnings.some((w) => w.includes('окна и двери больше')));
});

/* ------------------------------------------------------------------ */
/* Напольные покрытия                                                  */
/* ------------------------------------------------------------------ */

test('плитка: штуки, упаковки, стоимость за м² и за упаковку', () => {
  const p = { tileLength: 60, tileWidth: 60, piecesPerPack: 4, reserve: 10, price: 1500, priceUnit: 'm2' };
  const r = F.calcTile(12, p);
  near(r.amount, 13.2);            // 12 × 1,1
  assert.equal(r.pieces, 37);      // 13,2 / 0,36 = 36,67 → 37 шт
  assert.equal(r.packs, 10);       // 37 / 4 = 9,25 → 10 уп
  near(r.packArea, 1.44);          // 4 × 0,36
  near(r.boughtArea, 14.4);        // 10 × 1,44
  near(r.cost, 21600);             // 14,4 м² × 1500 ₽
  assert.deepEqual(r.errors, []);

  const byPack = F.calcTile(12, Object.assign({}, p, { priceUnit: 'pack', price: 2000 }));
  near(byPack.cost, 20000);        // 10 уп × 2000 ₽
});

test('плитка: ровное деление без лишней штуки', () => {
  // 3,6 / 0,36 в компьютере = 10,000000000000002 — должно быть ровно 10 плиток
  const r = F.calcTile(3.6, { tileLength: 60, tileWidth: 60, piecesPerPack: 5, reserve: 0, price: 0 });
  assert.equal(r.pieces, 10);
  assert.equal(r.packs, 2);
});

test('плитка: ошибки при пустых параметрах', () => {
  const r = F.calcTile(10, { tileLength: '', tileWidth: 30, piecesPerPack: 0, reserve: 10, price: 0 });
  assert.equal(r.packs, 0);
  assert.equal(r.errors.length, 2);
});

test('ламинат', () => {
  const r = F.calcLaminate(20, { packArea: 2.397, reserve: 7, price: 800, priceUnit: 'm2' });
  near(r.amount, 21.4);            // 20 × 1,07
  assert.equal(r.packs, 9);        // 21,4 / 2,397 = 8,93 → 9
  near(r.boughtArea, 21.573);      // 9 × 2,397
  near(r.cost, 17258.4);           // 21,573 × 800

  const byPack = F.calcLaminate(20, { packArea: 2.397, reserve: 7, price: 1900, priceUnit: 'pack' });
  near(byPack.cost, 17100);        // 9 × 1900
  assert.deepEqual(F.calcLaminate(5, { packArea: 0 }).errors, ['не задана площадь в упаковке']);
});

test('материалы «по площади»: гипсокартон, панели, стеклохолст', () => {
  // ГКЛ 1,2 × 2,5 = 3 м²: 33,9 × 1,1 = 37,29 / 3 = 12,43 → 13 листов × 500 ₽
  const gkl = params('drywall', { price: 500 });
  near(F.unitAreaOf('drywall', gkl), 3);
  const r = F.calcByArea(33.9, gkl, F.unitAreaOf('drywall', gkl));
  assert.equal(r.packs, 13);
  near(r.cost, 6500);

  // панель 0,25 × 2,7 = 0,675 м²: 10 × 1,1 = 11 / 0,675 = 16,3 → 17 панелей
  const pan = params('panels');
  assert.equal(F.calcByArea(10, pan, F.unitAreaOf('panels', pan)).packs, 17);

  // стеклохолст 50 м²: 120 × 1,1 = 132 / 50 → 3 рулона
  const fg = params('fiberglass');
  assert.equal(F.calcByArea(120, fg, F.unitAreaOf('fiberglass', fg)).packs, 3);
});

test('линолеум: подбор ширины рулона и направления', () => {
  const widths = [2, 2.5, 3, 3.5, 4];
  // 4 × 3: рулон 3 м, один отрез 4,1 м = 12,3 м² (рулон 4 м дал бы 4 × 3,1 = 12,4)
  let c = F.bestRollCut(4, 3, widths, 0.1);
  assert.equal(c.rollWidth, 3);
  assert.equal(c.strips, 1);
  near(c.cutLength, 4.1);
  near(c.area, 12.3);
  // 5,2 × 3,5: рулон 3,5 м, отрез 5,3 м = 18,55 м²
  c = F.bestRollCut(5.2, 3.5, widths, 0.1);
  assert.equal(c.rollWidth, 3.5);
  near(c.area, 18.55);
  // 6 × 5 шире любого рулона: 2 полосы по 2,5 м длиной 6,1 м = 30,5 м²
  c = F.bestRollCut(6, 5, widths, 0.1);
  assert.equal(c.rollWidth, 2.5);
  assert.equal(c.strips, 2);
  near(c.area, 30.5);

  const r = F.calcRollCovering([{ name: 'A', length: 4, width: 3, area: 12 }, { name: 'B', length: 6, width: 5, area: 30 }],
    { rollWidths: '2; 2,5; 3; 3,5; 4', trim: 0.1, reserve: 0, price: 500 });
  near(r.area, 42);
  near(r.amount, 42.8);            // 12,3 + 30,5
  assert.equal(r.packs, 3);        // 1 + 2 отреза
  near(r.cost, 21400);
  assert.deepEqual(F.calcRollCovering([], { rollWidths: '' }).errors, ['не заданы ширины рулона']);
});

test('плинтус и профили — штуками по длине', () => {
  // 13,1 м × 1,1 = 14,41 / 2,5 = 5,76 → 6 планок × 300 ₽
  const r = F.calcPieces(13.1, { pieceLength: 2.5, reserve: 10, price: 300 });
  assert.equal(r.packs, 6);
  near(r.cost, 1800);
  assert.equal(F.calcPieces(10, { pieceLength: 0 }).errors.length, 1);
});

/* ------------------------------------------------------------------ */
/* Стены, потолок                                                      */
/* ------------------------------------------------------------------ */

test('краска', () => {
  const r = F.calcPaint(33.9, { coverage: 8, coats: 2, canVolume: 9, reserve: 10, price: 5000 });
  near(r.amount, 9.3225);          // 33,9 × 2 / 8 = 8,475 л × 1,1
  assert.equal(r.amountUnit, 'л');
  assert.equal(r.packs, 2);        // 9,3225 / 9 → 2 банки
  near(r.cost, 10000);

  const small = F.calcPaint(10, { coverage: 10, coats: 2, canVolume: 2.5, reserve: 0, price: 0 });
  near(small.amount, 2);           // 10 × 2 / 10
  assert.equal(small.packs, 1);
});

test('обои: длина полосы с припуском и раппортом', () => {
  near(F.wallpaperStripLength(2.7, 0.1, 0), 2.8);
  // 2,8 / 0,64 = 4,375 → 5 раппортов × 0,64 = 3,2 м
  near(F.wallpaperStripLength(2.7, 0.1, 0.64), 3.2);
  // ровно 4 раппорта по 0,7 — лишний не добавляется
  near(F.wallpaperStripLength(2.7, 0.1, 0.7), 2.8);
});

test('обои: одна комната', () => {
  const p = { rollWidth: 1.06, rollLength: 10.05, rapport: 0, trim: 0.1, subtractOpenings: false, reserve: 0, price: 1200 };
  const walls = [{ perimeter: 14, height: 2.7, openingsWidth: 2.4, area: 33.9 }];
  const r = F.calcWallpaper(walls, p);
  assert.equal(r.strips, 14);           // 14 / 1,06 = 13,2 → 14 полос
  assert.equal(r.groups[0].stripsPerRoll, 3); // 10,05 / 2,8 = 3,59 → 3 полосы из рулона
  assert.equal(r.packs, 5);             // 14 / 3 = 4,67 → 5 рулонов
  near(r.cost, 6000);
  near(r.area, 33.9);

  // запас 5 %: 14 × 1,05 = 14,7 → 15 полос → 5 рулонов
  assert.equal(F.calcWallpaper(walls, Object.assign({}, p, { reserve: 5 })).packs, 5);
  // запас 10 %: 14 × 1,1 = 15,4 → 16 полос → 6 рулонов
  assert.equal(F.calcWallpaper(walls, Object.assign({}, p, { reserve: 10 })).packs, 6);
  // с вычетом проёмов: (14 − 2,4) / 1,06 = 10,94 → 11 полос → 4 рулона
  assert.equal(F.calcWallpaper(walls, Object.assign({}, p, { subtractOpenings: true })).packs, 4);
});

test('обои: комнаты одной высоты считаются вместе, разной — отдельно', () => {
  const p = { rollWidth: 1.06, rollLength: 10.05, rapport: 0, trim: 0.1, subtractOpenings: false, reserve: 0, price: 0 };
  const same = F.calcWallpaper([
    { perimeter: 14, height: 2.7, area: 0 },   // 14 полос
    { perimeter: 10, height: 2.7, area: 0 }    // 10 / 1,06 = 9,43 → 10 полос
  ], p);
  assert.equal(same.strips, 24);
  assert.equal(same.packs, 8);   // 24 / 3 = 8 (по отдельности было бы 5 + 4 = 9)

  const diff = F.calcWallpaper([
    { perimeter: 14, height: 2.7, area: 0 },   // полоса 2,8 м: 14 полос / 3 → 5 рулонов
    { perimeter: 10, height: 3.0, area: 0 }    // полоса 3,1 м: 10 полос / 3 → 4 рулона
  ], p);
  assert.equal(diff.groups.length, 2);
  assert.equal(diff.packs, 9);
});

test('обои: полоса длиннее рулона — ошибка', () => {
  const r = F.calcWallpaper([{ perimeter: 10, height: 2.7, area: 0 }],
    { rollWidth: 0.53, rollLength: 2, rapport: 0, trim: 0.1, reserve: 0, price: 0 });
  assert.equal(r.packs, 0);
  assert.ok(r.errors.some((e) => e.includes('длиннее рулона')));
});

test('клей для обоев', () => {
  // 33,9 × 1,1 = 37,29 м² / 30 м² на пачку → 2 пачки
  const r = F.calcCoverage(33.9, { coverage: 30, reserve: 10, price: 400 });
  assert.equal(r.packs, 2);
  near(r.cost, 800);
});

test('натяжной потолок, окна, подоконники — оплата за измеренное', () => {
  near(F.calcMeasured(12, { price: 900 }).cost, 10800);          // 12 м² × 900
  near(F.calcMeasured(2.1, { price: 12000 }).cost, 25200);       // окно 2,1 м² × 12 000
  near(F.calcMeasured(10, { reserve: 10, price: 100 }).amount, 11);
});

/* ------------------------------------------------------------------ */
/* Плиточные и черновые работы                                         */
/* ------------------------------------------------------------------ */

test('клей для плитки: пол и стены с разной толщиной слоя', () => {
  // (3,4 × 4 мм + 18,09 × 3 мм) × 1,2 = 81,444 кг × 1,1 = 89,5884 кг → 4 мешка по 25 кг
  const r = F.calcTileAdhesive(3.4, 18.09, params('tileAdhesive', { price: 450 }));
  near(r.amount, 89.5884);
  assert.equal(r.packs, 4);
  near(r.cost, 1800);
  near(r.area, 21.49);
});

test('затирка: формула расхода на м²', () => {
  // 30×30 см, шов 2 мм, глубина 8 мм: (300 + 300) / (300 × 300) × 2 × 8 × 1,6 = 0,170667 кг/м²
  near(F.groutRate(30, 30, 2, 8, 1.6), 0.17066666666);
  // 60×60, шов 2, глубина 9: 1200 / 360000 × 18 × 1,6 = 0,096
  near(F.groutRate(60, 60, 2, 9, 1.6), 0.096);
  assert.equal(F.groutRate(0, 30, 2, 8, 1.6), 0);

  // пол 10 м² плитки 60×60 (0,096) + стены 20 м² плитки 30×60 (900/180000 × 18 × 1,6 = 0,144)
  // = 0,96 + 2,88 = 3,84 кг × 1,1 = 4,224 кг → 3 упаковки по 2 кг
  const r = F.calcGrout([
    { area: 10, tileLength: 60, tileWidth: 60 },
    { area: 20, tileLength: 30, tileWidth: 60 }
  ], params('grout'));
  near(r.amount, 4.224);
  assert.equal(r.packs, 3);
  near(r.area, 30);
});

test('сухие смеси: штукатурка, шпаклёвки, стяжка, наливной пол', () => {
  const plaster = F.calcDryMix(33.9, { consumptionPerMm: 0.85, thickness: 10, bagWeight: 30, reserve: 10, price: 450 });
  near(plaster.amount, 316.965);   // 33,9 × 0,85 × 10 = 288,15 кг × 1,1
  assert.equal(plaster.amountUnit, 'кг');
  assert.equal(plaster.packs, 11); // 316,965 / 30 = 10,57 → 11 мешков
  near(plaster.cost, 4950);

  const putty = F.calcDryMix(45.9, { consumptionPerMm: 1.2, thickness: 1.5, bagWeight: 20, reserve: 10, price: 0 });
  near(putty.amount, 90.882);      // 45,9 × 1,2 × 1,5 = 82,62 кг × 1,1
  assert.equal(putty.packs, 5);    // 90,882 / 20 = 4,54 → 5

  // стяжка 12 м² × 2 кг × 40 мм = 960 кг × 1,1 = 1056 кг / 25 → 43 мешка
  assert.equal(F.calcDryMix(12, params('screed')).packs, 43);
  // наливной пол 12 м² × 1,6 × 5 мм = 96 кг × 1,1 = 105,6 / 25 → 5 мешков
  assert.equal(F.calcDryMix(12, params('leveler')).packs, 5);
});

test('грунт и гидроизоляция — по слоям', () => {
  const r = F.calcPrimer(57.9, { consumption: 0.15, coats: 2, canisterVolume: 10, reserve: 10, price: 700 });
  near(r.amount, 19.107);          // 57,9 × 0,15 × 2 = 17,37 л × 1,1
  assert.equal(r.packs, 2);        // 19,107 / 10 → 2 канистры
  near(r.cost, 1400);

  // гидроизоляция 4,7 м² × 0,7 кг × 2 слоя = 6,58 × 1,1 = 7,238 кг → 2 ведра по 5 кг
  const w = F.calcWaterproofing(4.7, params('waterproofing'));
  near(w.amount, 7.238);
  assert.equal(w.amountUnit, 'кг');
  assert.equal(w.packs, 2);
});

/* ------------------------------------------------------------------ */
/* Электрика и отопление                                               */
/* ------------------------------------------------------------------ */

test('кабель: метры и бухты', () => {
  // 31,6 м × 1,15 = 36,34 → 37 м; бухта 100 м → 1
  const r = F.calcCable(31.6, { coilLength: 100, reserve: 15, price: 80, priceUnit: 'm' });
  assert.equal(r.meters, 37);
  assert.equal(r.coils, 1);
  near(r.cost, 2960);
  near(F.calcCable(31.6, { coilLength: 100, reserve: 15, price: 6000, priceUnit: 'pack' }).cost, 6000);
  near(F.calcCable(250, { coilLength: 100, reserve: 0, price: 6000, priceUnit: 'pack' }).cost, 18000); // 3 бухты
});

test('штучные позиции', () => {
  const r = F.calcCount(3, { price: 9000 });
  assert.equal(r.packs, 3);
  near(r.cost, 27000);
  assert.equal(F.calcCount(2.5, { price: 0 }).packs, 3, 'дробное количество округляется вверх');
});

test('радиаторы: мощность и секции', () => {
  near(F.roomHeatPower(12, 2.7, 100), 1200);       // 12 м² × 100 Вт
  near(F.roomHeatPower(12, 3, 100), 1200 * 3 / 2.7, 'потолок выше 2,7 м — мощность больше');

  // 1200 Вт × 1,1 = 1320 / 180 = 7,33 → 8 секций × 900 ₽
  let r = F.calcRadiators([{ name: 'A', watts: 1200, radiators: 1 }], { sectionPower: 180, reserve: 10, price: 900 });
  assert.equal(r.packs, 8);
  near(r.cost, 7200);
  // 1400 Вт × 1,1 = 1540 / 180 = 8,56 → 9 секций; 2 окна → 2 радиатора по 5 = 10 секций
  r = F.calcRadiators([{ name: 'A', watts: 1400, radiators: 2 }], { sectionPower: 180, reserve: 10, price: 0 });
  assert.equal(r.rooms[0].perRadiator, 5);
  assert.equal(r.packs, 10);
  assert.equal(r.radiators, 2);
  // без окон — один радиатор
  r = F.calcRadiators([{ name: 'A', watts: 500, radiators: 0 }], { sectionPower: 180, reserve: 0, price: 0 });
  assert.equal(r.radiators, 1);
  assert.equal(r.packs, 3);       // 500 / 180 = 2,78 → 3
});

test('тёплый пол: площадь мата и мощность', () => {
  // 3,4 м² × 70 % = 2,38 → до шага 0,5 → 2,5 м² мата; 2,5 × 150 = 375 Вт
  near(F.matArea(3.4, params('floorHeating')), 2.5);
  const r = F.calcHeatingMat(2.5, params('floorHeating', { price: 4000 }));
  near(r.watts, 375);
  near(r.cost, 10000);
});

/* ------------------------------------------------------------------ */
/* Что нужно для комнаты                                               */
/* ------------------------------------------------------------------ */

test('комната: отделка и сопутствующие материалы', () => {
  const a = F.roomMaterialAreas(sampleRoom({
    floor: 'laminate', walls: 'wallpaper', ceiling: 'paint',
    prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true, plinth: true }, floor: {} }
  }));
  near(a.laminate, 12);
  near(a.underlayXPS, 12, 'подложка под ламинат по умолчанию — XPS');
  near(a.plinthPVC, 13.1, 'плинтус ПВХ: периметр 14 − дверь 0,9');
  near(a.wallpaper, 33.9);
  near(a.wallpaperGlue, 33.9);
  near(a.paintCeiling, 12);
  near(a.ceilingPlinth, 14);
  near(a.putty, 45.9);             // стены 33,9 + потолок 12
  near(a.primer, 45.9);
  assert.equal(a.plaster, undefined);
  assert.equal(a.tileFloor, undefined);
  assert.equal(a.tileAdhesive, undefined);
});

test('комната: санузел — плитка, клей, затирка, гидроизоляция', () => {
  const bath = F.roomMaterialAreas({
    length: 2, width: 1.7, height: 2.7,
    openings: [{ type: 'door', width: 0.9, height: 2.1, count: 1 }],
    floor: 'tile', walls: 'tile', ceiling: 'stretch',
    prep: { walls: { plaster: true, primer: true }, floor: { primer: true, waterproofing: true }, ceiling: {} }
  });
  near(bath.tileFloor, 3.4);
  near(bath.tileWall, 18.09);      // 7,4 × 2,7 − 1,89
  near(bath.tileAdhesive, 21.49);  // 3,4 + 18,09
  near(bath.grout, 21.49);
  near(bath.stretchCeiling, 3.4);
  near(bath.waterproofing, 4.7);   // 3,4 + (7,4 − 0,9) × 0,2
  assert.equal(bath.plinthPVC, undefined, 'под плиткой напольный плинтус не считаем');
  assert.equal(bath.underlayXPS, undefined);
});

test('комната: гипсокартон и каркас', () => {
  const a = F.roomMaterialAreas(sampleRoom({ prep: { walls: { drywall: true }, ceiling: { drywall: true } } }));
  near(a.drywall, 45.9);           // стены 33,9 + потолок 12
  // стены: ⌈14 / 0,6⌉ = 24 стойки × 2,7 = 64,8 м; потолок: ⌈3 / 0,6⌉ − 1 = 4 ряда × 4 м = 16 м
  near(a.profileCD, 80.8);
  // ПН: стены 2 × 14 = 28, потолок 14
  near(a.profileUD, 42);
  // 80,8 × 1,1 = 88,88 / 3 = 29,6 → 30 профилей
  assert.equal(F.calcPieces(a.profileCD, params('profileCD')).packs, 30);
});

test('комната: окна, подоконники, откосы, двери', () => {
  const a = F.roomMaterialAreas(sampleRoom({
    openings: [
      { type: 'window', width: 1.5, height: 1.4, count: 2, replace: 'pvc', sill: true, slopes: true },
      { type: 'window', width: 3, height: 1.2, count: 1, replace: 'alu' },
      { type: 'door', width: 0.9, height: 2.0, count: 1, replace: 'interior' }
    ]
  }));
  near(a.windowPVC, 4.2);          // 1,5 × 1,4 × 2
  near(a.windowAlu, 3.6);          // 3 × 1,2
  near(a.windowSill, 3.2);         // (1,5 + 0,1) × 2
  near(a.windowSlopes, 8.6);       // (2 × 1,4 + 1,5) × 2
  near(a.doorEco, 1, '«межкомнатная» из первой версии считается как экошпон');
  assert.equal(a.windowWood, undefined);
  assert.equal(a.doorEntrance, undefined);

  const b = F.roomMaterialAreas(sampleRoom({
    openings: [
      { type: 'window', width: 2, height: 1.5, count: 1, replace: 'aluWarm' },
      { type: 'window', width: 3, height: 2.5, count: 1, replace: 'frameless' },
      { type: 'window', width: 1, height: 1, count: 1, replace: 'wood' },
      { type: 'door', width: 0.8, height: 2, count: 2, replace: 'veneer' },
      { type: 'door', width: 0.8, height: 2, count: 1, replace: 'enamel' },
      { type: 'door', width: 0.8, height: 2, count: 1, replace: 'solid' },
      { type: 'door', width: 0.8, height: 2, count: 1, replace: 'hidden' },
      { type: 'door', width: 0.9, height: 2, count: 1, replace: 'entrance' }
    ]
  }));
  near(b.windowAluWarm, 3);
  near(b.windowFrameless, 7.5);
  near(b.windowWood, 1);
  assert.equal(b.doorVeneer, 2);
  assert.equal(b.doorEnamel, 1);
  assert.equal(b.doorSolid, 1);
  assert.equal(b.doorHidden, 1);
  assert.equal(b.doorEntrance, 1);
});

test('комната: электрика', () => {
  const a = F.roomMaterialAreas(sampleRoom({ electric: { sockets: '4', switches: '1', lights: '1' } }));
  assert.equal(a.elSocket, 4);
  assert.equal(a.elSwitch, 1);
  assert.equal(a.elBox, 5);        // розетки + выключатели
  assert.equal(a.elLight, 1);
  near(a.cableSocket, 31.8);       // 7 до щита + 14 периметр + 4 × 2,7
  near(a.cableLight, 19.4);        // 7 + 4 + 3 + (1 + 1) × 2,7
  const none = F.roomMaterialAreas(sampleRoom({ electric: {} }));
  assert.equal(none.cableSocket, undefined, 'нет точек — нет кабеля');
});

test('комната: отопление', () => {
  const a = F.roomNeeds(sampleRoom({ heating: { radiators: true, floor: true } }));
  near(a.needs.radiatorBimetal, 1200, 'по умолчанию — биметалл'); // 12 м² × 100 Вт
  assert.deepEqual(a.radiator, { key: 'radiatorBimetal', name: 'Спальня', watts: 1200, radiators: 1 });
  near(a.needs.floorHeating, 8.5); // мат: 12 × 0,7 = 8,4 → 8,5 м²
  assert.equal(a.needs.thermostat, 1);

  const b = F.roomNeeds(sampleRoom({ heating: { radiators: true, radiatorType: 'castIron', floor: true, floorType: 'film' } }));
  near(b.needs.radiatorCastIron, 1200);
  assert.equal(b.needs.radiatorBimetal, undefined);
  near(b.needs.floorFilm, 8.5);
  const c = F.roomNeeds(sampleRoom({ heating: { floor: true, floorType: 'cable' } }));
  near(c.needs.floorCable, 8.4, 'кабель — без округления до размеров матов');
});

/* ------------------------------------------------------------------ */
/* Расчёт объекта                                                      */
/* ------------------------------------------------------------------ */

test('расчёт объекта: площади складываются, упаковки считаются по сумме', () => {
  // Две комнаты по 3 м² ламината. По отдельности: 3,21 / 2,397 → 2 уп. в каждой = 4.
  // Вместе: 6 × 1,07 = 6,42 / 2,397 = 2,68 → 3 уп.
  const room = (id) => ({ id, name: id, length: 2, width: 1.5, height: 2.7, openings: [], floor: 'laminate', walls: 'none', ceiling: 'none' });
  const res = F.calculateProject({ rooms: [room('a'), room('b')], materials: {} });
  const lam = res.materials.find((m) => m.key === 'laminate');
  assert.equal(lam.title, 'Ламинат');
  assert.equal(lam.category, 'floor');
  near(lam.area, 6);
  assert.equal(lam.packs, 3);
  assert.deepEqual(res.materials.map((m) => m.key), ['laminate', 'underlayXPS', 'plinthPVC']);
  assert.equal(res.missingPrices, 3, 'цены не введены');
  near(res.totalCost, 0);
});

test('расчёт объекта: цены пользователя и общая стоимость', () => {
  const project = {
    rooms: [sampleRoom({
      floor: 'laminate', walls: 'paint', ceiling: 'paint',
      prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true } }
    })],
    materials: {
      laminate: { price: '800' },
      paintWall: { price: '5000' },
      paintCeiling: { price: '4000', coverage: '10' },
      putty: { price: 600 },
      primer: { price: 700 }
    }
  };
  const res = F.calculateProject(project);
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  assert.deepEqual(Object.keys(byKey), ['laminate', 'underlayXPS', 'plinthPVC', 'paintWall', 'paintCeiling', 'putty', 'primer']);

  // ламинат: 12 × 1,07 = 12,84 / 2,397 = 5,36 → 6 уп × 2,397 = 14,382 м² × 800
  assert.equal(byKey.laminate.packs, 6);
  near(byKey.laminate.cost, 11505.6);
  // краска стен: 33,9 × 2 / 8 × 1,1 = 9,3225 л → 2 банки × 5000
  near(byKey.paintWall.cost, 10000);
  // краска потолка (укрывистость изменена на 10): 12 × 2 / 10 × 1,1 = 2,64 л → 1 банка × 4000
  near(byKey.paintCeiling.amount, 2.64);
  near(byKey.paintCeiling.cost, 4000);
  // шпаклёвка: 45,9 × 1,2 × 1,5 × 1,1 = 90,882 кг → 5 мешков × 600
  near(byKey.putty.cost, 3000);
  // грунт: 45,9 × 0,15 × 2 × 1,1 = 15,147 л → 2 канистры × 700
  near(byKey.primer.cost, 1400);

  near(res.totalCost, 11505.6 + 10000 + 4000 + 3000 + 1400);
  assert.equal(res.missingPrices, 2, 'нет цен у подложки и плинтуса');
  near(res.rooms[0].geometry.wallNet, 33.9);
});

test('расчёт объекта: обои по нескольким комнатам', () => {
  const res = F.calculateProject({
    rooms: [
      sampleRoom({ id: 'a', walls: 'wallpaper' }),
      sampleRoom({ id: 'b', length: 3, width: 2, walls: 'wallpaper' }) // периметр 10
    ],
    materials: { wallpaper: { reserve: 0, price: 1000 } }
  });
  const wp = res.materials.find((m) => m.key === 'wallpaper');
  assert.equal(wp.strips, 24);     // 14 + 10 полос
  assert.equal(wp.packs, 8);
  near(wp.cost, 8000);
});

test('расчёт объекта: клей и затирка берут размеры своей плитки', () => {
  const res = F.calculateProject({
    rooms: [{
      id: 'b', name: 'Санузел', length: 2, width: 1.7, height: 2.7,
      openings: [{ type: 'door', width: 0.9, height: 2.1, count: 1 }],
      floor: 'porcelain', walls: 'tile', ceiling: 'none', prep: {}
    }],
    materials: {}
  });
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  // клей: (3,4 × 4 + 18,09 × 3) × 1,2 × 1,1 = 89,5884 кг → 4 мешка
  near(byKey.tileAdhesive.amount, 89.5884);
  // затирка: 3,4 × 0,096 (60×60) + 18,09 × 0,144 (30×60) = 0,3264 + 2,60496 = 2,93136 × 1,1 = 3,224496 кг → 2 упаковки
  near(byKey.grout.amount, 3.224496);
  assert.equal(byKey.grout.packs, 2);
});

test('расчёт объекта: линолеум и радиаторы считаются по комнатам', () => {
  const res = F.calculateProject({
    rooms: [
      sampleRoom({ id: 'a', floor: 'linoleum', heating: { radiators: true } }),
      sampleRoom({ id: 'b', length: 6, width: 5, floor: 'linoleum', openings: [], heating: { radiators: true } })
    ],
    materials: { linoleum: { price: 500 }, radiatorBimetal: { price: 1000 } }
  });
  const lin = res.materials.find((m) => m.key === 'linoleum');
  near(lin.amount, 42.8);          // 12,3 + 30,5
  near(lin.cost, 21400);
  const rad = res.materials.find((m) => m.key === 'radiatorBimetal');
  // комната a: 1200 Вт → 8 секций; комната b: 30 м² → 3000 Вт × 1,1 / 180 = 18,3 → 19 секций, окон нет → 1 радиатор
  assert.equal(rad.packs, 27);
  near(rad.cost, 27000);
});

test('расчёт объекта: выключенный материал не считается', () => {
  const res = F.calculateProject({
    rooms: [sampleRoom({ floor: 'laminate' })],
    disabled: { underlayXPS: true }
  });
  assert.ok(!res.materials.some((m) => m.key === 'underlayXPS'));
  assert.deepEqual(res.skipped, ['underlayXPS']);
});

test('свои позиции: штучные и от площади', () => {
  const rooms = [sampleRoom({ id: 'r1' }), sampleRoom({ id: 'r2', length: 2, width: 2, openings: [] })];
  const project = {
    rooms,
    custom: [
      { id: 'c1', name: 'Унитаз', basis: 'count', quantity: '2', unit: 'шт.', price: 15000 },
      // монтажный клей: 1 баллон на 5 м² стен = 0,2 баллона на м², только в комнате r1
      { id: 'c2', name: 'Клей монтажный', basis: 'walls', rate: '0,2', unit: 'баллон', packSize: 1, rooms: ['r1'], price: 400 },
      // саморезы: 30 шт. на м² потолка во всех комнатах, в пачке 200
      { id: 'c3', name: 'Саморезы', basis: 'ceiling', rate: 30, unit: 'шт.', packSize: 200, price: 300 },
      { id: 'c4', name: 'Пустая', basis: 'count', quantity: '' }
    ]
  };
  const res = F.calculateProject(project);
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  assert.equal(byKey['custom:c1'].packs, 2);
  near(byKey['custom:c1'].cost, 30000);
  // 33,9 × 0,2 = 6,78 → 7 баллонов
  assert.equal(byKey['custom:c2'].packs, 7);
  near(byKey['custom:c2'].cost, 2800);
  // потолки 12 + 4 = 16 м² × 30 = 480 шт. / 200 → 3 пачки
  assert.equal(byKey['custom:c3'].packs, 3);
  assert.equal(byKey['custom:c1'].category, 'custom');
  assert.equal(byKey['custom:c4'], undefined, 'количество 0 — в итог не попадает');
});

test('полный объект: все расчёты дают числа, без NaN', () => {
  const all = {
    rooms: [
      sampleRoom({
        id: 'a', floor: 'parquet', walls: 'panels', ceiling: 'panels',
        prep: { floor: { screed: true, leveler: true, primer: true }, walls: { drywall: true, plaster: true, puttyStart: true, putty: true, fiberglass: true, primer: true }, ceiling: { drywall: true, plaster: true, puttyStart: true, putty: true, primer: true, plinth: true } },
        electric: { sockets: 5, switches: 2, lights: 3 },
        heating: { radiators: true, floor: true },
        openings: [
          { type: 'window', width: 1.4, height: 1.5, count: 1, replace: 'wood', sill: true, slopes: true },
          { type: 'door', width: 0.9, height: 2.1, count: 1, replace: 'entrance' }
        ]
      }),
      sampleRoom({ id: 'b', floor: 'carpet', walls: 'paint', ceiling: 'stretch' }),
      sampleRoom({ id: 'c', floor: 'vinyl', walls: 'tile', ceiling: 'paint' }),
      sampleRoom({ id: 'd', floor: 'parquetBlock', plinth: 'polymer', walls: 'liquid', ceiling: 'stretchFabric',
        electric: { power: 2 }, heating: { radiators: true, radiatorType: 'panel', floor: true, floorType: 'cable' } }),
      sampleRoom({ id: 'e', floor: 'vinylGlue', walls: 'decor', ceiling: 'rack', heating: { radiators: true, radiatorType: 'castIron', floor: true, floorType: 'film' } }),
      sampleRoom({ id: 'f', floor: 'porcelain', walls: 'mosaic', ceiling: 'none', heating: { radiators: true, radiatorType: 'alu' } }),
      sampleRoom({ id: 'g', floor: 'engineered', underlay: 'cork', plinth: 'wood', walls: 'wallpaperPaper', ceiling: 'paint' }),
      sampleRoom({ id: 'h', floor: 'solidWood', walls: 'wallpaperVinyl', ceiling: 'none' }),
      sampleRoom({ id: 'i', floor: 'laminate', underlay: 'pe', plinth: 'mdf', walls: 'porcelain', ceiling: 'none' }),
      sampleRoom({ id: 'j', floor: 'cork', underlay: 'conifer', walls: 'panelsMDF', ceiling: 'none' }),
      sampleRoom({ id: 'k', floor: 'tile', walls: 'none', ceiling: 'none' }),
      sampleRoom({
        id: 'l', floor: 'linoleum', walls: 'wallpaper', ceiling: 'none', prep: { floor: { waterproofing: true } },
        openings: ['pvc', 'aluWarm', 'alu', 'frameless'].map((r) => ({ type: 'window', width: 1, height: 1, count: 1, replace: r }))
          .concat(['eco', 'veneer', 'enamel', 'solid', 'hidden'].map((r) => ({ type: 'door', width: 0.8, height: 2, count: 1, replace: r })))
      }),
      sampleRoom({ id: 'm', floor: 'laminate', walls: 'none', ceiling: 'none' }),
      sampleRoom({ id: 'n', counts: Object.fromEntries(F.ROOM_ITEM_KEYS.map((k) => [k, 1])), pipes: { water: 'pex', sewer: true } }),
      sampleRoom({ id: 'o', counts: { toiletFloor: 1 }, pipes: { water: 'mp' } }),
      sampleRoom({ id: 'q', counts: { sinkWall: 1 } })
    ],
    materials: Object.fromEntries(F.MATERIAL_ORDER.map((k) => [k, { price: 100 }])),
    custom: [{ id: 'x', name: 'Пена', basis: 'count', quantity: 3, price: 500 }]
  };
  const res = F.calculateProject(all);
  const missing = F.MATERIAL_ORDER.filter((k) => !res.materials.some((m) => m.key === k));
  assert.deepEqual(missing, [], 'в полном объекте должны быть все материалы каталога');
  res.materials.forEach((m) => {
    assert.ok(Number.isFinite(m.cost) && m.cost >= 0, `${m.key}: стоимость ${m.cost}`);
    assert.ok(Number.isFinite(m.amount), `${m.key}: количество ${m.amount}`);
    assert.deepEqual(m.errors, [], `${m.key}: ${m.errors}`);
  });
  assert.ok(Number.isFinite(res.totalCost));
  assert.equal(res.missingPrices, 0);
});

test('виды подложки, плинтуса и сопутствующие материалы пола', () => {
  const lam = F.roomMaterialAreas(sampleRoom({ floor: 'laminate', underlay: 'cork', plinth: 'mdf' }));
  near(lam.underlayCork, 12);
  near(lam.plinthMDF, 13.1);
  assert.equal(lam.underlayXPS, undefined);
  assert.equal(lam.plinthPVC, undefined);

  const noUnder = F.roomMaterialAreas(sampleRoom({ floor: 'laminate', underlay: 'none', plinth: 'none' }));
  assert.equal(Object.keys(noUnder).filter((k) => k.startsWith('underlay') || k.startsWith('plinth')).length, 0);

  // штучный паркет: по умолчанию фанера, клей, лак, плинтус МДФ
  const block = F.roomMaterialAreas(sampleRoom({ floor: 'parquetBlock' }));
  ['parquetBlock', 'plywood', 'parquetGlue', 'parquetLacquer'].forEach((k) => near(block[k], 12, k));
  near(block.plinthMDF, 13.1);
  // клеевой кварцвинил — клей; замковый — без подложки и клея
  near(F.roomMaterialAreas(sampleRoom({ floor: 'vinylGlue' })).vinylAdhesive, 12);
  const spc = F.roomMaterialAreas(sampleRoom({ floor: 'vinyl' }));
  assert.equal(spc.vinylAdhesive, undefined);
  assert.equal(Object.keys(spc).filter((k) => k.startsWith('underlay')).length, 0);
  // керамогранит — без плинтуса и подложки, но с клеем и затиркой
  const pg = F.roomMaterialAreas(sampleRoom({ floor: 'porcelain' }));
  near(pg.porcelainFloor, 12);
  near(pg.tileAdhesive, 12);
  assert.equal(Object.keys(pg).filter((k) => k.startsWith('plinth')).length, 0);
});

test('подложки, фанера, клей и лак для паркета', () => {
  // фанера 1,525 × 1,525 = 2,325625 м²: 12 × 1,1 = 13,2 / 2,3256 = 5,68 → 6 листов
  const ply = params('plywood');
  assert.equal(F.calcByArea(12, ply, F.unitAreaOf('plywood', ply)).packs, 6);
  // хвойная 6,99 м²: 12 × 1,05 = 12,6 / 6,99 → 2 упаковки
  const con = params('underlayConifer');
  assert.equal(F.calcByArea(12, con, F.unitAreaOf('underlayConifer', con)).packs, 2);
  // клей для кварцвинила: 12 × 0,3 × 1,1 = 3,96 кг → 1 ведро 10 кг
  const res = F.calculateProject({ rooms: [sampleRoom({ floor: 'vinylGlue' }), sampleRoom({ id: 'p', floor: 'parquetBlock' })] });
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  near(byKey.vinylAdhesive.amount, 3.96);
  assert.equal(byKey.vinylAdhesive.packs, 1);
  // клей для паркета: 12 × 1,0 × 1,1 = 13,2 кг → 2 ведра по 10 кг
  near(byKey.parquetGlue.amount, 13.2);
  assert.equal(byKey.parquetGlue.packs, 2);
  // лак: 12 × 0,1 × 3 слоя × 1,1 = 3,96 л → 1 банка 5 л
  near(byKey.parquetLacquer.amount, 3.96);
  assert.equal(byKey.parquetLacquer.packs, 1);
  assert.equal(byKey.parquetLacquer.amountUnit, 'л');
});

test('стены: виды обоев считаются отдельно, жидкие обои, декоративная штукатурка, мозаика', () => {
  const res = F.calculateProject({
    rooms: [
      sampleRoom({ id: 'a', walls: 'wallpaper' }),
      sampleRoom({ id: 'b', walls: 'wallpaperPaper' }),
      sampleRoom({ id: 'c', walls: 'liquid' }),
      sampleRoom({ id: 'd', walls: 'decor' })
    ]
  });
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  // флизелиновые 1,06 м: 14 полос × 1,05 → 15 / 3 → 5 рулонов
  assert.equal(byKey.wallpaper.packs, 5);
  // бумажные 0,53 м: 14 / 0,53 = 26,4 → 27 полос × 1,05 = 28,35 → 29 / 3 → 10 рулонов
  assert.equal(byKey.wallpaperPaper.strips, 27);
  assert.equal(byKey.wallpaperPaper.packs, 10);
  // клей — на оба вида обоев: 67,8 м² × 1,1 = 74,58 / 30 → 3 пачки
  near(byKey.wallpaperGlue.area, 67.8);
  assert.equal(byKey.wallpaperGlue.packs, 3);
  // жидкие обои: 33,9 × 1,1 = 37,29 / 4 м² → 10 упаковок
  assert.equal(byKey.liquidWallpaper.packs, 10);
  // декоративная штукатурка: 33,9 × 3 кг × 1,1 = 111,87 кг → 5 мешков по 25 кг
  near(byKey.decorPlaster.amount, 111.87);
  assert.equal(byKey.decorPlaster.packs, 5);

  // мозаика: затирка по чипу 2 см и глубине 4 мм: (20 + 20) / 400 × 2 × 4 × 1,6 = 1,28 кг/м²
  const mos = F.calculateProject({ rooms: [sampleRoom({ walls: 'mosaic' })] });
  const grout = mos.materials.find((m) => m.key === 'grout');
  near(grout.rates[0].rate, 1.28);
  near(grout.amount, 33.9 * 1.28 * 1.1);
  // мозаика листами 30×30 раскладкой: стены 4 м — 14 × 9 = 126, стены 3 м — 10 × 9 = 90;
  // 2 × 126 + 2 × 90 = 432 − окно (5 × 4 = 20) − дверь (3 × 6 = 18) = 394 × 1,05 = 413,7 → 414 листов
  const mosaic = mos.materials.find((m) => m.key === 'mosaic');
  assert.equal(mosaic.layoutPieces, 394);
  assert.equal(mosaic.packs, 414);
});

test('потолки: натяжные, реечный, панели', () => {
  const res = F.calculateProject({
    rooms: [
      sampleRoom({ id: 'a', ceiling: 'stretchFabric' }),
      sampleRoom({ id: 'b', ceiling: 'rack' }),
      sampleRoom({ id: 'c', ceiling: 'panels', walls: 'panels' })
    ],
    materials: { stretchFabric: { price: 1500 }, rackCeiling: { price: 2000 } }
  });
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  near(byKey.stretchFabric.cost, 18000);   // 12 м² × 1500
  near(byKey.rackCeiling.amount, 12.6);    // 12 × 1,05
  near(byKey.rackCeiling.cost, 25200);
  near(byKey.panels.area, 45.9);           // стены 33,9 + потолок 12
});

test('радиаторы разных видов и тёплый пол кабелем', () => {
  // чугун 160 Вт: 1200 × 1,1 / 160 = 8,25 → 9 секций
  assert.equal(F.calcRadiators([{ watts: 1200, radiators: 1 }], params('radiatorCastIron')).packs, 9);
  // алюминий 175 Вт: 1320 / 175 = 7,54 → 8 секций
  assert.equal(F.calcRadiators([{ watts: 1200, radiators: 1 }], params('radiatorAlu')).packs, 8);
  // стальной панельный 1200 Вт: 1320 / 1200 = 1,1 → 2 радиатора
  assert.equal(F.calcRadiators([{ watts: 1200, radiators: 1 }], params('radiatorPanel')).packs, 2);

  // кабель: 3,4 м² × 70 % = 2,38 м² × 150 Вт = 357 Вт / 18 Вт/м = 19,8 → 20 м
  const cable = F.calcHeatingCable(F.matArea(3.4, params('floorCable')), params('floorCable', { price: 100 }));
  near(cable.watts, 357);
  assert.equal(cable.meters, 20);
  near(cable.cost, 2000);
  // плёнка: 12 × 70 % = 8,4 → 8,5 м² × 220 = 1870 Вт
  near(F.calcHeatingMat(F.matArea(12, params('floorFilm')), params('floorFilm')).watts, 1870);
});

test('электрика: силовые приборы', () => {
  const a = F.roomMaterialAreas(sampleRoom({ electric: { power: '2' } }));
  assert.equal(a.elPowerSocket, 2);
  assert.equal(a.elBox, 2);
  near(a.cablePower, 33.4);        // 2 × (7 + 4 + 3 + 2,7)
});

test('сантехника: смесители, сифоны, подводка, краны, трубы', () => {
  const a = F.roomMaterialAreas(sampleRoom({
    counts: { toiletFloor: 1, sinkVanity: 1, bathAcrylic: 1, washingMachine: 1, boiler: 1 }
  }));
  assert.equal(a.toiletFloor, 1);
  assert.equal(a.mixerSink, 1);
  assert.equal(a.mixerBath, 1);
  assert.equal(a.siphon, 3);       // раковина + ванна + стиральная машина
  assert.equal(a.flexHose, 5);     // унитаз 1 + раковина 2 + бойлер 2
  assert.equal(a.ballValve, 8);    // подводки: 1 + 2 + 2 + 1 + 2
  near(a.pipePP, 32);              // 8 подводок × 4 м (полипропилен по умолчанию)
  near(a.pipeSewer50, 7.5);        // раковина, ванна, стиральная машина × 2,5 м
  near(a.pipeSewer110, 1.5);       // унитаз × 1,5 м

  const kitchen = F.roomMaterialAreas(sampleRoom({ counts: { kitchenSink: 1, dishwasher: 1 }, pipes: { water: 'pex', sewer: true } }));
  assert.equal(kitchen.mixerKitchen, 1);
  assert.equal(kitchen.siphon, 1);
  assert.equal(kitchen.ballValve, 3);
  near(kitchen.pipePEX, 12);
  assert.equal(kitchen.pipePP, undefined);
  near(kitchen.pipeSewer50, 5);

  const noPipes = F.roomMaterialAreas(sampleRoom({ counts: { sinkWall: 1 }, pipes: { water: 'none', sewer: false } }));
  assert.equal(Object.keys(noPipes).filter((k) => k.startsWith('pipe')).length, 0, 'трубы не меняем');
  assert.equal(noPipes.mixerSink, 1);
});

test('электрика: виды розеток, выключателей, света, слаботочка', () => {
  const a = F.roomMaterialAreas(sampleRoom({
    counts: { elSocket: 2, elSocketDouble: 1, elSocketIP44: 1, elSwitch2: 1, elSwitchPass: 2, elSpot: 6, elLedStrip: 3,
      elInternet: 1, elTV: 1, elPowerSocket: 1 }
  }));
  assert.equal(a.elSocketDouble, 1);
  assert.equal(a.elSwitchPass, 2);
  assert.equal(a.elSpot, 6);
  near(a.elLedStrip, 3);
  assert.equal(a.elLedDriver, 1);
  assert.equal(a.elBox, 10);        // розетки 4 + выключатели 3 + силовая 1 + интернет 1 + ТВ 1
  near(a.cableSocket, 31.8);        // 7 + 14 + 4 × 2,7
  near(a.cableLight, 41);           // 7 + 4 + 3 + (3 выключателя + 6 спотов + лента) × 2,7
  near(a.cablePower, 16.7);         // 7 + (4 + 3 + 2,7)
  near(a.cableUTP, 19.7);           // 10 + 9,7
  near(a.cableCoax, 19.7);
});

test('электрощит: автоматы, дифавтоматы, размер щита', () => {
  const res = F.calculateProject({
    rooms: [
      sampleRoom({ id: 'a', counts: { elSocket: 3, elLight: 1, elSwitch: 1, elPowerSocket: 1 } }),
      sampleRoom({ id: 'b', counts: { elSocket: 2 } })
    ]
  });
  const byKey = Object.fromEntries(res.materials.map((m) => [m.key, m]));
  assert.equal(byKey.elRCBO.packs, 2);        // 2 розеточные линии
  assert.equal(byKey.elBreaker.packs, 2);     // линия света + силовая
  assert.equal(byKey.elMainBreaker.packs, 1);
  // модулей: 2 (ввод) + 2 × 1 + 2 × 2 = 8; с запасом 20 % = 9,6 → щит на 12
  assert.equal(byKey.elPanel.modules, 8);
  assert.equal(byKey.elPanel.size, 12);
  assert.equal(byKey.elPanel.packs, 1);

  const p = F.materialParams(null, 'elPanel');
  assert.equal(F.calcPanel(40, p).size, 48, '40 × 1,2 = 48 — ровно щит на 48');
  const big = F.calcPanel(70, p);       // 84 модуля — больше самого большого
  assert.equal(big.size, 72);
  assert.equal(big.packs, 2);

  const none = F.calculateProject({ rooms: [sampleRoom()] });
  assert.ok(!none.materials.some((m) => m.key === 'elPanel'), 'нет электрики — нет щита');
});

test('раскладка плитки: сетка, целые плитки в проёмах', () => {
  assert.deepEqual(F.tileGrid(2, 2.7, 0.6, 0.3), { cols: 4, rows: 9, pieces: 36 });   // 3,33 → 4 в ряду
  assert.deepEqual(F.tileGrid(1.8, 0.9, 0.6, 0.3), { cols: 3, rows: 3, pieces: 9 }, 'ровно — без лишней плитки');
  assert.equal(F.tileGrid(0, 2.7, 0.6, 0.3).pieces, 0);
  assert.equal(F.tilesInside(0.9, 2.1, 0.6, 0.3), 7);     // 1 × 7 целых плиток в двери
  assert.deepEqual(F.tileSides({ tileLength: 30, tileWidth: 60 }, 'horizontal'), { w: 0.6, h: 0.3 });
  assert.deepEqual(F.tileSides({ tileLength: 30, tileWidth: 60 }, 'vertical'), { w: 0.3, h: 0.6 });
  // пол 4 × 3 плиткой 60×60: 7 × 5 = 35 (подрезка по краю), а «по площади» было бы 12 / 0,36 = 33,3
  assert.equal(F.floorTileLayout({ length: 4, width: 3, floorArea: 12 }, { tileLength: 60, tileWidth: 60 }).pieces, 35);
  // 30×60 на пол 2 × 1,7: вдоль — 4 × 6 = 24, поперёк — 7 × 3 = 21 → берём 21
  assert.equal(F.floorTileLayout({ length: 2, width: 1.7, floorArea: 3.4 }, { tileLength: 30, tileWidth: 60 }).pieces, 21);
});

test('ванная: плитка на стены с вычетом двери и ванны, экран', () => {
  // санузел 2 × 1,7 × 2,7, дверь 0,7 × 2,1; плитка 30×60 горизонтально (0,6 × 0,3)
  const g = F.roomGeometry({ length: 2, width: 1.7, height: 2.7, openings: [{ type: 'door', width: 0.7, height: 2.1, count: 1 }] });
  const p = { tileLength: 30, tileWidth: 60, orientation: 'horizontal' };
  const openings = [{ type: 'door', width: 0.7, height: 2.1, count: 1 }];
  const noBath = F.wallTileLayout(g, openings, p, null);
  // стена 2 м: 4 × 9 = 36; стена 1,7 м: 3 × 9 = 27; всего 2 × 36 + 2 × 27 = 126; в двери целых 1 × 7 = 7 → 119
  assert.equal(noBath.gross, 126);
  assert.equal(noBath.openingsMinus, 7);
  assert.equal(noBath.pieces, 119);
  near(noBath.area, g.wallNet);

  const bath = { length: 1.7, width: 0.7, height: 0.6, place: 'corner', screen: false };
  const withBath = F.wallTileLayout(g, openings, p, bath);
  // за ванной вдоль: ⌊1,7 / 0,6⌋ × ⌊0,6 / 0,3⌋ = 2 × 2 = 4; у торца: ⌊0,7 / 0,6⌋ × 2 = 2 → −6
  assert.equal(withBath.bathMinus, 6);
  assert.equal(withBath.pieces, 113);
  near(withBath.area, g.wallNet - (1.7 * 0.6 + 0.7 * 0.6));   // − 1,44 м²

  const niche = F.wallTileLayout(g, openings, p, Object.assign({}, bath, { place: 'niche' }));
  assert.equal(niche.bathMinus, 8, 'в нише — оба торца');
  const screen = F.wallTileLayout(g, openings, p, Object.assign({}, bath, { screen: true }));
  // экран 1,7 × 0,6: 3 × 2 = 6 плиток
  assert.equal(screen.screen, 6);
  assert.equal(screen.pieces, 119);
  near(screen.area, g.wallNet - 1.44 + 1.02);

  // в расчёте объекта: ванна в комнате → вычет; 113 × 1,05 = 118,65 → 119 плиток / 8 → 15 упаковок
  const res = F.calculateProject({ rooms: [{
    id: 'b', name: 'Ванная', length: 2, width: 1.7, height: 2.7, openings,
    floor: 'none', walls: 'tile', ceiling: 'none', counts: { bathAcrylic: 1 }, pipes: { water: 'none', sewer: false }
  }] });
  const tw = res.materials.find((m) => m.key === 'tileWall');
  assert.equal(tw.layoutPieces, 113);
  assert.equal(tw.pieces, 119);
  assert.equal(tw.packs, 15);
  const glue = res.materials.find((m) => m.key === 'tileAdhesive');
  near(glue.wallArea, g.wallNet - 1.44, 'клей — без зоны за ванной');
});

test('раздельный расчёт: пол, стены, потолок и инженерия по каждой комнате', () => {
  const res = F.calculateProject({
    rooms: [sampleRoom({
      id: 'a', floor: 'laminate', walls: 'paint', ceiling: 'paint',
      prep: { walls: { primer: true }, ceiling: { primer: true }, floor: { primer: true } },
      openings: [{ type: 'window', width: 1.5, height: 1.4, count: 1, replace: 'pvc' }],
      counts: { elSocket: 2 }
    })],
    materials: { laminate: { price: 900 }, paintWall: { price: 5000 }, paintCeiling: { price: 4000 }, primer: { price: 700 },
      windowPVC: { price: 10000 }, elSocket: { price: 300 } }
  });
  const room = res.rooms[0];
  const s = Object.fromEntries(room.surfaces.map((x) => [x.key, x]));
  const keys = (x) => x.materials.map((m) => m.key);
  assert.deepEqual(keys(s.floor), ['laminate', 'underlayXPS', 'plinthPVC', 'primer']);
  assert.deepEqual(keys(s.walls), ['paintWall', 'primer']);
  assert.deepEqual(keys(s.ceiling), ['paintCeiling', 'primer']);
  assert.ok(keys(s.other).includes('windowPVC') && keys(s.other).includes('elSocket'));
  assert.ok(!keys(s.other).includes('elPanel'), 'щит — на всю квартиру, не по комнатам');
  // грунт пола: 12 × 0,15 × 2 × 1,1 = 3,96 л → 1 канистра × 700
  near(s.floor.materials.find((m) => m.key === 'primer').cost, 700);
  // окно 2,1 м² × 10 000
  near(s.other.materials.find((m) => m.key === 'windowPVC').cost, 21000);
  near(room.cost, s.floor.cost + s.walls.cost + s.ceiling.cost + s.other.cost);
  // по комнате покупается не меньше, чем в общем итоге без щита
  const noPanel = res.materials.filter((m) => !F.APARTMENT_KEYS[m.key]).reduce((sum, m) => sum + m.cost, 0);
  assert.ok(room.cost >= noPanel - 1e-6);
});

test('шаблоны помещений и типовых квартир', () => {
  let n = 0;
  const id = (prefix) => prefix + (++n);
  const bath = F.makeRoom('bath', { length: 2, width: 1.7 }, id);
  assert.equal(bath.name, 'Санузел');
  assert.equal(bath.floor, 'porcelain');
  assert.equal(bath.walls, 'tile');
  assert.equal(bath.prep.floor.waterproofing, true);
  assert.deepEqual(bath.counts, { toiletFloor: 1, sinkVanity: 1, bathAcrylic: 1 });
  assert.equal(bath.openings[0].type, 'door');
  assert.equal(new Set([bath.id, bath.openings[0].id]).size, 2, 'id не повторяются');

  const expected = { studio: [3, 25, 30], one: [4, 32, 38], two: [6, 48, 56], three: [7, 66, 75] };
  Object.keys(F.APARTMENTS).forEach((key) => {
    const rooms = F.buildApartment(key, id);
    const area = rooms.reduce((s, r) => s + F.roomGeometry(r).floorArea, 0);
    assert.equal(rooms.length, expected[key][0], key + ': помещений');
    assert.ok(area > expected[key][1] && area < expected[key][2], key + ': площадь ' + area.toFixed(1));
    const res = F.calculateProject({ rooms });
    assert.ok(res.materials.length > 15, key + ': материалов ' + res.materials.length);
    res.materials.forEach((m) => assert.deepEqual(m.errors, [], key + '/' + m.key));
    assert.equal(res.rooms.length, rooms.length);
  });
  assert.deepEqual(F.buildApartment('нет такой'), []);
});

test('сравнение вариантов: пол, окна, радиаторы', () => {
  const project = {
    rooms: [sampleRoom({ id: 'a', floor: 'laminate' }), sampleRoom({ id: 'b', floor: 'laminate' })],
    materials: {
      laminate: { price: 900 }, underlayXPS: { price: 1000 }, plinthPVC: { price: 300 },
      porcelainFloor: { price: 1500 }, tileAdhesive: { price: 500 }, grout: { price: 400 },
      vinyl: { price: 2000 }
    }
  };
  const res = F.compareVariants(project, 'floor', ['laminate', 'porcelain', 'vinyl'], null);
  const by = Object.fromEntries(res.map((r) => [r.option, r]));
  const keys = (r) => r.items.map((x) => x.material.key).sort();
  assert.deepEqual(keys(by.laminate), ['laminate', 'plinthPVC', 'underlayXPS']);
  assert.deepEqual(keys(by.porcelain), ['grout', 'porcelainFloor', 'tileAdhesive']);
  assert.deepEqual(keys(by.vinyl), ['plinthPVC', 'vinyl']);
  // ламинат: 24 × 1,07 = 25,68 / 2,397 → 11 уп × 2,397 × 900 = 23 730,3; XPS 24 × 1,05 / 5 → 6 × 1000;
  // плинтус 26,2 × 1,1 / 2,5 → 12 × 300
  near(by.laminate.cost, 11 * 2.397 * 900 + 6000 + 3600);
  near(by.laminate.cost, by.laminate.items.reduce((s, x) => s + x.delta, 0));
  assert.equal(by.laminate.missingPrices, 0);
  // только в одной комнате — дешевле
  const one = F.compareVariants(project, 'floor', ['laminate'], ['a'])[0];
  assert.ok(one.cost < by.laminate.cost);

  // окна: ПВХ против дерева — 2,1 м² в каждой комнате
  const win = F.compareVariants(Object.assign({}, project, { materials: { windowPVC: { price: 10000 }, windowWood: { price: 25000 } } }),
    'window', ['pvc', 'wood'], null);
  near(win[0].cost, 4.2 * 10000);
  near(win[1].cost, 4.2 * 25000);

  // радиаторы: биметалл против чугуна (секций чугуна больше)
  const rad = F.compareVariants(project, 'radiator', ['bimetal', 'castIron'], ['a']);
  assert.ok(rad[1].items[0].material.packs > rad[0].items[0].material.packs);
  assert.equal(rad[0].missingPrices, 1, 'цена радиаторов не указана');

  assert.equal(F.COMPARE_FIELDS.floor.current(project.rooms[0]), 'laminate');
  assert.deepEqual(F.compareVariants(project, 'нет такого', ['x']), []);
});

test('пустой объект не ломает расчёт', () => {
  const res = F.calculateProject({ rooms: [], materials: {} });
  assert.deepEqual(res.materials, []);
  near(res.totalCost, 0);
  assert.deepEqual(F.calculateProject(undefined).materials, []);
});

test('каталог: у каждого материала есть нормы, категория и способ расчёта; цены пустые', () => {
  const categories = F.CATEGORIES.map((c) => c.key);
  F.MATERIAL_ORDER.forEach((key) => {
    const d = F.DEFAULT_MATERIALS[key];
    const m = F.MATERIALS[key];
    assert.ok(d, `нет норм для ${key}`);
    assert.ok(m.title && m.kind && m.baseUnit, `нет описания для ${key}`);
    assert.ok(categories.includes(m.category), `неизвестная категория у ${key}`);
    assert.equal(d.price, 0, `цену вводит пользователь: ${key}`);
    if ('reserve' in d) assert.ok(d.reserve >= 0, `запас: ${key}`);
  });
  // параметры пользователя перекрывают нормы, остальное — по умолчанию
  const p = F.materialParams({ paintWall: { coats: 3 } }, 'paintWall');
  assert.equal(p.coats, 3);
  assert.equal(p.coverage, F.DEFAULT_MATERIALS.paintWall.coverage);
});
