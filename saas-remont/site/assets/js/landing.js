(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};

  // Плашки «черновик»
  if (cfg.draft === false) document.body.classList.add("no-draft");

  // Реквизиты в подвале
  document.querySelectorAll('[data-config="owner"]').forEach(function (el) {
    if (cfg.owner) el.textContent = cfg.owner;
  });

  // Мобильное меню
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Открыть меню");
      });
    });
  }

  // Кнопки тарифов подставляют тариф в форму
  var planSelect = document.getElementById("f-plan");
  document.querySelectorAll("[data-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (planSelect) planSelect.value = btn.getAttribute("data-plan");
    });
  });

  // Форма заявки
  var form = document.getElementById("request-form");
  if (!form) return;
  var status = document.getElementById("form-status");

  function setError(id, msg) {
    var input = document.getElementById("f-" + id);
    var err = document.getElementById("e-" + id);
    if (err) err.textContent = msg || "";
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function showStatus(kind, html) {
    status.className = "form-status show " + kind;
    status.innerHTML = html;
  }

  function normalizePhone(v) {
    var digits = String(v || "").replace(/\D/g, "");
    if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) digits = "7" + digits.slice(1);
    else if (digits.length === 10) digits = "7" + digits;
    return digits;
  }

  var phoneInput = document.getElementById("f-phone");
  phoneInput.addEventListener("blur", function () {
    var d = normalizePhone(phoneInput.value);
    if (d.length === 11) {
      phoneInput.value = "+7 " + d.slice(1, 4) + " " + d.slice(4, 7) + "-" + d.slice(7, 9) + "-" + d.slice(9, 11);
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    function val(id) { return document.getElementById("f-" + id).value.trim(); }
    var data = {
      name: val("name"),
      phone: normalizePhone(val("phone")),
      company: val("company"),
      city: val("city"),
      objects: val("objects"),
      plan: val("plan"),
      comment: val("comment"),
      consent: document.getElementById("f-consent").checked,
      page: location.href,
      sentAt: new Date().toISOString()
    };

    var ok = true;
    setError("name", ""); setError("phone", ""); setError("consent", "");
    if (data.name.length < 2) { setError("name", "Укажите имя"); ok = false; }
    if (data.phone.length !== 11 || data.phone[0] !== "7") { setError("phone", "Укажите телефон в формате +7 900 000-00-00"); ok = false; }
    if (!data.consent) { setError("consent", "Без согласия мы не можем принять заявку"); ok = false; }
    if (!ok) {
      var firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');

    if (cfg.formEndpoint) {
      btn.disabled = true;
      btn.textContent = "Отправляем…";
      fetch(cfg.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        showStatus("ok", "Спасибо! Заявка отправлена. Мы свяжемся с вами в рабочее время.");
      }).catch(function () {
        showStatus("err", "Не получилось отправить заявку. Попробуйте ещё раз чуть позже" +
          (cfg.contactEmail ? ' или напишите на <a href="mailto:' + cfg.contactEmail + '">' + cfg.contactEmail + "</a>." : "."));
      }).then(function () {
        btn.disabled = false;
        btn.textContent = "Отправить заявку";
      });
      return;
    }

    if (cfg.contactEmail) {
      var body = [
        "Заявка на демо",
        "Имя: " + data.name,
        "Телефон: +" + data.phone,
        "Компания: " + (data.company || "—"),
        "Город: " + (data.city || "—"),
        "Объектов одновременно: " + (data.objects || "—"),
        "Тариф: " + (data.plan || "—"),
        "Комментарий: " + (data.comment || "—"),
        "Согласие на обработку ПДн: да"
      ].join("\n");
      location.href = "mailto:" + cfg.contactEmail +
        "?subject=" + encodeURIComponent("Заявка на демо — " + data.name) +
        "&body=" + encodeURIComponent(body);
      showStatus("ok", "Открыли почтовую программу с готовым письмом — осталось нажать «Отправить».");
      return;
    }

    // Сайт ещё не настроен: заявку некуда отправить
    showStatus("warn", "<b>Черновик сайта:</b> приём заявок ещё не подключён, данные никуда не отправлены. " +
      "Владельцу: укажите <code>formEndpoint</code> или <code>contactEmail</code> в файле <code>assets/js/config.js</code>.");
  });
})();
