/* Native hosts are mocked. These are component/contract tests, not device QA.
 * Run with NATIVE_MATERIAL_TEST_RUNTIME pointing at an isolated installation
 * of react@19.1.0 and react-test-renderer@19.1.0; no app dependency edits.
 */
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const runtime = process.env.NATIVE_MATERIAL_TEST_RUNTIME;
if (!runtime) throw new Error('Set NATIVE_MATERIAL_TEST_RUNTIME to the isolated test runtime directory.');
const runtimeRequire = createRequire(join(resolve(runtime), 'package.json'));
const React = runtimeRequire('react');
const { act, create } = runtimeRequire('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = resolve(__dirname, '../..');
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const deferred = () => { let done; const promise = new Promise(resolve => { done = resolve; }); return { promise, done }; };

function environment(overrides = {}) {
  const env = { platform: 'ios', version: '26.0', reduceMotion: false, reduceTransparency: false, glassNative: true, glassAPI: true, glassDesign: true, width: 390, height: 844, fontScale: 1, keyboardVisible: false, ...overrides };
  const cache = new Map();
  const events = new Map();
  const calls = { glassImport: 0, nativeCheck: 0, motionQueries: 0, transparencyQueries: 0, keyboardDismiss: 0, focuses: [] };
  const subscribe = (name, callback) => {
    if (!events.has(name)) events.set(name, new Set());
    events.get(name).add(callback);
    return { remove: () => events.get(name).delete(callback) };
  };
  const emit = (name, value) => events.get(name)?.forEach(callback => callback(value));
  const rn = {
    Platform: { OS: env.platform, Version: env.version },
    Appearance: { getColorScheme: () => 'light' },
    StyleSheet: { create: s => s, flatten, hairlineWidth: 0.5, absoluteFill: { position: 'absolute', inset: 0 } },
    View: 'View', Text: 'Text', TextInput: Object.assign(p => React.createElement('TextInput', p), { State: { currentlyFocusedInput: () => env.focusedInput ?? null } }), ActivityIndicator: 'ActivityIndicator', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView',
    Pressable: p => React.createElement('Pressable', { ...p, style: typeof p.style === 'function' ? p.style({ pressed: !!env.pressed }) : p.style }, typeof p.children === 'function' ? p.children({ pressed: !!env.pressed }) : p.children),
    useWindowDimensions: () => ({ width: env.width, height: env.height, fontScale: env.fontScale, scale: 3 }),
    AccessibilityInfo: {
      isReduceMotionEnabled: () => { calls.motionQueries++; return env.motionRead ?? Promise.resolve(env.reduceMotion); },
      isReduceTransparencyEnabled: () => { calls.transparencyQueries++; return env.transparencyRead ?? Promise.resolve(env.reduceTransparency); },
      addEventListener: subscribe,
      sendAccessibilityEvent: (host, kind) => calls.focuses.push({ host, kind }),
    },
    AppState: { addEventListener: (_, callback) => subscribe('appState', callback) },
    Keyboard: { isVisible: () => env.keyboardVisible, dismiss: () => calls.keyboardDismiss++, addListener: subscribe },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name === 'react' || name.startsWith('react/')) return runtimeRequire(name);
      if (name === 'react-native') return rn;
      if (name === 'expo-blur') return { BlurView: 'BlurView' };
      if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
      if (name === 'expo-modules-core') return { requireOptionalNativeModule: () => { calls.nativeCheck++; return env.glassNative ? {} : null; } };
      if (name === 'expo-glass-effect') {
        calls.glassImport++;
        if (env.glassThrows) throw new Error('Missing native module');
        return { GlassView: 'GlassView', isGlassEffectAPIAvailable: () => env.glassAPI, isLiquidGlassAvailable: () => env.glassDesign };
      }
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0, ...env.insets }) };
      if (name.endsWith('V11RebaselineIcon')) return { __esModule: true, default: 'Icon' };
      if (name.endsWith('/store')) return { useStore: () => ({ data: { settings: { selectedThemeId: env.themeId ?? 'cleanFocus', language: env.language } } }) };
      if (name.endsWith('/useQuestTheme')) return { useQuestTheme: id => load(join(root, 'src/design/tokens.ts')).getQuestTheme(id) };
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name);
        const match = [base, base + '.native.tsx', base + '.tsx', base + '.ts'].find(path => existsSync(path));
        if (!match) throw new Error(`Cannot resolve ${name} in ${file}`);
        return load(match);
      }
      return createRequire(file)(name);
    };
    const compiled = vm.runInThisContext(`(function(require,module,exports,requestAnimationFrame,cancelAnimationFrame){${source}\n})`, { filename: file });
    compiled(localRequire, module, module.exports, callback => { queueMicrotask(callback); return 1; }, () => {});
    return module.exports;
  }
  const foundation = load(join(root, 'src/design/nativeFoundation.ts'));
  const tokens = load(join(root, 'src/v11/tokens.ts'));
  const material = load(join(root, 'src/v11/components/V11Material.native.tsx'));
  const controls = load(join(root, 'src/v11/components/V11SheetControls.native.tsx'));
  const sheet = load(join(root, 'src/v11/components/V11NativeSheet.native.tsx')).default;
  const nativeControls = load(join(root, 'src/native/NativeControls.tsx'));
  return { env, calls, events, emit, foundation, tokens, material, controls, sheet, nativeControls, load };
}

async function render(element, createNodeMock = node => ({ type: node.type, getNativeScrollRef: () => null })) {
  let renderer;
  await act(async () => { renderer = create(element, { createNodeMock }); });
  return renderer;
}
const dispose = renderer => act(async () => renderer.unmount());
const hosts = (renderer, type) => renderer.root.findAllByType(type);

test('material policy is fail-closed and never blurs nested/evidence/Android surfaces', () => {
  const { foundation: f } = environment();
  for (const platform of ['ios', 'android', 'web']) {
    for (const flag of ['reduceTransparency', 'fallback', 'nested', 'sheet']) {
      assert.equal(f.nativeMaterialKind({ platform, glassAvailable: true, reduceTransparency: false, [flag]: true }), 'opaque');
    }
  }
  assert.equal(f.nativeMaterialKind({ platform: 'ios', reduceTransparency: false }), 'blur');
  assert.equal(f.nativeMaterialKind({ platform: 'ios', reduceTransparency: false, glassAvailable: true }), 'glass');
});

for (const [name, options, expected] of [
  ['supported iOS', {}, 'GlassView'],
  ['old iOS', { version: '18.7' }, 'BlurView'],
  ['iOS beta without API', { glassAPI: false }, 'BlurView'],
  ['compiler compatibility mode', { glassDesign: false }, 'BlurView'],
  ['old binary with no native registration', { glassNative: false }, 'BlurView'],
  ['native import error', { glassThrows: true }, 'BlurView'],
  ['Android', { platform: 'android', version: 36 }, null],
  ['unknown version', { version: 'unknown' }, 'BlurView'],
  ['reduced transparency', { reduceTransparency: true }, null],
]) {
  test(name, async () => {
    const e = environment(options);
    const renderer = await render(React.createElement(e.material.V11Pill, { theme: e.tokens.getV11ThemeTokens('light'), onPress() {}, accessibilityLabel: 'Action' }, 'Content'));
    assert.equal(hosts(renderer, 'GlassView').length, expected === 'GlassView' ? 1 : 0);
    assert.equal(hosts(renderer, 'BlurView').length, expected === 'BlurView' ? 1 : 0);
    assert.equal(hosts(renderer, 'LinearGradient').length, 1);
    if (options.platform === 'android' || options.version === '18.7' || options.glassNative === false || options.reduceTransparency) assert.equal(e.calls.glassImport, 0);
    const pressable = hosts(renderer, 'Pressable')[0];
    assert.ok(flatten(pressable.props.style).minHeight >= 44);
    assert.ok(flatten(pressable.props.style).minWidth >= 44);
    await dispose(renderer);
  });
}

test('both palettes use theme-derived native gradients; Glass honors app appearance', async () => {
  for (const mode of ['light', 'dark']) {
    const e = environment();
    const theme = e.tokens.getV11ThemeTokens(mode);
    const renderer = await render(React.createElement(e.material.V11Pill, { theme }, 'Text'));
    assert.deepEqual(hosts(renderer, 'LinearGradient')[0].props.colors, [theme.questTheme.colors.surfaceElevated, theme.questTheme.colors.surface, theme.questTheme.colors.surfaceMuted]);
    assert.equal(hosts(renderer, 'GlassView')[0].props.colorScheme, mode);
    await dispose(renderer);
  }
});

test('nested materials have at most one blur/glass layer; sheets have none', async () => {
  const e = environment({ version: '18' });
  const theme = e.tokens.getV11ThemeTokens('dark');
  const renderer = await render(React.createElement(e.material.V11Pill, { theme }, React.createElement(e.material.V11Pill, { theme }, 'Nested')));
  assert.equal(hosts(renderer, 'BlurView').length, 1);
  await act(async () => renderer.update(React.createElement(e.material.V11GlassSheet, { theme }, React.createElement(e.material.V11Pill, { theme }, 'Evidence'))));
  assert.equal(hosts(renderer, 'BlurView').length, 0);
  assert.ok(hosts(renderer, 'LinearGradient').every(view => flatten(view.props.style).opacity === 1));
  await dispose(renderer);
});

test('live accessibility changes remove transparency and interactive glass without remounting', async () => {
  const e = environment();
  const theme = e.tokens.getV11ThemeTokens('light');
  const renderer = await render(React.createElement(e.material.V11Pill, { theme, onPress() {} }, 'Content'));
  assert.equal(hosts(renderer, 'GlassView')[0].props.isInteractive, true);
  const originalGlass = hosts(renderer, 'GlassView')[0];
  await act(async () => e.emit('reduceMotionChanged', true));
  assert.equal(hosts(renderer, 'GlassView')[0].props.isInteractive, false);
  assert.notEqual(hosts(renderer, 'GlassView')[0], originalGlass);
  await act(async () => e.emit('reduceTransparencyChanged', true));
  assert.equal(hosts(renderer, 'GlassView').length, 0);
  assert.equal(hosts(renderer, 'BlurView').length, 0);
  await dispose(renderer);
  assert.ok([...e.events.values()].every(set => set.size === 0));
});

test('shared native listeners, stale query protection and foreground refresh', async () => {
  const motion = deferred();
  const transparency = deferred();
  const e = environment({ motionRead: motion.promise, transparencyRead: transparency.promise });
  const theme = e.tokens.getV11ThemeTokens('light');
  const renderer = await render(React.createElement(React.Fragment, null, ...[0, 1, 2].map(key => React.createElement(e.material.V11Pill, { theme, key }, 'Content'))));
  assert.equal(e.calls.motionQueries, 1);
  assert.equal(e.events.get('reduceMotionChanged').size, 1);
  await act(async () => {
    e.emit('reduceTransparencyChanged', true);
    transparency.done(false);
    motion.done(false);
  });
  assert.equal(hosts(renderer, 'GlassView').length, 0);
  e.env.transparencyRead = undefined;
  await act(async () => e.emit('appState', 'active'));
  assert.equal(hosts(renderer, 'GlassView').length, 3);
  await dispose(renderer);
});

test('rejected native preference queries preserve opaque/static defaults', async () => {
  const e = environment({ motionRead: Promise.reject(new Error('native unavailable')), transparencyRead: Promise.reject(new Error('native unavailable')) });
  const renderer = await render(React.createElement(e.material.V11Pill, { theme: e.tokens.getV11ThemeTokens('light') }, 'Content'));
  assert.equal(hosts(renderer, 'GlassView').length + hosts(renderer, 'BlurView').length, 0);
  await dispose(renderer);
});

test('explicit reduced motion/fallback props are respected', async () => {
  const e = environment();
  const theme = e.tokens.getV11ThemeTokens('light');
  const renderer = await render(React.createElement(e.material.V11Pill, { theme, onPress() {}, reducedMotion: true, height: 20 }, 'Content'));
  assert.equal(hosts(renderer, 'GlassView')[0].props.isInteractive, false);
  assert.equal(flatten(hosts(renderer, 'Pressable')[0].props.style).minHeight, 44);
  await act(async () => renderer.update(React.createElement(e.material.V11Pill, { theme, fallback: true }, 'Content')));
  assert.equal(hosts(renderer, 'GlassView').length + hosts(renderer, 'BlurView').length, 0);
  await dispose(renderer);
});

test('categorical chips preserve checkbox/radio/button semantics and disabled state', async () => {
  const e = environment();
  for (const role of [undefined, 'checkbox', 'radio', 'button']) {
    const renderer = await render(React.createElement(e.controls.V11CategoricalChip, { theme: e.tokens.getV11ThemeTokens('light'), accessibilityRole: role, disabled: true, selected: true, label: 'Option', onPress() {} }));
    const control = hosts(renderer, 'Pressable')[0];
    assert.equal(control.props.accessibilityRole, role ?? 'checkbox');
    assert.equal(control.props.accessibilityState[role === 'button' ? 'selected' : 'checked'], true);
    assert.equal(control.props.disabled, true);
    await dispose(renderer);
  }
});

test('all native controls have allocated 44-point targets rather than overlapping hitSlop', async () => {
  const e = environment();
  const p = { theme: e.tokens.getV11ThemeTokens('dark'), label: 'Long translated action label', accessibilityLabel: 'Toggle', onPress() {}, onChange() {}, onCancel() {}, onSave() {}, selected: true, checked: true, value: 1, options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }], variant: 'primary', cancelLabel: 'Cancel', saveLabel: 'Save', children: 'Child' };
  for (const [name, Control] of Object.entries(e.controls).filter(([name]) => name !== 'V11StatusChip' && name !== 'V11TextField')) {
    const renderer = await render(React.createElement(Control, p));
    for (const target of hosts(renderer, 'Pressable')) {
      assert.ok(flatten(target.props.style).minHeight >= 44, `${name}: height`);
      assert.ok(flatten(target.props.style).minWidth >= 44, `${name}: width`);
      assert.equal(target.props.hitSlop, undefined);
    }
    await dispose(renderer);
  }
});

test('selector columns shrink for narrow widths and large Dynamic Type', async () => {
  const e = environment();
  assert.equal(e.foundation.nativeControlColumns(350, 3, 3, 1, 8), 3);
  assert.equal(e.foundation.nativeControlColumns(350, 3, 3, 2, 8), 1);
  assert.equal(e.foundation.nativeControlColumns(180, 6, 6, 1, 8), 1);
  assert.equal(e.foundation.nativeControlColumns(350, NaN, 0, 1, 8), 1);
  let chosen;
  const renderer = await render(React.createElement(e.controls.V11CompactValueSelector, { theme: e.tokens.getV11ThemeTokens('light'), columns: 2, value: null, options: [{ value: null, label: 'None' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }], onChange: value => { chosen = value; } }));
  await act(async () => hosts(renderer, 'View')[0].props.onLayout({ nativeEvent: { layout: { width: 350 } } }));
  assert.equal(flatten(hosts(renderer, 'Pressable')[0].props.style).width, 171);
  assert.equal(hosts(renderer, 'Pressable')[0].props.accessibilityState.checked, true);
  hosts(renderer, 'Pressable')[1].props.onPress();
  assert.equal(chosen, 'b');
  await dispose(renderer);
});

test('text field respects caller editability, placeholder, focus callbacks and status', async () => {
  const e = environment();
  const theme = e.tokens.getV11ThemeTokens('light');
  let focused = false;
  const p = { theme, editable: false, disabled: false, multiline: true, placeholder: 'Notes', placeholderTextColor: theme.text.primary, onFocus: () => { focused = true; } };
  const renderer = await render(React.createElement(e.controls.V11TextField, p));
  let input = hosts(renderer, 'TextInput')[0];
  assert.equal(input.props.editable, false);
  assert.equal(input.props.accessibilityState.disabled, true);
  assert.equal(input.props.placeholderTextColor, theme.text.primary);
  assert.equal(flatten(input.props.style).minHeight, 88);
  await act(async () => input.props.onFocus({}));
  assert.equal(focused, true);
  assert.equal(flatten(hosts(renderer, 'TextInput')[0].props.style).borderColor, theme.control.focus);
  await act(async () => renderer.update(React.createElement(e.controls.V11TextField, { ...p, status: 'error' })));
  assert.equal(flatten(hosts(renderer, 'TextInput')[0].props.style).borderColor, theme.control.error);
  await dispose(renderer);
});

test('loading keeps button labels and prevents repeated activation', async () => {
  const e = environment();
  for (const Control of [e.controls.V11SheetButton, e.nativeControls.NativeAction]) {
    const renderer = await render(React.createElement(Control, { theme: e.tokens.getV11ThemeTokens('light'), label: 'Save changes', variant: 'primary', loading: true, busy: true, onPress() {} }));
    assert.equal(hosts(renderer, 'Pressable')[0].props.disabled, true);
    assert.equal(hosts(renderer, 'Pressable')[0].props.accessibilityState.busy, true);
    assert.equal(hosts(renderer, 'Text')[0].props.children, 'Save changes');
    assert.equal(hosts(renderer, 'ActivityIndicator').length, 1);
    await dispose(renderer);
  }
});

test('footer stacks large translated actions for Dynamic Type', async () => {
  const e = environment({ fontScale: 2 });
  const renderer = await render(React.createElement(e.controls.V11StickySheetFooter, { theme: e.tokens.getV11ThemeTokens('light'), cancelLabel: 'Cancel changes', saveLabel: 'Save changes', onCancel() {}, onSave() {} }));
  await act(async () => hosts(renderer, 'View')[0].props.onLayout({ nativeEvent: { layout: { width: 350 } } }));
  assert.equal(hosts(renderer, 'View')[1].props.style.flexDirection, 'column');
  await dispose(renderer);
});

for (const platform of ['ios', 'android']) {
  test(`${platform} sheet keyboard, safe-area, focus, dismissal and short-viewport fallback`, async () => {
    const e = environment({ platform, version: platform === 'ios' ? '26' : 36 });
    let closed = 0;
    const p = { visible: true, reducedMotion: true, title: 'Evidence', closeLabel: 'Close', onClose: () => closed++, theme: e.tokens.getV11ThemeTokens('dark'), children: React.createElement('TextInput'), footer: React.createElement('Text', null, 'Save') };
    const renderer = await render(React.createElement(e.sheet, p));
    const modal = hosts(renderer, 'Modal')[0];
    assert.equal(modal.props.animationType, 'none');
    assert.equal(modal.props.navigationBarTranslucent, true);
    assert.equal(hosts(renderer, 'KeyboardAvoidingView')[0].props.behavior, platform === 'ios' ? 'padding' : undefined);
    assert.equal(hosts(renderer, 'ScrollView')[0].props.automaticallyAdjustKeyboardInsets, false);
    assert.equal(hosts(renderer, 'BlurView').length + hosts(renderer, 'GlassView').length, 0);
    assert.equal(hosts(renderer, 'Pressable')[0].props.accessible, false);
    await act(async () => modal.props.onShow());
    assert.equal(e.calls.focuses[0].kind, 'focus');
    const modalView = () => hosts(renderer, 'View').find(node => node.props.accessibilityViewIsModal);
    assert.equal(flatten(modalView().props.style).paddingBottom, 34);
    await act(async () => e.emit('keyboardDidShow'));
    assert.equal(flatten(modalView().props.style).paddingBottom, 8);
    const viewport = hosts(renderer, 'View').find(node => node.props.pointerEvents === 'box-none');
    await act(async () => viewport.props.onLayout({ nativeEvent: { layout: { height: 140 } } }));
    assert.equal(hosts(renderer, 'ScrollView')[0].findAllByType('Pressable').length, 1);
    modalView().props.onAccessibilityEscape();
    modal.props.onRequestClose();
    assert.equal(closed, 2);
    assert.equal(e.calls.keyboardDismiss, 2);
    await dispose(renderer);
    assert.ok([...e.events.values()].every(set => set.size === 0));
  });
}

test('untitled forms focus the real close control without inventing a heading', async () => {
  const e = environment();
  const renderer = await render(React.createElement(e.sheet, { visible: true, reducedMotion: true, closeLabel: 'Close form', onClose() {}, theme: e.tokens.getV11ThemeTokens('light') }, React.createElement(e.controls.V11TextField, { theme: e.tokens.getV11ThemeTokens('light'), placeholder: 'Name' })));
  assert.equal(hosts(renderer, 'Text').filter(node => node.props.accessibilityRole === 'header').length, 0);
  await act(async () => hosts(renderer, 'Modal')[0].props.onShow());
  assert.equal(e.calls.focuses[0].host.type, 'Pressable');
  await dispose(renderer);
});

test('focused inputs scroll within the real body viewport with reduced-motion support', async () => {
  const e = environment();
  const scrolls = [];
  let inputY = 500;
  const input = { measureInWindow: callback => callback(0, inputY, 250, 44) };
  const viewport = { measureInWindow: callback => callback(0, 150, 300, 300) };
  e.env.focusedInput = input;
  const renderer = await render(React.createElement(e.sheet, { visible: true, reducedMotion: true, title: 'Form', closeLabel: 'Close', onClose() {}, theme: e.tokens.getV11ThemeTokens('light') }, 'Form'), node => node.type === 'ScrollView' ? { getNativeScrollRef: () => viewport, scrollTo: value => scrolls.push(value) } : { type: node.type });
  const scroll = hosts(renderer, 'ScrollView')[0];
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 100 } } });
  await act(async () => hosts(renderer, 'View').find(node => node.props.onFocus).props.onFocus());
  assert.deepEqual(scrolls.pop(), { y: 202, animated: false });
  inputY = 190;
  await act(async () => e.emit('keyboardDidShow'));
  assert.equal(scrolls.length, 0, 'a visible input must not jump to a new offset');
  inputY = 100;
  await act(async () => scroll.props.onLayout());
  assert.deepEqual(scrolls.pop(), { y: 42, animated: false });
  hosts(renderer, 'View').find(node => node.props.onBlur).props.onBlur();
  inputY = 600;
  await act(async () => scroll.props.onLayout());
  assert.equal(scrolls.length, 0, 'a stale/background input must not move this sheet');
  await dispose(renderer);
});

test('keyboard compact mode preserves live form state and real footer callbacks', async () => {
  const e = environment();
  const SharedSheet = e.load(join(root, 'src/v11-stage2-rebaseline/V11Stage2ProductionSheet.native.tsx')).default;
  const theme = e.tokens.getV11ThemeTokens('dark');
  let saves = [];
  let closes = 0;
  function Form() {
    const [text, setText] = React.useState('');
    return React.createElement(SharedSheet, {
      visible: true, title: 'Edit', closeLabel: 'Close', reducedMotion: true, theme, onClose: () => closes++,
      footer: React.createElement(e.controls.V11StickySheetFooter, { theme, cancelLabel: 'Cancel', saveLabel: 'Save', onCancel: () => closes++, onSave: () => saves.push(text) }),
    }, React.createElement(e.controls.V11TextField, { theme, value: text, onChangeText: setText, placeholder: 'Name' }));
  }
  const renderer = await render(React.createElement(Form));
  const input = hosts(renderer, 'TextInput')[0];
  await act(async () => input.props.onChangeText('Edited draft'));
  await act(async () => {
    e.emit('keyboardDidShow');
    hosts(renderer, 'View').find(node => node.props.pointerEvents === 'box-none').props.onLayout({ nativeEvent: { layout: { height: 180 } } });
  });
  assert.equal(hosts(renderer, 'TextInput')[0], input);
  assert.equal(input.props.value, 'Edited draft');
  hosts(renderer, 'Pressable').find(node => node.props.accessibilityLabel === 'Save').props.onPress();
  assert.deepEqual(saves, ['Edited draft']);
  hosts(renderer, 'Pressable').find(node => node.props.accessibilityLabel === 'Cancel').props.onPress();
  assert.equal(closes, 1);
  await dispose(renderer);
});

test('reopening a sheet does not reuse a dismissed scroll offset', async () => {
  const e = environment();
  const scrolls = [];
  e.env.focusedInput = { measureInWindow: callback => callback(0, 500, 250, 44) };
  const viewport = { measureInWindow: callback => callback(0, 150, 300, 300) };
  const props = { visible: true, reducedMotion: true, title: 'Form', closeLabel: 'Close', onClose() {}, theme: e.tokens.getV11ThemeTokens('light'), children: 'Form' };
  const renderer = await render(React.createElement(e.sheet, props), node => node.type === 'ScrollView' ? { getNativeScrollRef: () => viewport, scrollTo: value => scrolls.push(value) } : { type: node.type });
  hosts(renderer, 'ScrollView')[0].props.onScroll({ nativeEvent: { contentOffset: { y: 200 } } });
  await act(async () => renderer.update(React.createElement(e.sheet, { ...props, visible: false })));
  await act(async () => renderer.update(React.createElement(e.sheet, props)));
  await act(async () => hosts(renderer, 'View').find(node => node.props.onFocus).props.onFocus());
  assert.deepEqual(scrolls.pop(), { y: 102, animated: false });
  await dispose(renderer);
});

test('existing production entry and Insights consumer reach the native sheet unchanged', async () => {
  const e = environment();
  const SharedSheet = e.load(join(root, 'src/v11-stage2-rebaseline/V11Stage2ProductionSheet.native.tsx')).default;
  assert.equal(SharedSheet, e.sheet);
  const ExistingConsumer = e.load(join(root, 'src/insights-v3/InsightsV3Sheet.tsx')).default;
  const theme = e.tokens.getV11ThemeTokens('dark');
  const onClose = () => {};
  const renderer = await render(React.createElement(ExistingConsumer, { open: true, lang: 'en', reducedMotion: true, theme, title: 'Evidence', onClose }, React.createElement('Text', null, 'Existing child')));
  const props = renderer.root.findByType(e.sheet).props;
  assert.equal(props.onClose, onClose);
  assert.equal(props.visible, true);
  assert.equal(props.title, 'Evidence');
  assert.equal(props.closeLabel, 'Close');
  assert.equal(props.theme, theme);
  assert.equal(props.minHeight, 260);
  assert.equal(props.sheet, 'record');
  assert.equal(hosts(renderer, 'Modal')[0].props.navigationBarTranslucent, true);
  await dispose(renderer);
});

test('native generic form adapter preserves children, footer, close override and visibility', async () => {
  const e = environment();
  const GenericSheet = e.load(join(root, 'src/components/BottomSheetForm.native.tsx')).default;
  const child = React.createElement(e.controls.V11TextField, { theme: e.tokens.getV11ThemeTokens('light'), placeholder: 'Name' });
  const footer = React.createElement(e.controls.V11SheetButton, { theme: e.tokens.getV11ThemeTokens('light'), label: 'Save', variant: 'primary', onPress() {} });
  let closed = 0;
  const onClose = () => closed++;
  const p = { visible: true, closeAccessibilityLabel: 'Dismiss editor', onClose, footer, children: child };
  const renderer = await render(React.createElement(GenericSheet, p));
  const props = renderer.root.findByType(e.sheet).props;
  assert.equal(props.onClose, onClose);
  assert.equal(props.children, child);
  assert.equal(props.footer, footer);
  assert.equal(props.closeLabel, 'Dismiss editor');
  assert.equal(props.title, undefined);
  assert.equal(props.minHeight, 0);
  hosts(renderer, 'Pressable').find(node => node.props.accessibilityLabel === 'Dismiss editor').props.onPress();
  assert.equal(closed, 1);
  assert.equal(e.calls.keyboardDismiss, 1);
  await act(async () => renderer.update(React.createElement(GenericSheet, { ...p, visible: false })));
  assert.equal(hosts(renderer, 'Modal')[0].props.visible, false);
  assert.equal(e.events.get('keyboardDidShow').size, 0);
  await dispose(renderer);
});

test('generic native forms reuse existing language/theme choices and system reduced motion', async () => {
  for (const [language, themeId, label, mode] of [
    ['zh', 'cleanFocus', '\u5173\u95ed', 'light'],
    ['en', 'deepWork', 'Close', 'dark'],
  ]) {
    const e = environment({ language, themeId, reduceMotion: true });
    const GenericSheet = e.load(join(root, 'src/components/BottomSheetForm.native.tsx')).default;
    const renderer = await render(React.createElement(GenericSheet, { visible: true, onClose() {} }, 'Existing body'));
    const props = renderer.root.findByType(e.sheet).props;
    assert.equal(props.closeLabel, label);
    assert.equal(props.theme.mode, mode);
    assert.equal(hosts(renderer, 'Modal')[0].props.animationType, 'none');
    await dispose(renderer);
  }
});
