/**
 * Three complete Su Shi poems referenced in the MVP.
 * Source: spec §appendix A (2026-04-26-wechat-su-dongpo-design.md).
 */
const poems = {
  'youmeitang-baoyu': {
    id: 'youmeitang-baoyu',
    title: '有美堂暴雨',
    siteId: 'youmeitang',
    lines: [
      '游人脚底一声雷，满座顽云拨不开。',
      '天外黑风吹海立，浙东飞雨过江来。',
      '十分潋滟金樽凸，千杖敲铿羯鼓催。',
      '唤起谪仙泉洒面，倒倾鲛室泻琼瑰。'
    ],
    note: '熙宁六年（1073）作于杭州有美堂，暴雨忽至，气象壮阔。'
  },
  'liuyiquan': {
    id: 'liuyiquan',
    title: '次韵聪上人见寄',
    siteId: 'liuyiquan',
    lines: [
      '前身本同社，法乳遍诸方。',
      '一钵寄何处，千峰来故乡。',
      '云门大不二，铁壁自难忘。',
      '但恐他年别，空留六一泉。'
    ],
    note: '与僧友聪公唱和之作，六一泉为欧阳修号「六一居士」纪念泉。'
  },
  'guoxiting': {
    id: 'guoxiting',
    title: '过溪亭',
    siteId: 'guoxiting',
    lines: [
      '身轻步稳去忘归，四柱亭前野彴微。',
      '忽悟过溪还一笑，水禽惊落翠毛衣。'
    ],
    note: '杭州山行小品，野趣盎然。'
  }
};

module.exports = Object.freeze({
  poems,
  all: Object.values(poems),
  byId: (id) => poems[id] || null
});
