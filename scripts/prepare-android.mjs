import fs from 'node:fs';
import path from 'node:path';

const appGradlePath = path.resolve('android/app/build.gradle');
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(appGradlePath) || !fs.existsSync(manifestPath)) {
  throw new Error('Capacitor Android project was not generated before prepare-android.');
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionName = process.env.ZUNO_VERSION_NAME || packageJson.version;
const rawVersionCode = Number.parseInt(process.env.ZUNO_VERSION_CODE || '1', 10);
const versionCode = Number.isInteger(rawVersionCode) && rawVersionCode > 0
  ? Math.min(rawVersionCode, 2_100_000_000)
  : 1;

function locateBlock(source, pattern, startAt = 0) {
  const match = pattern.exec(source.slice(startAt));
  if (!match) return null;
  const matchStart = startAt + match.index;
  const open = source.indexOf('{', matchStart);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: matchStart, open, close: i };
    }
  }
  return null;
}

let gradle = fs.readFileSync(appGradlePath, 'utf8');
const defaultConfig = locateBlock(gradle, /\bdefaultConfig\s*\{/);
if (!defaultConfig) throw new Error('Could not locate Android defaultConfig block.');
const defaultBody = gradle.slice(defaultConfig.open + 1, defaultConfig.close)
  .replace(/\bversionCode\s*[= ]\s*\d+/, `versionCode ${versionCode}`)
  .replace(/\bversionName\s*[= ]\s*["'][^"']+["']/, `versionName "${versionName}"`);
gradle = gradle.slice(0, defaultConfig.open + 1) + defaultBody + gradle.slice(defaultConfig.close);

const keystorePath = process.env.ZUNO_KEYSTORE_PATH;
if (keystorePath) {
  const androidBlock = locateBlock(gradle, /\bandroid\s*\{/);
  if (!androidBlock) throw new Error('Could not locate Android Gradle configuration.');
  const signingConfig = `
    signingConfigs {
        zunoRelease {
            storeFile file(System.getenv("ZUNO_KEYSTORE_PATH"))
            storePassword System.getenv("ZUNO_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ZUNO_KEY_ALIAS")
            keyPassword System.getenv("ZUNO_KEY_PASSWORD")
        }
    }
`;
  gradle = gradle.slice(0, androidBlock.open + 1) + signingConfig + gradle.slice(androidBlock.open + 1);

  const buildTypes = locateBlock(gradle, /\bbuildTypes\s*\{/);
  const releaseBlock = buildTypes
    ? locateBlock(gradle, /\brelease\s*\{/, buildTypes.open + 1)
    : null;
  if (!releaseBlock) throw new Error('Could not locate Android release build type.');
  gradle = gradle.slice(0, releaseBlock.open + 1)
    + '\n            signingConfig signingConfigs.zunoRelease\n'
    + gradle.slice(releaseBlock.open + 1);
}

fs.writeFileSync(appGradlePath, gradle);

let manifest = fs.readFileSync(manifestPath, 'utf8');
const activityStart = manifest.indexOf('<activity');
const activityOpenEnd = activityStart >= 0 ? manifest.indexOf('>', activityStart) : -1;
if (activityStart < 0 || activityOpenEnd < 0 || !manifest.includes('</activity>')) {
  throw new Error('Could not locate the Android MainActivity in AndroidManifest.xml.');
}
const activityTag = manifest.slice(activityStart, activityOpenEnd + 1);
if (!activityTag.includes('android:launchMode=')) {
  manifest = manifest.slice(0, activityOpenEnd)
    + ' android:launchMode="singleTask"'
    + manifest.slice(activityOpenEnd);
}

const addIntentFilter = (marker, xml) => {
  if (manifest.includes(marker)) return;
  const insertAt = manifest.indexOf('</activity>', activityStart);
  if (insertAt < 0) throw new Error('Could not locate the MainActivity closing tag.');
  manifest = manifest.slice(0, insertAt) + xml + manifest.slice(insertAt);
};

addIntentFilter('android:scheme="zuno" android:host="auth"', `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="zuno" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>
`);
addIntentFilter('android:scheme="zunomusic" android:host="import"', `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="zunomusic" android:host="import" />
            </intent-filter>
`);

const resourceRoot = path.resolve('android/app/src/main/res');
const writeResource = (relativePath, source) => {
  const destination = path.join(resourceRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source);
};

// Native Android launcher icon. The silver waveform is derived from the ZUNO Music SVG mark.
const foregroundIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="512" android:viewportHeight="512">
    <group android:scaleX="0.76" android:scaleY="0.76" android:pivotX="256" android:pivotY="256">
        <path android:fillColor="#090B0C"
            android:pathData="M256,49 A207,207 0,1 1,255.9 49 Z" />
        <path android:fillColor="#171B1D" android:strokeColor="#BFC5C7" android:strokeWidth="18"
            android:pathData="M256,84 A166,166 0,1 1,255.9 84 Z" />
        <path android:fillColor="#00000000" android:strokeColor="#E7EAEB"
            android:strokeWidth="35" android:strokeLineCap="round" android:strokeLineJoin="round"
            android:pathData="M87,262 C102,298 122,313 149,312 C187,311 201,268 217,234 C233,199 251,198 265,238 C277,274 287,329 309,343 C334,359 351,305 364,252 C374,211 387,180 408,183 C435,187 452,228 459,261" />
        <path android:fillColor="#00000000" android:strokeColor="#FFFFFF"
            android:strokeAlpha="0.38" android:strokeWidth="3" android:strokeLineCap="round"
            android:pathData="M87,246 C102,282 122,297 149,296 C187,295 201,252 217,218 C233,183 251,182 265,222 C277,258 287,313 309,327 C334,343 351,289 364,236 C374,195 387,164 408,167 C435,171 452,212 459,245" />
    </group>
</vector>
`;
const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/zuno_icon_background" />
    <foreground android:drawable="@drawable/zuno_icon_foreground" />
</adaptive-icon>
`;
writeResource('drawable/zuno_icon_foreground.xml', foregroundIcon);
writeResource('values/zuno_icon_background.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="zuno_icon_background">#090B0C</color></resources>
`);
writeResource('mipmap-anydpi-v26/ic_launcher.xml', adaptiveIcon);
writeResource('mipmap-anydpi-v26/ic_launcher_round.xml', adaptiveIcon);

fs.writeFileSync(manifestPath, manifest);

console.log(`Prepared ZUNO Music Android package v${versionName} (versionCode ${versionCode}).`);
console.log('Installed Android deep links and adaptive launcher icons.');
console.log(keystorePath ? 'Release signing configuration enabled.' : 'No release keystore detected; debug build only.');
