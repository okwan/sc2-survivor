import { hyp } from './math';
/** Keyboard, mouse and touch input. Movement is read as a normalized vector each frame. */
export class Input {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  hasMouse = false;
  dashPressed = false;
  wheel = 0;
  // virtual joystick
  private touchId: number | null = null;
  private touchOx = 0;
  private touchOy = 0;
  touchDx = 0;
  touchDy = 0;
  onKey: ((code: string) => void) | null = null;
  readonly isTouch = matchMedia('(pointer: coarse)').matches;
  joystickEl: HTMLDivElement;
  private knobEl: HTMLDivElement;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyF') this.dashPressed = true;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      this.onKey?.(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.hasMouse = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.dashPressed = true;
    });
    canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });

    this.joystickEl = document.createElement('div');
    this.joystickEl.className = 'joystick';
    this.knobEl = document.createElement('div');
    this.knobEl.className = 'knob';
    this.joystickEl.appendChild(this.knobEl);
    document.body.appendChild(this.joystickEl);

    canvas.addEventListener('touchstart', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (this.touchId === null) {
          this.touchId = t.identifier;
          this.touchOx = t.clientX;
          this.touchOy = t.clientY;
          this.touchDx = this.touchDy = 0;
          this.joystickEl.style.display = 'block';
          this.joystickEl.style.left = `${t.clientX}px`;
          this.joystickEl.style.top = `${t.clientY}px`;
          this.knobEl.style.transform = 'translate(-50%,-50%)';
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.touchId) continue;
        let dx = t.clientX - this.touchOx;
        let dy = t.clientY - this.touchOy;
        const len = hyp(dx, dy);
        const max = 50;
        if (len > max) {
          dx = (dx / len) * max;
          dy = (dy / len) * max;
        }
        this.touchDx = dx / max;
        this.touchDy = dy / max;
        this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.touchDx = this.touchDy = 0;
          this.joystickEl.style.display = 'none';
        }
      }
    };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  }

  down(code: string) {
    return this.keys.has(code);
  }

  /** Movement vector, length <= 1. */
  move(): [number, number] {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x || y) {
      const l = hyp(x, y);
      return [x / l, y / l];
    }
    if (this.touchId !== null) {
      const l = hyp(this.touchDx, this.touchDy);
      if (l < 0.15) return [0, 0];
      return [this.touchDx, this.touchDy];
    }
    return [0, 0];
  }

  consumeDash(): boolean {
    const d = this.dashPressed;
    this.dashPressed = false;
    return d;
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  get canvasEl() {
    return this.canvas;
  }
}
