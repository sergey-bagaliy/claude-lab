/*
 * Демо-кабинет «Ремонт под контролем».
 * Все данные вымышлены (тестовые). Состояние хранится в localStorage браузера.
 */
(function () {
  "use strict";

  var KEY = "remont-demo-v1";
  var TODAY_DAY = 34; // «сегодня» = 34-й день ремонта на момент создания демо

  var ROLES = {
    owner: { label: "Владелец", name: "Владелец", color: "#1d3557" },
    foreman: { label: "Прораб", name: "Прораб Алексей", color: "#c2410c" },
    client: { label: "Заказчик", name: "Заказчик Анна", color: "#2b7a3b" }
  };

  var TABS = [
    { id: "overview", label: "Обзор", icon: '<path d="M3 12 12 4l9 8M5 10v10h14V10"/>' },
    { id: "estimate", label: "Смета", icon: '<path d="M4 4h16v16H4zM4 9h16M4 14h16M9 9v11"/>' },
    { id: "schedule", label: "График", icon: '<path d="M3 6h10M3 12h14M3 18h7"/><rect x="13" y="4" width="8" height="4" rx="1"/>' },
    { id: "photos", label: "Фотоотчёт", icon: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' },
    { id: "acts", label: "Акты", icon: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 15l2 2 4-4"/>' },
    { id: "payments", label: "Оплаты", icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>' },
    { id: "chat", label: "Чат", icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' }
  ];

  // ---------- Тестовые данные ----------
  function L(name, unit, qty, price) { return { name: name, unit: unit, qty: qty, price: price }; }

  function seed() {
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - TODAY_DAY);

    var stages = [
      { id: "s1", name: "Демонтаж и подготовка", start: 0, end: 5, status: "done", progress: 100, doneDay: 5,
        works: [L("Демонтаж перегородки", "м²", 8, 900), L("Демонтаж старых покрытий пола", "м²", 58, 250), L("Грунтование стен и потолков", "м²", 210, 60), L("Вынос и вывоз строительного мусора", "рейс", 3, 4500)],
        materials: [L("Грунт глубокого проникновения, 10 л", "шт", 4, 850), L("Плёнка, малярный скотч", "компл", 1, 2200), L("Мешки для мусора", "уп", 4, 450)] },
      { id: "s2", name: "Электрика (черновая)", start: 6, end: 15, status: "done", progress: 100, doneDay: 15,
        works: [L("Штробление стен", "м.п.", 120, 250), L("Прокладка кабеля", "м.п.", 380, 90), L("Установка подрозетников", "шт", 48, 250), L("Сборка электрощита", "шт", 1, 8500)],
        materials: [L("Кабель 3×2,5", "м", 250, 95), L("Кабель 3×1,5", "м", 130, 70), L("Подрозетники", "шт", 48, 35), L("Автоматы и УЗО, комплект", "компл", 1, 14500)] },
      { id: "s3", name: "Сантехника (черновая)", start: 16, end: 28, status: "done", progress: 100, doneDay: 28,
        works: [L("Разводка водоснабжения", "точка", 8, 3500), L("Разводка канализации", "точка", 6, 2500), L("Монтаж инсталляции", "шт", 1, 6500), L("Опрессовка системы", "шт", 1, 3000)],
        materials: [L("Трубы и фитинги", "компл", 1, 18000), L("Инсталляция", "шт", 1, 16500), L("Коллектор с кранами", "шт", 1, 6800)] },
      { id: "s4", name: "Стяжка и штукатурка", start: 22, end: 32, status: "progress", progress: 80,
        works: [L("Штукатурка стен по маякам", "м²", 185, 650), L("Полусухая стяжка пола", "м²", 58, 700), L("Штукатурка откосов", "м.п.", 18, 600)],
        materials: [L("Штукатурная смесь, 30 кг", "мешок", 95, 520), L("Смесь для стяжки, 40 кг", "мешок", 40, 380), L("Маяки, сетка, расходники", "компл", 1, 4800)] },
      { id: "s5", name: "Плитка: санузел и кухня", start: 33, end: 44, status: "planned", progress: 0,
        works: [L("Гидроизоляция", "м²", 12, 450), L("Укладка плитки на стены", "м²", 32, 1800), L("Укладка плитки на пол", "м²", 9, 1700), L("Затирка швов", "м²", 41, 250)],
        materials: [L("Плиточный клей, 25 кг", "мешок", 30, 520), L("Гидроизоляция, комплект", "компл", 1, 3900), L("Затирка", "кг", 10, 380)] },
      { id: "s6", name: "Шпаклёвка и покраска", start: 45, end: 57, status: "planned", progress: 0,
        works: [L("Шпаклёвка стен под покраску", "м²", 150, 450), L("Покраска стен в 2 слоя", "м²", 150, 350), L("Шпаклёвка и покраска потолка", "м²", 58, 700)],
        materials: [L("Шпаклёвка финишная, 20 кг", "мешок", 30, 690), L("Краска интерьерная, 9 л", "шт", 8, 4200), L("Малярный стеклохолст", "рулон", 6, 2900)] },
      { id: "s7", name: "Напольные покрытия", start: 58, end: 64, status: "planned", progress: 0,
        works: [L("Укладка ламината", "м²", 49, 450), L("Монтаж плинтуса", "м.п.", 62, 250), L("Установка порожков", "шт", 4, 600)],
        materials: [L("Подложка", "м²", 52, 120), L("Плинтус МДФ", "шт", 26, 650)] },
      { id: "s8", name: "Чистовой монтаж и двери", start: 65, end: 74, status: "planned", progress: 0,
        works: [L("Установка розеток и выключателей", "шт", 48, 300), L("Установка светильников", "шт", 12, 700), L("Установка сантехприборов", "шт", 6, 2500), L("Установка межкомнатных дверей", "шт", 4, 4500)],
        materials: [L("Расходные материалы", "компл", 1, 6500)] }
    ];

    var st = {
      v: 1,
      startISO: isoDate(start),
      role: "owner",
      tab: "overview",
      stages: stages,
      extras: [
        { id: "x1", stageId: "s2", name: "Вывод питания под подсветку кухни", unit: "компл", qty: 1, price: 4500, status: "approved", day: 10, by: "foreman" },
        { id: "x2", stageId: "s4", name: "Дополнительные розетки на кухне", unit: "шт", qty: 2, price: 1800, status: "pending", day: 33, by: "foreman" }
      ],
      acts: [
        { id: "a1", no: 1, stageId: "s1", status: "signed", sentDay: 5, signedDay: 6 },
        { id: "a2", no: 2, stageId: "s2", status: "signed", sentDay: 15, signedDay: 16 },
        { id: "a3", no: 3, stageId: "s3", status: "sent", sentDay: 29 }
      ],
      payments: [],
      photos: [
        { id: "p1", stageId: "s1", day: 1, art: "demolition", caption: "Демонтаж перегородки между кухней и гостиной", by: "foreman" },
        { id: "p2", stageId: "s1", day: 5, art: "primer", caption: "Стены загрунтованы, мусор вывезен", by: "foreman" },
        { id: "p3", stageId: "s2", day: 9, art: "wiring", caption: "Штробы и кабель в спальне", by: "foreman" },
        { id: "p4", stageId: "s2", day: 15, art: "panel", caption: "Собран электрощит, автоматы подписаны", by: "foreman" },
        { id: "p5", stageId: "s3", day: 21, art: "plumbing", caption: "Разводка воды в санузле, коллектор", by: "foreman" },
        { id: "p6", stageId: "s3", day: 28, art: "pressure", caption: "Опрессовка: давление держится сутки", by: "foreman" },
        { id: "p7", stageId: "s4", day: 25, art: "plaster", caption: "Маяки выставлены в гостиной", by: "foreman" },
        { id: "p8", stageId: "s4", day: 31, art: "plaster2", caption: "Штукатурка в спальне готова", by: "foreman" },
        { id: "p9", stageId: "s4", day: 34, art: "screed", caption: "Стяжка в коридоре, проверка уровнем", by: "foreman" }
      ],
      chat: [
        { id: "m1", from: "owner", day: 0, time: "10:05", text: "Анна, добрый день! Здесь будем вести весь ремонт: фото, акты и оплаты по этапам. Прораб на объекте — Алексей." },
        { id: "m2", from: "client", day: 0, time: "10:20", text: "Отлично, спасибо!" },
        { id: "m3", from: "foreman", day: 28, time: "17:40", text: "Сантехника готова, опрессовку прошли. Фото загрузил." },
        { id: "m4", from: "system", day: 29, time: "09:00", text: "Акт №3 «Сантехника (черновая)» отправлен заказчику на подпись." },
        { id: "m5", from: "client", day: 33, time: "19:12", text: "Можно добавить две розетки на кухне, у окна?" },
        { id: "m6", from: "foreman", day: 33, time: "19:30", text: "Можно, оформил как допработу — согласуйте в смете, пожалуйста." },
        { id: "m7", from: "foreman", day: 34, time: "12:15", text: "Штукатурка готова на 80%. Задерживаемся на 2 дня — ждали смесь. Плитку начнём сразу после." }
      ]
    };

    // Оплаты: одна на этап
    st.payments = stages.map(function (s, i) {
      return { id: "pay" + (i + 1), stageId: s.id, status: "planned" };
    });
    var p1 = st.payments[0], p2 = st.payments[1], p3 = st.payments[2];
    p1.status = "paid"; p1.paidDay = 7; p1.amountPaid = stageTotal(st, stages[0]); p1.method = "СБП";
    p2.status = "paid"; p2.paidDay = 17; p2.amountPaid = stageTotal(st, stages[1]); p2.method = "Перевод по счёту";
    p3.status = "awaiting_act";
    return st;
  }

  // ---------- Состояние ----------
  var state;
  var memoryOnly = false;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 1 && Array.isArray(s.stages)) return s;
      }
    } catch (e) { /* хранилище недоступно — работаем в памяти */ }
    return seed();
  }

  function save() {
    if (memoryOnly) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      memoryOnly = true;
      toast("Браузер не даёт сохранить изменения — они пропадут после перезагрузки страницы.");
    }
  }

  // ---------- Утилиты ----------
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function startDate() { var p = state.startISO.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayDate(day) { var d = startDate(); d.setDate(d.getDate() + day); return d; }
  function today() {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((now - startDate()) / 86400000);
  }
  var nf = new Intl.NumberFormat("ru-RU");
  function rub(n) { return nf.format(Math.round(n)) + " ₽"; }
  function dShort(day) { return dayDate(day).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""); }
  function dFull(day) { var d = dayDate(day); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  function days(n) { return n + " " + plural(n, "день", "дня", "дней"); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowTime() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function icon(path, size) { return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>"; }

  function stageById(id) { for (var i = 0; i < state.stages.length; i++) if (state.stages[i].id === id) return state.stages[i]; return null; }
  function stageIndex(id) { for (var i = 0; i < state.stages.length; i++) if (state.stages[i].id === id) return i; return -1; }
  function sumLines(lines) { return lines.reduce(function (a, l) { return a + l.qty * l.price; }, 0); }
  function stageExtras(st, s, status) { return st.extras.filter(function (x) { return x.stageId === s.id && (!status || x.status === status); }); }
  function stageTotal(st, s) { return sumLines(s.works) + sumLines(s.materials) + sumLines(stageExtras(st, s, "approved")); }
  function total() { return state.stages.reduce(function (a, s) { return a + stageTotal(state, s); }, 0); }
  function extrasTotal() { return sumLines(state.extras.filter(function (x) { return x.status === "approved"; })); }
  function paid() { return state.payments.reduce(function (a, p) { return a + (p.status === "paid" ? p.amountPaid : 0); }, 0); }
  function paymentAmount(p) { return p.status === "paid" ? p.amountPaid : stageTotal(state, stageById(p.stageId)); }
  function dueNow() { return state.payments.filter(function (p) { return p.status === "due"; }).reduce(function (a, p) { return a + paymentAmount(p); }, 0); }
  function progressPct() {
    var t = 0, w = 0;
    state.stages.forEach(function (s) { var v = stageTotal(state, s); t += v; w += v * s.progress / 100; });
    return t ? Math.round(w / t * 100) : 0;
  }
  function lateness(s) { var t = today(); return s.status === "progress" && t > s.end ? t - s.end : 0; }
  function maxLate() { return state.stages.reduce(function (a, s) { return Math.max(a, lateness(s)); }, 0); }
  function projectEnd() { return state.stages[state.stages.length - 1].end; }
  function currentStage() { for (var i = 0; i < state.stages.length; i++) if (state.stages[i].status === "progress") return state.stages[i]; return null; }
  function actByStage(id) { for (var i = 0; i < state.acts.length; i++) if (state.acts[i].stageId === id) return state.acts[i]; return null; }
  function payByStage(id) { for (var i = 0; i < state.payments.length; i++) if (state.payments[i].stageId === id) return state.payments[i]; return null; }
  function isStaff() { return state.role === "owner" || state.role === "foreman"; }
  function who(from) { return from === "system" ? "Система" : ROLES[from].name; }

  function statusChip(s) {
    if (s.status === "done") return '<span class="chip chip-ok">Готово</span>';
    if (s.status === "progress") {
      var l = lateness(s);
      return l ? '<span class="chip chip-danger">Отставание ' + days(l) + "</span>" : '<span class="chip chip-accent">В работе · ' + s.progress + "%</span>";
    }
    return '<span class="chip">Запланирован</span>';
  }
  function stIcon(s, i) {
    if (s.status === "done") return '<span class="st done" aria-label="готово">✓</span>';
    if (s.status === "progress") return '<span class="st progress" aria-label="в работе">' + (i + 1) + "</span>";
    return '<span class="st planned" aria-label="запланирован">' + (i + 1) + "</span>";
  }

  function photoHTML(p) {
    if (p.src) return '<img src="' + esc(p.src) + '" alt="' + esc(p.caption) + '" loading="lazy">';
    return window.demoArt(p.art);
  }

  // Действия, требующие внимания текущей роли
  function counts() {
    var r = state.role;
    var c = { estimate: 0, acts: 0, payments: 0 };
    if (r === "client") {
      c.estimate = state.extras.filter(function (x) { return x.status === "pending"; }).length;
      c.acts = state.acts.filter(function (a) { return a.status === "sent"; }).length;
      c.payments = state.payments.filter(function (p) { return p.status === "due"; }).length;
    } else if (r === "owner") {
      c.payments = state.payments.filter(function (p) { return p.status === "due"; }).length;
    }
    return c;
  }

  // ---------- Отрисовка каркаса ----------
  var view = document.getElementById("view");

  function renderChrome() {
    var c = counts();
    var side = TABS.map(function (t) {
      var n = c[t.id] || 0;
      return '<button type="button" data-action="tab" data-tab="' + t.id + '"' + (state.tab === t.id ? ' aria-current="page"' : "") + ">" +
        icon(t.icon) + "<span>" + t.label + "</span>" + (n ? '<span class="count">' + n + "</span>" : "") + "</button>";
    }).join("");
    document.getElementById("side-nav").innerHTML = side;

    document.getElementById("tabs-mobile").innerHTML = TABS.map(function (t) {
      var n = c[t.id] || 0;
      return '<button type="button" data-action="tab" data-tab="' + t.id + '"' + (state.tab === t.id ? ' aria-current="page"' : "") + ">" +
        t.label + (n ? '<span class="dot" aria-label="есть действия"></span>' : "") + "</button>";
    }).join("");

    var objs = '<button type="button" class="obj-item active">Квартира 64 м²<small>ул. Примерная, 1 · тестовый объект</small></button>';
    if (state.role !== "client") {
      objs += '<button type="button" class="obj-item locked" data-action="locked">Студия 31 м²<small>в демо недоступен</small></button>' +
        '<button type="button" class="obj-item locked" data-action="locked">Квартира 92 м²<small>в демо недоступен</small></button>';
    }
    document.getElementById("obj-list").innerHTML = objs;

    // Активная вкладка на телефоне всегда в видимой части ленты
    var strip = document.getElementById("tabs-mobile");
    var active = strip.querySelector('[aria-current="page"]');
    if (active && strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = Math.max(0, active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2);
    }

    document.querySelectorAll("#role-switch button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-role") === state.role ? "true" : "false");
    });

    var late = maxLate();
    document.getElementById("obj-sub").innerHTML = "г. Краснодар (вымышленный адрес) · старт " + dShort(0) +
      " · окончание по плану " + dShort(projectEnd()) + (late ? ' · <span style="color:var(--danger)">прогноз +' + days(late) + "</span>" : "");
  }

  function render() {
    renderChrome();
    var fn = VIEWS[state.tab] || VIEWS.overview;
    view.innerHTML = fn();
    if (state.tab === "chat") {
      var log = document.getElementById("chat-log");
      if (log) log.scrollTop = log.scrollHeight;
    }
  }

  // ---------- Разделы ----------
  var VIEWS = {};

  VIEWS.overview = function () {
    var r = state.role;
    var pct = progressPct();
    var tot = total();
    var pd = paid();
    var late = maxLate();
    var cur = currentStage();
    var t = today();

    var hello = r === "client" ? "Здравствуйте, Анна! Ваш ремонт готов на " + pct + "%" :
      r === "foreman" ? "Объект на сегодня" : "Сводка по объекту";

    var kpis = '<div class="kpis">' +
      '<div class="kpi"><div class="k">Готовность</div><div class="v">' + pct + '%</div><div class="bar"><span style="width:' + pct + '%"></span></div></div>' +
      '<div class="kpi"><div class="k">Окончание</div><div class="v">' + dShort(projectEnd() + late) + '</div><div class="d">' + (late ? '<span style="color:var(--danger)">план ' + dShort(projectEnd()) + ", +" + days(late) + "</span>" : "по плану") + "</div></div>" +
      '<div class="kpi"><div class="k">Стоимость по смете</div><div class="v num">' + rub(tot) + '</div><div class="d">вкл. допработы ' + rub(extrasTotal()) + "</div></div>" +
      '<div class="kpi"><div class="k">Оплачено</div><div class="v num">' + rub(pd) + '</div><div class="bar accent"><span style="width:' + (tot ? Math.round(pd / tot * 100) : 0) + '%"></span></div></div>' +
      "</div>";

    // Что требует внимания
    var alerts = [];
    state.stages.forEach(function (s) {
      var l = lateness(s);
      if (l) alerts.push({ k: "danger", ic: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', b: "«" + s.name + "» отстаёт на " + days(l), s: "План — до " + dShort(s.end) + ". Готовность " + s.progress + "%.", act: isStaff() ? '<button class="btn btn-ghost btn-sm" data-action="tab" data-tab="schedule">К графику</button>' : "" });
    });
    state.extras.filter(function (x) { return x.status === "pending"; }).forEach(function (x) {
      alerts.push({ k: "warn", ic: '<path d="M12 5v14M5 12h14"/>', b: "Допработа ждёт согласования", s: esc(x.name) + " — " + rub(x.qty * x.price), act: r === "client" ? '<button class="btn btn-primary btn-sm" data-action="tab" data-tab="estimate">Согласовать</button>' : '<span class="chip chip-warn">у заказчика</span>' });
    });
    state.acts.filter(function (a) { return a.status === "sent"; }).forEach(function (a) {
      var s = stageById(a.stageId);
      var wait = t - a.sentDay;
      alerts.push({ k: "info", ic: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', b: "Акт №" + a.no + " «" + s.name + "» ждёт подписи", s: wait > 0 ? "Отправлен " + days(wait) + " назад. После подписи откроется оплата этапа." : "Отправлен сегодня.", act: r === "client" ? '<button class="btn btn-primary btn-sm" data-action="sign" data-id="' + a.id + '">Подписать</button>' : '<button class="btn btn-ghost btn-sm" data-action="remind" data-id="' + a.id + '">Напомнить</button>' });
    });
    state.payments.filter(function (p) { return p.status === "due"; }).forEach(function (p) {
      var s = stageById(p.stageId);
      alerts.push({ k: "warn", ic: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', b: (r === "client" ? "К оплате: " : "Ожидается оплата: ") + rub(paymentAmount(p)), s: "Этап «" + s.name + "», срок до " + dShort(p.dueDay), act: r === "client" ? '<button class="btn btn-primary btn-sm" data-action="pay" data-id="' + p.id + '">Оплатить</button>' : r === "owner" ? '<button class="btn btn-ghost btn-sm" data-action="mark-paid" data-id="' + p.id + '">Отметить оплату</button>' : "" });
    });
    if (!alerts.length) alerts.push({ k: "ok", ic: '<path d="m5 12 5 5L20 7"/>', b: "Всё по плану", s: "Действий не требуется.", act: "" });

    var alertsHTML = '<div class="alerts">' + alerts.map(function (a) {
      return '<div class="alert ' + a.k + '"><div class="ic">' + icon(a.ic) + "</div><div><b>" + a.b + "</b><span>" + a.s + "</span></div>" + (a.act ? '<div class="act">' + a.act + "</div>" : "") + "</div>";
    }).join("") + "</div>";

    var stagesHTML = '<div class="stage-mini">' + state.stages.map(function (s, i) {
      return '<div class="row">' + stIcon(s, i) + "<span>" + esc(s.name) + '<br><span class="muted small">' + dShort(s.start) + " – " + dShort(s.end) + "</span></span>" + statusChip(s) + "</div>";
    }).join("") + "</div>";

    var lastPhotos = state.photos.slice().sort(function (a, b) { return b.day - a.day; }).slice(0, 3);
    var photosHTML = '<div class="photo-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + lastPhotos.map(function (p) {
      return '<button type="button" class="photo" data-action="photo" data-id="' + p.id + '"><div class="img">' + photoHTML(p) + '</div><div class="cap"><b>' + esc(p.caption) + "</b><span>" + dShort(p.day) + "</span></div></button>";
    }).join("") + "</div>";

    var money = "";
    if (r === "owner") {
      money = '<div class="panel"><h3>Деньги по объекту</h3><div class="money-rows">' +
        '<div class="r"><span>Стоимость по смете</span><span class="num">' + rub(tot) + "</span></div>" +
        '<div class="r"><span>Получено от заказчика</span><span class="num">' + rub(pd) + "</span></div>" +
        '<div class="r"><span>Выставлено к оплате</span><span class="num">' + rub(dueNow()) + "</span></div>" +
        '<div class="r"><span>Ждёт подписания акта</span><span class="num">' + rub(state.payments.filter(function (p) { return p.status === "awaiting_act"; }).reduce(function (a, p) { return a + paymentAmount(p); }, 0)) + "</span></div>" +
        '<div class="r total"><span>Остаток по договору</span><span class="num">' + rub(tot - pd) + "</span></div>" +
        '</div><div class="owner-only-note">Этот блок видит только владелец. Суммы — тестовые.</div></div>';
    }

    var curHTML = cur ? '<div class="panel"><h3>Сейчас в работе</h3><p style="margin:0 0 8px"><b>' + esc(cur.name) + "</b> — " + cur.progress + "%</p>" +
      '<div class="bar accent"><span style="width:' + cur.progress + '%"></span></div>' +
      (isStaff() ? '<p class="small muted" style="margin:10px 0 0">Отметить прогресс или завершить этап можно в разделе «График».</p>' : '<p class="small muted" style="margin:10px 0 0">Прораб: ' + ROLES.foreman.name.replace("Прораб ", "") + ". Вопросы — в чате объекта.</p>") +
      "</div>" : "";

    return '<div class="view-head"><div><h2>' + hello + "</h2><p>Сегодня " + dFull(t) + ", " + (t + 1) + "-й день ремонта</p></div></div>" +
      '<div class="stack">' + kpis +
      '<div class="two-col"><div class="stack"><div class="panel"><h3>Требует внимания</h3>' + alertsHTML + "</div>" +
      '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px"><h3 style="margin:0">Свежие фото</h3><button class="btn btn-ghost btn-sm" data-action="tab" data-tab="photos">Все фото</button></div>' + photosHTML + "</div></div>" +
      '<div class="stack">' + curHTML + money + '<div class="panel"><h3>Этапы</h3>' + stagesHTML + "</div></div></div></div>";
  };

  VIEWS.estimate = function () {
    var r = state.role;
    var html = '<div class="view-head"><div><h2>Смета по этапам</h2><p>Цены в демо условные. Нажмите на этап, чтобы раскрыть работы и материалы.</p></div>' +
      (isStaff() ? '<button class="btn btn-primary btn-sm" data-action="add-extra">+ Допработа</button>' : "") + "</div>";

    html += state.stages.map(function (s, i) {
      var open = state.openStage === s.id;
      var approved = stageExtras(state, s, "approved");
      var pending = stageExtras(state, s, "pending");
      var declined = stageExtras(state, s, "declined");
      function rows(lines) {
        return lines.map(function (l) {
          return '<tr><td class="first" data-l="">' + esc(l.name) + '</td><td data-l="Ед.">' + esc(l.unit) + '</td><td class="r num" data-l="Кол-во">' + nf.format(l.qty) + '</td><td class="r num" data-l="Цена">' + rub(l.price) + '</td><td class="r num" data-l="Сумма"><b>' + rub(l.qty * l.price) + "</b></td></tr>";
        }).join("");
      }
      var table = '<div class="table-wrap"><table class="t cards"><thead><tr><th>Наименование</th><th>Ед.</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th></tr></thead><tbody>' +
        '<tr class="group"><td colspan="5">Работы</td></tr>' + rows(s.works) +
        '<tr class="sub"><td colspan="4">Итого работы</td><td class="r num">' + rub(sumLines(s.works)) + "</td></tr>" +
        '<tr class="group"><td colspan="5">Материалы</td></tr>' + rows(s.materials) +
        '<tr class="sub"><td colspan="4">Итого материалы</td><td class="r num">' + rub(sumLines(s.materials)) + "</td></tr>" +
        (approved.length ? '<tr class="group"><td colspan="5">Допработы (согласованы)</td></tr>' + rows(approved) +
          '<tr class="sub"><td colspan="4">Итого допработы</td><td class="r num">' + rub(sumLines(approved)) + "</td></tr>" : "") +
        "</tbody></table></div>";

      var ex = pending.map(function (x) {
        return '<div class="extra"><div><div class="t1">Допработа на согласовании: ' + esc(x.name) + '</div><div class="t2">' + nf.format(x.qty) + " " + esc(x.unit) + " × " + rub(x.price) + " = <b>" + rub(x.qty * x.price) + "</b> · добавлена " + dShort(x.day) + "</div></div>" +
          (r === "client" ? '<div class="actions"><button class="btn btn-ghost btn-sm" data-action="decline-extra" data-id="' + x.id + '">Отклонить</button><button class="btn btn-primary btn-sm" data-action="approve-extra" data-id="' + x.id + '">Согласовать</button></div>' : '<div class="actions"><span class="chip chip-warn">ждёт заказчика</span></div>') + "</div>";
      }).join("") + declined.map(function (x) {
        return '<div class="extra" style="opacity:.7"><div><div class="t1">' + esc(x.name) + '</div><div class="t2">' + rub(x.qty * x.price) + '</div></div><div class="actions"><span class="chip chip-danger">отклонена заказчиком</span></div></div>';
      }).join("");

      return '<div class="est-stage' + (open ? " open" : "") + '">' +
        '<button type="button" class="est-head" data-action="toggle-stage" data-id="' + s.id + '" aria-expanded="' + (open ? "true" : "false") + '">' +
        stIcon(s, i) + '<span class="name">' + esc(s.name) + "<small>" + dShort(s.start) + " – " + dShort(s.end) + (pending.length ? " · есть допработа на согласовании" : "") + "</small></span>" +
        statusChip(s) + '<span class="sum">' + rub(stageTotal(state, s)) + "</span></button>" +
        '<div class="est-body">' + table + ex + "</div></div>";
    }).join("");

    html += '<div class="est-total"><span>Итого по смете</span><span class="num">' + rub(total()) + "</span></div>" +
      '<p class="small muted" style="margin-top:8px">В том числе согласованные допработы: ' + rub(extrasTotal()) + ". Допработы на согласовании в итог не входят.</p>";
    return html;
  };

  VIEWS.schedule = function () {
    var t = today();
    var late = maxLate();
    var span = Math.max(projectEnd() + late + 2, t + 2);
    var weeks = Math.ceil(span / 7);
    span = weeks * 7;
    function pct(d) { return (d / span * 100).toFixed(3) + "%"; }

    var ticks = "";
    // Подписи недель; последнюю границу не подписываем, чтобы текст не выходил за край
    for (var w = 0; w < weeks; w += (weeks > 8 ? 2 : 1)) {
      ticks += '<span style="left:' + pct(w * 7) + (w === 0 ? ";transform:none" : "") + '">' + dShort(w * 7) + "</span>";
    }

    var rows = state.stages.map(function (s) {
      var l = lateness(s);
      var left = pct(s.start), width = pct(s.end - s.start + 1);
      var bar = '<div class="gbar ' + s.status + (l ? " late" : "") + '" style="left:' + left + ";width:" + width + '" title="' + esc(s.name) + '">' +
        (s.status === "progress" ? '<div class="fill" style="width:' + s.progress + '%"></div>' : "") + "</div>";
      if (l) bar += '<div class="gbar" style="left:' + pct(s.end + 1) + ";width:" + pct(l) + ';background:repeating-linear-gradient(45deg,#f6c4c0 0 6px,#fbe3e1 6px 12px)" title="Отставание"></div>';
      return '<div class="gantt-row"><div class="lbl"><b>' + esc(s.name) + "</b><span>" + dShort(s.start) + " – " + dShort(s.end) + (l ? ' · <span style="color:var(--danger)">+' + days(l) + "</span>" : "") + '</span></div><div class="track" style="background-size:' + (100 / weeks).toFixed(4) + '% 100%">' + bar +
        '<div class="today" style="left:' + pct(t + 0.5) + '"></div></div></div>';
    }).join("");

    var cur = currentStage();
    var control = "";
    if (cur && isStaff()) {
      control = '<div class="panel" style="margin-top:16px"><h3>Текущий этап: ' + esc(cur.name) + "</h3>" +
        '<div class="stage-control"><label for="prog" class="small muted">Готовность</label><input type="range" id="prog" min="0" max="100" step="5" value="' + cur.progress + '"><b id="prog-val">' + cur.progress + '%</b>' +
        '<button class="btn btn-ghost btn-sm" data-action="save-progress" data-id="' + cur.id + '">Сохранить</button></div>' +
        '<p class="small muted" style="margin:10px 0">Когда этап готов, завершите его — заказчику уйдёт акт на подпись, а после подписи откроется оплата.</p>' +
        '<button class="btn btn-primary" data-action="complete-stage" data-id="' + cur.id + '">Завершить этап и отправить акт</button></div>';
    } else if (cur) {
      control = '<div class="panel" style="margin-top:16px"><h3>Сейчас в работе: ' + esc(cur.name) + " — " + cur.progress + '%</h3><p class="small muted" style="margin:0">Прораб отмечает готовность этапов. Когда этап будет готов, вам придёт акт на подпись.</p></div>';
    } else {
      control = '<div class="panel" style="margin-top:16px"><h3>Все этапы завершены</h3><p class="small muted" style="margin:0">Ремонт закончен. Осталось подписать последние акты и закрыть оплаты.</p></div>';
    }

    return '<div class="view-head"><div><h2>График работ</h2><p>Красная линия — сегодня. Штриховка — отставание от плана.</p></div></div>' +
      '<div class="gantt"><div class="gantt-scale"><span class="lbl-sp"></span><div class="ticks">' + ticks + "</div></div>" + rows +
      '<div class="legend"><span><i style="background:#8cc79a"></i>Готово</span><span><i style="background:var(--accent)"></i>В работе</span><span><i style="background:#d6dfeb"></i>Запланировано</span><span><i style="background:repeating-linear-gradient(45deg,#f6c4c0 0 3px,#fbe3e1 3px 6px)"></i>Отставание</span><span><i style="background:var(--danger);width:3px"></i>Сегодня</span></div></div>' + control;
  };

  VIEWS.photos = function () {
    var f = state.photoFilter || "all";
    var withPhotos = state.stages.filter(function (s) { return state.photos.some(function (p) { return p.stageId === s.id; }); });
    var filters = '<div class="filter-row" role="group" aria-label="Фильтр по этапам"><button type="button" data-action="photo-filter" data-id="all" aria-pressed="' + (f === "all") + '">Все</button>' +
      withPhotos.map(function (s) { return '<button type="button" data-action="photo-filter" data-id="' + s.id + '" aria-pressed="' + (f === s.id) + '">' + esc(s.name) + "</button>"; }).join("") + "</div>";
    var list = state.photos.filter(function (p) { return f === "all" || p.stageId === f; }).sort(function (a, b) { return b.day - a.day; });
    var grid = list.length ? '<div class="photo-grid">' + list.map(function (p) {
      var s = stageById(p.stageId);
      return '<button type="button" class="photo" data-action="photo" data-id="' + p.id + '"><div class="img">' + photoHTML(p) + '</div><div class="cap"><b>' + esc(p.caption) + "</b><span>" + dShort(p.day) + " · " + esc(s ? s.name : "") + "</span></div></button>";
    }).join("") + "</div>" : '<div class="empty">Фото пока нет</div>';
    return '<div class="view-head"><div><h2>Фотоотчёт</h2><p>Фото привязаны к этапу и дате. В демо вместо фотографий — условные иллюстрации.</p></div>' +
      (isStaff() ? '<button class="btn btn-primary btn-sm" data-action="add-photo">+ Добавить фото</button>' : "") + "</div>" + filters + grid;
  };

  VIEWS.acts = function () {
    var r = state.role;
    var list = state.acts.slice().sort(function (a, b) { return a.no - b.no; }).map(function (a) {
      var s = stageById(a.stageId);
      var chip = a.status === "signed" ? '<span class="chip chip-ok">Подписан ' + dShort(a.signedDay) + "</span>" : '<span class="chip chip-info">Ждёт подписи</span>';
      var btns = '<button class="btn btn-ghost btn-sm" data-action="open-act" data-id="' + a.id + '">Открыть</button>';
      if (a.status === "sent" && r === "client") btns += '<button class="btn btn-primary btn-sm" data-action="sign" data-id="' + a.id + '">Подписать</button>';
      if (a.status === "sent" && r !== "client") btns += '<button class="btn btn-ghost btn-sm" data-action="remind" data-id="' + a.id + '">Напомнить</button>';
      return '<div class="act-row"><div><div class="t1">Акт №' + a.no + " · " + esc(s.name) + '</div><div class="t2">Сумма ' + rub(stageTotal(state, s)) + " · отправлен " + dShort(a.sentDay) + '</div></div><div class="right">' + chip + btns + "</div></div>";
    }).join("");
    return '<div class="view-head"><div><h2>Акты выполненных работ</h2><p>Акт формируется из сметы этапа. Подпись в демо имитируется.</p></div></div>' +
      '<div class="act-list">' + (list || '<div class="empty">Актов пока нет</div>') + "</div>" +
      '<p class="small muted" style="margin-top:14px">Подтверждение в кабинете — простая электронная подпись. Равнозначной собственноручной она становится, если это предусмотрено соглашением сторон (63-ФЗ «Об электронной подписи», ст. 6). Формулировку для договора согласуйте с юристом.</p>';
  };

  VIEWS.payments = function () {
    var r = state.role;
    var tot = total(), pd = paid(), due = dueNow();
    var summary = '<div class="pay-summary">' +
      '<div class="kpi"><div class="k">Стоимость по смете</div><div class="v num">' + rub(tot) + "</div></div>" +
      '<div class="kpi"><div class="k">Оплачено</div><div class="v num">' + rub(pd) + '</div><div class="bar accent"><span style="width:' + (tot ? Math.round(pd / tot * 100) : 0) + '%"></span></div></div>' +
      '<div class="kpi"><div class="k">К оплате сейчас</div><div class="v num"' + (due ? ' style="color:var(--accent)"' : "") + ">" + rub(due) + "</div></div></div>";

    var rows = state.payments.map(function (p, i) {
      var s = stageById(p.stageId);
      var act = actByStage(s.id);
      var chip, action = "";
      if (p.status === "paid") chip = '<span class="chip chip-ok">Оплачено ' + dShort(p.paidDay) + "</span>";
      else if (p.status === "due") {
        chip = '<span class="chip chip-warn">К оплате до ' + dShort(p.dueDay) + "</span>";
        if (r === "client") action = '<button class="btn btn-primary btn-sm" data-action="pay" data-id="' + p.id + '">Оплатить</button>';
        if (r === "owner") action = '<button class="btn btn-ghost btn-sm" data-action="mark-paid" data-id="' + p.id + '">Отметить оплату</button>';
      } else if (p.status === "awaiting_act") chip = '<span class="chip chip-info">После подписи акта №' + (act ? act.no : "") + "</span>";
      else chip = '<span class="chip">После завершения этапа</span>';
      return "<tr><td class=\"first\" data-l=\"\">" + (i + 1) + ". " + esc(s.name) + (p.method ? '<br><span class="muted small">' + esc(p.method) + "</span>" : "") +
        '</td><td class="r num" data-l="Сумма"><b>' + rub(paymentAmount(p)) + '</b></td><td data-l="Статус">' + chip + '</td><td class="r" data-l="">' + action + "</td></tr>";
    }).join("");

    return '<div class="view-head"><div><h2>Оплаты по этапам</h2><p>Оплата этапа открывается после подписания акта. Онлайн-оплата в демо имитируется.</p></div></div>' + summary +
      '<div class="panel"><div class="table-wrap"><table class="t cards"><thead><tr><th>Этап</th><th class="r">Сумма</th><th>Статус</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  };

  VIEWS.chat = function () {
    var r = state.role;
    var log = state.chat.map(function (m) {
      if (m.from === "system") return '<div class="msg system">' + esc(m.text) + " · " + dShort(m.day) + "</div>";
      var mine = m.from === r;
      return '<div class="msg' + (mine ? " mine" : "") + '"><div class="who" style="color:' + ROLES[m.from].color + '">' + esc(who(m.from)) + "</div>" + esc(m.text) + '<div class="when">' + dShort(m.day) + ", " + esc(m.time) + "</div></div>";
    }).join("");
    return '<div class="view-head"><div><h2>Чат по объекту</h2><p>Вы пишете как: <b>' + ROLES[r].name + "</b>. Переключите роль вверху, чтобы ответить за другого участника.</p></div></div>" +
      '<div class="chat"><div class="chat-log" id="chat-log" aria-live="polite">' + log + "</div>" +
      '<form class="chat-form" data-form="chat"><label class="visually-hidden" for="chat-input">Сообщение</label><input class="input" id="chat-input" name="text" autocomplete="off" maxlength="500" placeholder="Сообщение…" required><button class="btn btn-primary" type="submit">Отправить</button></form></div>';
  };

  // ---------- Модальное окно и уведомления ----------
  var modal = document.getElementById("modal");
  function openModal(title, body, foot, wide) {
    modal.className = "modal" + (wide ? " wide" : "");
    modal.innerHTML = '<div class="modal-head"><h3 id="modal-title">' + title + '</h3><button type="button" class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button></div>' +
      '<div class="modal-body">' + body + "</div>" + (foot ? '<div class="modal-foot">' + foot + "</div>" : "");
    if (typeof modal.showModal === "function") { if (!modal.open) modal.showModal(); } else modal.setAttribute("open", "");
    var first = modal.querySelector("input, select, textarea");
    if (first) first.focus();
  }
  function closeModal() { if (modal.open) { if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open"); } }
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  function toast(text) {
    var box = document.getElementById("toasts");
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3800);
  }

  function sys(text) { state.chat.push({ id: uid("m"), from: "system", day: today(), time: nowTime(), text: text }); }

  function stageOptions(selected) {
    return state.stages.map(function (s) { return '<option value="' + s.id + '"' + (s.id === selected ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("");
  }

  function actDocHTML(a) {
    var s = stageById(a.stageId);
    var lines = s.works.concat(s.materials, stageExtras(state, s, "approved"));
    var rows = lines.map(function (l, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(l.name) + "</td><td>" + esc(l.unit) + '</td><td class="r">' + nf.format(l.qty) + '</td><td class="r">' + rub(l.price) + '</td><td class="r">' + rub(l.qty * l.price) + "</td></tr>";
    }).join("");
    var signed = a.status === "signed";
    return '<div class="act-doc print-area">' +
      "<h3>АКТ № " + a.no + "<br>сдачи-приёмки выполненных работ</h3>" +
      '<div class="meta"><span>к договору подряда № Д-ДЕМО от ' + dFull(0) + "</span><span>" + dFull(a.sentDay) + "</span></div>" +
      "<p>Исполнитель: «Ваша ремонтная компания» (демо).<br>Заказчик: Анна (демо).<br>Объект: квартира 64 м², г. Краснодар, ул. Примерная, д. 1 (вымышленный адрес).</p>" +
      "<p>Исполнитель выполнил, а Заказчик принял работы по этапу <b>«" + esc(s.name) + "»</b>:</p>" +
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Наименование</th><th>Ед.</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>' + rows +
      '<tr><td colspan="5"><b>Итого</b></td><td class="r"><b>' + rub(stageTotal(state, s)) + "</b></td></tr></tbody></table></div>" +
      "<p>Работы выполнены в полном объёме. Заказчик претензий по объёму и качеству работ не имеет.</p>" +
      '<div class="signs"><div><div class="sig">Исполнитель: прораб Алексей (демо)</div></div><div><div class="sig">Заказчик: Анна (демо)</div>' +
      (signed ? '<span class="stamp">Подписано в кабинете ' + dFull(a.signedDay) + (a.signedTime ? ", " + esc(a.signedTime) : "") + " · простая ЭП (демо)</span>" : '<span class="muted small">ожидает подписи</span>') + "</div></div>" +
      '<p class="small" style="margin-top:16px;color:#666">Образец документа на тестовых данных. Форму акта утвердить владельцем и юристом.</p></div>';
  }

  // ---------- Действия ----------
  var ACTIONS = {
    tab: function (el) {
      state.tab = el.getAttribute("data-tab");
      save(); render();
      try { history.replaceState(null, "", "#" + state.tab); } catch (e) { /* ignore */ }
      view.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    },
    role: function (el) {
      state.role = el.getAttribute("data-role");
      save(); render();
      toast("Вы смотрите кабинет как: " + ROLES[state.role].name);
    },
    locked: function () { toast("В демо доступен один объект. В рабочей версии здесь все ваши объекты."); },
    reset: function () {
      if (!confirm("Сбросить демо к исходным тестовым данным?")) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      memoryOnly = false;
      state = seed();
      save(); render(); toast("Демо сброшено");
    },
    "toggle-stage": function (el) {
      var id = el.getAttribute("data-id");
      state.openStage = state.openStage === id ? null : id;
      save(); render();
    },
    "approve-extra": function (el) {
      var x = state.extras.filter(function (e) { return e.id === el.getAttribute("data-id"); })[0];
      if (!x) return;
      x.status = "approved";
      sys("Заказчик согласовал допработу «" + x.name + "» на " + rub(x.qty * x.price) + ".");
      save(); render(); toast("Допработа согласована и добавлена в смету");
    },
    "decline-extra": function (el) {
      var x = state.extras.filter(function (e) { return e.id === el.getAttribute("data-id"); })[0];
      if (!x) return;
      x.status = "declined";
      sys("Заказчик отклонил допработу «" + x.name + "».");
      save(); render(); toast("Допработа отклонена");
    },
    "add-extra": function () {
      var cur = currentStage();
      openModal("Новая допработа",
        '<form id="f-extra" data-form="extra" class="stack">' +
        '<div class="field"><label for="x-stage">Этап</label><select class="select" id="x-stage" name="stage">' + stageOptions(cur ? cur.id : "s4") + "</select></div>" +
        '<div class="field"><label for="x-name">Что сделать</label><input class="input" id="x-name" name="name" required maxlength="120" placeholder="Например: перенос выключателя"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div class="field"><label for="x-qty">Кол-во</label><input class="input" id="x-qty" name="qty" type="number" min="0.1" step="0.1" value="1" required></div>' +
        '<div class="field"><label for="x-unit">Ед.</label><input class="input" id="x-unit" name="unit" value="шт" maxlength="10" required></div>' +
        '<div class="field"><label for="x-price">Цена, ₽</label><input class="input" id="x-price" name="price" type="number" min="1" step="1" value="1500" required></div></div>' +
        '<p class="hint" style="margin:0">Допработа уйдёт заказчику на согласование и попадёт в смету только после его подтверждения.</p></form>',
        '<button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" type="submit" form="f-extra">Отправить на согласование</button>');
    },
    "save-progress": function (el) {
      var s = stageById(el.getAttribute("data-id"));
      var v = +document.getElementById("prog").value;
      s.progress = Math.max(0, Math.min(100, v));
      sys("Прогресс этапа «" + s.name + "»: " + s.progress + "%.");
      save(); render(); toast("Прогресс сохранён");
    },
    "complete-stage": function (el) {
      var s = stageById(el.getAttribute("data-id"));
      var t = today();
      s.status = "done"; s.progress = 100; s.doneDay = t;
      var no = state.acts.reduce(function (a, x) { return Math.max(a, x.no); }, 0) + 1;
      state.acts.push({ id: uid("a"), no: no, stageId: s.id, status: "sent", sentDay: t });
      var p = payByStage(s.id); if (p && p.status === "planned") p.status = "awaiting_act";
      // Пересобираем стоимость: отклонённые и несогласованные допработы этапа не входят
      var idx = stageIndex(s.id);
      var next = state.stages[idx + 1];
      if (next && next.status === "planned") {
        next.status = "progress";
        if (next.start < t) { var dur = next.end - next.start; next.start = t; next.end = t + dur; }
      }
      sys("Этап «" + s.name + "» завершён. Акт №" + no + " отправлен заказчику на подпись.");
      save(); render(); toast("Этап завершён, акт №" + no + " отправлен заказчику");
    },
    remind: function (el) {
      var a = state.acts.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!a) return;
      sys("Заказчику отправлено напоминание: подписать акт №" + a.no + ".");
      save(); render(); toast("Напоминание отправлено заказчику (в демо — сообщение в чате)");
    },
    "open-act": function (el) {
      var a = state.acts.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!a) return;
      var foot = '<button class="btn btn-ghost" data-action="print">Распечатать / PDF</button>' +
        (a.status === "sent" && state.role === "client" ? '<button class="btn btn-primary" data-action="sign" data-id="' + a.id + '">Подписать</button>' : "");
      openModal("Акт №" + a.no, actDocHTML(a), foot, true);
    },
    print: function () { window.print(); },
    sign: function (el) {
      var a = state.acts.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!a) return;
      if (state.role !== "client") { toast("Подписать акт может только заказчик. Переключитесь на роль «Заказчик»."); return; }
      var s = stageById(a.stageId);
      openModal("Подписание акта №" + a.no,
        '<form id="f-sign" data-form="sign" data-id="' + a.id + '" class="stack">' +
        "<p style=\"margin:0\">Этап «" + esc(s.name) + "» на сумму <b>" + rub(stageTotal(state, s)) + "</b>.</p>" +
        '<p class="hint" style="margin:0">Мы отправили код в SMS. <b>В демо код: 1234.</b></p>' +
        '<div class="field"><label for="sign-code">Код из SMS</label><input class="input" id="sign-code" name="code" inputmode="numeric" maxlength="4" autocomplete="one-time-code" required><div class="error-text" id="sign-err"></div></div>' +
        '<label class="check"><input type="checkbox" name="agree" required> <span>Работы приняты, претензий по объёму и качеству нет</span></label></form>',
        '<button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" type="submit" form="f-sign">Подписать</button>');
    },
    pay: function (el) {
      var p = state.payments.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!p) return;
      var s = stageById(p.stageId);
      openModal("Оплата этапа",
        '<form id="f-pay" data-form="pay" data-id="' + p.id + '" class="stack">' +
        "<p style=\"margin:0\">Этап «" + esc(s.name) + "»: <b>" + rub(paymentAmount(p)) + "</b></p>" +
        '<div class="field"><span class="label">Способ оплаты</span>' +
        '<label class="check"><input type="radio" name="method" value="СБП" checked> <span>СБП по QR-коду</span></label>' +
        '<label class="check"><input type="radio" name="method" value="Банковская карта"> <span>Банковская карта</span></label>' +
        '<label class="check"><input type="radio" name="method" value="Перевод по счёту"> <span>Перевод по счёту</span></label></div>' +
        '<p class="hint" style="margin:0">Это демо: деньги не списываются. Способы оплаты в рабочей версии — черновик, утвердить владельцем.</p></form>',
        '<button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" type="submit" form="f-pay">Оплатить (демо)</button>');
    },
    "mark-paid": function (el) {
      var p = state.payments.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!p) return;
      p.amountPaid = paymentAmount(p); p.status = "paid"; p.paidDay = today(); p.method = "Отмечено владельцем";
      sys("Владелец отметил поступление оплаты за этап «" + stageById(p.stageId).name + "»: " + rub(p.amountPaid) + ".");
      save(); render(); toast("Оплата отмечена");
    },
    "photo-filter": function (el) { state.photoFilter = el.getAttribute("data-id"); save(); render(); },
    photo: function (el) {
      var p = state.photos.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0];
      if (!p) return;
      var s = stageById(p.stageId);
      openModal(esc(p.caption), '<div class="lightbox-img">' + photoHTML(p) + '</div><p class="small muted" style="margin:0">' + esc(s ? s.name : "") + " · " + dFull(p.day) + " · " + esc(who(p.by)) + (p.src ? "" : " · условная иллюстрация (демо)") + "</p>", "", true);
    },
    "add-photo": function () {
      var cur = currentStage();
      openModal("Добавить фото",
        '<form id="f-photo" data-form="photo" class="stack">' +
        '<div class="field"><label for="ph-file">Фото</label><input class="input" id="ph-file" name="file" type="file" accept="image/*" capture="environment" required></div>' +
        '<div class="field"><label for="ph-stage">Этап</label><select class="select" id="ph-stage" name="stage">' + stageOptions(cur ? cur.id : "s4") + "</select></div>" +
        '<div class="field"><label for="ph-cap">Подпись</label><input class="input" id="ph-cap" name="caption" maxlength="100" placeholder="Что на фото"></div>' +
        '<p class="hint" style="margin:0">Фото остаётся только в вашем браузере и никуда не отправляется.</p></form>',
        '<button class="btn btn-ghost" data-action="close-modal">Отмена</button><button class="btn btn-primary" type="submit" form="f-photo">Добавить</button>');
    },
    "close-modal": function () { closeModal(); }
  };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var fn = ACTIONS[el.getAttribute("data-action")];
    if (!fn) return;
    // Ссылки и кнопки отправки форм работают штатно (кнопки без type не считаем отправкой)
    if (el.tagName === "A" || el.getAttribute("type") === "submit") return;
    e.preventDefault();
    fn(el);
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "prog") document.getElementById("prog-val").textContent = e.target.value + "%";
  });

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = reject;
      fr.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var k = Math.min(1, 1000 / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  document.addEventListener("submit", function (e) {
    var f = e.target;
    var kind = f.getAttribute("data-form");
    if (!kind) return;
    e.preventDefault();
    var t = today();

    if (kind === "chat") {
      var text = f.elements.namedItem("text").value.trim();
      if (!text) return;
      state.chat.push({ id: uid("m"), from: state.role, day: t, time: nowTime(), text: text });
      save(); render();
      var inp = document.getElementById("chat-input"); if (inp) inp.focus();
      return;
    }

    if (kind === "extra") {
      var x = {
        id: uid("x"),
        stageId: f.elements.namedItem("stage").value,
        name: f.elements.namedItem("name").value.trim(),
        qty: Math.max(0.1, +f.elements.namedItem("qty").value || 1),
        unit: f.elements.namedItem("unit").value.trim() || "шт",
        price: Math.max(1, Math.round(+f.elements.namedItem("price").value || 0)),
        status: "pending", day: t, by: state.role
      };
      if (!x.name) return;
      state.extras.push(x);
      sys(ROLES[state.role].name + " добавил(а) допработу «" + x.name + "» на " + rub(x.qty * x.price) + " — ждёт согласования заказчика.");
      state.openStage = x.stageId;
      closeModal(); save(); render(); toast("Допработа отправлена заказчику на согласование");
      return;
    }

    if (kind === "sign") {
      var code = f.elements.namedItem("code").value.trim();
      if (code !== "1234") { document.getElementById("sign-err").textContent = "Неверный код. В демо код: 1234"; return; }
      var a = state.acts.filter(function (x) { return x.id === f.getAttribute("data-id"); })[0];
      a.status = "signed"; a.signedDay = t; a.signedTime = nowTime();
      var p = payByStage(a.stageId);
      if (p && p.status !== "paid") { p.status = "due"; p.dueDay = t + 3; }
      sys("Заказчик подписал акт №" + a.no + ". Открыта оплата этапа «" + stageById(a.stageId).name + "».");
      closeModal(); save(); render(); toast("Акт №" + a.no + " подписан. Оплата этапа открыта.");
      return;
    }

    if (kind === "pay") {
      var pay = state.payments.filter(function (x) { return x.id === f.getAttribute("data-id"); })[0];
      var method = (f.querySelector('input[name="method"]:checked') || {}).value || "СБП";
      pay.amountPaid = paymentAmount(pay); pay.status = "paid"; pay.paidDay = t; pay.method = method;
      sys("Заказчик оплатил этап «" + stageById(pay.stageId).name + "»: " + rub(pay.amountPaid) + " (" + method + ", демо).");
      closeModal(); save(); render(); toast("Оплата прошла (демо)");
      return;
    }

    if (kind === "photo") {
      var file = f.elements.namedItem("file").files[0];
      if (!file) return;
      var btn = modal.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Загружаем…"; }
      resizeImage(file).then(function (src) {
        var ph = { id: uid("p"), stageId: f.elements.namedItem("stage").value, day: t, src: src, caption: f.elements.namedItem("caption").value.trim() || "Фото с объекта", by: state.role };
        state.photos.push(ph);
        sys(ROLES[state.role].name + " добавил(а) фото: «" + ph.caption + "».");
        state.photoFilter = "all";
        closeModal(); save(); render(); toast("Фото добавлено");
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Добавить"; }
        toast("Не удалось прочитать файл. Попробуйте другое фото (JPG или PNG).");
      });
    }
  });

  // ---------- Старт ----------
  state = load();
  var hash = (location.hash || "").replace("#", "");
  if (TABS.some(function (t) { return t.id === hash; })) state.tab = hash;
  var qRole = new URLSearchParams(location.search).get("role");
  if (ROLES[qRole]) state.role = qRole;
  render();

  // Переход по ссылке вида demo/#acts без перезагрузки страницы
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").replace("#", "");
    if (h !== state.tab && TABS.some(function (t) { return t.id === h; })) {
      state.tab = h; save(); render();
    }
  });
})();
