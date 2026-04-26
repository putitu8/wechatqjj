const { tokenize, match } = require('../miniprogram/ai/matcher');

const LIB = [
  { id: 'q1', keywords: ['杭州', '治水', '苏堤'], answer: '熙宁四年至杭，疏浚西湖，筑苏堤六桥。' },
  { id: 'q2', keywords: ['美食', '东坡肉', '肉'],  answer: '净洗铛，少著水，柴头罨烟焰不起。' },
  { id: 'q3', keywords: ['弟弟', '苏辙', '兄弟'], answer: '与子由别多聚少，但愿人长久。' }
];
const PERSONA = ['某苏轼，眉山人，未明阁下所问。', '阁下不妨试问杭州、美食、家人之事。'];

describe('tokenize', () => {
  test('CJK character-level split', () => {
    expect(tokenize('杭州治水')).toEqual(expect.arrayContaining(['杭', '州', '治', '水', '杭州', '治水']));
  });

  test('handles punctuation and spaces', () => {
    const t = tokenize('  你好，杭州！  ');
    expect(t).toContain('杭州');
    expect(t).not.toContain(' ');
    expect(t).not.toContain('，');
  });

  test('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('match', () => {
  test('hits highest-scoring entry', () => {
    const r = match('请问东坡先生在杭州治水有何功绩', LIB, PERSONA);
    expect(r.qaId).toBe('q1');
    expect(r.score).toBeGreaterThan(0);
    expect(r.answer).toContain('苏堤');
  });

  test('zero hits falls back to persona', () => {
    const r = match('请问明日上海天气如何', LIB, PERSONA);
    expect(r.qaId).toBeNull();
    expect(r.score).toBe(0);
    expect(PERSONA).toContain(r.answer);
  });

  test('rotates persona on repeated zero-hits', () => {
    const r1 = match('aaaa', LIB, PERSONA, { fallbackIndex: 0 });
    const r2 = match('bbbb', LIB, PERSONA, { fallbackIndex: 1 });
    expect(r1.answer).not.toBe(r2.answer);
  });

  test('tie-break: first entry wins on equal score', () => {
    const lib = [
      { id: 'a', keywords: ['杭州'], answer: 'A' },
      { id: 'b', keywords: ['杭州'], answer: 'B' }
    ];
    const r = match('杭州', lib, PERSONA);
    expect(r.qaId).toBe('a');
  });

  test('empty query returns persona', () => {
    const r = match('', LIB, PERSONA);
    expect(r.qaId).toBeNull();
  });
});
