function call(name, data = {}, attempt = 0) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data })
      .then(({ result }) => resolve(result))
      .catch((err) => {
        if (attempt >= 2) return reject(err);
        const delay = [1000, 2000, 4000][attempt];
        setTimeout(() => call(name, data, attempt + 1).then(resolve, reject), delay);
      });
  });
}
module.exports = { call };
