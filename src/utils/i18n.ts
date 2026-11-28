import type { AppLanguage } from '../types/music';

const messages: Record<AppLanguage, Record<string, string>> = {
  tr: { home: 'Ana Sayfa', discover: 'Keşfet', library: 'Kütüphane', downloads: 'İndirilenler', settings: 'Ayarlar', settingsSubtitle: 'Görünüm, animasyonlar, ses ve depolama', language: 'Uygulama dili', languageHint: 'ZUNO arayüz dilini seç' },
  en: { home: 'Home', discover: 'Discover', library: 'Library', downloads: 'Downloads', settings: 'Settings', settingsSubtitle: 'Appearance, animations, audio and storage', language: 'App language', languageHint: 'Choose the ZUNO interface language' },
  ru: { home: 'Главная', discover: 'Обзор', library: 'Медиатека', downloads: 'Загрузки', settings: 'Настройки', settingsSubtitle: 'Внешний вид, анимации, звук и хранилище', language: 'Язык приложения', languageHint: 'Выберите язык интерфейса ZUNO' },
};

export function t(key: string, language: AppLanguage = 'tr'): string {
  return messages[language]?.[key] ?? messages.tr[key] ?? key;
}
