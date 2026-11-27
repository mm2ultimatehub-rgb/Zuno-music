# ZUNO Music

ZUNO Music aynı React/TypeScript arayüzünü kullanan çok platformlu bir müzik uygulamasıdır.

## Platformlar

- **Android telefon ve tablet:** Capacitor ile yerel Android uygulaması; GitHub Actions üzerinden APK.
- **Windows, macOS ve Linux:** Tauri ile yerel masaüstü kurulum paketleri.
- **Web tarayıcısı:** İsteğe bağlı PWA sürümü; yerel uygulamaların yerine geçmez.

## Uygulama özellikleri

- Cihazdan ses dosyası içe aktarma, yerel kütüphane ve gerçek ses oynatma
- Audius kataloğunda arama ve desteklenen parçaları akış olarak oynatma
- ZUNO hesabı, favoriler, çalma listeleri, ayarlar ve arama geçmişi için Supabase eşitlemesi
- GitHub Releases üzerinden gerçek sürüm denetimi ve Android APK indirme bağlantısı
- Telefon, tablet ve masaüstü ekranlarına uyumlu arayüz

Yerel ses dosyaları ve çevrimdışı indirmeler cihazda tutulur; otomatik olarak buluta yüklenmez.

## Geliştirme

```bash
npm install
npm run dev
npm run lint
npm run build
```

### Android

```bash
npx cap add android
npx cap sync android
```

Android Studio'da `android/` klasörünü açabilir veya GitHub Actions'ın APK artifact'ini kullanabilirsin. Yerel debug build:

```bash
npm run android:debug
```

### Masaüstü

Rust ve platformun Tauri bağımlılıklarını kurduktan sonra:

```bash
npx tauri icon public/zuno-icon.svg --output src-tauri/icons
npm run desktop:build
```

## İmzalı Android yayınları ve otomatik sürüm üretimi

GitHub Actions, dal/PR değişikliklerinde test amaçlı **debug APK** ve Linux/Windows/macOS masaüstü paketleri üretir. Debug APK mevcut imzalı bir sürümün üzerine güncelleme olarak kurulamaz.

Gerçek, mevcut kurulumun üzerine yüklenebilir Android Release APK ve GitHub Release üretmek için `v0.1.0` biçiminde bir Git tag gönder. Önce Repository → Settings → Secrets and variables → Actions bölümüne aşağıdaki repository secrets değerlerini ekle:

- `ZUNO_KEYSTORE_BASE64`: release keystore dosyasının Base64 içeriği
- `ZUNO_KEYSTORE_PASSWORD`
- `ZUNO_KEY_ALIAS`
- `ZUNO_KEY_PASSWORD`

Aynı keystore ve alias sonraki tüm sürümlerde kullanılmalıdır. İmzalama anahtarını repoya veya uygulama kaynak koduna ekleme. Tag workflow'u bu değerlerden biri eksikse release'i durdurur; imzasız APK'yı güncelleme gibi yayımlamaz.

Her başarılı `v*` tag yayını GitHub Releases'e Android APK ve üretilen masaüstü kurulumlarını ekler. Ayarlar ekranı artık sabit bir başarı mesajı göstermez; gerçek en son kararlı GitHub Release sürümünü denetler.

## Kimlik doğrulama yönlendirmesi

Android kayıt doğrulama ve şifre kurtarma bağlantıları `zuno://auth/callback` adresine döner. Supabase Authentication → URL Configuration → Redirect URLs bölümünde bu URI'yi izin verilen adreslere ekle. Web/PWA kullanıyorsan yayın origin'ini de ayrı bir Redirect URL olarak ekle.

Supabase projesi, RLS ve Realtime kurulumu için [SUPABASE_SETUP.md](SUPABASE_SETUP.md) dosyasına bak.
