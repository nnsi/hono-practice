import SwiftUI
import WidgetKit

struct TimerEntry: TimelineEntry {
    let date: Date
    let activityName: String
    let activityEmoji: String
    let isRunning: Bool
    let elapsedMs: Int64
    /// The Date from which the OS `.timer` style counts up.
    let timerStartDate: Date?
    let hasPendingKindSelect: Bool
    let activityId: String?
    let timerInstanceId: String?
    let kinds: [KindInfo]
    let isProLocked: Bool

    struct KindInfo: Identifiable {
        let id: String
        let name: String
        let color: String?
    }
}

struct TimerTimelineProvider: AppIntentTimelineProvider {
    typealias Entry = TimerEntry
    typealias Intent = SelectActivityIntent

    func placeholder(in context: Context) -> TimerEntry {
        TimerEntry(
            date: Date(), activityName: "Activity", activityEmoji: "⏱",
            isRunning: false, elapsedMs: 0, timerStartDate: nil,
            hasPendingKindSelect: false, activityId: nil,
            timerInstanceId: nil, kinds: [],
            isProLocked: false
        )
    }

    func snapshot(for configuration: SelectActivityIntent, in context: Context) async -> TimerEntry {
        await buildEntry(for: configuration)
    }

    func timeline(for configuration: SelectActivityIntent, in context: Context) async -> Timeline<TimerEntry> {
        let entry = await buildEntry(for: configuration)
        let nextMidnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        )
        return Timeline(entries: [entry], policy: .after(nextMidnight))
    }

    private func buildEntry(for configuration: SelectActivityIntent) async -> TimerEntry {
        let state = TimerState()
        guard let activityId = configuration.activity?.id else {
            return TimerEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: nil,
                timerInstanceId: nil, kinds: [],
                isProLocked: false
            )
        }
        // Existing pre-release Widget configurations may not have this field.
        // The fallback keeps them functional; all newly added Widgets persist a
        // UUID and therefore remain fully independent.
        let timerInstanceId = configuration.timerInstanceId ?? "legacy-\(activityId)"
        if !(await WidgetPlanHelper.isWidgetAllowed()) {
            return TimerEntry(
                date: Date(), activityName: "Timer", activityEmoji: "⏱",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: activityId,
                timerInstanceId: timerInstanceId, kinds: [],
                isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(activityId) else {
            return TimerEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: activityId,
                timerInstanceId: timerInstanceId, kinds: [],
                isProLocked: false
            )
        }
        let isRunning = state.isRunning(timerInstanceId: timerInstanceId)
        let elapsedMs = state.getElapsedMillis(timerInstanceId: timerInstanceId)
        let timerStartDate = isRunning
            ? Date().addingTimeInterval(-Double(elapsedMs) / 1000.0)
            : nil
        let pending = state.hasPendingKindSelection(timerInstanceId: timerInstanceId)
        let kinds: [TimerEntry.KindInfo] = pending
            ? dbHelper.getActivityKinds(activityId).map {
                TimerEntry.KindInfo(id: $0.id, name: $0.name, color: $0.color)
            }
            : []
        return TimerEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, isRunning: isRunning,
            elapsedMs: elapsedMs, timerStartDate: timerStartDate,
            hasPendingKindSelect: pending, activityId: activityId,
            timerInstanceId: timerInstanceId, kinds: kinds,
            isProLocked: false
        )
    }
}

struct TimerWidget: Widget {
    let kind = "TimerWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectActivityIntent.self,
            provider: TimerTimelineProvider()
        ) { entry in
            TimerWidgetView(entry: entry)
        }
        .configurationDisplayName("Actiko Timer")
        .description("活動のタイマーを操作します")
        .supportedFamilies([.systemMedium])
    }
}
