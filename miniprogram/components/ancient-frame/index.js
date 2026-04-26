Component({
  options: { multipleSlots: true },
  properties: {
    text:        { type: String, value: '' },
    size:        { type: String, value: 'md' },
    clickable:   { type: Boolean, value: false },
    cornerMark:  { type: Boolean, value: true },
    seal:        { type: Boolean, value: false },
    ariaLabel:   { type: String, value: '' }
  },
  methods: {
    onTap() {
      if (this.data.clickable) this.triggerEvent('tap');
    }
  }
});
