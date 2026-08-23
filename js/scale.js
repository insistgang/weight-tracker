/**
 * WeightTracker - Interactive Mechanical Scale Ruler Engine
 */

class MechanicalScaleRuler {
  constructor(options = {}) {
    this.container = document.getElementById(options.containerId || 'scale-ruler-container');
    this.displayEl = document.getElementById(options.displayId || 'scale-weight-display');
    this.min = options.min || 40.0;
    this.max = options.max || 150.0;
    this.step = options.step || 0.1;
    this.value = options.initialValue || 80.0;
    this.onChange = options.onChange || null;

    this.tickWidth = 10; // pixels per 0.1kg step
    this.isDragging = false;
    this.startX = 0;
    this.startTranslate = 0;
    this.currentTranslate = 0;

    this.render();
    this.attachEvents();
    this.setValue(this.value, false);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="ruler-viewport" id="ruler-viewport">
        <div class="ruler-pointer"></div>
        <div class="ruler-track" id="ruler-track"></div>
      </div>
    `;

    this.viewport = this.container.querySelector('#ruler-viewport');
    this.track = this.container.querySelector('#ruler-track');

    // Generate ticks
    const totalSteps = Math.round((this.max - this.min) / this.step);
    let html = '';

    for (let i = 0; i <= totalSteps; i++) {
      const val = +(this.min + i * this.step).toFixed(1);
      const isMajor = Math.abs(val % 1.0) < 0.001;
      const isHalf = Math.abs(val % 0.5) < 0.001 && !isMajor;

      let tickClass = 'ruler-tick-minor';
      if (isMajor) tickClass = 'ruler-tick-major';
      else if (isHalf) tickClass = 'ruler-tick-half';

      html += `
        <div class="ruler-tick ${tickClass}" style="width: ${this.tickWidth}px;">
          ${isMajor ? `<span class="ruler-tick-label">${val}</span>` : ''}
          <div class="ruler-tick-line"></div>
        </div>
      `;
    }

    this.track.innerHTML = html;
  }

  attachEvents() {
    if (!this.viewport) return;

    // Pointer / Mouse events
    this.viewport.addEventListener('mousedown', this.onDragStart.bind(this));
    window.addEventListener('mousemove', this.onDragMove.bind(this));
    window.addEventListener('mouseup', this.onDragEnd.bind(this));

    // Touch events
    this.viewport.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    // Wheel event
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.adjustValue(delta);
    }, { passive: false });
  }

  onDragStart(e) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startTranslate = this.currentTranslate;
  }

  onDragMove(e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.startX;
    this.updateTranslate(this.startTranslate + deltaX);
  }

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.snapToStep();
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX;
      this.startTranslate = this.currentTranslate;
    }
  }

  onTouchMove(e) {
    if (!this.isDragging) return;
    if (e.cancelable) e.preventDefault();
    const deltaX = e.touches[0].clientX - this.startX;
    this.updateTranslate(this.startTranslate + deltaX);
  }

  onTouchEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.snapToStep();
  }

  updateTranslate(translate) {
    const centerOffset = this.viewport.offsetWidth / 2;
    const totalWidth = ((this.max - this.min) / this.step) * this.tickWidth;

    const minTranslate = centerOffset - totalWidth;
    const maxTranslate = centerOffset;

    this.currentTranslate = Math.min(maxTranslate, Math.max(minTranslate, translate));
    this.track.style.transform = `translateX(${this.currentTranslate}px)`;

    // Calculate value
    const relativeX = centerOffset - this.currentTranslate;
    const steps = relativeX / this.tickWidth;
    const rawVal = this.min + steps * this.step;
    this.value = +(Math.min(this.max, Math.max(this.min, rawVal))).toFixed(1);

    this.updateDisplay();
  }

  snapToStep() {
    this.setValue(this.value, true);
  }

  setValue(val, animate = false) {
    this.value = +(Math.min(this.max, Math.max(this.min, val))).toFixed(1);
    const steps = (this.value - this.min) / this.step;
    const centerOffset = (this.viewport ? this.viewport.offsetWidth : 300) / 2;
    this.currentTranslate = centerOffset - steps * this.tickWidth;

    if (this.track) {
      this.track.style.transition = animate ? 'transform 0.15s ease-out' : 'none';
      this.track.style.transform = `translateX(${this.currentTranslate}px)`;
      if (animate) {
        setTimeout(() => {
          if (this.track) this.track.style.transition = 'none';
        }, 160);
      }
    }

    this.updateDisplay();
  }

  refreshLayout() {
    if (!this.viewport || !this.track) return;
    const steps = (this.value - this.min) / this.step;
    const centerOffset = this.viewport.offsetWidth / 2;
    this.currentTranslate = centerOffset - steps * this.tickWidth;
    this.track.style.transition = 'none';
    this.track.style.transform = `translateX(${this.currentTranslate}px)`;
  }

  adjustValue(delta) {
    const target = +(this.value + delta).toFixed(1);
    this.setValue(target, true);
  }

  updateDisplay() {
    if (this.displayEl) {
      this.displayEl.textContent = this.value.toFixed(1);
    }
    if (typeof this.onChange === 'function') {
      this.onChange(this.value);
    }
  }

  getValue() {
    return this.value;
  }
}

window.MechanicalScaleRuler = MechanicalScaleRuler;
