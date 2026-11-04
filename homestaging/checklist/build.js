#!/usr/bin/env node
/*
 * Сборка PDF из checklist.html.
 *
 *   node homestaging/checklist/build.js
 *
 * 1. Читает блок настроек (BRAND_NAME, CONTACT_*) из комментария в начале
 *    checklist.html и подставляет значения в страницу. Пустые контакты
 *    не выводятся.
 * 2. Расставляет неразрывные пробелы (после коротких слов, перед тире,
 *    между числом и словом), чтобы предлоги не висели в конце строки.
 * 3. Печатает страницу в checklist.pdf (A4, размеры и поля — из @page).
 * 4. Предупреждает, если текст какого-то листа не помещается на страницу.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const DIR = __dirname;
const SRC = path.join(DIR, 'checklist.html');
const OUT = path.join(DIR, 'checklist.pdf');
const TITLE = 'Чек-лист: подготовка квартиры к фотосъёмке';

function readSettings(html) {
  const block = html.match(/<!--([\s\S]*?)-->/);
  const settings = {};
  if (!block) return settings;
  const re = /^[ \t]*(BRAND_NAME|CONTACT_[A-Z]+)[ \t]*:[ \t]*(.*?)[ \t]*$/gm;
  let m;
  while ((m = re.exec(block[1])) !== null) settings[m[1]] = m[2];
  return settings;
}

function contactLinks(s) {
  const out = [];
  const phone = s.CONTACT_PHONE;
  if (phone) out.push({ key: 'phone', text: phone, href: 'tel:' + phone.replace(/[^\d+]/g, '') });
  const email = s.CONTACT_EMAIL;
  if (email) out.push({ key: 'email', text: email, href: 'mailto:' + email });
  const site = s.CONTACT_SITE;
  if (site) {
    out.push({
      key: 'site',
      text: site.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      href: /^https?:\/\//.test(site) ? site : 'https://' + site,
    });
  }
  const tg = s.CONTACT_TELEGRAM;
  if (tg) {
    const name = tg.replace(/^https?:\/\//, '').replace(/^(t\.me|telegram\.me)\//, '').replace(/^@/, '');
    out.push({ key: 'telegram', text: 'Telegram: @' + name, href: 'https://t.me/' + name });
  }
  return out;
}

async function main() {
  const html = fs.readFileSync(SRC, 'utf8');
  const settings = readSettings(html);
  const brand = settings.BRAND_NAME || '';
  const contacts = contactLinks(settings);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: 'print' });
    await page.goto(pathToFileURL(SRC).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const overflow = await page.evaluate(({ brand, contacts, title }) => {
      // Название и контакты
      if (brand) {
        document.querySelectorAll('[data-brand]').forEach((el) => { el.textContent = brand; });
        document.title = `${title} — ${brand}`;
      }
      for (const c of contacts) {
        const el = document.querySelector(`[data-contact="${c.key}"]`);
        if (!el) continue;
        el.textContent = c.text;
        el.setAttribute('href', c.href);
      }

      // Неразрывные пробелы в тексте страницы (контакты не трогаем)
      const NB = ' ';
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest('style, script, svg, [data-contact]')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        let t = node.nodeValue;
        t = t.replace(/ +— /g, NB + '— ');                       // тире не переносится в начало строки
        t = t.replace(/(\d) +(?=[А-Яа-яЁё])/g, '$1' + NB);         // «3–5 дней»
        let prev;
        do {                                                       // «в шкаф», «и на кухне»
          prev = t;
          t = t.replace(/(^|[\s«(„ ])([А-Яа-яЁё]{1,2}) +(?=\S)/g, '$1$2' + NB);
        } while (t !== prev);
        node.nodeValue = t;
      }

      // Проверка: помещается ли каждый лист на свою страницу
      return [...document.querySelectorAll('.sheet')]
        .map((s, i) => ({ page: i + 1, over: s.scrollHeight - s.clientHeight }))
        .filter((r) => r.over > 1);
    }, { brand, contacts, title: TITLE });

    await page.pdf({
      path: OUT,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    const pdf = fs.readFileSync(OUT, 'latin1');
    const pages = (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    console.log(`Готово: ${path.relative(process.cwd(), OUT) || OUT} — страниц: ${pages}`);
    console.log(contacts.length
      ? `Контакты в подвале: ${contacts.map((c) => c.text).join(', ')}`
      : 'Контакты не заполнены — в подвале только название и описание.');
    for (const o of overflow) {
      console.warn(`ВНИМАНИЕ: лист ${o.page} не помещается на страницу (лишние ~${Math.round(o.over)} px). Сократите текст.`);
    }
    if (overflow.length) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
