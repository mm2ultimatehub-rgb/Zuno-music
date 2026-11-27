# ZUNO Music

ZUNO Music aynı React/TypeScript arayüzünü kullanan çok platformlu bir müzik uygulamasıdır.

## Platformlar

- **Android telefon ve tablet:** Capacitor ile yerel Android uygulaması; GitHub Actions üzerinden APK.
- **Windows, macOS ve Linux:** Tauri ile yerel masaüstü kurulum paketleri.
- **Web tarayıcısı:** İsteğe bağlı PWA sürümü; yerel uygulamaların yerine geçmez.

## Uygulama özellikleri

- Cihazdan ses dosyası içe aktarma, yerel kütüphane ve gerçek ses oynatma
- Audius canlı kataloğunda arama ve desteklenen parçaları akış olarak oynatma
- YouTube Data API v3 ile gerçek video araması, küçük resim ve kanal bilgileri; resmî YouTube gömülü oynatıcısında oynatma
- Gerçek parça seçilene kadar boş/demode oynatıcı gösterimi; sahte katalog, söz ve indirme kayıtları kullanılmaz
- Desteklenen tarayıcı/WebView ortamlarında Media Session sistem oynatma bilgileri ve medya tuşları
- ZUNO hesabı, favoriler, çalma listeleri, ayarlar ve arama geçmişi için Supabase eşitlemesi
- GitHub Releases üzerinden gerçek sürüm denetimi ve Android APK indirme bağlantısı
- Telefon, tablet ve masaüstü ekranlarına uyumlu arayüz

Yerel ses dosyaları ve çevrimdışı indirmeler cihazda tutulur; otomatik olarak buluta yüklenmez. YouTube videoları YouTube'un kendi oynatıcısında açılır; YouTube sesini ayıklama veya YouTube içeriği için çevrimdışı MP3 indirme özelliği sunulmaz.

## YouTube aramasını etkinleştirme

1. Google Cloud projesinde **YouTube Data API v3** hizmetini etkinleştir ve bir API anahtarı oluştur.
2. Anahtarı yalnızca YouTube Data API v3 için kısıtla. Uygulama içinde kullanılacağı için bir backend sırrı gibi gizli kabul edilmemelidir; istemci paketine dahil edilir.
3. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret** bölümünden `VITE_YOUTUBE_API_KEY` adında secret oluştur ve anahtarını ekle.
4. Yerel geliştirmede aynı anahtarı kök dizindeki `.env` dosyasında `VITE_YOUTUBE_API_KEY` olarak tanımla.

YouTube video araması Keşfet ekranında en az iki karakterli bir sorgu girildiğinde yapılır. Google API kotası ve video sahibinin gömme izni arama sonuçlarını etkileyebilir. Oynatma YouTube'un resmî iframe oynatıcısı üzerinden gerçekleşir; reklamlar ve oynatma kontrolleri YouTube tarafından yönetilir.

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

GitHub Actions, pull request'lerde test amaçlı **debug APK** ve Linux/Windows/macOS masaüstü paketleri üretir. Debug APK mevcut imzalı bir sürümün üzerine güncelleme olarak kurulamaz.

Gerçek, mevcut kurulumun üzerine yüklenebilir Android Release APK ve GitHub Release üretmek için dört imza secret'ı Repository → Settings → Secrets and variables → Actions bölümünde tanımlı olmalıdır:

- `ZUNO_KEYSTORE_BASE64`: release keystore dosyasının Base64 içeriği
- `ZUNO_KEYSTORE_PASSWORD`
- `ZUNO_KEY_ALIAS`
- `ZUNO_KEY_PASSWORD`

**Otomatik sürüm sistemi:** Bu geliştirme PR'ı `main` dalına birleştirildikten sonra, `main` dalına gelen her push için Actions son yayımlanmış sürüm/etiketleri kontrol eder ve yama sürümünü otomatik artırır: örneğin `0.1.0 → 0.1.1 → 0.1.2`. Aynı sürüm numarası Android `versionName`, masaüstü paketleri ve uygulamanın güncelleme denetleyicisine aktarılır. APK imzalama ve Windows/macOS/Linux paketleme adımlarının tamamı başarılı olmadan GitHub Release yayımlanmaz. PR ve özellik dalları yalnızca test/debug APK ile masaüstü artifact'leri üretir.

İstisnai durumlarda **Actions → ZUNO native app builds → Run workflow** üzerinden `release_version` alanını boş bırakarak test build'i veya `0.1.5` gibi bir sürüm girerek manuel release başlatabilirsin. Aynı keystore ve alias sonraki tüm sürümlerde kullanılmalıdır. İmzalama anahtarını repoya veya uygulama kaynak koduna ekleme.

Anahtar secret'larından biri eksikse Release işi durur; imzasız APK güncelleme gibi yayımlanmaz.

Her başarılı otomatik veya manuel release GitHub Releases'e imzalı Android APK ve üretilen masaüstü kurulumlarını ekler. Ayarlar ekranı artık sabit bir başarı mesajı göstermez; gerçek en son kararlı GitHub Release sürümünü denetler.

## Kimlik doğrulama yönlendirmesi

Android kayıt doğrulama ve şifre kurtarma bağlantıları `zuno://auth/callback` adresine döner. Supabase Authentication → URL Configuration → Redirect URLs bölümünde bu URI'yi izin verilen adreslere ekle. Web/PWA kullanıyorsan yayın origin'ini de ayrı bir Redirect URL olarak ekle.

Supabase projesi, RLS ve Realtime kurulumu için [SUPABASE_SETUP.md](SUPABASE_SETUP.md) dosyasına bak.
