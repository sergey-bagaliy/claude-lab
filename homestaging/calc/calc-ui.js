/*
 * Калькулятор: связь полей формы с чистыми функциями из calc-core.js (window.HSCalc).
 * Данные пакетов и работ — из shared/config.js.
 */
(function () {
  "use strict";

  var C = window.HS_CONFIG || {};
  var K = window.HSCalc;
  var doc = document;
  var PKGS = Array.isArray(C.packages) ? C.packages : [];
  var EXTRAS = Array.isArray(C.extras) ? C.extras : [];
  var BRAND = (C.brand && C.brand.name) || "Хоумстейджинг";

  var COND_LABELS = { lived: "жилая, с мебелью", empty: "пустая", cosmetic: "нужна косметика" };

  /* Скалярные поля: [ключ состояния, id поля, вид проверки] */
  var SCALAR = [
    ["area", "c-area", "area"],
    ["rooms", "c-rooms", "rooms"],
    ["price", "c-price", "price"],
    ["pkgPrice", "c-pkg-price", "money"],
    ["rentM", "c-rent-months", "months"],
    ["TA", "c-ta", "months"],
    ["TB", "c-tb", "months"],
    ["up", "c-up", "priceChange"],
    ["dA", "c-da", "discount"],
    ["dB", "c-db", "discount"],
    ["com", "c-com", "commission"],
    ["hM", "c-h-mortgage", "money"],
    ["hU", "c-h-utilities", "money"],
    ["hR", "c-h-rent", "money"],
    ["hO", "c-h-other", "money"],
    ["rate", "c-rate", "rate"]
  ];
  var ASSUMPTION_KEYS = ["TA", "TB", "up", "dA", "dB", "com", "hM", "hU", "hR", "hO", "rate"];
  var RENT_EXTRA_ID = "rent_extend";

  var touched = { pkg: false, qty: {} };

  /* ---------- утилиты ---------- */
  function $(id) { return doc.getElementById(id); }
  function $all(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function money(n, opts) { return K.formatMoney(n, opts); }
  function minus(n) { return isNum(n) && Math.round(n) !== 0 ? money(-n) : money(0); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function pkgById(id) { return PKGS.filter(function (p) { return p.id === id; })[0] || null; }
  function fmtInput(n) { return isNum(n) ? K.formatNumber(n, 2) : ""; }
  function fmtQty(n) { return K.formatNumber(n, 2); }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function suggestPackage(cond) {
    var p = PKGS.filter(function (x) { return (x.suggestFor || []).indexOf(cond) !== -1; })[0];
    return p ? p.id : "";
  }
  function configPrice(pkgId) {
    var p = pkgById(pkgId);
    return p && isNum(p.priceFrom) ? p.priceFrom : null;
  }

  /* ---------- состояние по умолчанию: «подготовка ничего не меняет» ---------- */
  function defaultExtra(x, area) {
    var qty = x.qtyFrom === "area" ? (isNum(area) ? area : null) : (isNum(x.defaultQty) ? x.defaultQty : null);
    return { on: false, qty: qty, price: isNum(x.unitPrice) ? x.unitPrice : null };
  }

  function defaults() {
    var cond = "lived";
    var pkg = suggestPackage(cond);
    var st = {
      cond: cond, pkg: pkg,
      area: null, rooms: null, price: null, pkgPrice: configPrice(pkg), rentM: 0,
      TA: null, TB: null, up: 0, dA: 0, dB: null, com: 0,
      hM: null, hU: null, hR: null, hO: null, rate: 0,
      x: {}
    };
    EXTRAS.forEach(function (x) { st.x[x.id] = defaultExtra(x, null); });
    return st;
  }

  /* ---------- построение строк отдельных работ ---------- */
  function buildExtras() {
    var box = $("extras-list");
    box.textContent = "";
    EXTRAS.forEach(function (x) {
      var row = doc.createElement("div");
      row.className = "xrow";
      row.setAttribute("data-extra", x.id);
      var unitLabel = x.unit || "шт";
      row.innerHTML =
        '<label class="check xrow__name" for="x-' + esc(x.id) + '-on">' +
          '<input type="checkbox" id="x-' + esc(x.id) + '-on" data-x="on">' +
          '<span>' + esc(x.name) + (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + '</span>' +
        '</label>' +
        '<div class="xrow__ctl">' +
          '<label class="visually-hidden" for="x-' + esc(x.id) + '-qty">' + esc(x.name) + ': количество, ' + esc(unitLabel) + '</label>' +
          '<div class="input-wrap" style="--sfx:' + unitLabel.length + '">' +
            '<input class="input" id="x-' + esc(x.id) + '-qty" inputmode="decimal" data-x="qty" data-kind="qty">' +
            '<span class="suffix">' + esc(unitLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="xrow__ctl">' +
          '<label class="visually-hidden" for="x-' + esc(x.id) + '-price">' + esc(x.name) + ': цена за ' + esc(unitLabel) + ', ₽</label>' +
          '<div class="input-wrap" style="--sfx:' + (unitLabel.length + 2) + '">' +
            '<input class="input" id="x-' + esc(x.id) + '-price" inputmode="decimal" data-x="price" data-kind="money" data-money placeholder="введите цену">' +
            '<span class="suffix">₽/' + esc(unitLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<output class="xrow__total" id="x-' + esc(x.id) + '-total" for="x-' + esc(x.id) + '-qty x-' + esc(x.id) + '-price">—</output>';
      box.appendChild(row);
    });
  }

  function extraInputs(id) {
    return { on: $("x-" + id + "-on"), qty: $("x-" + id + "-qty"), price: $("x-" + id + "-price"), total: $("x-" + id + "-total") };
  }

  /* ---------- запись / чтение состояния ---------- */
  function applyState(st) {
    SCALAR.forEach(function (f) { $(f[1]).value = fmtInput(st[f[0]]); });
    $("c-cond").value = COND_LABELS[st.cond] ? st.cond : "lived";
    $("c-pkg").value = pkgById(st.pkg) ? st.pkg : "";
    EXTRAS.forEach(function (x) {
      var s = (st.x && st.x[x.id]) || defaultExtra(x, st.area);
      var el = extraInputs(x.id);
      el.on.checked = !!s.on;
      el.qty.value = fmtInput(s.qty);
      el.price.value = fmtInput(s.price);
    });
    $all("#calc-form [aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); });
    $all("#calc-form .field-error").forEach(function (n) { n.textContent = ""; });
    updatePackageUI();
  }

  /** Читает поле: { value: число|null, error: текст|null } */
  function readField(input, kind) {
    var v = K.parseNumber(input.value);
    var err = K.validate(kind, v);
    return { value: err ? null : v, error: err, raw: v };
  }

  function readState() {
    var st = { cond: $("c-cond").value, pkg: $("c-pkg").value, x: {}, errors: {} };
    SCALAR.forEach(function (f) {
      var r = readField($(f[1]), f[2]);
      st[f[0]] = r.value;
      if (r.error) st.errors[f[0]] = r.error;
    });
    EXTRAS.forEach(function (x) {
      var el = extraInputs(x.id);
      var q = readField(el.qty, "qty");
      var p = readField(el.price, "money");
      st.x[x.id] = { on: el.on.checked, qty: q.value, price: p.value, error: q.error || p.error };
    });
    return st;
  }

  /* ---------- проверка полей ---------- */
  function showFieldError(input, kind, force) {
    var v = K.parseNumber(input.value);
    var err = K.validate(kind, v);
    // «Введите число» показываем только после ухода с поля, чтобы не мешать набору «−» или «2,»
    if (err === "Введите число" && !force && doc.activeElement === input) err = input.getAttribute("aria-invalid") ? err : null;
    if (err) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    var errBox = $(input.id + "-err");
    if (errBox) errBox.textContent = err || "";
    else input.title = err || "";
    return err;
  }

  /* ---------- пакет ---------- */
  function updatePackageUI() {
    var pkg = pkgById($("c-pkg").value);
    var field = $("c-pkg-price-field");
    var desc = $("c-pkg-desc");
    field.hidden = !pkg;
    if (!pkg) {
      desc.textContent = "Посчитаем только отмеченные ниже работы.";
      return;
    }
    var perM2 = pkg.priceUnit === "за м²";
    $("c-pkg-unit").textContent = perM2 ? "за м²" : "за объект";
    $("c-pkg-price-suffix").textContent = perM2 ? "₽/м²" : "₽";
    desc.textContent = (pkg.forWhom ? pkg.forWhom + ". " : "") + (pkg.includes && pkg.includes.length ? "Входит: " + pkg.includes.join("; ") + "." : "");
    $("c-pkg-price-hint").textContent = isNum(pkg.priceFrom)
      ? "Подставлено из прайса («от»), можно изменить."
      : "Цена пакета уточняется — введите свою оценку или запросите смету.";
  }

  /* ---------- расчёт ---------- */
  function compute(st) {
    var pkg = pkgById(st.pkg);
    var lines = [];
    if (pkg) lines.push(K.packageLine(pkg, st.area, st.pkgPrice));
    EXTRAS.forEach(function (x) {
      var s = st.x[x.id];
      if (s && s.on) lines.push({ id: x.id, name: x.name, qty: s.qty, unit: x.unit, unitPrice: s.price });
    });
    var est = K.estimate(lines);
    var monthly = K.holdingPerMonth({ m: st.hM, u: st.hU, r: st.hR, o: st.hO });
    var params = {
      listPrice: st.price,
      priceChangePct: st.up,
      discountPctA: st.dA,
      discountPctB: st.dB,
      commissionPct: st.com,
      monthlyCosts: monthly,
      monthsA: st.TA,
      monthsB: st.TB,
      ratePct: st.rate,
      prepCost: est.total
    };
    var assumptionErrors = ASSUMPTION_KEYS.some(function (k) { return st.errors[k]; }) || !!st.errors.price;
    var ready = isNum(st.price) && st.price > 0 && isNum(st.TA) && !assumptionErrors;
    return {
      est: est,
      monthly: monthly,
      params: params,
      ready: ready,
      assumptionErrors: assumptionErrors,
      cmp: ready ? K.compare(params) : null,
      be: ready ? K.breakEven(params) : null
    };
  }

  /* ---------- вывод ---------- */
  function lineSub(l) {
    if (l.missingQty) return '<span class="line-sub line-missing">укажите ' + (l.unit === "м²" ? "площадь" : "количество") + "</span>";
    var q = fmtQty(l.qty) + " " + esc(l.unit || "");
    if (l.missingPrice) return '<span class="line-sub">' + q + ' × <span class="line-missing">введите цену</span></span>';
    return '<span class="line-sub">' + q + " × " + money(l.unitPrice) + "</span>";
  }

  function renderEstimate(res) {
    var body = $("estimate-body");
    if (!res.est.lines.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="2">Выберите пакет или отметьте работы.</td></tr>';
    } else {
      body.innerHTML = res.est.lines.map(function (l) {
        return "<tr><td>" + esc(l.name) + lineSub(l) + '</td><td class="num">' +
          (l.total === null ? '<span class="line-missing">—</span>' : money(l.total)) + "</td></tr>";
      }).join("");
    }
    $("estimate-total").textContent = money(res.est.total);
    $("ms-est").textContent = money(res.est.total);
    var miss = $("estimate-missing");
    if (res.est.missingCount > 0) {
      var n = res.est.missingCount;
      miss.textContent = "Не учтено " + n + " " + plural(n, "позиция", "позиции", "позиций") + " без цены или количества — заполните подсвеченные поля.";
      miss.hidden = false;
    } else {
      miss.hidden = true;
    }

    // Суммы строк в списке работ
    EXTRAS.forEach(function (x) {
      var el = extraInputs(x.id);
      var row = el.on.closest(".xrow");
      row.classList.toggle("is-on", el.on.checked);
      var q = K.parseNumber(el.qty.value), p = K.parseNumber(el.price.value);
      var t = K.lineTotal({ qty: isNum(q) ? q : null, unitPrice: isNum(p) ? p : null });
      el.total.textContent = t === null ? "—" : money(t);
      el.price.classList.toggle("needs-price", el.price.value.trim() === "");
    });
    var pp = $("c-pkg-price");
    pp.classList.toggle("needs-price", pp.value.trim() === "");
  }

  function row(label, a, b, sub) {
    return '<tr><th scope="row">' + label + (sub ? '<span class="row-sub">' + sub + "</span>" : "") +
      '</th><td class="num">' + a + '</td><td class="num">' + b + "</td></tr>";
  }

  function pctText(n) { return K.formatPct(n, { digits: 2 }).replace(/,00(?= )/, ""); }

  function renderCompare(res, st) {
    var empty = $("compare-empty");
    var box = $("compare-result");
    var beCard = $("breakeven-card");
    var msDiff = $("ms-diff");
    if (res.ready) {
      msDiff.textContent = money(res.cmp.diff, { sign: true });
      msDiff.className = res.cmp.diff > 0 ? "is-pos" : res.cmp.diff < 0 ? "is-neg" : "";
    } else {
      msDiff.textContent = "—";
      msDiff.className = "";
    }
    if (!res.ready) {
      empty.innerHTML = res.assumptionErrors
        ? "Исправьте поля с ошибками — тогда покажем сравнение."
        : 'Чтобы сравнить сценарии, укажите <a href="#c-price">цену в объявлении</a> и <a href="#c-ta">срок продажи «как есть»</a>.';
      empty.hidden = false;
      box.hidden = true;
      beCard.hidden = true;
      return;
    }
    empty.hidden = true;
    box.hidden = false;
    beCard.hidden = false;

    var A = res.cmp.asIs, B = res.cmp.prepared, n = res.cmp.params;
    var html = "";
    html += row("Цена в объявлении", money(A.listPrice), money(B.listPrice),
      n.priceChangePct ? "после подготовки: " + K.formatPct(n.priceChangePct, { sign: true }) + " — ваше допущение" : "");
    html += row("Торг при сделке", '<span class="minus">' + minus(A.discount) + "</span>", '<span class="minus">' + minus(B.discount) + "</span>",
      pctText(n.discountPctA) + " / " + pctText(n.discountPctB));
    html += row("Цена сделки", money(A.dealPrice), money(B.dealPrice));
    html += row("Комиссия риелтора", '<span class="minus">' + minus(A.commission) + "</span>", '<span class="minus">' + minus(B.commission) + "</span>",
      n.commissionPct ? pctText(n.commissionPct) + " от сделки" : "");
    html += row("Расходы на владение", '<span class="minus">' + minus(A.holding) + "</span>", '<span class="minus">' + minus(B.holding) + "</span>",
      money(n.monthlyCosts) + "/мес × " + K.formatNumber(n.monthsA, 1) + " / " + K.formatNumber(n.monthsB, 1) + " мес");
    html += row("Упущенный доход", '<span class="minus">' + minus(A.opportunity) + "</span>", '<span class="minus">' + minus(B.opportunity) + "</span>",
      n.ratePct ? pctText(n.ratePct) + " годовых" : "");
    html += row("Подготовка", '<span class="minus">' + money(0) + "</span>", '<span class="minus">' + minus(B.prep) + "</span>");
    $("compare-body").innerHTML = html;

    $("net-a").textContent = money(A.net);
    $("net-b").textContent = money(B.net);
    var diffCell = $("net-diff");
    diffCell.textContent = money(res.cmp.diff, { sign: true });
    diffCell.className = "num " + (res.cmp.diff > 0 ? "is-pos" : res.cmp.diff < 0 ? "is-neg" : "");

    // Вердикт — всегда с оговоркой про допущения
    var d = Math.round(res.cmp.diff);
    var S = res.est.total;
    var verdict = $("verdict");
    var t;
    if (S <= 0) {
      t = "Смета пока пустая — введите цены пакета и работ, чтобы сравнение имело смысл. ";
    } else {
      t = "";
    }
    if (d > 0) t += "При ваших допущениях подготовка окупается: на руках остаётся на " + money(d) + " больше, чем при продаже «как есть».";
    else if (d < 0) t += "При ваших допущениях подготовка не окупается: на руках остаётся на " + money(-d) + " меньше, чем при продаже «как есть». Ниже — при каких условиях она выходит в ноль.";
    else t += "При ваших допущениях результат одинаковый.";
    var noEffect = n.priceChangePct === 0 && n.monthsB === n.monthsA && n.discountPctB === n.discountPctA;
    if (noEffect && S > 0) t += " Сейчас в допущениях подготовка ничего не меняет — поэтому разница равна смете.";
    t += " Это расчёт на ваших допущениях, а не обещание результата.";
    verdict.textContent = t;
    verdict.className = "verdict " + (d > 0 ? "is-pos-box" : d < 0 ? "is-neg-box" : "");

    renderBreakEven(res);
  }

  function renderBreakEven(res) {
    var be = res.be, n = res.cmp.params, A = res.cmp.asIs;
    var S = res.est.total;
    var priceEl = $("be-price"), timeEl = $("be-time");
    if (S <= 0) {
      priceEl.textContent = "Смета пустая — окупать нечего. Введите цены, чтобы посчитать порог.";
      timeEl.textContent = "—";
      return;
    }
    var TB = K.formatNumber(n.monthsB, 1) + " " + "мес";
    if (!be.price.achievable) {
      priceEl.textContent = "При указанных комиссии, ставке и сроке выйти в ноль за счёт цены невозможно.";
    } else if (be.price.deltaRub > 0) {
      priceEl.innerHTML = "Чтобы выйти в ноль при сроке продажи " + TB + ", цена сделки после подготовки должна быть не ниже <strong>" +
        money(be.price.requiredDealPrice) + "</strong> — на " + money(be.price.deltaRub) + " (" + K.formatPct(be.price.deltaPct) +
        ") выше цены сделки «как есть»" +
        (be.price.requiredListPrice !== null && n.discountPctB > 0
          ? ". С учётом торга " + pctText(n.discountPctB) + " это цена в объявлении около <strong>" + money(be.price.requiredListPrice) + "</strong>."
          : ".");
    } else {
      priceEl.innerHTML = "При сроке продажи " + TB + " подготовка окупается даже при цене сделки до <strong>" +
        money(be.price.requiredDealPrice) + "</strong> — это на " + money(-be.price.deltaRub) + " ниже цены сделки «как есть».";
    }

    if (be.time.reason === "no-monthly-cost") {
      timeEl.textContent = "Не окупается за счёт срока: ежемесячные расходы и упущенный доход равны нулю — ожидание продажи ничего не стоит.";
    } else if (be.time.achievable) {
      var perMonth = n.monthlyCosts + A.dealPrice * n.ratePct / 100 / 12;
      var days = Math.round(be.time.monthsFaster * 30.4);
      var html = "Продажа после подготовки должна пройти быстрее на <strong>" + K.formatMonths(be.time.monthsFaster) + "</strong> (≈ " +
        K.formatNumber(days) + " " + plural(days, "день", "дня", "дней") + "), чем «как есть». Каждый месяц ожидания стоит вам " + money(perMonth) + ".";
      if (be.time.exceedsAsIs) {
        html += " Это не меньше всего срока продажи «как есть» (" + K.formatNumber(n.monthsA, 1) + " мес) — одним ускорением продажи подготовка не окупится.";
      }
      timeEl.innerHTML = html;
    }
  }

  function renderSide(res, st) {
    $("c-h-total").textContent = money(res.monthly);

    // Пояснение к изменению цены: в рублях
    var upHint = $("c-up-hint");
    var base = "0 — цена та же. Можно указать и отрицательное значение.";
    if (isNum(st.price) && st.price > 0 && isNum(st.up) && !st.errors.up) {
      var pb = K.preparedListPrice(st.price, st.up);
      upHint.textContent = "= " + money(pb) + " в объявлении (" + money(pb - st.price, { sign: true }) + "). " + base;
    } else {
      upHint.textContent = base;
    }

    // Подсказки «пусто — как „как есть“»
    $("c-tb").placeholder = isNum(st.TA) ? K.formatNumber(st.TA, 1) + " — как «как есть»" : "как «как есть»";
    $("c-db").placeholder = isNum(st.dA) ? K.formatNumber(st.dA, 2) + " — как «как есть»" : "как «как есть»";

    // Ссылка «Обсудить смету»
    var q = [];
    if (st.pkg) q.push("package=" + encodeURIComponent(st.pkg));
    if (isNum(st.area)) q.push("area=" + encodeURIComponent(String(st.area)));
    if (res.est.total > 0) q.push("estimate=" + Math.round(res.est.total));
    var href = "../site/" + (q.length ? "?" + q.join("&") : "") + "#zayavka";
    $all("[data-discuss]").forEach(function (a) { a.setAttribute("href", href); });
  }

  /* ---------- лист для печати ---------- */
  function renderPrint(res, st) {
    var pkg = pkgById(st.pkg);
    var date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    var contacts = C.contacts || {};
    var cLines = [];
    if (contacts.phone) cLines.push(esc(contacts.phone));
    if (contacts.email) cLines.push(esc(contacts.email));
    if (contacts.telegram) cLines.push("Telegram: " + esc(contacts.telegram));

    var h = "";
    h += '<div class="ps-head"><div><div class="ps-brand">' + esc(BRAND) + '</div><div class="muted">' + esc((C.brand && C.brand.tagline) || "") + "</div></div>" +
      '<div class="ps-meta">Предварительный расчёт<br>' + esc(date) + (cLines.length ? "<br>" + cLines.join("<br>") : "") + "</div></div>";
    h += "<h1>Смета подготовки квартиры</h1>";

    h += '<h2>Квартира</h2><div class="ps-grid">' +
      "<div>Площадь: " + (isNum(st.area) ? fmtQty(st.area) + " м²" : "—") + "</div>" +
      "<div>Комнат: " + (isNum(st.rooms) ? st.rooms : "—") + "</div>" +
      "<div>Состояние: " + esc(COND_LABELS[st.cond] || "—") + "</div>" +
      "<div>Цена в объявлении: " + (isNum(st.price) ? money(st.price) : "—") + "</div>" +
      "<div>Пакет: " + (pkg ? "«" + esc(pkg.name) + "»" : "без пакета") + "</div></div>";

    h += "<h2>Смета</h2><table><thead><tr><th>Позиция</th><th class=\"r\">Кол-во</th><th class=\"r\">Цена</th><th class=\"r\">Сумма</th></tr></thead><tbody>";
    if (!res.est.lines.length) h += '<tr><td colspan="4" class="muted">Позиции не выбраны</td></tr>';
    res.est.lines.forEach(function (l) {
      h += "<tr><td>" + esc(l.name) + '</td><td class="r">' + (l.missingQty ? "—" : fmtQty(l.qty) + " " + esc(l.unit || "")) +
        '</td><td class="r">' + (l.missingPrice ? "цена не указана" : money(l.unitPrice)) +
        '</td><td class="r">' + (l.total === null ? "—" : money(l.total)) + "</td></tr>";
    });
    h += '<tr class="total"><th colspan="3">Итого</th><td class="r">' + money(res.est.total) + "</td></tr></tbody></table>";
    if (res.est.missingCount) h += '<p class="muted">Не учтено позиций без цены или количества: ' + res.est.missingCount + ".</p>";

    if (res.ready) {
      var A = res.cmp.asIs, B = res.cmp.prepared, n = res.cmp.params;
      h += "<h2>Допущения пользователя</h2><ul>" +
        "<li>Срок продажи: «как есть» " + K.formatNumber(n.monthsA, 1) + " мес, после подготовки " + K.formatNumber(n.monthsB, 1) + " мес</li>" +
        "<li>Изменение цены объявления после подготовки: " + K.formatPct(n.priceChangePct, { sign: true }) + "</li>" +
        "<li>Торг: «как есть» " + pctText(n.discountPctA) + ", после подготовки " + pctText(n.discountPctB) + "</li>" +
        "<li>Комиссия риелтора: " + pctText(n.commissionPct) + "; расходы на владение: " + money(n.monthlyCosts) + "/мес; упущенный доход: " + pctText(n.ratePct) + " годовых</li></ul>";
      h += "<h2>Сравнение</h2><table><thead><tr><th></th><th class=\"r\">Как есть</th><th class=\"r\">После подготовки</th></tr></thead><tbody>" +
        "<tr><td>Цена в объявлении</td><td class=\"r\">" + money(A.listPrice) + "</td><td class=\"r\">" + money(B.listPrice) + "</td></tr>" +
        "<tr><td>Цена сделки</td><td class=\"r\">" + money(A.dealPrice) + "</td><td class=\"r\">" + money(B.dealPrice) + "</td></tr>" +
        "<tr><td>Комиссия</td><td class=\"r\">" + minus(A.commission) + "</td><td class=\"r\">" + minus(B.commission) + "</td></tr>" +
        "<tr><td>Расходы на владение</td><td class=\"r\">" + minus(A.holding) + "</td><td class=\"r\">" + minus(B.holding) + "</td></tr>" +
        "<tr><td>Упущенный доход</td><td class=\"r\">" + minus(A.opportunity) + "</td><td class=\"r\">" + minus(B.opportunity) + "</td></tr>" +
        "<tr><td>Подготовка</td><td class=\"r\">" + money(0) + "</td><td class=\"r\">" + minus(B.prep) + "</td></tr>" +
        '<tr class="total"><th>Чистыми на руках</th><td class="r">' + money(A.net) + '</td><td class="r">' + money(B.net) + "</td></tr>" +
        '<tr><th>Разница</th><td class="r">—</td><td class="r">' + money(res.cmp.diff, { sign: true }) + "</td></tr></tbody></table>";
      h += '<div class="ps-be"><h2>Точка окупаемости</h2><p>' + $("be-price").innerHTML + "</p><p>" + $("be-time").innerHTML + "</p></div>";
    }
    h += '<div class="ps-note">Расчёт выполнен на основе цифр и допущений пользователя и не является обещанием результата, прогнозом цены или срока продажи, а также публичной офертой. Точная смета составляется после осмотра квартиры.</div>';
    $("print-sheet").innerHTML = h;
  }

  /* ---------- главный цикл ---------- */
  var lastRes = null, lastState = null;
  function update() {
    var st = readState();
    var res = compute(st);
    renderEstimate(res);
    renderCompare(res, st);
    renderSide(res, st);
    renderPrint(res, st);
    lastRes = res;
    lastState = st;
  }

  /* ---------- «Поделиться»: состояние в hash ---------- */
  function serialize(st) {
    var o = { v: 1, cond: st.cond, pkg: st.pkg, x: {} };
    SCALAR.forEach(function (f) { o[f[0]] = isNum(st[f[0]]) ? st[f[0]] : null; });
    EXTRAS.forEach(function (x) {
      var s = st.x[x.id];
      o.x[x.id] = [s.on ? 1 : 0, isNum(s.qty) ? s.qty : null, isNum(s.price) ? s.price : null];
    });
    var json = JSON.stringify(o);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function deserialize(str) {
    try {
      var b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var o = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!o || o.v !== 1) return null;
      var st = defaults();
      st.cond = COND_LABELS[o.cond] ? o.cond : st.cond;
      st.pkg = typeof o.pkg === "string" ? o.pkg : st.pkg;
      SCALAR.forEach(function (f) {
        if (Object.prototype.hasOwnProperty.call(o, f[0])) st[f[0]] = isNum(o[f[0]]) ? o[f[0]] : null;
      });
      EXTRAS.forEach(function (x) {
        var a = o.x && o.x[x.id];
        if (Array.isArray(a)) st.x[x.id] = { on: !!a[0], qty: isNum(a[1]) ? a[1] : null, price: isNum(a[2]) ? a[2] : null };
      });
      return st;
    } catch (e) {
      return null;
    }
  }

  function shareUrl() {
    return location.href.split("#")[0] + "#s=" + serialize(readState());
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /* ---------- события ---------- */
  function syncAreaQty() {
    var area = K.parseNumber($("c-area").value);
    EXTRAS.forEach(function (x) {
      if (x.qtyFrom === "area" && !touched.qty[x.id]) {
        extraInputs(x.id).qty.value = isNum(area) && area > 0 ? fmtInput(area) : "";
      }
    });
  }

  function onInput(e) {
    var t = e.target;
    var row = t.closest && t.closest(".xrow");
    if (row) {
      var id = row.getAttribute("data-extra");
      var el = extraInputs(id);
      var kind = t.getAttribute("data-x");
      if ((kind === "qty" || kind === "price") && t.value.trim() !== "") el.on.checked = true;
      if (kind === "qty") {
        touched.qty[id] = true;
        if (id === RENT_EXTRA_ID) $("c-rent-months").value = t.value;
      }
    }
    if (t.id === "c-rent-months") {
      var rent = extraInputs(RENT_EXTRA_ID);
      if (rent.qty) {
        rent.qty.value = t.value;
        var m = K.parseNumber(t.value);
        rent.on.checked = isNum(m) && m > 0;
      }
    }
    if (t.id === "c-area") syncAreaQty();
    var k = t.getAttribute("data-kind");
    if (k) showFieldError(t, k, false);
    update();
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === "c-cond" && !touched.pkg) {
      $("c-pkg").value = suggestPackage(t.value);
      $("c-pkg-price").value = fmtInput(configPrice($("c-pkg").value));
      updatePackageUI();
    }
    if (t.id === "c-pkg") {
      touched.pkg = true;
      $("c-pkg-price").value = fmtInput(configPrice(t.value));
      showFieldError($("c-pkg-price"), "money", true);
      updatePackageUI();
    }
    update();
  }

  function onBlur(e) {
    var t = e.target;
    var k = t.getAttribute && t.getAttribute("data-kind");
    if (!k) return;
    var err = showFieldError(t, k, true);
    if (!err) {
      var v = K.parseNumber(t.value);
      if (isNum(v)) t.value = fmtInput(v);
    }
  }

  function reset() {
    touched = { pkg: false, qty: {} };
    applyState(defaults());
    if (history.replaceState) history.replaceState(null, "", location.href.split("#")[0]);
    $("share-box").hidden = true;
    update();
  }

  function init() {
    if (!K) return;
    // Тексты бренда, год
    $all("[data-hs-text]").forEach(function (n) {
      var path = n.getAttribute("data-hs-text").split(".");
      var v = path.reduce(function (o, k) { return o && o[k]; }, C);
      if (typeof v === "string" && v.trim()) n.textContent = v.trim();
    });
    $("year").textContent = String(new Date().getFullYear());

    // Список пакетов
    var sel = $("c-pkg");
    PKGS.forEach(function (p) {
      var o = doc.createElement("option");
      o.value = p.id;
      o.textContent = p.name + (isNum(p.priceFrom) ? " — от " + money(p.priceFrom) + (p.priceUnit === "за м²" ? "/м²" : "") : "");
      sel.appendChild(o);
    });

    // Есть ли незаполненные цены в прайсе
    var anyNull = PKGS.some(function (p) { return !isNum(p.priceFrom); }) || EXTRAS.some(function (x) { return !isNum(x.unitPrice); });
    $("prices-notice").hidden = !anyNull;

    buildExtras();

    // Восстановление из ссылки
    var st = null;
    var m = location.hash.match(/^#s=([A-Za-z0-9_-]+)/);
    if (m) {
      st = deserialize(m[1]);
      if (st) {
        touched.pkg = true;
        EXTRAS.forEach(function (x) { touched.qty[x.id] = true; });
      }
    }
    applyState(st || defaults());
    if (st) {
      // показать ошибки, если в ссылке что-то вне диапазона
      SCALAR.forEach(function (f) { if ($(f[1]).value) showFieldError($(f[1]), f[2], true); });
    }

    var form = $("calc-form");
    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    form.addEventListener("focusout", onBlur);
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    $("btn-print").addEventListener("click", function () {
      update();
      window.print();
    });
    window.addEventListener("beforeprint", update);

    $("btn-share").addEventListener("click", function () {
      var url = shareUrl();
      if (history.replaceState) history.replaceState(null, "", url);
      var box = $("share-box"), input = $("share-url"), status = $("share-status");
      box.hidden = false;
      input.value = url;
      input.focus();
      input.select();
      copy(url).then(function (ok) {
        status.textContent = ok ? "Ссылка скопирована — по ней откроется этот же расчёт." : "Скопируйте ссылку из поля выше.";
        status.style.color = ok ? "var(--pos)" : "var(--muted)";
      });
    });

    $("btn-reset").addEventListener("click", reset);

    window.addEventListener("hashchange", function () {
      var mm = location.hash.match(/^#s=([A-Za-z0-9_-]+)/);
      if (!mm) return;
      var s2 = deserialize(mm[1]);
      if (s2) { applyState(s2); update(); }
    });

    update();
  }

  /* ---------- Яндекс Метрика (только если указан номер счётчика) ---------- */
  function loadMetrika() {
    var id = String((C.analytics && C.analytics.yandexMetrikaId) || "").trim();
    if (!/^\d+$/.test(id)) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, doc, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(+id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  init();
  loadMetrika();

  // Для отладки и автотестов
  window.HSCalcUI = { update: update, shareUrl: shareUrl, state: function () { return lastState; }, result: function () { return lastRes; } };
})();
