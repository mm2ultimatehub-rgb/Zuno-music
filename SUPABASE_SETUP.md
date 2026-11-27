# ZUNO Music — Supabase hesap ve bulut eşitleme

## 1. Ayrı bir Supabase projesi oluştur

ZUNO Music için yeni bir proje oluştur. Başka bir uygulamanın (ör. VYRA) veritabanını ZUNO ile paylaşma.

## 2. Veritabanı tablosunu hazırla

Yeni projenin SQL Editor bölümünde `supabase/zuno_user_state.sql` dosyasının tamamını çalıştır. Bu tablo yalnızca giriş yapan kullanıcının kendi satırını görmesine ve değiştirmesine izin veren RLS kurallarıyla korunur.

## 3. E-posta ile kaydı aç

Authentication → Sign In / Providers bölümünde Email sağlayıcısını etkinleştir. E-posta doğrulamasını açık tutabilirsin. Authentication → URL Configuration bölümündeki Site URL ve Redirect URLs listesine uygulamanın yayın adresini ekle.

## 4. Uygulama anahtarlarını tanımla

Supabase projesinin Project URL ve Publishable key değerlerini al. Yerel geliştirmede proje kökünde `.env.local` dosyası oluştur:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Aynı iki değişkeni uygulamanın yayın/build ortamına da ekle ve yeni build al. Bu anahtarlar tarayıcıya gönderilir; bu nedenle yalnızca publishable key kullan. `service_role` veya `sb_secret_` anahtarını hiçbir zaman `VITE_` değişkenine koyma.

## 5. Neler eşitlenir?

- Tema, vurgu rengi, oynatma ve diğer uygulama ayarları
- Favoriler, son dinlenen parça kimlikleri, kişisel çalma listeleri ve arama geçmişi
- Aynı hesapla giriş yapılan diğer cihazlarda değişiklikler Realtime üzerinden otomatik alınır

İçe aktarılan ses dosyaları, çevrimdışı indirmeler ve oynatma kuyruğu cihazda kalır. Ses dosyaları otomatik olarak sunucuya yüklenmez. Başka cihazda bu dosyaları ayrıca içe aktarmak gerekir.

## 6. Güvenlik

Veri tablosu `authenticated` rolüne açılır; `anon` rolüne erişim verilmez. RLS her sorguda `auth.uid()` ile sahipliği kontrol eder. Uygulama kodunda servis rolü veya gizli sunucu anahtarı bulunmaz.
