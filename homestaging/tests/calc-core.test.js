/*
 * Юнит-тесты калькулятора. Запуск из корня репозитория:  node --test homestaging/tests/
 * Все ожидаемые значения посчитаны вручную (см. комментарии).
 *
 * РАЗОБРАННЫЙ ПРИМЕР (цифры — условные допущения для проверки формул, не прогноз):
 *   P = 8 000 000 ₽, торг d = 3 % (одинаковый), комиссия c = 2 %, H = 25 000 ₽/мес,
 *   T_A = 6 мес, T_B = 3 мес, r = 0 %, смета S = 150 000 ₽, изменение цены 0 %.
 *
 *   Как есть:
 *     сделка      = 8 000 000 × (1 − 0,03)      = 7 760 000
 *     комиссия    = 7 760 000 × 0,02            =   155 200
 *     владение    = 25 000 × 6                  =   150 000
 *     упущ. доход = 7 760 000 × 0 × 6 / 12      =         0
 *     на руках    = 7 760 000 − 155 200 − 150 000 = 7 454 800
 *   После подготовки (цена та же, торг тот же):
 *     сделка      = 7 760 000;  комиссия = 155 200
 *     владение    = 25 000 × 3                  =    75 000
 *     подготовка  =                                 150 000
 *     на руках    = 7 760 000 − 155 200 − 75 000 − 150 000 = 7 379 800
 *   Разница = 7 379 800 − 7 454 800 = −75 000
 *
 *   Точка окупаемости по цене:
 *     P_B_deal* = (7 454 800 + 25 000 × 3 + 150 000) / (1 − 0,02 − 0) = 7 679 800 / 0,98
 *               = 7 836 530,61 ₽  → на 76 530,61 ₽ (≈ 0,986 %) выше сделки «как есть»
 *     цена объявления при торге 3 %: 7 836 530,61 / 0,97 = 8 078 897,54 ₽
 *   Точка окупаемости по сроку (цена не меняется):
 *     ΔT = 150 000 / (25 000 + 7 760 000 × 0 / 12) = 6 мес  (= весь срок «как есть»)
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const C = require(path.join(__dirname, "..", "calc", "calc-core.js"));

const WORKED = {
  listPrice: 8000000,
  priceChangePct: 0,
  discountPctA: 3,
  discountPctB: 3,
  commissionPct: 2,
  monthlyCosts: 25000,
  monthsA: 6,
  monthsB: 3,
  ratePct: 0,
  prepCost: 150000
};

function near(actual, expected, eps, msg) {
  assert.ok(Math.abs(actual - expected) <= eps, `${msg || ""} expected ≈${expected}, got ${actual}`);
}

test("estimate: сумма строк сметы", () => {
  // 30 м² × 450 = 13 500; 1 шт × 2 500 = 2 500; 54 м² × 120 = 6 480; итого 22 480
  const r = C.estimate([
    { id: "paint", name: "Покраска", qty: 30, unit: "м²", unitPrice: 450 },
    { id: "mixer", name: "Смеситель", qty: 1, unit: "шт", unitPrice: 2500 },
    { id: "cleaning", name: "Уборка", qty: 54, unit: "м²", unitPrice: 120 }
  ]);
  assert.equal(r.lines[0].total, 13500);
  assert.equal(r.lines[1].total, 2500);
  assert.equal(r.lines[2].total, 6480);
  assert.equal(r.total, 22480);
  assert.equal(r.missingCount, 0);
});

test("estimate: строка без цены не попадает в итог и считается пропущенной", () => {
  // 2 × null → пропуск; 3 × 1 000 = 3 000
  const r = C.estimate([
    { id: "a", name: "Без цены", qty: 2, unitPrice: null },
    { id: "b", name: "С ценой", qty: 3, unitPrice: 1000 }
  ]);
  assert.equal(r.total, 3000);
  assert.equal(r.missingCount, 1);
  assert.equal(r.lines[0].total, null);
  assert.equal(r.lines[0].missingPrice, true);
});

test("packageLine: цена за м² умножается на площадь, за объект — нет", () => {
  // 54 м² × 1 500 = 81 000
  const perM2 = C.packageLine({ id: "standard", name: "Стандарт", priceUnit: "за м²" }, 54, 1500);
  assert.equal(perM2.qty, 54);
  assert.equal(C.lineTotal(perM2), 81000);
  // за объект: 1 × 30 000 = 30 000
  const perObj = C.packageLine({ id: "express", name: "Экспресс", priceUnit: "за объект" }, 54, 30000);
  assert.equal(perObj.qty, 1);
  assert.equal(C.lineTotal(perObj), 30000);
  // цена не задана (null из конфига) → сумма не считается
  const noPrice = C.packageLine({ id: "x", name: "X", priceUnit: "за объект" }, 54, null);
  assert.equal(C.lineTotal(noPrice), null);
});

test("holdingPerMonth: сумма ежемесячных расходов, пустые = 0", () => {
  // 18 000 + 5 500 + 0 + 1 500 = 25 000
  assert.equal(C.holdingPerMonth({ mortgage: 18000, utilities: 5500, rent: null, other: 1500 }), 25000);
});

test("scenario: «как есть» в разобранном примере", () => {
  const a = C.scenario({
    listPrice: 8000000, discountPct: 3, commissionPct: 2,
    monthlyCosts: 25000, months: 6, ratePct: 0, prepCost: 0
  });
  assert.equal(a.dealPrice, 7760000);
  assert.equal(a.discount, 240000);
  assert.equal(a.commission, 155200);
  assert.equal(a.holding, 150000);
  assert.equal(a.opportunity, 0);
  assert.equal(a.net, 7454800);
});

test("compare: разобранный пример — разница −75 000 ₽", () => {
  const r = C.compare(WORKED);
  assert.equal(r.asIs.net, 7454800);
  assert.equal(r.prepared.listPrice, 8000000);
  assert.equal(r.prepared.dealPrice, 7760000);
  assert.equal(r.prepared.commission, 155200);
  assert.equal(r.prepared.holding, 75000);
  assert.equal(r.prepared.prep, 150000);
  assert.equal(r.prepared.net, 7379800);
  assert.equal(r.diff, -75000);
});

test("compare: по умолчанию подготовка «ничего не меняет» — разница = −смета", () => {
  // Срок B, торг B и изменение цены не заданы → берутся как у «как есть»
  const base = { listPrice: 6000000, discountPctA: 5, commissionPct: 0, monthlyCosts: 30000, monthsA: 4, ratePct: 0 };
  const r0 = C.compare(Object.assign({}, base, { prepCost: 0 }));
  assert.equal(r0.params.monthsB, 4);
  assert.equal(r0.params.discountPctB, 5);
  assert.equal(r0.params.priceChangePct, 0);
  assert.equal(r0.diff, 0);
  const r1 = C.compare(Object.assign({}, base, { prepCost: 100000 }));
  assert.equal(r1.diff, -100000);
});

test("compare: изменение цены и торга по допущению пользователя", () => {
  // P_A = 6 000 000, торг 4 % → сделка A = 5 760 000; H = 20 000, T = 4 → 80 000
  // P_B = 6 000 000 × 1,02 = 6 120 000; торг 4 % → сделка B = 5 875 200
  // на руках A = 5 760 000 − 80 000 = 5 680 000
  // на руках B = 5 875 200 − 80 000 − 60 000 = 5 735 200;  разница = +55 200
  const r = C.compare({
    listPrice: 6000000, priceChangePct: 2, discountPctA: 4, discountPctB: 4,
    commissionPct: 0, monthlyCosts: 20000, monthsA: 4, monthsB: 4, ratePct: 0, prepCost: 60000
  });
  assert.equal(r.prepared.listPrice, 6120000);
  assert.equal(r.asIs.dealPrice, 5760000);
  assert.equal(r.prepared.dealPrice, 5875200);
  assert.equal(r.asIs.net, 5680000);
  assert.equal(r.prepared.net, 5735200);
  assert.equal(r.diff, 55200);
});

test("scenario: упущенный доход на деньги", () => {
  // 5 000 000 × 0,12 × 6 / 12 = 300 000; на руках 5 000 000 − 300 000 = 4 700 000
  const s = C.scenario({ listPrice: 5000000, discountPct: 0, commissionPct: 0, monthlyCosts: 0, months: 6, ratePct: 12, prepCost: 0 });
  assert.equal(s.opportunity, 300000);
  assert.equal(s.net, 4700000);
});

test("breakEven: разобранный пример — по цене и по сроку", () => {
  const b = C.breakEven(WORKED);
  assert.equal(b.price.achievable, true);
  // 7 679 800 / 0,98 = 7 836 530,6122… → 7 836 530,61
  assert.equal(b.price.requiredDealPrice, 7836530.61);
  assert.equal(b.price.deltaRub, 76530.61);
  near(b.price.deltaPct, 0.98622, 0.0001, "deltaPct");
  // 7 836 530,61 / 0,97 = 8 078 897,536… → 8 078 897,54
  assert.equal(b.price.requiredListPrice, 8078897.54);
  // ΔT = 150 000 / 25 000 = 6 мес, это весь срок «как есть»
  assert.equal(b.time.achievable, true);
  assert.equal(b.time.monthsFaster, 6);
  assert.equal(b.time.exceedsAsIs, true);
  // Проверка: при найденной цене сделки «на руках» B = «на руках» A
  const check = 7836530.61 - 7836530.61 * 0.02 - 25000 * 3 - 150000;
  near(check, 7454800, 0.01, "net at break-even");
});

test("breakEven: срок с учётом упущенного дохода", () => {
  // сделка A = 7 760 000; r = 6 % → 7 760 000 × 0,06 / 12 = 38 800 ₽/мес
  // ΔT = 150 000 / (25 000 + 38 800) = 150 000 / 63 800 = 2,3510971…
  const b = C.breakEven(Object.assign({}, WORKED, { ratePct: 6 }));
  near(b.time.monthsFaster, 2.3510971, 1e-6, "monthsFaster");
  assert.equal(b.time.exceedsAsIs, false);
});

test("breakEven: без ежемесячных расходов срок не окупает подготовку", () => {
  const b = C.breakEven(Object.assign({}, WORKED, { monthlyCosts: 0, ratePct: 0 }));
  assert.equal(b.time.achievable, false);
  assert.equal(b.time.reason, "no-monthly-cost");
  assert.equal(b.time.monthsFaster, null);
});

test("breakEven: недостижимо по цене, если знаменатель ≤ 0", () => {
  // 1 − 0,20 − 0,50 × 24 / 12 = 1 − 0,2 − 1 = −0,2 → недостижимо
  const b = C.breakEven(Object.assign({}, WORKED, { commissionPct: 20, ratePct: 50, monthsB: 24 }));
  assert.equal(b.price.achievable, false);
  assert.equal(b.price.requiredDealPrice, null);
});

test("validate: диапазоны и отрицательные значения", () => {
  assert.equal(C.validate("area", -5), "Допустимо от 1 до 1000");
  assert.equal(C.validate("area", 54), null);
  assert.equal(C.validate("priceChange", 60), "Допустимо от −50 до 50");
  assert.equal(C.validate("priceChange", -10), null);
  assert.equal(C.validate("commission", 25), "Допустимо от 0 до 20");
  assert.equal(C.validate("discount", -1), "Значение не может быть отрицательным");
  assert.equal(C.validate("months", 61), "Допустимо от 0 до 60");
  assert.equal(C.validate("months", null, { required: true }), "Заполните поле");
  assert.equal(C.validate("rooms", 2.5), "Введите целое число");
  assert.equal(C.validate("price", NaN), "Введите число");
});

test("parseNumber и formatMoney: русские форматы", () => {
  assert.equal(C.parseNumber("8 000 000"), 8000000);
  assert.equal(C.parseNumber("8 000 000"), 8000000);
  assert.equal(C.parseNumber("2,5"), 2.5);
  assert.equal(C.parseNumber("−3"), -3);
  assert.equal(C.parseNumber(""), null);
  assert.ok(Number.isNaN(C.parseNumber("12abc")));
  assert.equal(C.formatMoney(7454800), "7 454 800 ₽");
  assert.equal(C.formatMoney(-75000), "−75 000 ₽");
  assert.equal(C.formatMoney(55200, { sign: true }), "+55 200 ₽");
  assert.equal(C.formatPct(0.98622), "0,99 %");
});

test("packageListPrice: до базовой площади — цена «от», больше — по ставке за м²", () => {
  const express = { id: "express", priceFrom: 15000, areaPricing: { baseArea: 45, overPerM2: 350 } };
  assert.deepEqual(C.packageListPrice(express, 40), { price: 15000, overBase: false });
  assert.deepEqual(C.packageListPrice(express, 45), { price: 15000, overBase: false });
  // 60 м² × 350 ₽ = 21 000 ₽
  assert.deepEqual(C.packageListPrice(express, 60), { price: 21000, overBase: true });
  // площадь не введена — цена «от»
  assert.deepEqual(C.packageListPrice(express, null), { price: 15000, overBase: false });
});

test("packageListPrice: ставка за м² не задана — цена «от» и флаг «по смете»", () => {
  const empty = { id: "empty", priceFrom: 70000, areaPricing: { baseArea: 45, overPerM2: null } };
  assert.deepEqual(C.packageListPrice(empty, 70), { price: 70000, overBase: true });
  assert.deepEqual(C.packageListPrice({ id: "x", priceFrom: null }, 40), { price: null, overBase: false });
  assert.deepEqual(C.packageListPrice({ id: "s", priceFrom: 35000 }, 120), { price: 35000, overBase: false });
});
