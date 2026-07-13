import AppIntents
import Foundation
import WidgetKit

/// Entity representing an Activity for the widget configuration picker.
struct ActivityEntity: AppEntity {
    let id: String
    let name: String
    let emoji: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Activity"
    static var defaultQuery = ActivityEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(emoji) \(name)")
    }
}

/// Query that fetches timer activities from the shared DB.
struct ActivityEntityQuery: EntityQuery {
    func entities(for identifiers: [ActivityEntity.ID]) async throws -> [ActivityEntity] {
        let dbHelper = WidgetDbHelper()
        return identifiers.compactMap { id in
            guard let row = dbHelper.getActivityById(id) else { return nil }
            return ActivityEntity(id: row.id, name: row.name, emoji: row.emoji)
        }
    }

    func suggestedEntities() async throws -> [ActivityEntity] {
        let dbHelper = WidgetDbHelper()
        return dbHelper.getTimerActivities().map {
            ActivityEntity(id: $0.id, name: $0.name, emoji: $0.emoji)
        }
    }

    func defaultResult() async -> ActivityEntity? {
        try? await suggestedEntities().first
    }
}

/// Configuration intent for selecting which Activity the widget tracks.
struct SelectActivityIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Activity"
    static var description: IntentDescription = "Choose a timer activity to track"

    @Parameter(title: "Activity")
    var activity: ActivityEntity?

    /// WidgetKit does not expose an integer appWidgetId. Persist a UUID in the
    /// configuration itself so two Widgets selecting the same Activity do not
    /// share timer state.
    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Track \(\.$activity)")
    }

    init() {
        timerInstanceId = UUID().uuidString
    }
}
