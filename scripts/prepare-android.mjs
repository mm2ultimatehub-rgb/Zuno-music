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
if (!manifest.includes('android:scheme="zuno"')) {
  const activityStart = manifest.indexOf('<activity');
  const activityOpenEnd = activityStart >= 0 ? manifest.indexOf('>', activityStart) : -1;
  const activityClose = activityOpenEnd >= 0 ? manifest.indexOf('</activity>', activityOpenEnd) : -1;
  if (activityStart < 0 || activityOpenEnd < 0 || activityClose < 0) {
    throw new Error('Could not locate the Android MainActivity in AndroidManifest.xml.');
  }

  const activityTag = manifest.slice(activityStart, activityOpenEnd + 1);
  if (!activityTag.includes('android:launchMode=')) {
    manifest = manifest.slice(0, activityOpenEnd)
      + ' android:launchMode="singleTask"'
      + manifest.slice(activityOpenEnd);
  }

  const insertAt = manifest.indexOf('</activity>', activityOpenEnd);
  const deepLink = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="zuno" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>
`;
  manifest = manifest.slice(0, insertAt) + deepLink + manifest.slice(insertAt);
}
fs.writeFileSync(manifestPath, manifest);

console.log(`Prepared ZUNO Android package v${versionName} (versionCode ${versionCode}).`);
console.log(keystorePath ? 'Release signing configuration enabled.' : 'No release keystore detected; debug build only.');
