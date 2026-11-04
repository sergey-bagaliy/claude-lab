/*
 * pdf.js — смета в PDF без библиотек.
 *
 * Каждая страница A4 рисуется на <canvas> (кириллица — через шрифты браузера),
 * сохраняется в JPEG, а из JPEG-картинок вручную собирается минимальный PDF:
 * каталог, дерево страниц, на каждой странице одна картинка во весь лист.
 *
 * В браузере модуль доступен как window.RemontPdf, в Node.js — через require
 * (там работает только assemblePdf: ему не нужен DOM).
 *
 *   RemontPdf.build(model, opts)  → Promise<Uint8Array>  байты PDF
 *   RemontPdf.render(model, opts) → Promise<Blob>        application/pdf
 *   RemontPdf.assemblePdf(pages, info) → Uint8Array       сборка PDF из JPEG
 *
 * model — готовая «модель сметы»: все значения уже отформатированные строки.
 * opts: { font, scale, accent, quality }.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RemontPdf = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================================================================== *
   * 1. Размеры страницы и оформление (всё в пунктах PDF: 1 pt = 1/72")
   * ================================================================== */

  var PAGE_W = 595.28;               // A4, ширина
  var PAGE_H = 841.89;               // A4, высота
  var MARGIN = 40;
  var CONTENT_W = PAGE_W - 2 * MARGIN;
  var TOP = MARGIN;
  var BOTTOM = PAGE_H - 50;          // ниже — колонтитул
  var FOOTER_RULE = PAGE_H - 36;
  var FOOTER_BASE = PAGE_H - 24;

  var DEFAULTS = {
    font: '"Golos Text", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    scale: 2,                        // пикселей canvas на пункт PDF
    accent: '#c2410c',
    quality: 0.9                     // качество JPEG
  };

  var COLOR = {
    text: '#15171a',
    muted: '#555b66',
    line: '#d4d7dd',
    head: '#eceef1',                 // шапка таблицы
    group: '#f5f6f8',                // строка группы материалов
    warn: '#b42318'                  // «не указаны цены»
  };

  var SIZE = {
    body: 9.5, small: 8, meta: 9, th: 8.5, group: 9, section: 10,
    company: 13, title: 18, total: 16, grand: 12.5, note: 8, caption: 6.5, footer: 7.5
  };

  var LEADING = 1.3;                 // межстрочный интервал (доля от кегля)
  var BASE = 0.33;                   // сдвиг базовой линии от середины строки (доля от кегля)
  var PAD_X = 5;                     // поля ячейки
  var PAD_Y = 4.5;

  function str(v) {
    return v == null ? '' : String(v).trim();
  }

  function fontStr(px, bold, family) {
    return (bold ? '700 ' : '400 ') + px + 'px ' + family;
  }

  /* ================================================================== *
   * 2. Разметка: раскладываем смету по страницам в список операций
   *    рисования (text / rect / line). Рисуем потом, когда известно
   *    число страниц (для «Страница N из M»).
   * ================================================================== */

  function Layout(ctx, o) {
    this.ctx = ctx;
    this.o = o;
    this.pages = [];
    this.ops = null;
    this.y = 0;
    this._font = '';
    this.newPage();
  }

  Layout.prototype.newPage = function () {
    this.ops = [];
    this.pages.push(this.ops);
    this.y = TOP;
  };

  // Перенос на новую страницу, если блок высотой h не помещается
  Layout.prototype.ensure = function (h) {
    if (this.y + h > BOTTOM && this.y > TOP + 0.5) this.newPage();
  };

  // Ширина текста в пунктах; меряем тем же шрифтом, каким будем рисовать
  Layout.prototype.width = function (text, size, bold) {
    var f = fontStr(size * this.o.scale, bold, this.o.font);
    if (f !== this._font) {
      this.ctx.font = f;
      this._font = f;
    }
    return this.ctx.measureText(text).width / this.o.scale;
  };

  // Перенос по словам; слишком длинное слово режется по буквам.
  // Неразрывные пробелы (в «123 789 ₽») не разрываются.
  Layout.prototype.wrap = function (text, size, bold, maxW) {
    var self = this;
    var out = [];
    text = text == null ? '' : String(text);
    if (!text.trim()) return out;
    text.split(/\r?\n/).forEach(function (para) {
      var words = para.split(/[ \t]+/).filter(Boolean);
      var line = '';
      words.forEach(function (w) {
        var cand = line ? line + ' ' + w : w;
        if (self.width(cand, size, bold) <= maxW) {
          line = cand;
          return;
        }
        if (line) out.push(line);
        line = '';
        if (self.width(w, size, bold) <= maxW) {
          line = w;
          return;
        }
        var chars = Array.from ? Array.from(w) : w.split('');
        chars.forEach(function (ch) {
          if (line && self.width(line + ch, size, bold) > maxW) {
            out.push(line);
            line = ch;
          } else {
            line += ch;
          }
        });
      });
      out.push(line);
    });
    return out;
  };

  // Обрезка строки с многоточием под заданную ширину
  Layout.prototype.fit = function (text, size, bold, maxW) {
    if (this.width(text, size, bold) <= maxW) return text;
    var s = text;
    while (s.length > 1 && this.width(s + '…', size, bold) > maxW) s = s.slice(0, -1);
    return s.trim() + '…';
  };

  Layout.prototype.text = function (s, x, y, size, bold, color, align) {
    if (!s) return;
    this.ops.push({ t: 'text', s: s, x: x, y: y, size: size, bold: !!bold, color: color, align: align || 'left' });
  };

  Layout.prototype.rect = function (x, y, w, h, fill, alpha) {
    this.ops.push({ t: 'rect', x: x, y: y, w: w, h: h, fill: fill, alpha: alpha == null ? 1 : alpha });
  };

  // Горизонтальная линия на всю ширину содержимого
  Layout.prototype.hline = function (y, color, lw, x1, x2) {
    this.ops.push({ t: 'line', x1: x1 == null ? MARGIN : x1, x2: x2 == null ? MARGIN + CONTENT_W : x2, y: y, color: color, lw: lw });
  };

  // Абзац с переносом строк от текущей позиции y
  Layout.prototype.para = function (text, x, w, size, bold, color, align, leading) {
    var self = this;
    var lh = size * (leading || LEADING);
    this.wrap(text, size, bold, w).forEach(function (s) {
      self.text(s, align === 'right' ? x + w : x, self.y + lh / 2 + size * BASE, size, bold, color, align);
      self.y += lh;
    });
  };

  /* ---------- Таблицы ---------- */

  // Ячейка: строка или список блоков { text, size, bold, color } (блоки идут друг под другом)
  function cellBlocks(cell) {
    if (cell == null) return [];
    if (typeof cell === 'string') return [{ text: cell, size: SIZE.body, bold: false, color: COLOR.text }];
    return Array.isArray(cell) ? cell : [cell];
  }

  function cellHeight(lines) {
    var h = 0;
    lines.forEach(function (l) { h += l.gap + l.lh; });
    return h;
  }

  function rowHeight(cells) {
    var h = SIZE.body * LEADING;
    cells.forEach(function (c) { h = Math.max(h, cellHeight(c.lines)); });
    return h + 2 * PAD_Y;
  }

  // Строка таблицы: переносим текст в каждой ячейке и считаем высоту строки
  Layout.prototype.row = function (cols, cells, style) {
    var self = this;
    var laid = cols.map(function (col, i) {
      var lines = [];
      cellBlocks(cells[i]).forEach(function (b) {
        self.wrap(b.text, b.size, b.bold, col.w - 2 * PAD_X).forEach(function (s, k) {
          lines.push({
            s: s, size: b.size, bold: !!b.bold, color: b.color || COLOR.text,
            lh: b.size * LEADING, gap: k === 0 && lines.length ? 1.5 : 0
          });
        });
      });
      return { w: col.w, align: col.align || 'left', lines: lines };
    });
    style = style || {};
    return { cells: laid, h: rowHeight(laid), fill: style.fill || null, top: !!style.top };
  };

  // Строка выше страницы: делим строки текста ячеек на две части
  function splitRow(r, maxH) {
    var avail = maxH - 2 * PAD_Y;
    var counts = r.cells.map(function (c) {
      var used = 0, k = 0;
      while (k < c.lines.length && used + c.lines[k].gap + c.lines[k].lh <= avail) {
        used += c.lines[k].gap + c.lines[k].lh;
        k++;
      }
      return k;
    });
    // хотя бы одна строка текста должна уйти в первую часть
    if (!counts.some(Boolean)) {
      for (var i = 0; i < r.cells.length; i++) {
        if (r.cells[i].lines.length) { counts[i] = 1; break; }
      }
    }
    function part(from) {
      var cells = r.cells.map(function (c, i) {
        var lines = from ? c.lines.slice(counts[i]) : c.lines.slice(0, counts[i]);
        if (from && lines.length) lines[0] = Object.assign({}, lines[0], { gap: 0 });
        return { w: c.w, align: c.align, lines: lines };
      });
      return { cells: cells, h: rowHeight(cells), fill: r.fill, top: r.top, cont: r.cont };
    }
    return [part(false), part(true)];
  }

  Layout.prototype.putRow = function (r) {
    var self = this;
    var x = MARGIN;
    var y = this.y;
    if (r.fill) this.rect(MARGIN, y, CONTENT_W, r.h, r.fill);
    if (r.top) this.hline(y, COLOR.line, 0.6);
    r.cells.forEach(function (c) {
      var ty = y + PAD_Y;
      var tx = c.align === 'right' ? x + c.w - PAD_X : x + PAD_X;
      c.lines.forEach(function (l) {
        ty += l.gap;
        self.text(l.s, tx, ty + l.lh / 2 + l.size * BASE, l.size, l.bold, l.color, c.align);
        ty += l.lh;
      });
      x += c.w;
    });
    this.y = y + r.h;
    this.hline(this.y, COLOR.line, 0.6);
  };

  var SECTION_GAP = 16;
  var SECTION_H = SECTION_GAP + SIZE.section * LEADING + 5;

  Layout.prototype.section = function (title) {
    if (this.y > TOP + 0.5) this.y += SECTION_GAP;
    this.para(title, MARGIN, CONTENT_W, SIZE.section, true, COLOR.text);
    this.y += 5;
  };

  // Таблица: заголовок раздела, шапка, строки. На новой странице шапка
  // повторяется, а внутри группы — ещё и строка «ГРУППА (продолжение)».
  // Строка целиком переносится на следующую страницу и режется, только
  // если она выше страницы.
  Layout.prototype.table = function (title, head, rows) {
    var first = rows[0];
    var firstH = first ? first.h + (first.keepNext && rows[1] ? rows[1].h : 0) : 0;
    this.ensure(SECTION_H + head.h + firstH);
    this.section(title);
    this.putRow(head);
    var fresh = true;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var need = r.h + (r.keepNext && rows[i + 1] ? rows[i + 1].h : 0);
      if (!fresh && this.y + need > BOTTOM) {
        this.newPage();
        this.putRow(head);
        if (r.cont) this.putRow(r.cont);
      }
      while (this.y + r.h > BOTTOM) {
        var parts = splitRow(r, BOTTOM - this.y);
        this.putRow(parts[0]);
        this.newPage();
        this.putRow(head);
        if (r.cont) this.putRow(r.cont);
        r = parts[1];
      }
      this.putRow(r);
      fresh = false;
    }
  };

  function th(text) {
    return { text: text, size: SIZE.th, bold: true, color: COLOR.muted };
  }

  /* ---------- Разделы сметы ---------- */

  // Шапка: компания, телефон, название документа, реквизиты в две колонки
  function header(L, m) {
    var c = m.company || {};
    var name = str(c.name);
    var sub = [str(c.phone), str(c.note)].filter(Boolean).join('   ·   ');
    if (name) L.para(name, MARGIN, CONTENT_W, SIZE.company, true, COLOR.text);
    if (sub) {
      L.y += 1;
      L.para(sub, MARGIN, CONTENT_W, SIZE.meta, false, COLOR.muted);
    }
    if (name || sub) L.y += 12;
    L.para(str(m.title) || 'Смета', MARGIN, CONTENT_W, SIZE.title, true, COLOR.text, 'left', 1.2);

    var meta = (Array.isArray(m.meta) ? m.meta : []).filter(function (p) {
      return p && str(p[1]);
    });
    if (meta.length) {
      L.y += 8;
      metaGrid(L, meta);
    }
    L.y += 10;
    L.hline(L.y, L.o.accent, 1.5);
    L.y += 14;
  }

  function metaGrid(L, meta) {
    var gap = 24;
    var colW = (CONTENT_W - gap) / 2;
    var half = Math.ceil(meta.length / 2);
    var cols = [meta.slice(0, half), meta.slice(half)];
    var labW = 0;
    meta.forEach(function (p) { labW = Math.max(labW, L.width(str(p[0]), SIZE.meta, false)); });
    labW = Math.min(labW + 10, colW * 0.42);
    var lh = SIZE.body * LEADING;
    for (var i = 0; i < half; i++) {
      var y0 = L.y;
      var rowH = 0;
      cols.forEach(function (col, ci) {
        var p = col[i];
        if (!p) return;
        var x = MARGIN + ci * (colW + gap);
        var ll = L.wrap(str(p[0]), SIZE.meta, false, labW - 6);
        var vl = L.wrap(str(p[1]), SIZE.body, false, colW - labW);
        ll.forEach(function (s, k) {
          L.text(s, x, y0 + k * lh + lh / 2 + SIZE.body * BASE, SIZE.meta, false, COLOR.muted);
        });
        vl.forEach(function (s, k) {
          L.text(s, x + labW, y0 + k * lh + lh / 2 + SIZE.body * BASE, SIZE.body, false, COLOR.text);
        });
        rowH = Math.max(rowH, Math.max(ll.length, vl.length) * lh);
      });
      L.y = y0 + rowH + 1.5;
    }
  }

  // Плашка «Итого по смете» с крупной суммой справа
  function summary(L, m) {
    var s = m.summary || {};
    var total = str(s.total) || str(m.total);
    var note = str(s.note);
    if (!total && !note) return;
    var accent = L.o.accent;
    var pad = 11;
    var bar = 3;
    var tW = total ? L.width(total, SIZE.total, true) : 0;
    var leftX = MARGIN + bar + pad;
    var leftW = CONTENT_W - bar - 2 * pad - (tW ? tW + 20 : 0);
    var lab = total ? L.wrap('Итого по смете', SIZE.section, true, leftW) : [];
    var nl = note ? L.wrap(note, SIZE.note, false, leftW) : [];
    var lhL = SIZE.section * LEADING;
    var lhN = SIZE.note * 1.35;
    var leftH = lab.length * lhL + (nl.length ? (lab.length ? 2 : 0) + nl.length * lhN : 0);
    var boxH = Math.max(leftH, SIZE.total * 1.3) + 2 * pad;
    L.ensure(boxH);
    var y = L.y;
    L.rect(MARGIN, y, CONTENT_W, boxH, accent, 0.07);
    L.rect(MARGIN, y, bar, boxH, accent, 1);
    var ty = y + (boxH - leftH) / 2;
    lab.forEach(function (t) {
      L.text(t, leftX, ty + lhL / 2 + SIZE.section * BASE, SIZE.section, true, COLOR.text);
      ty += lhL;
    });
    if (nl.length && lab.length) ty += 2;
    nl.forEach(function (t) {
      L.text(t, leftX, ty + lhN / 2 + SIZE.note * BASE, SIZE.note, false, COLOR.warn);
      ty += lhN;
    });
    if (total) {
      L.text(total, MARGIN + CONTENT_W - pad, y + boxH / 2 + SIZE.total * BASE, SIZE.total, true, accent, 'right');
    }
    L.y = y + boxH;
  }

  // Таблица помещений: первые две колонки — текст, остальные — числа справа
  function rooms(L, m) {
    var r = m.rooms || {};
    var rows = (Array.isArray(r.rows) ? r.rows : []).filter(function (row) {
      return Array.isArray(row) && row.some(function (v) { return str(v); });
    });
    if (!rows.length) return;
    var names = Array.isArray(r.columns) ? r.columns : [];
    var n = names.length;
    rows.forEach(function (row) { n = Math.max(n, row.length); });
    var weights = [];
    for (var i = 0; i < n; i++) weights.push(i === 0 ? 1.6 : i === 1 && n > 2 ? 1.4 : 1);
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var cols = weights.map(function (wt, k) {
      return { w: CONTENT_W * wt / sum, align: k < 2 ? 'left' : 'right' };
    });
    var head = L.row(cols, cols.map(function (c, k) { return th(str(names[k])); }), { fill: COLOR.head, top: true });
    var laid = rows.map(function (row) {
      return L.row(cols, cols.map(function (c, k) { return str(row[k]); }));
    });
    L.table('Помещения', head, laid);
  }

  // Таблица материалов: строка группы, под ней позиции
  function materials(L, m) {
    var groups = (Array.isArray(m.groups) ? m.groups : []).filter(function (g) {
      return g && (str(g.title) || (g.items && g.items.length));
    });
    if (!groups.length) return;
    var W = CONTENT_W;
    var cols = [
      { w: W * 0.40 }, { w: W * 0.25 }, { w: W * 0.20 }, { w: W * 0.15, align: 'right' }
    ];
    var gcols = [{ w: W * 0.85 }, { w: W * 0.15, align: 'right' }];
    var head = L.row(cols, [th('Материал'), th('Количество'), th('Цена'), th('Сумма')], { fill: COLOR.head, top: true });
    var rows = [];
    groups.forEach(function (g) {
      var title = str(g.title).toUpperCase();
      var items = (Array.isArray(g.items) ? g.items : []).filter(Boolean);
      var grp = function (t) { return { text: t, size: SIZE.group, bold: true, color: COLOR.text }; };
      var gr = L.row(gcols, [grp(title), grp(str(g.total))], { fill: COLOR.group });
      gr.keepNext = items.length > 0;     // заголовок группы не остаётся один внизу страницы
      rows.push(gr);
      var cont = L.row(gcols, [grp(title + ' (продолжение)'), ''], { fill: COLOR.group });
      items.forEach(function (it) {
        var first = [{ text: str(it.title), size: SIZE.body, bold: true, color: COLOR.text }];
        if (str(it.details)) first.push({ text: str(it.details), size: SIZE.small, bold: false, color: COLOR.muted });
        var row = L.row(cols, [first, str(it.qty), str(it.price), str(it.cost)]);
        row.cont = cont;
        rows.push(row);
      });
    });
    L.table('Материалы', head, rows);
  }

  // Итоговая строка под таблицей материалов
  function grandTotal(L, m) {
    var total = str(m.total);
    if (!total) return;
    var label = str(m.totalLabel) || 'Итого';
    var h = 28;
    L.ensure(h);
    var y = L.y;
    L.hline(y, L.o.accent, 1.2);
    var base = y + h / 2 + SIZE.grand * BASE;
    L.text(label, MARGIN + PAD_X, base, 11, true, COLOR.text);
    L.text(total, MARGIN + CONTENT_W - PAD_X, base, SIZE.grand, true, L.o.accent, 'right');
    L.y = y + h;
  }

  // Примечания мелким шрифтом, с маркерами
  function notes(L, m) {
    var list = (Array.isArray(m.notes) ? m.notes : []).map(str).filter(Boolean);
    if (!list.length) return;
    var lh = SIZE.note * 1.35;
    var ind = 9;
    var wrapped = list.map(function (n) { return L.wrap(n, SIZE.note, false, CONTENT_W - ind); });
    L.y += 14;
    L.ensure(SIZE.th * LEADING + 2 + wrapped[0].length * lh);
    L.para('Примечания', MARGIN, CONTENT_W, SIZE.th, true, COLOR.muted);
    L.y += 2;
    wrapped.forEach(function (lines) {
      L.ensure(lines.length * lh);
      L.text('•', MARGIN + 1, L.y + lh / 2 + SIZE.note * BASE, SIZE.note, false, COLOR.muted);
      lines.forEach(function (s) {
        L.text(s, MARGIN + ind, L.y + lh / 2 + SIZE.note * BASE, SIZE.note, false, COLOR.muted);
        L.y += lh;
      });
      L.y += 1.5;
    });
  }

  // Подписи: «Исполнитель ________ / ________ /», по две в ряд
  function signatures(L, m) {
    var list = (Array.isArray(m.signatures) ? m.signatures : []).filter(function (s) {
      return s && (str(s[0]) || str(s[1]));
    });
    if (!list.length) return;
    var gap = 30;
    var colW = (CONTENT_W - gap) / 2;
    var rowH = 34;
    L.y += 22;
    for (var i = 0; i < list.length; i += 2) {
      L.ensure(rowH);
      for (var k = 0; k < 2; k++) {
        if (list[i + k]) signature(L, list[i + k], MARGIN + k * (colW + gap), L.y, colW);
      }
      L.y += rowH;
    }
  }

  function signature(L, sig, x, y, w) {
    var label = str(sig[0]);
    var name = str(sig[1]);
    var base = y + 14;
    var lineY = base + 2.5;
    var capY = base + 11;
    var lw = label ? L.width(label, SIZE.body, false) + 8 : 0;
    var x0 = x + lw;
    var rest = w - lw;
    var slashW = L.width('/', SIZE.body, false);
    L.text(label, x, base, SIZE.body, false, COLOR.text);
    if (name) {
      var nameTxt = '/ ' + name + ' /';
      var sw = Math.max(40, rest - L.width(nameTxt, SIZE.body, false) - 6);
      L.hline(lineY, COLOR.text, 0.6, x0, x0 + sw);
      L.text('подпись', x0 + sw / 2, capY, SIZE.caption, false, COLOR.muted, 'center');
      L.text(nameTxt, x0 + sw + 6, base, SIZE.body, false, COLOR.text);
    } else {
      var sw2 = Math.max(40, (rest - 2 * slashW - 16) * 0.45);
      var x1 = x0 + sw2 + 4 + slashW + 4;
      var x2 = x + w - slashW - 4;
      L.hline(lineY, COLOR.text, 0.6, x0, x0 + sw2);
      L.text('/', x0 + sw2 + 4, base, SIZE.body, false, COLOR.text);
      L.hline(lineY, COLOR.text, 0.6, x1, x2);
      L.text('/', x2 + 4, base, SIZE.body, false, COLOR.text);
      L.text('подпись', x0 + sw2 / 2, capY, SIZE.caption, false, COLOR.muted, 'center');
      L.text('расшифровка подписи', (x1 + x2) / 2, capY, SIZE.caption, false, COLOR.muted, 'center');
    }
  }

  function layout(model, ctx, o) {
    var L = new Layout(ctx, o);
    header(L, model);
    summary(L, model);
    rooms(L, model);
    materials(L, model);
    grandTotal(L, model);
    notes(L, model);
    signatures(L, model);

    // Колонтитул слева: название документа и объект
    var obj = '';
    (Array.isArray(model.meta) ? model.meta : []).forEach(function (p) {
      if (!obj && p && /объект/i.test(str(p[0]))) obj = str(p[1]);
    });
    var left = [str(model.title) || 'Смета', obj].filter(Boolean).join(' · ');
    L.footerLeft = L.fit(left, SIZE.footer, false, CONTENT_W - 110);
    return L;
  }

  /* ================================================================== *
   * 3. Рисование страницы на canvas
   * ================================================================== */

  function paint(canvas, ctx, ops, o, footerLeft, pageNo, pageCount) {
    var k = o.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';                 // у JPEG нет прозрачности — фон белый
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'alphabetic';

    var all = ops.concat([
      { t: 'line', x1: MARGIN, x2: MARGIN + CONTENT_W, y: FOOTER_RULE, color: COLOR.line, lw: 0.5 },
      { t: 'text', s: footerLeft, x: MARGIN, y: FOOTER_BASE, size: SIZE.footer, color: COLOR.muted, align: 'left' },
      { t: 'text', s: 'Страница ' + pageNo + ' из ' + pageCount, x: MARGIN + CONTENT_W, y: FOOTER_BASE,
        size: SIZE.footer, color: COLOR.muted, align: 'right' }
    ]);

    all.forEach(function (op) {
      if (op.t === 'rect') {
        ctx.globalAlpha = op.alpha;
        ctx.fillStyle = op.fill;
        ctx.fillRect(op.x * k, op.y * k, op.w * k, op.h * k);
        ctx.globalAlpha = 1;
      } else if (op.t === 'line') {
        // линии — прямоугольники, выровненные по пикселям, чтобы были чёткими
        var px = Math.max(1, Math.round(op.lw * k));
        ctx.fillStyle = op.color;
        ctx.fillRect(Math.round(op.x1 * k), Math.round(op.y * k - px / 2), Math.round((op.x2 - op.x1) * k), px);
      } else if (op.t === 'text' && op.s) {
        ctx.font = fontStr(op.size * k, op.bold, o.font);
        ctx.fillStyle = op.color;
        ctx.textAlign = op.align;
        ctx.fillText(op.s, op.x * k, op.y * k);
      }
    });
  }

  function dataUrlToBytes(url) {
    var comma = url.indexOf(',');
    if (url.slice(0, 15) !== 'data:image/jpeg' || comma < 0) {
      throw new Error('RemontPdf: браузер не смог сохранить страницу в JPEG');
    }
    var bin = atob(url.slice(comma + 1));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function options(opts) {
    opts = opts || {};
    var o = {
      font: str(opts.font) || DEFAULTS.font,
      scale: Number(opts.scale) || DEFAULTS.scale,
      accent: str(opts.accent) || DEFAULTS.accent,
      quality: Number(opts.quality) || DEFAULTS.quality
    };
    o.scale = Math.min(4, Math.max(1, o.scale));
    o.quality = Math.min(1, Math.max(0.3, o.quality));
    return o;
  }

  // Ждём шрифты: просим загрузить нужные начертания, но не дольше 3 секунд
  function waitFonts(family) {
    var fonts = document.fonts;
    if (!fonts) return Promise.resolve();
    var wait = Promise.resolve();
    try {
      wait = Promise.all(['400', '700'].map(function (w) {
        return fonts.load(w + ' 16px ' + family, 'Смета 123 ₽').catch(function () {});
      })).then(function () { return fonts.ready; });
    } catch (e) { /* старый браузер */ }
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 3000); });
    return Promise.race([wait, timeout]).catch(function () {});
  }

  function nextTick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  /* ================================================================== *
   * 4. Публичные функции
   * ================================================================== */

  // Смета → байты PDF (Uint8Array)
  function build(model, opts) {
    return Promise.resolve().then(function () {
      if (typeof document === 'undefined') throw new Error('RemontPdf.build работает только в браузере');
      model = model || {};
      var o = options(opts);
      return waitFonts(o.font).then(function () {
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(PAGE_W * o.scale);
        canvas.height = Math.round(PAGE_H * o.scale);
        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('RemontPdf: canvas недоступен');
        var L = layout(model, ctx, o);
        var jpegs = [];
        // страницы рисуем по одной, отдавая управление браузеру между ними
        var chain = Promise.resolve();
        L.pages.forEach(function (ops, i) {
          chain = chain.then(function () {
            paint(canvas, ctx, ops, o, L.footerLeft, i + 1, L.pages.length);
            jpegs.push({
              width: canvas.width,
              height: canvas.height,
              bytes: dataUrlToBytes(canvas.toDataURL('image/jpeg', o.quality))
            });
            return nextTick();
          });
        });
        return chain.then(function () {
          canvas.width = canvas.height = 1;      // освобождаем память (важно для iOS)
          return assemblePdf(jpegs, { title: str(model.title) });
        });
      });
    });
  }

  // Смета → Blob для скачивания или «Поделиться»
  function render(model, opts) {
    return build(model, opts).then(function (bytes) {
      return new Blob([bytes], { type: 'application/pdf' });
    });
  }

  /* ---------- Сборка PDF ---------- */

  function asciiBytes(s) {
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return b;
  }

  // Строка для /Info: ASCII — в скобках, иначе UTF-16BE в шестнадцатеричном виде
  function pdfString(s) {
    if (/^[\x20-\x7e]*$/.test(s)) return '(' + s.replace(/[\\()]/g, '\\$&') + ')';
    var hex = 'FEFF';
    for (var i = 0; i < s.length; i++) hex += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
    return '<' + hex + '>';
  }

  function pad10(n) {
    return ('000000000' + n).slice(-10);
  }

  /*
   * Структура файла:
   *   %PDF-1.4 и строка с байтами > 127 (признак двоичного файла)
   *   1 — каталог (/Catalog) → 2 — дерево страниц (/Pages) с /Kids
   *   3 — сведения о документе (/Info: /Title, /Producer)
   *   для страницы i (n = 4 + 3i):
   *     n     — /Page с /MediaBox A4 и ресурсом /Im0
   *     n + 1 — поток содержимого: растянуть картинку на всю страницу
   *     n + 2 — картинка: JPEG как есть (/Filter /DCTDecode)
   *   xref — смещение каждого объекта в байтах, trailer, startxref, %%EOF
   *
   * pages: [{ width, height, bytes: Uint8Array (JPEG) }]
   * info:  { title } — необязательно
   */
  function assemblePdf(pages, info) {
    if (!pages || !pages.length) throw new Error('assemblePdf: нет страниц');
    var chunks = [];
    var offset = 0;
    var offsets = [];

    function put(x) {
      var b = typeof x === 'string' ? asciiBytes(x) : x;
      chunks.push(b);
      offset += b.length;
    }
    function obj(n, body) {
      offsets[n] = offset;
      put(n + ' 0 obj\n' + body + '\nendobj\n');
    }

    put('%PDF-1.4\n');
    put(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    var kids = pages.map(function (p, i) { return (4 + 3 * i) + ' 0 R'; });
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages.length + ' >>');
    var title = info && info.title ? String(info.title) : '';
    obj(3, '<< /Producer (remont-calc)' + (title ? ' /Title ' + pdfString(title) : '') + ' >>');

    var content = 'q ' + PAGE_W + ' 0 0 ' + PAGE_H + ' 0 0 cm /Im0 Do Q';
    pages.forEach(function (p, i) {
      var n = 4 + 3 * i;
      var w = Math.round(p.width);
      var h = Math.round(p.height);
      if (!(w > 0 && h > 0) || !p.bytes || !p.bytes.length) throw new Error('assemblePdf: неверная страница ' + (i + 1));
      obj(n, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + ']' +
        ' /Resources << /XObject << /Im0 ' + (n + 2) + ' 0 R >> /ProcSet [/PDF /ImageC] >>' +
        ' /Contents ' + (n + 1) + ' 0 R >>');
      obj(n + 1, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      offsets[n + 2] = offset;
      put((n + 2) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length +
        ' >>\nstream\n');
      put(p.bytes);
      put('\nendstream\nendobj\n');
    });

    // Таблица перекрёстных ссылок: каждая запись ровно 20 байт
    var size = 4 + 3 * pages.length;
    var xref = offset;
    var table = 'xref\n0 ' + size + '\n0000000000 65535 f \n';
    for (var k = 1; k < size; k++) table += pad10(offsets[k]) + ' 00000 n \n';
    put(table);
    put('trailer\n<< /Size ' + size + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF');

    var out = new Uint8Array(offset);
    var pos = 0;
    chunks.forEach(function (c) {
      out.set(c, pos);
      pos += c.length;
    });
    return out;
  }

  return {
    build: build,
    render: render,
    assemblePdf: assemblePdf
  };
});
