/* Сайт ИИ-агентства: настройки из config.js, демо-чаты, форма заявки. Без библиотек. */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------ настройки → страница

  function applyConfig() {
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var value = cfg[el.getAttribute("data-cfg")];
      if (value) el.textContent = value;
    });
    document.querySelectorAll("[data-cfg-placeholder]").forEach(function (el) {
      var value = cfg[el.getAttribute("data-cfg-placeholder")];
      if (value) {
        el.textContent = value;
        el.classList.remove("placeholder");
      }
    });

    var links = {
      phone: cfg.phone ? "tel:" + cfg.phone.replace(/[^\d+]/g, "") : "",
      email: cfg.email ? "mailto:" + cfg.email : "",
      telegram: cfg.telegram ? "https://t.me/" + cfg.telegram.replace(/^@/, "") : ""
    };
    document.querySelectorAll("[data-contact]").forEach(function (el) {
      var key = el.getAttribute("data-contact");
      var item = el.closest("[data-contact-item]") || el;
      if (!links[key]) {
        item.hidden = true;
        return;
      }
      el.href = links[key];
      el.textContent = key === "telegram" ? "@" + cfg.telegram.replace(/^@/, "") : cfg[key];
    });

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  // ------------------------------------------------------------ демо-чаты

  // Демо-сценарии шаблонного бота. Это НЕ реальные клиенты и НЕ отзывы.
  var DEMOS = {
    dentistry: {
      title: "Стоматология (демо)",
      bot: "Анна",
      steps: [
        { from: "out", text: "Здравствуйте! Болит зуб, можно попасть завтра?" },
        { from: "in", text: "Сочувствую! Завтра, в четверг, свободно: 10:00, 11:30, 15:00, 17:30. Какое время удобно?" },
        { from: "out", text: "11:30" },
        { from: "in", text: "Как вас зовут и по какому телефону связаться?" },
        { from: "out", text: "Ольга, +7 900 000-00-00" },
        { from: "in", text: "Проверьте: консультация стоматолога, чт 11:30, Ольга, +7 900 000-00-00. Записываю?" },
        { from: "chips", items: ["✅ Подтвердить", "✖️ Отмена"] },
        { from: "out", text: "Да" },
        { from: "in", text: "Готово, вы записаны ✅ Если планы изменятся — отмените в «Мои записи»." },
        { from: "note", text: "Владельцу пришло: 🆕 Новая запись" }
      ]
    },
    auto: {
      title: "Автосервис (демо)",
      bot: "Максим",
      steps: [
        { from: "out", text: "Сколько стоит замена колодок на Kia Rio?" },
        { from: "in", text: "Точную цену мастер назовёт после осмотра — она зависит от запчастей. Работа занимает около часа. Записать вас?" },
        { from: "out", text: "Да, в субботу утром" },
        { from: "in", text: "В субботу свободно: 09:00, 09:30, 11:00. Какое время?" },
        { from: "out", text: "9:30. Сергей, 8 900 000 00 00" },
        { from: "in", text: "Укажите, пожалуйста, год автомобиля — передам мастеру." },
        { from: "out", text: "2018" },
        { from: "in", text: "Записал: замена тормозных колодок, сб 09:30, Kia Rio 2018. До встречи!" },
        { from: "note", text: "Владельцу пришло: 🆕 Новая запись" }
      ]
    },
    beauty: {
      title: "Салон красоты (демо)",
      bot: "Мира",
      steps: [
        { from: "out", text: "Вы работаете в воскресенье?" },
        { from: "in", text: "Да, в воскресенье с 10:00 до 18:00. Хотите записаться?" },
        { from: "out", text: "А можно поговорить с человеком? Хочу уточнить про сложное окрашивание" },
        { from: "in", text: "Конечно! Передала вопрос администратору — вам ответят в рабочее время. Пока могу показать свободное время." },
        { from: "note", text: "Владельцу пришло: 🙋 Клиенту нужен администратор" }
      ]
    }
  };

  var demoTimer = null;

  function renderDemo(key) {
    var demo = DEMOS[key];
    var chat = document.getElementById("demo-chat");
    var name = document.getElementById("demo-bot-name");
    var avatar = document.getElementById("demo-avatar");
    if (!demo || !chat) return;
    clearTimeout(demoTimer);
    chat.innerHTML = "";
    if (name) name.textContent = demo.bot + " · ИИ-администратор";
    if (avatar) avatar.textContent = demo.bot.charAt(0);

    var i = 0;
    function next() {
      if (i >= demo.steps.length) return;
      var step = demo.steps[i++];
      var typing = null;
      if (step.from === "in" && !reduceMotion) {
        typing = document.createElement("div");
        typing.className = "typing";
        typing.innerHTML = "<i></i><i></i><i></i>";
        chat.appendChild(typing);
      }
      demoTimer = setTimeout(
        function () {
          if (typing) typing.remove();
          chat.appendChild(buildStep(step));
          demoTimer = setTimeout(next, reduceMotion ? 0 : 500);
        },
        reduceMotion ? 0 : step.from === "in" ? 900 : 500
      );
    }
    next();
  }

  function buildStep(step) {
    var el = document.createElement("div");
    if (step.from === "chips") {
      el.className = "chips";
      step.items.forEach(function (text) {
        var chip = document.createElement("span");
        chip.textContent = text;
        el.appendChild(chip);
      });
      return el;
    }
    el.className = "bubble " + step.from;
    el.textContent = step.text;
    return el;
  }

  function initTabs() {
    var tabs = document.querySelectorAll("[data-demo]");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        renderDemo(tab.getAttribute("data-demo"));
      });
    });

    // Запускаем демо, когда блок появляется на экране.
    var section = document.getElementById("demo");
    if (!section) return;
    var started = false;
    function start() {
      if (started) return;
      started = true;
      renderDemo("dentistry");
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          start();
          io.disconnect();
        }
      }, { threshold: 0.25 });
      io.observe(section);
    } else {
      start();
    }
  }

  // ------------------------------------------------------------ форма заявки

  function normalizePhone(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) return "+7" + digits.slice(1);
    if (digits.length === 10 && digits[0] === "9") return "+7" + digits;
    if (/^\s*\+/.test(raw) && digits.length >= 11 && digits.length <= 15) return "+" + digits;
    return null;
  }

  function setError(input, message) {
    var box = document.getElementById(input.id + "-error");
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (box) box.textContent = message || "";
  }

  function showStatus(form, kind, html) {
    var status = form.querySelector(".form-status");
    status.className = "form-status " + kind;
    status.innerHTML = html;
    status.hidden = false;
    status.focus();
  }

  function initForm() {
    var form = document.getElementById("lead-form");
    if (!form) return;

    // Пакет из кнопки «Выбрать» подставляется в форму.
    document.querySelectorAll("[data-package]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var select = document.getElementById("f-package");
        if (select) select.value = btn.getAttribute("data-package");
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = form.elements.name;
      var phone = form.elements.phone;
      var consent = form.elements.consent;
      var ok = true;

      setError(name, "");
      setError(phone, "");
      setError(consent, "");
      if (name.value.trim().length < 2) {
        setError(name, "Напишите, как к вам обращаться");
        ok = false;
      }
      var normalized = normalizePhone(phone.value);
      if (!normalized) {
        setError(phone, "Проверьте номер: например, +7 900 000-00-00");
        ok = false;
      }
      if (!consent.checked) {
        setError(consent, "Без согласия мы не можем обработать заявку");
        ok = false;
      }
      if (!ok) {
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (form.elements.website && form.elements.website.value) return; // ловушка для спам-ботов

      var lead = {
        name: name.value.trim(),
        phone: normalized,
        business: form.elements.business.value,
        package: form.elements.package.value,
        message: form.elements.message.value.trim(),
        consent: true,
        consent_at: new Date().toISOString(),
        page: location.href
      };
      submitLead(form, lead);
    });
  }

  function leadText(lead) {
    return [
      "Заявка с сайта",
      "Имя: " + lead.name,
      "Телефон: " + lead.phone,
      "Бизнес: " + (lead.business || "—"),
      "Пакет: " + (lead.package || "—"),
      "Комментарий: " + (lead.message || "—"),
      "Согласие на обработку ПДн: да, " + lead.consent_at
    ].join("\n");
  }

  function submitLead(form, lead) {
    var button = form.querySelector('button[type="submit"]');
    if (cfg.formEndpoint) {
      button.disabled = true;
      fetch(cfg.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(lead)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          showStatus(form, "ok", "Спасибо! Заявка отправлена — свяжемся с вами в рабочее время.");
        })
        .catch(function () {
          showStatus(form, "err", "Не получилось отправить заявку. " + fallbackHint());
        })
        .finally(function () {
          button.disabled = false;
        });
      return;
    }
    if (cfg.email) {
      var href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent("Заявка с сайта") +
        "&body=" + encodeURIComponent(leadText(lead));
      window.location.href = href;
      showStatus(form, "ok", "Открыли почтовую программу с готовым письмом — осталось нажать «Отправить».");
      return;
    }
    showStatus(form, "err", "Приём заявок ещё не настроен. " + fallbackHint());
  }

  function fallbackHint() {
    var parts = [];
    if (cfg.phone) parts.push('позвоните: <a href="tel:' + cfg.phone.replace(/[^\d+]/g, "") + '">' + escapeHtml(cfg.phone) + "</a>");
    if (cfg.telegram) parts.push('напишите в <a href="https://t.me/' + encodeURIComponent(cfg.telegram.replace(/^@/, "")) + '">Telegram</a>');
    return parts.length ? "Пожалуйста, " + parts.join(" или ") + "." : "";
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    initTabs();
    initForm();
  });
})();
