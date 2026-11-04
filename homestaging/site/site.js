/*
 * Лендинг: данные из shared/config.js и site/portfolio/portfolio.js.
 * Без зависимостей. Используется также на site/privacy.html (блоки, которых нет на странице, пропускаются).
 */
(function () {
  "use strict";

  var C = window.HS_CONFIG || {};
  var PORTFOLIO = Array.isArray(window.HS_PORTFOLIO) ? window.HS_PORTFOLIO : [];
  var doc = document;

  /* ---------- утилиты ---------- */
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function str(v) { return v === null || v === undefined ? "" : String(v).trim(); }
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o && o[k] !== undefined ? o[k] : undefined; }, obj);
  }
  function isNum(x) { return typeof x === "number" && isFinite(x); }

  function el(tag, attrs, children) {
    var node = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (ch) {
      if (ch === null || ch === undefined) return;
      node.appendChild(typeof ch === "string" ? doc.createTextNode(ch) : ch);
    });
    return node;
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  function icon(id, extraClass) {
    var svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon" + (extraClass ? " " + extraClass : ""));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var use = doc.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n).replace(/ /g, " ") + " ₽";
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* ---------- контакты ---------- */
  function digits(s) { return str(s).replace(/\D/g, ""); }

  function normPhone(s) {
    var d = digits(s);
    if (d.length === 11 && d.charAt(0) === "8") d = "7" + d.slice(1);
    if (d.length === 10 && d.charAt(0) === "9") d = "7" + d;
    return d;
  }

  function displayPhone(d) {
    if (d.length === 11 && d.charAt(0) === "7") {
      return "+7 (" + d.slice(1, 4) + ") " + d.slice(4, 7) + "-" + d.slice(7, 9) + "-" + d.slice(9, 11);
    }
    return "+" + d;
  }

  function telegramUser(v) {
    v = str(v);
    if (!v) return "";
    var m = v.match(/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{3,})/i);
    if (m) return m[1];
    v = v.replace(/^@/, "");
    return /^[A-Za-z0-9_]{3,}$/.test(v) ? v : "";
  }

  /** Настроенные каналы связи (пустые не попадают в список). */
  function channels() {
    var c = C.contacts || {};
    var list = [];
    var phone = normPhone(c.phone);
    if (phone.length >= 11) {
      list.push({ type: "phone", label: displayPhone(phone), href: "tel:+" + phone, icon: "i-phone" });
    }
    var wa = normPhone(c.whatsapp);
    if (wa.length >= 11) {
      list.push({ type: "whatsapp", label: "WhatsApp", href: "https://wa.me/" + wa, icon: "i-whatsapp", id: wa });
    }
    var tg = telegramUser(c.telegram);
    if (tg) {
      list.push({ type: "telegram", label: "Telegram @" + tg, href: "https://t.me/" + tg, icon: "i-telegram", id: tg });
    }
    var em = str(c.email);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      list.push({ type: "email", label: em, href: "mailto:" + em, icon: "i-mail", id: em });
    }
    return list;
  }

  var CHANNELS = channels();
  var ENDPOINT = str(C.formEndpoint);
  var BRAND = str(get(C, "brand.name")) || "Хоумстейджинг";

  /* ---------- тексты из конфига ---------- */
  function fillTexts() {
    $all("[data-hs-text]").forEach(function (node) {
      var v = str(get(C, node.getAttribute("data-hs-text")));
      if (v) node.textContent = v;
    });
    // Поля-заглушки (политика): если значение задано — подставляем и снимаем подсветку
    $all("[data-hs-fill]").forEach(function (node) {
      var v = str(get(C, node.getAttribute("data-hs-fill")));
      if (v) {
        node.textContent = v;
        node.classList.remove("placeholder");
      }
    });
    var year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    var tpl = $("#privacy-template-notice");
    if (tpl) tpl.hidden = $all(".placeholder[data-hs-fill]").length === 0;
  }

  function renderContacts() {
    var targets = [$("#contact-list"), $("#footer-contacts")];
    targets.forEach(function (ul) {
      if (!ul) return;
      ul.textContent = "";
      CHANNELS.forEach(function (ch) {
        var external = ch.type === "whatsapp" || ch.type === "telegram";
        var a = el("a", {
          href: ch.href,
          target: external ? "_blank" : null,
          rel: external ? "noopener" : null
        }, [icon(ch.icon), el("span", { text: ch.label })]);
        ul.appendChild(el("li", null, [a]));
      });
      ul.hidden = CHANNELS.length === 0;
    });

    var hours = $("#footer-hours");
    if (hours && str(C.workingHours)) {
      hours.textContent = str(C.workingHours);
      hours.hidden = false;
    }

    var legalBox = $("#footer-legal");
    if (legalBox) {
      var L = C.legal || {};
      var rows = [];
      if (str(L.name)) rows.push(str(L.name));
      var ids = [];
      if (str(L.inn)) ids.push("ИНН " + str(L.inn));
      if (str(L.ogrnip)) ids.push((/^ИП/i.test(str(L.name)) || str(L.ogrnip).length === 15 ? "ОГРНИП " : "ОГРН ") + str(L.ogrnip));
      if (ids.length) rows.push(ids.join(", "));
      if (str(L.address)) rows.push(str(L.address));
      legalBox.textContent = "";
      rows.forEach(function (r) { legalBox.appendChild(el("p", { text: r })); });
      legalBox.hidden = rows.length === 0;
    }

    var info = $("#footer-info");
    if (info) info.hidden = CHANNELS.length === 0 && (!legalBox || legalBox.hidden);

    var notice = $("#config-notice");
    if (notice) notice.hidden = CHANNELS.length > 0 || !!ENDPOINT;
  }

  /* ---------- навигация ---------- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    doc.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !e.target.closest(".site-header")) setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 960) setOpen(false);
    });
  }

  /* ---------- пакеты ---------- */
  function packages() { return Array.isArray(C.packages) ? C.packages : []; }

  function renderPackages() {
    var box = $("#packages-list");
    if (!box) return;
    box.textContent = "";
    packages().forEach(function (p) {
      var price;
      if (isNum(p.priceFrom)) {
        price = el("p", { class: "package__price" }, [
          "от " + fmtMoney(p.priceFrom) + " ",
          el("small", { text: str(p.priceUnit) || "за объект" })
        ]);
      } else {
        price = el("p", { class: "package__price package__price--tbd", text: "Цена уточняется" });
      }
      var priceNote = str(p.priceNote) ? el("p", { class: "package__pricenote", text: p.priceNote }) : null;
      var meta = null;
      if (isNum(p.durationDays) && p.durationDays > 0) {
        meta = el("p", { class: "package__meta" }, [
          icon("i-calendar", "icon-sm"),
          "Ориентировочный срок работ: " + p.durationDays + " " + plural(p.durationDays, "день", "дня", "дней")
        ]);
      }
      var btn = el("button", {
        class: "btn btn-primary",
        type: "button",
        "data-package": p.id,
        "aria-label": "Выбрать пакет «" + p.name + "» и перейти к заявке"
      }, ["Выбрать"]);

      var card = el("article", { class: "package card", id: "pkg-" + p.id }, [
        el("h3", { class: "package__name", text: p.name }),
        str(p.forWhom) ? el("p", { class: "package__for", text: p.forWhom }) : null,
        el("ul", { class: "package__list" }, (p.includes || []).map(function (item) {
          return el("li", null, [icon("i-check", "icon-sm"), el("span", { text: item })]);
        })),
        str(p.notes) ? el("p", { class: "package__notes", text: p.notes }) : null,
        el("div", { class: "package__bottom" }, [price, priceNote, meta, btn])
      ]);
      box.appendChild(card);
    });

    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-package]");
      if (!b) return;
      selectPackage(b.getAttribute("data-package"), true);
    });
  }

  function selectPackage(id, scroll) {
    var sel = $("#f-package");
    if (!sel) return;
    if ($all("option", sel).some(function (o) { return o.value === id; })) sel.value = id;
    if (scroll) goToForm();
  }

  function goToForm() {
    var section = $("#zayavka");
    var name = $("#f-name");
    var form = $("#lead-form");
    if (form && form.hidden) showForm();
    if (section) section.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, 350);
    if (history.replaceState) history.replaceState(null, "", "#zayavka");
  }

  /* ---------- портфолио ---------- */
  function renderPortfolio() {
    var list = $("#portfolio-list");
    var empty = $("#portfolio-empty");
    if (!list) return;
    // Показываем только записи с согласием владельца и обеими фотографиями
    var items = PORTFOLIO.filter(function (p) {
      return p && p.consent === true && str(p.before) && str(p.after);
    });
    list.textContent = "";
    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    var pkgNames = {};
    packages().forEach(function (p) { pkgNames[p.id] = p.name; });

    items.forEach(function (p, i) {
      var alt = p.alt || {};
      var title = str(p.title) || "Проект " + (i + 1);
      var range = el("input", {
        class: "ba__range",
        type: "range",
        min: "0",
        max: "100",
        value: "50",
        step: "1",
        "aria-label": "Сравнение «до» и «после»: " + title
      });
      var ba = el("div", { class: "ba" }, [
        el("img", { class: "ba__before", src: p.before, alt: str(alt.before) || "До подготовки: " + title, loading: "lazy", decoding: "async" }),
        el("img", { class: "ba__after", src: p.after, alt: str(alt.after) || "После подготовки: " + title, loading: "lazy", decoding: "async" }),
        el("span", { class: "ba__divider", "aria-hidden": "true" }, [el("span", { class: "ba__handle" }, [icon("i-handle")])]),
        el("span", { class: "ba__label ba__label--before", "aria-hidden": "true", text: "До" }),
        el("span", { class: "ba__label ba__label--after", "aria-hidden": "true", text: "После" }),
        range
      ]);
      initBeforeAfter(ba, range);

      var meta = [];
      if (str(p.district)) meta.push(str(p.district));
      if (isNum(p.area)) meta.push(p.area + " м²");
      if (p.package && pkgNames[p.package]) meta.push("пакет «" + pkgNames[p.package] + "»");
      if (str(p.date)) meta.push(str(p.date));

      list.appendChild(el("article", { class: "project" }, [
        ba,
        el("h3", { text: title }),
        meta.length ? el("p", { class: "project__meta", text: meta.join(" · ") }) : null,
        str(p.description) ? el("p", { text: p.description }) : null
      ]));
    });
  }

  function initBeforeAfter(box, range) {
    function set(v) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      range.value = String(v);
      box.style.setProperty("--pos", v + "%");
      range.setAttribute("aria-valuetext", "Слева «до»: " + v + " процентов, справа «после»: " + (100 - v) + " процентов");
    }
    range.addEventListener("input", function () { set(+range.value); });
    // Перетаскивание мышью/пальцем по всей картинке (клавиатура — через range)
    var dragging = false;
    function fromEvent(e) {
      var r = box.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }
    box.addEventListener("pointerdown", function (e) {
      dragging = true;
      if (box.setPointerCapture) box.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    box.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) {
      box.addEventListener(t, function () { dragging = false; });
    });
    set(50);
  }

  /* ---------- форма заявки ---------- */
  var form, fields, lastMessage = "";

  function showForm() {
    form.hidden = false;
    $("#form-success").hidden = true;
    $("#form-fallback").hidden = true;
  }

  function setError(input, errId, msg) {
    var err = $("#" + errId);
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (err) err.textContent = msg;
    } else {
      input.removeAttribute("aria-invalid");
      if (err) err.textContent = "";
    }
    return !msg;
  }

  /**
   * Национальная часть российского номера (до 10 цифр):
   *  «+7 918…» → 918…;  «8 918…» / «7 918…» → 918…;  «918…» → 918…
   */
  function nationalDigits(value) {
    var raw = String(value || "").trim();
    var d = raw.replace(/\D/g, "");
    var national;
    if (raw.charAt(0) === "+") national = d.slice(1);
    else if (d.charAt(0) === "8" || d.charAt(0) === "7") national = d.slice(1);
    else national = d;
    return national.slice(0, 10);
  }

  function formatPhoneInput(value) {
    if (!/\d/.test(value)) return value.trim() === "+" ? "+" : "";
    var n = nationalDigits(value);
    var out = "+7";
    if (n.length > 0) out += " (" + n.slice(0, 3);
    else out += " ";
    if (n.length >= 3) out += ")";
    if (n.length > 3) out += " " + n.slice(3, 6);
    if (n.length > 6) out += "-" + n.slice(6, 8);
    if (n.length > 8) out += "-" + n.slice(8, 10);
    return out;
  }

  function phoneDigits(value) {
    return "7" + nationalDigits(value);
  }

  function validatePhone() {
    var v = fields.phone.value.trim();
    if (!v) return setError(fields.phone, "f-phone-err", "Укажите телефон");
    var d = phoneDigits(v);
    if (d.length !== 11 || d.charAt(0) !== "7") {
      return setError(fields.phone, "f-phone-err", "Проверьте номер: формат +7 (900) 000-00-00");
    }
    return setError(fields.phone, "f-phone-err", null);
  }
  function validateName() {
    return setError(fields.name, "f-name-err", fields.name.value.trim() ? null : "Укажите имя");
  }
  function parseArea() {
    var v = fields.area.value.replace(/\s/g, "").replace(",", ".");
    if (!v) return null;
    return /^\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN;
  }
  function validateArea() {
    var a = parseArea();
    var bad = a !== null && (!isFinite(a) || a < 1 || a > 1000);
    return setError(fields.area, "f-area-err", bad ? "Укажите площадь числом от 1 до 1000" : null);
  }
  function validateConsent() {
    return setError(fields.consent, "f-consent-err", fields.consent.checked ? null : "Нужно согласие на обработку персональных данных");
  }

  function collect() {
    var typeInput = $("input[name='type']:checked", form);
    var type = typeInput ? typeInput.value : "sale";
    var pkgId = fields.pkg.value;
    var pkg = packages().filter(function (p) { return p.id === pkgId; })[0];
    var area = parseArea();
    return {
      name: fields.name.value.trim(),
      phone: displayPhone(phoneDigits(fields.phone.value)),
      type: type,
      typeLabel: type === "rent" ? "сдача в аренду" : "продажа",
      address: fields.address.value.trim(),
      area: isNum(area) ? area : null,
      packageId: pkg ? pkg.id : "",
      packageName: pkg ? pkg.name : "",
      comment: fields.comment.value.trim(),
      consent: true,
      page: location.href.split("#")[0],
      createdAt: new Date().toISOString()
    };
  }

  function buildMessage(d) {
    var lines = [
      "Заявка с сайта «" + BRAND + "»",
      "Имя: " + d.name,
      "Телефон: " + d.phone,
      "Задача: " + d.typeLabel
    ];
    if (d.address) lines.push("Район/адрес: " + d.address);
    if (d.area !== null) lines.push("Площадь: " + String(d.area).replace(".", ",") + " м²");
    lines.push("Пакет: " + (d.packageName || "пока не выбран"));
    if (d.comment) lines.push("Комментарий: " + d.comment);
    return lines.join("\n");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = $("#fallback-message");
    var tmp = null;
    if (!ta || ta.value !== text) {
      tmp = el("textarea", { readonly: true, style: "position:fixed;left:-9999px;top:0" });
      tmp.value = text;
      doc.body.appendChild(tmp);
      ta = tmp;
    }
    ta.focus();
    ta.select();
    var ok = false;
    try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
    if (tmp) tmp.remove();
    return ok;
  }

  function setCopyStatus(ok) {
    var s = $("#copy-status");
    if (!s) return;
    s.textContent = ok ? "Текст заявки скопирован." : "Не удалось скопировать автоматически — выделите текст и скопируйте вручную.";
    s.style.color = ok ? "var(--pos)" : "var(--warn)";
  }

  function showFallback(message, reason) {
    lastMessage = message;
    var box = $("#form-fallback");
    var channelsBox = $("#send-channels");
    var title = $("#fallback-title");
    var text = $("#fallback-text");
    var cfgNotice = $("#fallback-config-notice");
    var subject = "Заявка с сайта «" + BRAND + "»";
    var enc = encodeURIComponent;

    channelsBox.textContent = "";
    var sendable = CHANNELS.filter(function (c) { return c.type !== "phone"; });
    CHANNELS.forEach(function (ch) {
      var href, label, note = null, external = true;
      if (ch.type === "whatsapp") {
        href = "https://wa.me/" + ch.id + "?text=" + enc(message);
        label = "Отправить в WhatsApp";
      } else if (ch.type === "telegram") {
        href = ch.href;
        label = "Открыть Telegram";
        note = "текст скопируется — вставьте его в чат";
      } else if (ch.type === "email") {
        href = "mailto:" + ch.id + "?subject=" + enc(subject) + "&body=" + enc(message);
        label = "Отправить на почту";
        external = false;
      } else if (ch.type === "phone") {
        href = ch.href;
        label = "Позвонить";
        external = false;
      }
      var a = el("a", {
        class: "btn",
        href: href,
        target: external ? "_blank" : null,
        rel: external ? "noopener" : null,
        "data-channel": ch.type
      }, [icon(ch.icon), el("span", null, [label, note ? el("span", { class: "visually-hidden", text: " (" + note + ")" }) : null])]);
      if (ch.type === "phone") a.title = ch.label;
      if (ch.type === "telegram") {
        a.addEventListener("click", function () { copyText(message).then(setCopyStatus); });
        a.title = "Текст заявки скопируется в буфер обмена";
      }
      channelsBox.appendChild(a);
    });
    if (sendable.length) {
      var first = channelsBox.querySelector("[data-channel='" + sendable[0].type + "']");
      if (first) first.classList.add("btn-primary");
    }

    if (reason === "endpoint-failed") {
      title.textContent = "Не удалось отправить заявку автоматически";
      text.textContent = CHANNELS.length
        ? "Отправьте её удобным способом — текст уже подготовлен."
        : "Скопируйте текст заявки и отправьте его нам любым удобным способом.";
    } else {
      title.textContent = "Почти готово: отправьте заявку удобным способом";
      text.textContent = sendable.length
        ? "Нажмите на мессенджер или почту — текст заявки подставится автоматически."
        : "Скопируйте текст заявки ниже.";
    }
    cfgNotice.hidden = CHANNELS.length > 0 || !!ENDPOINT;

    var ta = $("#fallback-message");
    ta.value = message;
    ta.rows = Math.min(16, message.split("\n").length + 3);
    $("#copy-status").textContent = "";
    form.hidden = true;
    $("#form-success").hidden = true;
    box.hidden = false;
    box.focus({ preventScroll: true });
    box.closest(".card").scrollIntoView({ block: "start" });
  }

  function showSuccess() {
    form.hidden = true;
    $("#form-fallback").hidden = true;
    var s = $("#form-success");
    s.hidden = false;
    s.focus({ preventScroll: true });
    s.closest(".card").scrollIntoView({ block: "start" });
  }

  function initForm() {
    form = $("#lead-form");
    if (!form) return;
    fields = {
      name: $("#f-name"),
      phone: $("#f-phone"),
      address: $("#f-address"),
      area: $("#f-area"),
      pkg: $("#f-package"),
      comment: $("#f-comment"),
      consent: $("#f-consent"),
      submit: $("#f-submit")
    };

    packages().forEach(function (p) {
      fields.pkg.appendChild(el("option", { value: p.id, text: p.name }));
    });

    // Маска телефона: форматируем при вводе (кроме удаления) и при уходе с поля
    fields.phone.addEventListener("input", function (e) {
      if (e.inputType && e.inputType.indexOf("delete") === 0) return;
      var input = fields.phone;
      var caret = input.selectionStart;
      var atEnd = caret === input.value.length;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length;
      var formatted = formatPhoneInput(input.value);
      if (formatted !== input.value) {
        input.value = formatted;
        var pos = formatted.length;
        if (!atEnd) {
          // ставим курсор после того же количества цифр, что и до форматирования
          for (var i = 0, seen = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted.charAt(i))) seen++;
            if (seen >= digitsBefore) { pos = i + 1; break; }
          }
        }
        input.setSelectionRange(pos, pos);
      }
      if (input.getAttribute("aria-invalid") === "true") validatePhone();
    });
    fields.phone.addEventListener("blur", function () {
      var v = fields.phone.value.trim();
      if (!/\d/.test(v.replace(/^\+7/, ""))) { fields.phone.value = ""; return; }
      fields.phone.value = formatPhoneInput(v);
      if (v) validatePhone();
    });
    fields.name.addEventListener("blur", function () { if (fields.name.getAttribute("aria-invalid")) validateName(); });
    fields.area.addEventListener("blur", validateArea);
    fields.consent.addEventListener("change", function () { if (fields.consent.getAttribute("aria-invalid")) validateConsent(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var checks = [
        [validateName(), fields.name],
        [validatePhone(), fields.phone],
        [validateArea(), fields.area],
        [validateConsent(), fields.consent]
      ];
      var firstBad = checks.filter(function (c) { return !c[0]; })[0];
      if (firstBad) { firstBad[1].focus(); return; }

      var data = collect();
      var message = buildMessage(data);
      trackGoal("lead_submit");

      if (ENDPOINT) {
        fields.submit.disabled = true;
        var oldText = fields.submit.textContent;
        fields.submit.textContent = "Отправляем…";
        var payload = Object.assign({}, data, { message: message, source: BRAND });
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          showSuccess();
        }).catch(function () {
          showFallback(message, "endpoint-failed");
        }).then(function () {
          fields.submit.disabled = false;
          fields.submit.textContent = oldText;
        });
      } else {
        showFallback(message, "no-endpoint");
      }
    });

    $("#copy-message").addEventListener("click", function () {
      copyText(lastMessage || $("#fallback-message").value).then(setCopyStatus);
    });
    $all("[data-form-edit]").forEach(function (b) {
      b.addEventListener("click", function () { showForm(); fields.name.focus(); });
    });
    $all("[data-form-reset]").forEach(function (b) {
      b.addEventListener("click", function () { form.reset(); showForm(); fields.name.focus(); });
    });

    // Кнопки «Обсудить партнёрство» и т. п. — подставляют комментарий
    $all("[data-prefill-comment]").forEach(function (a) {
      a.addEventListener("click", function () {
        var text = a.getAttribute("data-prefill-comment");
        if (!fields.comment.value.trim()) fields.comment.value = text;
        else if (fields.comment.value.indexOf(text) === -1) fields.comment.value = text + "\n" + fields.comment.value;
      });
    });

    prefillFromQuery();
  }

  /** ?package=standard&area=54&type=sale&estimate=150000 — из калькулятора */
  function prefillFromQuery() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var pkg = q.get("package");
    if (pkg) selectPackage(pkg, false);
    var area = q.get("area");
    if (area && /^\d+([.,]\d+)?$/.test(area)) fields.area.value = area.replace(".", ",");
    var type = q.get("type");
    if (type === "rent" || type === "sale") {
      var r = $("input[name='type'][value='" + type + "']", form);
      if (r) r.checked = true;
    }
    var est = parseFloat(q.get("estimate"));
    if (isFinite(est) && est > 0 && !fields.comment.value) {
      fields.comment.value = "Посчитал(а) предварительную смету в калькуляторе: около " + fmtMoney(est) + ". Хочу обсудить.";
    }
  }

  /* ---------- Яндекс Метрика (только если указан номер счётчика) ---------- */
  var METRIKA_ID = str(get(C, "analytics.yandexMetrikaId"));
  function loadMetrika() {
    if (!/^\d+$/.test(METRIKA_ID)) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, doc, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(+METRIKA_ID, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    var note = $("#metrika-note");
    if (note) note.hidden = false;
  }
  function trackGoal(goal) {
    if (/^\d+$/.test(METRIKA_ID) && typeof window.ym === "function") window.ym(+METRIKA_ID, "reachGoal", goal);
  }

  /* ---------- старт ---------- */
  fillTexts();
  renderContacts();
  initNav();
  renderPackages();
  renderPortfolio();
  initForm();
  loadMetrika();
})();
