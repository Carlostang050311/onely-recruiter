import { describe, it, expect } from 'vitest';
import { parseCsv, parseCsvTable, toBool, toEnglishScore, toInt } from '../src/lib/csv';

describe('parseCsv', () => {
  it('解析基本行', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('处理引号内逗号', () => {
    expect(parseCsv('name,loc\n"Kyla Santos","Quezon City, PH"')).toEqual([
      ['name', 'loc'],
      ['Kyla Santos', 'Quezon City, PH'],
    ]);
  });

  it('处理转义引号', () => {
    expect(parseCsv('a\n"say ""hi"" ok"')).toEqual([['a'], ['say "hi" ok']]);
  });

  it('处理 CRLF 与 BOM', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('处理引号内换行', () => {
    expect(parseCsv('a,b\n"x\ny",2')).toEqual([
      ['a', 'b'],
      ['x\ny', '2'],
    ]);
  });

  it('跳过空行', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCsvTable', () => {
  it('表头归一并产出对象', () => {
    const t = parseCsvTable(' First_Name ,Email\nKyla, k@x.com ');
    expect(t.headers).toEqual(['first_name', 'email']);
    expect(t.rows).toEqual([{ first_name: 'Kyla', email: 'k@x.com' }]);
  });

  it('全空行被跳过', () => {
    const t = parseCsvTable('a,b\n,\n1,2');
    expect(t.rows.length).toBe(1);
  });
});

describe('类型转换', () => {
  it('toBool 识别常见真值', () => {
    for (const v of ['1', 'true', 'YES', 'y', '√', '是', true, 1]) expect(toBool(v)).toBe(true);
    for (const v of ['0', 'false', 'no', '', null, undefined, 0]) expect(toBool(v)).toBe(false);
  });

  it('english_sample 钳制到 0-25', () => {
    expect(toEnglishScore('30')).toBe(25);
    expect(toEnglishScore('-3')).toBe(0);
    expect(toEnglishScore('18')).toBe(18);
    expect(toEnglishScore('abc')).toBe(0);
  });

  it('toInt 带兜底', () => {
    expect(toInt('42')).toBe(42);
    expect(toInt('x', 7)).toBe(7);
  });
});
