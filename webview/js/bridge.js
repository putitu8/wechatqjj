window._bridgeAction = (act, siteId) => {
  if (typeof wx === 'undefined' || !wx.miniProgram) {
    alert('当前不在小程序环境中');
    return;
  }
  const sites = window._sitesData || [];
  const site = sites.find(s => s.siteId === siteId);

  if (act === 'ask') {
    const topic = site ? site.name : '';
    wx.miniProgram.navigateTo({ url: `/pages/chat/index?topic=${encodeURIComponent(topic)}` });
  } else if (act === 'checkin') {
    wx.miniProgram.navigateTo({ url: `/pages/mingren/detail/index?siteId=${siteId}&autoCheckin=1` });
  }

  wx.miniProgram.postMessage({ data: { type: 'drawer-action', act, siteId } });
};
