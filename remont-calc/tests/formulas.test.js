// Тесты формул. Запуск: из папки remont-calc выполнить `npm test` или `node --test tests/formulas.test.js`.
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

test('геометрия комнаты', () => {
  const g = F.roomGeometry(sampleRoom());
  near(g.floorArea, 12);          // 4 × 3
  near(g.ceilingArea, 12);
  near(g.perimeter, 14);          // 2 × (4 + 3)
  near(g.wallGross, 37.8);        // 14 × 2,7
  near(g.openingsArea, 3.9);      // 1,5 × 1,4 + 0,9 × 2,0 = 2,1 + 1,8
  near(g.wallNet, 33.9);          // 37,8 − 3,9
  near(g.openingsWidth, 2.4);     // 1,5 + 0,9
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
});

test('геометрия: предупреждения', () => {
  const empty = F.roomGeometry({ length: '', width: 3, height: '' });
  assert.ok(empty.warnings.includes('не заданы длина или ширина'));
  assert.ok(empty.warnings.includes('не задана высота'));

  const tooBig = F.roomGeometry({ length: 1, width: 1, height: 1, openings: [{ width: 2, height: 2, count: 2 }] });
  near(tooBig.wallNet, 0, 'площадь стен не уходит в минус');
  assert.ok(tooBig.warnings.some((w) => w.includes('окна и двери больше')));
});

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
});

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

test('штукатурка и шпаклёвка (сухие смеси)', () => {
  const plaster = F.calcDryMix(33.9, { consumptionPerMm: 0.85, thickness: 10, bagWeight: 30, reserve: 10, price: 450 });
  near(plaster.amount, 316.965);   // 33,9 × 0,85 × 10 = 288,15 кг × 1,1
  assert.equal(plaster.amountUnit, 'кг');
  assert.equal(plaster.packs, 11); // 316,965 / 30 = 10,57 → 11 мешков
  near(plaster.cost, 4950);

  const putty = F.calcDryMix(45.9, { consumptionPerMm: 1.2, thickness: 1.5, bagWeight: 20, reserve: 10, price: 0 });
  near(putty.amount, 90.882);      // 45,9 × 1,2 × 1,5 = 82,62 кг × 1,1
  assert.equal(putty.packs, 5);    // 90,882 / 20 = 4,54 → 5
});

test('грунт', () => {
  const r = F.calcPrimer(57.9, { consumption: 0.15, coats: 2, canisterVolume: 10, reserve: 10, price: 700 });
  near(r.amount, 19.107);          // 57,9 × 0,15 × 2 = 17,37 л × 1,1
  assert.equal(r.packs, 2);        // 19,107 / 10 → 2 канистры
  near(r.cost, 1400);
});

test('площади комнаты по выбранной отделке', () => {
  const a = F.roomMaterialAreas(sampleRoom({
    floor: 'laminate', walls: 'wallpaper', ceiling: 'paint',
    prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true }, floor: {} }
  }));
  near(a.laminate, 12);
  near(a.wallpaper, 33.9);
  near(a.paintCeiling, 12);
  near(a.putty, 45.9);             // стены 33,9 + потолок 12
  near(a.primer, 45.9);
  assert.equal(a.plaster, undefined);
  assert.equal(a.tileFloor, undefined);

  const bath = F.roomMaterialAreas(sampleRoom({
    floor: 'tile', walls: 'tile', ceiling: 'none',
    prep: { walls: { plaster: true, primer: true }, floor: { primer: true } }
  }));
  near(bath.tileFloor, 12);
  near(bath.tileWall, 33.9);
  near(bath.plaster, 33.9);
  near(bath.primer, 45.9);         // стены 33,9 + пол 12
});

test('расчёт объекта: площади складываются, упаковки считаются по сумме', () => {
  // Две комнаты по 3 м² ламината. По отдельности: 3,21 / 2,397 → 2 уп. в каждой = 4.
  // Вместе: 6 × 1,07 = 6,42 / 2,397 = 2,68 → 3 уп.
  const room = (id) => ({ id, name: id, length: 2, width: 1.5, height: 2.7, openings: [], floor: 'laminate', walls: 'none', ceiling: 'none' });
  const res = F.calculateProject({ rooms: [room('a'), room('b')], materials: {} });
  assert.equal(res.materials.length, 1);
  const lam = res.materials[0];
  assert.equal(lam.key, 'laminate');
  assert.equal(lam.title, 'Ламинат');
  near(lam.area, 6);
  assert.equal(lam.packs, 3);
  assert.equal(res.missingPrices, 1, 'цена не введена');
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
  assert.deepEqual(Object.keys(byKey), ['laminate', 'paintWall', 'paintCeiling', 'putty', 'primer']);

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
  assert.equal(res.missingPrices, 0);
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

test('пустой объект не ломает расчёт', () => {
  const res = F.calculateProject({ rooms: [], materials: {} });
  assert.deepEqual(res.materials, []);
  near(res.totalCost, 0);
  assert.deepEqual(F.calculateProject(undefined).materials, []);
});

test('нормы по умолчанию заданы и положительны, цены — пустые', () => {
  F.MATERIAL_ORDER.forEach((key) => {
    const d = F.DEFAULT_MATERIALS[key];
    assert.ok(d, `нет норм для ${key}`);
    assert.ok(F.MATERIAL_TITLES[key], `нет названия для ${key}`);
    assert.equal(d.price, 0, `цену вводит пользователь: ${key}`);
    assert.ok(d.reserve > 0, `запас по умолчанию: ${key}`);
  });
  // параметры пользователя перекрывают нормы, остальное — по умолчанию
  const p = F.materialParams({ paintWall: { coats: 3 } }, 'paintWall');
  assert.equal(p.coats, 3);
  assert.equal(p.coverage, F.DEFAULT_MATERIALS.paintWall.coverage);
});
