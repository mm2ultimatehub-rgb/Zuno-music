# ZUNO Music

Telefon, tablet ve masaüstü tarayıcılar için duyarlı müzik uygulaması.

## Özellikler

- Kurulabilir PWA ve uygulama kabuğu çevrimdışı önbelleği
- Gerçek ses dosyalarını oynatma ve cihazda saklama
- Audius katalog araması ve akış desteği
- ZUNO hesabı ile ayarlar, favoriler, dinleme geçmişi, çalma listeleri ve arama geçmişi eşitlemesi

## Bulut hesabını etkinleştirme

ZUNO’ya özel Supabase projesi ve ortam değişkenleri gerekir. Kurulum için [SUPABASE_SETUP.md](SUPABASE_SETUP.md) dosyasını izle. Supabase ayarlanmamışsa uygulama yerel müzik özelliklerini kullanmaya devam eder; hesap ekranı bulutun henüz yapılandırılmadığını açıkça gösterir.

## Geliştirme

`npm install`, ardından `npm run dev`.

`npm run lint` TypeScript denetimini, `npm run build` üretim derlemesini çalıştırır.

Bu depo şu an web/PWA uygulamasıdır; yerel imzalı Android APK projesi değildir.
