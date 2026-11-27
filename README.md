# ZUNO Music

Telefon, tablet ve masaüstü tarayıcılar için duyarlı müzik uygulaması.

## Özellikler

- Kurulabilir PWA ve uygulama kabuğu çevrimdışı önbelleği
- Gerçek ses dosyalarını oynatma ve cihazda saklama
- Audius katalog araması ve akış desteği
- ZUNO hesabı ile ayarlar, favoriler, dinleme geçmişi, çalma listeleri ve arama geçmişi eşitlemesi

## Bulut hesabını etkinleştirme

ZUNO’ya özel Supabase projesi bağlandı; kullanıcı durumu tablosu ve RLS politikaları kuruldu. Hesap ekranında e-posta ile kayıt/giriş ve şifre kurtarma bulunur. Yayın adresinin Supabase Auth Redirect URLs listesinde tanımlanması gerekir. Ayrıntılar için [SUPABASE_SETUP.md](SUPABASE_SETUP.md) dosyasını izle.

## Geliştirme

`npm install`, ardından `npm run dev`.

`npm run lint` TypeScript denetimini, `npm run build` üretim derlemesini çalıştırır.

Bu depo şu an web/PWA uygulamasıdır; yerel imzalı Android APK projesi değildir.
