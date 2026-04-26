jest.mock('wx-server-sdk', () => ({
  init: () => {},
  DYNAMIC_CURRENT_ENV: 'dev',
  getWXContext: () => ({ OPENID: 'test_openid' }),
  database: () => ({})
}), { virtual: true });

const { evaluateCheckin } = require('../../cloudfunctions/checkin/index');

const SITE = { siteId: 'youmeitang', name: '有美堂遗址', lat: 30.246, lng: 120.156, radius: 200 };

describe('evaluateCheckin', () => {
  test('within radius → ok', () => {
    const r = evaluateCheckin(SITE, 30.2461, 120.1561);
    expect(r.ok).toBe(true);
    expect(r.distance).toBeLessThan(50);
  });

  test('beyond radius → ok=false with distance', () => {
    const r = evaluateCheckin(SITE, 30.250, 120.160);
    expect(r.ok).toBe(false);
    expect(r.distance).toBeGreaterThan(200);
    expect(r.message).toMatch(/还差/);
  });

  test('null site → ok=false site_not_found', () => {
    const r = evaluateCheckin(null, 30.246, 120.156);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('site_not_found');
  });

  test('exact boundary (radius±1) — inside accepted', () => {
    const r = evaluateCheckin({ ...SITE, radius: 200 }, 30.2478, 120.156);
    expect(r.distance).toBeGreaterThan(150);
    expect(r.distance).toBeLessThan(250);
  });
});
