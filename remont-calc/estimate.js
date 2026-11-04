/*
 * estimate.js — тексты сметы: «сколько купить», «откуда цифры», цена, смета для заказчика
 * (модель для PDF и печати), выгрузка в Excel (CSV) и короткий список для мессенджера.
 *
 * Зависит от formulas.js. В браузере — window.RemontEstimate, в Node.js — require('./estimate.js').
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./formulas.js'));
  } else {
    root.RemontEstimate = factory(root.RemontFormulas);
  }
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';

  /* ================================================================== *
   * Числа и склонения
   * ================================================================== */

  var nf = {};
  /** Число по-русски: 1 234,5 (до digits знаков после запятой). */
  function fmt(n, digits) {
    var d = digits === undefined ? 2 : digits;
    if (!nf[d]) nf[d] = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d });
    return nf[d].format(F.round(n, d));
  }
  function money(n) { return fmt(Math.round(n), 0) + ' ₽'; }

  /** Форма слова для числа: plural(5, ['банка', 'банки', 'банок']) → «банок». */
  function plural(n, forms) {
    var a = Math.abs(Math.round(n)) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  function count(n, forms) { return fmt(n, 0) + ' ' + plural(n, forms); }

  var FORMS = {
    pack: ['упаковка', 'упаковки', 'упаковок'],
    can: ['банка', 'банки', 'банок'],
    roll: ['рулон', 'рулона', 'рулонов'],
    bag: ['мешок', 'мешка', 'мешков'],
    canister: ['канистра', 'канистры', 'канистр'],
    bucket: ['ведро', 'ведра', 'вёдер'],
    plank: ['планка', 'планки', 'планок'],
    profile: ['профиль', 'профиля', 'профилей'],
    sheet: ['лист', 'листа', 'листов'],
    panel: ['панель', 'панели', 'панелей'],
    cut: ['отрез', 'отреза', 'отрезов'],
    section: ['секция', 'секции', 'секций'],
    radiator: ['радиатор', 'радиатора', 'радиаторов'],
    coil: ['бухта', 'бухты', 'бухт'],
    packet: ['пачка', 'пачки', 'пачек'],
    coat: ['слой', 'слоя', 'слоёв'],
    strip: ['полоса', 'полосы', 'полос'],
    tile: ['плитка', 'плитки', 'плиток'],
    room: ['комната', 'комнаты', 'комнат'],
    item: ['позиция', 'позиции', 'позиций'],
    shield: ['щит', 'щита', 'щитов'],
    piece: ['шт.', 'шт.', 'шт.']
  };
  // «Цена за …» — винительный падеж упаковки.
  var PER = {
    pack: 'упаковку', can: 'банку', roll: 'рулон', bag: 'мешок', canister: 'канистру', bucket: 'ведро',
    plank: 'планку', profile: 'профиль', sheet: 'лист', panel: 'панель', section: 'секцию', radiator: 'радиатор',
    coil: 'бухту', packet: 'пачку', piece: 'шт.', shield: 'шт.'
  };
  // Единицы своих позиций, которые склоняются.
  var UNIT_FORMS = {
    'баллон': ['баллон', 'баллона', 'баллонов'],
    'тюбик': ['тюбик', 'тюбика', 'тюбиков'],
    'рулон': FORMS.roll,
    'рейс': ['рейс', 'рейса', 'рейсов'],
    'мешок': FORMS.bag,
    'банка': FORMS.can,
    'пачка': FORMS.packet,
    'лист': FORMS.sheet,
    'упаковка': FORMS.pack
  };

  // Чем считается упаковка у материала (по способу расчёта; исключения — ниже).
  var PACK_BY_KIND = {
    area: 'pack', tile: 'pack', roll: 'cut', pieces: 'plank', paint: 'can', wallpaper: 'roll', glue: 'packet',
    perArea: 'bucket', adhesive: 'bag', grout: 'pack', drymix: 'bag', count: 'piece', cable: 'coil',
    radiator: 'section', panel: 'shield'
  };
  var PACK_BY_KEY = {
    drywall: 'sheet', plywood: 'sheet', panels: 'panel', panelsMDF: 'panel', fiberglass: 'roll',
    underlayPE: 'roll', underlayCork: 'roll', mosaic: 'sheet', profileCD: 'profile', profileUD: 'profile',
    liquidWallpaper: 'pack', decorPlaster: 'bag', primer: 'canister', waterproofing: 'bucket', parquetLacquer: 'can',
    radiatorPanel: 'radiator'
  };

  function packName(key) {
    if (PACK_BY_KEY[key]) return PACK_BY_KEY[key];
    var meta = F.MATERIALS[key];
    return meta ? PACK_BY_KIND[meta.kind] || 'piece' : 'piece';
  }
  function packForms(key) { return FORMS[packName(key)]; }

  /* ================================================================== *
   * Тексты по материалу
   * ================================================================== */

  /**
   * Тексты для одного расчёта: buy(m) — «сколько купить», lines(m) — «откуда цифры», price(m) — цена.
   * project — расчёт (нормы, свои позиции), calc — результат F.calculateProject(project).
   */
  function texts(project, calc) {
    project = project || {};
    var params = {};
    function P(key) {
      if (!params[key]) params[key] = F.materialParams(project.materials, key);
      return params[key];
    }
    function customItem(m) {
      return (project.custom || []).find(function (x) { return 'custom:' + x.id === m.key; });
    }
    var n = F.toNumber;

    function buy(m) {
      if (m.kind === 'custom') {
        if (m.packSize !== 1) return count(m.packs, FORMS.pack) + ' по ' + fmt(m.packSize) + ' ' + m.amountUnit;
        return fmt(m.packs, 0) + ' ' + (UNIT_FORMS[m.amountUnit] ? plural(m.packs, UNIT_FORMS[m.amountUnit]) : m.amountUnit);
      }
      var p = P(m.key);
      switch (m.kind) {
        case 'area':
          return count(m.packs, packForms(m.key)) + (p.priceUnit === 'm2' ? ' (' + fmt(m.boughtArea) + ' м²)' : '');
        case 'tile':
          return count(m.packs, packForms(m.key)) + ' (' + (m.layout ? count(m.pieces, m.key === 'mosaic' ? FORMS.sheet : FORMS.tile) + ', ' : '') +
            fmt(m.boughtArea) + ' м²)';
        case 'roll':
          return fmt(m.amount) + ' м² (' + count(m.packs, FORMS.cut) + ')';
        case 'measured':
          return fmt(m.amount) + ' ' + m.baseUnit;
        case 'count':
          return fmt(m.packs, 0) + ' шт.';
        case 'cable':
          return fmt(m.meters, 0) + ' м' + (m.coils ? ' (' + count(m.coils, FORMS.coil) + ' по ' + fmt(n(p.coilLength)) + ' м)' : '');
        case 'radiator':
          if (m.key === 'radiatorPanel') return count(m.packs, FORMS.radiator) + ' по ' + fmt(n(p.sectionPower), 0) + ' Вт';
          return count(m.packs, FORMS.section) + ' (' + count(m.radiators, FORMS.radiator) + ')';
        case 'heatingMat':
          return fmt(m.amount) + ' м² (' + fmt(m.watts, 0) + ' Вт)';
        case 'heatingCable':
          return fmt(m.meters, 0) + ' м кабеля (' + fmt(m.watts, 0) + ' Вт)';
        case 'panel':
          return (m.packs > 1 ? m.packs + ' ' + plural(m.packs, FORMS.shield) + ' на ' : 'Щит на ') + fmt(m.size, 0) + ' модулей';
        default:
          return count(m.packs, packForms(m.key));
      }
    }

    function lines(m) {
      if (m.kind === 'custom') return customLines(m);
      var p = P(m.key);
      var r = n(p.reserve);
      var res = r > 0 ? ' (+' + fmt(r, 1) + ' %)' : '';
      var forms = packForms(m.key);
      var L = [];
      switch (m.kind) {
        case 'area':
          L.push('Площадь ' + fmt(m.area) + ' м²' + (r > 0 ? ', с запасом' + res + ' ' + fmt(m.amount) + ' м²' : ''));
          L.push(count(m.packs, forms) + ' по ' + fmt(m.packArea, 3) + ' м² = ' + fmt(m.boughtArea, 3) + ' м²');
          break;
        case 'tile':
          if (m.layout) {
            (m.layouts || []).forEach(function (t) {
              var lay = t.layout;
              var s = (t.name || 'Комната') + (t.surface === 'floor' ? ', пол: ' : ', стены: ') + count(t.pieces, FORMS.tile);
              if (t.surface === 'walls') {
                var minus = [];
                if (lay.openingsMinus) minus.push('проёмы −' + lay.openingsMinus);
                if (lay.bathMinus) minus.push('за ванной −' + lay.bathMinus);
                if (lay.screen) minus.push('экран ванны +' + lay.screen);
                s += ' (раскладка ' + lay.gross + (minus.length ? '; ' + minus.join(', ') : '') + ')';
              }
              L.push(s);
            });
            L.push('С подрезкой ' + m.layoutPieces + ' шт., запас на бой' + res + ' → ' + m.pieces + ' шт. ' +
              fmt(n(p.tileLength), 1) + '×' + fmt(n(p.tileWidth), 1) + ' см → ' + count(m.packs, forms));
          } else {
            L.push('Площадь ' + fmt(m.area) + ' м², с запасом' + res + ' ' + fmt(m.amount) + ' м²');
            L.push(m.pieces + ' шт. плитки ' + fmt(n(p.tileLength), 1) + '×' + fmt(n(p.tileWidth), 1) + ' см → ' +
              count(m.packs, forms) + ' по ' + fmt(m.packArea, 3) + ' м²');
          }
          break;
        case 'roll':
          m.cuts.forEach(function (c) {
            L.push((c.name || 'Комната') + ': рулон ' + fmt(c.rollWidth) + ' м, ' + count(c.strips, FORMS.strip) + ' × ' + fmt(c.cutLength) + ' м = ' + fmt(c.area) + ' м²');
          });
          L.push('Площадь пола ' + fmt(m.area) + ' м²' + (r > 0 ? ', с запасом' + res + ' ' + fmt(m.amount) + ' м²' : ''));
          break;
        case 'pieces':
          L.push('Длина ' + fmt(m.area) + ' м, с запасом' + res + ' ' + fmt(m.amount) + ' м → ' + count(m.packs, forms) + ' по ' + fmt(m.pieceLength) + ' м');
          break;
        case 'paint':
          L.push('Площадь ' + fmt(m.area) + ' м² × ' + count(n(p.coats), FORMS.coat) + ' ÷ ' + fmt(n(p.coverage)) + ' м²/л');
          L.push('С запасом' + res + ' ' + fmt(m.amount) + ' л → ' + count(m.packs, forms) + ' по ' + fmt(n(p.canVolume)) + ' л');
          break;
        case 'wallpaper':
          L.push('Стены ' + fmt(m.area) + ' м²; полос ' + m.strips + ', с запасом' + res + ' ' + m.stripsWithReserve);
          m.groups.forEach(function (g) {
            L.push('Полоса ' + fmt(g.stripLength) + ' м: ' + g.stripsPerRoll + ' из рулона → ' + count(g.rolls, forms));
          });
          break;
        case 'glue':
          L.push('Стены ' + fmt(m.area) + ' м², с запасом' + res + ' ' + fmt(m.amount) + ' м² ÷ ' + fmt(n(p.coverage)) + ' м² на ' +
            (m.key === 'wallpaperGlue' ? 'пачку' : 'упаковку'));
          break;
        case 'perArea':
          L.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(n(p.consumption), 2) + ' кг/м²');
          L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.packWeight)) + ' кг');
          break;
        case 'adhesive':
          L.push('Пол ' + fmt(m.floorArea) + ' м² × ' + fmt(n(p.floorThickness)) + ' мм + стены ' + fmt(m.wallArea) + ' м² × ' +
            fmt(n(p.wallThickness)) + ' мм, × ' + fmt(n(p.consumptionPerMm)) + ' кг/м² на 1 мм');
          L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.bagWeight)) + ' кг');
          break;
        case 'grout':
          m.rates.forEach(function (x) {
            L.push((x.title || 'Плитка') + ' ' + fmt(n(x.tileLength), 1) + '×' + fmt(n(x.tileWidth), 1) + ' см' +
              (x.title === 'Мозаика' ? ' (чип)' : '') + ': ' + fmt(x.area) + ' м² × ' + fmt(x.rate, 3) + ' кг/м²');
          });
          L.push('Шов ' + fmt(n(p.jointWidth)) + ' мм; с запасом' + res + ' ' + fmt(m.amount, 2) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.packWeight)) + ' кг');
          break;
        case 'layered':
          if (m.key === 'waterproofing') {
            L.push('Пол и заход на стены ' + fmt(m.area) + ' м² × ' + count(n(p.coats), FORMS.coat) + ' × ' + fmt(n(p.consumption)) + ' кг/м²');
            L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.bucketWeight)) + ' кг');
          } else {
            L.push('Площадь ' + fmt(m.area) + ' м² × ' + count(n(p.coats), FORMS.coat) + ' × ' + fmt(n(p.consumption), 3) + ' л/м²');
            L.push('С запасом' + res + ' ' + fmt(m.amount) + ' л → ' + count(m.packs, forms) + ' по ' +
              fmt(n(m.key === 'primer' ? p.canisterVolume : p.canVolume)) + ' л');
          }
          break;
        case 'drymix':
          L.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(n(p.thickness)) + ' мм × ' + fmt(n(p.consumptionPerMm)) + ' кг/м²');
          L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.bagWeight)) + ' кг');
          break;
        case 'measured':
          L.push((m.baseUnit === 'м' ? 'Длина ' : 'Площадь ') + fmt(m.area) + ' ' + m.baseUnit + (r > 0 ? ', с запасом' + res + ' ' + fmt(m.amount) : ''));
          break;
        case 'count': {
          var where = (calc ? calc.rooms : []).filter(function (x) { return x.areas[m.key] > 0; }).map(function (x) {
            return (x.name || 'без названия') + ' — ' + fmt(x.areas[m.key], 0);
          });
          L.push(where.length ? 'По комнатам: ' + where.join(', ') : 'На всю квартиру');
          break;
        }
        case 'cable':
          L.push('Трассы ' + fmt(m.area, 1) + ' м (до щита, по комнате, спуски к точкам), с запасом' + res + ' ' + fmt(m.meters, 0) + ' м');
          break;
        case 'radiator': {
          var panel = m.key === 'radiatorPanel';
          m.rooms.forEach(function (x) {
            L.push((x.name || 'Комната') + ': ' + fmt(x.watts, 0) + ' Вт → ' +
              (panel ? count(x.sections, FORMS.radiator) : (x.radiators > 1 ? x.radiators + ' × ' : '') + count(x.perRadiator, FORMS.section)));
          });
          L.push(fmt(n(p.wattsPerM2), 0) + ' Вт/м², ' + (panel ? 'радиатор ' : 'секция ') + fmt(n(p.sectionPower), 0) + ' Вт' + (r > 0 ? ', запас' + res : ''));
          break;
        }
        case 'heatingMat':
          L.push(fmt(n(p.share), 0) + ' % площади пола, с шагом ' + fmt(n(p.matStep)) + ' м² × ' + fmt(n(p.power), 0) + ' Вт/м²');
          break;
        case 'heatingCable':
          L.push(fmt(n(p.share), 0) + ' % площади пола = ' + fmt(m.area) + ' м² × ' + fmt(n(p.power), 0) + ' Вт/м² = ' + fmt(m.watts, 0) + ' Вт');
          L.push('Кабель ' + fmt(n(p.linearPower)) + ' Вт/м → ' + fmt(m.meters, 0) + ' м');
          break;
        case 'panel':
          L.push('Модулей ' + fmt(m.modules, 0) + ' (ввод, автоматы, дифавтоматы), с запасом мест ' + fmt(n(p.moduleReserve), 0) + ' % — ' + fmt(m.need, 1));
          break;
      }
      return L;
    }

    function customLines(m) {
      var c = customItem(m);
      if (!c) return [];
      var r = n(c.reserve);
      var res = r > 0 ? ', с запасом (+' + fmt(r, 1) + ' %) ' + fmt(m.amount) + ' ' + m.amountUnit : '';
      if (c.basis === 'count') return ['Количество ' + fmt(m.area) + ' ' + m.amountUnit + res];
      var unit = { floor: 'м²', walls: 'м²', ceiling: 'м²', perimeter: 'м' }[c.basis];
      var name = { floor: 'Площадь пола', walls: 'Площадь стен', ceiling: 'Площадь потолка', perimeter: 'Периметр' }[c.basis];
      return [name + ' ' + fmt(m.area) + ' ' + unit + ' × ' + fmt(n(c.rate), 3) + ' ' + m.amountUnit + '/' + unit + res];
    }

    function price(m) {
      if (!m.priced) return 'цена не указана';
      if (m.kind === 'custom') {
        var c = customItem(m);
        return fmt(n(c.price)) + ' ₽ за ' + (m.packSize !== 1 ? 'упаковку' : m.amountUnit);
      }
      var p = P(m.key);
      var per;
      if (p.priceUnit === 'm2') per = 'м²';
      else if (p.priceUnit === 'm') per = 'метр';
      else if (p.priceUnit === 'pack') per = m.kind === 'cable' ? 'бухту' : PER[packName(m.key)] || 'упаковку';
      else if (m.kind === 'roll' || m.kind === 'heatingMat') per = 'м²';
      else if (m.kind === 'heatingCable') per = 'метр';
      else if (m.kind === 'measured') per = m.baseUnit === 'м²' ? 'м²' : 'м';
      else per = PER[packName(m.key)] || 'шт.';
      return fmt(n(p.price)) + ' ₽ за ' + per;
    }

    return { buy: buy, lines: lines, price: price };
  }

  /* ================================================================== *
   * Смета целиком
   * ================================================================== */

  /** Материалы, сгруппированные по разделам каталога, с подытогами. */
  function grouped(calc) {
    return F.CATEGORIES.map(function (cat) {
      var items = calc.materials.filter(function (m) { return m.category === cat.key; });
      return { key: cat.key, title: cat.title, items: items, cost: items.reduce(function (s, m) { return s + m.cost; }, 0) };
    }).filter(function (g) { return g.items.length; });
  }

  function dateText(d) {
    var x = d || new Date();
    function two(v) { return (v < 10 ? '0' : '') + v; }
    return two(x.getDate()) + '.' + two(x.getMonth() + 1) + '.' + x.getFullYear();
  }

  var NOTES = [
    'Нормы расхода — типовые значения, перед покупкой проверьте по упаковке.',
    'Количество округлено вверх до целых упаковок; запас указан в расчёте.',
    'Плитка посчитана раскладкой — с учётом подрезки у стен, проёмов и ванны.',
    'Длина кабеля и труб — оценка; точная — по проекту электрики и сантехники.'
  ];

  /**
   * Смета для заказчика — готовые строки для PDF и печати.
   * opts: { company: { name, phone, note }, customer, number, date (Date), details (true — с расчётом) }
   */
  function estimateModel(project, calc, opts) {
    project = project || {};
    opts = opts || {};
    var t = texts(project, calc);
    var company = opts.company || {};
    var meta = [
      ['Объект', project.name],
      ['Заказчик', opts.customer !== undefined ? opts.customer : project.customer],
      ['Дата', dateText(opts.date)],
      ['Расчёт №', opts.number]
    ].filter(function (x) { return x[1] && String(x[1]).trim(); });

    var rooms = (calc.rooms || []).map(function (r) {
      var g = r.geometry;
      return [r.name || 'Без названия', fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height),
        fmt(g.floorArea), fmt(g.wallNet), fmt(g.ceilingArea), r.cost !== undefined ? money(r.cost) : '—'];
    });

    var groups = grouped(calc).map(function (g) {
      return {
        title: g.title,
        total: money(g.cost),
        items: g.items.map(function (m) {
          return {
            title: m.title,
            qty: t.buy(m),
            price: m.priced ? t.price(m) : '—',
            cost: m.priced ? money(m.cost) : '—',
            details: opts.details === false ? '' : t.lines(m).join('; ')
          };
        })
      };
    });

    var missing = calc.missingPrices;
    var notes = NOTES.slice();
    if (calc.rooms && calc.rooms.length) {
      notes.push('Суммы по помещениям посчитаны раздельно (как если покупать на каждое помещение) и потому могут быть чуть больше общего итога; щит и свои позиции в них не входят.');
    }
    return {
      title: 'Смета на материалы',
      company: { name: company.name || '', phone: company.phone || '', note: company.note || '' },
      meta: meta,
      summary: { total: money(calc.totalCost), note: missing ? 'Не указаны цены: ' + count(missing, FORMS.item) : '' },
      rooms: { columns: ['Помещение', 'Размеры, м', 'Пол, м²', 'Стены, м²', 'Потолок, м²', 'Сумма'], rows: rooms },
      groups: groups,
      totalLabel: 'Итого',
      total: money(calc.totalCost),
      notes: notes,
      signatures: opts.signatures === false ? [] : [['Исполнитель', ''], ['Заказчик', '']]
    };
  }

  /* ================================================================== *
   * Excel (CSV)
   * ================================================================== */

  /** Число для Excel: без пробелов между разрядами, с запятой: 12944,4 */
  function num(x, digits) {
    var v = F.round(x, digits === undefined ? 2 : digits);
    return String(v).replace('.', ',');
  }

  /** Ячейка CSV: в кавычках, если есть «;», кавычки или перенос строки. */
  function cell(v) {
    var s = v === undefined || v === null ? '' : String(v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /**
   * CSV для Excel: разделитель «;», дробная часть через запятую, кодировка UTF-8 с меткой BOM —
   * так файл сразу открывается в русском Excel по двойному щелчку.
   */
  function toCSV(project, calc, opts) {
    project = project || {};
    opts = opts || {};
    var t = texts(project, calc);
    var rows = [];
    rows.push(['Смета на материалы']);
    if (project.name) rows.push(['Объект', project.name]);
    var customer = opts.customer !== undefined ? opts.customer : project.customer;
    if (customer) rows.push(['Заказчик', customer]);
    rows.push(['Дата', dateText(opts.date)]);
    rows.push([]);
    rows.push(['Раздел', 'Материал', 'Нужно', 'Ед.', 'Купить', 'Цена, ₽', 'Цена за', 'Сумма, ₽', 'Расчёт']);
    grouped(calc).forEach(function (g) {
      g.items.forEach(function (m) {
        var priceText = m.priced ? t.price(m) : '';
        var per = priceText ? priceText.replace(/^.* за /, '') : '';
        var priceValue = m.kind === 'custom'
          ? F.toNumber(((project.custom || []).find(function (x) { return 'custom:' + x.id === m.key; }) || {}).price)
          : F.toNumber(F.materialParams(project.materials, m.key).price);
        rows.push([g.title, m.title, num(m.amount), m.amountUnit || m.baseUnit || '', t.buy(m),
          m.priced ? num(priceValue) : '', per, m.priced ? num(m.cost) : '', t.lines(m).join('; ')]);
      });
      rows.push(['', 'Итого: ' + g.title, '', '', '', '', '', num(g.cost), '']);
    });
    rows.push(['', 'ИТОГО', '', '', '', '', '', num(calc.totalCost), '']);

    if (calc.rooms && calc.rooms.length && calc.rooms[0].surfaces) {
      rows.push([]);
      rows.push(['По помещениям (раздельный расчёт)']);
      rows.push(['Помещение', 'Поверхность', 'Материал', 'Купить', 'Сумма, ₽']);
      calc.rooms.forEach(function (r) {
        r.surfaces.forEach(function (s) {
          s.materials.forEach(function (m) {
            rows.push([r.name, s.title, m.title, t.buy(m), m.priced ? num(m.cost) : '']);
          });
        });
        rows.push([r.name, 'Итого по помещению', '', '', num(r.cost)]);
      });
    }
    return '﻿' + rows.map(function (row) { return row.map(cell).join(';'); }).join('\r\n') + '\r\n';
  }

  /** Короткий список для мессенджера. */
  function shareText(project, calc, bought) {
    var t = texts(project, calc);
    var lines = ['Материалы' + (project && project.name ? ': ' + project.name : '')];
    grouped(calc).forEach(function (g) {
      lines.push('');
      lines.push(g.title.toUpperCase());
      g.items.forEach(function (m) {
        lines.push(((bought || {})[m.key] ? '✓ ' : '• ') + m.title + ' — ' + t.buy(m) + (m.priced ? ' — ' + money(m.cost) : ''));
      });
    });
    lines.push('');
    lines.push('Итого: ' + money(calc.totalCost));
    return lines.join('\n');
  }

  /** Имя файла без запрещённых символов: «смета - ул. Красная 12.csv» */
  function fileName(project, ext) {
    var name = String((project && project.name) || 'расчёт').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'расчёт';
    return 'смета - ' + name + '.' + ext;
  }

  return {
    fmt: fmt,
    money: money,
    plural: plural,
    count: count,
    FORMS: FORMS,
    UNIT_FORMS: UNIT_FORMS,
    packForms: packForms,
    texts: texts,
    grouped: grouped,
    dateText: dateText,
    estimateModel: estimateModel,
    toCSV: toCSV,
    shareText: shareText,
    fileName: fileName
  };
});
