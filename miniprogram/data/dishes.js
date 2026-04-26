/**
 * 7 Su Dongpo invented or favorite dishes.
 * Each: id, name, anecdote, quote (东坡 own words), iconAsset (path filled in Task 8.1).
 */
const dishes = {
  dongporou:    { id: 'dongporou',    name: '东坡肉',       anecdote: '徐州抗洪后，百姓送猪肉劳军，东坡分回赠之，成名菜。', quote: '净洗铛，少著水，柴头罨烟焰不起。待他自熟莫催他，火候足时他自美。', iconAsset: '' },
  dongpogeng:   { id: 'dongpogeng',   name: '东坡羹',       anecdote: '贬谪黄州时自创素羹，不用鱼肉，菜叶豆腐为主。', quote: '不用鱼肉五味，有自然之甘。',                                              iconAsset: '' },
  kaoyangji:    { id: 'kaoyangji',    name: '烤羊脊骨',     anecdote: '惠州贬居，肉贵难得，独取脊骨剔肉烤食。', quote: '剔尽骨肉，意犹未尽，如食蟹螯。',                                          iconAsset: '' },
  weiyu:        { id: 'weiyu',        name: '雪天煨芋',     anecdote: '儋州雪夜，与友煨芋夜话。', quote: '香似龙涎仍酽白，味如牛乳更全清。',                                                  iconAsset: '' },
  jugeng:       { id: 'jugeng',       name: '菊羹',         anecdote: '岭南秋食野菊，煮以为羹。', quote: '秋来煮以羹，亦自有清香。',                                                          iconAsset: '' },
  kaoshenghao:  { id: 'kaoshenghao',  name: '烤生蚝',       anecdote: '儋州海味，东坡书云勿告北方士大夫，恐争来分食。', quote: '食之甚美，未始有也。',                                            iconAsset: '' },
  miju:         { id: 'miju',         name: '蜜酒',         anecdote: '黄州自酿蜜酒，赠友尝之。', quote: '一日小醉，一日大醉，便快活。',                                                      iconAsset: '' }
};

module.exports = Object.freeze({
  dishes,
  all: Object.values(dishes),
  byId: (id) => dishes[id] || null
});
