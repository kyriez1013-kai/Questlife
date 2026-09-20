const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs/promises');
const { readFileSync, readdirSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { AndroidConfig } = require('@expo/config-plugins');
const { parseXMLAsync } = require('@expo/config-plugins/build/utils/XML');
const plugin = require('../../plugins/with-questlife-widget');

const root = path.resolve(__dirname, '../..');
const appPackage = 'com.kyrie.questlife';
const nativeSource = 'java/com/kyrie/questlife/widget/QuestLifeWidgetProvider.kt';
const config = () => ({ name: 'QuestLife', slug: 'QuestLife', scheme: 'questlife', android: { package: appPackage }, ios: { bundleIdentifier: appPackage } });
const fixture = () => ({ manifest: {
  $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android', package: appPackage },
  'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
  application: [{ $: { 'android:name': '.MainApplication', 'android:label': 'QuestLife' }, activity: [{
    $: { 'android:name': '.MainActivity', 'android:launchMode': 'singleTask', 'android:exported': 'true' },
    'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }] }],
  }], receiver: [{ $: { 'android:name': '.UnrelatedReceiver', 'android:exported': 'false' } }] }],
} });

let temp;
let generatedRoot;
let modifiedManifest;
let files;
const read = relative => fs.readFile(path.join(generatedRoot, relative), 'utf8');
const parse = async relative => parseXMLAsync(await read(relative));
const request = () => ({ platform: 'android', projectRoot: temp, platformProjectRoot: path.join(temp, 'android') });
async function manifestMod(value = fixture(), applyTwice = false) {
  let c = plugin(config());
  if (applyTwice) c = plugin(c);
  return (await c.mods.android.manifest({ ...c, modResults: value, modRequest: request() })).modResults;
}
async function generate() {
  const c = plugin(config());
  await c.mods.android.dangerous({ ...c, modResults: {}, modRequest: request() });
}
function loadTs(file, mocks = {}) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports, URL,
    require: name => name in mocks ? mocks[name] : loadTs(path.resolve(path.dirname(file), `${name}.ts`)),
  }, { filename: file });
  return module.exports;
}

before(async () => {
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'questlife-widget-test-'));
  generatedRoot = path.join(temp, 'android/app/src/main');
  await generate();
  modifiedManifest = await manifestMod();
  files = (await fs.readdir(generatedRoot, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).map(entry => path.relative(generatedRoot, path.join(entry.parentPath, entry.name))).sort();
});
after(async () => { if (temp) await fs.rm(temp, { recursive: true, force: true }); });

test('plugin adds only Android mods and leaves app configuration untouched', () => {
  const original = config();
  const result = plugin(structuredClone(original));
  const { mods, ...rest } = result;
  assert.deepEqual(rest, original);
  assert.deepEqual(Object.keys(mods), ['android']);
  assert.deepEqual(Object.keys(mods.android).sort(), ['dangerous', 'manifest']);
});

test('missing scheme or unsafe package fail before generation', () => {
  for (const packageName of [undefined, '../../other', 'com.bad-package', 'com.example;import']) {
    assert.throws(() => plugin({ ...config(), android: { package: packageName } }), /android.package/);
  }
  assert.throws(() => plugin({ ...config(), scheme: 'other' }), /questlife URL scheme/);
  assert.doesNotThrow(() => plugin({ ...config(), scheme: ['other', 'questlife'] }));
});

test('receiver registration is idempotent and preserves unrelated manifest entries', async () => {
  const once = await manifestMod();
  const twice = await manifestMod(structuredClone(once), true);
  assert.deepEqual(twice, once);
  const original = fixture();
  const app = twice.manifest.application[0];
  assert.deepEqual(app.activity, original.manifest.application[0].activity);
  assert.deepEqual(twice.manifest['uses-permission'], original.manifest['uses-permission']);
  assert.deepEqual(app.receiver[0], original.manifest.application[0].receiver[0]);
  assert.equal(app.receiver.length, 2);
  assert.equal(app.receiver[1].$['android:exported'], 'false');
  assert.equal(app.receiver[1]['meta-data'][0].$['android:resource'], '@xml/questlife_widget_info');
  const qualified = structuredClone(once);
  qualified.manifest.application[0].receiver[1].$['android:name'] = `${appPackage}.widget.QuestLifeWidgetProvider`;
  assert.deepEqual(await manifestMod(qualified), once);
});

test('a changed activity entrance fails explicitly instead of generating a broken destination', async () => {
  const changed = fixture();
  changed.manifest.application[0].activity[0].$['android:launchMode'] = 'standard';
  await assert.rejects(manifestMod(changed), /singleTask MainActivity/);
});

test('generation is confined to six owned native files and can be repeated safely', async () => {
  assert.deepEqual(files, [nativeSource, 'res/layout/questlife_widget.xml', 'res/values-night/questlife_widget.xml', 'res/values-zh/questlife_widget.xml', 'res/values/questlife_widget.xml', 'res/xml/questlife_widget_info.xml'].sort());
  const previous = await Promise.all(files.map(read));
  const unrelated = path.join(generatedRoot, 'res/values/unrelated.xml');
  await fs.writeFile(unrelated, '<resources />');
  await generate();
  assert.deepEqual(await Promise.all(files.map(read)), previous);
  assert.equal(await fs.readFile(unrelated, 'utf8'), '<resources />');
  await fs.unlink(unrelated);
});

test('all generated resource XML parses with the installed Expo XML parser', async () => {
  for (const file of files.filter(file => file.endsWith('.xml'))) assert.ok(await parse(file));
});

test('widget has no polling, lock-screen surface, configuration or fabricated data', async () => {
  const info = (await parse('res/xml/questlife_widget_info.xml'))['appwidget-provider'].$;
  assert.equal(info['android:updatePeriodMillis'], '0');
  assert.equal(info['android:widgetCategory'], 'home_screen');
  assert.equal(info['android:configure'], undefined);
  assert.equal(info['android:initialLayout'], '@layout/questlife_widget');
  assert.equal(info['android:previewLayout'], '@layout/questlife_widget');
  assert.equal(info['android:minResizeHeight'], info['android:minHeight']);
  assert.equal(info['android:minResizeWidth'], info['android:minWidth']);
  const source = await read(nativeSource);
  assert.doesNotMatch(source, /SharedPreferences|AsyncStorage|WorkManager|AlarmManager|Http|ReactContext|startService|startActivity\(|putExtra|\.send\(/);
  assert.match(source, /ACTION_LOCALE_CHANGED/);
  assert.match(source, /ACTION_MY_PACKAGE_REPLACED/);
  assert.match(source, /onAppWidgetOptionsChanged/);
});

test('both buttons have separate nonoverlapping 48dp targets and scalable platform typography', async () => {
  const layout = (await parse('res/layout/questlife_widget.xml')).LinearLayout;
  const values = (await parse('res/values/questlife_widget.xml')).resources;
  const dimen = Object.fromEntries(values.dimen.map(value => [value.$.name, value._]));
  const tokens = loadTs(path.join(root, 'src/design/tokens.ts'), { 'react-native': {} });
  assert.equal(dimen.questlife_widget_target, `${tokens.questLayout.editCardMinHeight.small}dp`);
  assert.equal(dimen.questlife_widget_gap, `${tokens.questThemes.cleanFocus.spacing.sm}dp`);
  assert.equal(dimen.questlife_widget_padding, `${tokens.questThemes.cleanFocus.spacing.lg}dp`);
  assert.ok(parseInt(dimen.questlife_widget_target, 10) >= 44);
  assert.equal(layout.$['android:orientation'], 'vertical');
  assert.equal(layout.$['android:theme'], '@style/QuestLifeWidgetTheme');
  assert.equal(values.style[0].$['parent'], '@android:style/Theme.DeviceDefault.Light');
  assert.equal((await parse('res/values-night/questlife_widget.xml')).resources.style[0].$['parent'], '@android:style/Theme.DeviceDefault');
  assert.equal(layout.Button.length, 2);
  for (const button of layout.Button) {
    assert.equal(button.$['android:minHeight'], '@dimen/questlife_widget_target');
    assert.equal(button.$['android:minWidth'], '@dimen/questlife_widget_target');
    assert.equal(button.$['android:layout_width'], 'match_parent');
    assert.equal(button.$['android:layout_height'], 'wrap_content');
    assert.equal(button.$['android:textAllCaps'], 'false');
    assert.match(button.$['android:contentDescription'], /^@string\/questlife_widget_open_/);
    assert.equal(button.$['android:singleLine'], undefined);
  }
});

test('English and Chinese localize the same five labels without owner data', async () => {
  const en = (await parse('res/values/questlife_widget.xml')).resources.string;
  const zh = (await parse('res/values-zh/questlife_widget.xml')).resources.string;
  assert.deepEqual(en.filter(value => value.$.translatable !== 'false').map(value => value.$.name).sort(), zh.map(value => value.$.name).sort());
  assert.equal(en.find(value => value.$.name === 'questlife_widget_plan')._, 'Current plan');
  assert.equal(zh.find(value => value.$.name === 'questlife_widget_plan')._, '\u5f53\u524d\u8ba1\u5212');
  assert.equal(zh.find(value => value.$.name === 'questlife_widget_record')._, '\u8bb0\u5f55');
  for (const value of [...en, ...zh]) assert.doesNotMatch(value._, /%[\ds]|\d|XP|streak/i);
});

test('native launch intents are explicit, immutable and distinct by URL and widget id', async () => {
  const source = await read(nativeSource);
  assert.match(source, /Intent\(Intent.ACTION_VIEW, Uri.parse\(url\), context, MainActivity::class.java\)/);
  assert.match(source, /FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP/);
  assert.match(source, /getActivity\(context, widgetId, intent,/);
  assert.match(source, /FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE/);
  assert.doesNotMatch(source, /FLAG_MUTABLE|getBroadcast|getService/);
  assert.match(source, /Build.VERSION.SDK_INT >= 35/);
  for (const url of Object.values(plugin.widgetEntries)) assert.equal(source.split(`"${url}"`).length - 1, 1);
});

test('both emitted URLs resolve through the real shared open-only contract', () => {
  const { deepLinkIntent, shortcutIntent } = loadTs(path.join(root, 'src/platform/shortcuts/intent.ts'));
  for (const [url, route, kind] of [
    [plugin.widgetEntries.record, 'capture', 'quick_capture'],
    [plugin.widgetEntries.plan, 'plan', 'current_plan'],
  ]) {
    const intent = deepLinkIntent(url);
    assert.ok(intent, `Parent integration missing shared route: ${url}`);
    assert.equal(intent.action, 'OPEN');
    assert.equal(intent.kind, kind);
    assert.equal(JSON.stringify(intent), JSON.stringify(shortcutIntent(route)));
    assert.equal(deepLinkIntent(`${url}?save=true`), null);
  }
});

test('Android 36 resources link and generated Kotlin compiles against native APIs', {
  skip: process.env.QUESTLIFE_WIDGET_COMPILE !== '1' ? 'Set QUESTLIFE_WIDGET_COMPILE=1 with Android SDK and JDK to run native compilation.' : false,
}, async () => {
  assert.ok(process.env.ANDROID_HOME, 'ANDROID_HOME is required');
  assert.ok(process.env.JAVA_HOME, 'JAVA_HOME is required');
  const sdk = process.env.ANDROID_HOME;
  const androidJar = path.join(sdk, 'platforms/android-36/android.jar');
  const aapt = path.join(sdk, 'build-tools/36.0.0/aapt2');
  const java = path.join(process.env.JAVA_HOME, 'bin/java');
  const javac = path.join(process.env.JAVA_HOME, 'bin/javac');
  const manifest = path.join(temp, 'AndroidManifest.xml');
  const classes = path.join(temp, 'classes');
  const resources = path.join(temp, 'compiled.zip');
  const generatedJava = path.join(temp, 'generated');
  await fs.mkdir(classes);
  await AndroidConfig.Manifest.writeAndroidManifestAsync(manifest, modifiedManifest);
  execFileSync(aapt, ['compile', '--dir', path.join(generatedRoot, 'res'), '-o', resources]);
  execFileSync(aapt, ['link', '-I', androidJar, '--manifest', manifest, '--min-sdk-version', '26', '--target-sdk-version', '36', '--java', generatedJava, '-o', path.join(temp, 'resources.apk'), resources]);
  const mainActivity = path.join(temp, 'MainActivity.java');
  // Only the symbol dependency is stubbed. All widget APIs and resources compile against Android 36.
  await fs.writeFile(mainActivity, `package ${appPackage}; public class MainActivity extends android.app.Activity {}`);
  execFileSync(javac, ['-classpath', androidJar, '-d', classes, mainActivity, path.join(generatedJava, 'com/kyrie/questlife/R.java')]);
  const cache = path.join(process.env.GRADLE_USER_HOME || path.join(os.homedir(), '.gradle'), 'caches/modules-2/files-2.1');
  const jar = (group, artifact, version) => {
    const dir = path.join(cache, group, artifact, version);
    for (const hash of readdirSync(dir)) {
      const match = readdirSync(path.join(dir, hash)).find(file => file.endsWith('.jar'));
      if (match) return path.join(dir, hash, match);
    }
    throw new Error(`Cached compiler dependency missing: ${artifact}:${version}`);
  };
  const stdlib = jar('org.jetbrains.kotlin', 'kotlin-stdlib', '2.1.20');
  const annotations = jar('org.jetbrains', 'annotations', '13.0');
  const compilerPath = [
    jar('org.jetbrains.kotlin', 'kotlin-compiler-embeddable', '2.1.20'), stdlib,
    jar('org.jetbrains.kotlin', 'kotlin-script-runtime', '2.1.20'),
    jar('org.jetbrains.kotlin', 'kotlin-daemon-embeddable', '2.1.20'),
    jar('org.jetbrains.intellij.deps', 'trove4j', '1.0.20200330'),
    jar('org.jetbrains.kotlinx', 'kotlinx-coroutines-core-jvm', '1.8.0'), annotations,
  ].join(path.delimiter);
  execFileSync(java, ['-cp', compilerPath, 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-jvm-target', '17', '-classpath', [androidJar, classes, stdlib, annotations].join(path.delimiter), '-d', classes, path.join(generatedRoot, nativeSource)], { timeout: 60000 });
  assert.ok((await fs.stat(path.join(classes, 'com/kyrie/questlife/widget/QuestLifeWidgetProvider.class'))).size > 0);
});
