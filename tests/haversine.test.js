const { distanceMeters } = require('../miniprogram/utils/haversine');

describe('haversine distanceMeters', () => {
  test('zero distance for identical points', () => {
    expect(distanceMeters(30.245, 120.155, 30.245, 120.155)).toBe(0);
  });

  test('~111 km for one degree latitude', () => {
    const d = distanceMeters(30, 120, 31, 120);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  test('~96 km for one degree longitude at lat 30', () => {
    const d = distanceMeters(30, 120, 30, 121);
    expect(d).toBeGreaterThan(95000);
    expect(d).toBeLessThan(97000);
  });

  test('rounds to integer meters', () => {
    const d = distanceMeters(30.245, 120.155, 30.246, 120.156);
    expect(Number.isInteger(d)).toBe(true);
  });

  test('100m known fixture: youmeitang to nearby point', () => {
    const d = distanceMeters(30.246, 120.156, 30.247, 120.157);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(160);
  });
});
