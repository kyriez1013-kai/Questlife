const {withMainActivity,withGradleProperties}=require('@expo/config-plugins');
const marker='// QuestLife Health Connect permission delegate';
module.exports=function withHealthPermissions(config){
  config=withGradleProperties(config,config=>{
    config.modResults=config.modResults.filter(item=>item.key!=='android.minSdkVersion');
    config.modResults.push({type:'property',key:'android.minSdkVersion',value:'26'});
    return config;
  });
  return withMainActivity(config,config=>{
    if(config.modResults.language!=='kt')throw new Error('QuestLife expects the Expo Kotlin MainActivity template');
    let source=config.modResults.contents;
    if(source.includes(marker))return config;
    source=source.replace('import android.os.Bundle','import android.os.Bundle\nimport android.content.Intent\nimport android.net.Uri\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate');
    if(!source.includes('super.onCreate(null)'))throw new Error('MainActivity template changed: verify Health Connect registration');
    source=source.replace('super.onCreate(null)',`super.onCreate(null)\n    ${marker}\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)\n    routeHealthPermissions(intent)`);
    const close=source.lastIndexOf('}');
    source=source.slice(0,close)+`
  private fun routeHealthPermissions(intent: Intent?) {
    if (intent?.action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" ||
        intent?.action == "android.intent.action.VIEW_PERMISSION_USAGE") {
      intent.data = Uri.parse("questlife://settings")
    }
  }

  override fun onNewIntent(intent: Intent) {
    routeHealthPermissions(intent)
    super.onNewIntent(intent)
  }
`+source.slice(close);
    config.modResults.contents=source;
    return config;
  });
};
