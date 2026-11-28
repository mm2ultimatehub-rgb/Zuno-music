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

const dependenciesBlock = locateBlock(gradle, /\bdependencies\s*\{/);
if (!dependenciesBlock) throw new Error('Could not locate Android dependencies block.');
if (!gradle.includes('androidx.media3:media3-exoplayer')) {
  const media3Dependencies = `
    implementation "androidx.media3:media3-exoplayer:1.11.1"
    implementation "androidx.media3:media3-session:1.11.1"
`;
  gradle = gradle.slice(0, dependenciesBlock.close) + media3Dependencies + gradle.slice(dependenciesBlock.close);
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

// Install a native Media3 foreground service so Android playback survives
// screen-off/background transitions and exposes lock-screen media controls.
const capacitorConfig = fs.readFileSync(path.resolve('capacitor.config.ts'), 'utf8');
const appIdMatch = capacitorConfig.match(/appId:\s*['"]([^'"]+)['"]/);
if (!appIdMatch) throw new Error('Could not read appId from capacitor.config.ts.');
const appId = appIdMatch[1];
const packagePath = appId.split('.').join('/');
const appJavaRoot = path.resolve('android/app/src/main/java');
const nativePackagePath = path.join(appJavaRoot, packagePath, 'nativeplayback');
fs.mkdirSync(nativePackagePath, { recursive: true });

const permissions = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.WAKE_LOCK',
  'android.permission.INTERNET',
];
for (const permission of permissions) {
  const declaration = `<uses-permission android:name="${permission}" />`;
  if (!manifest.includes(declaration)) {
    const applicationTag = manifest.indexOf('<application');
    if (applicationTag < 0) throw new Error('Could not locate the Android application manifest element.');
    manifest = manifest.slice(0, applicationTag) + `    ${declaration}\n    ` + manifest.slice(applicationTag);
  }
}
if (!manifest.includes('android:name=".nativeplayback.ZunoPlaybackService"')) {
  const applicationClose = manifest.lastIndexOf('</application>');
  if (applicationClose < 0) throw new Error('Could not locate the Android application closing tag.');
  const serviceDeclaration = `
        <service
            android:name=".nativeplayback.ZunoPlaybackService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>
`;
  manifest = manifest.slice(0, applicationClose) + serviceDeclaration + manifest.slice(applicationClose);
}

const serviceSource = `package ${appId}.nativeplayback;

import android.content.Intent;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public final class ZunoPlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY = "${appId}.PLAY";
    public static final String ACTION_PAUSE = "${appId}.PAUSE";
    public static final String ACTION_RESUME = "${appId}.RESUME";
    public static final String ACTION_STOP = "${appId}.STOP";

    private static volatile ZunoPlaybackService instance;
    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(
            new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            true
        );
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_PLAY.equals(action)) {
                String url = intent.getStringExtra("url");
                if (url != null && url.startsWith("https://")) {
                    MediaMetadata metadata = new MediaMetadata.Builder()
                        .setTitle(intent.getStringExtra("title"))
                        .setArtist(intent.getStringExtra("artist"))
                        .setAlbumTitle(intent.getStringExtra("album"))
                        .setArtworkUri(parseUri(intent.getStringExtra("artworkUrl")))
                        .build();
                    MediaItem item = new MediaItem.Builder()
                        .setUri(Uri.parse(url))
                        .setMediaMetadata(metadata)
                        .build();
                    player.setMediaItem(item);
                    player.prepare();
                    player.play();
                }
            } else if (ACTION_PAUSE.equals(action)) {
                player.pause();
            } else if (ACTION_RESUME.equals(action)) {
                player.play();
            } else if (ACTION_STOP.equals(action)) {
                player.stop();
                player.clearMediaItems();
            }
        }
        return super.onStartCommand(intent, flags, startId);
    }

    private static Uri parseUri(String value) {
        return value == null || value.isEmpty() ? null : Uri.parse(value);
    }

    public static ZunoPlaybackService getInstance() {
        return instance;
    }

    public ExoPlayer getPlayer() {
        return player;
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }
}
`;

const pluginSource = `package ${appId}.nativeplayback;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ZunoPlayback")
public final class ZunoPlaybackPlugin extends Plugin {
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("A valid HTTPS audio stream URL is required.");
            return;
        }
        Intent intent = new Intent(getContext(), ZunoPlaybackService.class)
            .setAction(ZunoPlaybackService.ACTION_PLAY)
            .putExtra("url", url)
            .putExtra("title", call.getString("title", "ZUNO Music"))
            .putExtra("artist", call.getString("artist", ""))
            .putExtra("album", call.getString("album", ""))
            .putExtra("artworkUrl", call.getString("artworkUrl", ""));
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not start native playback service: " + error.getMessage());
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        sendAction(call, ZunoPlaybackService.ACTION_PAUSE);
    }

    @PluginMethod
    public void resume(PluginCall call) {
        sendAction(call, ZunoPlaybackService.ACTION_RESUME);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        sendAction(call, ZunoPlaybackService.ACTION_STOP);
    }

    private void sendAction(PluginCall call, String action) {
        ZunoPlaybackService service = ZunoPlaybackService.getInstance();
        if (service == null) {
            call.resolve();
            return;
        }
        Intent intent = new Intent(getContext(), ZunoPlaybackService.class).setAction(action);
        try {
            getContext().startService(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Native playback command failed: " + error.getMessage());
        }
    }

    @PluginMethod
    public void seek(PluginCall call) {
        ZunoPlaybackService service = ZunoPlaybackService.getInstance();
        if (service == null || service.getPlayer() == null) {
            call.reject("Native playback is not active.");
            return;
        }
        long positionMs = call.getData().optLong("positionMs", 0L);
        service.getPlayer().seekTo(Math.max(0L, positionMs));
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        ZunoPlaybackService service = ZunoPlaybackService.getInstance();
        ExoPlayer player = service == null ? null : service.getPlayer();
        JSObject state = new JSObject();
        state.put("isPlaying", player != null && player.isPlaying());
        state.put("positionMs", player == null ? 0L : player.getCurrentPosition());
        long duration = player == null ? 0L : player.getDuration();
        state.put("durationMs", duration < 0L ? 0L : duration);
        if (player != null && player.getPlayerError() != null) {
            state.put("errorMessage", player.getPlayerError().getMessage());
        }
        call.resolve(state);
    }
}
`;

fs.writeFileSync(path.join(nativePackagePath, 'ZunoPlaybackService.java'), serviceSource);
fs.writeFileSync(path.join(nativePackagePath, 'ZunoPlaybackPlugin.java'), pluginSource);

const mainActivityPath = path.resolve('android/app/src/main/java', ...appId.split('.'), 'MainActivity.java');
if (!fs.existsSync(mainActivityPath)) {
  throw new Error('Could not locate generated Android MainActivity.java for native playback registration.');
}
let mainActivity = fs.readFileSync(mainActivityPath, 'utf8');
const pluginImport = `import ${appId}.nativeplayback.ZunoPlaybackPlugin;`;
if (!mainActivity.includes(pluginImport)) {
  const packageEnd = mainActivity.indexOf('\n');
  mainActivity = mainActivity.slice(0, packageEnd + 1) + `\n${pluginImport}\n` + mainActivity.slice(packageEnd + 1);
}
if (!mainActivity.includes('registerPlugin(ZunoPlaybackPlugin.class)')) {
  const classOpen = mainActivity.indexOf('{', mainActivity.indexOf('class MainActivity'));
  const classClose = mainActivity.lastIndexOf('}');
  if (classOpen < 0 || classClose < classOpen) throw new Error('Could not patch generated MainActivity class.');
  const onCreate = `
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ZunoPlaybackPlugin.class);
        super.onCreate(savedInstanceState);
    }
`;
  mainActivity = mainActivity.slice(0, classOpen + 1) + onCreate + mainActivity.slice(classClose);
}
fs.writeFileSync(mainActivityPath, mainActivity);

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
console.log('Installed Android deep links, adaptive launcher icons, and Media3 background playback service.');
console.log(keystorePath ? 'Release signing configuration enabled.' : 'No release keystore detected; debug build only.');
