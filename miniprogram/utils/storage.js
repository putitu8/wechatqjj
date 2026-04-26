/**
 * Thin wrapper around wx.*StorageSync with optional TTL and FIFO list ops.
 * Storage shape: { value: <T>, expiresAt: <number|null> }
 */
function set(key, value, ttlMs) {
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  wx.setStorageSync(key, { value, expiresAt });
}

function get(key) {
  const raw = wx.getStorageSync(key);
  if (!raw || typeof raw !== 'object') return null;
  if (raw.expiresAt && raw.expiresAt < Date.now()) {
    wx.removeStorageSync(key);
    return null;
  }
  return raw.value === undefined ? null : raw.value;
}

function clear(key) {
  wx.removeStorageSync(key);
}

function append(key, item, cap) {
  const list = get(key) || [];
  list.push(item);
  while (list.length > cap) list.shift();
  set(key, list);
}

function getAll(key) {
  return get(key) || [];
}

module.exports = { set, get, clear, append, getAll };
