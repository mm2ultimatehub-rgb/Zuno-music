import fs from 'node:fs';

const requestedVersion = (process.env.ZUNO_VERSION_NAME || '').trim();
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = requestedVersion || packageJson.version;

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid ZUNO version: ${version}`);
}

const configPath = 'src-tauri/tauri.conf.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.version = version;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(`Native desktop version set to ${version}`);
