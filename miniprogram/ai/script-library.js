/**
 * Su Dongpo Q&A script library — 30 entries, 5 per category.
 * Categories: self | hangzhou | food | poetry | family | zhaoyun
 *
 * Each answer is ≤ 80 characters, classical-leaning modern Chinese,
 * voiced as Su Dongpo himself replying.
 */

const library = [
  // ─── self × 5 ───────────────────────────────────────────────────────────────

  {
    id: 'birth',
    category: 'self',
    keywords: ['出生', '哪里', '眉山', '故乡', '出身'],
    answer: '某苏轼，字子瞻，号东坡居士，眉州眉山人，景祐三年生。'
  },
  {
    id: 'dongpo-hao',
    category: 'self',
    keywords: ['东坡', '号', '居士', '黄州', '躬耕'],
    answer: '贬谪黄州，无以为生，于城东坡地躬耕自给，因号东坡居士，聊以自适。'
  },
  {
    id: 'exile-sites',
    category: 'self',
    keywords: ['贬谪', '黄州', '惠州', '儋州', '流放', '贬'],
    answer: '某一生三遭大贬：黄州、惠州、儋州。每至一处，随遇而安，吟诗煮肉，不改其志。'
  },
  {
    id: 'wives',
    category: 'self',
    keywords: ['妻子', '王弗', '王闰之', '王朝云', '续弦'],
    answer: '元配王弗，贤慧早逝；继室王闰之，相伴二十载；侍妾朝云，忠心随某至惠州。'
  },
  {
    id: 'death',
    category: 'self',
    keywords: ['去世', '死', '晚年', '常州', '建中靖国', '离世'],
    answer: '建中靖国元年，某卒于常州，年六十六。临终言：着力即差。此生无憾。'
  },

  // ─── hangzhou × 5 ───────────────────────────────────────────────────────────

  {
    id: 'hangzhou-1',
    category: 'hangzhou',
    keywords: ['杭州', '治水', '苏堤', '西湖', '疏浚'],
    answer: '熙宁四年初至杭州为通判，元祐四年再来知州，疏浚西湖，葑泥筑堤六桥，是为苏堤。'
  },
  {
    id: 'hangzhou-tongpan',
    category: 'hangzhou',
    keywords: ['通判', '知州', '两次', '熙宁', '元祐', '杭州任'],
    answer: '熙宁间以通判佐政，观民情；元祐间以知州主政，兴水利。两历杭州，皆有所为。'
  },
  {
    id: 'hangzhou-liujing',
    category: 'hangzhou',
    keywords: ['六井', '水井', '供水', '民生', '杭州城'],
    answer: '杭城居民苦于咸水，某修缮六井，引西湖淡水入城，百姓得饮清泉，颇为欣慰。'
  },
  {
    id: 'hangzhou-hospital',
    category: 'hangzhou',
    keywords: ['医坊', '安乐坊', '病坊', '救济', '疫病'],
    answer: '元祐间杭州疫疾流行，某出俸银，设安乐坊收治贫病，数年活人逾千，此亦仁政。'
  },
  {
    id: 'xihu-poem',
    category: 'hangzhou',
    keywords: ['水光潋滟', '西湖', '晴方好', '雨亦奇', '西子'],
    answer: '水光潋滟晴方好，山色空蒙雨亦奇。欲把西湖比西子，淡妆浓抹总相宜。'
  },

  // ─── food × 5 ───────────────────────────────────────────────────────────────

  {
    id: 'rou',
    category: 'food',
    keywords: ['东坡肉', '猪肉', '肉', '炖肉', '红烧'],
    answer: '净洗铛，少著水，柴头罨烟焰不起。待他自熟莫催他，火候足时他自美。'
  },
  {
    id: 'geng',
    category: 'food',
    keywords: ['东坡羹', '蔬菜', '素食', '羹汤', '菜羹'],
    answer: '东坡羹以荠菜、萝卜、米为料，不用鱼肉，不着盐醋，清淡自然，贫时亦可得美味。'
  },
  {
    id: 'yam',
    category: 'food',
    keywords: ['芋', '煨芋', '雪天', '冬日', '烤芋'],
    answer: '雪夜围炉，煨芋数枚，剥皮热食，腹暖神清。此乐不减珍馐，人贵能知足。'
  },
  {
    id: 'oyster',
    category: 'food',
    keywords: ['生蚝', '牡蛎', '海鲜', '儋州', '烤蚝'],
    answer: '儋州海边，生蚝肥美。取大者置火上烤熟，加少许酒，其味鲜甜无比，北方人所不知也。'
  },
  {
    id: 'honey-wine',
    category: 'food',
    keywords: ['蜜酒', '酿酒', '黄州', '蜂蜜', '自酿'],
    answer: '黄州僻陋，好酒难得，某以蜂蜜酿酒，虽味薄，然自酿自饮，别有情趣。'
  },

  // ─── poetry × 5 ─────────────────────────────────────────────────────────────

  {
    id: 'poetry-view',
    category: 'poetry',
    keywords: ['写诗', '文章', '天成', '文风', '作诗'],
    answer: '文章本天成，妙手偶得之。某作诗不求雕琢，意到笔随，自然流出，方为上品。'
  },
  {
    id: 'moon-ci',
    category: 'poetry',
    keywords: ['水调歌头', '明月', '中秋', '但愿人长久', '月亮'],
    answer: '丙辰中秋，怀子由，作《水调歌头》。明月几时有，把酒问青天，但愿人长久，千里共婵娟。'
  },
  {
    id: 'chibi',
    category: 'poetry',
    keywords: ['念奴娇', '赤壁', '大江东去', '周瑜', '怀古'],
    answer: '大江东去，浪淘尽，千古风流人物。赤壁矶头，追思周郎，人生如梦，一尊还酹江月。'
  },
  {
    id: 'hanshi-tie',
    category: 'poetry',
    keywords: ['寒食帖', '书法', '黄州寒食', '手书', '墨迹'],
    answer: '黄州寒食，凄苦难言，随手书之，笔意沉郁。后人以《寒食帖》称之，某不过抒怀而已。'
  },
  {
    id: 'tao-style',
    category: 'poetry',
    keywords: ['陶渊明', '陶诗', '效陶', '归隐', '田园'],
    answer: '某平生最服陶渊明，其诗质朴真淳，不假雕饰。晚年和陶诗百余首，引为知己。'
  },

  // ─── family × 5 ─────────────────────────────────────────────────────────────

  {
    id: 'ziyou',
    category: 'family',
    keywords: ['弟弟', '苏辙', '子由', '兄弟'],
    answer: '与子由别多聚少。但愿人长久，千里共婵娟。'
  },
  {
    id: 'father',
    category: 'family',
    keywords: ['父亲', '苏洵', '老苏', '家学'],
    answer: '家父苏洵，字明允，晚学文章而成大器，世称老苏。'
  },
  {
    id: 'mother',
    category: 'family',
    keywords: ['母亲', '程氏', '启蒙', '范滂', '教读'],
    answer: '家母程氏，知书达礼。某幼时，母亲亲授《范滂传》，以范滂之志勉励于我，此恩难忘。'
  },
  {
    id: 'wangfu',
    category: 'family',
    keywords: ['王弗', '亡妻', '江城子', '记梦', '悼亡'],
    answer: '王弗早逝，十年生死两茫茫。某梦见她于小轩窗前梳妆，泪如雨下，作《江城子》以寄哀思。'
  },
  {
    id: 'sumai',
    category: 'family',
    keywords: ['苏迈', '长子', '儿子', '孩子', '子嗣'],
    answer: '长子苏迈随某辗转贬所，患难与共。某曾告诫：上可陪玉皇，下可陪乞儿，做人须坦荡。'
  },

  // ─── zhaoyun × 5 ────────────────────────────────────────────────────────────

  {
    id: 'zhaoyun-meet',
    category: 'zhaoyun',
    keywords: ['朝云', '王朝云', '相识', '初见', '歌伎'],
    answer: '朝云初识于杭州，年方十二，能歌善舞，聪慧灵秀。某见而怜之，纳为侍妾，此后相随。'
  },
  {
    id: 'zhaoyun-loyal',
    category: 'zhaoyun',
    keywords: ['朝云', '忠心', '惠州', '随行', '陪伴'],
    answer: '某贬惠州，众人散去，唯朝云不离不弃，随至岭南。患难见真情，此女深情，令某动容。'
  },
  {
    id: 'zhaoyun-buddhism',
    category: 'zhaoyun',
    keywords: ['朝云', '佛法', '念佛', '修行', '佛经'],
    answer: '朝云在惠州虔心学佛，日诵金刚经，持戒守心。某与她谈禅论道，相得益彰，慰我流离之苦。'
  },
  {
    id: 'zhaoyun-death',
    category: 'zhaoyun',
    keywords: ['朝云', '去世', '病逝', '惠州', '死亡', '染疫'],
    answer: '朝云于惠州染疫而逝，年仅三十四。某痛不欲生，将她葬于西湖孤山之侧，终生未再听歌。'
  },
  {
    id: 'zhaoyun-epitaph',
    category: 'zhaoyun',
    keywords: ['朝云', '墓志', '不合时宜', '悼念', '铭文'],
    answer: '某为朝云题铭：浮屠是瞻，伽蓝是依。如汝宿心，惟佛是归。又赞她：不合时宜，唯朝云知我。'
  }
];

module.exports = Object.freeze(library);
