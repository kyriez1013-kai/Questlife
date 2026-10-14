// Included in the generated AppDelegate compilation unit by the config plugin.
// SDK 54 keeps Expo subscribers on AppDelegate; the scene owns only the window.
final class QuestLifeSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
             options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let app = appDelegate,
          let factory = app.reactNativeFactory else { return }

    // Reattach the existing React root if UIKit reconnects the single scene.
    if let existing = app.window {
      existing.windowScene = windowScene
      window = existing
      existing.makeKeyAndVisible()
      self.scene(scene, openURLContexts: connectionOptions.urlContexts)
      for activity in connectionOptions.userActivities { self.scene(scene, continue: activity) }
      return
    }

    var options = app.sceneLaunchOptions ?? [:]
    if let context = connectionOptions.urlContexts.first {
      options[.url] = context.url
      options[.sourceApplication] = context.options.sourceApplication
      options[.annotation] = context.options.annotation
    }
    if let activity = connectionOptions.userActivities.first {
      options[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }
    if let shortcut = connectionOptions.shortcutItem { options[.shortcutItem] = shortcut }
    if let response = connectionOptions.notificationResponse {
      options[.remoteNotification] = response.notification.request.content.userInfo
    }

    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    app.window = sceneWindow
    factory.startReactNative(withModuleName: "main", in: sceneWindow, launchOptions: options)
    app.sceneLaunchOptions = nil
    sceneWindow.makeKeyAndVisible()
  }

  func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    for context in contexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      options[.sourceApplication] = context.options.sourceApplication
      options[.annotation] = context.options.annotation
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                   completionHandler: @escaping (Bool) -> Void) {
    guard let app = appDelegate else { completionHandler(false); return }
    app.application(UIApplication.shared, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  // UIKit still emits application notifications consumed by React Native.
  // Forward delegate callbacks to Expo without posting duplicate notifications.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }
  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }
  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }
  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
