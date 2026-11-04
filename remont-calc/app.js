/*
 * app.js — интерфейс калькулятора: комнаты, материалы, итог, сохранение, печать.
 * Все расчёты — в formulas.js.
 */
(function () {
  'use strict';

  var F = window.RemontFormulas;
  var CURRENT_KEY = 'remontCalc.current.v1';
  var SAVED_KEY = 'remontCalc.saved.v1';
  // Встроенный просмотр (страница на claude.ai): там нет печати, скачивания файлов,
  // «Поделиться» и работы без интернета — эти кнопки скрываются.
  var EMBED = !!window.REMONT_EMBED;

  /* ================================================================== *
   * Склонения и подписи
   * ================================================================== */

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
    room: ['комната', 'комнаты', 'комнат'],
    strip: ['полоса', 'полосы', 'полос'],
    piece: ['шт.', 'шт.', 'шт.'],
    door: ['дверь', 'двери', 'дверей']
  };

  // Единицы своих позиций, которые нужно склонять.
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

  /* ================================================================== *
   * Описание материалов для формы: поля, цена, упаковка, подсказка
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

  /* ---------- Варианты отделки в комнате ---------- */

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

  var FLOOR_CHIPS = [['screed', 'стяжка'], ['leveler', 'наливной пол'], ['waterproofing', 'гидроизоляция'], ['primer', 'грунт']];
  var WALL_CHIPS = [['drywall', 'гипсокартон'], ['plaster', 'штукатурка'], ['puttyStart', 'шпакл. старт'], ['putty', 'шпакл. финиш'],
    ['fiberglass', 'стеклохолст'], ['primer', 'грунт']];
  var CEILING_CHIPS = [['drywall', 'гипсокартон'], ['plaster', 'штукатурка'], ['puttyStart', 'шпакл. старт'], ['putty', 'шпакл. финиш'],
    ['primer', 'грунт'], ['plinth', 'плинтус']];

  /* ---------- Шаблоны помещений ---------- */

  var PRESETS = [
    { key: 'room', label: 'Комната', floor: 'laminate', walls: 'wallpaper', ceiling: 'paint',
      prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true } }, openings: [['window', '1,4', '1,5'], ['door', '0,9', '2,1']] },
    { key: 'kitchen', label: 'Кухня', floor: 'porcelain', walls: 'paint', ceiling: 'paint',
      prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true }, floor: { primer: true } }, openings: [['window', '1,4', '1,5'], ['door', '0,9', '2,1']] },
    { key: 'bath', label: 'Санузел', floor: 'porcelain', walls: 'tile', ceiling: 'stretch',
      prep: { walls: { plaster: true, primer: true }, floor: { waterproofing: true, primer: true } }, openings: [['door', '0,7', '2,1']] },
    { key: 'hall', label: 'Коридор', floor: 'laminate', walls: 'wallpaper', ceiling: 'paint',
      prep: { walls: { putty: true, primer: true }, ceiling: { putty: true, primer: true } }, openings: [] },
    { key: 'balcony', label: 'Балкон', floor: 'none', walls: 'panels', ceiling: 'panels', prep: {}, openings: [['window', '2,8', '1,4']] },
    { key: 'empty', label: 'Пустое', floor: 'none', walls: 'none', ceiling: 'none', prep: {}, openings: [] }
  ];

  /* ---------- Быстрое добавление своих позиций («прочее») ---------- */

  var QUICK_ITEMS = [
    { group: 'Сантехника', items: [['Унитаз', 'шт.'], ['Инсталляция', 'шт.'], ['Раковина', 'шт.'], ['Смеситель', 'шт.'], ['Ванна', 'шт.'],
      ['Душевой поддон', 'шт.'], ['Полотенцесушитель', 'шт.'], ['Водонагреватель', 'шт.'], ['Труба водопроводная', 'м'], ['Труба канализационная', 'м']] },
    { group: 'Электрика', items: [['Автоматический выключатель', 'шт.'], ['УЗО / дифавтомат', 'шт.'], ['Электрощит', 'шт.'],
      ['Распаечная коробка', 'шт.'], ['Гофра для кабеля', 'м'], ['Кабель-канал', 'м']] },
    { group: 'Окна и балкон', items: [['Отлив', 'м'], ['Москитная сетка', 'шт.'], ['Утепление балкона', 'м²']] },
    { group: 'Климат', items: [['Кондиционер', 'шт.'], ['Вытяжной вентилятор', 'шт.']] },
    { group: 'Расходники', items: [['Монтажная пена', 'баллон'], ['Герметик', 'тюбик'], ['Саморезы', 'уп.'], ['Дюбели', 'уп.'],
      ['Малярный скотч', 'рулон'], ['Мешки для мусора', 'уп.'], ['Вывоз мусора', 'рейс']] }
  ];

  var CUSTOM_BASIS = [['count', 'Вручную'], ['floor', 'Пол, м²'], ['walls', 'Стены, м²'],
    ['ceiling', 'Потолок, м²'], ['perimeter', 'Периметр, м']];
  var BASIS_NAME = { floor: 'Площадь пола', walls: 'Площадь стен', ceiling: 'Площадь потолка', perimeter: 'Периметр' };
  var BASIS_UNIT = { floor: 'м²', walls: 'м²', ceiling: 'м²', perimeter: 'м' };

  var ICONS = {
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ================================================================== *
   * Состояние
   * ================================================================== */

  var state = null;          // текущий расчёт
  var calc = null;           // результат F.calculateProject(state)
  var openMaterials = {};    // карточки материалов, которые пользователь сам открыл/закрыл
  var openCustoms = {};      // раскрытые карточки своих позиций
  var materialsFilter = 'used';

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function newOpening(type, width, height) {
    return {
      id: uid('o'), type: type,
      width: width || (type === 'door' ? '0,9' : '1,4'),
      height: height || (type === 'door' ? '2,1' : '1,5'),
      count: '1', replace: 'none', sill: false, slopes: false
    };
  }

  function blankRoom() {
    return {
      id: uid('r'), name: '', length: '', width: '', height: '2,7', openings: [],
      floor: 'none', underlay: 'none', plinth: 'none', walls: 'none', ceiling: 'none',
      prep: {
        floor: { screed: false, leveler: false, waterproofing: false, primer: false },
        walls: { drywall: false, plaster: false, puttyStart: false, putty: false, fiberglass: false, primer: false },
        ceiling: { drywall: false, plaster: false, puttyStart: false, putty: false, primer: false, plinth: false }
      },
      electric: { sockets: '', switches: '', lights: '', power: '' },
      heating: { radiators: false, radiatorType: 'bimetal', floor: false, floorType: 'mat' },
      open: { openings: true, finish: true, electric: false, heating: false },
      collapsed: false
    };
  }

  /** Имя без повторов: «Комната», «Комната 2», «Комната 3»… */
  function uniqueName(base) {
    var names = state ? state.rooms.map(function (r) { return r.name; }) : [];
    if (names.indexOf(base) < 0) return base;
    for (var i = 2; ; i++) {
      if (names.indexOf(base + ' ' + i) < 0) return base + ' ' + i;
    }
  }

  /** Подложка и плинтус по умолчанию для выбранного покрытия. */
  function applyFloorDefaults(room) {
    room.underlay = F.UNDERLAY_DEFAULT[room.floor] || 'none';
    room.plinth = F.PLINTH_DEFAULT[room.floor] || 'none';
  }

  function roomFromPreset(key, height) {
    var p = PRESETS.find(function (x) { return x.key === key; }) || PRESETS[0];
    var room = blankRoom();
    room.name = uniqueName(p.key === 'empty' ? 'Помещение' : p.label);
    room.height = height || '2,7';
    room.floor = p.floor;
    applyFloorDefaults(room);
    room.walls = p.walls;
    room.ceiling = p.ceiling;
    ['floor', 'walls', 'ceiling'].forEach(function (s) { Object.assign(room.prep[s], (p.prep || {})[s]); });
    room.openings = p.openings.map(function (o) { return newOpening(o[0], o[1], o[2]); });
    return room;
  }

  function exampleProject() {
    var room = roomFromPreset('room');
    room.length = '4';
    room.width = '3';
    return { id: uid('p'), name: '', rooms: [room], materials: clone(F.DEFAULT_MATERIALS), disabled: {}, custom: [], bought: {} };
  }

  /** Приводит загруженный расчёт к нужному виду (старые версии, чужие файлы). */
  // Материалы первых версий, которые теперь разделены на виды.
  var RENAMED = { underlay: 'underlayXPS', floorPlinth: 'plinthPVC', doorInterior: 'doorEco', radiator: 'radiatorBimetal' };

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
      var base = blankRoom();
      var room = Object.assign(base, r);
      room.id = r.id || uid('r');
      room.openings = Array.isArray(r.openings) ? r.openings.map(function (o) {
        var opening = Object.assign(newOpening(o.type === 'door' ? 'door' : 'window'), o, { id: o.id || uid('o') });
        if (opening.replace === 'interior') opening.replace = 'eco';
        return opening;
      }) : [];
      if (r.underlay === undefined) room.underlay = F.roomUnderlay(r);
      if (r.plinth === undefined) room.plinth = F.roomPlinth(r);
      room.prep = {
        floor: Object.assign(blankRoom().prep.floor, r.prep && r.prep.floor),
        walls: Object.assign(blankRoom().prep.walls, r.prep && r.prep.walls),
        ceiling: Object.assign(blankRoom().prep.ceiling, r.prep && r.prep.ceiling)
      };
      room.electric = Object.assign(blankRoom().electric, r.electric);
      room.heating = Object.assign(blankRoom().heating, r.heating);
      room.open = Object.assign(blankRoom().open, r.open);
      return room;
    });
    var custom = Array.isArray(p.custom) ? p.custom.map(function (c) {
      return Object.assign({ id: uid('c'), name: '', unit: 'шт.', basis: 'count', quantity: '', rate: '', packSize: '1', reserve: '0', price: '', rooms: null }, c);
    }) : [];
    return {
      id: p.id || uid('p'), name: p.name || '', rooms: rooms, materials: materials,
      disabled: oldDisabled, custom: custom, bought: Object.assign({}, p.bought)
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
   * Форматирование
   * ================================================================== */

  var nf = {};
  function fmt(n, digits) {
    var d = digits === undefined ? 2 : digits;
    if (!nf[d]) nf[d] = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d });
    return nf[d].format(F.round(n, d));
  }
  function money(n) { return fmt(Math.round(n), 0) + ' ₽'; }

  function plural(n, forms) {
    var a = Math.abs(Math.round(n)) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  function count(n, forms) { return fmt(n, 0) + ' ' + plural(n, forms); }

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

  /* ---------- Кусочки разметки ---------- */

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
      return '<option value="' + o[0] + '"' + (o[0] === value ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }

  function chipHTML(label, attrs, checked) {
    return '<label class="chip"><input type="checkbox" ' + attrs + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  /* ================================================================== *
   * Комнаты
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
      '<summary><span class="sec-title">' + title + '</span><span class="sec-sum" data-sec-sum="' + key + '"></span></summary>' +
      '<div class="sec-body">' + body + '</div></details>';
  }

  function roomHTML(room) {
    var el = room.electric;
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
    var electric = '<div class="grid2">' +
      fieldHTML('Розеток', inputHTML('data-efield="sockets"', el.sockets, { mode: 'numeric', placeholder: '0' })) +
      fieldHTML('Выключателей', inputHTML('data-efield="switches"', el.switches, { mode: 'numeric', placeholder: '0' })) +
      fieldHTML('Светильников', inputHTML('data-efield="lights"', el.lights, { mode: 'numeric', placeholder: '0' })) +
      fieldHTML('Плита, духовка, бойлер', inputHTML('data-efield="power"', el.power, { mode: 'numeric', placeholder: '0' })) +
      '</div><p class="small muted">Кабель и подрозетники посчитаются сами. Двойная розетка — считайте как две. ' +
      'Для плиты, духовки и бойлера — отдельная линия и силовая розетка.</p>';
    var h = room.heating;
    var heating = '<div class="heat-row">' + chipHTML('радиаторы (по окнам)', 'data-heat="radiators"', h.radiators) +
        (h.radiators ? selectHTML(RADIATOR_OPTIONS, h.radiatorType, 'data-hfield="radiatorType" aria-label="Вид радиаторов"') : '') + '</div>' +
      '<div class="heat-row">' + chipHTML('тёплый пол', 'data-heat="floor"', h.floor) +
        (h.floor ? selectHTML(FLOOR_HEAT_OPTIONS, h.floorType, 'data-hfield="floorType" aria-label="Вид тёплого пола"') : '') + '</div>' +
      '<p class="small muted">Отмечайте, если радиаторы или тёплый пол ставятся заново.</p>';

    return '<section class="card room' + (room.collapsed ? ' collapsed' : '') + '" data-room="' + room.id + '">' +
      '<div class="room-head">' +
        '<input class="room-name" type="text" data-field="name" value="' + esc(room.name) + '" aria-label="Название комнаты" autocomplete="off" enterkeyhint="next">' +
        '<button type="button" class="icon-btn" data-action="copy-room" aria-label="Копировать комнату" title="Копировать">' + ICONS.copy + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="delete-room" aria-label="Удалить комнату" title="Удалить">' + ICONS.trash + '</button>' +
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
        sectionHTML(room, 'electric', 'Электрика', electric) +
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
      : '<div class="card empty">Помещений пока нет — выберите шаблон ниже.</div>');
  }

  function renderPresets() {
    document.getElementById('presets').innerHTML = PRESETS.map(function (p) {
      return '<button type="button" class="btn preset" data-action="add-room" data-preset="' + p.key + '">+ ' + p.label + '</button>';
    }).join('');
  }

  /** Короткие подписи в заголовках разделов комнаты. */
  function sectionSummaries(room) {
    var openings = room.openings.map(function (o) {
      var c = F.toNumber(o.count);
      var s = (o.type === 'door' ? 'дверь ' : 'окно ') + inputValue(o.width) + '×' + inputValue(o.height) + (c > 1 ? ' ×' + fmt(c, 0) : '');
      var replace = o.type === 'door' ? DOOR_REPLACE : WINDOW_REPLACE;
      if (o.replace && o.replace !== 'none') s += ' (' + optionLabel(replace, o.replace).toLowerCase() + ')';
      return s;
    });
    var e = room.electric;
    var el = [];
    if (F.toNumber(e.sockets)) el.push(count(F.toNumber(e.sockets), ['розетка', 'розетки', 'розеток']));
    if (F.toNumber(e.switches)) el.push(count(F.toNumber(e.switches), ['выключатель', 'выключателя', 'выключателей']));
    if (F.toNumber(e.lights)) el.push(count(F.toNumber(e.lights), ['светильник', 'светильника', 'светильников']));
    if (F.toNumber(e.power)) el.push(count(F.toNumber(e.power), ['силовая линия', 'силовые линии', 'силовых линий']));
    var heat = [];
    if (room.heating.radiators) heat.push('радиаторы: ' + optionLabel(RADIATOR_OPTIONS, room.heating.radiatorType).toLowerCase());
    if (room.heating.floor) heat.push('тёплый пол: ' + optionLabel(FLOOR_HEAT_OPTIONS, room.heating.floorType).toLowerCase().replace(/ \(.*\)/, ''));
    return {
      openings: openings.length ? openings.join(' · ') : 'нет',
      finish: [optionLabel(FLOOR_OPTIONS, room.floor), optionLabel(WALL_OPTIONS, room.walls), optionLabel(CEILING_OPTIONS, room.ceiling)]
        .map(function (s) { return s.toLowerCase(); }).join(' · '),
      electric: el.length ? el.join(' · ') : 'не заполнено',
      heating: heat.length ? heat.join(' · ') : 'не меняем'
    };
  }

  function roomSummaryHTML(r) {
    var g = r.geometry;
    var parts = [];
    if (g.floorArea > 0) parts.push('Пол <b>' + fmt(g.floorArea) + ' м²</b>');
    if (g.wallGross > 0) {
      parts.push('Стены <b>' + fmt(g.wallNet) + ' м²</b>' + (g.openingsArea > 0 ? ' (без проёмов ' + fmt(g.openingsArea) + ' м²)' : ''));
    }
    if (g.perimeter > 0) parts.push('Периметр ' + fmt(g.perimeter) + ' м');
    var html = parts.join(' · ');
    if (g.warnings.length) html += (html ? '<br>' : '') + '<span class="warn">⚠ ' + esc(g.warnings.join('; ')) + '</span>';
    return html || '<span class="muted">Введите размеры</span>';
  }

  function updateRoomSummaries() {
    calc.rooms.forEach(function (r) {
      var card = document.querySelector('[data-room="' + r.id + '"]');
      if (!card) return;
      card.querySelector('[data-room-summary]').innerHTML = roomSummaryHTML(r);
      var sums = sectionSummaries(findRoom(r.id));
      Object.keys(sums).forEach(function (k) {
        var el = card.querySelector('[data-sec-sum="' + k + '"]');
        if (el) el.textContent = sums[k];
      });
    });
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
      fields += materialFieldHTML(key, f('reserve', 'Запас', '%', true), params);
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
      roomChips = '<div class="subhead small-head">В каких комнатах</div><div class="chips chips-wide">' +
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
        fieldHTML('Название', inputHTML('data-cfield="name"', c.name, { text: true, placeholder: 'Например: смеситель' }), '', 'wide') +
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
      html = '<div class="card empty">Пока ни один материал не нужен: выберите отделку в комнатах ' +
        'или нажмите «Все», чтобы заранее ввести цены.</div>';
    }
    html += '<h2 class="cat-title">Свои позиции <span class="muted small">сантехника, электрика, расходники — всё, чего нет выше</span></h2>' +
      state.custom.map(function (c) { return customCardHTML(c, c.id === newCustomId); }).join('') + quickAddHTML();
    document.getElementById('materials').innerHTML = html;
    updateMaterialUsage();
  }

  /** Строки «сколько нужно» под названием материала. */
  function updateMaterialUsage() {
    F.MATERIAL_ORDER.forEach(function (key) {
      var details = document.querySelector('[data-material="' + key + '"]');
      if (!details) return;
      var m = calc.materials.find(function (x) { return x.key === key; });
      var rooms = calc.rooms.filter(function (r) { return r.areas[key] > 0; }).map(function (r) { return r.name || 'без названия'; });
      var usage = details.querySelector('[data-mat-usage]');
      if (state.disabled[key]) usage.textContent = 'выключен — в расчёт не входит';
      else if (m) usage.textContent = buyText(m) + ' · ' + rooms.join(', ');
      else usage.textContent = 'не выбран ни в одной комнате';
      details.classList.toggle('unused', !m);
      var shouldOpen = openMaterials[key] !== undefined ? openMaterials[key] : !!m && materialsFilter === 'used';
      if (details.open !== shouldOpen) details.open = shouldOpen;
    });
    state.custom.forEach(function (c) {
      var el = document.querySelector('[data-custom-usage="' + c.id + '"]');
      if (!el) return;
      var m = calc.materials.find(function (x) { return x.key === 'custom:' + c.id; });
      el.textContent = m ? buyText(m) + (m.priced ? ' · ' + money(m.cost) : '') : 'количество не задано';
      var title = el.parentElement.querySelector('.mat-title');
      if (title) title.textContent = c.name || 'Новая позиция';
    });
  }

  /* ================================================================== *
   * Тексты результатов
   * ================================================================== */

  function packForms(m) {
    if (m.kind === 'custom') return null;
    return UI[m.key].pack || FORMS.piece;
  }

  /** Главная строка «купить». */
  function buyText(m) {
    var p = m.kind === 'custom' ? null : state.materials[m.key];
    switch (m.kind) {
      case 'area':
      case 'tile':
        return count(m.packs, packForms(m)) + (p && p.priceUnit === 'm2' ? ' (' + fmt(m.boughtArea) + ' м²)' : '');
      case 'roll':
        return fmt(m.amount) + ' м² (' + count(m.packs, FORMS.cut) + ')';
      case 'measured':
        return fmt(m.amount) + ' ' + m.baseUnit;
      case 'count':
        return fmt(m.packs, 0) + ' шт.';
      case 'cable':
        return fmt(m.meters, 0) + ' м' + (m.coils ? ' (' + count(m.coils, FORMS.coil) + ' по ' + fmt(F.toNumber(p.coilLength)) + ' м)' : '');
      case 'radiator':
        if (m.key === 'radiatorPanel') return count(m.packs, FORMS.radiator) + ' по ' + fmt(F.toNumber(p.sectionPower), 0) + ' Вт';
        return count(m.packs, FORMS.section) + ' (' + count(m.radiators, FORMS.radiator) + ')';
      case 'heatingMat':
        return fmt(m.amount) + ' м² (' + fmt(m.watts, 0) + ' Вт)';
      case 'heatingCable':
        return fmt(m.meters, 0) + ' м кабеля (' + fmt(m.watts, 0) + ' Вт)';
      case 'custom':
        if (m.packSize !== 1) return count(m.packs, FORMS.pack) + ' по ' + fmt(m.packSize) + ' ' + m.amountUnit;
        return fmt(m.packs, 0) + ' ' + (UNIT_FORMS[m.amountUnit] ? plural(m.packs, UNIT_FORMS[m.amountUnit]) : m.amountUnit);
      default:
        return count(m.packs, packForms(m));
    }
  }

  /** Пояснение «откуда взялись цифры». */
  function materialLines(m) {
    if (m.kind === 'custom') return customLines(m);
    var p = state.materials[m.key];
    var n = F.toNumber;
    var r = n(p.reserve);
    var res = r > 0 ? ' (+' + fmt(r, 1) + ' %)' : '';
    var forms = packForms(m);
    var L = [];
    switch (m.kind) {
      case 'area':
        L.push('Площадь ' + fmt(m.area) + ' м²' + (r > 0 ? ', с запасом' + res + ' ' + fmt(m.amount) + ' м²' : ''));
        L.push(count(m.packs, forms) + ' по ' + fmt(m.packArea, 3) + ' м² = ' + fmt(m.boughtArea, 3) + ' м²');
        break;
      case 'tile':
        L.push('Площадь ' + fmt(m.area) + ' м², с запасом' + res + ' ' + fmt(m.amount) + ' м²');
        L.push(m.pieces + ' шт. плитки ' + fmt(n(p.tileLength), 1) + '×' + fmt(n(p.tileWidth), 1) + ' см → ' +
          count(m.packs, forms) + ' по ' + fmt(m.packArea, 3) + ' м²');
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
      case 'heatingCable':
        L.push(fmt(n(p.share), 0) + ' % площади пола = ' + fmt(m.area) + ' м² × ' + fmt(n(p.power), 0) + ' Вт/м² = ' + fmt(m.watts, 0) + ' Вт');
        L.push('Кабель ' + fmt(n(p.linearPower)) + ' Вт/м → ' + fmt(m.meters, 0) + ' м');
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
        L.push('Шов ' + fmt(n(p.jointWidth)) + ' мм, глубина ' + fmt(n(p.tileThickness)) + ' мм; с запасом' + res + ' ' +
          fmt(m.amount, 2) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.packWeight)) + ' кг');
        break;
      case 'layered':
        if (m.key === 'primer' || m.key === 'parquetLacquer') {
          L.push('Площадь ' + fmt(m.area) + ' м² × ' + count(n(p.coats), FORMS.coat) + ' × ' + fmt(n(p.consumption), 3) + ' л/м²');
          L.push('С запасом' + res + ' ' + fmt(m.amount) + ' л → ' + count(m.packs, forms) + ' по ' +
            fmt(n(m.key === 'primer' ? p.canisterVolume : p.canVolume)) + ' л');
        } else {
          L.push('Пол и заход на стены ' + fmt(m.area) + ' м² × ' + count(n(p.coats), FORMS.coat) + ' × ' + fmt(n(p.consumption)) + ' кг/м²');
          L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.bucketWeight)) + ' кг');
        }
        break;
      case 'drymix':
        L.push('Площадь ' + fmt(m.area) + ' м² × ' + fmt(n(p.thickness)) + ' мм × ' + fmt(n(p.consumptionPerMm)) + ' кг/м²');
        L.push('С запасом' + res + ' ' + fmt(m.amount, 1) + ' кг → ' + count(m.packs, forms) + ' по ' + fmt(n(p.bagWeight)) + ' кг');
        break;
      case 'measured':
        L.push((m.baseUnit === 'м' ? 'Длина ' : 'Площадь ') + fmt(m.area) + ' ' + m.baseUnit + (r > 0 ? ', с запасом' + res + ' ' + fmt(m.amount) : ''));
        break;
      case 'count':
        L.push('По комнатам: ' + calc.rooms.filter(function (x) { return x.areas[m.key] > 0; }).map(function (x) {
          return (x.name || 'без названия') + ' — ' + fmt(x.areas[m.key], 0);
        }).join(', '));
        break;
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
    }
    return L;
  }

  function customLines(m) {
    var c = state.custom.find(function (x) { return 'custom:' + x.id === m.key; });
    if (!c) return [];
    var r = F.toNumber(c.reserve);
    var res = r > 0 ? ', с запасом (+' + fmt(r, 1) + ' %) ' + fmt(m.amount) + ' ' + m.amountUnit : '';
    if (c.basis === 'count') return ['Количество ' + fmt(m.area) + ' ' + m.amountUnit + res];
    return [BASIS_NAME[c.basis] + ' ' + fmt(m.area) + ' ' + BASIS_UNIT[c.basis] + ' × ' +
      fmt(F.toNumber(c.rate), 3) + ' ' + m.amountUnit + '/' + BASIS_UNIT[c.basis] + res];
  }

  function priceText(m) {
    if (!m.priced) return 'цена не указана';
    if (m.kind === 'custom') {
      var c = state.custom.find(function (x) { return 'custom:' + x.id === m.key; });
      return fmt(F.toNumber(c.price)) + ' ₽ за ' + (m.packSize !== 1 ? 'упаковку' : m.amountUnit);
    }
    var p = state.materials[m.key];
    var ui = UI[m.key];
    var per = ui.pricePer;
    if (ui.priceUnits) {
      per = p.priceUnit === 'pack' ? (m.kind === 'cable' ? 'бухту' : 'упаковку') : (m.kind === 'cable' ? 'метр' : 'м²');
    }
    return fmt(F.toNumber(p.price)) + ' ₽ за ' + per;
  }

  function categoryTitle(key) {
    var c = F.CATEGORIES.find(function (x) { return x.key === key; });
    return c ? c.title : key;
  }

  /** Материалы итога, сгруппированные по категориям. */
  function grouped() {
    return F.CATEGORIES.map(function (cat) {
      var items = calc.materials.filter(function (m) { return m.category === cat.key; });
      return { key: cat.key, title: cat.title, items: items, cost: items.reduce(function (s, m) { return s + m.cost; }, 0) };
    }).filter(function (g) { return g.items.length; });
  }

  /* ================================================================== *
   * Итог
   * ================================================================== */

  function renderSummary() {
    var box = document.getElementById('summary');
    if (!calc.materials.length) {
      box.innerHTML = '<div class="card empty">Пока нечего считать: введите размеры комнат и выберите отделку.</div>';
      return;
    }
    var bought = state.bought;
    var boughtCount = calc.materials.filter(function (m) { return bought[m.key]; }).length;
    var leftCost = calc.materials.reduce(function (s, m) { return s + (bought[m.key] ? 0 : m.cost); }, 0);

    var groups = grouped().map(function (g) {
      return '<div class="cat-head"><span>' + g.title + '</span><span>' + money(g.cost) + '</span></div>' +
        g.items.map(function (m) {
          var lines = materialLines(m);
          lines.push(priceText(m));
          var isBought = !!bought[m.key];
          return '<div class="result-row' + (isBought ? ' bought' : '') + '">' +
            '<label class="buy-check" title="Куплено"><input type="checkbox" data-bought="' + esc(m.key) + '"' + (isBought ? ' checked' : '') +
            ' aria-label="Куплено: ' + esc(m.title) + '"><span></span></label>' +
            '<div class="result-main">' +
              '<div class="result-head"><b>' + esc(m.title) + '</b><span class="result-cost">' + (m.priced ? money(m.cost) : '—') + '</span></div>' +
              '<div class="result-buy">' + esc(buyText(m)) + '</div>' +
              '<div class="result-lines">' + lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
              (m.errors.length ? '<div class="error small">⚠ ' + esc(m.errors.join('; ')) + '</div>' : '') +
            '</div></div>';
        }).join('');
    }).join('');

    var missing = calc.materials.filter(function (m) { return !m.priced; }).map(function (m) { return m.title; });
    var skipped = calc.skipped.map(function (k) { return F.MATERIAL_TITLES[k]; });

    var roomRows = calc.rooms.map(function (r) {
      var g = r.geometry;
      var needs = F.MATERIAL_ORDER.filter(function (k) { return r.areas[k] > 0; }).map(function (k) {
        var unit = F.MATERIALS[k].baseUnit;
        return F.MATERIAL_TITLES[k].toLowerCase() + ' ' + fmt(r.areas[k], unit === 'шт.' || unit === 'Вт' ? 0 : 2) + ' ' + unit;
      });
      return '<div class="room-break"><b>' + esc(r.name || 'Без названия') + '</b> — ' +
        fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height) + ' м<br>' +
        '<span class="muted">' + (needs.length ? esc(needs.join(', ')) : 'отделка не выбрана') + '</span></div>';
    }).join('');

    box.innerHTML =
      '<div class="card"><h2 class="card-title">Что купить</h2>' +
        '<p class="small muted">Отмечайте купленное галочкой — сумма «осталось купить» пересчитается.</p>' +
        (boughtCount ? '<div class="progress"><span>Куплено ' + boughtCount + ' из ' + calc.materials.length + '</span>' +
          '<span>Осталось: <b>' + money(leftCost) + '</b></span></div>' : '') +
        groups +
        '<div class="grand-total"><span>Итого</span><span>' + money(calc.totalCost) + '</span></div>' +
        (missing.length ? '<p class="error small">Не указаны цены (' + missing.length + '): ' + esc(missing.join(', ')) +
          '. Введите их на вкладке «Материалы».</p>' : '') +
        (skipped.length ? '<p class="small muted">Выключены и не входят в итог: ' + esc(skipped.join(', ')) + '.</p>' : '') +
        '<p class="small muted">Нормы расхода — типовые значения, проверьте по упаковке.</p>' +
      '</div>' +
      '<div class="card"><h2 class="card-title">По комнатам</h2>' + roomRows + '</div>';
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
   * Печать / PDF
   * ================================================================== */

  function renderPrint() {
    var title = state.name ? esc(state.name) : 'Без названия';
    var roomRows = calc.rooms.map(function (r) {
      var src = findRoom(r.id) || blankRoom();
      var g = r.geometry;
      var finish = [
        'пол: ' + optionLabel(FLOOR_OPTIONS, src.floor).toLowerCase(),
        'стены: ' + optionLabel(WALL_OPTIONS, src.walls).toLowerCase(),
        'потолок: ' + optionLabel(CEILING_OPTIONS, src.ceiling).toLowerCase()
      ].join('; ');
      return '<tr><td>' + esc(r.name) + '</td><td class="num">' + fmt(g.length) + ' × ' + fmt(g.width) + ' × ' + fmt(g.height) +
        '</td><td class="num">' + fmt(g.floorArea) + '</td><td class="num">' + fmt(g.wallNet) + '</td><td class="num">' +
        fmt(g.openingsArea) + '</td><td class="calc">' + esc(finish) + '</td></tr>';
    }).join('');

    var matRows = grouped().map(function (g) {
      return '<tr class="cat-row"><td colspan="4">' + esc(g.title) + '</td><td class="num">' + money(g.cost) + '</td></tr>' +
        g.items.map(function (m) {
          return '<tr><td><b>' + esc(m.title) + '</b></td><td class="calc">' + materialLines(m).map(esc).join('<br>') +
            (m.errors.length ? '<br>⚠ ' + esc(m.errors.join('; ')) : '') + '</td>' +
            '<td class="buy"><b>' + esc(buyText(m)) + '</b></td><td class="num">' + esc(m.priced ? priceText(m) : '—') +
            '</td><td class="num">' + (m.priced ? money(m.cost) : '—') + '</td></tr>';
        }).join('');
    }).join('');

    document.getElementById('print').innerHTML =
      '<h1>Расчёт материалов для ремонта</h1>' +
      '<div class="meta">Объект: <b>' + title + '</b><br>Дата: ' + new Date().toLocaleDateString('ru-RU') + '</div>' +
      '<h2>Помещения</h2>' +
      (roomRows ? '<table class="room-table"><thead><tr><th>Помещение</th><th class="num">Д × Ш × В, м</th><th class="num">Пол, м²</th>' +
        '<th class="num">Стены, м²</th><th class="num">Проёмы, м²</th><th>Отделка</th></tr></thead><tbody>' + roomRows + '</tbody></table>'
        : '<p>Помещения не заданы.</p>') +
      '<h2>Материалы</h2>' +
      (matRows ? '<table class="mat-table"><thead><tr><th>Материал</th><th>Расчёт</th><th>Купить</th><th class="num">Цена</th>' +
        '<th class="num">Сумма</th></tr></thead><tbody>' + matRows + '</tbody>' +
        '<tfoot><tr><td colspan="4">Итого</td><td class="num">' + money(calc.totalCost) + '</td></tr></tfoot></table>'
        : '<p>Материалы не выбраны.</p>') +
      '<p class="footnote">Нормы расхода — типовые значения, перед покупкой проверьте по упаковке. ' +
      'Количество округлено вверх до целых упаковок, запас указан в расчёте. Длина кабеля — оценка, точная — по проекту электрики.</p>';
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
    scheduleAutosave();
  }

  function renderAll() {
    calc = F.calculateProject(state);
    document.getElementById('project-name').value = state.name || '';
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
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (name === 'materials') renderMaterials();
    if (name === 'summary') renderSaved();
    window.scrollTo(0, 0);
  }

  var toastTimer = null;
  var toastAction = null;
  /** Сообщение внизу экрана; actionLabel + action — кнопка «Отменить». */
  function toast(text, actionLabel, action) {
    var el = document.getElementById('toast');
    el.innerHTML = '<span>' + esc(text) + '</span>' + (actionLabel ? '<button type="button" class="toast-btn" data-action="toast-action">' + esc(actionLabel) + '</button>' : '');
    el.classList.add('show');
    el.classList.toggle('with-action', !!actionLabel);
    toastAction = action || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); toastAction = null; }, actionLabel ? 6000 : 2200);
  }

  /* ---------- Окно внутри страницы (вместо системных confirm/prompt) ---------- */

  var sheetButtons = [];
  /** buttons: [{ label, primary, keepOpen, action }] */
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

  function toggleInvalid(t) {
    if (t.type === 'text' && t.inputMode && (t.inputMode === 'decimal' || t.inputMode === 'numeric')) {
      t.classList.toggle('invalid', isInvalidNumber(t.value));
    }
  }

  function onInput(e) {
    var t = e.target;
    var d = t.dataset;
    toggleInvalid(t);

    if (d.project === 'name') { state.name = t.value; scheduleAutosave(); return; }

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

    var customEl = t.closest('[data-custom]');
    if (customEl) {
      var c = state.custom.find(function (x) { return x.id === customEl.dataset.custom; });
      if (!c) return;
      if (d.cfield) {
        c[d.cfield] = t.value;
        if (d.cfield === 'basis' && e.type === 'change') { refresh(); renderMaterials(); openCustom(c.id); return; }
        if (d.cfield === 'unit') {
          customEl.querySelectorAll('.unit-input em').forEach(function (em) {
            if (em.textContent !== '%' && em.textContent !== '₽') em.textContent = t.value || 'шт.';
          });
        }
      } else if (d.croom) {
        var ids = Array.isArray(c.rooms) ? c.rooms.slice() : state.rooms.map(function (r) { return r.id; });
        if (t.checked) { if (ids.indexOf(d.croom) < 0) ids.push(d.croom); } else ids = ids.filter(function (x) { return x !== d.croom; });
        c.rooms = ids.length === state.rooms.length ? null : ids;
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
      renderRooms(); // показать или скрыть выбор вида
    } else if (d.hfield) {
      room.heating[d.hfield] = t.value;
    } else if (d.efield) {
      room.electric[d.efield] = t.value;
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
      if (d.field === 'floor') { applyFloorDefaults(room); renderRooms(); }
    }
    refresh();
  }

  function openCustom(id) {
    var el = document.querySelector('[data-custom="' + id + '"]');
    if (el) el.open = true;
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

  function saveCurrent() {
    var list = getSaved();
    var name = (state.name || '').trim() || 'Расчёт от ' + new Date().toLocaleDateString('ru-RU');
    var entry = { id: state.id, name: name, savedAt: Date.now(), total: calc.totalCost, project: clone(state) };
    var i = list.findIndex(function (s) { return s.id === state.id; });
    if (i >= 0) list[i] = entry; else list.push(entry);
    toast(writeStorage(SAVED_KEY, list) ? 'Сохранено: ' + name : 'Не удалось сохранить: браузер запретил хранение. Скачайте файл.');
    renderSaved();
  }

  function shareText() {
    var lines = ['Материалы' + (state.name ? ': ' + state.name : '')];
    grouped().forEach(function (g) {
      lines.push('');
      lines.push(g.title.toUpperCase());
      g.items.forEach(function (m) {
        lines.push((state.bought[m.key] ? '✓ ' : '• ') + m.title + ' — ' + buyText(m) + (m.priced ? ' — ' + money(m.cost) : ''));
      });
    });
    lines.push('');
    lines.push('Итого: ' + money(calc.totalCost));
    return lines.join('\n');
  }

  function share() {
    if (!calc.materials.length) { toast('Сначала введите комнаты'); return; }
    var text = shareText();
    if (navigator.share && !EMBED) {
      navigator.share({ title: 'Расчёт материалов', text: text }).catch(function (err) {
        if (!err || err.name !== 'AbortError') showCopySheet(text);
      });
    } else {
      showCopySheet(text);
    }
  }

  /** Окно со списком и кнопкой «Скопировать». */
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
    var data = JSON.stringify({ app: 'remont-calc', version: 2, project: state }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    var name = (state.name || 'расчёт').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'расчёт';
    a.href = URL.createObjectURL(blob);
    a.download = 'ремонт - ' + name + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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

  function onClick(e) {
    if (e.target.id === 'sheet') { closeSheet(); return; } // нажатие мимо окна
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
        var r = findRoom(det.closest('[data-room]').dataset.room);
        if (r) { r.open[det.dataset.sec] = !det.open; scheduleAutosave(); }
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
        toast('Комната скопирована');
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
        var o = newOpening(action === 'add-door' ? 'door' : 'window');
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

      case 'reset-norms':
        askConfirm('Вернуть типовые нормы?', 'Нормы расхода и запас у всех материалов станут типовыми. Цены останутся.', 'Вернуть', function () {
          F.MATERIAL_ORDER.forEach(function (key) {
            var dflt = clone(F.DEFAULT_MATERIALS[key]);
            dflt.price = state.materials[key].price;
            if ('priceUnit' in dflt) dflt.priceUnit = state.materials[key].priceUnit || dflt.priceUnit;
            state.materials[key] = dflt;
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

      case 'save':
        saveCurrent();
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
          state = { id: uid('p'), name: '', rooms: [], materials: materials, disabled: disabled, custom: [], bought: {} };
          state.rooms.push(roomFromPreset('room'));
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

    document.addEventListener('input', function (e) {
      // select и checkbox обрабатываем по change, чтобы не пересчитывать дважды
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'file') return;
      onInput(e);
    });
    document.addEventListener('change', function (e) {
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
      document.querySelectorAll('[data-action="print"], [data-action="export"]').forEach(function (b) { b.hidden = true; });
      var shareBtn = document.querySelector('[data-action="share"]');
      if (shareBtn) shareBtn.textContent = 'Скопировать список';
      var hint = document.getElementById('saved-hint');
      if (hint) hint.textContent = 'Хранятся в этом браузере на этом устройстве.';
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
