import AppIntents
import UIKit

private enum QuestLifeShortcutOpenError: LocalizedError {
    case unavailable

    var errorDescription: String? {
        NSLocalizedString("Unable to open QuestLife.", tableName: "QuestLifeEntries", comment: "Shortcut URL failure")
    }
}

@available(iOS 16.0, *)
struct QuestLifeOpenRecordIntent: AppIntent {
    static var title: LocalizedStringResource = .init("Open record", table: "QuestLifeEntries")
    static var description = IntentDescription(LocalizedStringResource("Open record in QuestLife without saving anything.", table: "QuestLifeEntries"))
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        guard await UIApplication.shared.open(URL(string: "questlife://capture")!) else {
            throw QuestLifeShortcutOpenError.unavailable
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct QuestLifeOpenPlanIntent: AppIntent {
    static var title: LocalizedStringResource = .init("Open current plan", table: "QuestLifeEntries")
    static var description = IntentDescription(LocalizedStringResource("Open the current plan in QuestLife without changing it.", table: "QuestLifeEntries"))
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        guard await UIApplication.shared.open(URL(string: "questlife://plan")!) else {
            throw QuestLifeShortcutOpenError.unavailable
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct QuestLifeAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: QuestLifeOpenRecordIntent(),
            phrases: ["Open record in \(.applicationName)"],
            shortTitle: LocalizedStringResource("Record", table: "QuestLifeEntries"),
            systemImageName: "square.and.pencil"
        )
        AppShortcut(
            intent: QuestLifeOpenPlanIntent(),
            phrases: ["Open current plan in \(.applicationName)"],
            shortTitle: LocalizedStringResource("Current plan", table: "QuestLifeEntries"),
            systemImageName: "calendar"
        )
    }
}
