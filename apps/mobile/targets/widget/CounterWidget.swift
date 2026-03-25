import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Activity Entity & Query

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

// MARK: - Kind Entity & Query

struct CounterKindEntity: AppEntity {
    let id: String
    let name: String
    let activityId: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Kind"
    static var defaultQuery = CounterKindEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct CounterKindEntityQuery: EntityQuery {
    @IntentParameterDependency<SelectCounterActivityIntent>(\.$activity)
    var activityParam

    func entities(for identifiers: [CounterKindEntity.ID]) async throws
        -> [CounterKindEntity]
    {
        let dbHelper = WidgetDbHelper()
        let activities = dbHelper.getActivitiesByMode("counter")
        var result: [CounterKindEntity] = []
        for activity in activities {
            let kinds = dbHelper.getActivityKinds(activity.id)
            for kind in kinds where identifiers.contains(kind.id) {
                result.append(CounterKindEntity(
                    id: kind.id, name: kind.name, activityId: activity.id
                ))
            }
        }
        return result
    }

    func suggestedEntities() async throws -> [CounterKindEntity] {
        guard let activityEntity = activityParam?.activity else { return [] }
        return WidgetDbHelper().getActivityKinds(activityEntity.id).map {
            CounterKindEntity(id: $0.id, name: $0.name, activityId: activityEntity.id)
        }
    }

    func defaultResult() async -> CounterKindEntity? {
        try? await suggestedEntities().first
    }
}

// MARK: - Configuration Intent

struct SelectCounterActivityIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Counter Activity"
    static var description: IntentDescription = "Choose a counter activity to track"

    @Parameter(title: "Activity")
    var activity: CounterActivityEntity?

    @Parameter(title: "Kind")
    var kind: CounterKindEntity?
}

// MARK: - Timeline Entry

struct CounterEntry: TimelineEntry {
    let date: Date
    let activityName: String
    let activityEmoji: String
    let activityId: String?
    let kindId: String?
    let kindName: String?
    let todayCount: Int
    let steps: [Int]
    let isProLocked: Bool
}

// MARK: - Timeline Provider

struct CounterTimelineProvider: AppIntentTimelineProvider {
    typealias Entry = CounterEntry
    typealias Intent = SelectCounterActivityIntent

    func placeholder(in context: Context) -> CounterEntry {
        CounterEntry(
            date: Date(), activityName: "Activity", activityEmoji: "",
            activityId: nil, kindId: nil, kindName: nil,
            todayCount: 0, steps: [1], isProLocked: false
        )
    }

    func snapshot(for configuration: Intent, in context: Context) async -> CounterEntry {
        await buildEntry(for: configuration)
    }

    func timeline(for configuration: Intent, in context: Context) async -> Timeline<CounterEntry> {
        let entry = await buildEntry(for: configuration)
        let nextMidnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        return Timeline(entries: [entry], policy: .after(nextMidnight))
    }

    private func buildEntry(for configuration: Intent) async -> CounterEntry {
        let kindId = configuration.kind?.id
        let kindName = configuration.kind?.name

        guard let entity = configuration.activity else {
            return CounterEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                activityId: nil, kindId: nil, kindName: nil,
                todayCount: 0, steps: [1], isProLocked: false
            )
        }
        if !(await WidgetPlanHelper.isWidgetAllowed()) {
            return CounterEntry(
                date: Date(), activityName: entity.name, activityEmoji: entity.emoji,
                activityId: entity.id, kindId: kindId, kindName: kindName,
                todayCount: 0, steps: [1], isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(entity.id) else {
            return CounterEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                activityId: entity.id, kindId: nil, kindName: nil,
                todayCount: 0, steps: [1], isProLocked: false
            )
        }
        let count = dbHelper.getActivityLogCountForToday(entity.id)
        let steps = WidgetDbHelper.parseCounterSteps(activity.recordingModeConfig)
        return CounterEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, activityId: entity.id,
            kindId: kindId, kindName: kindName,
            todayCount: count, steps: steps, isProLocked: false
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
