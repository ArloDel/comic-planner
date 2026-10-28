import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumberInput, parseNumberInput } from '../src/lib/format.ts';

test('formatNumberInput', async (t) => {
  await t.test('memformat angka mentah ke format ribuan dengan pemisah titik', () => {
    assert.equal(formatNumberInput('500000'), '500.000');
    assert.equal(formatNumberInput(500000), '500.000');
    assert.equal(formatNumberInput('1250000'), '1.250.000');
    assert.equal(formatNumberInput(1250000), '1.250.000');
  });

  await t.test('menghilangkan karakter non-digit saat memformat', () => {
    assert.equal(formatNumberInput('500.000'), '500.000');
    assert.equal(formatNumberInput('Rp 750.000'), '750.000');
    assert.equal(formatNumberInput('abc 123 def 456'), '123.456');
  });

  await t.test('mengembalikan string kosong untuk nilai kosong atau invalid', () => {
    assert.equal(formatNumberInput(''), '');
    assert.equal(formatNumberInput(null), '');
    assert.equal(formatNumberInput(undefined), '');
    assert.equal(formatNumberInput('abc'), '');
  });
});

test('parseNumberInput', async (t) => {
  await t.test('mengubah string berformat ribuan menjadi integer murni', () => {
    assert.equal(parseNumberInput('500.000'), 500000);
    assert.equal(parseNumberInput('1.250.000'), 1250000);
    assert.equal(parseNumberInput('Rp 75.000'), 75000);
  });

  await t.test('menangani input number atau string tanpa pemisah', () => {
    assert.equal(parseNumberInput(500000), 500000);
    assert.equal(parseNumberInput('500000'), 500000);
    assert.equal(parseNumberInput(12500.75), 12501);
  });

  await t.test('mengembalikan 0 untuk nilai kosong atau invalid', () => {
    assert.equal(parseNumberInput(''), 0);
    assert.equal(parseNumberInput(null), 0);
    assert.equal(parseNumberInput(undefined), 0);
    assert.equal(parseNumberInput('abc'), 0);
  });
});
