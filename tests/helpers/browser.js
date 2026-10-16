export class FakeBrowser extends EventTarget {
    constructor() {
        super();
        this.isSecureContext = true;
        this.DeviceOrientationEvent = class {};
        this.document = new EventTarget();
        this.document.hidden = false;
        this.screen = { orientation: { angle: 0 } };
        this.navigator = { languages: ['en'] };
        this.clock = 1000;
        this.timers = new Set();
    }
    setInterval(callback) { this.timers.add(callback); return callback; }
    clearInterval(callback) { this.timers.delete(callback); }
    advance(ms) { this.clock += ms; this.timers.forEach(callback => callback()); }
    emit(type, values = {}) { this.dispatchEvent(Object.assign(new Event(type), values)); }
    orient(values = {}) {
        this.emit('deviceorientationabsolute', { absolute: true, alpha: 0, beta: 0, gamma: 0, ...values });
    }
    visibility(hidden) {
        this.document.hidden = hidden;
        this.document.dispatchEvent(new Event('visibilitychange'));
    }
}
