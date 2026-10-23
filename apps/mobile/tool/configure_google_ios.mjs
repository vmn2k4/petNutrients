// Adds the iOS Google client ID to the app: node tool/configure_google_ios.mjs <iOS client ID>
// Writes the reversed client ID URL scheme (Google's sign-in comes back to the app through it) and GIDClientID into ios/Runner/Info.plist.
import { readFileSync, writeFileSync } from 'node:fs';

const id = process.argv[2];
if (!id || !id.endsWith('.apps.googleusercontent.com')) { console.error('Usage: node tool/configure_google_ios.mjs 1234-abc.apps.googleusercontent.com'); process.exit(1); }
const reversed = id.split('.').reverse().join('.');
const path = new URL('../ios/Runner/Info.plist', import.meta.url);
let s = readFileSync(path, 'utf8');
s = s.replace(/\s*<key>GIDClientID<\/key>\s*<string>[^<]*<\/string>/, '');
s = s.replace(/\s*<dict>\s*<key>CFBundleURLName<\/key>\s*<string>google<\/string>[\s\S]*?<\/dict>/, '');
s = s.replace('<key>CFBundleURLTypes</key>\n\t<array>', `<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>google</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${reversed}</string>\n\t\t\t</array>\n\t\t</dict>`);
s = s.replace('</dict>\n</plist>', `\t<key>GIDClientID</key>\n\t<string>${id}</string>\n</dict>\n</plist>`);
writeFileSync(path, s);
console.log('iOS configured. URL scheme:', reversed);
