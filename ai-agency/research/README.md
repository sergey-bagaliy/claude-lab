# ИИ-агентство в Краснодаре: продаём возврат пропущенных клиентов

*Исследование и бизнес-план для Сергея: лендинги, Telegram- и MAX-боты, ИИ-администраторы (запись, ответы на вопросы) и голосовые роботы для малого бизнеса Краснодара. Данные собраны 4 ноября 2026 г.*

> 📄 Эта же версия с оглавлением и таблицами — в [`report.html`](report.html) (откройте в браузере). Исходные заметки исследователей со всеми ссылками — в папке [`research_notes/`](research_notes/).

## Краткое резюме

1. **Лучше всего продавать туда, где пропущенный звонок стоит денег и есть запись.** Порядок ниш такой: стоматологии (882 в 2ГИС, [2ГИС](https://2gis.ru/krasnodar/search/%D0%A1%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8%2C%20%D1%81%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8/rubricId/222)), автосервисы (1 214–1 264, [2ГИС](https://2gis.ru/krasnodar/search/%D0%90%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B0)), салоны красоты (почти 2 тыс. по Яндекс Картам, [RB.ru](https://rb.ru/news/beauty-salons-russia/)), частные медцентры и диагностика, ветклиники (~164, [2ГИС](https://2gis.ru/krasnodar/search/%D0%92%D0%B5%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B0%D1%80%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20(%D0%B2%D0%B5%D1%82%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8)/rubricId/205)). Ремонт квартир в массовые ниши не попадает, но годится как пилот и витрина: на своей компании Сергей получит кейс с настоящими цифрами.
2. **Боль подтверждается, но почти все цифры о ней дают продавцы телефонии и ботов.** «Билайн Бизнес» насчитал больше 15 млн пропущенных звонков у 12 тыс. своих клиентов из МСП за 2025 г. ([Т-Бизнес секреты](https://secrets.tbank.ru/blogi-kompanij/propushhennye-zvonki-klientov/)). В клиниках, по блогам вендоров, без ответа остаются 14–35% звонков ([rechka.ai](https://rechka.ai/blog/zvonok-v-kliniku/)). Поэтому продаём «вернём пропущенные звонки и неявки», а слово «ИИ» в продаже не главное.
3. **На рынке Краснодара пустует место «до 50 тыс. ₽ разово, понятная абонплата, исполнитель рядом».** Clyovo AI берёт за бота от 50 000 ₽ ([clyovo.ru](https://clyovo.ru/blog/chat-bot-tsena-2026)). Студии делают только сайты, от 30 000 ₽ ([24krd](https://24krd.ru/services/landing.php)). Операторы связи продают минуты. В салонах на YCLIENTS уже работают готовые ИИ-администраторы за 500–3 990 ₽/мес ([YCLIENTS](https://www.yclients.ru/marketplace/revvy), [Jivo](https://www.jivo.ru/yclients-ai/)), и подпиской с ними конкурировать бессмысленно.
4. **Рекомендуемые пакеты.** Это рекомендация, а не рыночный факт; каждая цена привязана к цене конкурента в разделе 3:
   - «Старт»: 30 000 ₽ разово + 1 900 ₽/мес;
   - «ИИ-администратор»: 30 000–50 000 ₽ + 5 000–10 000 ₽/мес;
   - «Голосовой робот»: 30 000–48 000 ₽ + 10 000 ₽/мес;
   - «Под ключ»: 100 000 ₽ + 20 000 ₽/мес.
5. **Сервисы стоят сотни рублей в месяц, а главная затрата — часы работы.** По найденным ценам (расчёт в разделе 4):
   - ИИ-чат на 1 000 диалогов в месяц: 858–2 640 ₽ за токены российских моделей;
   - голосовой робот на 1 000 минут входящих: 1 515–2 163 ₽;
   - хостинг: 52–192 ₽ на клиента.
6. **Юридически работаем только на российской инфраструктуре.**
   - России нет в списках поддерживаемых стран Anthropic ([anthropic.com](https://www.anthropic.com/supported-countries)) и OpenAI ([OpenAI](https://help.openai.com/articles/5347006)).
   - Отправить данные клиентов в зарубежный API значит провести трансграничную передачу.
   - Согласие на обработку данных оформляется отдельным документом с 01.09.2025 ([Гарант](https://www.garant.ru/news/1850806/)).
   - Рекламный автообзвон роботом запрещён, штраф до 1 млн ₽ ([Spmag](https://spmag.ru/news/za-navyazchivuyu-reklamu-po-telefonu-oshtrafuyut-na-million-rublej)).
7. **Первые 10 клиентов найдём через знакомых, собственный кейс и живые встречи**, а платную рекламу отложим.
   - Каналы: тёплый круг, подрядчики смежных с ремонтом ниш, стоматологические объединения края, центр «Мой бизнес», «Опора России».
   - События: 24.11 «Твердые знаки» и 10–12.12 «Регион инноваций Юг» ([ict2go](https://ict2go.ru/regions/Krasnodar/)).
8. **Главные риски:**
   - Telegram официально замедляют с 10.02.2026 ([РБК](https://www.rbc.ru/technology_and_media/10/02/2026/698b21a39a79473017a3cb4a));
   - WhatsApp, по вторичным данным, заблокирован ([Albato](https://blog.albato.ru/whatsapp-dlya-biznesa-2026-blokirovka-alternativy/));
   - дешёвые SaaS-сервисы демпингуют;
   - VK (YCLIENTS) и Яндекс (DIKIDI) могут выпустить собственных ИИ-администраторов ([ECOMHUB](https://ecomhub.ru/yandex-dikidi-deal-services-market-platform-booking-vk-yclients/));
   - штрафы за персональные данные доходят до миллионов рублей.

   Как защищаться: несколько каналов сразу (MAX, сайт, телефон), российские модели и договор с поручением на обработку данных.

## Как собирались данные и ограничения

- **Как собирали.** Несколько исследователей искали данные в интернете 4 ноября 2026 г.
- **Российские сайты из среды сбора не открывались.** 2gis.ru, zoon.ru, avito.ru, profi.ru, vc.ru, consultant.ru, garant.ru, yandex.cloud, developers.sber.ru и другие отвечали ошибкой 403 или «хост не найден». Напрямую открылись только страницы Anthropic.
- **Откуда тогда цифры.** Из поисковой выдачи: поисковик цитирует текст страницы, и у каждой цифры стоит ссылка на эту страницу. **Перед решениями цифры нужно перепроверить в браузере.** Цены меняются, на одной странице встречаются противоречия, а счётчики 2ГИС и Zoon обновляются каждый день.
- **Лимит поиска исчерпан до конца сбора.** Не нашлись, например:
  - цены Tilda и доменов;
  - тарифы WhatsApp API и MAX;
  - налоги 2026 г., кроме ставки НДС 22%;
  - часть сумм штрафов;
  - зарплата администратора в Краснодаре.

  Такие места в отчёте помечены **«нужно уточнить»**.
- **Почти все цифры о пропущенных звонках, неявках и «эффекте ботов» дают продавцы** телефонии и автоматизации. Клиенту их можно показывать как ориентир, но не как доказанный факт.
- **Себестоимость и рекомендованные цены — это мои расчёты** по найденным ценам. Все предположения в расчётах помечены словом **«допущение»**.
- **Цифр «по памяти» в отчёте нет.** Где в заметках не было цифры, стоит «нужно уточнить».
- **Юридический раздел — это информация, а не юридическая консультация.**

---

## 1. Пять лучших ниш: стоматологии первые, ремонт квартир — витрина

**Краснодар — большой и растущий рынок малого бизнеса.**
- Население на 1 января 2025 г. — 1 262 725 человек по данным Краснодарстата ([hour24.ru](https://hour24.ru/96717.html); [Кубанские новости](https://kubnews.ru/obshchestvo/2025/04/02/stalo-izvestno-skolko-chelovek-prozhivaet-v-krasnodarskom-krae/)).
- Субъектов МСП 107,7 тыс., за 2025 г. прибавилось 5,1 тыс. ([utyug.info](https://utyug.info/new/kolichestvo-predprinimateley-uvelichilos-na-5-tys-v-2025-godu-v-krasnodare-69936/)). «Коммерсантъ» даёт 108,9 тыс. и рост на 8,1% ([Коммерсантъ](https://www.kommersant.ru/doc/8604619)).

**Рынок ИИ для малого бизнеса не перегрет, но денег на него тратят мало.**
- Нейросети используют 53% МСП: годом раньше было 17% (ПСБ и «Опора России», август 2026, [Известия](https://iz.ru/2142702/2026-08-03/polovina-msp-ispolzuet-ii-dlia-sokrashcheniia-izderzhek)).
- Из предпринимателей, которые платят за ИИ, 38% тратят не больше 3 000 ₽ в месяц ([RB.ru](https://rb.ru/news/bolshe-poloviny-predprinimatelej-srednego-i-malogo-biznesa-platyat-za-nejroseti-38-tratyat-na-ii-do-3000-rublej-v-mesyac/)).
- Реже всего ИИ применяют для поддержки клиентов и голосового общения ([Т-Бизнес секреты](https://secrets.tbank.ru/trendy/kak-predprinimateli-i-sotrudniki-ispolzuyut-ii/)).

Вывод: ИИ-администратор ещё не массовый продукт, и продавать его нужно через деньги клиента.

### Топ-5 ниш с цифрами

| # | Ниша | Сколько в Краснодаре | Сколько стоит клиент (прайсы) | Боль (в основном данные вендоров) | Учётная система и интеграция |
|---|---|---|---|---|---|
| 1 | **Стоматологии** | 882 ([2ГИС](https://2gis.ru/krasnodar/search/%D0%A1%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8%2C%20%D1%81%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8/rubricId/222)) | лечение кариеса от 3 800 ₽ ([Руссдент](https://russdent.ru/uslugi-kliniki/terapiya/lechenie-kariesa)); имплант 27 000–28 000 ₽ ([Oneclinic](https://oneclinickrd.ru/prices), [Эскулап](https://www.med-23.ru/price/adult/)); «Все на 4» от 100 000 ₽ ([Стамус](https://stamus.ru/prices)) до 252 000–270 000 ₽ на Straumann ([PRO.Зубы](https://prozuby23.ru/prices/)) | клиники пропускают 15–30% звонков, в пиковые часы до 50–60% ([Stexa](https://stexa.ru/blog/skolko-pacientov-teryaet-klinika-na-neprinyatyh-zvonkah-schitaem-v/)); неявки 8–15% ([Revvy](https://revvy.ai/blog/tpost/bhe7n0k6o1-pochemu-patsienti-ne-prihodyat-na-priyom)) | IDENT: открытый API ([DentalPortal](https://dentalportal.ru/mis-ident-dlya-stomatologii)), больше 4 000 клиник ([MedBusiness](https://medbusiness.space/blog/automation/mis-dlja-stomatologii-2026-ident-dentalpro-ili-1s-sravnenie/)) |
| 2 | **Автосервисы и шиномонтаж** | 1 214 по рубрике СТО ([2ГИС](https://2gis.ru/krasnodar/search/%D0%90%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B%20(%D0%A1%D0%A2%D0%9E)/rubricId/9041)), 1 264 по поиску ([2ГИС](https://2gis.ru/krasnodar/search/%D0%90%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B0)) | нормо-час 2 100 ₽ в массовом сегменте по России ([ОСН](https://www.osnmedia.ru/avto/tsena-soderzhaniya-mashiny-v-rossii-k-2026-godu-vyrosla-na-40/)) и 2 500 ₽ у дилера в Краснодаре ([РОЛЬФ](https://www.rolf.ru/krd/offers/fiksirovannaia-stoimost-norma-casa-na-vas-skoda/)) | в регионах доля пропущенных звонков в авто не опускается ниже 13% (Calltouch, 2021, [Calltouch](https://www.calltouch.ru/blog/insajty-avtomobilnogo-rynka-2021-issledovanie-8-mln-obrashhenij-v-industrii/)) | системы разные: АвтоДилер, YCLIENTS-авто, а также Upservice и CarService Cloud с API ([Мегаплан](https://megaplan.ru/blog/crm/21-crm-sistema-dlya-avtoservisov-i-sto/), [Upservice](https://upservice.com/crm-dlya-avtoservisa)) |
| 3 | **Бьюти: салоны, барбершопы, ногтевые студии, косметология** | почти 2 тыс. салонов, +27,5% за год ([RB.ru](https://rb.ru/news/beauty-salons-russia/)) | маникюр с покрытием в среднем 1 500 ₽ ([Профи.ру](https://profi.ru/geo-ksdr/krasota/manicure/)); стрижка от ~600 ₽, в дорогих салонах от 3 000 ₽ ([2ГИС](https://2gis.ru/krasnodar/search/%D0%A1%D1%82%D1%83%D0%B4%D0%B8%D1%8F%20%D0%BA%D1%80%D0%B0%D1%81%D0%BE%D1%82%D1%8B%20%D1%86%D0%B5%D0%BD%D1%8B)) | неявки: маникюр 18%, парикмахерские 20%, массаж 37% (опрос мастеров, [Sostav](https://www.sostav.ru/blogs/284006/66483)); без ответа больше 13% звонков ([UIS](https://www.uiscom.ru/blog/oboydyemsya-bez-poter/)) | YCLIENTS: ~90% сетевых салонов в 2022 г. ([BeautyDigital](https://beautydigital.ru/analiz-rynka-servisov-onlayn-zapisi-v-salony-krasoty-2022-3q/)), открытый API ([Infostart](https://infostart.ru/public/1496814/)) |
| 4 | **Частные медцентры и диагностика** | 196–255 медцентров ([2ГИС](https://2gis.ru/krasnodar/search/%D0%9C%D0%B5%D0%B4%D0%B8%D1%86%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%D1%8B%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)); 370 диагностических центров ([2ГИС](https://2gis.ru/krasnodar/search/%D0%94%D0%B8%D0%B0%D0%B3%D0%BD%D0%BE%D1%81%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)) | нужно уточнить | пропуски 15–30%, в пики до 50–60%; больше всего пропусков в 9:00–11:00 и 18:00–20:00 ([Stexa](https://stexa.ru/blog/skolko-pacientov-teryaet-klinika-na-neprinyatyh-zvonkah-schitaem-v/), [rechka.ai](https://rechka.ai/blog/zvonok-v-kliniku/)) | Инфоклиника с двусторонним обменом расписанием ([Toolfox](https://toolfox.ru/services/s/infoclinica)), Medesk, 1С |
| 5 | **Ветклиники** | ~164 ([2ГИС](https://2gis.ru/krasnodar/search/%D0%92%D0%B5%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B0%D1%80%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20(%D0%B2%D0%B5%D1%82%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8)/rubricId/205)) | нужно уточнить | по модели Nodul — до 27,5 млн ₽ потерь в год у ветклиники с большим потоком ([RB.ru](https://rb.ru/news/biznes-teryaet-iz-za-propushennyh-zvonkov-do-96-mln-v-god-naibolshuyu-vyruchku-upuskayut-stomatologii-i-avtoservisy/)) | нужно уточнить |

Рубрика «Частные клиники» в 2ГИС насчитывает 971 организацию ([2ГИС](https://2gis.ru/krasnodar/search/%D0%A7%D0%B0%D1%81%D1%82%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)). Скорее всего, она пересекается со стоматологиями, поэтому складывать эти числа нельзя.

### Почему именно такой порядок

**Стоматологии.** Чек высокий, процесс стандартный, систему записи (IDENT) можно подключить через API.
- Пример из жизни: пациент звонит в 19:00 спросить про имплант, администратор уже ушёл, и пациент набирает следующую клинику. Если он шёл на имплантацию, клиника теряет 27 000–28 000 ₽ за один имплант, а при плане «Все на 4» — от 100 000 ₽ (прайсы выше).
- По модели Nodul стоматологии теряют на пропущенных звонках больше всех, до 96,2 млн ₽ в год ([RB.ru](https://rb.ru/news/biznes-teryaet-iz-za-propushennyh-zvonkov-do-96-mln-v-god-naibolshuyu-vyruchku-upuskayut-stomatologii-i-avtoservisy/)). Это модель для сети с большим потоком, к клинике на 2–4 кресла её переносить нельзя, а исследование опубликовал продавец ИИ-агентов.
- Минус: данные о здоровье, поэтому нужны особые юридические меры (раздел 5).

**Автосервисы.** Точек в городе больше всего, а по модели Nodul ниша вторая по потерям, 54,1 млн ₽ ([RB.ru](https://rb.ru/news/biznes-teryaet-iz-za-propushennyh-zvonkov-do-96-mln-v-god-naibolshuyu-vyruchku-upuskayut-stomatologii-i-avtoservisy/)).
- Пример: мастер в боксе с грязными руками трубку не возьмёт, а отдельного администратора во многих небольших СТО нет. Это вывод, а не измерение.
- Минус: учётные системы разные, интеграция обходится дороже. Рабочая схема — бот или робот пишет заявку в Telegram, MAX или таблицу.

**Бьюти.** Здесь больше всего точек и сильнее всего зависимость от записи и неявок, а интеграция проще всего через YCLIENTS. Но у ниши два минуса:
- низкий чек;
- жёсткая конкуренция с готовыми ИИ-администраторами на YCLIENTS за 500–3 990 ₽/мес (раздел 2).

Платить готовы сети, барбершопы и студии с несколькими мастерами. Соло-мастера не потянут: на Zoon вместе с ними 16 318 точек ([Zoon](https://zoon.ru/krasnodar/beauty/)).

**Медцентры и диагностика.** Боль сильная, но процессы сложнее: много врачей и услуг, подготовка к анализам. Требований к медданным больше, а независимых игроков меньше, чем стоматологий.

**Ветклиники.** Много срочных и вечерних звонков. Хорошо подходит голосовой робот-сортировщик: «срочно — едем» или «запись на плановый приём».
- Запасные кандидаты на 5-е место: фитнес (около 1 029 заведений на Zoon, число нужно перепроверить, [Zoon](https://zoon.ru/krasnodar/fitness/)) и агентства недвижимости. По UIS, в недвижимости без ответа остаётся каждый второй звонок ([Sostav](https://www.sostav.ru/publication/klient-uzhe-gotov-platit-a-vy-ego-teryaete-85968.html)).
- По обоим кандидатам не хватает краснодарских цифр.

### Ремонт квартир: пилот и витрина, но не массовый сегмент

| За | Против |
|---|---|
| Самый высокий чек за обращение: «двушка» 50–60 м² под ключ с материалами — 1,2–3,5 млн ₽ по прайсам краснодарских подрядчиков ([podklyuch23](https://podklyuch23.ru/tseny-na-remont/), [masterok23](https://masterok23.ru/sample-page/)). Ремонт под ключ «от 6 956 ₽/м²» ([s5r.ru](https://krasnodar.s5r.ru/remont-pod-klyuch)) | Повторных визитов нет, поэтому сценарий «ИИ-администратор пишет в YCLIENTS» не работает. Нужна квалификация заявки (бюджет, площадь, сроки, тип дома), а сделка длинная |
| У Сергея есть своя компания: кейс «до и после» на реальных цифрах — сильный аргумент в продажах | Сколько ремонтных компаний в Краснодаре и какую долю звонков они пропускают — **нужно уточнить** |
| Лендинг с калькулятором сметы, квиз и бот записи на замер хорошо ложатся на эту нишу | Многие подрядчики — микрокоманды без стабильного маркетингового бюджета (гипотеза, нужно проверить) |

**Вывод:** запускаем всё сначала на своей компании и делаем отдельный продукт «заявка → квалификация → запись на замер». Его же предлагаем смежным нишам, с которыми Сергей и так знаком: окна, двери, натяжные потолки, кухни на заказ, клининг после ремонта. Сколько таких компаний в городе, **нужно уточнить** в 2ГИС.

---

## 2. Конкуренты и их цены: студии продают сайты, SaaS — подписки, операторы — минуты

### 2.1. Лендинги: «рыночный пол» студий в Краснодаре — 30 000 ₽

| Компания | Где | Цена лендинга | Сроки | Источник |
|---|---|---|---|---|
| 24krd | Краснодар | базовый от 30 000 ₽; с калькулятором от 45 000 ₽; премиум от 65 000 ₽ | нужно уточнить | [24krd.ru](https://24krd.ru/services/landing.php) |
| Апельсин | Краснодар | от 30 000 ₽, обычно 30 000–50 000 ₽ на Tilda; предоплата 50% | ~10 дней | [apelsin.media](https://apelsin.media/sajt-na-tilde) |
| Clyovo AI | Краснодар | лендинг 30 000 ₽; сайт до 5 страниц 60 000 ₽ | нужно уточнить | [clyovo.ru](https://clyovo.ru/blog/chat-bot-tsena-2026) |
| ART6 | Краснодар | от 60 000 до 180 000 ₽, на разных страницах цифры расходятся | нужно уточнить | [art6.ru](https://art6.ru/sozdanie-lendingov/), [art6.ru/krasnodar](https://art6.ru/krasnodar/sozdanie-lendingov-na-tilda) |
| Вектор.Маркет | страница для Краснодара | 30 000 ₽ (7–10 блоков, Tilda) | 2–3 недели | [vektor.market](https://krasnodar.vektor.market/sayty-na-tilde) |
| Студия «Эксперт» | страница для Краснодара | от 30 000 ₽ (Tilda) | 20 дней | [studio-expert.ru](https://krasnodar.studio-expert.ru/razrabotka-sajtov/tilda/) |
| Скадиум | страница для Краснодара | от 34 900 ₽ | от 20–21 дня | [skadium.ru](https://krasnodar.skadium.ru/zakazat-lending/) |
| Craft Promotion | страница для Краснодара | от 40 000 ₽ | нужно уточнить | [craftpromotion.ru](https://craftpromotion.ru/krasnodar/development/landing-page) |
| Lead.Media | страница для Краснодара | от 53 000 до 167 000 ₽ | 5–14 рабочих дней | [lead.media](https://lead.media/krasnodar/sozdanie-sajtov/lending/) |
| Tildzilla | страница для Краснодара | от 24 000 ₽ | нужно уточнить | [tildzilla.ru](https://tildzilla.ru/krasnodar) |
| Zasovskiy | страница для Краснодара | «Старт» 20 000 ₽, «Стандарт» 40 000 ₽ | нужно уточнить | [zasovskiy.ru](https://zasovskiy.ru/krasnodar/razrabotka/razrabotka-landinga/) |
| Мегагрупп | федеральная компания | 10 900 ₽ | 3–5 дней | [megagroup.ru](https://megagroup.ru/krasnodar/landing-page) |

**Фрилансеры задают нижнюю границу цены:**
- лендинг на Профи.ру в Краснодаре: от 5 000 ₽, в среднем 8 000 ₽ ([Профи.ру](https://profi.ru/geo-ksdr/it_freelance/programmer/sozdanie-saita/landing-page/price/));
- конкретные предложения на Kwork: от 4 500 ₽ ([Kwork](https://kwork.ru/web-plus-mobile-design/13576057/lending-na-tilda-pod-klyuch-nastroyki-seo-v-podarok)) до 25 000 ₽ ([Kwork](https://kwork.ru/website-development/13344459/razrabotka-unikalnogo-lendinga-tilda-dizayn-i-verstka-sayta-tilda));
- на Яндекс Услугах в Краснодаре 154–157 исполнителей «создание лендинга» ([Яндекс Услуги](https://uslugi.yandex.ru/35-krasnodar/category?text=%D1%81%D0%BE%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5+%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3%D0%B0)).

Многие «краснодарские» страницы в этом списке на деле — SEO-поддомены иногородних компаний. Поэтому «мы правда в Краснодаре, можно встретиться» само по себе отличает нас от конкурентов.

### 2.2. Боты, ИИ и голос у местных игроков

| Компания | Что продаёт | Цена | Источник |
|---|---|---|---|
| **Clyovo AI** (Краснодар) — ближайший конкурент | ИИ-студия: боты для Telegram, MAX и сайта, ИИ-агенты | BASIC 50 000 ₽ (бот с ответами на вопросы, 5 дней); PRO 100 000 ₽ (база знаний, CRM, 2 недели); ENTERPRISE 200 000 ₽ (голосовые сценарии, 6 мес. поддержки); ИИ-агент 150 000 ₽ | [clyovo.ru](https://clyovo.ru/blog/chat-bot-tsena-2026) |
| SEO Temple (поддомен для Краснодара) | Telegram-боты с CRM, оплатой, ИИ | от 30 000 ₽ | [seotemple.ru](https://krasnodar.seotemple.ru/services/razrabotka-chat-bota/) |
| Студия «Поток» (страница для Краснодара) | бот записи для салонов в Telegram и WhatsApp | «Старт» от 12 900 ₽ разово; «Бизнес» от 24 900 ₽ + от 1 900 ₽/мес; «Макс» от 49 000 ₽ + от 3 900 ₽/мес | [a-potok.ru](https://a-potok.ru/), [страница Краснодара](https://www.a-potok.ru/bot/beauty/krasnodar) |
| Digital Transformed (страница для Краснодара) | внедрение ИИ, практикумы | по запросу | [digitaltransformed.ru](https://www.digitaltransformed.ru/business-ai-krasnodar) |
| Гравител, AiCall (страница для Краснодара) | голосовой робот | 3 000 ₽/мес + 4,6 ₽/мин; готовый сценарий от 10 000 ₽, индивидуальный от 30 000 ₽; GPT-ответы +1,5 ₽/мин; запуск 3–5 дней. На странице тарифов другие цифры | [gravitel.ru](https://gravitel.ru/products/golosovoy-robot-dlya-biznesa-v-krasnodare/), [тарифы](https://gravitel.ru/tariff/robot-aicall/) |
| МегаФон (Краснодарский край) | голосовой робот | 2 000 минут за 12 000 ₽ + телефония 1,4 ₽/мин; сверх пакета 6,1 ₽/мин | [megafon.ru](https://krasnodar.megafon.ru/corporate/services/golosovoy_robot) |
| DTCO (страница для Краснодара) | голосовой робот на входящие и исходящие | от 5 ₽/мин, запуск от 2 дней | [dtco.ru](https://www.dtco.ru/krasnodar/service/golosovoj-robot/) |

**Фрилансеры на ботах:**
- Telegram-бот на Профи.ру в Краснодаре: от 2 000 ₽, в среднем 5 400 ₽; на другой версии страницы средняя цена 6 400 ₽ ([Профи.ру](https://profi.ru/geo-ksdr/it_freelance/razrabotka-botov-telegram/));
- на Яндекс Услугах 110 исполнителей ([Яндекс Услуги](https://uslugi.yandex.ru/35-krasnodar/category?text=%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0+%D1%82%D0%B5%D0%BB%D0%B5%D0%B3%D1%80%D0%B0%D0%BC%D0%BC+%D0%B1%D0%BE%D1%82%D0%BE%D0%B2));
- GPT-бот на Kwork стоит от 1 000 ₽ ([Kwork](https://kwork.ru/script-programming/32135302/chat-gpt-bot-na-baze-chatgpt-4-v-vashem-telegram-bote-dalle-3-web)) до 4 500 ₽ ([Kwork](https://kwork.ru/script-programming/30141119/chat-gpt-4-telegramm-bot));
- бот с ИИ на n8n на Freelance.ru — 3 200 ₽ ([Freelance.ru](https://freelance.ru/offer/chat-bot-telegramm-s-ii-na-n8n-i-ustanovkoj-na-server-beget-82362.html)).

С фрилансерами по цене не соревнуемся. Отличаемся поддержкой, ответственностью и интеграциями.

### 2.3. Готовые ИИ-администраторы по подписке (SaaS) — главный демпинг в бьюти

| Сервис | Цена | Для кого | Источник |
|---|---|---|---|
| ИИ-админы в маркетплейсе YCLIENTS («Афина ИИ» и др.) | от 500 / от 990 / от 2 490 ₽/мес | салоны, запись в YCLIENTS | [yclients.ru](https://www.yclients.ru/marketplace/revvy) |
| Jivo «ИИ для YCLIENTS» | 3 990 ₽/мес (в справке от 1 342 ₽, лимит 2 000 диалогов; цены противоречат друг другу) | салоны | [jivo.ru](https://www.jivo.ru/yclients-ai/) |
| НУБИ | 490 / 990 / 1 990 / 4 990 ₽/мес | салоны и мастера | [нуби.рф](https://xn--80abvbv0b.xn--p1ai/) |
| SmartAgentix | от 990 до 9 990 ₽/мес | салоны и барбершопы, YCLIENTS на любом тарифе | [smartagentix.ru](https://smartagentix.ru/) |
| jAutomation | от 990 ₽/мес; запись через YCLIENTS от 5 000 ₽/мес | салоны | [jautomation.ru](https://jautomation.ru/) |
| Intly AI | 1 790 / 4 790 / 9 590 ₽/мес (~6 ₽ за простой диалог) | салоны, Telegram | [intly.ru](https://intly.ru/solutions/beauty-salons) |
| NeuroAgents | ИИ-менеджер от 4 999 ₽/мес | WhatsApp, Telegram, Авито | [neuroagents.pro](https://neuroagents.pro/) |
| Jivo ИИ-оператор | 12 990 ₽/мес за 2 000 диалогов | любой бизнес | [jivo.ru/ai-agent](https://www.jivo.ru/ai-agent/) |

Для клиник и автосервисов готовых ИИ-администраторов с публичной ценой не нашлось. Там работает заказная разработка, и это шанс для агентства ([vc.ru](https://vc.ru/ai/1709156)).

### 2.4. Интеграторы «под ключ» по России

| Компания | Разово | В месяц | Источник |
|---|---|---|---|
| AIBOT MANAGER | базовый нейросотрудник 30 000–80 000 ₽; с CRM 80 000–250 000 ₽ | 3 000–10 000 ₽ (API, хостинг) | [aibotmanager.ru](https://aibotmanager.ru/nejrosotrudniki-faq/) |
| Нейро42 | интеграция отдельно | 15 000 / 30 000 / 45 000 ₽ | [neuro42.ru](https://neuro42.ru/neuro-employees/pricing/) |
| Raketa Digital «МедЧат» (клиники) | — | от 35 000 ₽ | [raketadigital.com](https://raketadigital.com/blog/medchat-ii/ii-administrator-dlya-stomatologii-kak-ne-teryat-patsientov-24-7/) |
| Webseed, ИИ-обзвон для стоматологии | 80 000 / 100 000 / 250 000 ₽ | + 12 ₽/мин, без абонплаты | [webseed.ru](https://webseed.ru/ai/agents/ai-obzvon-dlya-stomatologii-zapis-i-napominanie-patsientam) |
| Aiorkestrator | бот от 50 000 ₽; ИИ-ассистент с базой знаний от 140 000 ₽ | — | [aiorkestrator.ru](https://aiorkestrator.ru/uslugi/telegram-bot/) |
| L7 Agency | чат-боты с ИИ от 25 000 ₽; ставка от 1 850 ₽/час | — | [l7agency.ru](https://l7agency.ru/ai) |
| La-Chatte | ИИ-продавец от 250 000 ₽ | поддержка от 50 000 ₽ | [la-chatte.com](https://la-chatte.com/services/ai-prodavec/) |

По обзорам вендоров, настройка ИИ-бота для малого бизнеса стоит 15 000–50 000 ₽ ([Sostav](https://www.sostav.ru/blogs/281569/86687); [SwiftAgents](https://swiftagents.ru/blog/skolko-stoit-vnedrit-ii-v-malyy-biznes)). Выдача не связала эту цифру с одной из двух статей, её нужно сверить.

### 2.5. Голосовые роботы: цена минуты и настройки

| Вендор | Минута | Настройка «под ключ» | Источник |
|---|---|---|---|
| Билайн бизнес | от 3,5 ₽/мин без НДС; 7 000 ₽/мес за 2 000 мин | по заявке | [beeline.ru](https://moskva.beeline.ru/business/telephony/cloud-ats/virtyalniy-operator/) |
| Mango Office | 4,5 ₽/мин; «Цифровые сотрудники» от 6,5 ₽/мин; опция «робот-администратор» 10 000 ₽/мес ([тарифы](https://blagoveshensk.mango-office.ru/products/contact-center/tariffs/)) | от 48 000 / 90 000 / 150 000 ₽ | [mango-office.ru](https://www.mango-office.ru/products/contact-center/ai/voice-robot/) |
| МТС Exolve | робот с NLP от 4,75 ₽; с ИИ-агентом 6,5 ₽/мин | от 52 000 ₽ | [exolve.ru](https://exolve.ru/tariffs/robots/) |
| Twin | голосовой ИИ-агент от 7 ₽/мин | разработка от 30 000 ₽ | [twin24.ai](https://twin24.ai/products/voice-ai-agent/), [стоимость](https://promo.dev.twin24.ai/cost) |
| Zvonobot | 3,0–5 ₽/мин; разговор на нейросетях от 12 ₽/мин | от 100 000 ₽; интеграция с CRM от 30 000 ₽ | [zvonobot.ru](https://zvonobot.ru/) |
| Voximplant | бот от 5 ₽/мин без НДС | — | [voximplant.ru](https://voximplant.ru/products/voicebot) |
| Voxys | 3,6–5 ₽/мин | от 209 000 ₽; поддержка от 15 000 ₽/мес | [voxys.ru](https://www.voxys.ru/cifrovye-reshenija/golosovye-roboty.html) |
| Aimylogic (Just AI) | тарифы Calls 1 089–17 490 ₽/мес + телефония от 2,58 ₽/мин | — | [aimylogic.com](https://aimylogic.com/ru/price) |
| Neuro.net Nebo | 4,5 ₽ за звонок, оплачиваются только звонки с ответом | — | [neuro.net](https://neuro.net/ru/nebo/) |

Сам Гравител ориентирует так: сценарный бот стоит 3–8 ₽/мин, ИИ-бот 10–25 ₽/мин, кастомное решение от 150 000 ₽ ([gravitel.ru](https://gravitel.ru/blog/robot-aicall/skolko-stoit-golosovoj-robot-v-2026-godu-polnyj-razbor-czen/)).

Twin продаёт франшизу «агентства ботов» и обещает «доход от 300 000 руб/мес» ([franchise.twin24.ai](https://franchise.twin24.ai/)). Это маркетинговое заявление. Но оно значит, что в Краснодаре могут появиться франчайзи с той же моделью.

### 2.6. Что клиент может собрать сам (конструкторы)

| Платформа | Цена | Источник |
|---|---|---|
| Salebot | «Бизнес» 2 999 ₽/мес; есть свой модуль онлайн-записи | [docs.salebot.pro](https://docs.salebot.pro/nashi-uslugi/tarify) |
| ProTalk | 490 / 990 / 2 900 / 9 900 ₽/мес; доп. токены 30 ₽ за 1 млн | [pro-talk.ru](https://pro-talk.ru/) |
| Leadteh | PRO от 1 390 ₽/мес | [help.leadteh.ru](https://help.leadteh.ru/tarify/) |
| BotHelp | PRO от 1 599 ₽/мес | [bothelp.io](https://bothelp.io/pricing) |
| Puzzlebot | 891–2 990 ₽/мес | [puzzlebot.top](https://puzzlebot.top/price?lang=en) |
| SmartBot Pro | от 990 ₽/мес за 100 пользователей | [smartbotpro.ru](https://www.smartbotpro.ru/info) |
| SaluteBot (Сбер) | бесплатно до 50 пользователей; от 990 ₽/мес | [developers.sber.ru](https://developers.sber.ru/portal/products/salutebot-chat-bot) |

Клиент может сам собрать ИИ-бота за 490–3 000 ₽ в месяц. Значит, агентство берёт деньги не за софт, а за настройку, базу знаний, интеграцию с записью и сопровождение. Эти же платформы годятся агентству как основа для своих решений.

### 2.7. Где свободное место

Ни один найденный краснодарский игрок не продаёт открыто связку «лендинг + ИИ-администратор + голосовой робот + ежемесячное сопровождение» с понятным прайсом.
- Clyovo берёт за вход 50 000 ₽, и в базовых пакетах не видно абонплаты.
- «Поток» дешёвый, но он не из Краснодара, и про ИИ у него в выдаче ничего нет.
- Операторы связи продают минуты без настройки контента под бизнес.

Наша позиция — **местный исполнитель «под ключ»**:
- разовая настройка дешевле Clyovo;
- абонплата выше SaaS, но ниже Нейро42 и «МедЧата»;
- голос и несколько каналов в комплекте.

Это вывод из сравнения прайсов, а не проверенная рыночная гипотеза.

---

## 3. Пакеты и цены агентства: рекомендация, привязанная к ценам конкурентов

> **Важно: это рекомендация автора отчёта, а не рыночный факт.** Каждая цена ниже либо совпадает с ценой конкурента, либо лежит внутри диапазона конкурентов (ссылки в колонке «На что опираемся»). Себестоимость считается в разделе 4. Купят ли по этим ценам, покажут только первые встречи.

| Пакет | Что входит | Разово (рекомендация) | В месяц (рекомендация) | На что опираемся |
|---|---|---|---|---|
| **«Старт»** | Лендинг + бот заявок в Telegram и MAX (без ИИ) + уведомления владельцу + документы для формы (согласие, политика) | **30 000 ₽** | **1 900 ₽** (хостинг, мелкие правки, мониторинг) | 30 000 ₽ — «пол» студий Краснодара: [24krd](https://24krd.ru/services/landing.php), [Апельсин](https://apelsin.media/sajt-na-tilde), [Вектор.Маркет](https://krasnodar.vektor.market/sayty-na-tilde), [Clyovo](https://clyovo.ru/blog/chat-bot-tsena-2026). 1 900 ₽/мес — абонплата «Потока» на тарифе «Бизнес» ([a-potok.ru](https://a-potok.ru/)) |
| **«ИИ-администратор»** | ИИ-чат на сайте, в Telegram и MAX: ответы по базе знаний, запись в YCLIENTS, IDENT или таблицу, перевод на человека, отчёт раз в месяц. **Лимит — 1 000 диалогов в месяц**, сверх лимита 6 ₽ за диалог | **30 000–50 000 ₽** | **5 000–10 000 ₽** | Разово: базовый нейросотрудник AIBOT MANAGER от 30 000 ₽ ([aibotmanager.ru](https://aibotmanager.ru/nejrosotrudniki-faq/)), Clyovo BASIC 50 000 ₽ ([clyovo.ru](https://clyovo.ru/blog/chat-bot-tsena-2026)). В месяц: AIBOT MANAGER 3 000–10 000 ₽; jAutomation с записью через YCLIENTS от 5 000 ₽ ([jautomation.ru](https://jautomation.ru/)); модель сопровождения 10 000 ₽ у [ИдеиPRO](https://ideipro.ru/mikroagentstvo-ai-avtomatizatsii-biznes-ideya-2026-s-raschyotom/); дешевле ИИ-оператора Jivo за 12 990 ₽ ([jivo.ru](https://www.jivo.ru/ai-agent/)). Сверх лимита: Intly ~6 ₽ за простой диалог ([intly.ru](https://intly.ru/solutions/beauty-salons)) |
| **«Голосовой робот»** | Робот на входящие звонки (вечер, выходные, пики): ответы, запись, перевод на человека; сервисные напоминания о визите. **Лимит — 1 000 минут входящих**, сверх лимита 5 ₽/мин; исходящие напоминания 7 ₽/мин | **30 000–48 000 ₽** | **10 000 ₽** | Разово: индивидуальный сценарий Гравитела от 30 000 ₽ ([gravitel.ru](https://gravitel.ru/products/golosovoy-robot-dlya-biznesa-v-krasnodare/)), разработка у Twin от 30 000 ₽ ([twin24](https://promo.dev.twin24.ai/cost)), Mango «Быстрый старт» от 48 000 ₽ ([mango-office.ru](https://www.mango-office.ru/products/contact-center/ai/voice-robot/)). В месяц: опция Mango «робот-администратор» 10 000 ₽ ([Mango](https://blagoveshensk.mango-office.ru/products/contact-center/tariffs/)). Для сравнения, Гравител с GPT-ответами на 1 000 мин стоит 3 000 + 1 000 × (4,6 + 1,5) = 9 100 ₽ (расчёт по [прайсу Гравитела](https://gravitel.ru/products/golosovoy-robot-dlya-biznesa-v-krasnodare/)). Сверх лимита: DTCO и Voximplant от 5 ₽/мин ([DTCO](https://www.dtco.ru/krasnodar/service/golosovoj-robot/), [Voximplant](https://voximplant.ru/products/voicebot)); исходящие — Twin от 7 ₽/мин ([twin24](https://twin24.ai/products/voice-ai-agent/)) |
| **«Под ключ»** | Лендинг + ИИ-администратор + голосовой робот + единый отчёт + обновление базы знаний + подготовка черновиков документов по ПДн вместе с партнёром-юристом | **100 000 ₽** | **20 000 ₽** | Разово: Clyovo PRO 100 000 ₽ ([clyovo.ru](https://clyovo.ru/blog/chat-bot-tsena-2026)), Webseed «Стандарт» 100 000 ₽ ([webseed.ru](https://webseed.ru/ai/agents/ai-obzvon-dlya-stomatologii-zapis-i-napominanie-patsientam)); внутри диапазона AIBOT MANAGER 80 000–250 000 ₽; сумма «Старт» + «ИИ-администратор» + «Голос» = 90 000–128 000 ₽ (расчёт). В месяц: между Нейро42 15 000 ₽ и «МедЧатом» от 35 000 ₽ ([neuro42.ru](https://neuro42.ru/neuro-employees/pricing/), [raketadigital.com](https://raketadigital.com/blog/medchat-ii/ii-administrator-dlya-stomatologii-kak-ne-teryat-patsientov-24-7/)); равно сумме верхних абонплат «ИИ-администратора» и «Голоса» (10 000 + 10 000) |

### Хватает ли абонплаты на работу (расчёт)

Из абонплаты вычитаем прямые затраты из раздела 4 и считаем, сколько часов работы остаётся. Часы считаем по рыночной ставке 1 800 ₽/ч: это средняя часовая ставка по самоотчётам digital-агентств на Workspace ([workspace.ru](https://workspace.ru/calculator/rossiya/sajt-pod-klyuch/landing-page/ehkonom/)); у L7 Agency ставка от 1 850 ₽/ч ([l7agency.ru](https://l7agency.ru/ai)).

Допущения:
- ИИ-чат работает на YandexGPT Lite: 2 640 ₽ за 1 000 диалогов;
- голос — входящие на SpeechKit + YandexGPT Lite: 2 163 ₽ за 1 000 мин;
- хостинг — 192 ₽ на клиента (VPS за 960 ₽ на 5 клиентов);
- цены Tilda и домена не найдены, поэтому в расчёт не вошли.

| Пакет | Абонплата | Прямые затраты (расчёт) | Остаток на работу | ≈ часов по 1 800 ₽/ч |
|---|---|---|---|---|
| «Старт» | 1 900 ₽ | 192 ₽ (+ Tilda и домен — нужно уточнить) | 1 708 ₽ | ≈0,9 ч |
| «ИИ-администратор», нижняя цена | 5 000 ₽ | 2 640 + 192 = 2 832 ₽ | 2 168 ₽ | ≈1,2 ч |
| «ИИ-администратор», верхняя цена | 10 000 ₽ | 2 832 ₽ | 7 168 ₽ | ≈4 ч |
| «Голосовой робот» | 10 000 ₽ | 2 163 + 192 = 2 355 ₽ | 7 645 ₽ | ≈4,2 ч |
| «Под ключ» | 20 000 ₽ | 2 640 + 2 163 + 192 = 4 995 ₽ | 15 005 ₽ | ≈8,3 ч |

**Что из этого следует:**
- 5 000 ₽/мес окупают примерно час работы в месяц. Это нижняя граница только для простых бьюти-клиентов на YCLIENTS. Стоматологиям и автосервисам — верхняя цена.
- Сверх лимита наценка остаётся и при росте нагрузки. Диалог стоит нам 2,64 ₽, продаём за 6 ₽. Минута входящих стоит ≈2,16 ₽, продаём за 5 ₽. Минута исходящих стоит ≈4,24 ₽, продаём за 7 ₽ (расчёт в разделе 4).
- Если строить голос на партнёрской платформе Twin, минута исходящего звонка обойдётся в 1,7 + 3,6 = 5,3 ₽ ([оферта Twin](https://school.twin24.ai/oferta-partner-quick-start)). Тогда 7 ₽/мин почти не оставляют запаса. Партнёрскую ставку Twin на входящие **нужно уточнить**.

### Как адаптировать пакеты под ниши

- **Бьюти.** Свой ИИ-администратор по подписке дешевле 500–3 990 ₽ не продать: SaaS на YCLIENTS уже там ([YCLIENTS](https://www.yclients.ru/marketplace/revvy), [Jivo](https://www.jivo.ru/yclients-ai/)). Предлагаем «Старт» плюс голосового робота или берём деньги за настройку готового SaaS. Ещё один вариант — партнёрка DIKIDI: 25% платежей клиента в течение 6 месяцев ([dikidi.net](https://dikidi.net/ru/referrals)).
- **Стоматологии и медцентры.** «ИИ-администратор» по верхней цене или «Под ключ». На рынке планка выше: «МедЧат» стоит от 35 000 ₽/мес ([raketadigital.com](https://raketadigital.com/blog/medchat-ii/ii-administrator-dlya-stomatologii-kak-ne-teryat-patsientov-24-7/)). Бот записывает только ФИО, телефон и время, без жалоб (раздел 5).
- **Автосервисы.** Главный продукт — «Голосовой робот»: мастер не берёт трубку. Плюс бот, который пишет заявку на ТО в MAX, Telegram или таблицу.
- **Ремонт и смежные ниши.** «Старт» плюс ИИ-квалификация заявки (площадь, бюджет, сроки) и запись на замер.

### Пилот для первых клиентов

**Предложение:**
- пилот на 2–4 недели;
- клиент платит только себестоимость: токены, минуты и хостинг, это сотни рублей и единицы тысяч (раздел 4);
- взамен — согласие на кейс с цифрами и отзыв;
- метрики согласуем до старта: время ответа, доля обращений без участия человека, число записей.

Пилоты практикуют и другие: например, «ЮгСпецСети» предлагает пилот (MVP) на 2 месяца ([ЮгСпецСети](https://xn--c1aeam6alcj7a5e.xn--p1ai/news/tpost/mb524v1gl1-forum-tsifrovaya-evolyutsiya-2026-pochem)). Это рекомендация, и делать её стоит только для первых 2–3 клиентов.

---

## 4. Себестоимость: токены и минуты стоят сотни рублей, дороже всего — часы работы

Все цены проверены 04.11.2026 по поисковой выдаче. С 01.01.2026 основная ставка НДС — 22% ([Habr](https://habr.com/ru/companies/x-com/articles/1035500/)). Агентство на УСН или НПД не возмещает НДС, поэтому считаем по ценам **с НДС**, если провайдер их так указывает.

### 4.1. Прайс компонентов

**LLM (языковые модели) — только российские, с оплатой в рублях**

| Модель | Цена за 1 000 токенов | НДС | Источник |
|---|---|---|---|
| GigaChat 2 Lite / Pro / Max | 0,065 / 0,5 / 0,65 ₽ (65 / 500 / 650 ₽ за 1 млн), с 01.02.2026 | с НДС | [developers.sber.ru](https://developers.sber.ru/docs/ru/gigachat/tariffs/legal-tariffs) |
| YandexGPT Lite | 0,2 ₽ (синхронно), 0,1 ₽ (асинхронно) | с НДС (вторичный источник) | [levitsky-c.ru](https://levitsky-c.ru/articles/ceny-yandexgpt-alice-ai-gigachat-api-oktyabr-2026) |
| YandexGPT Pro 5.1 | 0,8 ₽ (синхронно) | с НДС (вторичный источник) | [levitsky-c.ru](https://levitsky-c.ru/articles/ceny-yandexgpt-alice-ai-gigachat-api-oktyabr-2026), [3DNews](https://3dnews.ru/1128362) |
| Alice AI LLM | 0,5 ₽ за входные и 1,2 ₽ за выходные токены | с НДС | [levitsky-c.ru](https://levitsky-c.ru/articles/ceny-yandexgpt-alice-ai-gigachat-api-oktyabr-2026) |
| *Для справки:* Claude Haiku 4.5 / Sonnet 5 | $1 / $5 и $2 / $10 за 1 млн токенов (вход / выход) | USD, без НДС РФ | [platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing) |

Claude и GPT из России доступны только через реселлеров. По агрегатору, токены у них дороже на 10–30% ([toolfox.ru](https://toolfox.ru/services/s/openrouter/alternatives)), к этому добавляются курсовой и юридический риски (разделы 5 и 8). Официальную страницу тарифов Yandex AI Studio открыть не удалось, поэтому цены YandexGPT **нужно уточнить**.

**Речь (распознавание и синтез)**

| Компонент | Цена | Источник |
|---|---|---|
| Yandex SpeechKit, потоковое распознавание (STT) | 0,1626 ₽ за 15 с с НДС, то есть 0,6504 ₽/мин | [aistudio.yandex.ru](https://aistudio.yandex.ru/docs/ru/speechkit/pricing.html) |
| SpeechKit, синтез (TTS) API v1 | 1 342 ₽ за 1 млн символов с НДС | [aistudio.yandex.ru](https://aistudio.yandex.ru/ru/docs/speechkit/pricing) |
| SpeechKit TTS v3 livetts | 0,25 ₽ за запрос | там же |
| SaluteSpeech (Сбер) | распознавание 0,01 ₽/с (0,6 ₽/мин); **с 15.07.2026 новым клиентам пакеты и оплата по факту недоступны** | [developers.sber.ru](https://developers.sber.ru/docs/ru/salutespeech/tariffs/legal-tariffs) |
| T-Bank VoiceKit | по запросу, **нужно уточнить** | [toolfox.ru](https://toolfox.ru/services/s/tinkoff-voicekit) |

**Телефония**

| Провайдер | Цена | Источник |
|---|---|---|
| Телфин | номер от 150 ₽/мес; исходящие от 0,45 ₽/мин; входящие бесплатно (по вторичному источнику) | [telphin.ru](https://www.telphin.ru/products/virtual-numbers), [Computerra](https://www.computerra.ru/357497/biznes-vozvrashhaetsya-k-telefonii-sravnivaem-6-virtualnyh-ats-s-tsenami/) |
| Novofon | тариф «Стандарт» 340 ₽/мес; мобильные 1,65 ₽/мин; номер от 240 ₽/мес | [novofon.com](https://novofon.com/tariffs/standart/) |
| МТС Exolve | городской номер от 210 ₽/мес | [exolve.ru](https://exolve.ru/tariffs/) |
| Манго Офис | многоканальный номер 861 — 250 ₽/мес; ВАТС в Краснодаре от 1 600 ₽/мес | [mango-office.ru](https://www.mango-office.ru/tariffs/numbers/), [krasnodar.mango-office.ru](https://krasnodar.mango-office.ru/products/virtualnaya_ats/price/) |

**Хостинг в РФ (VPS: 1 vCPU, 2 ГБ)**

| Провайдер | Цена | Источник |
|---|---|---|
| FirstVDS «Старт» | 519 ₽/мес | [vpsindex.ru](https://vpsindex.ru/provider/firstvds) |
| Timeweb Cloud MSK 30 | 657 ₽/мес | [free-hosting.ru](https://free-hosting.ru/timeweb-cloud/) |
| Beget | 810–960 ₽/мес | [hostinghub.ru](https://hostinghub.ru/beget), [vpsindex.ru](https://vpsindex.ru/provider/beget) |

**Цены не найдены, всё ниже — нужно уточнить:**
- Tilda;
- домен .ru;
- SSL;
- GitHub Pages;
- WhatsApp Business API;
- MAX для бизнеса;
- плата за API YCLIENTS;
- тарифы Битрикс24 и amoCRM на 2026 г.

### 4.2. Формула (а): ИИ-администратор в чате

**Допущения:**
- допущение: 1 диалог = 8 обращений к модели;
- допущение: одно обращение = 1 500 входных токенов (инструкция, кусок базы знаний, история) + 150 выходных;
- допущение: у Яндекса и Сбера одинаковое число токенов на тот же текст (на деле токенизаторы разные);
- допущение: синхронный режим, без кэширования;
- допущение: Telegram Bot API бесплатен (в заметках не подтверждено).

**Формула:**
- токены на диалог: 8 × (1 500 + 150) = **13 200**;
- `Себестоимость = N диалогов × 13 200 / 1 000 × цена за 1 000 токенов`.

| Модель | ₽ за диалог | 300 диалогов | 1 000 диалогов | 3 000 диалогов |
|---|---|---|---|---|
| GigaChat 2 Lite (0,065 ₽) | 0,86 | 257 ₽ | **858 ₽** | 2 574 ₽ |
| YandexGPT Lite (0,2 ₽) | 2,64 | 792 ₽ | **2 640 ₽** | 7 920 ₽ |
| GigaChat 2 Pro (0,5 ₽) | 6,60 | 1 980 ₽ | 6 600 ₽ | 19 800 ₽ |
| YandexGPT Pro 5.1 (0,8 ₽) | 10,56 | 3 168 ₽ | 10 560 ₽ | 31 680 ₽ |

Пример из жизни: салон, где 1 000 переписок в месяц, на YandexGPT Lite стоит около 2 640 ₽ токенов. Если та же 1 000 переписок идёт на Pro-модели, расход вырастает до 10 560 ₽, и абонплата 5 000 ₽ уходит в минус. Поэтому в пакете нужны лимит диалогов и простая модель по умолчанию.

### 4.3. Формула (б): голосовой робот, 500 звонков по 2 минуты (1 000 минут)

**Допущения:**
- допущение: 500 звонков × 2 мин = M = 1 000 минут;
- допущение: распознаём всю речь абонента, без потерь на округление до 15 с;
- допущение: робот произносит 600 символов за звонок, то есть 300 000 символов в месяц;
- допущение: 6 обращений к модели за звонок × (1 500 + 100) токенов, то есть 4,8 млн токенов в месяц;
- допущение: входящие идут на номер Телфина (150 ₽/мес), сами входящие бесплатны;
- допущение: исходящие идут через Novofon: 340 ₽ + номер 240 ₽ + 1 000 мин на мобильные по 1,65 ₽;
- допущение: сервер робота (оркестрация звонков) считается отдельно, в пункте (в).

**Формулы:**
- распознавание (STT) в SpeechKit: `M × 4 × 0,1626` = **650,40 ₽**;
- синтез (TTS) в SpeechKit v1: `300 000 / 1 000 000 × 1 342` = **402,60 ₽**;
- модель: `4 800 000 / 1 000 × цена`. YandexGPT Lite — **960 ₽**, GigaChat Lite — **312 ₽**;
- телефония на входящие: **150 ₽**; на исходящие: `340 + 240 + 1 000 × 1,65` = **2 230 ₽**.

| Сценарий | Телефония | STT | TTS | LLM | **Итого в месяц** | За минуту |
|---|---|---|---|---|---|---|
| Входящие, Телфин + SpeechKit + GigaChat Lite | 150 | 650,40 | 402,60 | 312 | **1 515 ₽** | ≈1,5 ₽ |
| Входящие, Телфин + SpeechKit + YandexGPT Lite | 150 | 650,40 | 402,60 | 960 | **2 163 ₽** | ≈2,16 ₽ |
| Исходящие, Novofon + SpeechKit + GigaChat Lite | 2 230 | 650,40 | 402,60 | 312 | **3 595 ₽** | ≈3,6 ₽ |
| Исходящие, Novofon + SpeechKit + YandexGPT Lite | 2 230 | 650,40 | 402,60 | 960 | **4 243 ₽** | ≈4,24 ₽ |

Для сравнения: пакет МегаФона — 14 800 ₽ за 2 000 минут с телефонией ([megafon.ru](https://moscow.megafon.ru/corporate/services/golosovoy_robot)). Своя сборка намного дешевле по минутам, но её нужно разрабатывать и поддерживать.

В расчёт не вошли: сервер для SIP и логики звонка, хранение записей разговоров, тарификация входящих у Novofon, цена номера 861 у Телфина и Novofon. Всё это **нужно уточнить**.

### 4.4. Формула (в): хостинг на клиента

- допущение: один VPS обслуживает K клиентов, а тяжёлую работу делают облачные API;
- `Хостинг на клиента = цена VPS / K`.

| VPS | K = 1 | K = 5 | K = 10 |
|---|---|---|---|
| FirstVDS 519 ₽ | 519 ₽ | 103,8 ₽ | **51,9 ₽** |
| Timeweb 657 ₽ | 657 ₽ | 131,4 ₽ | 65,7 ₽ |
| Beget 960 ₽ | 960 ₽ | **192 ₽** | 96 ₽ |

### 4.5. Формула (г): лендинг — посчитать в рублях нельзя

- На Tilda: `Tilda в месяц + домен в год / 12`. Цены Tilda и домена **нужно уточнить**.
- На своём VPS: `домен в год / 12 + VPS / K`. Например, при Timeweb за 657 ₽ и K = 10 выходит 65,7 ₽ + домен / 12. Цену домена **нужно уточнить**.

### 4.6. Налоги и форма бизнеса

- **Самозанятость (НПД):** доход до 2 400 000 ₽ в год, без наёмных работников, нельзя перепродавать чужие разработки ([Spmag](https://spmag.ru/news/samozanyatyy-mozhet-razrabatyvat-i-prodavat-po)). Подходит только на старте, если Сергей работает один. Агентству с подрядчиками НПД не подходит.
- **Нужно уточнить у бухгалтера:**
  - ставки и лимиты УСН на 2026 г.;
  - порог освобождения от НДС на УСН;
  - фиксированные взносы ИП за 2026 г.

  Эти параметры в заметках не подтверждены, поэтому цифр по ним здесь нет.

---

## 5. Юридическое: российская инфраструктура, отдельное согласие и никаких рекламных автозвонков

> **Это справочная информация, а не юридическая консультация.** Перед запуском продаж документы и процессы должен проверить юрист по персональным данным и рекламе. Ссылки ниже взяты из поисковой выдачи, первоисточники законов в этой сессии не открывались.

### 5.1. Кто за что отвечает: клиент — оператор, агентство — обработчик

**Клиент — оператор персональных данных** (клиника, автосервис, салон).
- Он собирает согласия, публикует политику и подаёт уведомление в Роскомнадзор (РКН).
- Агентство, которое держит бота и сервер и видит данные, обрабатывает их **по поручению оператора** (ч. 3 ст. 6 152-ФЗ, [Гарант](https://base.garant.ru/12148567/)). Для этого нужен договор или приложение к нему.

Что указать в поручении:
- какие данные обрабатываются: ФИО, телефон, время записи, текст обращения, аудиозапись;
- какие действия с ними выполняются и зачем;
- где хранятся (только в РФ) и когда удаляются;
- как защищаются;
- как агентство сообщает клиенту об утечке;
- список субподрядчиков: хостинг, телефония, распознавание речи, модель.

**По своим данным агентство — само оператор:** лиды, CRM, сотрудники. Значит, ему тоже нужны политика, согласия и уведомление в РКН.

### 5.2. Согласие — отдельным документом с 1 сентября 2025 г.

**Что изменилось.** С 01.09.2025 согласие на обработку персональных данных оформляется **отдельно** от оферты, договора и пользовательского соглашения ([Гарант](https://www.garant.ru/news/1850806/)). Изменение внёс закон от 24.06.2025 № 156-ФЗ ([КонсультантПлюс, ст. 9](https://www.consultant.ru/document/cons_doc_LAW_61801/6c94959bc017ac80140621762d2ac59f6006b08c/)). Доказывать, что согласие было, должен оператор.

**Как оформить на практике:**
- **Сайт.** Чек-бокс, который не отмечен заранее, и ссылка на отдельную страницу с текстом согласия. Рядом ссылка на политику. Ещё один необязательный чек-бокс — «согласен получать рекламу».
- **Бот в Telegram или MAX.** До того как спросить имя и телефон, бот показывает ссылку на текст согласия и кнопку «Согласен». Сохраняем дату, время, ID пользователя и версию текста.
- **Голосовой робот.** Произносит фразу о записи разговора и обработке данных и присылает ссылку на политику по SMS. Хватит ли этого — **уточнить у юриста**. Для данных о здоровье устного «да», по всей видимости, мало.

### 5.3. Политика и уведомление Роскомнадзора

- Почти каждый клиент, который принимает заявки через сайт или бота, обязан **до начала обработки** подать уведомление через [pd.rkn.gov.ru](https://pd.rkn.gov.ru/). С 01.09.2022 исключения сильно сужены ([письмо РКН](https://pravo.ppt.ru/pismo/roskomnadzor/n-08-80975-270489)).
- Штраф за то, что уведомление не подано или подано поздно, с 30.05.2025 — **100–300 тыс. ₽** (ч. 10 ст. 13.11 КоАП, [КонсультантПлюс](https://www.consultant.ru/document/cons_doc_LAW_34661/1f421640c6775ff67079ebde06a7d2f6d17b96db/); [Buh.ru](https://buh.ru/news/s-30-maya-shtraf-za-narushenie-sroka-podachi-uvedomleniya-v-roskomnadzor-sostavit-do-300-000-rubley.html)).
- Политика обработки данных публикуется на странице, где собирают данные (ст. 18.1 152-ФЗ). Размер штрафа за то, что политики нет, **нужно уточнить у юриста**.

### 5.4. Локализация и зарубежные API (OpenAI, Anthropic)

- **Данные граждан хранятся только в базах в РФ.** С 01.07.2025 запись, накопление и хранение их данных допускаются только в российских базах данных. Многие обзоры читают это как запрет собирать данные сразу в зарубежные облака ([РБК Компании](https://companies.rbc.ru/news/SZRjtRsMIn/novyie-trebovaniya-k-obrabotke-personalnyih-dannyih-polnyij-gajd-na-2026-god/); [Advant Beiten](https://www.advant-beiten.com/fileadmin/beiten/Newsletter/Newsletter_Russia_Personal_Data_Localisation_Requirements_Will_Be_Tightened_RUS.pdf)).
- **Штрафы за нарушение локализации:** юрлицо — **1–6 млн ₽**, повторно — **6–18 млн ₽** ([КонсультантПлюс](https://www.consultant.ru/law/podborki/shtraf_za_lokalizaciyu_personalnyh_dannyh/)). Актуальную редакцию нужно уточнить.
- **Трансграничная передача.** Если в запрос к OpenAI или Anthropic попадают ФИО, телефон, жалоба или запись звонка, это **трансграничная передача**: значение имеет сам факт передачи иностранному лицу, способ неважен ([V2B](https://www.v2b.ru/articles/transgranichnaya-peredacha-personalnyh-dannyh/)). Оператор (клиент) должен заранее подать в РКН отдельное уведомление о такой передаче (ч. 3 ст. 12, с 01.03.2023, [письмо РКН](https://pravo.ppt.ru/pismo/roskomnadzor/n-08vm-107716-274863)).
- **Зарубежные API Россию официально не обслуживают:**
  - России нет в списке поддерживаемых стран Anthropic; страница открыта напрямую 04.11.2026 ([anthropic.com](https://www.anthropic.com/supported-countries));
  - России нет в списке OpenAI ([help.openai.com](https://help.openai.com/articles/5347006)); с 9 июля 2024 г. OpenAI блокирует API-трафик из неподдерживаемых стран ([The Decoder](https://the-decoder.com/openai-to-restrict-api-access-for-unsupported-countries-in-july/));
  - работа через реселлеров нарушает условия самих провайдеров.
- **Практический вывод:** YandexGPT или GigaChat, серверы, базы, логи и записи звонков — в РФ. Если всё же нужна зарубежная модель — убираем из запроса персональные данные до отправки. Оценку рисков **уточнить у юриста**.

### 5.5. Стоматологии и клиники: данные о здоровье и врачебная тайна

- **Даже сам факт записи к врачу может быть врачебной тайной.** Её составляют сведения о факте обращения, о здоровье и диагнозе (ст. 13 323-ФЗ, [КонсультантПлюс](https://www.consultant.ru/document/cons_doc_LAW_121895/)). Жалобы и симптомы — данные о здоровье, особая категория (ст. 10 152-ФЗ).
- **Нужно письменное согласие.** Для особых категорий согласие оформляется письменно ([Гарант](https://base.garant.ru/58073909/)). Без согласия данные о здоровье может обрабатывать только медработник, а агентство и поставщик модели медработниками не являются. Нужно ли письменное согласие для записи без жалоб — **уточнить у юриста**.
- **Повторная утечка таких данных** грозит оборотным штрафом не меньше **25 млн ₽** ([SecRadar](https://secradar.ru/komplaens/pdn/shtrafy-za-utechku/)).
- **Пример из жизни.** Клиника просит, чтобы бот спрашивал «Что у вас болит?». Так делать не стоит. Пусть бот говорит: «Подробности расскажете врачу на приёме. Выберите удобное время». Бот берёт только ФИО, телефон, время и врача, отвечает на вопросы о ценах, адресе и подготовке по тексту, который утвердила клиника, и **не консультирует по симптомам**.

### 5.6. Запись звонков и голос

- **Записывать деловой звонок, в котором вы участвуете, прямо не запрещено.** Верховный суд принял такую запись как доказательство (дело № 5-КГ16-18, 2016 г., [Pravo.ru](https://pravo.ru/review/view/137811/)).
- **Но запись содержит персональные данные**, поэтому нужны цель, основание и предупреждение собеседника. Рекомендуемая фраза в начале звонка: «Вам отвечает виртуальный помощник [название], разговор записывается».
- **Голос — биометрия, только если по нему устанавливают личность** ([V2B](https://www.v2b.ru/articles/chto-takoe-biometricheskie-dannye-i-kak-s-nimi-rabotat/)). Голосовую идентификацию не делаем: иначе понадобятся письменное согласие и особый режим, его **уточнить у юриста**.

### 5.7. Реклама, автодозвон, 41-ФЗ и «Антифрод 2.0»

- **38-ФЗ, ст. 18:**
  - рекламный звонок или SMS допустимы только с **предварительного согласия** абонента (ч. 1);
  - реклама с **автоматическим дозвоном** запрещена (ч. 2) ([Buh.ru](https://buh.ru/articles/shtrafy-za-spam-kak-biznes-nakazhut-za-nedobrosovestnuyu-reklamu.html));
  - штраф до **1 млн ₽** (ч. 4.1 ст. 14.3 КоАП, [Spmag](https://spmag.ru/news/za-navyazchivuyu-reklamu-po-telefonu-oshtrafuyut-na-million-rublej)).
- **Пример из жизни.** Робот звонит напомнить о записи на ТО — это сервисный звонок, так можно. Робот добавил «а ещё у нас скидка на шиномонтаж» — звонок стал рекламой с автодозвоном, так нельзя. Сценарии роботов делаем строго сервисными.
- **41-ФЗ** (с 01.06.2025, [Парламентская газета](https://www.pnp.ru/law/2025/04/01/federalnyy-zakon-41-fz.html)):
  - с 01.09.2025 звонки от организаций обязательно маркируются ([Контур](https://www.kontur-extern.ru/info/56934-zakon_o_protivodejstvii_kibermoshennikam)). Исходящие звонки делаем с номеров российских операторов и с регистрацией названия организации;
  - госорганам, банкам, операторам связи и ряду других организаций запрещено общаться с гражданами через иностранные мессенджеры ([Гарант](https://www.garant.ru/news/1820251/)). Частных клиник, СТО и салонов, по найденным обзорам, в этом перечне нет, но перечень **нужно сверить**.
- **«Антифрод 2.0»** подписан 26.06.2026 ([Интерфакс](https://www.interfax.ru/russia/1098610)). С 01.03.2027 граждане смогут установить самозапрет на звонки из-за рубежа ([Cisoclub](https://cisoclub.ru/putin-podpisal-zakon-antifrod-2-s-limitom-v-20-bankovskih-kart-i-zapretom-mezhdunarodnyh-zvonkov)). Номер закона (по одному источнику, 210-ФЗ, [СберБизнес](https://sberbusiness.live/publications/antifrod-2-0)) **проверить**.
- **Обязанности роботу представляться ботом в законах не нашли.** Но представляться всё равно стоит.

### 5.8. Telegram, WhatsApp, MAX

| Канал | Статус (по найденным источникам) | Что делать |
|---|---|---|
| **Telegram** | 13.08.2025 частично ограничены звонки; с 10.02.2026 РКН «последовательно ограничивает» Telegram ([РБК](https://www.rbc.ru/technology_and_media/10/02/2026/698b21a39a79473017a3cb4a)); 29.07.2026 Павлу Дурову предъявлено обвинение ([РБК](https://amp.rbc.ru/rbcnews/technology_and_media/30/07/2026/6a6b16639a7947f36a2b0e63)). Среднесуточная аудитория в августе 2026 г. — 33,8 млн человек (Mediascope в пересказе, [MenToday](https://www.mentoday.ru/life/news/20-10-2026/byudjetnye-milliardy-v-pesok-zablokirovannye-whatsapp-i-telegram-snova-nachali-rasti-v-rossii/)) | Оставляем, но **только как один из каналов**. База бота — на своём сервере в РФ. Нужно ли уведомление о трансграничной передаче для Telegram-бота — **уточнить у юриста** |
| **WhatsApp** | по вторичным источникам, заблокирован с февраля 2026 г. ([Albato](https://blog.albato.ru/whatsapp-dlya-biznesa-2026-blokirovka-alternativy/)) — **нужно уточнить** | Как основной канал не используем |
| **MAX** | «Платформа для партнёров»: до 5 ботов на организацию ([Sostav](https://www.sostav.ru/blogs/250077/84090)); нужны российский номер и ИНН ([Infostart](https://infostart.ru/public/2645614/)); только для бизнеса, зарегистрированного в РФ ([PPC.world](https://ppc.world/news/biznes-smozhet-integrirovat-svoi-servisy-v-max-cherez-platformu-dlya-partnerov/)) | Подключаем как второй канал. Владелец бота — клиент, агентство — разработчик. Схему доступов **уточнить** по документации dev.max.ru |

### 5.9. Ещё два пункта: маркировка рекламы и регулирование ИИ

- **Маркировка рекламы.** Если агентство ведёт рекламу клиента, каждый креатив получает токен erid, а данные уходят в ЕРИР. За то, что данные не переданы, юрлицу грозит 200–500 тыс. ₽ (ч. 15 ст. 14.3 КоАП, [Sostav](https://www.sostav.ru/blogs/285528/85619); источники расходятся — уточнить).
- **Регулирование ИИ.** Обязательной маркировки ИИ-контента на ноябрь 2026 г. нет: её исключили из законопроекта ([Pravo.ru](https://pravo.ru/news/264296/); [AdIndex](https://adindex.ru/news/right/2026/06/11/345832.phtml)). Законопроект № 1317978-8 о маркировке с предлагаемой датой 01.03.2027 пока рассматривается ([Ermolina & Partners](https://ermolinapartners.com/tpost/a57v2kspn1-obyazatelnaya-markirovka-ii-kontenta)).

### 5.10. Штрафы, которые реально касаются малого бизнеса

| Нарушение | Юрлицо | Источник / статус |
|---|---|---|
| Не подано уведомление в РКН (ч. 10 ст. 13.11) | 100–300 тыс. ₽ | [КонсультантПлюс](https://www.consultant.ru/document/cons_doc_LAW_34661/1f421640c6775ff67079ebde06a7d2f6d17b96db/) |
| Ошибки с согласием | «до 700 тыс. ₽» по обзору Гаранта; часть статьи **уточнить** | [Гарант](https://www.garant.ru/article/1862510/) |
| Не сообщили РКН об утечке (ч. 11) | 1–3 млн ₽ (**уточнить окончательную редакцию**) | [Гарант](https://www.garant.ru/article/1746375/) |
| Утечка данных 1 000–10 000 человек (ч. 12) | 3–5 млн ₽ | [Sostav](https://www.sostav.ru/blogs/288385/81682), [SecRadar](https://secradar.ru/komplaens/pdn/shtrafy-za-utechku/) |
| Утечка данных о здоровье, впервые (ч. 15) | **нужно уточнить у юриста** | — |
| Повторная утечка (ч. 17); особые категории (ч. 18) | 1–3% выручки, не меньше 20 млн ₽ (25 млн ₽ для особых категорий), не больше 500 млн ₽ | [SecRadar](https://secradar.ru/komplaens/pdn/shtrafy-za-utechku/), [КонсультантПлюс](https://www.consultant.ru/law/hotdocs/87300.html) |
| Нарушение локализации (ч. 8, повторно — ч. 9) | 1–6 млн ₽ / 6–18 млн ₽ | [КонсультантПлюс](https://www.consultant.ru/law/podborki/shtraf_za_lokalizaciyu_personalnyh_dannyh/) |
| Реклама по телефону без согласия (ч. 4.1 ст. 14.3) | до 1 млн ₽ | [Spmag](https://spmag.ru/news/za-navyazchivuyu-reklamu-po-telefonu-oshtrafuyut-na-million-rublej) |

Первые штрафы по новым частям ст. 13.11 суды назначили в марте 2026 г. ([Гарант](https://www.garant.ru/news/2026629/)). Параллельно действует уголовная ст. 272.1 УК: по базовому составу до 4 лет ([ppt.ru](https://ppt.ru/obzory/vstupaet-v-silu/federalnyy-zakon-30-11-2024-421-fz)).

### 5.11. Договор с клиентом

Договор смешанный. Структура — вывод автора, нормы ГК **сверить у юриста**:
- **Предмет:** разработка и настройка плюс ежемесячное сопровождение и хостинг.
- **Права:** код платформы агентства передаётся по неисключительной лицензии, контент и сценарии принадлежат клиенту.
- **Поручение на обработку ПДн** — отдельным приложением.
- **SLA:** доступность, время реакции, резервные копии, выгрузка данных при расторжении.
- **Кто за что отвечает:** клиент — согласия, политика, уведомление в РКН, тексты; агентство — защита и хранение в РФ.
- **Ограничение ответственности.**
- **Запрет** использовать данные клиентов для обучения моделей без согласия.

### 5.12. Чек-лист

**А. Агентству**
- [ ] Выбрать форму: ИП или ООО. НПД — только на старте и в одиночку, лимит 2,4 млн ₽ в год ([Spmag](https://spmag.ru/news/samozanyatyy-mozhet-razrabatyvat-i-prodavat-po)).
- [ ] Подать своё уведомление в РКН до начала обработки ([pd.rkn.gov.ru](https://pd.rkn.gov.ru/)).
- [ ] Опубликовать на своём сайте политику ПДн и **отдельное** согласие в формах.
- [ ] Держать серверы, базы, логи ботов и записи звонков только у российских провайдеров.
- [ ] Использовать YandexGPT или GigaChat; зарубежные модели — без персональных данных в запросах.
- [ ] Заказать у юриста шаблоны: договор, поручение на обработку ПДн, текст согласия, политику, согласие на рекламу.
- [ ] Описать процедуру при утечке: агентство сообщает клиенту, клиент — РКН.
- [ ] Оформить внутренние документы: приказ об ответственном за ПДн, список доступов, NDA с подрядчиками, шифрование, резервные копии в РФ.
- [ ] Если агентство ведёт рекламу клиента: договор с ОРД, erid на креативах, отчёты в ЕРИР.
- [ ] Узнать, можно ли застраховать ответственность и киберриски (**уточнить**).

**Б. Каждому клиенту (клиника, автосервис, салон, ремонтная компания)**
- [ ] Подать уведомление в РКН до запуска сайта или бота; обновлять его, когда появляются новые каналы.
- [ ] Опубликовать политику ПДн на лендинге и дать на неё ссылку из бота.
- [ ] Оформить отдельное согласие: на сайте чек-бокс со ссылкой, в боте кнопка «Согласен» с записью факта, в звонке фраза робота плюс SMS со ссылкой (достаточность **уточнить**).
- [ ] Получить отдельное согласие на рекламу. Рекламных автообзвонов роботом не делать.
- [ ] Подписать договор с агентством с поручением на обработку ПДн.
- [ ] Клиникам: бот не собирает симптомы; если собирает — нужно письменное согласие; соблюдать врачебную тайну.
- [ ] Исходящие звонки вести с российских номеров с маркировкой организации.
- [ ] Робот говорит в начале звонка: «виртуальный помощник, разговор записывается» — и переводит на человека по запросу.
- [ ] Не использовать голосовую идентификацию.
- [ ] Работать минимум в двух каналах: Telegram и MAX плюс виджет на сайте и телефон. На WhatsApp не опираться.

---

## 6. Как найти первых 10 клиентов: знакомые, свой кейс и живые встречи

**Почему начинать с тёплого круга.** По наблюдениям автора курса по ботам, первые клиенты обычно находятся среди знакомых предпринимателей ([vc.ru](https://vc.ru/marketing/2186801-gde-nayti-klientov-na-boty-top-4-sposoba)). Ещё один продавец обучения утверждает, что 70–80% первых проектов приходят из тёплого круга и профессиональных сообществ. Это данные по его же выпускникам ([AiBotManager](https://aibotmanager.ru/kak-najti-proekt-avtomatizacii/)). Опубликованных краснодарских кейсов с цифрами привлечения не нашлось.

### Шаги

1. **Сделать витрину на своей ремонтной компании** (недели 1–3).
   - Что запустить: лендинг с калькулятором или квизом, бот записи на замер в Telegram и MAX, голосового робота на вечерние звонки.
   - Что замерить до и после: пропущенные звонки, время ответа, число заявок на замер. Это ваши собственные цифры, и это главный аргумент в разговоре «я сам так работаю».
2. **Пройтись по тёплому кругу.**
   - Кому писать: поставщики материалов, субподрядчики (окна, двери, натяжные потолки, кухни, клининг), заказчики-предприниматели, знакомые владельцы клиник, салонов и СТО.
   - Как: лично и в мессенджере, а не массовой рассылкой.
3. **Предлагать бесплатный аудит пропущенных звонков.**
   - Клиент выгружает статистику своей АТС за квартал, вы переводите пропуски в деньги по его же прайсу.
   - Пример: стоматология пропустила вечерние звонки; если звонили по имплантации, каждый такой звонок — 27 000–28 000 ₽ за имплант ([Oneclinic](https://oneclinickrd.ru/prices), [Эскулап](https://www.med-23.ru/price/adult/)).
4. **Зайти в вертикаль стоматологий.**
   - Список клиник берём в 2ГИС (882 в рубрике).
   - Предлагаем выступление о голосовом администраторе в НП «Стоматологическая ассоциация Краснодарского края» ([страница](https://www.facebook.com/people/%D0%9D%D0%9F-%D0%A1%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F-%D0%B0%D1%81%D1%81%D0%BE%D1%86%D0%B8%D0%B0%D1%86%D0%B8%D1%8F-%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE-%D0%BA%D1%80%D0%B0%D1%8F/100067101895391/)) и краевой организации стоматологов ([kubanstom.ru](http://kubanstom.ru/about/dejatelnost/)).
   - Идём лично, с распечатанным одностраничным аудитом.
5. **Центр «Мой бизнес».**
   - Адрес: ул. Северная, 405, ИЦ «Аквариум»; телефон 8 800 707 07 11 ([moibiz93.ru](https://moibiz93.ru/cpp/), [mbkuban.ru](https://mbkuban.ru/contacts/)).
   - В бесплатном курсе центра на 2026 г. есть модуль «Искусственный интеллект как сотрудник» ([do.krd.ru](https://do.krd.ru/node/2749)). Предлагаем практикум как продолжение этого модуля.
   - Центр сам делает сайты, поэтому идём туда с ботами и ИИ, а не с лендингами.
6. **Ходить на события.** Даты проверять у организаторов.
   - 18.11 — «ИТ Чернозем Агро» ([all-events](https://all-events.ru/events/calendar/city-is-krasnodar/));
   - 24.11 — «Твердые знаки 2026»;
   - 04.12 — «Краснодар Франчайзинг Экспо»;
   - 10–12.12 — «Регион инноваций Юг» ([ict2go](https://ict2go.ru/regions/Krasnodar/));
   - ежемесячно — «БИЗНЕС СРЕДА» «Опоры России» ([opora.ru](https://www.opora.ru/regionalnoe-razvitie/yuzhnyy-fo/krasnodarskiy-kray/novosti/));
   - мероприятия ТПП края, даты согласуются ([kuban.tpprf.ru](https://kuban.tpprf.ru/ru/plan-raboty-tpp-krasnodarskogo-kraya/)).
7. **Писать в местные сообщества.** Публикуем полезные разборы («как клиника теряет вечерние звонки»), а не рекламу. Где:
   - чат «Бизнес Краснодар» — около 5 536 участников ([TGStat](https://tgstat.ru/en/ratings/chats/business?sort=mau));
   - krd.dev ([Hexlet](https://github.com/Hexlet/ru-local-communities));
   - Диджитал-сообщество Краснодара ([krasnodar-digital.ru](https://krasnodar-digital.ru/));
   - каталог чатов города: 23 канала и 41 чат ([telegid.me](https://telegid.me/catalog/russia/krasnodar)).
8. **Выставиться на площадках, где уже есть спрос:**
   - **Авито «Услуги».** По данным одного блога, с 04.06.2026 оплата идёт за просмотры, от 0,80 ₽, и до 1 000 просмотров в месяц бесплатно ([e-vito.ru](https://e-vito.ru/skolko-stoit-prodvizhenie-sajtov-na-avito-i-kak-ne-slit-byudzhet/)).
   - **Профи.ру.** Тариф «Отклик» без комиссии с заказа ([help.profi.ru](https://help.profi.ru/ru/articles/3590909-%D1%82%D0%B0%D1%80%D0%B8%D1%84-%D0%BE%D1%82%D0%BA%D0%BB%D0%B8%D0%BA)).
   - **Tilda Experts.** Бесплатно и без комиссии ([experts.tilda.cc](https://experts.tilda.cc/ru/)).
9. **Подключить партнёров и партнёрские программы.**
   - Маркетологам, таргетологам и авитологам на проектах постоянно нужны боты ([vc.ru](https://vc.ru/marketing/2186801-gde-nayti-klientov-na-boty-top-4-sposoba)). Авитологи в Краснодаре берут 15–60 тыс. ₽ за упаковку профиля ([Aviboost](https://aviboost.ru/blog/avitolog-v-krasnodare)), то есть работают с тем же малым бизнесом.
   - DIKIDI платит 25% платежей клиента в течение 6 месяцев ([dikidi.net](https://dikidi.net/ru/referrals)).
   - Битрикс24 — до 50% с лицензий ([partners24](https://partners24.1c-bitrix.ru/)).
   - Yandex B2B Tech — базовая премия 10% ([Новости IT-канала](https://www.novostiitkanala.ru/news/detail.php?ID=192475)).
10. **Платную рекламу отложить.**
    - 2ГИС: в Краснодаре около 11 800 ₽/мес, минимальный срок 6 месяцев ([Girafffe](https://girafffe.ru/materials/kak-razmestit-reklamu-v-2gis/), [Ingate](https://ingate.ru/blog/reklama-v-2gis-kak-zapustit-i-nastroit/)).
    - Яндекс Бизнес: от 15 000 ₽ за 3 месяца ([promokod-biznes.ru](https://promokod-biznes.ru/blog/yandex-biznes-tarify/)); другие блоги называют 9 000 ₽ за 90 дней ([eLama](https://elama.ru/blog/reklama-dlya-nebolshoy-kompanii-bez-bolshih-byudzhetov-i-glubokih-znaniy-podklyuchaem-reklamnuyu-podpisku-yandeks-biznesa/)).
    - Для первых 10 клиентов это дорого.

**Чего не делать:**
- холодный обзвон роботом — это реклама с автодозвоном (ч. 2 ст. 18 38-ФЗ);
- массовые SMS без согласия (ч. 1 ст. 18).

Можно ли писать холодные письма бизнесу, **уточнить у юриста** до запуска. Если такие письма будут, ориентир по B2B такой: на одном кейсе ответили около 7% из 647 писем ([Handbox](https://handbox.by/blog/kejs-xolodnaya-rassyilka-v-b2b-segmente-kotoraya-prinesla-45-lidov)), а средний отклик, по словам автора другого кейса, около 1% ([vc.ru](https://vc.ru/marketing/833069-derzkaya-holodnaya-rassylka-s-konversiei-20-kak-my-sdelali-3-prodazhi-v-krupnye-b2b-kompanii)). Это не данные о продаже ботов.

### Ответы на возражения

| Возражение | Ответ | Опора |
|---|---|---|
| «Клиенты разозлятся на бота» | Бот сразу говорит, что он бот, и переводит на человека по первой просьбе | 46% опрошенных больше всего раздражает бот, который не передаёт диалог человеку (опрос Viber, Украина, [UkraNews](https://ukranews.com/news/1181343-boty-vmesto-lyudej-i-navyazchivye-dopolnitelnye-prodazhi-ukraintsy-nazvali-glavnye-razdrazhiteli-v)); голос раздражает при плохом сценарии ([Реплика](https://thereplica.ru/blog/pochemu-klienty-ne-lyubyat-botov)) |
| «Он заменит моего администратора?» | Нет. Он закрывает ночь, выходные и пиковые часы | так же позиционируется Syntera ([vc.ru](https://vc.ru/ai/2715636-ii-administrator-dlya-klinik-uvelichenie-zapisei)) |
| «Дорого, зачем платить каждый месяц» | Пилот 2–4 недели по себестоимости и метрики «до и после». Продаём результат, а не «умного бота» | [BotSeller](https://botseller.ai/blog/kak-prodavat-chat-botov-partnyorskaya-model) |
| «А как же 152-ФЗ?» | Российские модели, серверы в РФ, поручение на обработку данных в договоре | раздел 5 |
| «Фрилансер сделает за 3 000 ₽» | А кто будет поддерживать бота, обновлять ответы и отвечать за записи? Вдобавок МВД 03.11.2026 предупредило о мошеннических Telegram-ботах | [Freelance.ru](https://freelance.ru/offer/chat-bot-telegramm-s-ii-na-n8n-i-ustanovkoj-na-server-beget-82362.html); [РГ](https://rg.ru/2026/11/03/v-mvd-predupredili-o-moshennicheskoj-sheme-s-ii-i-telegram-botami.html) |

---

## 7. План на 90 дней: 9 ноября 2026 — 7 февраля 2027

> **Цели в таблице — план, а не прогноз.** Это ориентиры для самоконтроля. Пропорции между шагами («аудиты → пилоты → клиенты») не являются ожидаемой конверсией: надёжных данных о ней для продажи ботов малому бизнесу нет. Сколько касаний нужно на одного клиента, станет ясно из собственных цифр после первых 3–4 недель. Цель «10 клиентов» взята из постановки задачи. Даты событий проверять у организаторов.

| Неделя | Даты | Что делаем | Измеримая цель (план) |
|---|---|---|---|
| 1 | 9–15 нояб. | Выбрать форму (ИП или ООО). Заказать юристу шаблоны (договор, поручение, согласие, политика). Подключить YandexGPT или GigaChat, VPS в РФ, номер у Телфина или Novofon. Подать уведомление агентства в РКН | Уведомление подано; сервер и номер работают; шаблоны заказаны |
| 2 | 16–22 нояб. | Витрина на ремонтной компании: лендинг, бот в Telegram и MAX с записью на замер, ИИ-ответы о ценах и сроках. Записать метрики «до» из АТС. 18.11 — «ИТ Чернозем Агро» (по желанию) | Витрина работает; метрики «до» записаны |
| 3 | 23–29 нояб. | Голосовой робот на вечерние звонки своей компании. 24.11 — «Твердые знаки». Составить список тёплого круга. Сделать шаблон аудита на 1 страницу | 30 человек в списке; 10 разговоров |
| 4 | 30 нояб. — 6 дек. | Встречи с тёплым кругом, в первую очередь смежные подрядчики. 04.12 — «Франчайзинг Экспо». Запросить выступление в «Мой бизнес» и «Опоре России» | 5 бесплатных аудитов пропущенных звонков; 2 согласованных пилота |
| 5 | 7–13 дек. | 10–12.12 — «Регион инноваций Юг». Запустить пилоты: 2–4 недели, по себестоимости. Выписать из 2ГИС стоматологии и автосервисы своего района | 2 пилота запущены; 50 компаний в списке |
| 6 | 14–20 дек. | Личные визиты в стоматологии и СТО с аудитом. Подать заявки в партнёрки (DIKIDI, Yandex B2B Tech). Заполнить профили на Профи.ру, Авито и Tilda Experts | 15 визитов; 3 профиля опубликованы |
| 7 | 21–27 дек. | Итоги витрины за 4 недели («до и после») — оформить кейс на 1 страницу. Промежуточные итоги пилотов | 1 кейс опубликован; по каждому пилоту принято решение «продолжаем или нет» |
| 8 | 28 дек. — 3 янв. | Праздники. Доработать продукт: шаблоны базы знаний для стоматологии и автосервиса | 2 отраслевых шаблона |
| 9 | 4–10 янв. | Праздники. Опубликовать разборы в Telegram и MAX, ответить на входящие | 2 поста-разбора |
| 10 | 11–17 янв. | Перевести пилоты в платные пакеты, продолжить визиты, сходить на «БИЗНЕС СРЕДУ» «Опоры» | 3 платящих клиента (нарастающим итогом) |
| 11 | 18–24 янв. | Договориться о рекомендациях с маркетологами и авитологами. Выступить в «Мой бизнес», если согласовано | 2 партнёра-рекомендателя |
| 12 | 25–31 янв. | Продажи в вертикали стоматологий и СТО. Оформить второй кейс | 6 платящих клиентов (нарастающим итогом); 2 кейса |
| 13 | 1–7 фев. | Итоги 90 дней: какие каналы сработали, пересмотр цен и пакетов, решение о платной рекламе (2ГИС, Яндекс Бизнес) | 10 платящих клиентов (цель); решение по рекламе принято |

**Контрольные точки:**
- **Неделя 4.** Если ни один разговор не дошёл до аудита, меняем предложение: возможно, проблема в формулировке, а не в нише.
- **Неделя 7.** Если пилот не показал разницы «до и после», разбираем почему, но в платный пакет его не переводим.
- **Неделя 10.** Если платящих клиентов нет, сужаемся до одной ниши, где лучше всего отработали пилоты.

---

## 8. Риски и как их снижать

| Риск | Что известно | Как снижать |
|---|---|---|
| **Замедление или блокировка Telegram** | С 10.02.2026 РКН последовательно ограничивает Telegram ([РБК](https://www.rbc.ru/technology_and_media/10/02/2026/698b21a39a79473017a3cb4a)); в феврале 2026 г. появились слухи о полной блокировке, РКН их не комментировал ([РБК](https://www.rbc.ru/technology_and_media/17/02/2026/69942e849a7947f5560a652b)). При этом аудитория — 33,8 млн в день ([MenToday](https://www.mentoday.ru/life/news/20-10-2026/byudjetnye-milliardy-v-pesok-zablokirovannye-whatsapp-i-telegram-snova-nachali-rasti-v-rossii/)) | В каждый пакет закладываем Telegram и MAX плюс виджет на сайте и телефон. Логика и база — на своём сервере, чтобы сменить канал без переделки. В договоре фиксируем, что смена канала входит в сопровождение |
| **WhatsApp недоступен** | По вторичным данным, заблокирован с февраля 2026 г. ([Albato](https://blog.albato.ru/whatsapp-dlya-biznesa-2026-blokirovka-alternativy/)) | Не продаём WhatsApp как основной канал; честно объясняем клиенту, почему |
| **OpenAI и Anthropic недоступны** | России нет в их списках стран ([Anthropic](https://www.anthropic.com/supported-countries), [OpenAI](https://help.openai.com/articles/5347006)); реселлеры дороже на 10–30% ([toolfox](https://toolfox.ru/services/s/openrouter/alternatives)) и нарушают условия провайдеров | Основные модели — YandexGPT и GigaChat ([Сбер](https://developers.sber.ru/docs/ru/gigachat/tariffs/legal-tariffs)). Код пишем так, чтобы модель менялась одной настройкой |
| **Демпинг SaaS на YCLIENTS** | ИИ-админы стоят 500–3 990 ₽/мес ([YCLIENTS](https://www.yclients.ru/marketplace/revvy), [Jivo](https://www.jivo.ru/yclients-ai/)), НУБИ — от 490 ₽ ([нуби.рф](https://xn--80abvbv0b.xn--p1ai/)) | В бьюти не продаём подписку на чат. Продаём голос, несколько каналов, настройку и сопровождение. Если подходит SaaS — ставим его как партнёр |
| **Платформы выпустят собственных ИИ-администраторов** | YCLIENTS принадлежит VK, DIKIDI куплен Яндексом ([ECOMHUB](https://ecomhub.ru/yandex-dikidi-deal-services-market-platform-booking-vk-yclients/)) | Делаем то, чего у платформ нет: голосового робота на входящую линию, сценарии под бизнес, работу в нишах без YCLIENTS (стоматологии на IDENT, автосервисы) |
| **Юридические штрафы** | Уведомление в РКН — 100–300 тыс. ₽; локализация — 1–6 млн ₽; утечка — от 3 млн ₽; реклама без согласия — до 1 млн ₽ (раздел 5.10) | Чек-лист из раздела 5, поручение в каждом договоре, минимум данных, серверы в РФ, юрист-партнёр. Ограничение ответственности в договоре и страховка (**уточнить**) |
| **Медицинские данные** | Повторная утечка особых категорий — штраф не меньше 25 млн ₽ ([SecRadar](https://secradar.ru/komplaens/pdn/shtrafy-za-utechku/)) | Бот в клинике не собирает симптомы и не консультирует, только записывает |
| **Зависимость от одного канала привлечения, ниши или клиента** | Платные каналы требуют долгих обязательств: 2ГИС — 6 месяцев ([Ingate](https://ingate.ru/blog/reklama-v-2gis-kak-zapustit-i-nastroit/)) | Одновременно 3 потока: тёплый круг, вертикаль стоматологий и СТО, партнёры. Пересматриваем раз в месяц |
| **Поставщики меняют условия** | SaluteSpeech закрыт для новых клиентов с 15.07.2026 ([Сбер](https://developers.sber.ru/docs/ru/salutespeech/tariffs/legal-tariffs)); Yandex Cloud подорожал на 5–8% с 01.05.2026 ([Habr](https://habr.com/ru/companies/x-com/articles/1035500/)); Mango закрыл тариф «Базовый» с 08.12.2025 ([Mango](https://www.mango-office.ru/journal/tidings/aktualizatsiya-tarifov-8-12/)) | Запас между себестоимостью и абонплатой (раздел 3). Для каждого компонента — второй поставщик. В договоре — право пересматривать цену |
| **Цифры «боли» у конкретного клиента не подтвердятся** | Статистика пропусков и неявок — в основном от вендоров; блог Т-Банка признаёт, что независимого замера нет ([Т-Бизнес секреты](https://secrets.tbank.ru/blogi-kompanij/propushhennye-zvonki-klientov/)) | Перед продажей — аудит на данных самого клиента; пилот с метриками «до и после» |
| **У малого бизнеса маленькие бюджеты на ИИ** | Из тех, кто платит за ИИ, 38% тратят до 3 000 ₽ в месяц ([RB.ru](https://rb.ru/news/bolshe-poloviny-predprinimatelej-srednego-i-malogo-biznesa-platyat-za-nejroseti-38-tratyat-na-ii-do-3000-rublej-v-mesyac/)) | Сравниваем цену с потерянным пациентом или заказом и с зарплатой администратора. Зарплату администратора в Краснодаре **нужно уточнить** на hh.ru |
| **Плохой бот вредит репутации клиента** | 62% готовы отказаться от услуг после негативного общения с представителем компании ([TelecomDaily](https://telecomdaily.ru/news/2025/03/31/mango-office-kak-klientskiy-servis-vliyaet-na-otnoshenie-pokupateley-k-kompanii)) | Тестируем сценарии до запуска, переводим на человека по триггерам, раз в неделю разбираем диалоги |
| **Конкуренты с готовой моделью** | Twin продаёт франшизу агентства ботов ([franchise.twin24.ai](https://franchise.twin24.ai/)); операторы продают роботов под ключ | Работаем локально, показываем свой кейс, сопровождаем, держим прозрачный прайс |
| **Неудачный пилот** | По оценке на vc.ru, неудачный ИИ-пилот обходится бизнесу в 100–300 тыс. ₽ в месяц ([vc.ru](https://vc.ru/money/3022664-ii-dlya-biznesa-gde-prinosit-pribyl)) | Узкий пилот: один канал, один сценарий, 2–4 недели, метрики заранее |

**Что это значит для Сергея.** Технически агентство запустить дёшево. Трудности в другом: доверие клиентов, юридическая чистота и устойчивость каналов.
- **Главное преимущество** — собственный бизнес как полигон и личное присутствие в Краснодаре.
- **Главная ловушка** — пытаться продавать подписку на чат-бота салонам, где уже есть SaaS за сотни рублей.
- **Куда идти:** голос и запись для стоматологий и автосервисов на российской инфраструктуре и по понятному договору.

---

## Источники

Ниже все ссылки из заметок, на которых построен отчёт, по темам. Повторы убраны. Все страницы просмотрены исследователями 04.11.2026 через поисковую выдачу. Перед решениями их нужно открыть и проверить вручную.


### Ниши и рынок Краснодара

1. [hour24.ru](https://hour24.ru/96717.html)
2. [Кубанские новости, 02.04.2025](https://kubnews.ru/obshchestvo/2025/04/02/stalo-izvestno-skolko-chelovek-prozhivaet-v-krasnodarskom-krae/)
3. [АиФ-Кубань](https://kuban.aif.ru/society/chislennost-naseleniya-v-krasnodare-sostavila-1-mln-262-tys-chelovek)
4. [Коммерсантъ](https://www.kommersant.ru/doc/7623196)
5. [Югополис](https://www.yugopolis.ru/za-poslednij-god-naselenie-krasnodara-uvelichilos-na-17-tysyach-chelovek/)
6. [Коммерсантъ](https://www.kommersant.ru/doc/7182628)
7. [Юга.ру](https://www.yuga.ru/news/481169-v-krasnodare-prozhivayut-23-mln-chelovek-gubernator/)
8. [Юга.ру](https://www.yuga.ru/news/481903-chislennost-naseleniya-krasnodara-ne-prevyshaet-18-mln-chelovek-ekspert/)
9. [Блокнот Краснодар](https://bloknot-krasnodar.ru/news/naselenie-krasnodarskogo-kraya-dostiglo-bolee-5-8-)
10. [Кубанские новости, 28.05.2026](https://kubnews.ru/obshchestvo/2026/05/28/v-krasnodarskoy-aglomeratsii-rabotayut-okolo-40-malogo-i-srednego-biznesa-kubani)
11. [utyug.info](https://utyug.info/new/kolichestvo-predprinimateley-uvelichilos-na-5-tys-v-2025-godu-v-krasnodare-69936/)
12. [Коммерсантъ «Числом и уменьем»](https://www.kommersant.ru/doc/8604619)
13. [ДГ-Юг](https://dg-yug.ru/news/20243770.html)
14. [Коммерсантъ](https://www.kommersant.ru/doc/8605102)
15. [Кубанские новости, 16.07.2025](https://kubnews.ru/obshchestvo/2025/07/16/v-krasnodarskom-krae-prodolzhaet-rasti-kolichestvo-subektov-malogo-i-srednego-predprinimatelstva/)
16. [ДГ-Юг](https://www.dg-yug.ru/news/20231449.html)
17. [Юга.ру](https://www.yuga.ru/news/477768-krasnodarskij-kraj-dostig-istoricheskogo-maksimuma-po-kolichestvu-predpriyatij-malogo-i-srednego-biznesa/)
18. [2ГИС, rubricId 222](https://2gis.ru/krasnodar/search/%D0%A1%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8%2C%20%D1%81%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8/rubricId/222)
19. [2ГИС](https://2gis.ru/krasnodar/search/%D0%90%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B0)
20. [2ГИС, rubricId 9041](https://2gis.ru/krasnodar/search/%D0%90%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D1%8B%20(%D0%A1%D0%A2%D0%9E)
21. [2ГИС](https://2gis.ru/krasnodar/search/%D0%9A%D1%80%D1%83%D0%B3%D0%BB%D0%BE%D1%81%D1%83%D1%82%D0%BE%D1%87%D0%BD%D1%8B%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)
22. [avtotochki.ru](https://krasnodar.avtotochki.ru/catalog/avtoservisy/pt1c1246913551730/)
23. [Autospot](https://krasnodar.autospot.ru/autoservice/to/)
24. [RB.ru](https://rb.ru/news/beauty-salons-russia/)
25. [Sostav](https://www.sostav.ru/publication/salony-krasoty-72937.html)
26. [Zoon](https://zoon.ru/krasnodar/beauty/)
27. [Zoon](https://zoon.ru/krasnodar/beauty/type/parikmaherskaya/)
28. [Яндекс Услуги](https://uslugi.yandex.ru/35-krasnodar/category/krasota/manikjur--4959)
29. [Профи.ру](https://profi.ru/geo-ksdr/krasota/manicure/)
30. [2ГИС «Частные клиники Краснодара»](https://2gis.ru/krasnodar/search/%D0%A7%D0%B0%D1%81%D1%82%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)
31. [2ГИС «Медцентры Краснодара»](https://2gis.ru/krasnodar/search/%D0%9C%D0%B5%D0%B4%D0%B8%D1%86%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%D1%8B%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)
32. [2ГИС rubricId 4521](https://2gis.ru/krasnodar/search/%D0%9C%D0%BD%D0%BE%D0%B3%D0%BE%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BC%D0%B5%D0%B4%D0%B8%D1%86%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%D1%8B%20(%D0%BC%D0%B5%D0%B4%D1%86%D0%B5%D0%BD%D1%82%D1%80%D1%8B)
33. [2ГИС](https://2gis.ru/krasnodar/search/%D0%94%D0%B8%D0%B0%D0%B3%D0%BD%D0%BE%D1%81%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)
34. [2ГИС, rubricId 205](https://2gis.ru/krasnodar/search/%D0%92%D0%B5%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B0%D1%80%D0%BD%D1%8B%D0%B5%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20(%D0%B2%D0%B5%D1%82%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8)
35. [2ГИС «Ветклиника в Краснодаре»](https://2gis.ru/krasnodar/search/%D0%92%D0%B5%D1%82%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0%20%D0%B2%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D0%B5)
36. [Zoon /fitness/](https://zoon.ru/krasnodar/fitness/)
37. [Zoon](https://zoon.ru/krasnodar/fitness/type/detskaya_komnata/)
38. [Zoon](https://zoon.ru/krasnodar/fitness/type/est_bassejn/)
39. [Zoon](https://zoon.ru/krasnodar/fitness/type/kruglosutochno/)
40. [Zoon](https://zoon.ru/krasnodar/fitness/rayon/tsentralnyj_okrug/)
41. [ДГ-Юг](https://www.dg-yug.ru/news/20174056.html)
42. [TAdviser](https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%A1%D0%B0%D0%BB%D0%BE%D0%BD%D1%8B_%D0%BA%D1%80%D0%B0%D1%81%D0%BE%D1%82%D1%8B_%D0%B8_%D0%BF%D0%B0%D1%80%D0%B8%D0%BA%D0%BC%D0%B0%D1%85%D0%B5%D1%80%D1%81%D0%BA%D0%B8%D0%B5_%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8)
43. [russdent.ru](https://russdent.ru/uslugi-kliniki/terapiya/lechenie-kariesa)
44. [prozuby23.ru](https://prozuby23.ru/prices/)
45. [dentalart23.ru](https://dentalart23.ru/uslugi/terapiya/lechenie-kariesa)
46. [intan.ru/krd](https://intan.ru/krd/)
47. [med-23.ru](https://www.med-23.ru/price/adult/)
48. [stamus.ru](https://stamus.ru/prices)
49. [oneclinickrd.ru](https://oneclinickrd.ru/prices)
50. [rolf.ru](https://www.rolf.ru/krd/offers/fiksirovannaia-stoimost-norma-casa-na-vas-skoda/)
51. [ОСН](https://www.osnmedia.ru/avto/tsena-soderzhaniya-mashiny-v-rossii-k-2026-godu-vyrosla-na-40/)
52. [2ГИС «Маникюр цены»](https://2gis.ru/krasnodar/search/%D0%9C%D0%B0%D0%BD%D0%B8%D0%BA%D1%8E%D1%80%20%D1%86%D0%B5%D0%BD%D1%8B)
53. [2ГИС «Студия красоты цены»](https://2gis.ru/krasnodar/search/%D0%A1%D1%82%D1%83%D0%B4%D0%B8%D1%8F%20%D0%BA%D1%80%D0%B0%D1%81%D0%BE%D1%82%D1%8B%20%D1%86%D0%B5%D0%BD%D1%8B)
54. [s5r.ru](https://krasnodar.s5r.ru/remont-pod-klyuch)
55. [s5r.ru/tseny](https://krasnodar.s5r.ru/tseny)
56. [masterok23.ru](https://masterok23.ru/sample-page/)
57. [podklyuch23.ru](https://podklyuch23.ru/tseny-na-remont/)
58. [stroy-c.ru](https://stroy-c.ru/remont-kvartir/remont-pod-kljuch/kapitalnyj-remont/)
59. [stroyka-ms.ru](https://stroyka-ms.ru/articles/404d91be/)
60. [korona-remont](https://krasnodar.korona-remont.ru/)
61. [RussianRate, топ-10 2026](https://russianrate.com/top-10-remont-kvartir-krasnodar-2026/)
62. [RB.ru](https://rb.ru/news/biznes-teryaet-iz-za-propushennyh-zvonkov-do-96-mln-v-god-naibolshuyu-vyruchku-upuskayut-stomatologii-i-avtoservisy/)
63. [AdIndex](https://adindex.ru/news/tendencies/2026/04/27/344556.phtml)
64. [Реальное время](https://realnoevremya.ru/news/394350-kompanii-rf-teryayut-do-962-mln-rubley-v-god-iz-za-propuschennyh-zvonkov)
65. [Т-Бизнес секреты](https://secrets.tbank.ru/blogi-kompanij/propushhennye-zvonki-klientov/)
66. [Т-Бизнес секреты, новость](https://secrets.tbank.ru/novosti/poteri-ot-propushchennykh-zvonkov/)
67. [ko.ru](https://ko.ru/news/finansovye-poteri-biznesa-ot-propushchennykh-zvonkov-dokhodyat-do-96-2-mln-rubley-v-god/)
68. [Calltouch, блог](https://www.calltouch.ru/blog/vidzhet-prozvona-propushhennyh-dozvonimsya-do-vseh/)
69. [Calltouch, авто 2021](https://www.calltouch.ru/blog/insajty-avtomobilnogo-rynka-2021-issledovanie-8-mln-obrashhenij-v-industrii/)
70. [Calltouch](https://www.calltouch.ru/blog/issledovanie-calltouch-analitika-zvonkov-v-sfere-nedvizhimosti/)
71. [CNews](https://www.cnews.ru/news/line/2025-12-19_kak_biznes_teryaet_klientov)
72. [UIS](https://www.uiscom.ru/blog/kak-biznes-sam-upuskaet-klientov-pochemu-kazhdyy-tretiy-zvonok-ostaetsya-bez-otveta-i-chto-s-etim-de/)
73. [rechka.ai](https://rechka.ai/blog/poteryannye-zvonki/)
74. [UIS «Обойдёмся без потерь»](https://www.uiscom.ru/blog/oboydyemsya-bez-poter/)
75. [Sostav](https://www.sostav.ru/publication/klient-uzhe-gotov-platit-a-vy-ego-teryaete-85968.html)
76. [rechka.ai](https://rechka.ai/blog/zvonok-v-kliniku/)
77. [MedScore](http://med-score.ru/blog/propushchennye-zvonki-v-klinike-skolko-deneg-teryaete)
78. [Stexa AI](https://stexa.ru/blog/skolko-pacientov-teryaet-klinika-na-neprinyatyh-zvonkah-schitaem-v/)
79. [TelecomDaily](https://telecomdaily.ru/news/2025/03/31/mango-office-kak-klientskiy-servis-vliyaet-na-otnoshenie-pokupateley-k-kompanii)
80. [Mango Office](https://www.mango-office.ru/products/virtualnaya_ats/vozmozhnosti/recall_missed/)
81. [The Replica](https://thereplica.ru/blog/nochnye-i-vyhodnye-zvonki)
82. [Calltouch, туризм 2024](https://www.calltouch.ru/blog/issledovanie-calltouch-realnyj-cpl-i-drugie-metriki-v-turizme-v-2024-godu/)
83. [Sostav, блог](https://www.sostav.ru/blogs/284006/66483)
84. [Ведомости, пресс-релиз 07.08.2024](https://www.vedomosti.ru/press_releases/2024/08/07/kak-yclients-i-mango-office-uvelichivayut-chislo-klientov-salonov-krasoti-i-barbershopov-na-23-erid-2vfnxy2wwaq)
85. [vc.ru](https://vc.ru/life/1367328-kak-yclients-i-mango-office-uvelichivayut-chislo-klientov-salonov-krasoty-i-barbershopov-na-23)
86. [IntellectDialog](https://intellectdialog.com/tpost/yclients-dlya-salona-krasoty-nastrojka-avtomatizacija)
87. [Axiom](https://axiom.rent/insights/customer-base-salon-services-2026)
88. [Revvy](https://revvy.ai/blog/tpost/bhe7n0k6o1-pochemu-patsienti-ne-prihodyat-na-priyom)
89. [MedBusiness, исследование no-show](https://medbusiness.space/blog/research/issledovanie-no-show-nejavki-patsientov-i-poteri-kliniki/)
90. [CRMAI](https://crmai.kz/blog/medicina-kliniki-no-show-napominaniya)
91. [Wahelp](https://wahelp.ru/blog/articles/Pravilo-5-minut-v-prodazhah-kak-uskorit-konversiyu/)
92. [Magnetto](https://magnetto.pro/media/article/konversiia-v-prodazhakh-raschet-formuly-pokazateli-i-sposoby-povysheniia/)
93. [Lead The Way](https://leadtheway-marketing.com/ru/blog/skorost-otveta-na-lid)
94. [BeautyDigital](https://beautydigital.ru/analiz-rynka-servisov-onlayn-zapisi-v-salony-krasoty-2022-3q/)
95. [Т-Бизнес секреты, история YCLIENTS](https://secrets.tbank.ru/trendy/kak-razvivalas-platforma-yclients/)
96. [ECOMHUB](https://ecomhub.ru/yandex-dikidi-deal-services-market-platform-booking-vk-yclients/)
97. [DIKIDI, база знаний](https://support.dikidi.net/ru/knowledge-bases/4/articles/760-kak-rabotaet-servis-dikidi)
98. [Infostart](https://infostart.ru/public/1496814/)
99. [Infostart, 1С](https://infostart.ru/public/1479631/)
100. [a2is](https://a2is.ru/catalog/crm-sistemy-vse/compare/keycrm/yclients)
101. [ApiX-Drive](https://apix-drive.com/ru/y-clients-api)
102. [ApiMonster](https://apimonster.ru/connector/bundle/yclients/closeup/)
103. [yclients.ru/auto-service](https://www.yclients.ru/auto-service)
104. [MedBusiness](https://medbusiness.space/blog/automation/mis-dlja-stomatologii-2026-ident-dentalpro-ili-1s-sravnenie/)
105. [MedBusiness](https://medbusiness.space/blog/automation/vybor-mis-dlja-stomatologii-v-2026-ident-dentalpro-ili-1s/)
106. [DentalPortal](https://dentalportal.ru/mis-ident-dlya-stomatologii)
107. [ident24.ru](https://ident24.ru/)
108. [Toolfox](https://toolfox.ru/services/s/infoclinica)
109. [ITC.media](https://itc.media/integraciya-s-mis/)
110. [mis.32top.ru](https://mis.32top.ru/blog-kak-vybrat-mis-dlya-stomatologii-podrobnyj-razbor-17-populyarnyh-sistem/)
111. [Мегаплан, 21 CRM для СТО 2026](https://megaplan.ru/blog/crm/21-crm-sistema-dlya-avtoservisov-i-sto/)
112. [Upservice](https://upservice.com/crm-dlya-avtoservisa)
113. [Сусанин](https://susanin.news/russia/business/20251118-333578/)
114. [Киров.online](https://kirov.online/press-relizy/issledovanie-sbera-fom-i-minekonomrazvitia-77-rossijskih-predprinimatelej-uze-znakomy-s-ii-a-kazdyj-vtoroj-probuet-primenat-ego-v-biznese)
115. [Retail Life](https://retail-life.ru/issledovanie-sbera-fom-i-minjekonomrazvitija-77-rossijskih-predprinimatelej-uzhe-znakomy-s-ii-a-kazhdyj-vtoroj-probuet-primenjat-ego-v-biznese/)
116. [i38.ru](https://i38.ru/technologii-obichnie/sber-i-fom-45-predstaviteley-malogo-i-mikrobiznesa-ispolzuiut-iskusstvenniy-intellekt)
117. [СберБизнес Live](https://sberbusiness.live/publications/popolnenie-v-komande-45-predprinimatelei-uzhe-ispolzuiut-iskusstvennyi-intellekt-v-rabote)
118. [Известия](https://iz.ru/2142702/2026-08-03/polovina-msp-ispolzuet-ii-dlia-sokrashcheniia-izderzhek)
119. [Деловая Россия](https://deloros.ru/press-centr/publikacii/podnyat-na-bot-polovina-msp-ispolzuet-neyroseti-dlya-sokrashcheniya-izderzhek-/)
120. [Т-Бизнес секреты](https://secrets.tbank.ru/trendy/kak-predprinimateli-i-sotrudniki-ispolzuyut-ii/)
121. [RB.ru](https://rb.ru/news/bolshe-poloviny-predprinimatelej-srednego-i-malogo-biznesa-platyat-za-nejroseti-38-tratyat-na-ii-do-3000-rublej-v-mesyac/)
122. [Global CIO](https://globalcio.ru/news/56981/)
123. [МТС](https://nov.mts.ru/about/media-centr/soobshheniya-kompanii/novosti-mts-v-rossii-i-mire/2025-04-17/issledovanie-mts-biznes-hab-kazhdyj-tretij-biznes-v-rossii-startuet-s-byudzhetom-do-500-tysyach-rublej)
124. [СуперИнтеллект](https://superintellect.ru/blog/kak-malyj-biznes-ispolzuet-ii-2026)
125. [ICT.Moscow](https://ict.moscow/analytics/opros-ob-ispolzovanii-ii-malym-i-srednim-biznesom/)
126. [AMIC](https://www.amic.ru/news/alfa-bank-vvel-neskolko-tehnologicheskih-novshestv-dlya-podderzhki-malogo-biznesa-572733)
127. [Коммерсантъ](https://www.kommersant.ru/doc/8687960?erid=F7NfYUJCUneTVxbzyoLY)

### Местные конкуренты, фриланс, интеграторы и цены

128. [24krd.ru/services/landing.php](https://24krd.ru/services/landing.php)
129. [apelsin.media/sajt-na-tilde](https://apelsin.media/sajt-na-tilde)
130. [apelsin.media/zakazat-lending](https://apelsin.media/zakazat-lending)
131. [art6.ru/sozdanie-lendingov/](https://art6.ru/sozdanie-lendingov/)
132. [art6.ru/krasnodar/sozdanie-lendingov-na-tilda](https://art6.ru/krasnodar/sozdanie-lendingov-na-tilda)
133. [clyovo.ru/blog/chat-bot-tsena-2026](https://clyovo.ru/blog/chat-bot-tsena-2026)
134. [megagroup.ru/krasnodar/landing-page](https://megagroup.ru/krasnodar/landing-page)
135. [lead.media/krasnodar/sozdanie-sajtov/lending/](https://lead.media/krasnodar/sozdanie-sajtov/lending/)
136. [lead.media/krasnodar/sozdanie-sajtov/tseny/](https://lead.media/krasnodar/sozdanie-sajtov/tseny/)
137. [krasnodar.skadium.ru/zakazat-lending/](https://krasnodar.skadium.ru/zakazat-lending/)
138. [zasovskiy.ru/krasnodar/.../razrabotka-landinga/](https://zasovskiy.ru/krasnodar/razrabotka/razrabotka-landinga/)
139. [krasnodar.ur66.ru/landing-page/](https://krasnodar.ur66.ru/landing-page/)
140. [craftpromotion.ru/krasnodar/development/landing-page](https://craftpromotion.ru/krasnodar/development/landing-page)
141. [krasnodar.vektor.market/sayty-na-tilde](https://krasnodar.vektor.market/sayty-na-tilde)
142. [krasnodar.studio-expert.ru/razrabotka-sajtov/tilda/](https://krasnodar.studio-expert.ru/razrabotka-sajtov/tilda/)
143. [tildzilla.ru/krasnodar](https://tildzilla.ru/krasnodar)
144. [vyatka-it.ru/krasnodar/landing-page/](https://vyatka-it.ru/krasnodar/landing-page/)
145. [avigroup.pro/krasnodar/sozdanie-sajtov-na-tilda/](https://avigroup.pro/krasnodar/sozdanie-sajtov-na-tilda/)
146. [ratingruneta.ru/web/krasnodar/](https://ratingruneta.ru/web/krasnodar/)
147. [ratingruneta.ru/web/krasnodar/low/](https://ratingruneta.ru/web/krasnodar/low/)
148. [cmsmagazine.ru/creators/krasnodar/](https://cmsmagazine.ru/creators/krasnodar/?pn=all)
149. [marketing-tech.ru](https://marketing-tech.ru/company_tags/studio/krasnodar/)
150. [mirstat.ru](https://www.mirstat.ru/krasnodar/web_design_studio.html)
151. [purrweb.com](https://www.purrweb.com/ru/blog/top-dizayn-studiy-krasnodar/)
152. [art6.ru](https://art6.ru/sozdanie-lendingov-na-tilda/)
153. [clyovo.ru/services/ai-avatar](https://clyovo.ru/services/ai-avatar)
154. [krasnodar.seotemple.ru/services/razrabotka-chat-bota/](https://krasnodar.seotemple.ru/services/razrabotka-chat-bota/)
155. [a-potok.ru/bot/beauty/krasnodar](https://www.a-potok.ru/bot/beauty/krasnodar)
156. [a-potok.ru](https://a-potok.ru/)
157. [digitaltransformed.ru/business-ai-krasnodar](https://www.digitaltransformed.ru/business-ai-krasnodar)
158. [gravitel.ru/.../golosovoy-robot-dlya-biznesa-v-krasnodare/](https://gravitel.ru/products/golosovoy-robot-dlya-biznesa-v-krasnodare/)
159. [gravitel.ru/tariff/robot-aicall/](https://gravitel.ru/tariff/robot-aicall/)
160. [krasnodar.megafon.ru/corporate/services/golosovoy_robot](https://krasnodar.megafon.ru/corporate/services/golosovoy_robot)
161. [dtco.ru/krasnodar/service/golosovoj-robot/](https://www.dtco.ru/krasnodar/service/golosovoj-robot/)
162. [profi.ru/geo-ksdr/.../razrabotka-botov-telegram/](https://profi.ru/geo-ksdr/it_freelance/razrabotka-botov-telegram/)
163. [ksdr.profi.ru/.../razrabotka-botov-telegram/](https://ksdr.profi.ru/it_freelance/razrabotka-botov-telegram/)
164. [uslugi.yandex.ru](https://uslugi.yandex.ru/35-krasnodar/category?text=%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0+%D1%82%D0%B5%D0%BB%D0%B5%D0%B3%D1%80%D0%B0%D0%BC%D0%BC+%D0%B1%D0%BE%D1%82%D0%BE%D0%B2)
165. [jivo.ru/yclients-ai/](https://www.jivo.ru/yclients-ai/)
166. [jivo.ru/blog/.../ii-dlja-salona-krasoty](https://www.jivo.ru/blog/announcements/ii-dlja-salona-krasoty.html)
167. [jautomation.ru](https://jautomation.ru/)
168. [smartagentix.ru](https://smartagentix.ru/)
169. [intly.ru/solutions/beauty-salons](https://intly.ru/solutions/beauty-salons)
170. [нуби.рф](https://xn--80abvbv0b.xn--p1ai/)
171. [neuroagents.pro](https://neuroagents.pro/)
172. [neuro42.ru/neuro-employees/pricing/](https://neuro42.ru/neuro-employees/pricing/)
173. [aibotmanager.ru](https://aibotmanager.ru/)
174. [aibotmanager.ru/nejrosotrudniki-faq/](https://aibotmanager.ru/nejrosotrudniki-faq/)
175. [raketadigital.com/blog/medchat-ii/...](https://raketadigital.com/blog/medchat-ii/ii-administrator-dlya-stomatologii-kak-ne-teryat-patsientov-24-7/)
176. [webseed.ru/ai/agents/ai-obzvon-dlya-stomatologii-...](https://webseed.ru/ai/agents/ai-obzvon-dlya-stomatologii-zapis-i-napominanie-patsientam)
177. [la-chatte.com/services/ai-prodavec/](https://la-chatte.com/services/ai-prodavec/)
178. [la-chatte.com/services/razrabotka-telegram-botov/](https://la-chatte.com/services/razrabotka-telegram-botov/)
179. [avitoma.ru/ii-dlya-avito](https://avitoma.ru/ii-dlya-avito)
180. [chatlabs.ru](https://chatlabs.ru/)
181. [chatlabs.ru/golosovye-boty/](https://chatlabs.ru/golosovye-boty/)
182. [workspace.ru/contractors/chatlabs/](https://workspace.ru/contractors/chatlabs/)
183. [aiorkestrator.ru/uslugi/telegram-bot/](https://aiorkestrator.ru/uslugi/telegram-bot/)
184. [l7agency.ru/ai](https://l7agency.ru/ai)
185. [mrcheck.ru/razrabotka-i-vnedrenie-telegram-bota/](https://mrcheck.ru/razrabotka-i-vnedrenie-telegram-bota/)
186. [omni.korusconsulting.ru/solutions/chat-bot/](https://omni.korusconsulting.ru/solutions/chat-bot/)
187. [voxys.ru/.../golosovye-roboty.html](https://www.voxys.ru/cifrovye-reshenija/golosovye-roboty.html)
188. [skorozvon.ru/solutions/golosovoy-robot](https://skorozvon.ru/solutions/golosovoy-robot)
189. [voicelogic.ru/pricing/](https://voicelogic.ru/pricing/)
190. [profi.ru/geo-ksdr/.../landing-page/price/](https://profi.ru/geo-ksdr/it_freelance/programmer/sozdanie-saita/landing-page/price/)
191. [profi.ru/geo-ksdr/it_freelance/sozdanie-saita-na-tilda/](https://profi.ru/geo-ksdr/it_freelance/sozdanie-saita-na-tilda/)
192. [uslugi.yandex.ru (создание лендинга)](https://uslugi.yandex.ru/35-krasnodar/category?text=%D1%81%D0%BE%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5+%D0%BB%D0%B5%D0%BD%D0%B4%D0%B8%D0%BD%D0%B3%D0%B0)
193. [uslugi.yandex.ru (дизайн лендингов)](https://uslugi.yandex.ru/35-krasnodar/category/dizajneryi/vebdizajner/dizajn-lendingov--228)
194. [kwork.ru/land/lending-na-tilde](https://kwork.ru/land/lending-na-tilde)
195. [kwork](https://kwork.ru/web-plus-mobile-design/13576057/lending-na-tilda-pod-klyuch-nastroyki-seo-v-podarok)
196. [kwork](https://kwork.ru/website-development/40663195/sozdam-lending-na-tilda-dlya-psikhologa-pod-klyuch)
197. [kwork](https://kwork.ru/website-development/50148955/prodayushchiy-landing-page-na-tilda-v-zero-block-pod-klyuch)
198. [kwork](https://kwork.ru/website-development/43527161/sovremenniy-lending-na-tilda-pod-klyuch)
199. [kwork](https://kwork.ru/website-development/28298819/zakazat-sayta-na-tilda-lending-pod-klyuch-sozdanie-saytov-na-tilda)
200. [kwork](https://kwork.ru/website-development/7778368/individualniy-landing-page-odnostranichniy-sayt-pod-klyuch-na-tilda)
201. [kwork](https://kwork.ru/website-development/13344459/razrabotka-unikalnogo-lendinga-tilda-dizayn-i-verstka-sayta-tilda)
202. [kwork.ru/land/chat-bot-dlya-telegram](https://kwork.ru/land/chat-bot-dlya-telegram)
203. [kwork](https://kwork.ru/script-programming/32135302/chat-gpt-bot-na-baze-chatgpt-4-v-vashem-telegram-bote-dalle-3-web)
204. [kwork](https://kwork.ru/script-programming/45999794/chat-bot-v-telegram-i-avito)
205. [kwork](https://kwork.ru/script-programming/53569775/razrabotka-umnogo-chat-bota-s-ii-chatgpt-gpt-4o-dlya-telegram)
206. [kwork](https://kwork.ru/script-programming/30141119/chat-gpt-4-telegramm-bot)
207. [freelance.ru](https://freelance.ru/offer/chat-bot-telegramm-s-ii-na-n8n-i-ustanovkoj-na-server-beget-82362.html)
208. [freelance.ru](https://freelance.ru/offer/razrabotka-telegram-bota-na-python-aiogram-pod-klyuch-91254.html)
209. [freelance.ru](https://freelance.ru/offer/razrabotka-chat-bota-telegram-pod-klyuch-90391.html)
210. [freelance.ru](https://freelance.ru/offer/sozdanie-telegram-bota-s-webapp-pod-klyuch-razrabotka-za-3-dnya-61645.html)
211. [rg.ru, 03.11.2026](https://rg.ru/2026/11/03/v-mvd-predupredili-o-moshennicheskoj-sheme-s-ii-i-telegram-botami.html)
212. [workspace.ru/calculator/rossiya/sajt-pod-klyuch/landing-page/ehkonom/](https://workspace.ru/calculator/rossiya/sajt-pod-klyuch/landing-page/ehkonom/)
213. [workspace.ru/web-development/landing-page/](https://workspace.ru/web-development/landing-page/)
214. [workspace.ru/blog/skolko-stoit-razrabotka-sayta/](https://workspace.ru/blog/skolko-stoit-razrabotka-sayta/)
215. [workspace.ru/chatbot/](https://workspace.ru/chatbot/)
216. [ratingruneta.ru/web/landing/](https://ratingruneta.ru/web/landing/)
217. [bothelp.io/ru/blog/skolko-stoit-razrabotka-chat-bota](https://bothelp.io/ru/blog/skolko-stoit-razrabotka-chat-bota)
218. [gravitel.ru/blog/...](https://gravitel.ru/blog/robot-aicall/skolko-stoit-golosovoj-robot-v-2026-godu-polnyj-razbor-czen/)
219. [team-b.ru](https://team-b.ru/blog/stoimost-razrabotki-sayta/)
220. [yak-studio.ru](https://yak-studio.ru/blog/skolko-stoit-landing)
221. [tobiz.net](https://tobiz.net/support/skolko-stoit-sozdat-lending-v-2025-razbor-cen-na-razrabotku/)
222. [sostav.ru](https://www.sostav.ru/blogs/281569/86687)
223. [swiftagents.ru](https://swiftagents.ru/blog/skolko-stoit-vnedrit-ii-v-malyy-biznes)
224. [apelsin.media](https://apelsin.media/)

### Платформы, SaaS и голосовые роботы

225. [docs.salebot.pro: Тарифы](https://docs.salebot.pro/nashi-uslugi/tarify)
226. [salebot.pro](https://salebot.pro/)
227. [salebot.pro/online_booking](https://salebot.pro/online_booking)
228. [salebot.pro/online_shop](https://salebot.pro/online_shop)
229. [salebot.pro/telegram_bot](https://salebot.pro/telegram_bot)
230. [toolfox.ru](https://toolfox.ru/services/s/salebot)
231. [a2is.ru](https://a2is.ru/catalog/chat-boty/salebot)
232. [puzzlebot.top/price](https://puzzlebot.top/price?lang=en)
233. [puzzlebot.top blog](https://puzzlebot.top/blog/en/230-how-connect-chatgpt-your-bot)
234. [bothelp.io/pricing](https://bothelp.io/pricing)
235. [help.bothelp.io: Тарифы и лимиты](https://help.bothelp.io/en/tarify-i-limity/)
236. [main.bothelp.io/ru](https://main.bothelp.io/ru)
237. [help.leadteh.ru/tarify](https://help.leadteh.ru/tarify/)
238. [leadteh.ru](https://leadteh.ru/)
239. [leadteh.ru/telegram](https://leadteh.ru/telegram)
240. [leadteh.ru/partners](https://leadteh.ru/partners)
241. [aimylogic.com/ru/price](https://aimylogic.com/ru/price)
242. [aimylogic.com «Ночной администратор»](https://aimylogic.com/page21920287.html)
243. [smartcalls.aimylogic.com](https://smartcalls.aimylogic.com/)
244. [help.aimylogic.com: Партнёрская программа](https://help.aimylogic.com/docs/ru/overview/partnership)
245. [jivo.ru/ai-agent](https://www.jivo.ru/ai-agent/)
246. [jivo.ru/pricing](https://www.jivo.ru/pricing/)
247. [jivo.ru/ai-assistant](https://www.jivo.ru/ai-assistant/)
248. [jivo.ru](https://www.jivo.ru/)
249. [jivo.ru/partnership](https://www.jivo.ru/partnership/)
250. [smartbotpro.ru/info](https://www.smartbotpro.ru/info)
251. [docs.smartbotpro.ru: Тарифы и цены](https://docs.smartbotpro.ru/dokumenty/podpiska-i-tarify/tarify-i-ceny)
252. [smartbotpro.ru: партнёрская программа](https://www.smartbotpro.ru/products/partnerskaya-programma)
253. [pro-talk.ru](https://pro-talk.ru/)
254. [pro-talk.ru/whats-new](https://pro-talk.ru/whats-new)
255. [marketplace.pro-talk.ru](https://marketplace.pro-talk.ru/)
256. [pro-talk.ru: AI-телефония](https://pro-talk.ru/ai-telefoniya-vhodyashchie-i-ishodyashchie-zvonki-s-ii-botom)
257. [dev.pro-talk.ru](https://dev.pro-talk.ru/)
258. [pro-talk.ru/making_chat_bots](https://pro-talk.ru/making_chat_bots)
259. [chatme.ai/en](https://chatme.ai/en/)
260. [chatme.ai: кейс 80 тыс. ₽](https://chatme.ai/blog/kak-s-pomoshyu-chat-bota-za-80-tysrub-my-razgruzil/)
261. [chatme.ai: голосовые ИИ-агенты](https://chatme.ai/blog/golosovye-ii-agenty-kak-virtualnyj-golos-revolyuci/)
262. [umnico.com/chatbot-builder](https://umnico.com/chatbot-builder/)
263. [umnico.com/inbox](https://umnico.com/inbox/)
264. [umnico.com блог про онлайн-чаты](https://umnico.com/ru/blog/online-live-chat/)
265. [wazzup24.ru/pricing](https://wazzup24.ru/pricing/)
266. [wazzup24.ru: Как подобрать тариф](https://wazzup24.ru/help/payment/price-plans-ru/)
267. [helpdesk.bitrix24.ru: BitrixGPT + Маркетплейс](https://helpdesk.bitrix24.ru/open/27018478/)
268. [helpdesk.bitrix24.ru: Бусты](https://helpdesk.bitrix24.ru/open/21288486_77f013b882a88b410405f3e34ea51d1db868afa5b444c0e9d5fd77b7a82dbb9b/)
269. [bitrix24.ru: CRM для стоматологии](https://www.bitrix24.ru/solutions/crm-dlya-stomatologii/)
270. [amocrm.ru/start](https://www.amocrm.ru/start)
271. [kommo.com/buy/tariff](https://www.kommo.com/buy/tariff/)
272. [kommo.com/blog/kommo-pricing](https://www.kommo.com/blog/kommo-pricing/)
273. [360.yandex.ru: Алиса AI для бизнеса](https://360.yandex.ru/business/alice-business/)
274. [новость Яндекса 08.09.2026](https://yandex.ru/company/news/08-09-2026-02)
275. [новость Yandex B2B Tech 28.08.2025](https://yandex.ru/company/news/28-08-2025-01)
276. [developers.sber.ru: SaluteBot](https://developers.sber.ru/portal/products/salutebot-chat-bot)
277. [соглашение SaluteBot](https://developers.sber.ru/docs/ru/policies/salutebot-agreement)
278. [developers.sber.ru: сравнение с Konverbot](https://developers.sber.ru/help/salutebot/konverbot-analogues)
279. [support.yclients.ru](https://support.yclients.ru/1-2-91--1/)
280. [yclients.ru/marketplace](https://www.yclients.ru/marketplace/revvy)
281. [yclients.com/marketplace](https://www.yclients.com/marketplace/docdoc)
282. [Wahelp](https://support.yclients.ru/71-630-75-349--integraciya-yclients-i-wahelp/)
283. [CHATPUSH](https://support.yclients.com/71-630-75-352--integraciya-yclients-i-chatpush/)
284. [Imobis](https://support.yclients.com/71-630-75-343--integraciya-yclients-i-imobis-chat-boty/)
285. [yclients.ru/info/pricing](https://www.yclients.ru/info/pricing)
286. [архив тарифов](https://www.yclients.ru/info/pricing-archive)
287. [расчёт лицензии](https://support.yclients.ru/82-83-482--raschet-parametrov-licenzii/)
288. [toolfox.ru](https://toolfox.ru/services/s/yclients)
289. [support.yclients.com: ЕГИСЗ](https://support.yclients.com/5-29-785--integraciya-yclients-i-egisz/)
290. [jivo.ru/help: ИИ для YClients](https://www.jivo.ru/help/integrations/ai-for-yclients.html)
291. [support.dikidi.net: О компании](https://support.dikidi.net/ru/knowledge-bases/4/articles/138-o-kompanii)
292. [Премиум-размещение](https://support.dikidi.net/ru/knowledge-bases/4/articles/157-chto-takoe-premium-razmeschenie-preimuschestva-i-stoimost)
293. [dikidi.net/ru/referrals](https://dikidi.net/ru/referrals)
294. [alteg.io/en/info/pricing](https://alteg.io/en/info/pricing/)
295. [блог Altegio](https://alteg.io/en/blog/how-to-choose-salon-booking-system/)
296. [Stiker.AI](https://alteg.io/en/support/knowledge-base/altegio-and-stiker-ai-whatsapp-whatsapp-business-telegram-instagram/)
297. [Solwees AI](https://alteg.io/en/support/knowledge-base/altegio-and-solwees-ai-voice-whatsapp-business-telegram-instagram-web-chat-email-viber-tiktok-messenger/)
298. [Flowsell](https://alteg.io/en/support/knowledge-base/7347127430429-2/)
299. [sonline.su/public/price](https://sonline.su/public/price)
300. [new.sonline.su/public/price](https://new.sonline.su/public/price)
301. [promo.arnica.pro/pricecrmarnica](https://promo.arnica.pro/pricecrmarnica)
302. [promo.arnica.pro/tarif-arnica](https://promo.arnica.pro/tarif-arnica)
303. [arnica.pro: приложение](https://arnica.pro/capabilities/corporate-application)
304. [medesk.ru](https://www.medesk.ru/)
305. [блог Medesk: сколько стоит МИС](https://www.medesk.ru/blog/skolko-stoit-mis-dlya-nebolshoy-kliniki/)
306. [crmindex.ru/products/ident](https://crmindex.ru/products/ident)
307. [selsup.ru: интеграция с IDENT](https://selsup.ru/store/integratsiya-s-crm-dlya-stomatologii-ident/)
308. [ComNews, 02.04.2026](https://www.comnews.ru/content/244566/2026-04-02/2026-w14/1011/peterburge-sozdali-cifrovuyu-registraturu-dlya-operativnoy-obrabotki-obrascheniy-pacientov)
309. [workspace.ru: 3 стоматологии](https://workspace.ru/cases/78-obrascheniy-zakryvayutsya-bez-operatora-ai-bot-zapisi-dlya-seti-iz-3-stomatologiy/)
310. [workspace.ru: ABClinic](https://workspace.ru/cases/ai-chat-bot-dlya-stomatologicheskoy-kliniki-abclinic-42-konversii-i-1-5-mln-rub-mes/)
311. [vc.ru](https://vc.ru/ai/2712044-ii-administrator-dlya-klinik)
312. [neuro.net: автоматизация медцентра](https://neuro.net/ru/avtomatizaciya-medicinskogo-centra/)
313. [vc.ru: автосервисы внедряют ИИ-ботов](https://vc.ru/ai/1709156)
314. [workspace.ru: Telegram-бот для автомастерской](https://workspace.ru/cases/elegram-bot-dlya-avtomasterskoy/)
315. [zvonobot.ru](https://zvonobot.ru/)
316. [zvonobot.ru/obzvon-robotom](https://zvonobot.ru/obzvon-robotom)
317. [zvonobot.ru/uslugi-holodnogo-obzvona](https://zvonobot.ru/uslugi-holodnogo-obzvona)
318. [a2is.ru](https://a2is.ru/catalog/telefoniya/zvonobot)
319. [toolfox.ru](https://toolfox.ru/services/s/robo-voice)
320. [a2is.ru](https://a2is.ru/catalog/golosovie-pomoshniki/robovoice)
321. [neuro.net/ru/nebo](https://neuro.net/ru/nebo/)
322. [speech.neuro.net](https://speech.neuro.net/text-to-speech)
323. [neuro.net: голосовой робот](https://neuro.net/ru/umnyj-golosovoj-robot-dlya-biznesa-avtomatizaciya-na-novom-urovne/)
324. [twin24.ai: голосовой ИИ-агент](https://twin24.ai/products/voice-ai-agent/)
325. [Confluence Twin: Тарифы](https://confluence.twin24.ai/spaces/TWINDOC/pages/157778334/%D0%A0%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB+%C2%AB%D0%A2%D0%B0%D1%80%D0%B8%D1%84%D1%8B%C2%BB?macroName=rate-me-macro&desktop=true&showLanguage=all)
326. [promo.dev.twin24.ai/cost](https://promo.dev.twin24.ai/cost)
327. [school.twin24.ai: оферта партнёра](https://school.twin24.ai/oferta-partner-quick-start)
328. [franchise.twin24.ai](https://franchise.twin24.ai/)
329. [exolve.ru/tariffs/robots](https://exolve.ru/tariffs/robots/)
330. [exolve.ru/products/robots](https://exolve.ru/products/robots/)
331. [exolve.ru: кейс дискаунтера](https://exolve.ru/case/robot-exolve-speeds-up-processing-applications/)
332. [mango-office.ru: голосовой робот](https://www.mango-office.ru/products/contact-center/ai/voice-robot/)
333. [региональная страница 3,5 ₽/мин](https://nizhnevartovsk.mango-office.ru/products/integraciya/integrations-voice-robot/)
334. [mango-office.ru: актуализация тарифов](https://www.mango-office.ru/journal/tidings/aktualizatsiya-tarifov-8-12/)
335. [mango-office.ru: тарифы контакт-центра](https://blagoveshensk.mango-office.ru/products/contact-center/tariffs/)
336. [voximplant.ru/products/voicebot](https://voximplant.ru/products/voicebot)
337. [voximplant.ru/products/smart-ivr](https://voximplant.ru/products/smart-ivr)
338. [voximplant.ru/pricing](https://voximplant.ru/pricing)
339. [sipuni.com/tariffs](https://sipuni.com/tariffs/)
340. [calltouch.ru: кейс МБ РУС](https://www.calltouch.ru/blog/64-stoimosti-sdelki-s-pomoshhyu-odnogo-instrumenta-avtodiler-mb-rus-ii-assistent-calltouch/)
341. [calltouch.ru: Callback](https://www.calltouch.ru/blog/calltouch-callback-novyj-obratnyj-zvonok/)
342. [novofon.com/speech-analytics](https://novofon.com/speech-analytics/)
343. [novofon.com: новость о распознавании](https://novofon.com/news/obnovlennaya-model-raspoznavaniya-rechi/)
344. [novofon.com/news](https://novofon.com/news/)
345. [marketplace.uiscom.ru: Speech Robot](https://marketplace.uiscom.ru/others/speech-robot/)
346. [uiscom.ru/tarify](https://www.uiscom.ru/tarify/)
347. [moskva.beeline.ru: голосовой робот в ОАТС](https://moskva.beeline.ru/business/telephony/cloud-ats/virtyalniy-operator/)
348. [moskva.beeline.ru: виртуальный оператор](https://moskva.beeline.ru/business/cloud-services/virtyalnyi-operator/)
349. [moscow.megafon.ru: голосовой робот](https://moscow.megafon.ru/corporate/services/golosovoy_robot)
350. [vl.megafon.ru](https://vl.megafon.ru/corporate/services/golosovoy_robot)
351. [t2.ru: Голосовой ассистент для бизнеса](https://30.t2.ru/business/option/b2b-voice-assistant)
352. [developers.sber.ru: тарифы для юрлиц](https://developers.sber.ru/docs/ru/salutespeech/tariffs/legal-tariffs)
353. [подключение юрлиц](https://developers.sber.ru/docs/ru/salutespeech/integration-entities)
354. [leadteh.ru/miniapp](https://leadteh.ru/miniapp)
355. [партнёрское соглашение](https://wazzup24.com/user-agreement-with-partner/)
356. [aimylogic.com](https://aimylogic.com/ru/kak-sdelat-chatbota/skolko-stoit-chatbot)

### Себестоимость: LLM, речь, телефония, хостинг, налоги

357. [levitsky-c.ru, «Цены YandexGPT, Alice AI и GigaChat API на октябрь 2026»](https://levitsky-c.ru/articles/ceny-yandexgpt-alice-ai-gigachat-api-oktyabr-2026)
358. [neurounit.ai](https://neurounit.ai/blog/yandex-ai-studio-tarify-i-api/)
359. [pawetta.com](https://pawetta.com/servisy/yandex-ai-studio/)
360. [kalinkindev.ru](https://kalinkindev.ru/blog/yandexgpt-api-cena/)
361. [3DNews](https://3dnews.ru/1128362)
362. [Habr](https://habr.com/ru/articles/941740)
363. [Partnerkin](https://partnerkin.com/services/yandexgpt)
364. [yandex.cloud/ru/docs/foundation-models/pricing](https://yandex.cloud/ru/docs/foundation-models/pricing)
365. [axima-ai.ru](https://axima-ai.ru/guides/yandexgpt-alice-ai-razbor-2026/)
366. [itsnew.ru](https://itsnew.ru/stati/kak-integrirovat-alisu-ai-v-svoyo-prilozhenie-poshagovoe-rukovodstvo-dlja-razrabotchikov.html)
367. [yandex.cloud/ru/docs/ai-studio/pricing](https://yandex.cloud/ru/docs/ai-studio/pricing)
368. [Hosting Kitchen](https://hosting.kitchen/blog/yandex-cloud/page2)
369. [habr.com/ru/companies/x-com/articles/1035500](https://habr.com/ru/companies/x-com/articles/1035500/)
370. [developers.sber.ru, «Тарифы GigaChat API для юрлиц»](https://developers.sber.ru/docs/ru/gigachat/tariffs/legal-tariffs)
371. [quasa.io](https://quasa.io/ru/media/yandexgpt-ili-gigachat-api-chto-vybrat-biznesu-dlya-tekstov-dokumentov-i-chat-bota)
372. [developers.sber.ru/docs/ru/gigachat/api/legal-postpaid](https://developers.sber.ru/docs/ru/gigachat/api/legal-postpaid)
373. [individual-tariffs](https://developers.sber.ru/docs/ru/gigachat/tariffs/individual-tariffs)
374. [anthropic.com/supported-countries](https://www.anthropic.com/supported-countries)
375. [help.openai.com/articles/5347006](https://help.openai.com/articles/5347006)
376. [The Decoder](https://the-decoder.com/openai-to-restrict-api-access-for-unsupported-countries-in-july/)
377. [Caixin](https://www.caixinglobal.com/2024-06-26/openai-enforces-harsher-api-restrictions-on-unsupported-countries-102209858.html)
378. [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)
379. [toolfox.ru](https://toolfox.ru/services/s/openrouter/alternatives)
380. [habr.com/ru/articles/887772](https://habr.com/ru/articles/887772)
381. [habr.com/ru/articles/825374](https://habr.com/ru/articles/825374)
382. [aistudio.yandex.ru/docs/ru/speechkit/pricing.html](https://aistudio.yandex.ru/docs/ru/speechkit/pricing.html)
383. [aistudio.yandex.ru/ru/docs/speechkit/pricing](https://aistudio.yandex.ru/ru/docs/speechkit/pricing)
384. [cloud.yandex.ru/docs/speechkit/pricing-archive](https://cloud.yandex.ru/docs/speechkit/pricing-archive/pricing-01012019)
385. [SpeakFlow](https://blog.speakflow.ru/blog/chto-umeet-sber-salutespeech-i-skolko-stoit-raspoznavanie-rechi)
386. [toolfox.ru/services/s/tinkoff-voicekit](https://toolfox.ru/services/s/tinkoff-voicekit)
387. [voximplant.com/pricing](https://voximplant.com/pricing)
388. [occ-group.ru](https://occ-group.ru/blog/skolko-stoit-golosovoy-bot-dlya-vhodyaschih-zvonkov-v-2026-godu)
389. [mango-office.ru/shop/virtual_number](https://www.mango-office.ru/shop/virtual_number/)
390. [mango-office.ru/tariffs/numbers](https://www.mango-office.ru/tariffs/numbers/)
391. [krasnodar.mango-office.ru/products/virtualnaya_ats/price](https://krasnodar.mango-office.ru/products/virtualnaya_ats/price/)
392. [mango-office.ru/tariffs/connection](https://www.mango-office.ru/tariffs/connection/)
393. [novofon.com/tariffs/standart](https://novofon.com/tariffs/standart/)
394. [novofon.com/tariffs/corporation](https://novofon.com/tariffs/corporation/)
395. [novofon.com/prices](https://novofon.com/prices/)
396. [exolve.ru/tariffs](https://exolve.ru/tariffs/)
397. [exolve.ru/products/virtualnaya-ats/virtualnyy-nomer-dlya-biznesa](https://exolve.ru/products/virtualnaya-ats/virtualnyy-nomer-dlya-biznesa/)
398. [exolve.ru/tariffs/api/voice](https://exolve.ru/tariffs/api/voice/)
399. [telphin.ru/products/virtual-numbers](https://www.telphin.ru/products/virtual-numbers)
400. [computerra.ru/357497](https://www.computerra.ru/357497/biznes-vozvrashhaetsya-k-telefonii-sravnivaem-6-virtualnyh-ats-s-tsenami/)
401. [softadvisor.ru/service/sipuni](https://softadvisor.ru/service/sipuni)
402. [integrus.ru](https://integrus.ru/blog/internet-marketing-decisions/oblachnaya-telefoniya-supuni)
403. [cashruflow.ru/telephony/sipuni](https://cashruflow.ru/telephony/sipuni)
404. [moskva.beeline.ru/business/partners/partnerskaja-programma/cloud-ats](https://moskva.beeline.ru/business/partners/partnerskaja-programma/cloud-ats/)
405. [beeline.ru/business/telephony/cloud-ats](https://moskva.beeline.ru/business/telephony/cloud-ats/)
406. [uiscom.ru/vozmozhnosti/virtualnaya-ats](https://www.uiscom.ru/vozmozhnosti/virtualnaya-ats/)
407. [omsk.uiscom.ru](https://omsk.uiscom.ru/producty/virtualnaya-ats/)
408. [quasa.io](https://quasa.io/ru/media/virtualnaya-ats-uis)
409. [integrus.ru](https://integrus.ru/blog/internet-marketing-decisions/oblachnaya-telefoniya-uis)
410. [static.voximplant.com/pricing_ru_b24.pdf](https://static.voximplant.com/pricing_ru_b24.pdf)
411. [qna.habr.com/q/964047](https://qna.habr.com/q/964047)
412. [free-hosting.ru/timeweb-cloud](https://free-hosting.ru/timeweb-cloud/)
413. [vpsindex.ru/provider/timeweb](https://vpsindex.ru/provider/timeweb)
414. [timeweb.cloud/services/vds-vps](https://timeweb.cloud/services/vds-vps)
415. [vpscan.keepware.ru/hosters/timeweb](https://vpscan.keepware.ru/hosters/timeweb)
416. [hostinghub.ru/beget](https://hostinghub.ru/beget)
417. [vpsindex.ru/provider/beget](https://vpsindex.ru/provider/beget)
418. [hosting.country](https://hosting.country/companies/beget-com/virtualnye-servery)
419. [vpsindex.ru/provider/firstvds](https://vpsindex.ru/provider/firstvds)
420. [zettabyte.ru](https://zettabyte.ru/providers/firstvds-ru/)
421. [vpsradar.ru](https://vpsradar.ru/firstvds)
422. [vpsindex.ru/provider/selectel](https://vpsindex.ru/provider/selectel)
423. [nix-admin.ru](https://nix-admin.ru/selectel/vs-cloud-ru/)
424. [zettabyte.ru](https://zettabyte.ru/providers/selectel-ru/)
425. [selectel.ru/prices](https://selectel.ru/prices/)
426. [hostpulse.ru](https://hostpulse.ru/obzory/yandexcloud/)
427. [toolfox.ru](https://toolfox.ru/services/s/yandex-cloud)
428. [yandex.cloud/en/services/compute](https://yandex.cloud/en/services/compute)
429. [storage.yandexcloud.net, Тарифы_Yandex_Cloud_RU.pdf](https://storage.yandexcloud.net/cloud-www-assets/blog-assets/ru/posts/2025/11/vat-changes-ru-2025/%D0%A2%D0%B0%D1%80%D0%B8%D1%84%D1%8B_Yandex_%D0%A1loud_RU.pdf)
430. [toolfox.ru/services/s/beeline-cloud-ats](https://toolfox.ru/services/s/beeline-cloud-ats)
431. [vpsindex.ru](https://vpsindex.ru/tarify)

### Юридическое

432. [Гарант, 152-ФЗ](https://base.garant.ru/12148567/)
433. [КонсультантПлюс, 152-ФЗ](https://www.consultant.ru/document/cons_doc_LAW_61801/)
434. [Гарант, консультация «Необходимость получения согласия… при поручении обработки третьему лицу»](https://www.garant.ru/consult/business/1751744/)
435. [КонсультантПлюс, ст. 9 152-ФЗ](https://www.consultant.ru/document/cons_doc_LAW_61801/6c94959bc017ac80140621762d2ac59f6006b08c/)
436. [Гарант, ст. 9](https://base.garant.ru/12148567/493aff9450b0b89b29b367693300b74a/)
437. [Гарант, «С 1 сентября согласие… нужно оформлять отдельно»](https://www.garant.ru/news/1850806/)
438. [Гарант, «Согласие… с 1 сентября 2025 года: новые правила оформления и штрафы до 700 тыс. руб.»](https://www.garant.ru/article/1862510/)
439. [Бухэксперт8](https://buhexpert8.ru/1s-buhgalteriya/kadry-i-zarabotnaya-plata/kadrovye-dokumenty/s-1-sentyabrya-2025-oformlyajte-soglasie-na-obrabotku-persdannyh-otdelnym-dokumentom.html)
440. [Harant](https://harant.ru/blog/internet-pravo/chto-izmenilos-s-1-sentyabrya-2025-goda-v-oblasti-personalnyh-dannyh-dlya-onlajn-biznesa/)
441. [Гарант, «Энциклопедия решений. Условия обработки ПДн (октябрь 2026)»](https://base.garant.ru/58073909/)
442. [pd.rkn.gov.ru](https://pd.rkn.gov.ru/)
443. [письмо РКН (pravo.ppt.ru)](https://pravo.ppt.ru/pismo/roskomnadzor/n-08-80975-270489)
444. [Buh.ru, «Уведомление в Роскомнадзор: кто обязан подавать…»](https://buh.ru/articles/uvedomlenie-v-roskomnadzor-kto-i-zachem-obyazan-sdavat-kak-pravilno-oformit-i-kakie-oshibki-mozhno-d.html)
445. [Timeweb, инструкция](https://timeweb.com/ru/blog/authors/timeweb/articles/uvedomlenie-v-roskomnadzor-o-personalnyh-dannyh/)
446. [КонсультантПлюс, ст. 13.11 КоАП](https://www.consultant.ru/document/cons_doc_LAW_34661/1f421640c6775ff67079ebde06a7d2f6d17b96db/)
447. [Гарант, обзор](https://www.garant.ru/article/1746375/)
448. [Buh.ru, «С 30 мая штраф за нарушение срока подачи уведомления… до 300 000 рублей»](https://buh.ru/news/s-30-maya-shtraf-za-narushenie-sroka-podachi-uvedomleniya-v-roskomnadzor-sostavit-do-300-000-rubley.html)
449. [Retail.ru](https://www.retail.ru/news/s-30-maya-shtraf-za-narushenie-sroka-podachi-uvedomleniya-v-roskomnadzor-sostavi-14-maya-2025-264569/)
450. [Advant Beiten, newsletter](https://www.advant-beiten.com/fileadmin/beiten/Newsletter/Newsletter_Russia_Personal_Data_Localisation_Requirements_Will_Be_Tightened_RUS.pdf)
451. [Stonebridge Legal, alert](https://www.stonebridgelegal.ru/media/files/Alert_Izmenenie-pravil-lokalizacii-dannyh.pdf)
452. [РБК Компании, «Новые требования к обработке ПДн: гайд на 2026»](https://companies.rbc.ru/news/SZRjtRsMIn/novyie-trebovaniya-k-obrabotke-personalnyih-dannyih-polnyij-gajd-na-2026-god/)
453. [КонсультантПлюс, подборка «Штраф за локализацию ПДн»](https://www.consultant.ru/law/podborki/shtraf_za_lokalizaciyu_personalnyh_dannyh/)
454. [Callibri, обзор](https://callibri.ru/blog/shtrafy-za-personalnye-dannye-2025)
455. [письмо РКН (pravo.ppt.ru)](https://pravo.ppt.ru/pismo/roskomnadzor/n-08vm-107716-274863)
456. [1С:ИТС, разъяснения госорганов](https://its.1c.ru/db/content/newsclar/src/482555.htm)
457. [текст ст. 12 (legalacts.ru)](https://legalacts.ru/doc/152_FZ-o-personalnyh-dannyh/glava-2/statja-12/)
458. [V2B, «Трансграничная передача ПДн»](https://www.v2b.ru/articles/transgranichnaya-peredacha-personalnyh-dannyh/)
459. [Совкомбанк Журнал](https://journal.sovcombank.ru/biznesu/transgranicnaia-peredaca-personalnyx-dannyx)
460. [Harant, вопрос о стоматологической клинике](https://harant.ru/questions/q-109940/)
461. [mos.ru](https://www.mos.ru/news/item/102658073/)
462. [vc.ru, «Как собирать персональные данные в чат-ботах и не нарушать закон»](https://vc.ru/marketing/1917760-sbor-personalnykh-dannykh-v-chat-botakh)
463. [SecRadar](https://secradar.ru/komplaens/pdn/shtrafy-za-utechku/)
464. [КонсультантПлюс, 323-ФЗ](https://www.consultant.ru/document/cons_doc_LAW_121895/)
465. [КонсультантПлюс, обзор «С 30 мая 2025 года значительно ужесточена ответственность…»](https://www.consultant.ru/document/cons_doc_LAW_490308/3b904c06ca00c18b687ec94295a0a967ddc5cce7/)
466. [Гарант, «С 30 мая возрастут штрафы…»](https://www.garant.ru/news/1816746/)
467. [КонсультантПлюс, «Опубликован закон об оборотных штрафах…»](https://www.consultant.ru/law/hotdocs/87300.html)
468. [Гарант, ст. 13.11 КоАП](https://base.garant.ru/12125267/b369434ee740927935cc6f0a04242543/)
469. [Sostav](https://www.sostav.ru/blogs/288385/81682)
470. [Cisoclub](https://cisoclub.ru/oborotnye-shtrafy-za-utechku-personalnyh-dannyh-skolko-za-chto-i-kak-snizit-risk)
471. [Гарант, «В России назначены первые штрафы за крупные утечки ПДн»](https://www.garant.ru/news/2026629/)
472. [ppt.ru, обзор 421-ФЗ](https://ppt.ru/obzory/vstupaet-v-silu/federalnyy-zakon-30-11-2024-421-fz)
473. [1С:ИТС](https://its.1c.ru/db/content/newscomm/src/492344.htm)
474. [Anti-Malware.ru](https://www.anti-malware.ru/news/2026-01-13-114534/48667)
475. [Pravo.ru, «On the Record: когда суд примет во внимание аудиозапись?»](https://pravo.ru/review/view/137811/)
476. [ppt.ru, новость](https://ppt.ru/news/138148)
477. [ppt.ru, «Аудиозапись разговоров без согласия собеседника»](https://ppt.ru/art/personal-data/audiozapis-razgovorov-telefonnykh-i-lichnykh-bez-soglasiya-sobesednika)
478. [КонсультантПлюс](https://www.consultant.ru/law/podborki/audiozapis_bez_soglasiya/)
479. [V2B](https://www.v2b.ru/articles/chto-takoe-biometricheskie-dannye-i-kak-s-nimi-rabotat/)
480. [SecurityLab, автор — участник подготовки разъяснения](https://www.securitylab.ru/blog/personal/emeliyannikov/32583.php)
481. [Harant](https://harant.ru/questions/q-160801/)
482. [Buh.ru, «Миллион за спам»](https://buh.ru/articles/shtrafy-za-spam-kak-biznes-nakazhut-za-nedobrosovestnuyu-reklamu.html)
483. [Spmag](https://spmag.ru/news/za-navyazchivuyu-reklamu-po-telefonu-oshtrafuyut-na-million-rublej)
484. [VitVet, ч. 4.1 ст. 14.3](https://vitvet.com/articles/koap/sostavy/shtraf-spam-zvonki-sms-14-3-ch4-1/)
485. [ФАС, pdf](https://fas.gov.ru/news/6781/export_to_file.pdf)
486. [Парламентская газета, текст](https://www.pnp.ru/law/2025/04/01/federalnyy-zakon-41-fz.html)
487. [ppt.ru, обзор](https://ppt.ru/obzory/vstupaet-v-silu/federalnyy-zakon-01-04-2025-41-fz)
488. [Контур.Экстерн](https://www.kontur-extern.ru/info/56934-zakon_o_protivodejstvii_kibermoshennikam)
489. [Гарант, новость](https://www.garant.ru/news/1820251/)
490. [Sostav](https://www.sostav.ru/blogs/275971/63053)
491. [официальный сайт г. Нальчика, разъяснение](https://xn----7sbablnnmsiu1dzd9c.xn--p1ai/2025/05/22/dlja-protivodejstvija-telefonnomu-moshennichestvu/)
492. [ComNews](https://www.comnews.ru/content/245752/2026-06-09/2026-w24/1009/gosduma-prinyala-paket-zakonov-borbe-kibermoshennikami)
493. [Диванный IT, разбор законопроекта](https://dyvannyi-it.ru/antofrod-1110676-8/)
494. [Interfax](https://www.interfax.ru/russia/1098610)
495. [Pravo.ru](https://pravo.ru/news/264452/)
496. [СберБизнес](https://sberbusiness.live/publications/antifrod-2-0)
497. [Cisoclub](https://cisoclub.ru/putin-podpisal-zakon-antifrod-2-s-limitom-v-20-bankovskih-kart-i-zapretom-mezhdunarodnyh-zvonkov)
498. [CNews](https://gov.cnews.ru/news/top/2026-05-29_deputaty_utverdili_vtoroj)
499. [Telesputnik](https://telesputnik.ru/materials/gov/news/gosduma-utverdila-paket-antifrod-20-i-uze-gotovit-tretii)
500. [Click.ru](https://blog.click.ru/markirovka-reklamy/markirovka-zvonkov-i-zapret-zarubezhnyx-messendzherov/)
501. [РБК, 10.02.2026](https://www.rbc.ru/technology_and_media/10/02/2026/698b21a39a79473017a3cb4a)
502. [РБК, «Роскомнадзор начнет ограничение работы Telegram»](https://www.rbc.ru/technology_and_media/10/02/2026/698afe729a79470c08a17b91)
503. [Интерфакс](https://www.interfax.ru/digital/1072012)
504. [Коммерсантъ](https://www.kommersant.ru/doc/8420462)
505. [РБК, 17.02.2026](https://www.rbc.ru/technology_and_media/17/02/2026/69942e849a7947f5560a652b)
506. [РБК, 30.07.2026](https://amp.rbc.ru/rbcnews/technology_and_media/30/07/2026/6a6b16639a7947f36a2b0e63)
507. [РБК](https://www.rbc.ru/life/news/6968d7a29a79479a3cf5d78c)
508. [Albato, блог](https://blog.albato.ru/whatsapp-dlya-biznesa-2026-blokirovka-alternativy/)
509. [Википедия, «Частичная блокировка Telegram и WhatsApp в России»](https://ru.wikipedia.org/wiki/%D0%A7%D0%B0%D1%81%D1%82%D0%B8%D1%87%D0%BD%D0%B0%D1%8F_%D0%B1%D0%BB%D0%BE%D0%BA%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0_Telegram_%D0%B8_WhatsApp_%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8)
510. [MenToday, 20.10.2026](https://www.mentoday.ru/life/news/20-10-2026/byudjetnye-milliardy-v-pesok-zablokirovannye-whatsapp-i-telegram-snova-nachali-rasti-v-rossii/)
511. [TAdviser](https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%91%D0%BB%D0%BE%D0%BA%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0_Telegram_%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8)
512. [PPC.world](https://ppc.world/news/biznes-smozhet-integrirovat-svoi-servisy-v-max-cherez-platformu-dlya-partnerov/)
513. [Т-Банк Секреты](https://secrets.tbank.ru/novosti/biznes-v-max/)
514. [Sostav, «Как бизнесу работать в MAX»](https://www.sostav.ru/blogs/250077/84090)
515. [Infostart, «Чат-бот для MAX»](https://infostart.ru/public/2645614/)
516. [iPhones.ru](https://www.iphones.ru/1379456)
517. [BFM](https://www.bfm.ru/news/587719)
518. [Sostav, «Маркировка рекламы в 2026 году»](https://www.sostav.ru/blogs/239662/55258)
519. [vc.ru](https://vc.ru/id5657117/2772540-markirovka-internet-reklamy-2026)
520. [Sostav, «Штрафы за ошибки в маркировке»](https://www.sostav.ru/blogs/285528/85619)
521. [ppt.ru](https://ppt.ru/art/shtrafi/kakie-shtrafy-predusmotreny-za-otsutstvie-markirovki-reklamy)
522. [VitVet](https://vitvet.com/articles/koap/otrasli/reklama-v-internete-narusheniya-shtraf-2026/)
523. [Интерфакс](https://www.interfax.ru/digital/1078702)
524. [CNews, 19.03.2026](https://www.cnews.ru/news/top/2026-03-19_pri_ispolzovanii_ii-kontenta)
525. [Коммерсантъ](https://www.kommersant.ru/doc/8515349)
526. [Pravo.ru, «Правительство отредактировало законопроект о регулировании ИИ»](https://pravo.ru/news/264296/)
527. [Pravo.ru, «Госдума приняла закон об искусственном интеллекте»](https://pravo.ru/news/264625/)
528. [AdIndex, 11.06.2026](https://adindex.ru/news/right/2026/06/11/345832.phtml)
529. [RB.ru](https://rb.ru/news/gosduma-prinyala-zakon-o-regulirovanii-ii-markirovka-nejrosetevogo-kontenta-mozhet-stat-obyazatelnoj/)
530. [Ermolina & Partners](https://ermolinapartners.com/tpost/a57v2kspn1-obyazatelnaya-markirovka-ii-kontenta)
531. [Рамблер](https://news.rambler.ru/tech/56925496-v-gosdumu-vnesen-zakonoproekt-o-markirovke-ii-kontenta/)
532. [Spmag, «Самозанятый может разрабатывать и продавать ПО»](https://spmag.ru/news/samozanyatyy-mozhet-razrabatyvat-i-prodavat-po)
533. [Самозанятые.рф, договор с программистом](https://xn--80aapgyievp4gwb.xn--p1ai/blog/kb/contracts/dogovor-s-samozanyatym-programmistom)
534. [Контур.Эльба, ограничения НПД](https://kontur.ru/elba/spravka/81251-ogranicheniya_i_zaprety_dlya_samozanyatyh)
535. [Sostav, «Кто не может быть самозанятым»](https://www.sostav.ru/blogs/282131/72156)

### Привлечение клиентов и экосистема Краснодара

536. [vc.ru, «ТОП-4 места, где мы с учениками находим клиентов на боты»](https://vc.ru/marketing/2186801-gde-nayti-klientov-na-boty-top-4-sposoba)
537. [vc.ru, «Где я нашел первого клиента»](https://vc.ru/life/1639905-gde-ya-nashel-pervogo-klienta)
538. [AiBotManager.ru, «Первый проект по ИИ: стратегия поиска клиентов [2026]»](https://aibotmanager.ru/kak-najti-proekt-avtomatizacii/)
539. [ИдеиPRO, «Микроагентство AI-автоматизации»](https://ideipro.ru/mikroagentstvo-ai-avtomatizatsii-biznes-ideya-2026-s-raschyotom/)
540. [страница «Форум Цифровая эволюция 2026: почему…» (ЮгСпецСети)](https://xn--c1aeam6alcj7a5e.xn--p1ai/news/tpost/mb524v1gl1-forum-tsifrovaya-evolyutsiya-2026-pochem)
541. [picktech.ru](https://picktech.ru/blog/expert-opinion/ii-assistenty-dlya-biznesa/)
542. [ipetrov.pro](https://ipetrov.pro/blog/reyting-ii-assistentov)
543. [komanda.ai](https://komanda.ai/)
544. [sostav.ru](https://www.sostav.ru/blogs/291020/105615)
545. [workspace.ru/krasnodar/ai-and-neural-networks](https://workspace.ru/krasnodar/ai-and-neural-networks/)
546. [workspace.ru, Digital Sector](https://workspace.ru/contractors/digital-sector/articles/)
547. [vc.ru, «ИИ для бизнеса — где он окупается, а где сжигает бюджет»](https://vc.ru/money/3022664-ii-dlya-biznesa-gde-prinosit-pribyl)
548. [vc.ru, «ИИ-администратор для клиник. Как увеличить количество записей на 15–30% за 3 месяца»](https://vc.ru/ai/2715636-ii-administrator-dlya-klinik-uvelichenie-zapisei)
549. [syntera.pro](https://syntera.pro)
550. [zvonobot.ru/ai-robot-dlya-mediciny](https://zvonobot.ru/ai-robot-dlya-mediciny)
551. [Сетка (setka.ru)](https://setka.ru/posts/01954180-2a23-497b-9ed2-3f60591fb193)
552. [carrotquest.io](https://www.carrotquest.io/blog/telegram-bot-case-good-night-show/)
553. [nextbot.ru](http://nextbot.ru/cases/yuridicheskie-kompanii/administrator-kliniki/)
554. [Admin AI](https://adminai.tech/dlya/salon-krasoty)
555. [handbox.by](https://handbox.by/blog/kejs-xolodnaya-rassyilka-v-b2b-segmente-kotoraya-prinesla-45-lidov)
556. [vc.ru](https://vc.ru/marketing/833069-derzkaya-holodnaya-rassylka-s-konversiei-20-kak-my-sdelali-3-prodazhi-v-krupnye-b2b-kompanii)
557. [vc.ru](https://vc.ru/marketing/805623-tozhe-dumaete-chto-konversiya-10-s-holodnyh-rassylok-v-b2b-prodazhah-eto-chto-to-nerealnoe-derzhite-keis-s-136)
558. [uniseller.io](https://uniseller.io/blog/kholodnye-pisma-b2b-1000-pisem-2-kontrakta/)
559. [zvonobot.ru/blog/robot-vs-call-tsentr](https://zvonobot.ru/blog/robot-vs-call-tsentr/)
560. [vc.ru, «Бот для стоматологии»](https://vc.ru/ai/2722964-bot-dlya-stomatologii)
561. [e-vito.ru](https://e-vito.ru/skolko-stoit-prodvizhenie-sajtov-na-avito-i-kak-ne-slit-byudzhet/)
562. [e-vito.ru](https://e-vito.ru/platnoe-prodvizhenie-uslug-na-avito-skolko-stoit-i-chto-dayot/)
563. [magnetto.pro](https://magnetto.pro/media/article/tarify-i-stoimost-razmeshcheniia-obiavlenii-na-avito-platnye-pakety-i-premium/)
564. [vk.ru, «Размещение и продвижение объявлений Авито — тарифы и цены»](https://vk.ru/@sdelki_easy_prodazha_reklama-razmeschenie-i-prodvizhenie-obyavlenii-avito-tarify-i-ceny)
565. [Авито Гид](https://avito-guide.ru/articles/a/av/avito-skolko.html)
566. [Aviboost, «Авитолог в Краснодаре 2026»](https://aviboost.ru/blog/avitolog-v-krasnodare)
567. [help.profi.ru, «Тариф Отклик»](https://help.profi.ru/ru/articles/3590909-%D1%82%D0%B0%D1%80%D0%B8%D1%84-%D0%BE%D1%82%D0%BA%D0%BB%D0%B8%D0%BA)
568. [profi.ru/registration](https://profi.ru/registration/)
569. [helmepro.ru](https://helmepro.ru/stati/profi-ru-dlya-ispolniteley/)
570. [t-j.ru](https://t-j.ru/profi-ru-dlia-repetitorstva/)
571. [profi.ru/geo-ksdr](https://profi.ru/geo-ksdr/it_freelance/reklama-v-2gis/)
572. [static.2gis.com](https://static.2gis.com/files/price/2gis_price_ru_legal_minsk_032026.pdf)
573. [Girafffe](https://girafffe.ru/materials/kak-razmestit-reklamu-v-2gis/)
574. [Ingate](https://ingate.ru/blog/reklama-v-2gis-kak-zapustit-i-nastroit/)
575. [Pixel Plus](https://pixelplus.ru/context/geomediynaya-reklama/v-2gis/)
576. [Texterra](https://texterra.ru/blog/cpc-cpm-ctr-na-raznykh-reklamnykh-ploshchadkakh.html)
577. [eLama](https://elama.ru/blog/stoimost-klika-v-yandeks-direkte/)
578. [Demis](https://www.demis.ru/articles/skolko-stoit-klik-v-yandeks-direkt/)
579. [MediaContext](https://mediacontext.pro/blog/reklama-yandeks-stoimost)
580. [Ingate](https://ingate.ru/blog/cena-klika-v-yandeks-direkte/)
581. [Brainbox](https://brainbox-marketing.ru/blog/skolko-stoit-klient-iz-direkta-kalkulyator/)
582. [promokod-biznes.ru](https://promokod-biznes.ru/blog/yandex-biznes-tarify/)
583. [eLama](https://elama.ru/blog/reklama-dlya-nebolshoy-kompanii-bez-bolshih-byudzhetov-i-glubokih-znaniy-podklyuchaem-reklamnuyu-podpisku-yandeks-biznesa/)
584. [ezdelo (цены на 01.10.2026)](https://ezdelo.ru/service/yandeks-biznes)
585. [DAS](https://das-agency.ru/blog/novye-tarify-yandex-biznesa)
586. [yclients.ru/marketplace](https://www.yclients.ru/marketplace)
587. [support.yclients.ru — что нужно сделать партнёру, чтобы виджет появился у клиентов](https://support.yclients.ru/67-767-770--chto-nuzhno-sdelat-partneru-chtoby-vidzhet-rasshireniya-poyavilsya-u-klientov/)
588. [Wahelp — создание интеграции через маркетплейс](https://wahelp.ru/faq/yclients/marketplace_Yclients/)
589. [support.yclients.ru](https://support.yclients.ru/67-68-195--kak-sms-agregatoru-popast-v-marketplejs-yclients/)
590. [support.dikidi.net, «Партнерская программа: простая формула заработка»](https://support.dikidi.net/ru/knowledge-bases/4/articles/1128-partnerskaya-programma-prostaya-formula-zarabotka)
591. [support.dikidi.net, «Зарабатывайте вместе с DIKIDI»](https://support.dikidi.net/ru/knowledge-bases/4/articles/1371-zarabatyivajte-vmeste-s-dikidi-partnerskaya-programma)
592. [partners24.1c-bitrix.ru](https://partners24.1c-bitrix.ru/)
593. [eLama, подборка партнёрских программ для digital-агентств](https://elama.ru/blog/podborka-partnerskie-programmy-dlya-digital-agentstv/)
594. [vc.ru](https://vc.ru/marketing/291067-kak-direktologu-zarabatyvat-na-30-bolshe-obzor-partnerskih-programm-dlya-specialistov-po-kontekstnoi-reklame)
595. [Эвотор Жиза, «Лучшие партнёрские программы для бизнеса в 2026 году»](https://zhiza.evotor.ru/luchshie-partnyorskie-programmy-dlya-biznesa/)
596. [tilda.cc/ru/answers/a/referrals](https://tilda.cc/ru/answers/a/referrals/)
597. [experts.tilda.cc](https://experts.tilda.cc/ru/)
598. [блог apsolyamov.ru, 28.02.2026](https://apsolyamov.ru/blog/razrabotka_sajta_na_tilda_kak_ispolzovat_tilda_experts_i_made_on_tilda_dlja_vybora_podrjadchika/2026-02-28-652)
599. [Новости IT-канала](https://www.novostiitkanala.ru/news/detail.php?ID=192475)
600. [CNews, 12.08.2026](https://www.cnews.ru/news/line/2026-08-12_yandex_b2b_tech_obyavlyaet_finansovye)
601. [Cloud4Y](https://www.cloud4y.ru/blog/cloud-partner-programs-2026/)
602. [Lenta.ru](https://lenta.ru/news/2026/04/17/sber-zapustil-partnerskuyu-programmu-dlya-integratorov-gigachat-enterprise/)
603. [EastRussia](https://www.eastrussia.ru/news/sber-zapuskaet-partnerskuyu-programmu-dlya-integratorov-gigachat-enterprise-gigachat-biznes/)
604. [sendpulse.com/ru/partners/agency](https://sendpulse.com/ru/partners/agency)
605. [ycloud.com](https://www.ycloud.com/ru/affiliate-partner-program)
606. [Timeweb Community](https://timeweb.com/ru/community/articles/kak-veb-studii-i-agentstvu-zarabatyvat-na-partnerskih-programmah-crm-analitiki-i-telefonii)
607. [Инвестиционный портал Краснодарского края](https://investkuban.ru/invest/supportkuban/uno-fond-razvitiya-biznesa-krasnodarskogo-kraya/)
608. [moibiz93.ru/cpp](https://moibiz93.ru/cpp/)
609. [mbkuban.ru/contacts](https://mbkuban.ru/contacts/)
610. [moibiz93.ru/contacts/municipalities](https://moibiz93.ru/contacts/municipalities/)
611. [moibiz93.ru](https://moibiz93.ru/)
612. [moibiz93.ru/events/meropriyatiya](https://moibiz93.ru/events/meropriyatiya/)
613. [mbkuban.ru/cpp/consultations](https://mbkuban.ru/cpp/consultations/)
614. [mbkuban.ru/cpp/services](http://www.mbkuban.ru/cpp/services/)
615. [do.krd.ru/node/2749](https://do.krd.ru/node/2749)
616. [moibizforum.ru](https://moibizforum.ru/)
617. [kgkr.ru](https://kgkr.ru/news/besplatnyj-onlajn-kurs-dlya-predprinimatelej-krasnodarskogo-kraya/)
618. [Кубань 24](https://kuban24.tv/item/uslugami-tsentra-moj-biznes-s-nachala-goda-vospolzovalis-bolee-9-tys-kubantsev)
619. [opora.ru, Краснодарский край, новости](https://www.opora.ru/regionalnoe-razvitie/yuzhnyy-fo/krasnodarskiy-kray/novosti/)
620. [oporakubani.ru](https://oporakubani.ru/)
621. [opora.ru](https://opora.ru/regionalnoe-razvitie/yuzhnyy-fo/krasnodarskiy-kray/)
622. [kuban.tpprf.ru, план работы](https://kuban.tpprf.ru/ru/plan-raboty-tpp-krasnodarskogo-kraya/)
623. [события](https://kuban.tpprf.ru/ru/events/)
624. [kuban.tpprf.ru](https://kuban.tpprf.ru/ru/)
625. [all-events.ru, Краснодар](https://all-events.ru/events/calendar/city-is-krasnodar/)
626. [ict2go.ru/regions/Krasnodar](https://ict2go.ru/regions/Krasnodar/)
627. [hightime.media](https://hightime.media/it-conferences/ai/)
628. [анонс на mbkaliningrad.ru](https://mbkaliningrad.ru/news/52239/)
629. [bizbiz.space/forum_krasnodar](https://bizbiz.space/forum_krasnodar)
630. [iqarium.ru/conference26](https://iqarium.ru/conference26)
631. [Hexlet/ru-local-communities](https://github.com/Hexlet/ru-local-communities)
632. [krasnodar-digital.ru](https://krasnodar-digital.ru/)
633. [networkly.app/event/krasnodar](https://networkly.app/event/krasnodar)
634. [tgstat.ru](https://tgstat.ru/en/ratings/chats/business?sort=mau)
635. [t.me/+hkp1WVCi2bowNmYy](https://t.me/+hkp1WVCi2bowNmYy)
636. [net-work.tilda.ws](http://net-work.tilda.ws/network)
637. [telegid.me](https://telegid.me/catalog/russia/krasnodar)
638. [networkers.pro](https://networkers.pro/tproduct/1-582473545252-telegram-chat-krasnodar)
639. [страница в Facebook](https://www.facebook.com/people/%D0%9D%D0%9F-%D0%A1%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F-%D0%B0%D1%81%D1%81%D0%BE%D1%86%D0%B8%D0%B0%D1%86%D0%B8%D1%8F-%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE-%D0%BA%D1%80%D0%B0%D1%8F/100067101895391/)
640. [kubanstom.ru](http://kubanstom.ru/about/dejatelnost/)
641. [lidrekon.ru](https://lidrekon.ru/rno/202189)
642. [D-Russia](https://d-russia.ru/mincifry-objavilo-o-starte-prodazh-rossijskogo-po-so-skidkoj-50-dlja-malogo-i-srednego-biznesa.html)
643. [RB.ru](https://rb.ru/news/msp-po-skidka/)
644. [Корпорация МСП](https://corpmsp.ru/about/press/news/novosti-korporatsii/na_tsifrovoy_platforme_msp_rf_poyavilas_vozmozhnost_zakazat_programmnoe_obespechenie_s_50_protsentno/)
645. [Контур](https://kontur.ru/articles/25703-gosprogrammy_podderzhki_malogo_biznesa)
646. [СберБизнес](https://sberbusiness.live/publications/podderzhka-malogo-biznesa)
647. [МойСклад](https://www.moysklad.ru/msp/?amp=&amp=&amp=&q=rfrit-site)
648. [mbkuban.ru](https://mbkuban.ru/)
649. [SmallBusiness.ru, «Краснодарский край — 2026»](https://smallbusiness.ru/library/krasnodarskii_krai__2026_obzor_mer_podderzhki_dlya_malogo_i_srednego_biznesa.html)
650. [openbudget23region.ru](https://openbudget23region.ru/index.php?option=com_attachments&task=download&id=1285)
651. [goodstartup.ru](https://goodstartup.ru/start-ai)
652. [БГТУ «ВОЕНМЕХ»](https://voenmeh.ru/nachalo-priema-zayavok-na-konkurs-start-ii-ot-fonda-sodejstviya-innovacziyam/)
653. [unicornroad.ru](https://unicornroad.ru/grant/fsi/tpost/4czinjyh61-start-ii-1)
654. [fondnid.ru](https://fondnid.ru/conkursi/konkurs-start-1-0)
655. [vnesenie-v-reestr.ru](https://vnesenie-v-reestr.ru/start)
656. [sostav.ru](https://www.sostav.ru/blogs/290928/91352)
657. [Хабр](https://habr.com/ru/articles/987984/)
658. [UkraNews](https://ukranews.com/news/1181343-boty-vmesto-lyudej-i-navyazchivye-dopolnitelnye-prodazhi-ukraintsy-nazvali-glavnye-razdrazhiteli-v)
659. [SmartBot Pro](https://www.smartbotpro.ru/blog/avtomatizaciya-prodazh-kak-ne-poteryat-klientov-posle-vnedreniya)
660. [Blaber](https://blaber.ai/pochemu-ii-boty-otpugivayut-klientov/)
661. [Реплика](https://thereplica.ru/blog/pochemu-klienty-ne-lyubyat-botov)
662. [CRMAI](https://crmai.kz/blog/chatbot-mify-strahi-realnost)
663. [TenChat, «Практический кейс: голосовой AI-ассистент для стоматологии»](https://tenchat.ru/media/5163560-prakticheskiy-keys-kak-my-zapustili-golosovogo-aiassistenta-dlya-stomatologii)
664. [BotSeller](https://botseller.ai/blog/kak-prodavat-chat-botov-partnyorskaya-model)
665. [vc.ru, «ИИ-агенты в малом бизнесе: что реально работает в июле 2026»](https://vc.ru/biznesiinnovacii/3017901-ii-agenty-v-malom-biznese-chto-realno-rabotayet)
666. [vc.ru, «ИИ-агенты для бизнеса в 2026: 30 инструментов»](https://vc.ru/ai/3024826-ii-agenty-dlya-biznesa-instrumenty-avtomatizatsii)
667. [spark.ru, «Почему чат-боты не будут работать в продажах и что их заменит в 2026 году»](https://spark.ru/startup/integra-cloud/blog/284861/pochemu-chat-boti-ne-budut-rabotat-v-prodazhah-i-chto-ih-zamenit-v-2026-godu)
