const data = require('../../../data/dishes');

Page({
  data: { dish: null },
  onLoad(q) {
    const dish = data.byId(q.id);
    if (!dish) return wx.navigateBack();
    wx.setNavigationBarTitle({ title: dish.name });
    this.setData({ dish });
  }
});
