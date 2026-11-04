// Тесты сметы: тексты «сколько купить», смета для заказчика, выгрузка в Excel (CSV).
// Запуск: из папки remont-calc выполнить `npm test`.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../formulas.js');
const E = require('../estimate.js');

// Неразрывные пробелы Intl заменяем обычными, чтобы сравнивать строки.
const sp = (s) => String(s).replace(/[  ]/g, ' ');

function room(extra) {
  return Object.assign({
    id: 'r1', name: 'Спальня', length: 4, width: 3, height: 2.7,
    openings: [
      { type: 'window', width: 1.5, height: 1.4, count: 1 },
      { type: 'door', width: 0.9, height: 2.0, count: 1 }
    ],
    floor: 'none', walls: 'none', ceiling: 'none', prep: { walls: {}, ceiling: {}, floor: {} }
  }, extra);
}

test('числа и склонения', () => {
  assert.equal(sp(E.fmt(12944.4)), '12 944,4');
  assert.equal(sp(E.money(12944.6)), '12 945 ₽');
  assert.equal(E.plural(1, E.FORMS.can), 'банка');
  assert.equal(E.plural(3, E.FORMS.can), 'банки');
  assert.equal(E.plural(11, E.FORMS.can), 'банок');
  assert.equal(E.plural(22, E.FORMS.bucket), 'ведра');
  assert.equal(E.count(5, E.FORMS.bag), '5 мешков');
});

test('«сколько купить» и цена по видам материалов', () => {
  const project = {
    rooms: [
      room({ floor: 'laminate', walls: 'paint', counts: { elSocket: 3, elLight: 1, elSwitch: 1 } }),
      room({ id: 'b', name: 'Ванная', length: 2, width: 1.7, openings: [{ type: 'door', width: 0.7, height: 2.1, count: 1 }],
        walls: 'tile', counts: { bathAcrylic: 1 }, pipes: { water: 'none', sewer: false } })
    ],
    materials: { laminate: { price: 900 }, paintWall: { price: 5000 }, tileWall: { price: 1200 }, cableSocket: { price: 6000, priceUnit: 'pack' } },
    custom: [{ id: 'c1', name: 'Монтажная пена', basis: 'count', quantity: 3, unit: 'баллон', price: 500 }]
  };
  const calc = F.calculateProject(project);
  const t = E.texts(project, calc);
  const m = Object.fromEntries(calc.materials.map((x) => [x.key, x]));

  assert.equal(sp(t.buy(m.laminate)), '6 упаковок (14,38 м²)');
  assert.equal(sp(t.price(m.laminate)), '900 ₽ за м²');
  assert.equal(sp(t.buy(m.paintWall)), '2 банки');
  assert.equal(sp(t.price(m.paintWall)), '5 000 ₽ за банку');
  // плитка ванной по раскладке: 113 × 1,05 → 119 плиток → 15 упаковок = 21,6 м²
  assert.equal(sp(t.buy(m.tileWall)), '15 упаковок (119 плиток, 21,6 м²)');
  assert.ok(t.lines(m.tileWall)[0].includes('за ванной −6'), t.lines(m.tileWall)[0]);
  assert.equal(sp(t.buy(m.elPanel)), 'Щит на 12 модулей');
  assert.equal(sp(t.price(m.cableSocket)), '6 000 ₽ за бухту');
  assert.ok(sp(t.buy(m.cableSocket)).endsWith('(1 бухта по 100 м)'));
  assert.equal(sp(t.buy(m['custom:c1'])), '3 баллона');
  assert.equal(sp(t.price(m['custom:c1'])), '500 ₽ за баллон');
  assert.equal(t.price(m.plinthPVC), 'цена не указана');
});

test('у каждого материала есть текст покупки, пояснение и цена', () => {
  const all = Object.fromEntries(F.MATERIAL_ORDER.map((k) => [k, { price: 100 }]));
  const rooms = [
    room({ id: 'a', floor: 'parquetBlock', walls: 'mosaic', ceiling: 'rack', counts: Object.fromEntries(F.ROOM_ITEM_KEYS.map((k) => [k, 1])),
      heating: { radiators: true, radiatorType: 'panel', floor: true, floorType: 'cable' } }),
    room({ id: 'b', floor: 'linoleum', walls: 'wallpaperPaper', ceiling: 'stretchFabric', heating: { radiators: true, floor: true, floorType: 'film' } }),
    room({ id: 'c', floor: 'porcelain', walls: 'decor', ceiling: 'paint', prep: { floor: { screed: true, waterproofing: true }, walls: { drywall: true, plaster: true } } })
  ];
  const project = { rooms, materials: all };
  const calc = F.calculateProject(project);
  const t = E.texts(project, calc);
  assert.ok(calc.materials.length > 60);
  calc.materials.forEach((m) => {
    const buy = t.buy(m);
    assert.ok(buy && !/NaN|undefined/.test(buy), m.key + ': ' + buy);
    const lines = t.lines(m);
    assert.ok(Array.isArray(lines) && lines.length > 0, m.key + ': нет пояснения');
    lines.forEach((l) => assert.ok(!/NaN|undefined/.test(l), m.key + ': ' + l));
    assert.ok(/₽ за /.test(t.price(m)), m.key + ': ' + t.price(m));
  });
});

test('смета для заказчика', () => {
  const project = { name: 'ул. Красная, 12, кв. 5', rooms: [room({ floor: 'laminate', walls: 'paint' })], materials: { laminate: { price: 900 } } };
  const calc = F.calculateProject(project);
  const model = E.estimateModel(project, calc, {
    company: { name: 'ООО «Эталон»', phone: '+7 900 000-00-00' }, customer: 'Иванов И. И.', number: '',
    date: new Date(2026, 10, 4)
  });
  assert.equal(model.title, 'Смета на материалы');
  assert.equal(model.company.name, 'ООО «Эталон»');
  assert.deepEqual(model.meta, [['Объект', 'ул. Красная, 12, кв. 5'], ['Заказчик', 'Иванов И. И.'], ['Дата', '04.11.2026']],
    'пустой номер расчёта не выводится');
  assert.equal(model.rooms.rows.length, 1);
  assert.equal(model.rooms.rows[0][0], 'Спальня');
  assert.equal(sp(model.rooms.rows[0][1]), '4 × 3 × 2,7');
  assert.ok(model.groups.length >= 2);
  const lam = model.groups[0].items.find((x) => x.title === 'Ламинат');
  assert.equal(sp(lam.cost), sp(E.money(calc.materials.find((m) => m.key === 'laminate').cost)));
  assert.ok(lam.details.includes('Площадь 12'));
  assert.equal(model.total, E.money(calc.totalCost));
  assert.ok(model.summary.note.startsWith('Не указаны цены'));
  assert.equal(model.signatures.length, 2);

  const short = E.estimateModel(project, calc, { details: false, signatures: false });
  assert.equal(short.groups[0].items[0].details, '');
  assert.deepEqual(short.signatures, []);
});

test('Excel (CSV): разделитель, запятая в числах, кавычки, итоги', () => {
  const project = {
    name: 'Объект; тест', rooms: [room({ floor: 'laminate' })], materials: { laminate: { price: 900 } },
    custom: [{ id: 'x', name: 'Кран "Шаровой"; ½', basis: 'count', quantity: 2, unit: 'шт.', price: 350.5 }]
  };
  const calc = F.calculateProject(project);
  const csv = E.toCSV(project, calc, { date: new Date(2026, 10, 4) });
  assert.ok(csv.startsWith('﻿Смета на материалы\r\n'), 'метка BOM для Excel');
  const lines = csv.split('\r\n');
  assert.ok(lines.includes('Объект;"Объект; тест"'), 'ячейка с «;» — в кавычках');
  assert.ok(lines.includes('Дата;04.11.2026'));
  assert.ok(lines.includes('Раздел;Материал;Нужно;Ед.;Купить;Цена, ₽;Цена за;Сумма, ₽;Расчёт'));
  const lam = lines.find((l) => l.startsWith('Напольные покрытия;Ламинат;'));
  const cells = lam.split(';');
  assert.equal(cells[2], '12,84', 'нужно с запасом, запятая в дроби');
  assert.equal(cells[3], 'м²');
  assert.equal(cells[5], '900');
  assert.equal(cells[7], '12943,8', 'сумма без пробелов: 6 уп. × 2,397 м² × 900');
  assert.ok(lines.some((l) => l.includes('"Кран ""Шаровой""; ½"')), 'кавычки удвоены');
  assert.ok(lines.some((l) => l.includes(';350,5;шт.;701;')), 'цена своей позиции');
  const total = lines.find((l) => l.startsWith(';ИТОГО;'));
  assert.equal(total.split(';')[7], String(F.round(calc.totalCost, 2)).replace('.', ','));
  assert.ok(lines.includes('По помещениям (раздельный расчёт)'));
  assert.ok(lines.some((l) => l.startsWith('Спальня;Пол;Ламинат;')));
  assert.ok(lines.some((l) => l.startsWith('Спальня;Итого по помещению;')));
});

test('список для мессенджера и имя файла', () => {
  const project = { name: 'кв. 5', rooms: [room({ floor: 'laminate' })] };
  const calc = F.calculateProject(project);
  const text = E.shareText(project, calc, { laminate: true });
  assert.ok(text.startsWith('Материалы: кв. 5'));
  assert.ok(text.includes('✓ Ламинат'));
  assert.ok(text.includes('• Подложка'));
  assert.equal(E.fileName({ name: 'ул. Красная, 12/5: "кв"' }, 'csv'), 'смета - ул. Красная, 12 5 кв.csv');
  assert.equal(E.fileName({}, 'pdf'), 'смета - расчёт.pdf');
});
