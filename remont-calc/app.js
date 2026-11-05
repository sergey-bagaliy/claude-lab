/*
 * app.js — интерфейс калькулятора: помещения, материалы, сравнение вариантов, итог,
 * сохранение, смета для заказчика (PDF), выгрузка в Excel (CSV).
 * Расчёты — в formulas.js, тексты сметы — в estimate.js, PDF — в pdf.js.
 */
(function () {
  'use strict';

  var F = window.RemontFormulas;
  var E = window.RemontEstimate;
  var PDF = window.RemontPdf;
  var CURRENT_KEY = 'remontCalc.current.v1';
  var SAVED_KEY = 'remontCalc.saved.v1';
  var SETTINGS_KEY = 'remontCalc.settings.v1';
  // Встроенный просмотр (страница на claude.ai): нет печати и работы без интернета,
  // файлы сохраняются через разрешение на скачивание.
  var EMBED = !!window.REMONT_EMBED;

  var fmt = E.fmt;
  var money = E.money;
  var plural = E.plural;
  var count = E.count;
  var FORMS = E.FORMS;

  /* ================================================================== *
   * Описание материалов для формы: поля, цена, подсказка
   * ================================================================== */

  function f(key, label, unit, typical) { return { key: key, label: label, unit: unit, typical: !!typical }; }

  var TILE_FIELDS = [f('tileLength', 'Длина плитки', 'см'), f('tileWidth', 'Ширина плитки', 'см'), f('piecesPerPack', 'Штук в упаковке', 'шт.')];
  var PAINT_FIELDS = [f('coverage', 'Укрывистость, 1 слой', 'м²/л', true), f('coats', 'Количество слоёв', 'слоя'), f('canVolume', 'Объём банки', 'л')];
  var MIX_FIELDS = [f('consumptionPerMm', 'Расход на 1 мм слоя', 'кг/м²', true), f('thickness', 'Средняя толщина', 'мм', true), f('bagWeight', 'Вес мешка', 'кг')];
  var ROLL_FIELDS = [{ key: 'rollWidths', label: 'Ширины рулонов в продаже (через «;»)', unit: 'м', text: true, wide: true }, f('trim', 'Припуск на отрез', 'м', true)];
  var PACK_FIELDS = [f('packArea', 'Площадь в упаковке', 'м²')];
  var WALLPAPER_FIELDS = [f('rollWidth', 'Ширина рулона', 'м'), f('rollLength', 'Длина рулона', 'м'), f('rapport', 'Раппорт (0 — без подгонки)', 'м'),
    f('trim', 'Припуск на полосу', 'м', true), { key: 'subtractOpenings', label: 'Вычитать ширину окон и дверей', checkbox: true }];
  var RADIATOR_FIELDS = [f('wattsPerM2', 'Мощность на 1 м² комнаты', 'Вт', true), f('sectionPower', 'Мощность одной секции', 'Вт', true)];
  var PRICE_M2_PACK = [['m2', 'за м²'], ['pack', 'за упаковку']];
  var PRICE_M_COIL = [['m', 'за метр'], ['pack', 'за бухту']];

  function boardUI(hint) {
    return { fields: PACK_FIELDS, priceUnits: PRICE_M2_PACK, pack: FORMS.pack, hint: hint };
  }
  function underlayUI(label, hint) {
    return { fields: [f('packArea', label, 'м²')], priceLabel: 'Цена упаковки (рулона)', pricePer: 'упаковку', pack: FORMS.pack, hint: hint };
  }
  function plinthUI(hint) {
    return { fields: [f('pieceLength', 'Длина планки', 'м')], priceLabel: 'Цена планки', pricePer: 'планку', pack: FORMS.plank, hint: hint };
  }
  function windowUI(hint) {
    return { fields: [], priceLabel: 'Цена за м² (с монтажом)', pricePer: 'м²', hint: hint };
  }
  function doorUI(hint) {
    return { fields: [], priceLabel: 'Цена двери (комплект)', pricePer: 'шт.', pack: FORMS.piece, hint: hint };
  }
  var DOOR_HINT = ' Дверь между двумя комнатами отмечайте только в одной из них, иначе она посчитается дважды.';

  var UI = {
    // --- Пол ---
    laminate: boardUI('Площадь в упаковке написана на коробке. Запас: 7 % при прямой укладке, 10–15 % по диагонали. Подложку и плинтус выберите в комнате.'),
    vinyl: boardUI('Замковый кварцвинил (SPC). У многих видов подложка уже приклеена — по умолчанию подложка не добавляется.'),
    vinylGlue: boardUI('Клеевой кварцвинил кладут на ровное основание (обычно по наливному полу). Клей добавляется сам.'),
    parquet: boardUI('Фасовка паркетной доски сильно отличается — возьмите цифру с коробки. По умолчанию — хвойная подложка и плинтус МДФ.'),
    parquetBlock: boardUI('Штучный паркет клеят на фанеру. Фанера, клей и лак добавляются сами. Укладка ёлочкой — запас 10–15 %.'),
    engineered: boardUI('Инженерную доску обычно клеят на фанеру — фанера и клей добавляются сами (подложку можно сменить в комнате).'),
    solidWood: boardUI('Массивную доску клеят на фанеру, потом шлифуют и лакируют — фанера, клей и лак добавляются сами.'),
    corkFloor: boardUI('Пробковое покрытие (замковое). Площадь в упаковке — на коробке.'),
    tileFloor: { fields: TILE_FIELDS, priceUnits: PRICE_M2_PACK, pack: FORMS.pack,
      hint: 'Керамическая плитка. Размер и штуки в упаковке — с этикетки. Запас: 10 % прямая укладка, 15 % по диагонали. Клей и затирка добавляются сами.' },
    porcelainFloor: { fields: TILE_FIELDS, priceUnits: PRICE_M2_PACK, pack: FORMS.pack,
      hint: 'Керамогранит. Для крупного формата увеличьте слой клея в карточке «Клей для плитки». Клей и затирка добавляются сами.' },
    linoleum: { fields: ROLL_FIELDS, priceLabel: 'Цена за м²', pricePer: 'м²', pack: FORMS.cut,
      hint: 'Для каждой комнаты подбирается ширина рулона и направление с наименьшим отрезом. Укажите ширины, которые есть у выбранной коллекции.' },
    carpet: { fields: ROLL_FIELDS, priceLabel: 'Цена за м²', pricePer: 'м²', pack: FORMS.cut,
      hint: 'Ширина рулона подбирается для каждой комнаты сама из списка.' },
    underlayPE: underlayUI('Площадь рулона', 'Вспененный полиэтилен — самая простая и дешёвая подложка, рулоны.'),
    underlayXPS: underlayUI('Площадь упаковки', 'Экструдированный пенополистирол (XPS) — листы или «гармошка». По умолчанию под ламинат.'),
    underlayConifer: underlayUI('Площадь упаковки', 'Хвойная подложка — плиты из древесного волокна (например, 15 плит 790×590 мм = 6,99 м²). По умолчанию под паркетную доску.'),
    underlayCork: underlayUI('Площадь рулона', 'Пробковая подложка — рулоны (например, 1 × 10 м).'),
    plywood: { fields: [f('sheetWidth', 'Ширина листа', 'м'), f('sheetLength', 'Длина листа', 'м')], priceLabel: 'Цена листа', pricePer: 'лист', pack: FORMS.sheet,
      hint: 'Влагостойкая фанера под штучный паркет, инженерную и массивную доску. Клей для фанеры и крепёж — в «Свои позиции».' },
    vinylAdhesive: { fields: [f('consumption', 'Расход', 'кг/м²', true), f('packWeight', 'Вес ведра', 'кг')], priceLabel: 'Цена ведра', pricePer: 'ведро', pack: FORMS.bucket,
      hint: 'Расход — на ведре (у клеев для кварцвинила обычно 0,25–0,35 кг/м² при шпателе А2).' },
    parquetGlue: { fields: [f('consumption', 'Расход', 'кг/м²', true), f('packWeight', 'Вес ведра', 'кг')], priceLabel: 'Цена ведра', pricePer: 'ведро', pack: FORMS.bucket,
      hint: 'Двухкомпонентный полиуретановый клей: обычно 0,8–1,2 кг/м², зависит от шпателя и основания — смотрите на ведре.' },
    parquetLacquer: { fields: [f('consumption', 'Расход на 1 слой', 'л/м²', true), f('coats', 'Количество слоёв', 'слоя', true), f('canVolume', 'Объём банки', 'л')],
      priceLabel: 'Цена банки', pricePer: 'банку', pack: FORMS.can, hint: 'Обычно 80–100 мл/м² на слой валиком, 2–3 слоя. Грунт под лак — в «Свои позиции».' },
    plinthPVC: plinthUI('Пластиковый плинтус. Длина = периметр комнаты минус ширина дверей. Углы и заглушки — в «Свои позиции».'),
    plinthMDF: plinthUI('Плинтус из МДФ. По умолчанию под паркетную и инженерную доску.'),
    plinthWood: plinthUI('Деревянный плинтус. По умолчанию под массивную доску.'),
    plinthPolymer: plinthUI('Дюрополимерный (под покраску) — влагостойкий, часто высокий.'),

    // --- Стены ---
    paintWall: { fields: PAINT_FIELDS, priceLabel: 'Цена банки', pricePer: 'банку', pack: FORMS.can,
      hint: 'Укрывистость — на банке (сколько м² покрывает 1 л в один слой). Если там «л/м²», разделите 1 на это число: 0,125 л/м² = 8 м²/л.' },
    wallpaper: { fields: WALLPAPER_FIELDS, priceLabel: 'Цена рулона', pricePer: 'рулон', pack: FORMS.roll,
      hint: 'Считается полосами на высоту комнаты. Раппорт — шаг рисунка, указан на этикетке. Клей добавляется сам.' },
    wallpaperVinyl: { fields: WALLPAPER_FIELDS, priceLabel: 'Цена рулона', pricePer: 'рулон', pack: FORMS.roll,
      hint: 'Виниловые обои на флизелиновой или бумажной основе. Считаются полосами, клей добавляется сам.' },
    wallpaperPaper: { fields: WALLPAPER_FIELDS, priceLabel: 'Цена рулона', pricePer: 'рулон', pack: FORMS.roll,
      hint: 'Бумажные обои обычно шириной 0,53 м. Считаются полосами, клей добавляется сам.' },
    wallpaperGlue: { fields: [f('coverage', 'Одной пачки хватает на', 'м²', true)], priceLabel: 'Цена пачки', pricePer: 'пачку', pack: FORMS.packet,
      hint: 'На пачке пишут, на сколько м² или рулонов её хватает (обычно 25–60 м²).' },
    liquidWallpaper: { fields: [f('coverage', 'Одной упаковки хватает на', 'м²', true)], priceLabel: 'Цена упаковки', pricePer: 'упаковку', pack: FORMS.pack,
      hint: 'Площадь на упаковку — на пакете (обычно 3,5–5 м²). На неровной стене расход больше — берите запас.' },
    decorPlaster: { fields: [f('consumption', 'Расход', 'кг/м²', true), f('packWeight', 'Вес мешка (ведра)', 'кг')], priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'Расход сильно зависит от фактуры и зерна: «короед» 2,5 мм — около 2,5–3 кг/м², у венецианской намного меньше. Смотрите на упаковке.' },
    tileWall: { fields: TILE_FIELDS, priceUnits: PRICE_M2_PACK, pack: FORMS.pack,
      hint: 'Керамическая плитка на стены. Размер и штуки в упаковке — с этикетки. Считается на всю высоту стен.' },
    porcelainWall: { fields: TILE_FIELDS, priceUnits: PRICE_M2_PACK, pack: FORMS.pack,
      hint: 'Керамогранит на стены (крупный формат). Клей и затирка добавляются сами.' },
    mosaic: { fields: [f('tileLength', 'Длина листа', 'см'), f('tileWidth', 'Ширина листа', 'см'), f('piecesPerPack', 'Листов в упаковке', 'шт.'),
        f('chipSize', 'Размер чипа (для затирки)', 'см'), f('thickness', 'Толщина мозаики', 'мм')],
      priceUnits: PRICE_M2_PACK, pack: FORMS.pack,
      hint: 'Мозаика на сетке. Затирка считается по размеру чипа — у мозаики её уходит заметно больше, чем у плитки.' },
    panels: { fields: [f('panelWidth', 'Ширина панели', 'м'), f('panelLength', 'Длина панели', 'м')], priceLabel: 'Цена панели', pricePer: 'панель', pack: FORMS.panel,
      hint: 'ПВХ-панели на стенах и потолке. Профили и крепёж — в «Свои позиции».' },
    panelsMDF: { fields: [f('panelWidth', 'Ширина панели', 'м'), f('panelLength', 'Длина панели', 'м')], priceLabel: 'Цена панели', pricePer: 'панель', pack: FORMS.panel,
      hint: 'МДФ-панели. Рейки и кляймеры — в «Свои позиции».' },
    fiberglass: { fields: [f('rollArea', 'Площадь рулона', 'м²')], priceLabel: 'Цена рулона', pricePer: 'рулон', pack: FORMS.roll,
      hint: 'Малярный стеклохолст под покраску. Клей для него — в «Свои позиции».' },

    // --- Потолок ---
    paintCeiling: { fields: PAINT_FIELDS, priceLabel: 'Цена банки', pricePer: 'банку', pack: FORMS.can,
      hint: 'Укрывистость — на банке. Если там «л/м²», разделите 1 на это число.' },
    stretchCeiling: { fields: [], priceLabel: 'Цена за м² (с монтажом)', pricePer: 'м²',
      hint: 'ПВХ-полотно, матовое или глянцевое. Обычно цену дают за м² с монтажом; светильники, углы и трубы — отдельно.' },
    stretchFabric: { fields: [], priceLabel: 'Цена за м² (с монтажом)', pricePer: 'м²', hint: 'Тканевое полотно — дороже ПВХ, монтируется без нагрева.' },
    rackCeiling: { fields: [], priceLabel: 'Цена за м² (комплект)', pricePer: 'м²', hint: 'Реечный потолок: рейки, стрингеры, подвесы — по цене комплекта за м².' },
    ceilingPlinth: { fields: [f('pieceLength', 'Длина планки', 'м')], priceLabel: 'Цена планки', pricePer: 'планку', pack: FORMS.plank,
      hint: 'Длина = периметр комнаты. Отмечается в комнате чипом «плинтус» у потолка.' },

    // --- Плиточные работы ---
    tileAdhesive: {
      fields: [f('consumptionPerMm', 'Расход на 1 мм слоя', 'кг/м²', true), f('wallThickness', 'Слой на стенах', 'мм', true),
        f('floorThickness', 'Слой на полу', 'мм', true), f('bagWeight', 'Вес мешка', 'кг')],
      priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'На мешке есть таблица: расход зависит от размера плитки и зуба шпателя. Чем крупнее плитка — тем толще слой.' },
    grout: {
      fields: [f('jointWidth', 'Ширина шва', 'мм'), f('tileThickness', 'Глубина шва (толщина плитки)', 'мм'),
        f('density', 'Коэффициент формулы', 'кг/дм³', true), f('packWeight', 'Вес упаковки', 'кг')],
      priceLabel: 'Цена упаковки', pricePer: 'упаковку', pack: FORMS.pack,
      hint: 'Расход = (A + B) / (A × B) × шов × глубина × коэффициент. Размеры берутся из карточек плитки, керамогранита и мозаики. Коэффициент у разных затирок свой — смотрите на упаковке.' },
    waterproofing: {
      fields: [f('consumption', 'Расход на 1 слой', 'кг/м²', true), f('coats', 'Количество слоёв', 'слоя'),
        f('upturn', 'Заход на стены', 'м', true), f('bucketWeight', 'Вес ведра', 'кг')],
      priceLabel: 'Цена ведра', pricePer: 'ведро', pack: FORMS.bucket,
      hint: 'Площадь = пол + полоса на стены высотой «заход» по периметру без дверей. В душевой зоне стены обрабатывают выше — добавьте через «Свои позиции».' },

    // --- Черновые работы ---
    screed: { fields: MIX_FIELDS, priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'Толщину стяжки оцените по перепадам пола (замерьте в нескольких точках и возьмите среднее).' },
    leveler: { fields: MIX_FIELDS, priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'Наливной (самовыравнивающийся) пол — тонкий слой поверх стяжки.' },
    plaster: { fields: MIX_FIELDS, priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'У гипсовых штукатурок обычно 0,8–0,9 кг/м² на 1 мм, у цементных больше. Толщину оцените по перепадам стен.' },
    puttyStart: { fields: MIX_FIELDS, priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'Стартовая шпаклёвка выравнивает стену перед финишной.' },
    putty: { fields: MIX_FIELDS, priceLabel: 'Цена мешка', pricePer: 'мешок', pack: FORMS.bag,
      hint: 'Финишная шпаклёвка. Толщина 1,5 мм — условное значение, укажите свою.' },
    primer: { fields: [f('consumption', 'Расход на 1 слой', 'л/м²', true), f('coats', 'Количество слоёв', 'слоя', true), f('canisterVolume', 'Объём канистры', 'л')],
      priceLabel: 'Цена канистры', pricePer: 'канистру', pack: FORMS.canister,
      hint: 'Расход — на канистре (обычно 0,1–0,2 л/м²). Слоёв: сколько раз грунтуете (перед штукатуркой, шпаклёвкой, покраской).' },
    drywall: { fields: [f('sheetWidth', 'Ширина листа', 'м'), f('sheetLength', 'Длина листа', 'м')], priceLabel: 'Цена листа', pricePer: 'лист', pack: FORMS.sheet,
      hint: 'Обшивка стен и потолка. Профили считаются сами; саморезы, подвесы и дюбели — в «Свои позиции».' },
    profileCD: { fields: [f('pieceLength', 'Длина профиля', 'м'), f('step', 'Шаг стоек и рядов', 'м', true)], priceLabel: 'Цена профиля', pricePer: 'профиль', pack: FORMS.profile,
      hint: 'Стены: стойка через каждый шаг по периметру на высоту комнаты. Потолок: ряды через шаг вдоль длинной стороны.' },
    profileUD: { fields: [f('pieceLength', 'Длина профиля', 'м')], priceLabel: 'Цена профиля', pricePer: 'профиль', pack: FORMS.profile,
      hint: 'Направляющий профиль: на стенах — по полу и потолку (2 периметра), на потолке — по периметру.' },

    // --- Окна и двери ---
    windowPVC: windowUI('Пластиковые окна. Отметьте «ПВХ» у окна в комнате. Цену за м² уточните у оконной компании.'),
    windowAluWarm: windowUI('Тёплый алюминиевый профиль — для утеплённых балконов, лоджий и панорамного остекления.'),
    windowAlu: windowUI('Холодное алюминиевое остекление — обычно для неутеплённых балконов и лоджий.'),
    windowWood: windowUI('Деревянные евроокна.'),
    windowFrameless: windowUI('Безрамное (раздвижное) остекление балкона или террасы.'),
    windowSill: { fields: [f('overhang', 'Заход за откосы (в сумме)', 'м', true)], priceLabel: 'Цена за погонный метр', pricePer: 'м.п.',
      hint: 'Длина подоконника = ширина окна + заход за откосы с двух сторон.' },
    windowSlopes: { fields: [], priceLabel: 'Цена за погонный метр', pricePer: 'м.п.', hint: 'Длина откосов окна = 2 × высота + ширина.' },
    doorEco: doorUI('Межкомнатная дверь с покрытием экошпон: полотно, коробка, наличники.' + DOOR_HINT),
    doorVeneer: doorUI('Межкомнатная дверь в натуральном шпоне.' + DOOR_HINT),
    doorEnamel: doorUI('Межкомнатная дверь, покрытая эмалью.' + DOOR_HINT),
    doorSolid: doorUI('Межкомнатная дверь из массива.' + DOOR_HINT),
    doorHidden: doorUI('Дверь скрытого монтажа (под покраску, вровень со стеной).' + DOOR_HINT),
    doorEntrance: doorUI('Входная дверь.'),

    // --- Электрика ---
    cableSocket: { fields: [f('toPanel', 'От щита до комнаты, в среднем', 'м', true), f('coilLength', 'Длина бухты', 'м')], priceUnits: PRICE_M_COIL, pack: FORMS.coil,
      hint: 'Оценка: от щита до комнаты + по периметру комнаты + спуск к каждой розетке на высоту потолка. Точная длина — по проекту электрики.' },
    cableLight: { fields: [f('toPanel', 'От щита до комнаты, в среднем', 'м', true), f('coilLength', 'Длина бухты', 'м')], priceUnits: PRICE_M_COIL, pack: FORMS.coil,
      hint: 'Оценка: от щита до комнаты + длина и ширина комнаты по потолку + спуск к каждому выключателю и светильнику на высоту потолка.' },
    cablePower: { fields: [f('toPanel', 'От щита до комнаты, в среднем', 'м', true), f('coilLength', 'Длина бухты', 'м')], priceUnits: PRICE_M_COIL, pack: FORMS.coil,
      hint: 'Для мощных приборов (плита, духовка, бойлер) — отдельная линия от щита к каждому. Сечение кабеля уточните у электрика.' },
    elSocket: { fields: [], priceLabel: 'Цена розетки', pricePer: 'шт.', pack: FORMS.piece, hint: 'Количество — из раздела «Электрика» в комнатах.' },
    elPowerSocket: { fields: [], priceLabel: 'Цена силовой розетки', pricePer: 'шт.', pack: FORMS.piece, hint: 'Для плиты, духовки, бойлера — по одной на прибор.' },
    elSwitch: { fields: [], priceLabel: 'Цена выключателя', pricePer: 'шт.', pack: FORMS.piece, hint: 'Количество — из раздела «Электрика» в комнатах.' },
    elBox: { fields: [], priceLabel: 'Цена подрозетника', pricePer: 'шт.', pack: FORMS.piece, hint: 'По одному на каждую розетку и выключатель.' },
    elLight: { fields: [], priceLabel: 'Цена светильника', pricePer: 'шт.', pack: FORMS.piece, hint: 'Количество — из раздела «Электрика» в комнатах.' },

    // --- Отопление ---
    radiatorBimetal: { fields: RADIATOR_FIELDS, priceLabel: 'Цена секции', pricePer: 'секцию', pack: FORMS.section,
      hint: '100 Вт на м² — для потолков до 2,7 м (выше — пропорционально больше). Мощность секции — в паспорте радиатора. Под каждое окно — свой радиатор.' },
    radiatorAlu: { fields: RADIATOR_FIELDS, priceLabel: 'Цена секции', pricePer: 'секцию', pack: FORMS.section,
      hint: 'Алюминиевые радиаторы. Мощность секции — в паспорте. Подходят не для всех систем отопления — уточните в управляющей компании.' },
    radiatorCastIron: { fields: RADIATOR_FIELDS, priceLabel: 'Цена секции', pricePer: 'секцию', pack: FORMS.section,
      hint: 'Чугунные радиаторы. Мощность секции обязательно возьмите из паспорта модели.' },
    radiatorPanel: { fields: [f('wattsPerM2', 'Мощность на 1 м² комнаты', 'Вт', true), f('sectionPower', 'Мощность одного радиатора', 'Вт', true)],
      priceLabel: 'Цена радиатора', pricePer: 'радиатор', pack: FORMS.radiator,
      hint: 'Стальной панельный радиатор продаётся целиком. Укажите мощность выбранной модели (тип и размер — в паспорте); если выходит 2 радиатора под окно — возьмите модель мощнее.' },
    floorHeating: { fields: [f('share', 'Доля площади пола', '%', true), f('power', 'Мощность мата', 'Вт/м²', true), f('matStep', 'Шаг размеров матов', 'м²')],
      priceLabel: 'Цена за м² мата', pricePer: 'м²',
      hint: 'Мат кладут в плиточный клей. Не кладут под мебель и сантехнику. Терморегулятор добавляется сам.' },
    floorFilm: { fields: [f('share', 'Доля площади пола', '%', true), f('power', 'Мощность плёнки', 'Вт/м²', true), f('matStep', 'Шаг нарезки', 'м²')],
      priceLabel: 'Цена за м² плёнки', pricePer: 'м²',
      hint: 'Инфракрасная плёнка — под ламинат, кварцвинил, линолеум (не под плитку). Терморегулятор добавляется сам.' },
    floorCable: { fields: [f('share', 'Доля площади пола', '%', true), f('power', 'Мощность на м²', 'Вт/м²', true), f('linearPower', 'Погонная мощность кабеля', 'Вт/м', true)],
      priceLabel: 'Цена за метр кабеля', pricePer: 'метр',
      hint: 'Кабель укладывают в стяжку. Секции продаются фиксированной длины — возьмите ближайшую по мощности; цену секции разделите на её длину.' },
    thermostat: { fields: [], priceLabel: 'Цена терморегулятора', pricePer: 'шт.', pack: FORMS.piece, hint: 'По одному на каждую комнату с тёплым полом.' }
    };

  function countUI(hint, label) {
    return { fields: [], priceLabel: label || 'Цена за шт.', pricePer: 'шт.', hint: hint };
  }
  function pipeUI(hint) {
    return { fields: [f('toRiser', 'До стояка (коллектора), в среднем', 'м', true)], priceLabel: 'Цена за метр', hint: hint };
  }
  var ORIENT_FIELD = { key: 'orientation', label: 'Раскладка', select: [['horizontal', 'Длинной стороной по горизонтали'], ['vertical', 'Длинной стороной по вертикали']] };
  var LAYOUT_HINT = ' Считается раскладкой по рядам: неполная плитка у стены, окна или двери считается целой — подрезка учтена, поэтому запас только на бой.';

  Object.assign(UI, {
    // --- Электрика: новые виды ---
    cableUTP: { fields: [f('toPanel', 'От роутера (щита) до комнаты', 'м', true), f('coilLength', 'Метров в коробке', 'м')], priceUnits: PRICE_M_COIL,
      hint: 'Отдельная линия к каждой интернет-розетке. Витая пара обычно продаётся коробками по 305 м.' },
    cableCoax: { fields: [f('toPanel', 'От щита до комнаты', 'м', true), f('coilLength', 'Длина бухты', 'м')], priceUnits: PRICE_M_COIL,
      hint: 'Отдельная линия к каждой ТВ-розетке.' },
    elSocketDouble: countUI('Двойная розетка в одной рамке — один подрозетник.'),
    elSocketIP44: countUI('Для ванной, зоны у мойки, балкона.'),
    elSocketUSB: countUI('Розетка со встроенными USB-разъёмами.'),
    elSwitch2: countUI('Две клавиши — две группы светильников.'),
    elSwitchPass: countUI('Проходные выключатели ставят парами (например, у входа и у кровати).'),
    elDimmer: countUI('Регулятор яркости — проверьте, что светильники его поддерживают.'),
    elSpot: countUI('Точечные светильники — в натяжной или гипсокартонный потолок.'),
    elSconce: countUI('Настенные светильники.'),
    elLedStrip: { fields: [], priceLabel: 'Цена за метр', hint: 'Длина ленты вводится в помещении, в метрах. Блок питания добавляется сам — один на помещение.' },
    elLedDriver: countUI('По одному на помещение с лентой. Мощность подберите по длине и мощности ленты.'),
    elInternet: countUI('Интернет-розетка RJ45. Кабель — витая пара, своя линия.'),
    elTV: countUI('Телевизионная розетка. Кабель — коаксиальный, своя линия.'),
    elBreaker: countUI('Один автомат на линию света каждого помещения и на каждый мощный прибор (плита, духовка, бойлер).'),
    elRCBO: countUI('Дифавтомат на розеточную линию каждого помещения: по ПУЭ п. 7.1.79 розеточные группы защищают УЗО до 30 мА.'),
    elMainBreaker: countUI('Один на квартиру. Номинал — по выделенной мощности.', 'Цена автомата'),
    elPanel: { fields: [f('breakerModules', 'Автомат занимает', 'мод.'), f('rcboModules', 'Дифавтомат занимает', 'мод.'),
        f('mainModules', 'Вводной автомат занимает', 'мод.'), f('moduleReserve', 'Запас свободных мест', '%', true),
        { key: 'sizes', label: 'Размеры щитов в продаже (через «;»)', unit: 'мод.', text: true, wide: true }],
      priceLabel: 'Цена щита', hint: 'Число модулей = вводной + автоматы + дифавтоматы. Щит выбирается наименьший, где хватает мест с запасом.' },

    // --- Сантехника ---
    toiletFloor: countUI('Напольный унитаз-компакт. Подводка воды и канализация 110 мм считаются сами.'),
    toiletWall: countUI('Подвесной унитаз вместе с инсталляцией и кнопкой.'),
    hygienicShower: countUI('Гигиенический душ со скрытым смесителем.'),
    sinkVanity: countUI('Раковина с тумбой. Смеситель, сифон и подводка добавятся сами.'),
    sinkWall: countUI('Подвесная раковина или на пьедестале. Смеситель, сифон и подводка добавятся сами.'),
    kitchenSink: countUI('Кухонная мойка. Смеситель для кухни, сифон и подводка добавятся сами.'),
    bathAcrylic: countUI('Акриловая ванна. Смеситель и слив-перелив добавятся сами; размеры ванны — в помещении (для плитки).'),
    bathSteel: countUI('Стальная ванна.'),
    bathCastIron: countUI('Чугунная ванна.'),
    showerTray: countUI('Душевой поддон с ограждением. Душевая система добавится сама.'),
    showerCabin: countUI('Душевая кабина со смесителем.'),
    showerDrain: countUI('Душевой трап (душ без поддона). Душевая система добавится сама; не забудьте гидроизоляцию.'),
    washingMachine: countUI('Подключение: кран на холодную воду и сифон с отводом.', 'Цена подключения'),
    dishwasher: countUI('Подключение: кран на холодную воду, слив — в сифон мойки.', 'Цена подключения'),
    boiler: countUI('Накопительный водонагреватель. Для него нужна силовая розетка — добавьте в «Электрике».'),
    towelWater: countUI('Водяной полотенцесушитель — подключается к стояку горячей воды.'),
    towelElectric: countUI('Электрический полотенцесушитель — нужна влагозащищённая розетка.'),
    filterSink: countUI('Фильтр для питьевой воды под мойку.'),
    waterMeter: countUI('Счётчики холодной и горячей воды.'),
    mixerSink: countUI('По одному на раковину.'),
    mixerKitchen: countUI('По одному на кухонную мойку.'),
    mixerBath: countUI('По одному на ванну.'),
    mixerShower: countUI('Душевая система или смеситель с лейкой — для поддона и трапа.'),
    siphon: countUI('Для раковин, мойки, ванны, поддона, кабины и стиральной машины.'),
    flexHose: countUI('Гибкая подводка: по 2 на смеситель раковины, мойки и кабины, 1 на унитаз, 2 на бойлер.'),
    ballValve: countUI('По шаровому крану на каждую подводку воды.'),
    pipePP: pipeUI('Полипропиленовые трубы. Длина = число подводок × расстояние до стояка. Фитинги — в «Свои позиции».'),
    pipePEX: pipeUI('Трубы из сшитого полиэтилена (PEX). Длина = число подводок × расстояние до стояка.'),
    pipeMP: pipeUI('Металлопластиковые трубы. Длина = число подводок × расстояние до стояка.'),
    pipeSewer50: pipeUI('Канализация 50 мм: от раковин, мойки, ванны, душа, стиральной и посудомоечной машин.'),
    pipeSewer110: pipeUI('Канализация 110 мм: от унитазов.')
  });

  // Плитка — раскладкой; на стенах можно выбрать, как класть.
  UI.tileWall.fields = TILE_FIELDS.concat([ORIENT_FIELD]);
  UI.porcelainWall.fields = TILE_FIELDS.concat([ORIENT_FIELD]);
  UI.tileFloor.hint = 'Керамическая плитка. Размер и штуки в упаковке — с этикетки.' + LAYOUT_HINT + ' Клей и затирка добавляются сами.';
  UI.porcelainFloor.hint = 'Керамогранит. Размер и штуки в упаковке — с этикетки.' + LAYOUT_HINT;
  UI.tileWall.hint = 'Керамическая плитка на стены.' + LAYOUT_HINT + ' Зона за ванной вычитается, экран ванны можно облицевать.';
  UI.porcelainWall.hint = 'Керамогранит на стены.' + LAYOUT_HINT;
  UI.mosaic.hint = 'Мозаика на сетке — листами.' + LAYOUT_HINT + ' Затирка считается по размеру чипа.';

  /* ---------- Варианты в комнате ---------- */

  var FLOOR_OPTIONS = [['none', 'нет'], ['laminate', 'Ламинат'], ['vinyl', 'Кварцвинил замковый (SPC)'], ['vinylGlue', 'Кварцвинил клеевой'],
    ['parquet', 'Паркетная доска'], ['parquetBlock', 'Штучный паркет'], ['engineered', 'Инженерная доска'], ['solidWood', 'Массивная доска'],
    ['cork', 'Пробковое покрытие'], ['porcelain', 'Керамогранит'], ['tile', 'Плитка керамическая'], ['linoleum', 'Линолеум'], ['carpet', 'Ковролин']];
  var UNDERLAY_OPTIONS = [['none', 'без подложки'], ['pe', 'Вспененный полиэтилен'], ['xps', 'XPS (пенополистирол)'], ['conifer', 'Хвойная'],
    ['cork', 'Пробковая'], ['plywood', 'Фанера']];
  var PLINTH_OPTIONS = [['none', 'без плинтуса'], ['pvc', 'ПВХ'], ['mdf', 'МДФ'], ['wood', 'Деревянный'], ['polymer', 'Дюрополимерный']];
  var UNDERLAY_FLOORS = { laminate: true, vinyl: true, parquet: true, parquetBlock: true, engineered: true, solidWood: true, cork: true };
  var WALL_OPTIONS = [['none', 'нет'], ['paint', 'Покраска'], ['wallpaper', 'Обои флизелиновые'], ['wallpaperVinyl', 'Обои виниловые'],
    ['wallpaperPaper', 'Обои бумажные'], ['liquid', 'Жидкие обои'], ['decor', 'Декоративная штукатурка'], ['tile', 'Плитка керамическая'],
    ['porcelain', 'Керамогранит'], ['mosaic', 'Мозаика'], ['panels', 'Панели ПВХ'], ['panelsMDF', 'Панели МДФ']];
  var CEILING_OPTIONS = [['none', 'нет'], ['paint', 'Покраска'], ['stretch', 'Натяжной ПВХ'], ['stretchFabric', 'Натяжной тканевый'],
    ['panels', 'Панели ПВХ'], ['rack', 'Реечный']];
  var WINDOW_REPLACE = [['none', 'не менять'], ['pvc', 'ПВХ'], ['aluWarm', 'Алюминий тёплый'], ['alu', 'Алюминий холодный'],
    ['wood', 'Деревянное'], ['frameless', 'Безрамное']];
  var DOOR_REPLACE = [['none', 'не менять'], ['eco', 'Межкомнатная: экошпон'], ['veneer', 'Межкомнатная: шпон'], ['enamel', 'Межкомнатная: эмаль'],
    ['solid', 'Межкомнатная: массив'], ['hidden', 'Скрытого монтажа'], ['entrance', 'Входная']];
  var RADIATOR_OPTIONS = [['bimetal', 'Биметаллические'], ['alu', 'Алюминиевые'], ['castIron', 'Чугунные'], ['panel', 'Стальные панельные']];
  var FLOOR_HEAT_OPTIONS = [['mat', 'Нагревательный мат (под плитку)'], ['film', 'Инфракрасная плёнка'], ['cable', 'Кабель в стяжку']];
  var WATER_PIPE_OPTIONS = [['none', 'не менять'], ['pp', 'Полипропилен'], ['pex', 'Сшитый полиэтилен (PEX)'], ['mp', 'Металлопластик']];
  var BATH_PLACE_OPTIONS = [['corner', 'У стены в углу'], ['niche', 'В нише (между стенами)']];

  var FLOOR_CHIPS = [['screed', 'стяжка'], ['leveler', 'наливной пол'], ['waterproofing', 'гидроизоляция'], ['primer', 'грунт']];
  var WALL_CHIPS = [['drywall', 'гипсокартон'], ['plaster', 'штукатурка'], ['puttyStart', 'шпакл. старт'], ['putty', 'шпакл. финиш'],
    ['fiberglass', 'стеклохолст'], ['primer', 'грунт']];
  var CEILING_CHIPS = [['drywall', 'гипсокартон'], ['plaster', 'штукатурка'], ['puttyStart', 'шпакл. старт'], ['putty', 'шпакл. финиш'],
    ['primer', 'грунт'], ['plinth', 'плинтус']];

  // Штучные позиции в комнате (счётчики «−/+»).
  var ELECTRIC_GROUPS = [
    { title: 'Розетки', items: [['elSocket', 'Розетка'], ['elSocketDouble', 'Розетка двойная'], ['elSocketIP44', 'Розетка влагозащищённая'],
      ['elSocketUSB', 'Розетка с USB'], ['elPowerSocket', 'Силовая (плита, духовка, бойлер)']] },
    { title: 'Выключатели', items: [['elSwitch', 'Выключатель'], ['elSwitch2', 'Выключатель двухклавишный'], ['elSwitchPass', 'Выключатель проходной'],
      ['elDimmer', 'Диммер']] },
    { title: 'Свет', items: [['elLight', 'Люстра / светильник'], ['elSpot', 'Точечный светильник'], ['elSconce', 'Бра'], ['elLedStrip', 'Светодиодная лента, м']] },
    { title: 'Интернет и ТВ', items: [['elInternet', 'Интернет-розетка'], ['elTV', 'ТВ-розетка']] }
  ];
  var PLUMBING_GROUPS = [
    { title: 'Унитаз', items: [['toiletFloor', 'Унитаз напольный'], ['toiletWall', 'Унитаз подвесной + инсталляция'], ['hygienicShower', 'Гигиенический душ']] },
    { title: 'Раковины', items: [['sinkVanity', 'Раковина с тумбой'], ['sinkWall', 'Раковина подвесная'], ['kitchenSink', 'Мойка кухонная']] },
    { title: 'Ванна и душ', items: [['bathAcrylic', 'Ванна акриловая'], ['bathSteel', 'Ванна стальная'], ['bathCastIron', 'Ванна чугунная'],
      ['showerTray', 'Душевой поддон с ограждением'], ['showerCabin', 'Душевая кабина'], ['showerDrain', 'Душевой трап']] },
    { title: 'Техника и прочее', items: [['washingMachine', 'Стиральная машина'], ['dishwasher', 'Посудомоечная машина'], ['boiler', 'Водонагреватель'],
      ['towelWater', 'Полотенцесушитель водяной'], ['towelElectric', 'Полотенцесушитель электрический'], ['filterSink', 'Фильтр под мойку'],
      ['waterMeter', 'Счётчик воды']] }
  ];
  var ITEM_LABELS = {};
  ELECTRIC_GROUPS.concat(PLUMBING_GROUPS).forEach(function (g) { g.items.forEach(function (it) { ITEM_LABELS[it[0]] = it[1]; }); });
  var BATH_KEYS = ['bathAcrylic', 'bathSteel', 'bathCastIron'];

  var PRESET_ORDER = ['room', 'kitchen', 'bath', 'toilet', 'hall', 'balcony', 'empty'];

  // Что можно сравнить: варианты без «нет».
  var COMPARE_UI = [
    ['floor', 'Покрытие пола', FLOOR_OPTIONS.slice(1)],
    ['walls', 'Отделка стен', WALL_OPTIONS.slice(1)],
    ['ceiling', 'Потолок', CEILING_OPTIONS.slice(1)],
    ['window', 'Окна', WINDOW_REPLACE.slice(1)],
    ['door', 'Межкомнатные двери', DOOR_REPLACE.slice(1, 6)],
    ['radiator', 'Радиаторы', RADIATOR_OPTIONS],
    ['floorHeat', 'Тёплый пол', FLOOR_HEAT_OPTIONS]
  ];

  // Быстрое добавление своих позиций — то, чего нет в каталоге.
  var QUICK_ITEMS = [
    { group: 'Сантехника', items: [['Коллектор', 'шт.'], ['Редуктор давления', 'шт.'], ['Фильтр магистральный', 'шт.'], ['Фитинги для труб', 'уп.'],
      ['Ревизионный люк', 'шт.'], ['Насос', 'шт.']] },
    { group: 'Электрика', items: [['Распаечная коробка', 'шт.'], ['Гофра для кабеля', 'м'], ['Кабель-канал', 'м'], ['Реле напряжения', 'шт.'],
      ['Звонок', 'шт.'], ['Датчик протечки', 'шт.']] },
    { group: 'Окна и балкон', items: [['Отлив', 'м'], ['Москитная сетка', 'шт.'], ['Утепление балкона', 'м²']] },
    { group: 'Климат', items: [['Кондиционер', 'шт.'], ['Вытяжной вентилятор', 'шт.']] },
    { group: 'Расходники', items: [['Монтажная пена', 'баллон'], ['Герметик', 'тюбик'], ['Саморезы', 'уп.'], ['Дюбели', 'уп.'],
      ['Малярный скотч', 'рулон'], ['Мешки для мусора', 'уп.'], ['Вывоз мусора', 'рейс']] }
  ];

  var CUSTOM_BASIS = [['count', 'Вручную'], ['floor', 'Пол, м²'], ['walls', 'Стены, м²'], ['ceiling', 'Потолок, м²'], ['perimeter', 'Периметр, м']];
  var BASIS_UNIT = { floor: 'м²', walls: 'м²', ceiling: 'м²', perimeter: 'м' };

  var ICONS = {
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    openings: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/></svg>',
    finish: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="14" height="6" rx="1"/><path d="M17 6h3v5h-8v3M12 14v7"/></svg>',
    electric: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    plumbing: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    heating: '<svg viewBox="0 0 24 24"><path d="M5 20V8M9.5 20V8M14 20V8M18.5 20V8M3 20h18M3 8h18"/></svg>'
  };

  /* ================================================================== *
   * Состояние
   * ================================================================== */

  var state = null;          // текущий расчёт
  var calc = null;           // результат F.calculateProject(state)
  var settings = null;       // реквизиты компании для сметы
  var openMaterials = {};    // карточки материалов, которые пользователь сам открыл/закрыл
  var openCustoms = {};
  var materialsFilter = 'used';

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /** Имя без повторов: «Комната», «Комната 2»… */
  function uniqueName(base, rooms) {
    var names = (rooms || (state ? state.rooms : [])).map(function (r) { return r.name; });
    if (names.indexOf(base) < 0) return base;
    for (var i = 2; ; i++) {
      if (names.indexOf(base + ' ' + i) < 0) return base + ' ' + i;
    }
  }

  function roomFromPreset(key, height) {
    var room = F.makeRoom(key, {}, uid);
    room.name = uniqueName(key === 'empty' ? 'Помещение' : room.name);
    if (height !== undefined) room.height = height;
    return room;
  }

  function exampleProject() {
    var room = F.makeRoom('room', { length: 4, width: 3 }, uid);
    return { id: uid('p'), name: '', customer: '', rooms: [room], materials: clone(F.DEFAULT_MATERIALS), disabled: {}, custom: [], bought: {}, compare: null };
  }

  // Материалы первых версий, которые теперь разделены на виды.
  var RENAMED = { underlay: 'underlayXPS', floorPlinth: 'plinthPVC', doorInterior: 'doorEco', radiator: 'radiatorBimetal' };

  /** Приводит загруженный расчёт к нужному виду (старые версии, чужие файлы). */
  function normalizeProject(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.rooms)) return null;
    var oldMaterials = Object.assign({}, p.materials);
    var oldDisabled = Object.assign({}, p.disabled);
    Object.keys(RENAMED).forEach(function (oldKey) {
      if (oldMaterials[oldKey] && !oldMaterials[RENAMED[oldKey]]) oldMaterials[RENAMED[oldKey]] = oldMaterials[oldKey];
      if (oldDisabled[oldKey]) oldDisabled[RENAMED[oldKey]] = true;
    });
    var materials = {};
    F.MATERIAL_ORDER.forEach(function (key) { materials[key] = F.materialParams(oldMaterials, key); });
    var rooms = p.rooms.map(function (r) {
      var base = F.blankRoom(uid);
      var room = Object.assign(base, r);
      room.id = r.id || uid('r');
      room.openings = Array.isArray(r.openings) ? r.openings.map(function (o) {
        var opening = Object.assign(F.makeOpening(o.type === 'door' ? 'door' : 'window', '', '', uid), o, { id: o.id || uid('o') });
        if (opening.replace === 'interior') opening.replace = 'eco';
        return opening;
      }) : [];
      if (r.underlay === undefined) room.underlay = F.roomUnderlay(r);
      if (r.plinth === undefined) room.plinth = F.roomPlinth(r);
      var blank = F.blankRoom(uid);
      room.prep = {
        floor: Object.assign(blank.prep.floor, r.prep && r.prep.floor),
        walls: Object.assign(blank.prep.walls, r.prep && r.prep.walls),
        ceiling: Object.assign(blank.prep.ceiling, r.prep && r.prep.ceiling)
      };
      // счётчики: старые поля «Электрики» переносим в штучные позиции
      room.counts = F.roomCounts(r);
      room.electric = {};
      room.pipes = Object.assign(blank.pipes, r.pipes);
      room.bath = Object.assign(blank.bath, r.bath);
      room.heating = Object.assign(blank.heating, r.heating);
      room.open = Object.assign(blank.open, r.open);
      return room;
    });
    var custom = Array.isArray(p.custom) ? p.custom.map(function (c) {
      return Object.assign({ id: uid('c'), name: '', unit: 'шт.', basis: 'count', quantity: '', rate: '', packSize: '1', reserve: '0', price: '', rooms: null }, c);
    }) : [];
    return {
      id: p.id || uid('p'), name: p.name || '', customer: p.customer || '', rooms: rooms, materials: materials,
      disabled: oldDisabled, custom: custom, bought: Object.assign({}, p.bought), compare: p.compare || null
    };
  }

  /* ---------- Хранилище браузера ---------- */

  function readStorage(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  var saveTimer = null;
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { writeStorage(CURRENT_KEY, state); }, 300);
  }

  function getSaved() {
    var list = readStorage(SAVED_KEY);
    return Array.isArray(list) ? list : [];
  }

  function isSavedVersion() {
    var entry = getSaved().find(function (s) { return s.id === state.id; });
    return !!entry && JSON.stringify(entry.project) === JSON.stringify(state);
  }

  function hasContent() {
    return state.rooms.some(function (r) { return F.toNumber(r.length) > 0 || F.toNumber(r.width) > 0; }) || state.custom.length > 0;
  }

  /* ================================================================== *
   * Кусочки разметки
   * ================================================================== */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function inputValue(v) {
    if (typeof v === 'number') return String(v).replace('.', ',');
    return v === undefined || v === null ? '' : String(v);
  }

  function isInvalidNumber(v) {
    var s = String(v === undefined || v === null ? '' : v).trim();
    if (s === '') return false;
    var n = F.parseNumber(s);
    return !isFinite(n) || n < 0;
  }

  function formatDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function optionLabel(options, value) {
    var o = options.find(function (x) { return x[0] === value; });
    return o ? o[1] : 'нет';
  }

  /** Поле ввода. opts: { mode: 'decimal'|'numeric', text: true, placeholder } */
  function inputHTML(attrs, value, opts) {
    opts = opts || {};
    var mode = opts.text ? '' : ' inputmode="' + (opts.mode || 'decimal') + '"';
    var invalid = !opts.text && isInvalidNumber(value) ? ' class="invalid"' : '';
    return '<input type="text"' + mode + ' autocomplete="off" enterkeyhint="next" ' + attrs +
      ' value="' + esc(inputValue(value)) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + invalid + '>';
  }

  function fieldHTML(label, input, unit, cls) {
    return '<label class="field' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' +
      (unit ? '<span class="unit-input">' + input + '<em>' + unit + '</em></span>' : input) + '</label>';
  }

  function selectHTML(options, value, attrs) {
    return '<select class="select" ' + attrs + '>' + options.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  function chipHTML(label, attrs, checked) {
    return '<label class="chip"><input type="checkbox" ' + attrs + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  /* ================================================================== *
   * Помещения
   * ================================================================== */

  function findRoom(id) {
    return state.rooms.find(function (r) { return r.id === id; });
  }

  function openingHTML(o) {
    var isWindow = o.type !== 'door';
    var extra = isWindow
      ? '<div class="opening-extra"><label class="inline-select"><span>Замена</span>' +
          selectHTML(WINDOW_REPLACE, o.replace, 'data-ofield="replace" aria-label="Замена окна"') + '</label>' +
          chipHTML('подоконник', 'data-ochip="sill"', o.sill) + chipHTML('откосы', 'data-ochip="slopes"', o.slopes) + '</div>'
      : '<div class="opening-extra"><label class="inline-select"><span>Замена</span>' +
          selectHTML(DOOR_REPLACE, o.replace, 'data-ofield="replace" aria-label="Замена двери"') + '</label></div>';
    return '<div class="opening" data-opening="' + o.id + '">' +
      '<div class="opening-main">' +
        '<label class="field"><span>Проём</span>' + selectHTML([['window', 'Окно'], ['door', 'Дверь']], o.type, 'data-ofield="type"') + '</label>' +
        fieldHTML('Ширина', inputHTML('data-ofield="width"', o.width)) +
        fieldHTML('Высота', inputHTML('data-ofield="height"', o.height)) +
        fieldHTML('Шт.', inputHTML('data-ofield="count"', o.count, { mode: 'numeric' })) +
        '<button type="button" class="icon-btn danger" data-action="delete-opening" aria-label="Удалить проём">' + ICONS.close + '</button>' +
      '</div>' + extra + '</div>';
  }

  function surfaceHTML(title, options, value, field, chips, prepKey, prep, extra) {
    return '<div class="surface"><div class="surface-row"><b>' + title + '</b>' +
      selectHTML(options, value, 'data-field="' + field + '" aria-label="' + title + '"') + '</div>' + (extra || '') +
      '<div class="chips">' + chips.map(function (c) {
        return chipHTML(c[1], 'data-prep="' + prepKey + '.' + c[0] + '"', prep[c[0]]);
      }).join('') + '</div></div>';
  }

  function sectionHTML(room, key, title, body) {
    return '<details class="sec" data-sec="' + key + '"' + (room.open[key] ? ' open' : '') + '>' +
      '<summary><span class="sec-icon" aria-hidden="true">' + ICONS[key] + '</span><span class="sec-title">' + title + '</span>' +
      '<span class="sec-sum" data-sec-sum="' + key + '"></span></summary>' +
      '<div class="sec-body">' + body + '</div></details>';
  }

  /* ---------- Счётчики штучных позиций ---------- */

  function itemRowHTML(key, value) {
    var label = ITEM_LABELS[key] || F.MATERIAL_TITLES[key];
    return '<div class="item-row" data-item="' + key + '"><span class="item-name">' + esc(label) + '</span>' +
      '<div class="stepper">' +
        '<button type="button" class="step" data-action="step" data-delta="-1" aria-label="Меньше: ' + esc(label) + '">−</button>' +
        '<input type="text" inputmode="decimal" autocomplete="off" data-count="' + key + '" value="' + esc(inputValue(value)) + '" aria-label="' + esc(label) + ', количество">' +
        '<button type="button" class="step" data-action="step" data-delta="1" aria-label="Больше: ' + esc(label) + '">+</button>' +
      '</div></div>';
  }

  function itemsHTML(room, groups) {
    var rows = [];
    groups.forEach(function (g) {
      g.items.forEach(function (it) {
        if (F.toNumber(room.counts[it[0]]) > 0 || room.counts[it[0]] === '') rows.push(itemRowHTML(it[0], room.counts[it[0]]));
      });
    });
    return rows.length ? rows.join('') : '<p class="items-empty">Пока ничего — добавьте кнопками ниже.</p>';
  }

  function adderHTML(groups, kind) {
    return '<div class="adder" data-adder="' + kind + '">' + groups.map(function (g) {
      return '<div class="adder-group"><div class="adder-title">' + g.title + '</div><div class="chips chips-wide">' +
        g.items.map(function (it) {
          return '<button type="button" class="chip-btn" data-action="add-item" data-key="' + it[0] + '">+ ' + esc(it[1]) + '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  }

  function hasBath(room) {
    return BATH_KEYS.some(function (k) { return F.toNumber(room.counts[k]) > 0; });
  }

  function bathHTML(room) {
    if (!hasBath(room)) return '';
    var b = room.bath;
    return '<div class="bath-box"><div class="subhead">Ванна <span class="muted small">— плитка за ней не кладётся</span></div>' +
      '<div class="grid3">' +
        fieldHTML('Длина, м', inputHTML('data-bath="length"', b.length)) +
        fieldHTML('Ширина, м', inputHTML('data-bath="width"', b.width)) +
        fieldHTML('Высота борта', inputHTML('data-bath="height"', b.height)) +
      '</div><div class="heat-row">' +
        selectHTML(BATH_PLACE_OPTIONS, b.place, 'data-bath="place" aria-label="Где стоит ванна"') +
        chipHTML('экран в плитке', 'data-bath-screen="1"', b.screen) +
      '</div></div>';
  }

  function plumbingBodyHTML(room) {
    return '<div class="items" data-items="plumbing">' + itemsHTML(room, PLUMBING_GROUPS) + '</div>' +
      '<div data-bath-box>' + bathHTML(room) + '</div>' +
      adderHTML(PLUMBING_GROUPS, 'plumbing') +
      '<div class="pipes-row"><label class="inline-select"><span>Водопровод</span>' +
        selectHTML(WATER_PIPE_OPTIONS, room.pipes.water, 'data-pipe="water" aria-label="Трубы водопровода"') + '</label>' +
        chipHTML('канализация', 'data-pipe-sewer="1"', room.pipes.sewer !== false) + '</div>' +
      '<p class="small muted">Смесители, сифоны, подводка и краны добавятся сами. Трубы — по числу подводок и расстоянию до стояка.</p>';
  }

  function electricBodyHTML(room) {
    return '<div class="items" data-items="electric">' + itemsHTML(room, ELECTRIC_GROUPS) + '</div>' +
      adderHTML(ELECTRIC_GROUPS, 'electric') +
      '<p class="small muted">В шаблонах точки подставлены примерно — поправьте по проекту. Кабель, подрозетники, автоматы и щит посчитаются сами.</p>';
  }

  function roomHTML(room) {
    var openings = room.openings.map(openingHTML).join('') +
      '<div class="row-btns">' +
        '<button type="button" class="btn btn-small" data-action="add-window">+ Окно</button>' +
        '<button type="button" class="btn btn-small" data-action="add-door">+ Дверь</button>' +
      '</div>';
    var floorExtra = room.floor === 'none' ? '' :
      '<div class="sub-selects">' +
        (UNDERLAY_FLOORS[room.floor] ? '<label class="inline-select"><span>Подложка</span>' +
          selectHTML(UNDERLAY_OPTIONS, room.underlay, 'data-field="underlay" aria-label="Подложка"') + '</label>' : '') +
        '<label class="inline-select"><span>Плинтус</span>' + selectHTML(PLINTH_OPTIONS, room.plinth, 'data-field="plinth" aria-label="Плинтус"') + '</label>' +
      '</div>';
    var finish =
      surfaceHTML('Пол', FLOOR_OPTIONS, room.floor, 'floor', FLOOR_CHIPS, 'floor', room.prep.floor, floorExtra) +
      surfaceHTML('Стены', WALL_OPTIONS, room.walls, 'walls', WALL_CHIPS, 'walls', room.prep.walls) +
      surfaceHTML('Потолок', CEILING_OPTIONS, room.ceiling, 'ceiling', CEILING_CHIPS, 'ceiling', room.prep.ceiling);
    var h = room.heating;
    var heating = '<div class="heat-row">' + chipHTML('радиаторы (по окнам)', 'data-heat="radiators"', h.radiators) +
        (h.radiators ? selectHTML(RADIATOR_OPTIONS, h.radiatorType, 'data-hfield="radiatorType" aria-label="Вид радиаторов"') : '') + '</div>' +
      '<div class="heat-row">' + chipHTML('тёплый пол', 'data-heat="floor"', h.floor) +
        (h.floor ? selectHTML(FLOOR_HEAT_OPTIONS, h.floorType, 'data-hfield="floorType" aria-label="Вид тёплого пола"') : '') + '</div>' +
      '<p class="small muted">Отмечайте, если радиаторы или тёплый пол ставятся заново.</p>';

    return '<section class="card room' + (room.collapsed ? ' collapsed' : '') + '" data-room="' + room.id + '">' +
      '<div class="room-head">' +
        '<input class="room-name" type="text" data-field="name" value="' + esc(room.name) + '" aria-label="Название помещения" autocomplete="off" enterkeyhint="next">' +
        '<span class="area-badge" data-area></span>' +
        '<button type="button" class="icon-btn" data-action="copy-room" aria-label="Копировать помещение" title="Копировать">' + ICONS.copy + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-room" aria-label="Удалить помещение" title="Удалить">' + ICONS.trash + '</button>' +
        '<button type="button" class="icon-btn toggle" data-action="toggle-room" aria-label="Свернуть или развернуть" title="Свернуть">' + ICONS.chevron + '</button>' +
      '</div>' +
      '<div class="room-body">' +
        '<div class="grid3">' +
          fieldHTML('Длина, м', inputHTML('data-field="length"', room.length)) +
          fieldHTML('Ширина, м', inputHTML('data-field="width"', room.width)) +
          fieldHTML('Высота, м', inputHTML('data-field="height"', room.height)) +
        '</div>' +
        sectionHTML(room, 'openings', 'Окна и двери', openings) +
        sectionHTML(room, 'finish', 'Отделка', finish) +
        sectionHTML(room, 'electric', 'Электрика', electricBodyHTML(room)) +
        sectionHTML(room, 'plumbing', 'Сантехника', plumbingBodyHTML(room)) +
        sectionHTML(room, 'heating', 'Отопление', heating) +
      '</div>' +
      '<div class="room-summary" data-room-summary></div>' +
      '</section>';
  }

  function renderRooms() {
    var box = document.getElementById('rooms');
    var toolbar = state.rooms.length > 1
      ? '<div class="rooms-toolbar"><span class="muted small">' + count(state.rooms.length, ['помещение', 'помещения', 'помещений']) + '</span>' +
        '<button type="button" class="link-btn" data-action="collapse-all">' +
        (state.rooms.every(function (r) { return r.collapsed; }) ? 'Развернуть все' : 'Свернуть все') + '</button></div>'
      : '';
    box.innerHTML = toolbar + (state.rooms.length
      ? state.rooms.map(roomHTML).join('')
      : '<div class="card empty">Помещений пока нет — выберите шаблон ниже или типовую квартиру.</div>');
  }

  function renderPresets() {
    document.getElementById('presets').innerHTML = PRESET_ORDER.map(function (k) {
      return '<button type="button" class="btn preset" data-action="add-room" data-preset="' + k + '">+ ' + F.ROOM_PRESETS[k].label + '</button>';
    }).join('');
    document.getElementById('apartments').innerHTML = Object.keys(F.APARTMENTS).map(function (k) {
      var a = F.APARTMENTS[k];
      return '<button type="button" class="apt-btn" data-action="apartment" data-key="' + k + '"><b>' + a.title + '</b><span>' + a.note + '</span></button>';
    }).join('');
  }

  /** Короткие подписи в заголовках разделов. */
  function sectionSummaries(room) {
    var openings = room.openings.map(function (o) {
      var c = F.toNumber(o.count);
      var s = (o.type === 'door' ? 'дверь ' : 'окно ') + inputValue(o.width) + '×' + inputValue(o.height) + (c > 1 ? ' ×' + fmt(c, 0) : '');
      var replace = o.type === 'door' ? DOOR_REPLACE : WINDOW_REPLACE;
      if (o.replace && o.replace !== 'none') s += ' (' + optionLabel(replace, o.replace).toLowerCase() + ')';
      return s;
    });
    function itemsSummary(groups) {
      var parts = [];
      groups.forEach(function (g) {
        g.items.forEach(function (it) {
          var n = F.toNumber(room.counts[it[0]]);
          if (n > 0) parts.push(it[1].toLowerCase().replace(', м', '') + ' ' + fmt(n) + (it[0] === 'elLedStrip' ? ' м' : ''));
        });
      });
      return parts;
    }
    var el = itemsSummary(ELECTRIC_GROUPS);
    var pl = itemsSummary(PLUMBING_GROUPS);
    var heat = [];
    if (room.heating.radiators) heat.push('радиаторы: ' + optionLabel(RADIATOR_OPTIONS, room.heating.radiatorType).toLowerCase());
    if (room.heating.floor) heat.push('тёплый пол: ' + optionLabel(FLOOR_HEAT_OPTIONS, room.heating.floorType).toLowerCase().replace(/ \(.*\)/, ''));
    return {
      openings: openings.length ? openings.join(' · ') : 'нет',
      finish: [optionLabel(FLOOR_OPTIONS, room.floor), optionLabel(WALL_OPTIONS, room.walls), optionLabel(CEILING_OPTIONS, room.ceiling)]
        .map(function (s) { return s.toLowerCase(); }).join(' · '),
      electric: el.length ? el.join(' · ') : 'не заполнено',
      plumbing: pl.length ? pl.join(' · ') : 'нет',
      heating: heat.length ? heat.join(' · ') : 'не меняем'
    };
  }

  function roomSummaryHTML(r) {
    var g = r.geometry;
    var parts = [];
    if (g.wallGross > 0) parts.push('Стены <b>' + fmt(g.wallNet) + ' м²</b>' + (g.openingsArea > 0 ? ' (без проёмов ' + fmt(g.openingsArea) + ')' : ''));
    if (g.perimeter > 0) parts.push('Периметр ' + fmt(g.perimeter) + ' м');
    if (r.cost > 0) parts.push('≈ <b>' + money(r.cost) + '</b>');
    var html = parts.join(' · ');
    var unpriced = [];
    (r.surfaces || []).forEach(function (s) {
      s.materials.forEach(function (m) { if (!m.priced && unpriced.indexOf(m.title) < 0) unpriced.push(m.title); });
    });
    if (unpriced.length) {
      html += (html ? '<br>' : '') + '<button type="button" class="no-price" data-action="goto-prices">Без цены, не в сумме: ' +
        esc(unpriced.slice(0, 4).join(', ').toLowerCase()) + (unpriced.length > 4 ? ' и ещё ' + (unpriced.length - 4) : '') + ' → указать цены</button>';
    }
    if (g.warnings.length) html += (html ? '<br>' : '') + '<span class="warn">⚠ ' + esc(g.warnings.join('; ')) + '</span>';
    return html || '<span class="muted">Введите размеры</span>';
  }

  function updateRoomSummaries() {
    calc.rooms.forEach(function (r) {
      var card = document.querySelector('[data-room="' + r.id + '"]');
      if (!card) return;
      card.querySelector('[data-room-summary]').innerHTML = roomSummaryHTML(r);
      var area = card.querySelector('[data-area]');
      area.textContent = r.geometry.floorArea > 0 ? fmt(r.geometry.floorArea) + ' м²' : '';
      var sums = sectionSummaries(findRoom(r.id));
      Object.keys(sums).forEach(function (k) {
        var el = card.querySelector('[data-sec-sum="' + k + '"]');
        if (el) el.textContent = sums[k];
      });
    });
  }

  /** Перерисовать только список штучных позиций (и блок ванны) — без потери открытых разделов. */
  function renderItems(roomEl, room, kind) {
    var box = roomEl.querySelector('[data-items="' + kind + '"]');
    box.innerHTML = itemsHTML(room, kind === 'electric' ? ELECTRIC_GROUPS : PLUMBING_GROUPS);
    if (kind === 'plumbing') roomEl.querySelector('[data-bath-box]').innerHTML = bathHTML(room);
  }

  /* ================================================================== *
   * Материалы
   * ================================================================== */

  function materialFieldHTML(key, fd, params) {
    var value = params[fd.key];
    var attrs = 'data-mat="' + key + '" data-param="' + fd.key + '"';
    if (fd.checkbox) {
      return '<label class="check-field"><input type="checkbox" ' + attrs + (value ? ' checked' : '') + '>' + fd.label + '</label>';
    }
    if (fd.select) {
      return '<label class="field"><span>' + fd.label + '</span>' + selectHTML(fd.select, value, attrs) + '</label>';
    }
    var label = fd.label + (fd.typical ? ' <i class="typical">типовое</i>' : '');
    return fieldHTML(label, inputHTML(attrs, value, { text: fd.text }), fd.unit, fd.wide ? 'wide' : '');
  }

  function priceFieldHTML(key, params) {
    var ui = UI[key];
    var input = inputHTML('data-mat="' + key + '" data-param="price"', params.price ? params.price : '', { placeholder: '0' });
    if (ui.priceUnits) {
      return fieldHTML('Цена', input, '₽') +
        '<label class="field"><span>Цена указана</span>' +
        selectHTML(ui.priceUnits, params.priceUnit, 'data-mat="' + key + '" data-param="priceUnit"') + '</label>';
    }
    return fieldHTML(ui.priceLabel, input, '₽');
  }

  function materialCardHTML(key) {
    var params = state.materials[key];
    var ui = UI[key];
    var fields = ui.fields.map(function (fd) { return materialFieldHTML(key, fd, params); }).join('');
    if ('reserve' in F.DEFAULT_MATERIALS[key]) {
      var tile = F.MATERIALS[key].kind === 'tile';
      fields += materialFieldHTML(key, f('reserve', tile ? 'Запас на бой' : 'Запас', '%', true), params);
    }
    return '<details class="card material" data-material="' + key + '">' +
      '<summary><span><span class="mat-title">' + esc(F.MATERIAL_TITLES[key]) + '</span><br>' +
      '<span class="mat-usage" data-mat-usage="' + key + '"></span></span></summary>' +
      '<label class="check-field enable"><input type="checkbox" data-enable="' + key + '"' + (state.disabled[key] ? '' : ' checked') + '>Учитывать в расчёте</label>' +
      '<div class="grid2">' + fields + priceFieldHTML(key, params) + '</div>' +
      '<p class="mat-hint">' + ui.hint + '</p>' +
      '</details>';
  }

  function customCardHTML(c, isNew) {
    var isCount = c.basis === 'count';
    var roomChips = '';
    if (!isCount) {
      var all = !Array.isArray(c.rooms);
      roomChips = '<div class="subhead small-head">В каких помещениях</div><div class="chips chips-wide">' +
        state.rooms.map(function (r) {
          var on = all || c.rooms.indexOf(r.id) >= 0;
          return chipHTML(esc(r.name || 'без названия'), 'data-croom="' + r.id + '"', on);
        }).join('') + '</div>';
    }
    var unit = esc(c.unit || 'шт.');
    return '<details class="card material custom" data-custom="' + c.id + '"' + (isNew || openCustoms[c.id] ? ' open' : '') + '>' +
      '<summary><span><span class="mat-title">' + esc(c.name || 'Новая позиция') + '</span><br>' +
      '<span class="mat-usage" data-custom-usage="' + c.id + '"></span></span></summary>' +
      '<div class="grid2">' +
        fieldHTML('Название', inputHTML('data-cfield="name"', c.name, { text: true, placeholder: 'Например: коллектор' }), '', 'wide') +
        '<label class="field"><span>Считать от</span>' + selectHTML(CUSTOM_BASIS, c.basis, 'data-cfield="basis"') + '</label>' +
        fieldHTML('Единица', inputHTML('data-cfield="unit"', c.unit, { text: true, placeholder: 'шт.' })) +
        (isCount
          ? fieldHTML('Количество', inputHTML('data-cfield="quantity"', c.quantity, { placeholder: '0' }), unit)
          : fieldHTML('Расход на 1 ' + BASIS_UNIT[c.basis], inputHTML('data-cfield="rate"', c.rate, { placeholder: '0' }), unit)) +
        fieldHTML('В упаковке', inputHTML('data-cfield="packSize"', c.packSize, { placeholder: '1' }), unit) +
        fieldHTML('Запас', inputHTML('data-cfield="reserve"', c.reserve, { placeholder: '0' }), '%') +
        fieldHTML('Цена упаковки (штуки)', inputHTML('data-cfield="price"', c.price, { placeholder: '0' }), '₽') +
      '</div>' + roomChips +
      '<div class="actions"><button type="button" class="btn btn-small danger-text" data-action="delete-custom">Удалить позицию</button></div>' +
      '</details>';
  }

  function quickAddHTML() {
    return '<div class="card quick"><h3 class="card-title">Быстро добавить</h3>' +
      QUICK_ITEMS.map(function (g) {
        return '<div class="quick-group"><div class="small muted">' + g.group + '</div><div class="chips chips-wide">' +
          g.items.map(function (it) {
            return '<button type="button" class="chip-btn" data-action="quick-add" data-name="' + esc(it[0]) + '" data-unit="' + esc(it[1]) + '">+ ' + esc(it[0]) + '</button>';
          }).join('') + '</div></div>';
      }).join('') +
      '<button type="button" class="btn btn-wide" data-action="add-custom">+ Своя позиция</button></div>';
  }

  function isUsed(key) {
    return calc.totals[key] > 0;
  }

  function renderMaterials(newCustomId) {
    var usedCount = F.MATERIAL_ORDER.filter(isUsed).length;
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.filter === materialsFilter);
      b.setAttribute('aria-pressed', b.dataset.filter === materialsFilter ? 'true' : 'false');
    });
    document.getElementById('count-used').textContent = usedCount;
    document.getElementById('count-all').textContent = F.MATERIAL_ORDER.length;

    var html = F.CATEGORIES.filter(function (c) { return c.key !== 'custom'; }).map(function (cat) {
      var keys = F.MATERIAL_ORDER.filter(function (k) {
        return F.MATERIALS[k].category === cat.key && (materialsFilter === 'all' || isUsed(k));
      });
      if (!keys.length) return '';
      return '<h2 class="cat-title">' + cat.title + '</h2>' + keys.map(materialCardHTML).join('');
    }).join('');
    if (!html) {
      html = '<div class="card empty">Пока ни один материал не нужен: выберите отделку в помещениях ' +
        'или нажмите «Все», чтобы заранее ввести цены.</div>';
    }
    html += '<h2 class="cat-title">Свои позиции <span class="muted small">всё, чего нет выше</span></h2>' +
      state.custom.map(function (c) { return customCardHTML(c, c.id === newCustomId); }).join('') + quickAddHTML();
    document.getElementById('materials').innerHTML = html;
    updateMaterialUsage();
  }

  function updateMaterialUsage() {
    var t = E.texts(state, calc);
    F.MATERIAL_ORDER.forEach(function (key) {
      var details = document.querySelector('[data-material="' + key + '"]');
      if (!details) return;
      var m = calc.materials.find(function (x) { return x.key === key; });
      var rooms = calc.rooms.filter(function (r) { return r.areas[key] > 0; }).map(function (r) { return r.name || 'без названия'; });
      var usage = details.querySelector('[data-mat-usage]');
      if (state.disabled[key]) usage.textContent = 'выключен — в расчёт не входит';
      else if (m) usage.textContent = t.buy(m) + (rooms.length ? ' · ' + rooms.join(', ') : ' · на всю квартиру');
      else usage.textContent = 'не выбран ни в одном помещении';
      details.classList.toggle('unused', !m);
      var shouldOpen = openMaterials[key] !== undefined ? openMaterials[key] : !!m && materialsFilter === 'used' && !m.priced;
      if (details.open !== shouldOpen) details.open = shouldOpen;
    });
    state.custom.forEach(function (c) {
      var el = document.querySelector('[data-custom-usage="' + c.id + '"]');
      if (!el) return;
      var m = calc.materials.find(function (x) { return x.key === 'custom:' + c.id; });
      el.textContent = m ? t.buy(m) + (m.priced ? ' · ' + money(m.cost) : '') : 'количество не задано';
      var title = el.parentElement.querySelector('.mat-title');
      if (title) title.textContent = c.name || 'Новая позиция';
    });
  }

  /* ================================================================== *
   * Сравнение вариантов
   * ================================================================== */

  function compareSpec(field) {
    return COMPARE_UI.find(function (x) { return x[0] === field; }) || COMPARE_UI[0];
  }

  /** Настройки сравнения по умолчанию: текущий вариант в комнатах и два следующих. */
  function defaultCompare(field) {
    var spec = compareSpec(field);
    var cf = F.COMPARE_FIELDS[spec[0]];
    var rooms = state.rooms.filter(function (r) { return cf.current(r) !== 'none'; }).map(function (r) { return r.id; });
    var current = rooms.length ? cf.current(findRoom(rooms[0])) : spec[2][0][0];
    var values = spec[2].map(function (o) { return o[0]; });
    var options = [current];
    values.forEach(function (v) { if (options.length < 3 && options.indexOf(v) < 0) options.push(v); });
    return { field: spec[0], rooms: rooms.length ? rooms : null, options: options };
  }

  function compareState() {
    if (!state.compare || !compareSpec(state.compare.field)) state.compare = defaultCompare('floor');
    // убираем удалённые комнаты
    if (Array.isArray(state.compare.rooms)) {
      state.compare.rooms = state.compare.rooms.filter(function (id) { return findRoom(id); });
      if (!state.compare.rooms.length) state.compare.rooms = null;
    }
    return state.compare;
  }

  function renderCompare() {
    var c = compareState();
    var spec = compareSpec(c.field);
    var roomsChips = state.rooms.map(function (r) {
      var on = !Array.isArray(c.rooms) || c.rooms.indexOf(r.id) >= 0;
      return chipHTML(esc(r.name || 'без названия'), 'data-cmp-room="' + r.id + '"', on);
    }).join('');
    var letters = ['A', 'B', 'C'];
    var selects = [0, 1, 2].map(function (i) {
      var opts = (i === 2 ? [['', '— без третьего —']] : []).concat(spec[2]);
      return '<label class="field"><span>Вариант ' + letters[i] + '</span>' +
        selectHTML(opts, c.options[i] || '', 'data-cmp-opt="' + i + '" aria-label="Вариант ' + letters[i] + '"') + '</label>';
    }).join('');
    document.getElementById('compare-form').innerHTML =
      '<label class="field"><span>Что сравниваем</span>' +
        selectHTML(COMPARE_UI.map(function (x) { return [x[0], x[1]]; }), c.field, 'data-cmp="field" aria-label="Что сравниваем"') + '</label>' +
      '<div class="subhead small-head">В каких помещениях</div><div class="chips chips-wide">' + roomsChips + '</div>' +
      '<div class="cmp-selects">' + selects + '</div>';
    renderCompareResults();
  }

  function renderCompareResults() {
    var box = document.getElementById('compare-results');
    if (!box) return;
    var c = compareState();
    var spec = compareSpec(c.field);
    var options = c.options.filter(function (v, i) { return v && c.options.indexOf(v) === i; });
    if (!state.rooms.length) { box.innerHTML = '<div class="card empty">Добавьте помещения — тогда будет что сравнивать.</div>'; return; }
    var res = F.compareVariants(state, c.field, options, Array.isArray(c.rooms) ? c.rooms : null);
    var priced = res.filter(function (r) { return !r.missingPrices; });
    var min = priced.length ? Math.min.apply(null, priced.map(function (r) { return r.cost; })) : null;
    var t = E.texts(state, calc);
    box.innerHTML = res.map(function (r, i) {
      var badge = '';
      if (r.missingPrices) badge = '<span class="cmp-badge warn-badge">нет цен: ' + r.missingPrices + '</span>';
      else if (priced.length > 1 && r.cost === min) badge = '<span class="cmp-badge best">дешевле всего</span>';
      else if (min !== null) badge = '<span class="cmp-badge">+' + money(r.cost - min) + '</span>';
      var items = r.items.map(function (x) {
        var m = x.material;
        return '<li><span>' + esc(m.title) + '<small>' + esc(t.buy(m)) + '</small></span><b>' + (m.priced ? (x.delta >= 0 ? '' : '−') + money(Math.abs(x.delta)) : '—') + '</b></li>';
      }).join('');
      return '<article class="cmp-card">' +
        '<div class="cmp-letter">' + ['A', 'B', 'C'][i] + '</div>' +
        '<h3>' + esc(optionLabel(spec[2], r.option)) + '</h3>' +
        '<div class="cmp-cost">' + money(r.cost) + '</div>' + badge +
        '<ul class="cmp-items">' + (items || '<li><span>Ничего не меняется</span></li>') + '</ul>' +
        '<button type="button" class="btn btn-small" data-action="cmp-apply" data-option="' + r.option + '">Выбрать этот вариант</button>' +
        '</article>';
    }).join('');
  }

  /* ================================================================== *
   * Итог
   * ================================================================== */

  function renderHero() {
    var bought = state.bought;
    var boughtCost = calc.materials.reduce(function (s, m) { return s + (bought[m.key] ? m.cost : 0); }, 0);
    var share = calc.totalCost > 0 ? Math.min(100, Math.round(boughtCost / calc.totalCost * 100)) : 0;
    var area = calc.rooms.reduce(function (s, r) { return s + r.geometry.floorArea; }, 0);
    document.getElementById('hero').innerHTML =
      '<div class="hero-label">Итого по смете</div>' +
      '<div class="hero-total">' + money(calc.totalCost) + '</div>' +
      '<div class="hero-meta">' + count(calc.materials.length, FORMS.item) + ' · ' + count(state.rooms.length, ['помещение', 'помещения', 'помещений']) +
        (area > 0 ? ' · ' + fmt(area) + ' м²' : '') + (area > 0 && calc.totalCost > 0 ? ' · ' + money(calc.totalCost / area) + ' за м²' : '') + '</div>' +
      '<div class="hero-bar" role="img" aria-label="Куплено на ' + share + ' %"><span style="width:' + share + '%"></span></div>' +
      '<div class="hero-bought">Куплено на ' + money(boughtCost) + ' · осталось ' + money(calc.totalCost - boughtCost) + '</div>' +
      (calc.missingPrices ? '<button type="button" class="hero-warn" data-action="goto-prices">Не указаны цены: ' + count(calc.missingPrices, FORMS.item) +
        ' — итог неполный. Указать цены ↓</button>' : '');
  }

  function renderSummary() {
    renderHero();
    var box = document.getElementById('summary');
    if (!calc.materials.length) {
      box.innerHTML = '<div class="card empty">Пока нечего считать: введите размеры помещений и выберите отделку.</div>';
      return;
    }
    var t = E.texts(state, calc);
    var bought = state.bought;
    var groups = E.grouped(calc).map(function (g) {
      var unp = g.items.filter(function (m) { return !m.priced; }).length;
      return '<div class="cat-head"><span>' + g.title + '</span><span>' + money(g.cost) +
        (unp ? ' <small class="cat-unp">+ ' + unp + ' без цены</small>' : '') + '</span></div>' +
        g.items.map(function (m) {
          var lines = t.lines(m);
          lines.push(t.price(m));
          var isBought = !!bought[m.key];
          return '<div class="result-row' + (isBought ? ' bought' : '') + '">' +
            '<label class="buy-check" title="Куплено"><input type="checkbox" data-bought="' + esc(m.key) + '"' + (isBought ? ' checked' : '') +
            ' aria-label="Куплено: ' + esc(m.title) + '"><span></span></label>' +
            '<div class="result-main">' +
              '<div class="result-head"><b>' + esc(m.title) + '</b><span class="result-cost">' + (m.priced ? money(m.cost) : '—') + '</span></div>' +
              '<div class="result-buy">' + esc(t.buy(m)) + '</div>' +
              '<div class="result-lines">' + lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
              (m.errors.length ? '<div class="error small">⚠ ' + esc(m.errors.join('; ')) + '</div>' : '') +
            '</div></div>';
        }).join('');
    }).join('');

    var missing = calc.materials.filter(function (m) { return !m.priced; }).map(function (m) { return m.title; });
    var skipped = calc.skipped.map(function (k) { return F.MATERIAL_TITLES[k]; });

    var roomCards = calc.rooms.map(function (r) {
      var g = r.geometry;
      var surfaces = (r.surfaces || []).filter(function (s) { return s.materials.length; }).map(function (s) {
        return '<details class="surf"><summary><span>' + s.title + '</span><b>' + (s.cost > 0 ? money(s.cost) : '—') + '</b></summary>' +
          '<ul class="surf-items">' + s.materials.map(function (m) {
            return '<li><span>' + esc(m.title) + '<small>' + esc(t.buy(m)) + '</small></span><b>' + (m.priced ? money(m.cost) : '—') + '</b></li>';
          }).join('') + '</ul></details>';
      }).join('');
      return '<div class="room-break">' +
        '<div class="room-break-head"><b>' + esc(r.name || 'Без названия') + '</b><span>' + (r.cost > 0 ? money(r.cost) : '') + '</span></div>' +
        '<div class="muted small">' + fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height) + ' м · пол ' + fmt(g.floorArea) +
          ' м² · стены ' + fmt(g.wallNet) + ' м² · потолок ' + fmt(g.ceilingArea) + ' м²</div>' +
        (surfaces || '<p class="small muted">Отделка не выбрана.</p>') + '</div>';
    }).join('');

    box.innerHTML =
      '<div class="card"><h2 class="card-title">Что купить</h2>' +
        '<p class="small muted">Отмечайте купленное галочкой — полоса вверху покажет, сколько осталось.</p>' +
        groups +
        '<div class="grand-total"><span>Итого</span><span>' + money(calc.totalCost) + '</span></div>' +
        (missing.length ? '<p class="error small">Не указаны цены (' + missing.length + '): ' + esc(missing.join(', ')) +
          '. Введите их на вкладке «Материалы».</p>' : '') +
        (skipped.length ? '<p class="small muted">Выключены и не входят в итог: ' + esc(skipped.join(', ')) + '.</p>' : '') +
        '<p class="small muted">Нормы расхода — типовые значения, проверьте по упаковке.</p>' +
      '</div>' +
      '<div class="card"><h2 class="card-title">По помещениям</h2>' +
        '<p class="small muted">Пол, стены, потолок и инженерия посчитаны раздельно — как если покупать на каждое отдельно, поэтому сумма немного больше общего итога. Щит и свои позиции — только в общем итоге.</p>' +
        roomCards + '</div>';
  }

  /**
   * «Укажите цены»: всё, что посчитано в количестве, но без цены не попало в сумму.
   * Цена вводится прямо здесь (сохраняется по уходу из поля).
   */
  var needSig = null;
  var needHold = false; // пока вводят цены в блоке, не перерисовываем его — иначе пропадёт курсор
  function renderNeedPrices(force) {
    if (needHold && !force) return;
    var box = document.getElementById('need-prices');
    var missing = calc.materials.filter(function (m) { return !m.priced; });
    var sig = missing.map(function (m) { return m.key; }).join('|');
    if (!force && (sig === needSig || box.contains(document.activeElement))) return;
    needSig = sig;
    if (!missing.length) { box.innerHTML = ''; return; }
    var t = E.texts(state, calc);
    box.innerHTML = '<div class="card need-card"><h2 class="card-title" data-need-title>' + needTitle(missing.length) + '</h2>' +
      '<p class="small muted">Количество уже посчитано — без цены позиция не входит в итог. Цены запомнятся и для следующих расчётов.</p>' +
      missing.map(function (m) {
        return '<div class="need-row" data-need="' + esc(m.key) + '">' +
          '<div class="need-info"><b>' + esc(m.title) + '</b><span>' + esc(t.buy(m)) + '</span></div>' +
          '<label class="need-price"><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-inline-price="' + esc(m.key) +
          '" placeholder="цена" aria-label="Цена: ' + esc(m.title) + '"><span>₽ за ' + esc(t.per(m)) + '</span></label></div>';
      }).join('') + '</div>';
  }

  function needTitle(n) {
    return n ? 'Укажите цены: ' + count(n, FORMS.item) + ' пока не в сумме' : 'Все цены указаны ✓';
  }

  function setInlinePrice(input) {
    var key = input.dataset.inlinePrice;
    if (key.indexOf('custom:') === 0) {
      var c = state.custom.find(function (x) { return 'custom:' + x.id === key; });
      if (c) c.price = input.value;
    } else if (state.materials[key]) {
      state.materials[key].price = input.value;
    }
    var row = input.closest('[data-need]');
    if (row) row.classList.toggle('done', F.toNumber(input.value) > 0);
    needHold = true;
    refresh();
    needHold = false;
    var title = document.querySelector('[data-need-title]');
    if (title) title.textContent = needTitle(calc.missingPrices);
  }

  function scrollToPrices() {
    var el = document.getElementById('need-prices');
    if (!el || !el.firstChild) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
    var first = el.querySelector('[data-inline-price]');
    if (first) first.focus({ preventScroll: true });
  }

  function renderHeader() {
    document.getElementById('header-total').textContent = money(calc.totalCost);
    document.getElementById('header-note').textContent = calc.missingPrices > 0 ? 'нет цен: ' + calc.missingPrices : '';
  }

  function renderSaved() {
    var list = getSaved().slice().sort(function (a, b) { return b.savedAt - a.savedAt; });
    var box = document.getElementById('saved-list');
    if (!list.length) {
      box.innerHTML = '<p class="small muted">Пока ничего не сохранено.</p>';
      return;
    }
    box.innerHTML = list.map(function (s) {
      var rooms = (s.project.rooms || []).length;
      return '<div class="saved-item' + (s.id === state.id ? ' current' : '') + '" data-saved="' + esc(s.id) + '">' +
        '<div class="saved-info"><b>' + esc(s.name) + '</b><span>' + formatDate(s.savedAt) + ' · ' + count(rooms, FORMS.room) +
        (s.total ? ' · ' + money(s.total) : '') + '</span></div>' +
        '<button type="button" class="btn btn-small" data-action="open-saved">Открыть</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-saved" aria-label="Удалить расчёт">' + ICONS.trash + '</button>' +
        '</div>';
    }).join('');
  }

  /* ================================================================== *
   * Смета для заказчика: печать, PDF, Excel
   * ================================================================== */

  function estimateModel() {
    return E.estimateModel(state, calc, {
      company: settings.company, customer: state.customer, details: settings.details !== false
    });
  }

  /** Версия для печати — из той же модели, что и PDF. */
  function renderPrint() {
    var m = estimateModel();
    var meta = m.meta.map(function (x) { return '<div><span>' + esc(x[0]) + '</span> ' + esc(x[1]) + '</div>'; }).join('');
    var rooms = m.rooms.rows.length
      ? '<h2>Помещения</h2><table class="room-table"><thead><tr>' + m.rooms.columns.map(function (c, i) {
          return '<th' + (i > 1 ? ' class="num"' : '') + '>' + esc(c) + '</th>';
        }).join('') + '</tr></thead><tbody>' + m.rooms.rows.map(function (row) {
          return '<tr>' + row.map(function (c, i) { return '<td' + (i > 1 ? ' class="num"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>'
      : '';
    var groups = m.groups.map(function (g) {
      return '<tr class="cat-row"><td colspan="3">' + esc(g.title) + '</td><td class="num">' + esc(g.total) + '</td></tr>' +
        g.items.map(function (it) {
          return '<tr><td><b>' + esc(it.title) + '</b>' + (it.details ? '<div class="calc">' + esc(it.details) + '</div>' : '') + '</td>' +
            '<td>' + esc(it.qty) + '</td><td class="num">' + esc(it.price) + '</td><td class="num">' + esc(it.cost) + '</td></tr>';
        }).join('');
    }).join('');
    document.getElementById('print').innerHTML =
      (m.company.name ? '<div class="company"><b>' + esc(m.company.name) + '</b>' + (m.company.phone ? ' · ' + esc(m.company.phone) : '') + '</div>' : '') +
      '<h1>' + esc(m.title) + '</h1><div class="meta">' + meta + '</div>' +
      '<div class="sum-box"><span>Итого по смете</span><b>' + esc(m.total) + '</b>' + (m.summary.note ? '<em>' + esc(m.summary.note) + '</em>' : '') + '</div>' +
      rooms +
      (groups ? '<h2>Материалы</h2><table class="mat-table"><thead><tr><th>Материал</th><th>Количество</th><th class="num">Цена</th><th class="num">Сумма</th></tr></thead>' +
        '<tbody>' + groups + '</tbody><tfoot><tr><td colspan="3">' + esc(m.totalLabel) + '</td><td class="num">' + esc(m.total) + '</td></tr></tfoot></table>' : '') +
      '<ul class="footnote">' + m.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      (m.signatures.length ? '<div class="signs">' + m.signatures.map(function (s) {
        return '<div>' + esc(s[0]) + ' ____________________ / подпись /</div>';
      }).join('') + '</div>' : '');
  }

  /** Сохранить файл: на обычном сайте — скачивание, на странице claude.ai — через разрешение на скачивание. */
  function saveFile(filename, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type });
    if (EMBED) {
      // на странице claude.ai обычная ссылка на скачивание не работает — только через разрешение
      if (!(window.claude && window.claude.use)) return Promise.reject({ code: 'unavailable' });
      return window.claude.use('downloads').then(function (d) {
        if (!d) throw { code: 'unavailable' };
        return d.save({ filename: filename, data: blob });
      });
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return Promise.resolve({ status: 'saved' });
  }

  function saveError(err) {
    var code = err && err.code;
    if (code === 'declined') toast('Сохранение отменено');
    else if (code === 'rate_limited') toast('Подождите — окно сохранения уже открыто');
    else toast('Здесь сохранить файл нельзя. Откройте калькулятор на сайте.');
  }

  /**
   * PDF рисуется около секунды. Скачивание запускаем отдельным нажатием «Сохранить PDF»:
   * браузеры (особенно на iPhone) разрешают сохранять файл только сразу после нажатия.
   */
  function exportPdf(btn) {
    if (!calc.materials.length) { toast('Сначала введите помещения'); return; }
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Готовлю PDF…';
    var name = E.fileName(state, 'pdf');
    PDF.render(estimateModel(), { accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-print').trim() || '#c2410c' })
      .then(function (blob) {
        openSheet('Смета готова', '<p>' + esc(name) + ' · ' + fmt(blob.size / 1024, 0) + ' КБ</p>', [
          { label: 'Закрыть' },
          { label: 'Сохранить PDF', primary: true, action: function () {
            saveFile(name, blob, 'application/pdf').then(function (r) { if (r && r.status === 'saved') toast('PDF сохранён'); }, saveError);
          } }
        ]);
      }, function () { toast('Не получилось подготовить PDF'); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }

  function exportCsv() {
    if (!calc.materials.length) { toast('Сначала введите помещения'); return; }
    saveFile(E.fileName(state, 'csv'), E.toCSV(state, calc, { customer: state.customer }), 'text/csv;charset=utf-8')
      .then(function (r) { if (r && r.status === 'saved') toast('Файл для Excel сохранён'); }, saveError);
  }

  /* ================================================================== *
   * Пересчёт
   * ================================================================== */

  function refresh() {
    calc = F.calculateProject(state);
    renderHeader();
    updateRoomSummaries();
    updateMaterialUsage();
    renderSummary();
    renderNeedPrices(false);
    if (currentTab() === 'compare') renderCompareResults();
    scheduleAutosave();
  }

  function renderAll() {
    calc = F.calculateProject(state);
    document.getElementById('project-name').value = state.name || '';
    document.getElementById('project-customer').value = state.customer || '';
    renderRooms();
    renderMaterials();
    renderSaved();
    refresh();
  }

  /* ================================================================== *
   * События
   * ================================================================== */

  function currentTab() {
    var t = document.querySelector('.tab.active');
    return t ? t.dataset.tab : 'rooms';
  }

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === name);
      t.setAttribute('aria-current', t.dataset.tab === name ? 'page' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (name === 'materials') renderMaterials();
    if (name === 'compare') renderCompare();
    if (name === 'summary') { renderSaved(); renderNeedPrices(true); }
    window.scrollTo(0, 0);
  }

  var toastTimer = null;
  var toastAction = null;
  function toast(text, actionLabel, action) {
    var el = document.getElementById('toast');
    el.innerHTML = '<span>' + esc(text) + '</span>' + (actionLabel ? '<button type="button" class="toast-btn" data-action="toast-action">' + esc(actionLabel) + '</button>' : '');
    el.classList.add('show');
    el.classList.toggle('with-action', !!actionLabel);
    toastAction = action || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); toastAction = null; }, actionLabel ? 6000 : 2400);
  }

  /* ---------- Окно внутри страницы (вместо системных confirm/prompt) ---------- */

  var sheetButtons = [];
  function openSheet(title, bodyHtml, buttons) {
    sheetButtons = buttons;
    var el = document.getElementById('sheet');
    document.getElementById('sheet-title').textContent = title;
    document.getElementById('sheet-body').innerHTML = bodyHtml;
    document.getElementById('sheet-actions').innerHTML = buttons.map(function (b, i) {
      return '<button type="button" class="btn' + (b.primary ? ' btn-primary' : '') + '" data-action="sheet-btn" data-index="' + i + '">' + esc(b.label) + '</button>';
    }).join('');
    el.hidden = false;
    var focus = el.querySelector('.btn-primary') || el.querySelector('.btn');
    if (focus) focus.focus();
  }

  function closeSheet() {
    document.getElementById('sheet').hidden = true;
    sheetButtons = [];
  }

  function askConfirm(title, text, okLabel, onOk) {
    openSheet(title, '<p>' + esc(text) + '</p>', [{ label: 'Отмена' }, { label: okLabel, primary: true, action: onOk }]);
  }

  /** Перед заменой текущего расчёта: если он не сохранён — спросить. */
  function withLeaveCheck(next) {
    if (!hasContent() || isSavedVersion()) { next(); return; }
    openSheet('Текущий расчёт не сохранён', '<p>Сохранить его в списке, прежде чем продолжить?</p>', [
      { label: 'Отмена' },
      { label: 'Не сохранять', action: next },
      { label: 'Сохранить', primary: true, action: function () { saveCurrent(); next(); } }
    ]);
  }

  function toggleInvalid(t) {
    if (t.type === 'text' && t.inputMode && (t.inputMode === 'decimal' || t.inputMode === 'numeric')) {
      t.classList.toggle('invalid', isInvalidNumber(t.value));
    }
  }

  function onInput(e) {
    var t = e.target;
    var d = t.dataset;
    toggleInvalid(t);

    if (d.project) { state[d.project] = t.value; scheduleAutosave(); return; }
    if (d.setting) {
      if (d.setting === 'details') settings.details = t.checked;
      else settings.company[d.setting] = t.value;
      writeStorage(SETTINGS_KEY, settings);
      return;
    }
    if (d.bought) {
      if (t.checked) state.bought[d.bought] = true; else delete state.bought[d.bought];
      refresh();
      return;
    }
    if (d.enable) {
      if (t.checked) delete state.disabled[d.enable]; else state.disabled[d.enable] = true;
      refresh();
      return;
    }
    if (d.mat && d.param) {
      state.materials[d.mat][d.param] = t.type === 'checkbox' ? t.checked : t.value;
      refresh();
      return;
    }
    if (d.cmp === 'field') {
      state.compare = defaultCompare(t.value);
      renderCompare();
      scheduleAutosave();
      return;
    }
    if (d.cmpOpt !== undefined) {
      compareState().options[Number(d.cmpOpt)] = t.value;
      renderCompareResults();
      scheduleAutosave();
      return;
    }
    if (d.cmpRoom) {
      var c = compareState();
      var ids = Array.isArray(c.rooms) ? c.rooms.slice() : state.rooms.map(function (r) { return r.id; });
      if (t.checked) { if (ids.indexOf(d.cmpRoom) < 0) ids.push(d.cmpRoom); } else ids = ids.filter(function (x) { return x !== d.cmpRoom; });
      c.rooms = ids.length === state.rooms.length ? null : ids;
      renderCompareResults();
      scheduleAutosave();
      return;
    }

    var customEl = t.closest('[data-custom]');
    if (customEl) {
      var cu = state.custom.find(function (x) { return x.id === customEl.dataset.custom; });
      if (!cu) return;
      if (d.cfield) {
        cu[d.cfield] = t.value;
        if (d.cfield === 'basis' && e.type === 'change') { refresh(); renderMaterials(); openCustom(cu.id); return; }
        if (d.cfield === 'unit') {
          customEl.querySelectorAll('.unit-input em').forEach(function (em) {
            if (em.textContent !== '%' && em.textContent !== '₽') em.textContent = t.value || 'шт.';
          });
        }
      } else if (d.croom) {
        var rids = Array.isArray(cu.rooms) ? cu.rooms.slice() : state.rooms.map(function (r) { return r.id; });
        if (t.checked) { if (rids.indexOf(d.croom) < 0) rids.push(d.croom); } else rids = rids.filter(function (x) { return x !== d.croom; });
        cu.rooms = rids.length === state.rooms.length ? null : rids;
      }
      refresh();
      return;
    }

    var roomEl = t.closest('[data-room]');
    if (!roomEl) return;
    var room = findRoom(roomEl.dataset.room);
    if (!room) return;

    if (d.prep) {
      var path = d.prep.split('.');
      room.prep[path[0]][path[1]] = t.checked;
    } else if (d.heat) {
      room.heating[d.heat] = t.checked;
      renderRooms();
    } else if (d.hfield) {
      room.heating[d.hfield] = t.value;
    } else if (d.count) {
      room.counts[d.count] = t.value;
    } else if (d.bath) {
      room.bath[d.bath] = t.value;
    } else if (d.bathScreen) {
      room.bath.screen = t.checked;
    } else if (d.pipe) {
      room.pipes[d.pipe] = t.value;
    } else if (d.pipeSewer) {
      room.pipes.sewer = t.checked;
    } else if (d.ofield || d.ochip) {
      var oEl = t.closest('[data-opening]');
      var opening = room.openings.find(function (o) { return o.id === oEl.dataset.opening; });
      if (!opening) return;
      if (d.ochip) opening[d.ochip] = t.checked;
      else opening[d.ofield] = t.value;
      if (d.ofield === 'type' && e.type === 'change') {
        opening.replace = 'none';
        opening.sill = false;
        opening.slopes = false;
        renderRooms();
      }
    } else if (d.field) {
      room[d.field] = t.value;
      if (d.field === 'floor') {
        room.underlay = F.UNDERLAY_DEFAULT[room.floor] || 'none';
        room.plinth = F.PLINTH_DEFAULT[room.floor] || 'none';
        renderRooms();
      }
    }
    refresh();
  }

  function openCustom(id) {
    var el = document.querySelector('[data-custom="' + id + '"]');
    if (el) el.open = true;
  }

  function saveCurrent() {
    var list = getSaved();
    var name = (state.name || '').trim() || 'Расчёт от ' + new Date().toLocaleDateString('ru-RU');
    var entry = { id: state.id, name: name, savedAt: Date.now(), total: calc.totalCost, project: clone(state) };
    var i = list.findIndex(function (s) { return s.id === state.id; });
    if (i >= 0) list[i] = entry; else list.push(entry);
    toast(writeStorage(SAVED_KEY, list) ? 'Сохранено: ' + name : 'Не удалось сохранить: браузер запретил хранение. Скачайте файл.');
    renderSaved();
  }

  function share() {
    if (!calc.materials.length) { toast('Сначала введите помещения'); return; }
    var text = E.shareText(state, calc, state.bought);
    if (navigator.share && !EMBED) {
      navigator.share({ title: 'Расчёт материалов', text: text }).catch(function (err) {
        if (!err || err.name !== 'AbortError') showCopySheet(text);
      });
    } else {
      showCopySheet(text);
    }
  }

  function showCopySheet(text) {
    openSheet('Список покупок', '<textarea id="share-text" rows="10" readonly aria-label="Список покупок">' + esc(text) + '</textarea>', [
      { label: 'Закрыть' },
      { label: 'Скопировать', primary: true, keepOpen: true, action: function () { copyText(text); } }
    ]);
  }

  function copyText(text) {
    var ta = document.getElementById('share-text');
    function selectAll() {
      if (ta) { ta.focus(); ta.select(); }
      toast('Текст выделен — скопируйте его через меню');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Скопировано — вставьте в мессенджер'); }, selectAll);
    } else {
      selectAll();
    }
  }

  function exportFile() {
    var data = JSON.stringify({ app: 'remont-calc', version: 3, project: state }, null, 2);
    saveFile(E.fileName(state, 'json').replace('смета - ', 'расчёт - '), data, 'application/json')
      .then(function (r) { if (r && r.status === 'saved') toast('Файл расчёта сохранён'); }, saveError);
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try { parsed = JSON.parse(reader.result); } catch (e) { parsed = null; }
      var project = normalizeProject(parsed && parsed.project ? parsed.project : parsed);
      if (!project) { toast('Это не файл расчёта'); return; }
      withLeaveCheck(function () {
        state = project;
        renderAll();
        showTab('rooms');
        toast('Расчёт загружен');
      });
    };
    reader.readAsText(file);
  }

  function addCustom(name, unit) {
    var c = { id: uid('c'), name: name || '', unit: unit || 'шт.', basis: 'count', quantity: name ? '1' : '', rate: '', packSize: '1', reserve: '0', price: '', rooms: null };
    state.custom.push(c);
    refresh();
    renderMaterials(c.id);
    var card = document.querySelector('[data-custom="' + c.id + '"]');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var input = card.querySelector(name ? '[data-cfield="quantity"]' : '[data-cfield="name"]');
      if (input) input.focus({ preventScroll: true });
    }
    if (name) toast('Добавлено: ' + name + '. Укажите количество и цену.');
  }

  function applyApartment(key, mode) {
    var rooms = F.buildApartment(key, uid);
    if (mode === 'add') {
      rooms.forEach(function (r) { r.name = uniqueName(r.name, state.rooms); state.rooms.push(r); });
    } else {
      state.rooms = rooms;
      state.bought = {};
    }
    state.compare = null;
    renderRooms();
    refresh();
    toast('«' + F.APARTMENTS[key].title + '»: размеры примерные — замените своими');
  }

  function onClick(e) {
    if (e.target.id === 'sheet') { closeSheet(); return; }
    var tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { showTab(tabBtn.dataset.tab); return; }

    var filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) { materialsFilter = filterBtn.dataset.filter; openMaterials = {}; renderMaterials(); return; }

    var summary = e.target.closest('summary');
    if (summary) {
      var det = summary.parentElement;
      if (det.dataset.material) openMaterials[det.dataset.material] = !det.open;
      if (det.dataset.custom) openCustoms[det.dataset.custom] = !det.open;
      if (det.dataset.sec) {
        var sr = findRoom(det.closest('[data-room]').dataset.room);
        if (sr) { sr.open[det.dataset.sec] = !det.open; scheduleAutosave(); }
      }
      return;
    }

    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    var roomEl = btn.closest('[data-room]');
    var room = roomEl ? findRoom(roomEl.dataset.room) : null;

    switch (action) {
      case 'goto-summary':
        showTab('summary');
        if (calc.missingPrices) scrollToPrices();
        break;

      case 'goto-prices':
        if (currentTab() !== 'summary') showTab('summary');
        scrollToPrices();
        break;

      case 'sheet-btn': {
        var sb = sheetButtons[Number(btn.dataset.index)];
        if (!sb || !sb.keepOpen) closeSheet();
        if (sb && sb.action) sb.action();
        break;
      }

      case 'toast-action':
        if (toastAction) toastAction();
        toastAction = null;
        document.getElementById('toast').classList.remove('show');
        break;

      case 'add-room': {
        var last = state.rooms[state.rooms.length - 1];
        var nr = roomFromPreset(btn.dataset.preset, last ? last.height : undefined);
        state.rooms.push(nr);
        renderRooms();
        refresh();
        var el = document.querySelector('[data-room="' + nr.id + '"]');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.querySelector('[data-field="length"]').focus({ preventScroll: true });
        break;
      }

      case 'apartment': {
        var key = btn.dataset.key;
        var apt = F.APARTMENTS[key];
        if (!hasContent()) { applyApartment(key, 'replace'); break; }
        openSheet('Квартира «' + apt.title + '»', '<p>' + count(apt.rooms.length, ['помещение', 'помещения', 'помещений']) +
          ' с примерными размерами. Заменить ими текущие помещения или добавить к ним? Цены и нормы останутся.</p>', [
          { label: 'Отмена' },
          { label: 'Добавить', action: function () { applyApartment(key, 'add'); } },
          { label: 'Заменить', primary: true, action: function () { applyApartment(key, 'replace'); } }
        ]);
        break;
      }

      case 'copy-room': {
        var copy = clone(room);
        copy.id = uid('r');
        copy.name = uniqueName(room.name + ' (копия)');
        copy.collapsed = false;
        copy.openings.forEach(function (o) { o.id = uid('o'); });
        state.rooms.splice(state.rooms.indexOf(room) + 1, 0, copy);
        renderRooms();
        refresh();
        document.querySelector('[data-room="' + copy.id + '"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Помещение скопировано');
        break;
      }

      case 'delete-room': {
        var idx = state.rooms.indexOf(room);
        state.rooms.splice(idx, 1);
        renderRooms();
        refresh();
        toast('Удалено: ' + (room.name || 'помещение'), 'Отменить', function () {
          state.rooms.splice(idx, 0, room);
          renderRooms();
          refresh();
        });
        break;
      }

      case 'toggle-room':
        room.collapsed = !room.collapsed;
        roomEl.classList.toggle('collapsed', room.collapsed);
        scheduleAutosave();
        break;

      case 'collapse-all': {
        var collapse = !state.rooms.every(function (r) { return r.collapsed; });
        state.rooms.forEach(function (r) { r.collapsed = collapse; });
        renderRooms();
        refresh();
        break;
      }

      case 'add-window':
      case 'add-door': {
        var o = action === 'add-door' ? F.makeOpening('door', '0,9', '2,1', uid) : F.makeOpening('window', '1,4', '1,5', uid);
        room.openings.push(o);
        room.open.openings = true;
        renderRooms();
        refresh();
        var oEl = document.querySelector('[data-opening="' + o.id + '"] [data-ofield="width"]');
        if (oEl) oEl.focus();
        break;
      }

      case 'delete-opening': {
        var oid = btn.closest('[data-opening]').dataset.opening;
        var oi = room.openings.findIndex(function (x) { return x.id === oid; });
        var removed = room.openings.splice(oi, 1)[0];
        renderRooms();
        refresh();
        toast('Проём удалён', 'Отменить', function () {
          room.openings.splice(oi, 0, removed);
          renderRooms();
          refresh();
        });
        break;
      }

      case 'add-item': {
        var k = btn.dataset.key;
        room.counts[k] = F.toNumber(room.counts[k]) + 1;
        renderItems(roomEl, room, btn.closest('[data-adder]').dataset.adder);
        refresh();
        break;
      }

      case 'step': {
        var row = btn.closest('[data-item]');
        var ik = row.dataset.item;
        var v = Math.max(0, F.round(F.toNumber(room.counts[ik]) + Number(btn.dataset.delta), 2));
        var kind = row.closest('[data-items]').dataset.items;
        if (v > 0) {
          room.counts[ik] = v;
          row.querySelector('[data-count]').value = inputValue(v);
        } else {
          delete room.counts[ik];
          renderItems(roomEl, room, kind);
        }
        if (kind === 'plumbing' && BATH_KEYS.indexOf(ik) >= 0) renderItems(roomEl, room, kind);
        refresh();
        break;
      }

      case 'reset-norms':
        askConfirm('Вернуть типовые нормы?', 'Нормы расхода и запас у всех материалов станут типовыми. Цены останутся.', 'Вернуть', function () {
          F.MATERIAL_ORDER.forEach(function (mk) {
            var dflt = clone(F.DEFAULT_MATERIALS[mk]);
            dflt.price = state.materials[mk].price;
            if ('priceUnit' in dflt) dflt.priceUnit = state.materials[mk].priceUnit || dflt.priceUnit;
            state.materials[mk] = dflt;
          });
          refresh();
          renderMaterials();
          toast('Нормы сброшены');
        });
        break;

      case 'add-custom':
        addCustom();
        break;

      case 'quick-add':
        addCustom(btn.dataset.name, btn.dataset.unit);
        break;

      case 'delete-custom': {
        var cid = btn.closest('[data-custom]').dataset.custom;
        var ci = state.custom.findIndex(function (x) { return x.id === cid; });
        var removedC = state.custom.splice(ci, 1)[0];
        refresh();
        renderMaterials();
        toast('Удалено: ' + (removedC.name || 'позиция'), 'Отменить', function () {
          state.custom.splice(ci, 0, removedC);
          refresh();
          renderMaterials(removedC.id);
        });
        break;
      }

      case 'cmp-apply': {
        var cmp = compareState();
        var opt = btn.dataset.option;
        state.rooms.forEach(function (r) {
          if (!Array.isArray(cmp.rooms) || cmp.rooms.indexOf(r.id) >= 0) F.COMPARE_FIELDS[cmp.field].apply(r, opt);
        });
        renderRooms();
        refresh();
        renderCompare();
        toast('Вариант применён: ' + optionLabel(compareSpec(cmp.field)[2], opt));
        break;
      }

      case 'save':
        saveCurrent();
        break;

      case 'pdf':
        exportPdf(btn);
        break;

      case 'csv':
        exportCsv();
        break;

      case 'print':
        renderPrint();
        window.print();
        break;

      case 'share':
        share();
        break;

      case 'export':
        exportFile();
        break;

      case 'new-project':
        withLeaveCheck(function () {
          var materials = clone(state.materials); // цены и нормы переносим в новый расчёт
          var disabled = clone(state.disabled);
          state = { id: uid('p'), name: '', customer: '', rooms: [roomFromPreset('room')], materials: materials, disabled: disabled, custom: [], bought: {}, compare: null };
          renderAll();
          showTab('rooms');
          toast('Новый расчёт. Цены и нормы сохранены.');
        });
        break;

      case 'open-saved': {
        var sid = btn.closest('[data-saved]').dataset.saved;
        var entry = getSaved().find(function (s) { return s.id === sid; });
        if (!entry) return;
        var openIt = function () {
          state = normalizeProject(entry.project);
          renderAll();
          showTab('rooms');
          toast('Открыт: ' + entry.name);
        };
        if (entry.id === state.id) openIt(); else withLeaveCheck(openIt);
        break;
      }

      case 'delete-saved': {
        var did = btn.closest('[data-saved]').dataset.saved;
        var list = getSaved();
        var item = list.find(function (s) { return s.id === did; });
        if (!item) return;
        writeStorage(SAVED_KEY, list.filter(function (s) { return s.id !== did; }));
        renderSaved();
        toast('Удалён расчёт «' + item.name + '»', 'Отменить', function () {
          var now = getSaved();
          now.push(item);
          writeStorage(SAVED_KEY, now);
          renderSaved();
        });
        break;
      }
    }
  }

  /** Enter в поле — переход к следующему полю (удобно на телефоне). */
  function onKeydown(e) {
    if (e.key === 'Escape' && !document.getElementById('sheet').hidden) { closeSheet(); return; }
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
    var panel = e.target.closest('.panel');
    if (!panel) return;
    e.preventDefault();
    var inputs = Array.prototype.filter.call(panel.querySelectorAll('input[type="text"]'), function (el) {
      return el.offsetParent !== null;
    });
    var next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus(); else e.target.blur();
  }

  /** При входе в числовое поле выделяем значение, чтобы сразу ввести новое. */
  function onFocusIn(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' && (t.inputMode === 'decimal' || t.inputMode === 'numeric')) {
      setTimeout(function () { try { t.select(); } catch (err) { /* ничего */ } }, 0);
    }
  }

  /* ================================================================== *
   * Запуск
   * ================================================================== */

  function init() {
    state = normalizeProject(readStorage(CURRENT_KEY)) || exampleProject();
    settings = readStorage(SETTINGS_KEY) || {};
    settings.company = Object.assign({ name: '', phone: '' }, settings.company);
    if (settings.details === undefined) settings.details = true;
    document.querySelector('[data-setting="name"]').value = settings.company.name;
    document.querySelector('[data-setting="phone"]').value = settings.company.phone;
    document.querySelector('[data-setting="details"]').checked = settings.details;

    document.addEventListener('input', function (e) {
      // select и checkbox обрабатываем по change, чтобы не пересчитывать дважды
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'file') return;
      if (e.target.dataset.inlinePrice) { toggleInvalid(e.target); return; }
      onInput(e);
    });
    document.addEventListener('change', function (e) {
      if (e.target.dataset.inlinePrice) { setInlinePrice(e.target); return; }
      if (e.target.id === 'import-file') {
        if (e.target.files[0]) importFile(e.target.files[0]);
        e.target.value = '';
        return;
      }
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onInput(e);
    });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('beforeprint', renderPrint);

    if (EMBED) {
      document.querySelectorAll('[data-action="print"]').forEach(function (b) { b.hidden = true; });
      var shareBtn = document.querySelector('[data-action="share"]');
      if (shareBtn) shareBtn.textContent = 'Скопировать список';
      var hint = document.getElementById('saved-hint');
      if (hint) hint.textContent = 'Хранятся в этом браузере на этом устройстве. Чтобы перенести — скачайте файл расчёта.';
    }

    renderPresets();
    renderAll();

    // Работа без интернета: кэшируем файлы сайта (только при открытии по http/https).
    if (!EMBED && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  init();
})();
