import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Entity & Query

struct BinaryActivityEntity: AppEntity {
    let id: String
    let name: String
    let emoji: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Binary Activity"
    static var defaultQuery = BinaryEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(name)")
    }
}

struct BinaryEntityQuery: EntityQuery {
    func entities(for identifiers: [BinaryActivityEntity.ID]) async throws
        -> [BinaryActivityEntity]
    {
        let dbHelper = WidgetDbHelper()
        return identifiers.compactMap { id in
            guard let row = dbHelper.getActivityById(id) else { return nil }
            return BinaryActivityEntity(id: row.id, name: row.name, emoji: row.emoji)
        }
    }

    func suggestedEntities() async throws -> [BinaryActivityEntity] {
        WidgetDbHelper().getActivitiesByMode("binary").map {
            BinaryActivityEntity(id: $0.id, name: $0.name, emoji: $0.emoji)
        }
    }

    func defaultResult() async -> BinaryActivityEntity? {
        try? await suggestedEntities().first
    }
}

struct SelectBinaryActivityIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Binary Activity"
    static var description: IntentDescription = "Choose a binary activity to track"

    @Parameter(title: "Activity")
    var activity: BinaryActivityEntity?
}

// MARK: - Timeline Entry

struct BinaryEntry: TimelineEntry {
    let date: Date
    let activityName: String
    let activityEmoji: String
    let activityId: String?
    let kinds: [KindInfo]
    let isProLocked: Bool

    struct KindInfo: Identifiable {
        let id: String
        let name: String
        let color: String?
    }
}

// MARK: - Timeline Provider

struct BinaryTimelineProvider: AppIntentTimelineProvider {
    typealias Entry = BinaryEntry
    typealias Intent = SelectBinaryActivityIntent

    func placeholder(in context: Context) -> BinaryEntry {
        BinaryEntry(
            date: Date(), activityName: "Activity", activityEmoji: "",
            activityId: nil, kinds: [], isProLocked: false
        )
    }

    func snapshot(for configuration: Intent, in context: Context) async -> BinaryEntry {
        await buildEntry(for: configuration)
    }

    func timeline(for configuration: Intent, in context: Context) async -> Timeline<BinaryEntry> {
        let entry = await buildEntry(for: configuration)
        let nextMidnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        return Timeline(entries: [entry], policy: .after(nextMidnight))
    }

    private func buildEntry(for configuration: Intent) async -> BinaryEntry {
        guard let entity = configuration.activity else {
            return BinaryEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                activityId: nil, kinds: [], isProLocked: false
            )
        }
        if !(await WidgetPlanHelper.isWidgetAllowed()) {
            return BinaryEntry(
                date: Date(), activityName: entity.name, activityEmoji: entity.emoji,
                activityId: entity.id, kinds: [], isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(entity.id) else {
            return BinaryEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                activityId: entity.id, kinds: [], isProLocked: false
            )
        }
        let kinds = dbHelper.getActivityKinds(entity.id).map {
            BinaryEntry.KindInfo(id: $0.id, name: $0.name, color: $0.color)
        }
        return BinaryEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, activityId: entity.id,
            kinds: kinds, isProLocked: false
        )
    }
}

// MARK: - Widget

struct BinaryWidget: Widget {
    let kind = "BinaryWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectBinaryActivityIntent.self,
            provider: BinaryTimelineProvider()
        ) { entry in
            BinaryWidgetView(entry: entry)
        }
        .configurationDisplayName("Actiko Binary")
        .description("二択の活動を記録します")
        .supportedFamilies([.systemSmall])
    }
}
