#!/usr/bin/env python3
"""
Собирает весь сайт в ОДИН html-файл для просмотра без интернета
(отправить в мессенджере, открыть на компьютере двойным щелчком).

Внутри: лендинг, калькулятор и политика (открываются поверх сайта),
чек-лист PDF (скачивается кнопкой). Источник — файлы site/, calc/, shared/, checklist/.

Запуск из корня репозитория:
    python3 homestaging/tools/build_single_file.py
Результат: homestaging/dist/homestaging-krasnodar.html
"""
import base64
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "homestaging-krasnodar.html")


def rd(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def b64(data):
    return base64.b64encode(data).decode("ascii")


def must_replace(s, old, new):
    if old not in s:
        sys.exit("Не найдено в исходнике: " + old)
    return s.replace(old, new)


def style(css):
    return "<style>\n" + css + "\n</style>"


def script(js):
    # </script внутри кода закрыл бы тег раньше времени
    return "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>"


# Перехват ссылок во вложенных страницах (калькулятор, политика): вместо перехода — команды сайту.
SUB_LINKS = r"""
(function () {
  var rs = history.replaceState;
  history.replaceState = function () { try { return rs.apply(history, arguments); } catch (e) {} };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    var P = window.parent;
    if (!P || P === window || !P.HS_open) return;
    if (/^(\.\.\/site\/)?privacy\.html/.test(h)) { e.preventDefault(); P.HS_open("privacy"); return; }
    if (/^\.\.\/calc\//.test(h)) { e.preventDefault(); P.HS_open("calc"); return; }
    if (/^\.\.\/checklist\//.test(h)) { e.preventDefault(); P.HS_pdf(); return; }
    if (/^\.\.\/site\//.test(h) || h === "./" || /^\.\/#/.test(h) || /^index\.html/.test(h)) {
      e.preventDefault(); P.HS_close((h.split("#")[1] || "").split("?")[0]); return;
    }
  }, true);
})();
"""

base_css = rd("shared/base.css")
config_js = rd("shared/config.js")


def inline_page(html, css_files, js_files, extra_js=""):
    html = must_replace(html, '<link rel="stylesheet" href="../shared/base.css">', style(base_css))
    for href, rel in css_files:
        html = must_replace(html, '<link rel="stylesheet" href="%s">' % href, style(rd(rel)))
    html = must_replace(html, '<script src="../shared/config.js"></script>', script(config_js))
    for src, rel in js_files:
        html = must_replace(html, '<script src="%s"></script>' % src, script(rd(rel)))
    if extra_js:
        html = must_replace(html, "</body>", script(extra_js) + "\n</body>")
    return html


# ---- вложенные страницы
calc = inline_page(rd("calc/index.html"), [("calc.css", "calc/calc.css")],
                   [("calc-core.js", "calc/calc-core.js"), ("calc-ui.js", "calc/calc-ui.js")], SUB_LINKS)
privacy = inline_page(rd("site/privacy.html"), [("site.css", "site/site.css")],
                      [("site.js", "site/site.js")], SUB_LINKS)

# ---- главная
site = inline_page(rd("site/index.html"), [("site.css", "site/site.css")],
                   [("portfolio/portfolio.js", "site/portfolio/portfolio.js"), ("site.js", "site/site.js")])

# ссылки главной на калькулятор, политику и PDF
site = re.sub(r'href="\.\./calc/"', 'href="#" data-hs-open="calc"', site)
site = re.sub(r'href="privacy\.html(#[\w-]+)?"( target="_blank" rel="noopener")?', 'href="#" data-hs-open="privacy"', site)
site = re.sub(r'href="\.\./checklist/checklist\.pdf" download', 'href="#" data-hs-pdf', site)
leftover = re.findall(r'href="(\.\./[^"]*|privacy\.html[^"]*)"', site)
if leftover:
    sys.exit("Остались неперехваченные ссылки: %s" % leftover)

SHELL_CSS = """
.hs-draft { background: var(--accent-soft); color: var(--text); font-size: .875rem; line-height: 1.4;
  padding: 8px max(16px, env(safe-area-inset-left, 0px)); text-align: center; border-bottom: 1px solid var(--line); }
.hs-sub { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: var(--bg); }
.hs-sub__bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid var(--line);
  background: var(--surface); }
.hs-sub__back { min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg);
  color: var(--text); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; flex: none; }
.hs-sub__back:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.hs-sub__title { font-weight: 600; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hs-sub iframe { flex: 1; width: 100%; border: 0; background: var(--bg); }
"""

SHELL_HTML = """
<div class="hs-sub" id="hs-sub" hidden>
  <div class="hs-sub__bar">
    <button class="hs-sub__back" type="button" id="hs-sub-back">← На сайт</button>
    <span class="hs-sub__title" id="hs-sub-title"></span>
  </div>
  <iframe id="hs-sub-frame" title="Страница сайта"></iframe>
</div>
"""

SHELL_JS = r"""
(function () {
  var SUB = { calc: "%CALC%", privacy: "%PRIVACY%" };
  var TITLES = { calc: "Калькулятор подготовки", privacy: "Политика обработки персональных данных" };
  var PDF = "%PDF%";
  function bytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  var box = document.getElementById("hs-sub"), frame = document.getElementById("hs-sub-frame");
  window.HS_open = function (name) {
    if (!SUB[name]) return;
    frame.srcdoc = new TextDecoder("utf-8").decode(bytes(SUB[name]));
    document.getElementById("hs-sub-title").textContent = TITLES[name] || "";
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    document.getElementById("hs-sub-back").focus();
  };
  window.HS_close = function (anchor) {
    box.hidden = true;
    frame.removeAttribute("srcdoc");
    document.documentElement.style.overflow = "";
    if (anchor) { var t = document.getElementById(anchor); if (t) t.scrollIntoView(); }
  };
  window.HS_pdf = function () {
    var url = URL.createObjectURL(new Blob([bytes(PDF)], { type: "application/pdf" }));
    var a = document.createElement("a");
    a.href = url; a.download = "checklist-podgotovka-k-fotosyemke.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  };
  document.getElementById("hs-sub-back").addEventListener("click", function () { window.HS_close(""); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) window.HS_close(""); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-hs-open],[data-hs-pdf]");
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute("data-hs-pdf")) window.HS_pdf(); else window.HS_open(a.getAttribute("data-hs-open"));
  });
})();
"""

shell_js = (SHELL_JS
            .replace("%CALC%", b64(calc.encode("utf-8")))
            .replace("%PRIVACY%", b64(privacy.encode("utf-8")))
            .replace("%PDF%", b64(open(os.path.join(ROOT, "checklist", "checklist.pdf"), "rb").read())))

site = must_replace(site, "</head>", style(SHELL_CSS) + "\n</head>")
site = re.sub(r"<body>", '<body>\n<div class="hs-draft">Черновик сайта для просмотра: цены и тексты ещё меняются.</div>', site, count=1)
site = must_replace(site, "</body>", SHELL_HTML + script(shell_js) + "\n</body>")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(site)
print("Готово: %s (%d КБ)" % (OUT, os.path.getsize(OUT) // 1024))
