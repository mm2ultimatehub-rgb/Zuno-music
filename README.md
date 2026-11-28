# ZUNO Music

<p align="center">
  <img src="zuno-icon.svg" width="144" alt="ZUNO Music metallic waveform emblem">
</p>

ZUNO Music aynı React/TypeScript arayüzünü kullanan çok platformlu bir müzik uygulamasıdır.

## İndirme merkezi

**[ZUNO Music'i indir — cihazına uygun en son sürüm](https://mm2ultimatehub-rgb.github.io/Zuno-music/download.html)**

İndirme sayfası cihaz türünü otomatik algılar ve en son yayımlanmış kararlı GitHub Release dosyalarını getirir:

- Android telefon/tablet: imzalı APK
- Windows: kurulum EXE ve MSI
- macOS: DMG veya PKG
- Linux: AppImage, DEB ve RPM

Yeni kararlı sürüm GitHub Releases'e yayımlandığında sayfadaki sürüm numarası ve indirme bağlantıları otomatik yenilenir. Siteye her yayın için elle APK veya bağlantı yüklemek gerekmez. Sayfadaki **Sürümü yenile** düğmesi de son sürümü yeniden kontrol eder. Diğer platform dosyaları aynı sayfada her zaman listelenir.


## Platformlar

- **Android telefon ve tablet:** Capacitor ile yerel Android uygulaması; GitHub Actions üzerinden APK.
- **Windows, macOS ve Linux:** Tauri ile yerel masaüstü kurulum paketleri.
- **Web tarayıcısı:** İsteğe bağlı PWA sürümü; yerel uygulamaların yerine geçmez.

## Uygulama özellikleri

- ZUNO Android uygulamasındaki Müzik Tanıma sonucunu tek dokunuşla bu uygulamaya aktarma; tanınan parça YouTube Music kataloğunda aranır
- Cihazdan ses dosyası içe aktarma, yerel kütüphane ve gerçek ses oynatma
- Audius canlı kataloğunda arama ve desteklenen parçaları akış olarak oynatma
- noFAYZ/zuno projesindeki YouTube Music katalog yaklaşımını uyarlayan gerçek şarkı/albüm/sanatçı araması; kapak ve sanatçı bilgileri YouTube Music'ten alınır
- Şarkılar, YouTube'un resmî gömülü oynatıcısında ZUNO mini oynatıcı ve önceki/sonraki kuyruk kontrolleriyle açılır
- Gerçek kaynak verisi olmayan parçalar/sözler/indirmeler sahteymiş gibi gösterilmez
- Desteklenen tarayıcı/WebView ortamlarında Media Session sistem oynatma bilgileri ve medya tuşları
- ZUNO hesabı, favoriler, çalma listeleri, ayarlar ve arama geçmişi için Supabase eşitlemesi
- GitHub Releases üzerinden gerçek sürüm denetimi ve [otomatik çoklu platform indirme sayfası](https://mm2ultimatehub-rgb.github.io/Zuno-music/download.html)
- Telefon, tablet ve masaüstü ekranlarına uyumlu arayüz

Yerel ses dosyaları ve çevrimdışı indirmeler cihazda tutulur; otomatik olarak buluta yüklenmez. YouTube Music katalog araması herkese açık katalog metadatasını yükler; Google hesabının kişisel beğenileri ve özel çalma listeleri henüz bu ilk entegrasyona dahil değildir. YouTube Music parçaları YouTube'un resmî oynatıcısında açılır; YouTube sesini ayıklama veya bu içerikleri MP3 olarak indirme özelliği sunulmaz.

## YouTube Music katalog bağlantısı

YouTube Music araması, noFAYZ/zuno açık kaynak projesinde kullanılan `youtubei.js` yaklaşımı uyarlanarak sağlanır. Genel şarkı, albüm ve sanatçı araması için Google Cloud API anahtarı gerekmez. Android'de Capacitor yerel HTTP taşıması, masaüstünde yalnızca YouTube Music HTTPS ana bilgisayarlarına izin veren Tauri/Rust proxy'si kullanılır.

Kişisel YouTube Music kitaplığını, beğenileri veya sana özel çalma listelerini eşitlemek farklı bir özelliktir ve Google hesabı bağlantısı gerektirir. Bu özellik genel katalog aramasından ayrı tutulur. Oynatma YouTube'un resmî gömülü oynatıcısında yapılır; reklamlar ve oynatma kontrolleri YouTube tarafından yönetilir.

## Üçüncü taraf kaynak bildirimi

YouTube Music katalog entegrasyonu, [noFAYZ/zuno](https://github.com/noFAYZ/zuno) projesinin açık kaynak yaklaşımından uyarlanmıştır. Kaynak proje Apache License 2.0 ile lisanslıdır; lisans kopyası [licenses/noFAYZ-zuno-APACHE-2.0.txt](licenses/noFAYZ-zuno-APACHE-2.0.txt) dosyasındadır. Uyarlama ve lisans kapsamı için [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dosyasına bak.

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

Android kayıt doğrulama ve şifre kurtarma bağlantıları `zuno://auth/callback` adresine döner. ZUNO Android müzik tanıma aktarımı `zunomusic://import` şemasını kullanır. İki uygulama farklı Android paket kimlikleriyle kurulur: ZUNO `com.zuno.music`, ZUNO Music `com.mm2vault.zunomusic`. Supabase Authentication → URL Configuration → Redirect URLs bölümünde bu URI'yi izin verilen adreslere ekle. Web/PWA kullanıyorsan yayın origin'ini de ayrı bir Redirect URL olarak ekle.

Supabase projesi, RLS ve Realtime kurulumu için [SUPABASE_SETUP.md](SUPABASE_SETUP.md) dosyasına bak.
