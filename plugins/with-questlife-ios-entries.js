const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const plist = require('@expo/plist').default;
const fs = require('node:fs/promises');
const path = require('node:path');

const WIDGET = 'QuestLifeWidgets';
const SHORTCUTS = 'QuestLifeShortcuts';
const LOCALES = ['en', 'zh-Hans'];
const unquote = value => String(value ?? '').replace(/^"|"$/g, '');
const values = section => Object.entries(section ?? {}).filter(([key]) => !key.endsWith('_comment'));

function configureCredentials(config) {
  const hostId = config.ios?.bundleIdentifier;
  if (typeof hostId !== 'string' || !/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)+$/.test(hostId)) {
    throw new Error('QuestLife iOS entries require a valid ios.bundleIdentifier.');
  }
  if (!(Array.isArray(config.scheme) ? config.scheme : [config.scheme]).includes('questlife')) {
    throw new Error('QuestLife iOS entries require the existing questlife URL scheme.');
  }
  const bundleIdentifier = `${hostId}.widgets`;
  const extra = config.extra ?? {};
  const eas = extra.eas ?? {};
  const build = eas.build ?? {};
  const experimental = build.experimental ?? {};
  const ios = experimental.ios ?? {};
  const extensions = ios.appExtensions ?? [];
  const existing = extensions.find(item => item.targetName === WIDGET || item.bundleIdentifier === bundleIdentifier);
  if (existing && (existing.targetName !== WIDGET || existing.bundleIdentifier !== bundleIdentifier || Object.keys(existing.entitlements ?? {}).length)) {
    throw new Error('QuestLife widget extension credential declaration conflicts with existing configuration.');
  }
  config.extra = { ...extra, eas: { ...eas, build: { ...build, experimental: { ...experimental, ios: {
    ...ios, appExtensions: [...extensions.filter(item => item.targetName !== WIDGET), { targetName: WIDGET, bundleIdentifier, entitlements: {} }],
  } } } } };
  return bundleIdentifier;
}

function buildConfigs(project, target) {
  const list = project.hash.project.objects.XCConfigurationList[target.buildConfigurationList];
  return list.buildConfigurations.map(item => project.pbxXCBuildConfigurationSection()[item.value]);
}

function ensureGroup(project, name) {
  const existing = values(project.hash.project.objects.PBXGroup).find(([, group]) => unquote(group.name) === name);
  const id = existing?.[0] ?? project.addPbxGroup([], name).uuid;
  // Files already carry source-root-relative folders. A virtual group must have
  // no path: node-xcode otherwise serializes its undefined value as a directory.
  delete project.hash.project.objects.PBXGroup[id].path;
  if (!existing) project.addToPbxGroup(id, project.getFirstProject().firstProject.mainGroup);
  return id;
}

function addLocalizedTable(project, folder, table, target, group) {
  const phase = project.pbxResourcesBuildPhaseObj(target);
  const objects = project.hash.project.objects;
  const existing = values(objects.PBXVariantGroup).find(([id, item]) => unquote(item.name) === table && objects.PBXGroup[group].children.some(child => child.value === id));
  if (existing) return;
  const variant = project.pbxCreateVariantGroup(table);
  project.addToPbxGroup(variant, group);
  for (const locale of LOCALES) {
    const relative = `${folder}/${locale}.lproj/${table}`;
    if (project.hasFile(relative)) throw new Error(`QuestLife localization file already belongs to another group: ${relative}`);
    const fileRef = project.generateUuid();
    objects.PBXFileReference[fileRef] = { isa: 'PBXFileReference', lastKnownFileType: 'text.plist.strings', name: locale, path: `"${relative}"`, sourceTree: '"<group>"' };
    objects.PBXFileReference[`${fileRef}_comment`] = locale;
    objects.PBXVariantGroup[variant].children.push({ value: fileRef, comment: locale });
  }
  const id = project.generateUuid();
  project.addToPbxBuildFileSection({ uuid: id, fileRef: variant, basename: table, group: 'Resources' });
  phase.files.push({ value: id, comment: `${table} in Resources` });
}

function ensureFramework(project, name, target, weak = false) {
  const existing = values(project.pbxFileReferenceSection()).find(([, file]) => unquote(file.path).endsWith(`/${name}`));
  if (!existing) { project.addFramework(name, { target, weak }); return; }
  const phase = project.pbxFrameworksBuildPhaseObj(target);
  const buildFiles = project.pbxBuildFileSection();
  if (phase.files.some(file => buildFiles[file.value].fileRef === existing[0])) return;
  const id = project.generateUuid();
  project.addToPbxBuildFileSection({ uuid: id, fileRef: existing[0], basename: name, group: 'Frameworks', ...(weak ? { settings: { ATTRIBUTES: ['Weak'] } } : {}) });
  phase.files.push({ value: id, comment: `${name} in Frameworks` });
}

function installTarget(project, bundleIdentifier) {
  const host = project.getFirstTarget();
  if (unquote(host.firstTarget.productType) !== 'com.apple.product-type.application') {
    throw new Error('QuestLife iOS entries expect the Expo application as the first Xcode target.');
  }
  const found = values(project.pbxNativeTargetSection()).find(([, target]) => unquote(target.name) === WIDGET);
  if (found && !buildConfigs(project, found[1]).every(config => config.buildSettings.QUESTLIFE_WIDGET_GENERATED === 'YES')) {
    throw new Error('Existing QuestLifeWidgets target is not owned by this plugin.');
  }
  const target = found ? { uuid: found[0], pbxNativeTarget: found[1] } : project.addTarget(WIDGET, 'app_extension', WIDGET, bundleIdentifier);
  if (!found) {
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  }
  const hostConfigs = buildConfigs(project, host.firstTarget);
  for (const config of buildConfigs(project, target.pbxNativeTarget)) {
    const parent = (hostConfigs.find(item => unquote(item.name) === unquote(config.name)) ?? hostConfigs[0]).buildSettings;
    const deployment = unquote(parent.IPHONEOS_DEPLOYMENT_TARGET || '15.1');
    if (Number.parseFloat(deployment) < 15.1) throw new Error('QuestLife widget requires the SDK 54 iOS 15.1 baseline.');
    Object.assign(config.buildSettings, {
      QUESTLIFE_WIDGET_GENERATED: 'YES',
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
      INFOPLIST_FILE: `"${WIDGET}/Info.plist"`,
      IPHONEOS_DEPLOYMENT_TARGET: deployment,
      MARKETING_VERSION: parent.MARKETING_VERSION,
      CURRENT_PROJECT_VERSION: parent.CURRENT_PROJECT_VERSION,
      TARGETED_DEVICE_FAMILY: parent.TARGETED_DEVICE_FAMILY || '"1"',
      APPLICATION_EXTENSION_API_ONLY: 'YES',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_STYLE: 'Automatic',
      GENERATE_INFOPLIST_FILE: 'NO',
      SDKROOT: 'iphoneos',
      SUPPORTED_PLATFORMS: '"iphoneos iphonesimulator"',
      SWIFT_VERSION: '5.0',
      SWIFT_OPTIMIZATION_LEVEL: unquote(config.name) === 'Debug' ? '"-Onone"' : '"-O"',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SKIP_INSTALL: 'YES',
    });
    if (parent.DEVELOPMENT_TEAM) config.buildSettings.DEVELOPMENT_TEAM = parent.DEVELOPMENT_TEAM;
  }
  const widgetGroup = ensureGroup(project, WIDGET);
  const shortcutGroup = ensureGroup(project, SHORTCUTS);
  project.addSourceFile(`${WIDGET}/QuestLifeWidgets.swift`, { target: target.uuid }, widgetGroup);
  project.addSourceFile(`${SHORTCUTS}/QuestLifeShortcuts.swift`, { target: host.uuid }, shortcutGroup);
  addLocalizedTable(project, WIDGET, 'QuestLifeEntries.strings', target.uuid, widgetGroup);
  addLocalizedTable(project, SHORTCUTS, 'QuestLifeEntries.strings', host.uuid, shortcutGroup);
  addLocalizedTable(project, SHORTCUTS, 'AppShortcuts.strings', host.uuid, shortcutGroup);
  ensureFramework(project, 'WidgetKit.framework', target.uuid);
  ensureFramework(project, 'SwiftUI.framework', target.uuid);
  ensureFramework(project, 'AppIntents.framework', host.uuid, true);

  const objects = project.hash.project.objects;
  const copyPhase = values(objects.PBXCopyFilesBuildPhase).find(([, phase]) => phase.files.some(file => objects.PBXBuildFile[file.value]?.fileRef === target.pbxNativeTarget.productReference));
  if (!copyPhase) throw new Error('QuestLife widget embed phase is missing.');
  copyPhase[1].name = '"Embed QuestLife Widgets"';
  copyPhase[1].dstSubfolderSpec = 13;
  for (const file of copyPhase[1].files) {
    if (objects.PBXBuildFile[file.value].fileRef === target.pbxNativeTarget.productReference) objects.PBXBuildFile[file.value].settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
  }
  // Embed before the RN bundling scripts to avoid extension/script dependency cycles.
  const phases = host.firstTarget.buildPhases.filter(phase => phase.value !== copyPhase[0]);
  const scriptIndex = phases.findIndex(phase => objects.PBXShellScriptBuildPhase?.[phase.value]);
  phases.splice(scriptIndex < 0 ? phases.length : scriptIndex, 0, { value: copyPhase[0], comment: 'Embed QuestLife Widgets' });
  host.firstTarget.buildPhases = phases;
  const root = project.getFirstProject().firstProject;
  root.knownRegions = [...new Set([...(root.knownRegions ?? []), ...LOCALES])];
  return project;
}

module.exports = function withQuestLifeIOSEntries(config) {
  const bundleIdentifier = configureCredentials(config);
  config = withXcodeProject(config, mod => {
    mod.modResults = installTarget(mod.modResults, bundleIdentifier);
    return mod;
  });
  return withDangerousMod(config, ['ios', async mod => {
    const iosRoot = mod.modRequest.platformProjectRoot;
    const templates = path.join(__dirname, 'questlife-ios');
    for (const folder of [WIDGET, SHORTCUTS]) {
      await fs.mkdir(path.join(iosRoot, folder), { recursive: true });
      await fs.copyFile(path.join(templates, `${folder}.swift`), path.join(iosRoot, folder, `${folder}.swift`));
      for (const locale of LOCALES) {
        const output = path.join(iosRoot, folder, `${locale}.lproj`);
        await fs.mkdir(output, { recursive: true });
        await fs.copyFile(path.join(templates, `${locale}.lproj/QuestLifeEntries.strings`), path.join(output, 'QuestLifeEntries.strings'));
        if (folder === SHORTCUTS) await fs.copyFile(path.join(templates, `${locale}.lproj/AppShortcuts.strings`), path.join(output, 'AppShortcuts.strings'));
      }
    }
    await fs.writeFile(path.join(iosRoot, WIDGET, 'Info.plist'), plist.build({
      CFBundleDevelopmentRegion: 'en',
      CFBundleDisplayName: 'QuestLife',
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleInfoDictionaryVersion: '6.0',
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundlePackageType: 'XPC!',
      CFBundleShortVersionString: '$(MARKETING_VERSION)',
      CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
      NSExtension: { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' },
    }), 'utf8');
    return mod;
  }]);
};
