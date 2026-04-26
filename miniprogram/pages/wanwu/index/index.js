const data = require('../../../data/dishes');

Page({
  data: { dishes: [] },
  onLoad() {
    const dishes = data.all.map(d => ({
      ...d,
      shortQuote: d.quote.length > 12 ? d.quote.slice(0, 12) + '…' : d.quote,
      shortAnecdote: d.anecdote.length > 14 ? d.anecdote.slice(0, 14) + '…' : d.anecdote
    }));
    this.setData({ dishes });
  },
  onTap(e) { wx.navigateTo({ url: `/pages/wanwu/detail/index?id=${e.currentTarget.dataset.id}` }); }
});
