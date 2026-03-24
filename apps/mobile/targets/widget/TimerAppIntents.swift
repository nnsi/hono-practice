import AppIntents
import WidgetKit

/// Starts the timer for the configured activity.
struct StartTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Timer"
    static var description: IntentDescription = "Start the activity timer"

    func perform() async throws -> some IntentResult {
        let state = TimerState()
        guard let activityId = state.getConfiguredActivityId() else {
            return .result()
        }
        state.startTimer(activityId: activityId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Pauses the timer without saving. Accumulated time is preserved for resume.
struct PauseTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Pause Timer"
    static var description: IntentDescription = "Pause the activity timer"

    func perform() async throws -> some IntentResult {
        let state = TimerState()
        guard let activityId = state.getConfiguredActivityId() else {
            return .result()
        }
        state.stopTimer(activityId: activityId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Stops the timer and saves a log. If kinds exist, flags pending kind selection.
struct StopTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Timer"
    static var description: IntentDescription = "Stop the activity timer and save"

    func perform() async throws -> some IntentResult {
        let state = TimerState()
        guard let activityId = state.getConfiguredActivityId() else {
            return .result()
        }
        if state.isRunning(activityId: activityId) {
            state.stopTimer(activityId: activityId)
        }
        let dbHelper = WidgetDbHelper()
        let kinds = dbHelper.getActivityKinds(activityId)
        if kinds.isEmpty {
            SaveLogHelper.saveLog(activityId: activityId, kindId: nil)
            state.resetTimer(activityId: activityId)
        } else {
            state.setPendingKindSelection(activityId: activityId)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Saves a log with a specific kind and resets the timer.
/// Used by inline kind buttons in the widget (hybrid approach).
struct SaveWithKindIntent: AppIntent {
    static var title: LocalizedStringResource = "Save with Kind"
    static var description: IntentDescription = "Save the activity log with selected kind"

    @Parameter(title: "Kind ID")
    var kindId: String

    init() {}

    init(kindId: String) {
        self.kindId = kindId
    }

    func perform() async throws -> some IntentResult {
        let state = TimerState()
        guard let activityId = state.getConfiguredActivityId() else {
            return .result()
        }
        SaveLogHelper.saveLog(activityId: activityId, kindId: kindId)
        state.clearPendingKindSelection(activityId: activityId)
        state.resetTimer(activityId: activityId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Resets the timer state (clears elapsed time).
struct ResetTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Reset Timer"
    static var description: IntentDescription = "Reset the activity timer"

    func perform() async throws -> some IntentResult {
        let state = TimerState()
        guard let activityId = state.getConfiguredActivityId() else {
            return .result()
        }
        state.clearPendingKindSelection(activityId: activityId)
        state.resetTimer(activityId: activityId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}
