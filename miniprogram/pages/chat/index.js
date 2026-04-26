const matcher = require('../../ai/matcher');
const library = require('../../ai/script-library');
const persona = require('../../ai/persona');
const storage = require('../../utils/storage');

Page({
  data: {
    messages: [],
    draft: '',
    canSend: false,
    suggestions: ['杭州治水', '东坡肉怎么做', '与子由的关系'],
    suggestionsVisible: false,
    _zeroHits: 0,
    _fallbackIdx: 0
  },

  onLoad(query) {
    const history = storage.getAll('aiHistory');
    if (history.length === 0) {
      this._appendSu('幸会幸会。某苏轼，眉山人，熙宁四年初至杭州为通判。');
    } else {
      this.setData({ messages: history });
    }
    if (query.topic) {
      setTimeout(() => this._sendUser(`请说说${query.topic}`), 400);
    }
  },

  onInput(e) {
    const draft = e.detail.value;
    this.setData({ draft, canSend: draft.trim().length > 0 });
  },

  onSend() {
    const text = this.data.draft.trim();
    if (!text) return;
    this._sendUser(text);
    this.setData({ draft: '', canSend: false });
  },

  onChip(e) {
    this._sendUser(e.currentTarget.dataset.text);
    this.setData({ suggestionsVisible: false });
  },

  _sendUser(text) {
    this._appendMsg({ role: 'me', text });
    const r = matcher.match(text, library, persona, { fallbackIndex: this.data._fallbackIdx });
    if (r.qaId === null) {
      const z = this.data._zeroHits + 1;
      this.setData({ _zeroHits: z, _fallbackIdx: this.data._fallbackIdx + 1, suggestionsVisible: z >= 3 });
    } else {
      this.setData({ _zeroHits: 0, suggestionsVisible: false });
    }
    this._typeOut(r.answer);
  },

  _appendSu(text) { this._appendMsg({ role: 'su', text }); },
  _appendMsg(msg) {
    const id = Date.now() + Math.random();
    const messages = [...this.data.messages, { ...msg, id }];
    this.setData({ messages });
    storage.append('aiHistory', { ...msg, id }, 50);
  },

  _typeOut(fullText) {
    const id = Date.now();
    const messages = [...this.data.messages, { role: 'su', text: '', id }];
    this.setData({ messages });
    let i = 0;
    const tick = () => {
      i++;
      messages[messages.length - 1].text = fullText.slice(0, i);
      this.setData({ messages: [...messages] });
      if (i < fullText.length) setTimeout(tick, 60);
      else storage.append('aiHistory', { role: 'su', text: fullText, id }, 50);
    };
    tick();
  }
});
