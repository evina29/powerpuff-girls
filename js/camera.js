/* ============================================================
   CAMERA — screen shake + full-screen flash feedback.
   The battle renderer calls preRender()/postRender() around its
   draw pass; shake offsets the canvas transform, flash drives
   the #fx-flash DOM overlay so it also covers the HUD.
   ============================================================ */

class GameCamera {
  constructor() {
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.flashEl = document.getElementById('fx-flash');
  }

  /** Kick the camera. Bigger hits pass bigger intensity (px). */
  shake(intensity = 8, duration = 0.3) {
    // Keep the strongest active shake
    if (intensity >= this.shakeIntensity || this.shakeTime <= 0) {
      this.shakeIntensity = intensity;
      this.shakeTime = this.shakeDuration = duration;
    }
  }

  /** Full-screen color flash (hit = white, heal = green...). */
  flash(color = '#ffffff', strength = 0.35, duration = 120) {
    if (!this.flashEl) return;
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = strength;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { this.flashEl.style.opacity = 0; }, duration);
  }

  update(dt) {
    if (this.shakeTime > 0) this.shakeTime -= dt;
  }

  /** Apply shake offset before drawing the world. */
  preRender(ctx) {
    ctx.save();
    if (this.shakeTime > 0) {
      const falloff = this.shakeTime / this.shakeDuration;
      const amp = this.shakeIntensity * falloff;
      ctx.translate(rand(-amp, amp), rand(-amp, amp));
    }
  }

  postRender(ctx) { ctx.restore(); }

  reset() {
    this.shakeTime = 0;
    if (this.flashEl) this.flashEl.style.opacity = 0;
  }
}

window.GameCamera = GameCamera;
