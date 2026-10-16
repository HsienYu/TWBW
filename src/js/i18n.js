import { messages } from './locales.js';
export { messages };
const supported = value => value === 'en' || value === 'zh-TW';
const storageKey = 'twbw-language';

export function resolveLocale(preferences, override) {
    if (supported(override)) return override;
    for (const value of Array.isArray(preferences) ? preferences : []) {
        if (typeof value !== 'string') continue;
        try {
            const language = new Intl.Locale(value).language;
            if (language === 'zh') return 'zh-TW';
            if (language === 'en') return 'en';
        } catch {
            // Browser preferences and stored selections are untrusted; ignore invalid BCP 47 tags.
        }
    }
    return 'en';
}

export function createI18n({ window: win, storage }) {
    let selected = null;
    try {
        storage ??= win.localStorage;
        const saved = storage?.getItem(storageKey);
        if (supported(saved)) selected = saved;
    } catch {
        console.warn('Language preferences cannot be read; using browser preferences.');
    }
    const preferences = () => win.navigator.languages?.length ? win.navigator.languages : [win.navigator.language];
    let locale = resolveLocale(preferences(), selected);
    const listeners = new Set();
    function notify() {
        locale = resolveLocale(preferences(), selected);
        listeners.forEach(listener => listener());
    }
    function languageChanged() { if (!selected) notify(); }
    win.addEventListener('languagechange', languageChanged);
    return {
        get locale() { return locale; },
        get selection() { return selected || 'auto'; },
        t(key, values = {}) {
            const template = Object.hasOwn(messages[locale], key) ? messages[locale][key] : key;
            return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
        },
        number(value, options = {}) { return new Intl.NumberFormat(locale, options).format(value); },
        date(value) { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); },
        setLocale(value) {
            if (value !== 'auto' && !supported(value)) return;
            selected = value === 'auto' ? null : value;
            try {
                if (selected) storage?.setItem(storageKey, selected);
                else storage?.removeItem(storageKey);
            } catch {
                console.warn('Language preference cannot be saved; using it for this page only.');
            }
            notify();
        },
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        destroy() { listeners.clear(); win.removeEventListener('languagechange', languageChanged); }
    };
}

export function bindLanguageUI(i18n, document) {
    const select = document.getElementById('language-select');
    function render() {
        document.documentElement.lang = i18n.locale;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            element.textContent = i18n.t(element.dataset.i18n);
        });
        if (select) select.value = i18n.selection;
    }
    select?.addEventListener('change', () => i18n.setLocale(select.value));
    i18n.subscribe(render);
    render();
}
