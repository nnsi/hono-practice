import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Entity & Query

struct CounterActivityEntity: AppEntity {
    let id: String
    let name: String
    let emoji: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Counter Activity"
    static var defaultQuery = CounterEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(name)")
    }
}

struct CounterEntityQuery: EntityQuery {
    func entities(for identifiers: [CounterActivityEntity.ID]) async throws
        -> [CounterActivityEntity]
    {
        let dbHelper = WidgetDbHelper()
        return identifiers.compactMap { id in
            guard let row = dbHelper.getActivityById(id) else { return nil }
            return CounterActivityEntity(id: row.id, name: row.name, emoji: row.emoji)
        }
    }

    func suggestedEntities() async throws -> [CounterActivityEntity] {
        WidgetDbHelper().getActivitiesByMode("counter").map {
            CounterActivityEntity(id: $0.id, name: $0.name, emoji: $0.emoji)
        }
    }

    func defaultResult() async -> CounterActivityEntity? {
        try? await suggestedEntities().first
    }
}

struct SelectCounterActivityIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Counter Activity"
    static var description: IntentDescription = "Choose a counter activity to track"

    @Parameter(title: "Activity")
    var activity: CounterActivityEntity?
}

// MARK: - Timeline Entry

struct CounterEntry: TimelineEntry {
    let date: Date
    let activityName: String
    let activityEmoji: String
    let activityId: String?
    let todayCount: Int
    let isProLocked: Bool
}

// MARK: - Timeline Provider

struct CounterTimelineProvider: AppIntentTimelineProvider {
    typealias Entry = CounterEntry
    typealias Intent = SelectCounterActivityIntent

    func placeholder(in context: Context) -> CounterEntry {
        CounterEntry(
            date: Date(), activityName: "Activity", activityEmoji: "",
            activityId: nil, todayCount: 0, isProLocked: false
        )
    }

    func snapshot(for configuration: Intent, in context: Context) async -> CounterEntry {
        buildEntry(for: configuration)
    }

    func timeline(for configuration: Intent, in context: Context) async -> Timeline<CounterEntry> {
        let entry = buildEntry(for: configuration)
        let nextMidnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        return Timeline(entries: [entry], policy: .after(nextMidnight))
    }

    private func buildEntry(for configuration: Intent) -> CounterEntry {
        guard let entity = configuration.activity else {
            return CounterEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                activityId: nil, todayCount: 0, isProLocked: false
            )
        }
        if !WidgetPlanHelper.isWidgetAllowed() {
            return CounterEntry(
                date: Date(), activityName: entity.name, activityEmoji: entity.emoji,
                activityId: entity.id, todayCount: 0, isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(entity.id) else {
            return CounterEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                activityId: entity.id, todayCount: 0, isProLocked: false
            )
        }
        let count = dbHelper.getActivityLogCountForToday(entity.id)
        return CounterEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, activityId: entity.id,
            todayCount: count, isProLocked: false
        )
    }
}

// MARK: - Widget

struct CounterWidget: Widget {
    let kind = "CounterWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCounterActivityIntent.self,
            provider: CounterTimelineProvider()
        ) { entry in
            CounterWidgetView(entry: entry)
        }
        .configurationDisplayName("Actiko Counter")
        .description("活動のカウントを記録します")
        .supportedFamilies([.systemSmall])
    }
}
