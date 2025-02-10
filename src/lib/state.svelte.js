// state.svelte.js
import { tick } from 'svelte';

const isBrowser = typeof window !== 'undefined';

export class PersistentState {
    #version = $state(0);
    #listeners = 0;
    #config;
    #proxies = new WeakMap();

    #storageHandler = (e) => {
        if (e.storageArea !== localStorage) return;
        if (this.#config[e.key]?.type === 'localStorage') {
            this.#version += 1;
        }
    };

    constructor(config) {
        this.#config = config;
        this.#initializeStorages();

        return new Proxy(this, {
            get: (target, prop) => {
                if (prop in target) return target[prop];
                return this.#getValue(prop);
            },
            set: (target, prop, value) => {
                return this.#setValue(prop, value);
            }
        });
    }

    #initializeStorages() {
        Object.entries(this.#config).forEach(([key, cfg]) => {
            const { type, value, options } = cfg;

            if (type === 'localStorage' && isBrowser) {
                if (!localStorage.getItem(key)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            }
            else if (type === 'cookie' && isBrowser) {
                if (!this.#getCookie(key)) {
                    this.#setCookie(key, value, options);
                }
            }
        });
    }

    #getCookie(name) {
        if (!isBrowser) return null;
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`));

        return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
    }

    #setCookie(name, value, options = {}) {
        if (!isBrowser) return;
        let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(JSON.stringify(value))}`;

        Object.entries(options).forEach(([key, val]) => {
            if (key === 'maxAge') cookie += `; max-age=${val}`;
            else if (key === 'expires') cookie += `; expires=${val.toUTCString()}`;
            else if (val === true) cookie += `; ${key}`;
            else if (val) cookie += `; ${key}=${val}`;
        });

        document.cookie = cookie;
    }

    #getValue(prop) {
        this.#version; // Track version for reactivity

        const cfg = this.#config[prop];
        if (!cfg) return undefined;

        // Get raw value from storage
        let value;
        if (cfg.type === 'localStorage') {
            if (isBrowser) {
                const stored = localStorage.getItem(prop);
                value = stored ? JSON.parse(stored) : cfg.value;
            } else {
                value = cfg.value;
            }
        }
        else if (cfg.type === 'cookie') {
            if (isBrowser) {
                const stored = this.#getCookie(prop);
                value = stored ? JSON.parse(stored) : cfg.value;
            } else {
                value = cfg.value;
            }
        }

        // Create nested proxy for objects
        if (value && typeof value === 'object') {
            if (!this.#proxies.has(value)) {
                this.#proxies.set(value, new Proxy(value, {
                    get: (obj, key) => this.#getNested(obj, key),
                    set: (obj, key, val) => this.#setNested(prop, obj, key, val)
                }));
            }
            return this.#proxies.get(value);
        }

        return value;
    }

    #setValue(prop, value) {
        const cfg = this.#config[prop];
        if (!cfg) return false;

        if (cfg.type === 'localStorage' && isBrowser) {
            localStorage.setItem(prop, JSON.stringify(value));
        }
        else if (cfg.type === 'cookie' && isBrowser) {
            this.#setCookie(prop, value, cfg.options);
        }

        this.#version += 1;
        return true;
    }

    #getNested(obj, key) {
        this.#version;
        return obj[key];
    }

    #setNested(prop, obj, key, val) {
        obj[key] = val;
        this.#setValue(prop, obj);
        return true;
    }

    $init() {
        if ($effect.tracking()) {
            $effect(() => {
                if (this.#listeners === 0 && isBrowser) {
                    window.addEventListener('storage', this.#storageHandler);
                }

                this.#listeners += 1;

                return () => {
                    tick().then(() => {
                        this.#listeners -= 1;
                        if (this.#listeners === 0 && isBrowser) {
                            window.removeEventListener('storage', this.#storageHandler);
                        }
                    });
                };
            });
        }
    }
}