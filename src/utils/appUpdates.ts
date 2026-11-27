export interface ZunoReleaseCheck {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  releaseNotes: string;
  apkDownloadUrl: string | null;
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
    assets?: Array<{ name?: string; browser_download_url?: string }>;
    draft?: boolean;
    prerelease?: boolean;
  };

  const latestVersion = (release.tag_name || '').replace(/^v/i, '');
  if (!latestVersion || release.draft || release.prerelease) {
    throw new Error('Yayımlanmış kararlı bir sürüm bulunamadı.');
  }

  const apk = (release.assets || []).find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
  return {
    currentVersion,
    latestVersion,
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    releaseUrl: release.html_url || `https://github.com/${REPOSITORY}/releases`,
    releaseNotes: release.body || '',
    apkDownloadUrl: apk?.browser_download_url || null,
  };
}
