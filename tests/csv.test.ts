import { describe, it, expect } from 'vitest';
import { parseCsv, parseCsvTable, toBool, toInt } from '../src/lib/csv-base';
import { parseImport } from '../src/lib/csv';
import { SOURCES } from '../src/lib/types';

const HEADER =
  'name,email,country,source,profile_url,platforms,us_years,english,rating,hours,timezone_overlap,ai_tools,skills,notes';

describe('parseCsv 基座', () => {
  it('引号内逗号与 CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y",2\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', '2'],
    ]);
  });
  it('转义引号', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });
});

describe('parseImport 表头别名与建模', () => {
  const csv =
    HEADER +
    '\n' +
    'Angela Cruz,angela.cruz@gmail.com,PH,OnlineJobs.ph,https://www.onlinejobs.ph/jobseekers/88421,"tiktok,instagram",3,fluent,96,40,5,true,"CapCut,文案写作",高优 TikTok 运营';

  it('建模并自动分级', () => {
    let n = 0;
    const r = parseImport(csv, SOURCES, () => 'L' + String(++n).padStart(3, '0'));
    expect(r.total).toBe(1);
    expect(r.invalid).toBe(0);
    const l = r.leads[0];
    expect(l.name).toBe('Angela Cruz');
    expect(l.country).toBe('PH');
    expect(l.platforms).toEqual(['tiktok', 'instagram']);
    expect(l.ai_tools).toBe(1);
    expect(l.skills).toEqual(['CapCut', '文案写作']);
    expect(l.tier).toBe('S');
    expect(l.score).toBeGreaterThanOrEqual(85);
  });

  it('国家码与中文国名可识别', () => {
    const r = parseImport(HEADER + '\nKemi B,k@b.com,NG,X (Twitter),,"tiktok,x",2,native,88,25,4,1,,', SOURCES, () => 'L900');
    expect(r.leads[0].country).toBe('NG');
    const r2 = parseImport(HEADER + '\nKemi B,k2@b.com,尼日利亚,X (Twitter),,"tiktok,x",2,native,88,25,4,1,,', SOURCES, () => 'L901');
    expect(r2.leads[0].country).toBe('NG');
  });

  it('全空行在解析层过滤；有内容但无名无邮箱计为无效', () => {
    const r = parseImport(HEADER + '\n,,,,,,,,,,,,,\n,,"","",,,,,,,,,仅备注', SOURCES, () => 'L902');
    expect(r.invalid).toBe(1);
    expect(r.leads.length).toBe(0);
  });

  it('中文表头别名可用', () => {
    const r = parseImport('姓名,邮箱,国家\nJuan D,j@d.com,PH', SOURCES, () => 'L903');
    expect(r.leads[0].name).toBe('Juan D');
    expect(r.leads[0].country).toBe('PH');
  });
});

describe('类型转换', () => {
  it('toBool', () => {
    expect(toBool('yes')).toBe(true);
    expect(toBool('0')).toBe(false);
  });
  it('toInt 兜底', () => {
    expect(toInt('42')).toBe(42);
    expect(toInt('x', 7)).toBe(7);
  });
});
