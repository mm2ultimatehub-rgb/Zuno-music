# ZUNO Music — Supabase hesap ve bulut eşitleme

## 1. ZUNO projesi

ZUNO için ayrı Supabase projesi oluşturuldu: [ZUNO Music Dashboard](https://supabase.com/dashboard/project/vjdrndrqxlmvzzrqiaej). Bölge: `eu-central-1`. VYRA projesinden bağımsızdır. Yeni bir proje oluşturman gerekmiyor.

## 2. Veritabanı tablosunu hazırla

Yeni projenin veritabanında `supabase/zuno_user_state.sql` migration'ı uygulandı. `public.zuno_user_state` tablosu, RLS ve kullanıcıya özel SELECT/INSERT/UPDATE/DELETE politikaları kuruldu; Realtime yayınına eklendi. Bu kurulum 27 Kasım 2026 tarihinde doğrulandı. Aynı SQL'i tekrar çalıştırman gerekmiyor.

## 3. E-posta ile kaydı aç

Authentication → Sign In / Providers bölümünde Email sağlayıcısını etkinleştir ve e-posta doğrulamasını açık tut. Password policy bölümünde minimum şifre uzunluğunu 8 karakter yap. Authentication → URL Configuration bölümündeki Site URL ve Redirect URLs listesine uygulamanın tam yayın adresini (origin) ekle. Şifre sıfırlama e-postası da aynı adrese döner; yayın adresi değişirse izin verilen yönlendirme adreslerini güncelle.

## 4. Şifre kurtarma

Giriş ekranındaki **Şifremi unuttum** bağlantısı, girilen e-posta adresi için Supabase sıfırlama e-postası ister. Kullanıcı e-postadaki bağlantıyı uygulamada açtığında yeni şifre belirleme ekranı otomatik açılır. Bu akışın çalışması için bir önceki adımda uygulamanın yayın adresinin Redirect URLs listesinde bulunması gerekir.

## 5. Uygulama anahtarlarını tanımla

ZUNO'nun özel Supabase Project URL ve publishable key değerleri uygulama istemcisine varsayılan olarak bağlandı. Normal kullanımda bunları elle girmen gerekmiyor. Farklı bir ortam veya proje kullanırken değerleri geçersiz kılmak için proje kökünde `.env.local` dosyası oluştur:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Farklı değer kullanıyorsan aynı iki değişkeni uygulamanın yayın/build ortamına da ekle ve yeni build al. Publishable key tarayıcıya gönderilir; bu nedenle yalnızca publishable key kullan. `service_role` veya `sb_secret_` anahtarını hiçbir zaman `VITE_` değişkenine koyma.

## 6. Neler eşitlenir?

- Tema, vurgu rengi, oynatma ve diğer uygulama ayarları
- Favoriler, son dinlenen parça kimlikleri, kişisel çalma listeleri ve arama geçmişi
- Aynı hesapla giriş yapılan diğer cihazlarda değişiklikler Realtime üzerinden otomatik alınır

İçe aktarılan ses dosyaları, çevrimdışı indirmeler ve oynatma kuyruğu cihazda kalır. Ses dosyaları otomatik olarak sunucuya yüklenmez. Başka cihazda bu dosyaları ayrıca içe aktarmak gerekir.

## 7. Güvenlik

Veri tablosu yalnızca `authenticated` rolüne açılır; `anon` ve `PUBLIC` izinleri açıkça kaldırılmıştır. RLS her sorguda `auth.uid()` ile sahipliği kontrol eder. Güvenlik ve performans danışmanlarında uyarı bulunmadı. Uygulama kodunda servis rolü veya gizli sunucu anahtarı bulunmaz.
