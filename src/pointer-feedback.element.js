const $STYLES = `
  <style>
    :host {
      display: block;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
      z-index: -1;
      contain: layout;
      --pointer-feedback_accent-color: hsl(0,0%,80%);
      --pointer-feedback_scale-speed: 300ms;
      --pointer-feedback_transparency-speed: 200ms;
    }

    :host::before {
      position: absolute;
      display: block;
      content: '';
      border-radius: 50%;
      background: var(--pointer-feedback_accent-color);
      opacity: 0;
      transform: scale(0);
    }

    :host([animatable])::before {
      transition: opacity var(--pointer-feedback_transparency-speed) linear, transform var(--pointer-feedback_scale-speed) linear;
    }

    :host([mouseup][animatable])::before {
      transition: opacity .4s linear, transform .2s linear;
    }

    :host([mousedown])::before {
      opacity: 1;
      transform: scale(1);
    }

    :host([mouseup]:not([mousedown]))::before {
      opacity: 0;
      transform: scale(1);
    }

    :host([hidden]) {
      display: none;
    }
  </style>
`
// todo: test getting boundingrect once, and only once
class PointerFeedback extends HTMLElement {

  constructor() {
    super()

    this.$shadow            = this.attachShadow({ mode: 'open' })
    this.$shadow.innerHTML  = $STYLES
    this.styles             = this.$shadow.querySelector('style')
    this.cssAdded           = false
  }

  set animatable(val) {
    val
      ? this.setAttribute('animatable', '')
      : this.removeAttribute('animatable')
  }

  set mousedown(val) {
    val
      ? this.setAttribute('mousedown', '')
      : this.removeAttribute('mousedown')
  }

  set mouseup(val) {
    val
      ? this.setAttribute('mouseup', '')
      : this.removeAttribute('mouseup')
  }

  set disabled(val) {
    val
      ? this.setAttribute('disabled', '')
      : this.removeAttribute('disabled')
  }

  get mouseup()   { return this.hasAttribute('mouseup') }
  get mousedown() { return this.hasAttribute('mousedown') }
  get disabled()  { return this.hasAttribute('disabled') }

  connectedCallback() {
    this.addEventListener('mousedown', ({offsetX, offsetY}) => {
      if (this.disabled) return
      this._triggerRippleIn(offsetX, offsetY)
    })

    this.addEventListener('mouseup', e => {
      if (this.disabled) return
      this._triggerRippleOut()
    })

    // ensure parent element is in it's own index stack 
    this.parentElement.style.willChange   = 'transform'
    this._matchParentShape()
  }

  _matchParentShape() {
    const parentStyle = getComputedStyle(this.parentElement, null).getPropertyValue('border-radius')

    if (parentStyle != '0px')
      this.style.borderRadius = parentStyle
  }

  _fadeOut() {
    this.mousedown = false
    this.addEventListener('transitionend', this._transitionOutEnd)
  }

  _removeCSS() {
    this.styles.sheet.deleteRule(0)
    this.cssAdded = false
  }

  _reset() {
    this.animatable   = false
    this.mousedown    = false
    this.mouseup      = false

    this.removeEventListener('transitionend', this._transitionOutEnd)
    this.removeEventListener('transitionend', this._transitionInEnd)

    if (this.cssAdded) this._removeCSS()

    this.transitionInOver   = false
    this.transitionOutOver  = false
  }

  _transitionInEnd(evt) {
    if (evt.pseudoElement && evt.propertyName === 'transform' && !this.transitionInOver) {
      this.removeEventListener('transitionend', this._transitionInEnd)

      this.transitionInOver = true

      if (this.mouseup) this._fadeOut()
    }
  }

  _transitionOutEnd(evt) {
    if (evt.pseudoElement && evt.propertyName === 'opacity') {
      this.transitionOutOver = true
      this._reset()
    }
  }

  _positionPseduoElement(x, y) {
    // force recalc so previous animation doesn't transition to the new state
    const { height, width } = this.getBoundingClientRect()

    const largest           = Math.max(height, width)
    const fullCoverage      = largest * 2.1 + (largest / 2.1)

    const xPos              = x - (fullCoverage / 2)
    const yPos              = y - (fullCoverage / 2)

    const speed             = Math.max(300, Math.min(700, largest))

    this.styles.sheet.insertRule(`
      :host:before {
        left:   ${xPos}px;
        top:    ${yPos}px;
        width:  ${fullCoverage}px;
        height: ${fullCoverage}px;
        --pointer-feedback_scale-speed: ${speed}ms;
        --pointer-feedback_transparency-speed: ${speed / 3}ms;
      }
    `, 0)

    this.cssAdded = true
  }

  _triggerRippleIn(offsetX, offsetY) {
    this._reset()
    this._positionPseduoElement(offsetX, offsetY)

    this.animatable   = true
    this.mousedown    = true

    this.addEventListener('transitionend', this._transitionInEnd)
  }

  _triggerRippleOut() {
    if (this.transitionOutOver || !this.mousedown) 
      return

    this.mouseup = true

    if (this.transitionInOver) 
      this._fadeOut()
  }

}

customElements.define('pointer-feedback', PointerFeedback)