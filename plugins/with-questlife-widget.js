const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// URLs enter the existing JS deepLinkIntent contract; no native business actions.
const entries = Object.freeze({ record: 'questlife://capture', plan: 'questlife://plan' });
const providerName = '.widget.QuestLifeWidgetProvider';
// Native resource equivalents of QuestTheme.spacing.sm/lg and questLayout.editCardMinHeight.small.
// The tests check these against the shared tokens so this small build-time mirror cannot drift.
const dimensions = Object.freeze({ gap: 8, padding: 16, target: 48 });

function assertConfig(config) {
  const packageName = config.android?.package;
  if (typeof packageName !== 'string' || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName)) {
    throw new Error('QuestLife widget needs a valid lowercase android.package.');
  }
  const schemes = Array.isArray(config.scheme) ? config.scheme : [config.scheme];
  if (!schemes.includes('questlife')) throw new Error('QuestLife widget requires the questlife URL scheme.');
  return packageName;
}

function registerReceiver(manifest, packageName) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
  if (![`${packageName}.MainActivity`, '.MainActivity'].includes(activity.$['android:name']) || activity.$['android:launchMode'] !== 'singleTask') {
    throw new Error('QuestLife widget expects the existing singleTask MainActivity deep-link entrance.');
  }
  const receiver = {
    $: {
      'android:name': providerName,
      'android:exported': 'false',
      'android:label': '@string/questlife_widget_name',
    },
    'intent-filter': [{ action: [
      { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
      { $: { 'android:name': 'android.intent.action.LOCALE_CHANGED' } },
      { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
    ] }],
    'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/questlife_widget_info' } }],
  };
  const others = (application.receiver ?? []).filter(item => ![providerName, `${packageName}${providerName}`].includes(item.$['android:name']));
  application.receiver = [...others, receiver];
  return manifest;
}

function generatedFiles(packageName) {
  const javaDirectory = `java/${packageName.replaceAll('.', '/')}/widget`;
  return {
    [`${javaDirectory}/QuestLifeWidgetProvider.kt`]: `package ${packageName}.widget

import android.app.ActivityOptions
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import ${packageName}.MainActivity
import ${packageName}.R

class QuestLifeWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.questlife_widget)
            views.setOnClickPendingIntent(R.id.questlife_widget_record, openIntent(context, id, "${entries.record}"))
            views.setOnClickPendingIntent(R.id.questlife_widget_plan, openIntent(context, id, "${entries.plan}"))
            manager.updateAppWidget(id, views)
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        onUpdate(context, manager, intArrayOf(id))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == Intent.ACTION_LOCALE_CHANGED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val manager = AppWidgetManager.getInstance(context)
            onUpdate(context, manager, manager.getAppWidgetIds(ComponentName(context, QuestLifeWidgetProvider::class.java)))
        }
    }

    private fun openIntent(context: Context, widgetId: Int, url: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        // Only the launcher receives these immutable, explicit activity intents.
        // No receiver/service trampoline and no record or plan mutation.
        val options = if (Build.VERSION.SDK_INT >= 35) {
            ActivityOptions.makeBasic().apply {
                setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
            }.toBundle()
        } else null
        return PendingIntent.getActivity(context, widgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE, options)
    }
}
`,
    'res/xml/questlife_widget_info.xml': `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="176dp"
    android:minResizeWidth="180dp"
    android:minResizeHeight="176dp"
    android:initialLayout="@layout/questlife_widget"
    android:previewLayout="@layout/questlife_widget"
    android:description="@string/questlife_widget_description"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen" />
`,
    'res/layout/questlife_widget.xml': `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@android:id/background"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center_vertical"
    android:padding="@dimen/questlife_widget_padding"
    android:background="?android:attr/colorBackground"
    android:theme="@style/QuestLifeWidgetTheme">
    <Button
        android:id="@+id/questlife_widget_record"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:minWidth="@dimen/questlife_widget_target"
        android:minHeight="@dimen/questlife_widget_target"
        android:text="@string/questlife_widget_record"
        android:contentDescription="@string/questlife_widget_open_record"
        android:textAllCaps="false" />
    <Button
        android:id="@+id/questlife_widget_plan"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/questlife_widget_gap"
        android:minWidth="@dimen/questlife_widget_target"
        android:minHeight="@dimen/questlife_widget_target"
        android:text="@string/questlife_widget_plan"
        android:contentDescription="@string/questlife_widget_open_plan"
        android:textAllCaps="false" />
</LinearLayout>
`,
    'res/values/questlife_widget.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="QuestLifeWidgetTheme" parent="@android:style/Theme.DeviceDefault.Light" />
    <string name="questlife_widget_name" translatable="false">QuestLife</string>
    <string name="questlife_widget_description">Open record or current plan in QuestLife.</string>
    <string name="questlife_widget_record">Record</string>
    <string name="questlife_widget_plan">Current plan</string>
    <string name="questlife_widget_open_record">Open record</string>
    <string name="questlife_widget_open_plan">Open current plan</string>
    <dimen name="questlife_widget_gap">${dimensions.gap}dp</dimen>
    <dimen name="questlife_widget_padding">${dimensions.padding}dp</dimen>
    <dimen name="questlife_widget_target">${dimensions.target}dp</dimen>
</resources>
`,
    'res/values-night/questlife_widget.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="QuestLifeWidgetTheme" parent="@android:style/Theme.DeviceDefault" />
</resources>
`,
    'res/values-zh/questlife_widget.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="questlife_widget_description">\u6253\u5f00 QuestLife \u7684\u8bb0\u5f55\u6216\u5f53\u524d\u8ba1\u5212\u3002</string>
    <string name="questlife_widget_record">\u8bb0\u5f55</string>
    <string name="questlife_widget_plan">\u5f53\u524d\u8ba1\u5212</string>
    <string name="questlife_widget_open_record">\u6253\u5f00\u8bb0\u5f55</string>
    <string name="questlife_widget_open_plan">\u6253\u5f00\u5f53\u524d\u8ba1\u5212</string>
</resources>
`,
  };
}

module.exports = function withQuestLifeWidget(config) {
  const packageName = assertConfig(config);
  config = withAndroidManifest(config, mod => {
    mod.modResults = registerReceiver(mod.modResults, packageName);
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const root = path.join(mod.modRequest.platformProjectRoot, 'app/src/main');
    for (const [relative, content] of Object.entries(generatedFiles(packageName))) {
      const destination = path.join(root, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, content, 'utf8');
    }
    return mod;
  }]);
};

module.exports.widgetEntries = entries;
