// Тест сборки PDF: из «страниц-картинок» получается правильный файл PDF
// (заголовок, объекты, таблица смещений xref, конец файла).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const PDF = require('../pdf.js');

function fakeJpeg(n) {
  // Содержимое картинки для проверки структуры не важно — нужны только байты.
  return Uint8Array.from({ length: 200 + n * 10 }, (_, i) => (i * 7 + n) % 256);
}

test('PDF из двух страниц: заголовок, страницы, таблица смещений', () => {
  const bytes = PDF.assemblePdf([
    { width: 1191, height: 1684, bytes: fakeJpeg(1) },
    { width: 1191, height: 1684, bytes: fakeJpeg(2) }
  ], { title: 'Смета на материалы' });
  assert.ok(bytes instanceof Uint8Array);
  const text = Buffer.from(bytes).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.'), 'начало файла');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'конец файла');
  assert.ok(/\/Type\s*\/Pages[\s\S]*?\/Count\s+2/.test(text), 'две страницы');
  assert.equal((text.match(/\/Subtype\s*\/Image/g) || []).length, 2, 'по картинке на страницу');
  assert.ok(text.includes('/MediaBox [0 0 595.28 841.89]') || /\/MediaBox\s*\[\s*0 0 595\.28 841\.89\s*\]/.test(text), 'формат A4');

  // таблица xref: каждое смещение указывает ровно на «N 0 obj»
  const startxref = Number(/startxref\s+(\d+)/.exec(text)[1]);
  assert.ok(text.slice(startxref).startsWith('xref'), 'startxref указывает на таблицу');
  const head = /xref\s+0\s+(\d+)\s+/.exec(text.slice(startxref));
  const size = Number(head[1]);
  const entries = text.slice(startxref + head[0].length).split(/\r?\n/).slice(0, size);
  for (let i = 1; i < size; i++) {
    const offset = Number(entries[i].slice(0, 10));
    assert.ok(text.slice(offset).startsWith(i + ' 0 obj'), 'объект ' + i + ' по смещению ' + offset);
  }
});

test('пустой список страниц — ошибка; в Node рисование недоступно', async () => {
  assert.throws(() => PDF.assemblePdf([]));
  await assert.rejects(PDF.build({ title: 'x' }));
});
