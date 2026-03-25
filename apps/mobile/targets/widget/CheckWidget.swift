import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Entity & Query

struct CheckActivityEntity: AppEntity {
    let id: String
    let name: String
    let emoji: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Check Activity"
    static var defaultQuery = CheckEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(name)")
    }
}

struct CheckEntityQuery: EntityQuery {
    func entities(for identifiers: [CheckActivityEntity.ID]) async throws
        -> [CheckActivityEntity]
    {
        let dbHelper = WidgetDbHelper()
        return identifiers.compactMap { id in
            guard let row = dbHelper.getActivityById(id) else { return nil }
            return CheckActivityEntity(id: row.id, name: row.name, emoji: row.emoji)
        }
    }

    func suggestedEntities() async throws -> [CheckActivityEntity] {
        WidgetDbHelper().getActivitiesByMode("check").map {
            CheckActivityEntity(id: $0.id, name: $0.name, emoji: $0.emoji)
        }
    }

    func defaultResult() async -> CheckActivityEntity? {
        try? await suggestedEntities().first
    }
}

struct SelectCheckActivityIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Check Activity"
    static var description: IntentDescription = "Choose a check activity to track"

    @Parameter(title: "Activity")
    var activity: CheckActivityEntity?
}

// MARK: - Timeline Entry

struct CheckEntry: TimelineEntry {
    let date: Date
    let activityName: String
    let activityEmoji: String
    let activityId: String?
    let isDoneToday: Bool
    let isProLocked: Bool
}

// MARK: - Timeline Provider

struct CheckTimelineProvider: AppIntentTimelineProvider {
    typealias Entry = CheckEntry
    typealias Intent = SelectCheckActivityIntent

    func placeholder(in context: Context) -> CheckEntry {
        CheckEntry(
            date: Date(), activityName: "Activity", activityEmoji: "",
            activityId: nil, isDoneToday: false, isProLocked: false
        )
    }

    func snapshot(for configuration: Intent, in context: Context) async -> CheckEntry {
        buildEntry(for: configuration)
    }

    func timeline(for configuration: Intent, in context: Context) async -> Timeline<CheckEntry> {
        let entry = buildEntry(for: configuration)
        let nextMidnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        return Timeline(entries: [entry], policy: .after(nextMidnight))
    }

    private func buildEntry(for configuration: Intent) -> CheckEntry {
        guard let entity = configuration.activity else {
            return CheckEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                activityId: nil, isDoneToday: false, isProLocked: false
            )
        }
        if !WidgetPlanHelper.isWidgetAllowed() {
            return CheckEntry(
                date: Date(), activityName: entity.name, activityEmoji: entity.emoji,
                activityId: entity.id, isDoneToday: false, isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(entity.id) else {
            return CheckEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                activityId: entity.id, isDoneToday: false, isProLocked: false
            )
        }
        let done = dbHelper.hasActivityLogForToday(entity.id)
        return CheckEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, activityId: entity.id,
            isDoneToday: done, isProLocked: false
        )
    }
}

// MARK: - Widget

struct CheckWidget: Widget {
    let kind = "CheckWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCheckActivityIntent.self,
            provider: CheckTimelineProvider()
        ) { entry in
            CheckWidgetView(entry: entry)
        }
        .configurationDisplayName("Actiko Check")
        .description("活動の完了をチェックします")
        .supportedFamilies([.systemSmall])
    }
}
