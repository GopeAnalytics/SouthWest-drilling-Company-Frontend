// Vue-like Reactive System
class ReactiveSystem {
  constructor() {
    this.data = {};
    this.watchers = {};
  }

  reactive(obj) {
    const self = this;
    return new Proxy(obj, {
      set(target, key, value) {
        const oldValue = target[key];
        target[key] = value;
        if (oldValue !== value) {
          self.notify(key, value, oldValue);
        }
        return true;
      },
      get(target, key) {
        return target[key];
      },
    });
  }

  watch(key, callback) {
    if (!this.watchers[key]) {
      this.watchers[key] = [];
    }
    this.watchers[key].push(callback);
  }

  notify(key, newValue, oldValue) {
    if (this.watchers[key]) {
      this.watchers[key].forEach((callback) => {
        callback(newValue, oldValue);
      });
    }
  }
}
