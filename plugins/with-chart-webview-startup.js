const { withMainApplication, withAppBuildGradle } = require('@expo/config-plugins');

const marker = '// QuestLife asynchronous chart engine startup';
const startup = `${marker}
    val chartExecutor = java.util.concurrent.Executors.newSingleThreadExecutor { task ->
      Thread(task, "questlife-chart-startup").apply { priority = Thread.MIN_PRIORITY }
    }
    try {
      androidx.webkit.WebViewCompat.startUpWebView(
        applicationContext,
        androidx.webkit.WebViewStartUpConfig.Builder(chartExecutor)
          .setShouldRunUiThreadStartUpTasks(false).build()
      ) { _ -> chartExecutor.shutdown() }
    } catch (failure: Exception) {
      chartExecutor.shutdown()
      android.util.Log.w("QuestLifeChart", "Background chart startup unavailable", failure)
    }`;

function insertStartup(source) {
  if (source.includes(marker)) return source;
  const anchor = 'ApplicationLifecycleDispatcher.onApplicationCreate(this)';
  if (!source.includes(anchor)) throw new Error('Unsupported Expo Application lifecycle');
  return source.replace('override fun onCreate()',
    '@androidx.annotation.OptIn(markerClass = [androidx.webkit.WebViewCompat.ExperimentalAsyncStartUp::class])\n  override fun onCreate()')
    .replace(anchor, `${anchor}\n    ${startup}`);
}

module.exports = function withChartWebViewStartup(config) {
  config = withAppBuildGradle(config, mod => {
    const dependency = 'implementation("androidx.webkit:webkit:1.14.0")';
    if (!mod.modResults.contents.includes(dependency)) {
      mod.modResults.contents += `\n// Same version already used by react-native-webview; no second engine.\ndependencies { ${dependency} }\n`;
    }
    return mod;
  });
  return withMainApplication(config, mod => {
    if (mod.modResults.language !== 'kt') throw new Error('Expected Expo Kotlin Application');
    mod.modResults.contents = insertStartup(mod.modResults.contents);
    return mod;
  });
};
module.exports.insertStartup = insertStartup;
