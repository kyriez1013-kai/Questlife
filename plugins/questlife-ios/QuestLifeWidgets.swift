import Foundation
import SwiftUI
import WidgetKit

private struct QuestLifeEntry: TimelineEntry {
    let date: Date
}

private struct QuestLifeEntryProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuestLifeEntry { QuestLifeEntry(date: Date()) }

    func getSnapshot(in context: Context, completion: @escaping (QuestLifeEntry) -> Void) {
        completion(QuestLifeEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuestLifeEntry>) -> Void) {
        completion(Timeline(entries: [QuestLifeEntry(date: Date())], policy: .never))
    }
}

private struct QuestLifeEntryView: View {
    let title: String
    let openLabel: String
    let symbol: String
    let url: URL

    private var content: some View {
        // Native equivalents of the shared 8-point gap and 44-point target.
        VStack(alignment: .leading, spacing: 8) {
            Text(verbatim: "QuestLife").font(.caption).foregroundStyle(.secondary)
            Image(systemName: symbol).font(.title2).accessibilityHidden(true)
            Text(LocalizedStringKey(title), tableName: "QuestLifeEntries")
                .font(.headline)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
        }
        .frame(minWidth: 44, maxWidth: .infinity, minHeight: 44, maxHeight: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(LocalizedStringKey(openLabel), tableName: "QuestLifeEntries"))
        .accessibilityAddTraits(.isButton)
        .widgetURL(url)
    }

    @ViewBuilder
    var body: some View {
        if #available(iOS 17.0, macOS 14.0, *) {
            content.containerBackground(.background, for: .widget)
        } else {
            content.padding(16).background(.background)
        }
    }
}

private func launchConfiguration(kind: String, title: String, openLabel: String, symbol: String, url: URL) -> some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: QuestLifeEntryProvider()) { _ in
        QuestLifeEntryView(title: title, openLabel: openLabel, symbol: symbol, url: url)
    }
    .configurationDisplayName(Text(LocalizedStringKey(title), tableName: "QuestLifeEntries"))
    .description(Text(LocalizedStringKey(openLabel), tableName: "QuestLifeEntries"))
    .supportedFamilies([.systemSmall])
}

private struct QuestLifeRecordWidget: Widget {
    var body: some WidgetConfiguration {
        launchConfiguration(kind: "QuestLifeRecord", title: "Record", openLabel: "Open record", symbol: "square.and.pencil", url: URL(string: "questlife://capture")!)
    }
}

private struct QuestLifePlanWidget: Widget {
    var body: some WidgetConfiguration {
        launchConfiguration(kind: "QuestLifePlan", title: "Current plan", openLabel: "Open current plan", symbol: "calendar", url: URL(string: "questlife://plan")!)
    }
}

@main
struct QuestLifeWidgets: WidgetBundle {
    var body: some Widget {
        QuestLifeRecordWidget()
        QuestLifePlanWidget()
    }
}
