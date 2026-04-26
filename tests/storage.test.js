beforeEach(() => {
  const store = {};
  global.wx = {
    setStorageSync: (k, v) => { store[k] = JSON.stringify(v); },
    getStorageSync: (k) => store[k] ? JSON.parse(store[k]) : '',
    removeStorageSync: (k) => { delete store[k]; }
  };
  jest.resetModules();
});

describe('storage', () => {
  test('set then get returns value', () => {
    const { set, get } = require('../miniprogram/utils/storage');
    set('user', { name: '苏小姐' });
    expect(get('user')).toEqual({ name: '苏小姐' });
  });

  test('returns null when key missing', () => {
    const { get } = require('../miniprogram/utils/storage');
    expect(get('missing')).toBeNull();
  });

  test('TTL expires correctly', () => {
    const { set, get } = require('../miniprogram/utils/storage');
    const realNow = Date.now;
    Date.now = () => 1000;
    set('temp', 'v', 100);
    Date.now = () => 1099;
    expect(get('temp')).toBe('v');
    Date.now = () => 1101;
    expect(get('temp')).toBeNull();
    Date.now = realNow;
  });

  test('clear removes the key', () => {
    const { set, get, clear } = require('../miniprogram/utils/storage');
    set('user', { x: 1 });
    clear('user');
    expect(get('user')).toBeNull();
  });

  test('append + getAll for FIFO list with cap', () => {
    const { append, getAll } = require('../miniprogram/utils/storage');
    for (let i = 0; i < 55; i++) append('hist', { i }, 50);
    const all = getAll('hist');
    expect(all.length).toBe(50);
    expect(all[0].i).toBe(5);
    expect(all[49].i).toBe(54);
  });
});
