export interface ZunoReleaseCheck {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  releaseNotes: string;
  apkDownloadUrl: string | null;
  platformDownloadUrl: string | null;
  platformDownloadLabel: string | null;
}

interface ReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

function getPlatformDownload(assets: ReleaseAsset[]): { url: string; label: string } | null {
  const platform = typeof navigator === 'undefined'
    ? ''
    : `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  const isIPad = typeof navigator !== 'undefined'
    && (/ipad/.test(platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  if (isIPad) return null;

  const choose = (extensions: string[], label: string) => {
    const asset = assets.find((item) =>
      extensions.some((extension) => item.name?.toLowerCase().endsWith(extension))
      && Boolean(item.browser_download_url)
    );
    return asset?.browser_download_url ? { url: asset.browser_download_url, label } : null;
  };

  if (/android/.test(platform)) return choose(['.apk'], 'Android APK indir');
  if (/windows|win32/.test(platform)) {
    return choose(['.exe', '.msi'], 'Windows güncellemesini indir');
  }
  if (/macintosh|mac os|macintel|darwin/.test(platform)) {
    return choose(['.dmg', '.pkg'], 'macOS güncellemesini indir');
  }
  if (/linux|x11/.test(platform)) {
    return choose(['.appimage', '.deb', '.rpm'], 'Linux güncellemesini indir');
  }
  return null;
}

const REPOSITORY = 'mm2ultimatehub-rgb/Zuno-music';

function normalizeVersion(value: string): number[] {
  return value.replace(/^v/i, '').split(/[+-]/, 1)[0].split('.').map((part) => {
    const match = part.match(/^\d+/);
    return match ? Number.parseInt(match[0], 10) : 0;
  });
}

function isNewerVersion(latest: string, current: string): boolean {
  const a = normalizeVersion(latest);
  const b = normalizeVersion(current);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] || 0;
    const right = b[index] || 0;
    if (left !== right) return left > right;
  }
  return false;
}

export async function checkForZunoUpdate(): Promise<ZunoReleaseCheck> {
  const currentVersion = (import.meta.env.VITE_APP_VERSION || '0.1.0').replace(/^v/i, '');
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    throw new Error('Henüz yayımlanmış bir ZUNO sürümü yok. İlk sürüm GitHub Releases bölümünde yayımlandığında burada görünecek.');
  }
  if (!response.ok) {
    throw new Error(`Güncelleme sunucusuna ulaşılamadı (HTTP ${response.status}).`);
  }

  const release = await response.json() as {
    tag_name?: string;
    html_url?: string;
    body?: string;
    assets?: ReleaseAsset[];
    draft?: boolean;
    prerelease?: boolean;
  };

  const latestVersion = (release.tag_name || '').replace(/^v/i, '');
  if (!latestVersion || release.draft || release.prerelease) {
    throw new Error('Yayımlanmış kararlı bir sürüm bulunamadı.');
  }

  const assets = release.assets || [];
  const apk = assets.find((asset) => asset.name?.toLowerCase().endsWith('.apk') && asset.browser_download_url);
  const platformDownload = getPlatformDownload(assets);
  return {
    currentVersion,
    latestVersion,
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    releaseUrl: release.html_url || `https://github.com/${REPOSITORY}/releases`,
    releaseNotes: release.body || '',
    apkDownloadUrl: apk?.browser_download_url || null,
    platformDownloadUrl: platformDownload?.url || null,
    platformDownloadLabel: platformDownload?.label || null,
  };
}
