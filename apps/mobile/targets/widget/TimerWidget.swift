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
            hasPendingKindSelect: false, activityId: nil, kinds: [],
            isProLocked: false
        )
    }

    func snapshot(for configuration: SelectActivityIntent, in context: Context) async -> TimerEntry {
        buildEntry(for: configuration)
    }

    func timeline(for configuration: SelectActivityIntent, in context: Context) async -> Timeline<TimerEntry> {
        let entry = buildEntry(for: configuration)
        return Timeline(entries: [entry], policy: .never)
    }

    private func buildEntry(for configuration: SelectActivityIntent) -> TimerEntry {
        if let entity = configuration.activity {
            TimerState().saveConfig(activityId: entity.id)
        }
        let state = TimerState()
        guard let activityId = configuration.activity?.id ?? state.getConfiguredActivityId() else {
            return TimerEntry(
                date: Date(), activityName: "タップして設定", activityEmoji: "",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: nil, kinds: [],
                isProLocked: false
            )
        }
        if !WidgetPlanHelper.isWidgetAllowed() {
            return TimerEntry(
                date: Date(), activityName: "Timer", activityEmoji: "⏱",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: activityId, kinds: [],
                isProLocked: true
            )
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(activityId) else {
            return TimerEntry(
                date: Date(), activityName: "削除された活動", activityEmoji: "",
                isRunning: false, elapsedMs: 0, timerStartDate: nil,
                hasPendingKindSelect: false, activityId: activityId, kinds: [],
                isProLocked: false
            )
        }
        let isRunning = state.isRunning(activityId: activityId)
        let elapsedMs = state.getElapsedMillis(activityId: activityId)
        let timerStartDate = isRunning
            ? Date().addingTimeInterval(-Double(elapsedMs) / 1000.0)
            : nil
        let pending = state.hasPendingKindSelection(activityId: activityId)
        let kinds: [TimerEntry.KindInfo] = pending
            ? dbHelper.getActivityKinds(activityId).map {
                TimerEntry.KindInfo(id: $0.id, name: $0.name, color: $0.color)
            }
            : []
        return TimerEntry(
            date: Date(), activityName: activity.name,
            activityEmoji: activity.emoji, isRunning: isRunning,
            elapsedMs: elapsedMs, timerStartDate: timerStartDate,
            hasPendingKindSelect: pending, activityId: activityId, kinds: kinds,
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
