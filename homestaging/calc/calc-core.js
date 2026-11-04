/*
 * Чистые функции калькулятора (без DOM).
 * Браузер: window.HSCalc. Node: module.exports (см. tests/calc-core.test.js).
 *
 * Обозначения (как в блоке «Как считается»):
 *   P  — цена в объявлении, ₽          d — торг при сделке, %
 *   c  — комиссия риелтора, % от сделки H — расходы на владение, ₽/мес
 *   T  — срок продажи, мес             r — упущенный доход на деньги, % годовых
 *   S  — смета подготовки, ₽
 *   Сделка = P × (1 − d)
 *   На руках = Сделка − Сделка × c − H × T − Сделка × r × T / 12 − S
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HSCalc = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Округление до копеек, чтобы убрать шум плавающей точки. */
  function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  function isNum(x) {
    return typeof x === "number" && isFinite(x);
  }

  /** null/undefined/NaN → запасное значение. */
  function or(x, fallback) {
    return isNum(x) ? x : fallback;
  }

  /**
   * Разбор числа из поля ввода: «8 000 000», «2,5», «−3».
   * Пустая строка → null; мусор → NaN.
   */
  function parseNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return isFinite(value) ? value : NaN;
    var s = String(value).replace(/[\s  ]/g, "").replace(/[−–—]/g, "-").replace(",", ".");
    if (s === "") return null;
    if (!/^[-+]?\d*\.?\d+$/.test(s) && !/^[-+]?\d+\.$/.test(s)) return NaN;
    return parseFloat(s);
  }

  /** Допустимые диапазоны полей (используются для подсказок об ошибках). */
  var LIMITS = {
    area:        { min: 1,   max: 1000,      label: "Площадь" },
    rooms:       { min: 0,   max: 20,        label: "Комнат",           integer: true },
    price:       { min: 0,   max: 1e10,      label: "Цена" },
    money:       { min: 0,   max: 1e9,       label: "Сумма" },
    qty:         { min: 0,   max: 10000,     label: "Количество" },
    months:      { min: 0,   max: 60,        label: "Срок, мес" },
    priceChange: { min: -50, max: 50,        label: "Изменение цены, %" },
    discount:    { min: 0,   max: 60,        label: "Торг, %" },
    commission:  { min: 0,   max: 20,        label: "Комиссия, %" },
    rate:        { min: 0,   max: 50,        label: "Ставка, % годовых" }
  };

  function fmtLimit(n) {
    return String(n).replace(".", ",");
  }

  /**
   * Проверка значения поля. Возвращает текст ошибки или null.
   * value — уже разобранное число (null = пусто).
   */
  function validate(kind, value, opts) {
    var lim = LIMITS[kind];
    opts = opts || {};
    if (value === null || value === undefined) {
      return opts.required ? "Заполните поле" : null;
    }
    if (!isNum(value)) return "Введите число";
    if (!lim) return null;
    if (lim.integer && Math.floor(value) !== value) return "Введите целое число";
    if (value < lim.min || value > lim.max) {
      if (lim.min === 0 && value < 0) return "Значение не может быть отрицательным";
      return "Допустимо от " + fmtLimit(lim.min) + " до " + fmtLimit(lim.max);
    }
    return null;
  }

  /** Сумма строки сметы. Нет цены или количества → null. */
  function lineTotal(line) {
    var qty = or(line.qty, null);
    var price = or(line.unitPrice, null);
    if (qty === null || price === null) return null;
    return round2(qty * price);
  }

  /**
   * Смета: [{ id, name, qty, unit, unitPrice }] →
   *   { lines: [...{ total, missingPrice, missingQty }], total, missingCount }
   * Строки без цены в итог не попадают и считаются в missingCount.
   */
  function estimate(lines) {
    var out = [];
    var total = 0;
    var missing = 0;
    (lines || []).forEach(function (l) {
      var t = lineTotal(l);
      var missingPrice = !isNum(l.unitPrice);
      var missingQty = !isNum(l.qty);
      if (t === null) missing += 1;
      else total += t;
      out.push(Object.assign({}, l, { total: t, missingPrice: missingPrice, missingQty: missingQty }));
    });
    return { lines: out, total: round2(total), missingCount: missing };
  }

  /**
   * Строка сметы для пакета. priceUnit "за м²" → количество = площадь.
   * price — цена из конфига или введённая вручную (null = не указана).
   */
  function packageLine(pkg, area, price) {
    var perM2 = pkg.priceUnit === "за м²";
    return {
      id: "pkg:" + pkg.id,
      name: "Пакет «" + pkg.name + "»",
      qty: perM2 ? or(area, null) : 1,
      unit: perM2 ? "м²" : "объект",
      unitPrice: or(price, null)
    };
  }

  /** Сумма ежемесячных расходов на владение: { mortgage, utilities, rent, other } → ₽/мес. */
  function holdingPerMonth(parts) {
    var sum = 0;
    Object.keys(parts || {}).forEach(function (k) {
      sum += or(parts[k], 0);
    });
    return round2(sum);
  }

  /**
   * Один сценарий продажи.
   * p: { listPrice, discountPct, commissionPct, monthlyCosts, months, ratePct, prepCost }
   */
  function scenario(p) {
    var P = or(p.listPrice, 0);
    var d = or(p.discountPct, 0) / 100;
    var c = or(p.commissionPct, 0) / 100;
    var H = or(p.monthlyCosts, 0);
    var T = or(p.months, 0);
    var r = or(p.ratePct, 0) / 100;
    var S = or(p.prepCost, 0);

    var deal = round2(P * (1 - d));
    var commission = round2(deal * c);
    var holding = round2(H * T);
    var opportunity = round2(deal * r * T / 12);
    var net = round2(deal - commission - holding - opportunity - S);

    return {
      listPrice: round2(P),
      discount: round2(P - deal),
      dealPrice: deal,
      commission: commission,
      holding: holding,
      opportunity: opportunity,
      prep: round2(S),
      net: net
    };
  }

  /**
   * Полные параметры сравнения с подстановкой значений «без эффекта» по умолчанию:
   *   monthsB ← monthsA, discountPctB ← discountPctA, priceChangePct ← 0.
   */
  function normalize(params) {
    var p = params || {};
    var monthsA = or(p.monthsA, 0);
    var dA = or(p.discountPctA, 0);
    return {
      listPrice: or(p.listPrice, 0),
      priceChangePct: or(p.priceChangePct, 0),
      discountPctA: dA,
      discountPctB: or(p.discountPctB, dA),
      commissionPct: or(p.commissionPct, 0),
      monthlyCosts: or(p.monthlyCosts, 0),
      monthsA: monthsA,
      monthsB: or(p.monthsB, monthsA),
      ratePct: or(p.ratePct, 0),
      prepCost: or(p.prepCost, 0)
    };
  }

  /** Цена объявления после подготовки по допущению пользователя. */
  function preparedListPrice(listPrice, priceChangePct) {
    return round2(or(listPrice, 0) * (1 + or(priceChangePct, 0) / 100));
  }

  /**
   * Сравнение «как есть» и «после подготовки».
   * params: { listPrice, priceChangePct, discountPctA, discountPctB, commissionPct,
   *           monthlyCosts, monthsA, monthsB, ratePct, prepCost }
   * → { asIs, prepared, diff, params }  (diff = на руках B − на руках A)
   */
  function compare(params) {
    var n = normalize(params);
    var asIs = scenario({
      listPrice: n.listPrice,
      discountPct: n.discountPctA,
      commissionPct: n.commissionPct,
      monthlyCosts: n.monthlyCosts,
      months: n.monthsA,
      ratePct: n.ratePct,
      prepCost: 0
    });
    var prepared = scenario({
      listPrice: preparedListPrice(n.listPrice, n.priceChangePct),
      discountPct: n.discountPctB,
      commissionPct: n.commissionPct,
      monthlyCosts: n.monthlyCosts,
      months: n.monthsB,
      ratePct: n.ratePct,
      prepCost: n.prepCost
    });
    return {
      asIs: asIs,
      prepared: prepared,
      diff: round2(prepared.net - asIs.net),
      params: n
    };
  }

  /**
   * Точка окупаемости.
   * 1) Цена сделки после подготовки, при которой «на руках» столько же, сколько «как есть»:
   *      P_B_deal* = (Net_A + H × T_B + S) / (1 − c − r × T_B / 12)
   * 2) Если цена и торг не меняются — насколько быстрее нужно продать:
   *      ΔT = S / (H + Сделка_A × r / 12)
   */
  function breakEven(params) {
    var n = normalize(params);
    var cmp = compare(n);
    var A = cmp.asIs;
    var c = n.commissionPct / 100;
    var r = n.ratePct / 100;
    var H = n.monthlyCosts;
    var S = n.prepCost;
    var TB = n.monthsB;

    var result = {
      price: { achievable: false, requiredDealPrice: null, requiredListPrice: null, deltaRub: null, deltaPct: null },
      time: { achievable: false, monthsFaster: null, exceedsAsIs: false, reason: null }
    };

    var denomPrice = 1 - c - r * TB / 12;
    if (denomPrice > 0) {
      var req = round2((A.net + H * TB + S) / denomPrice);
      var dB = n.discountPctB / 100;
      result.price.achievable = true;
      result.price.requiredDealPrice = req;
      result.price.requiredListPrice = dB < 1 ? round2(req / (1 - dB)) : null;
      result.price.deltaRub = round2(req - A.dealPrice);
      result.price.deltaPct = A.dealPrice > 0 ? (req / A.dealPrice - 1) * 100 : null;
    }

    var denomTime = H + A.dealPrice * r / 12;
    if (S <= 0) {
      result.time.achievable = true;
      result.time.monthsFaster = 0;
      result.time.reason = "no-cost";
    } else if (denomTime <= 0) {
      result.time.reason = "no-monthly-cost";
    } else {
      var dt = S / denomTime;
      result.time.achievable = true;
      result.time.monthsFaster = dt;
      // ΔT ≥ T_A: одним ускорением продажи подготовка не окупится (нужно продать «мгновенно» или быстрее)
      result.time.exceedsAsIs = dt >= n.monthsA;
    }
    return result;
  }

  /* ---------- Форматирование (ru-RU, узкие неразрывные пробелы) ---------- */

  var NNBSP = " ";
  var NBSP = " ";

  function groupDigits(str) {
    return str.replace(/ /g, NNBSP);
  }

  function formatNumber(n, maxFractionDigits) {
    if (!isNum(n)) return "—";
    var s = new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: maxFractionDigits === undefined ? 0 : maxFractionDigits,
      minimumFractionDigits: 0
    }).format(n);
    return groupDigits(s).replace("-", "−");
  }

  /** 7454800 → «7 454 800 ₽» (с узкими пробелами). */
  function formatMoney(n, opts) {
    if (!isNum(n)) return "—";
    opts = opts || {};
    var v = Math.round(n);
    if (v === 0) v = 0; // убрать «−0»
    var s = formatNumber(v, 0);
    if (opts.sign && v > 0) s = "+" + s;
    return s + NBSP + "₽";
  }

  /** 0.98622 → «0,99 %»; знак «+» по запросу. */
  function formatPct(n, opts) {
    if (!isNum(n)) return "—";
    opts = opts || {};
    var digits = opts.digits !== undefined ? opts.digits : (Math.abs(n) < 10 ? 2 : 1);
    var s = formatNumber(n, digits);
    if (opts.sign && n > 0) s = "+" + s;
    return s + NBSP + "%";
  }

  /** Месяцы → «2,4 мес» */
  function formatMonths(n) {
    if (!isNum(n)) return "—";
    return formatNumber(n, 1) + NBSP + "мес";
  }

  return {
    round2: round2,
    parseNumber: parseNumber,
    LIMITS: LIMITS,
    validate: validate,
    lineTotal: lineTotal,
    estimate: estimate,
    packageLine: packageLine,
    holdingPerMonth: holdingPerMonth,
    scenario: scenario,
    normalize: normalize,
    preparedListPrice: preparedListPrice,
    compare: compare,
    breakEven: breakEven,
    formatNumber: formatNumber,
    formatMoney: formatMoney,
    formatPct: formatPct,
    formatMonths: formatMonths
  };
});
