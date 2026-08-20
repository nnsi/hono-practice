import AppIntents
import WidgetKit

/// Starts the timer for the configured activity.
struct StartTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Timer"
    static var description: IntentDescription = "Start the activity timer"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String

    init() {}

    init(activityId: String, timerInstanceId: String) {
        self.activityId = activityId
        self.timerInstanceId = timerInstanceId
    }

    func perform() async throws -> some IntentResult {
        guard await WidgetPlanHelper.isWidgetAllowed() else {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
            return .result()
        }
        let state = TimerState()
        state.startTimer(timerInstanceId: timerInstanceId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Pauses the timer without saving. Accumulated time is preserved for resume.
struct PauseTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Pause Timer"
    static var description: IntentDescription = "Pause the activity timer"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String

    init() {}

    init(activityId: String, timerInstanceId: String) {
        self.activityId = activityId
        self.timerInstanceId = timerInstanceId
    }

    func perform() async throws -> some IntentResult {
        guard await WidgetPlanHelper.isWidgetAllowed() else {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
            return .result()
        }
        let state = TimerState()
        state.stopTimer(timerInstanceId: timerInstanceId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Stops the timer and saves a log. If kinds exist, flags pending kind selection.
struct StopTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Timer"
    static var description: IntentDescription = "Stop the activity timer and save"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String

    init() {}

    init(activityId: String, timerInstanceId: String) {
        self.activityId = activityId
        self.timerInstanceId = timerInstanceId
    }

    func perform() async throws -> some IntentResult {
        let isPlanAllowed = await WidgetPlanHelper.isWidgetAllowed()
        guard isPlanAllowed else {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
            return .result()
        }

        let state = TimerState()
        if state.isRunning(timerInstanceId: timerInstanceId) {
            state.stopTimer(timerInstanceId: timerInstanceId)
        }
        let dbHelper = WidgetDbHelper()
        let kinds = dbHelper.getActivityKinds(activityId)
        if kinds.isEmpty {
            TimerSavePolicy.performOnSuccess(SaveLogHelper.saveLog(
                activityId: activityId,
                timerInstanceId: timerInstanceId,
                kindId: nil,
                isPlanAllowed: isPlanAllowed
            )) {
                state.resetTimer(timerInstanceId: timerInstanceId)
            }
        } else {
            state.setPendingKindSelection(timerInstanceId: timerInstanceId)
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

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String

    init() {}

    init(activityId: String, timerInstanceId: String, kindId: String) {
        self.activityId = activityId
        self.timerInstanceId = timerInstanceId
        self.kindId = kindId
    }

    func perform() async throws -> some IntentResult {
        let isPlanAllowed = await WidgetPlanHelper.isWidgetAllowed()
        guard isPlanAllowed else {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
            return .result()
        }

        let state = TimerState()
        TimerSavePolicy.performOnSuccess(SaveLogHelper.saveLog(
            activityId: activityId,
            timerInstanceId: timerInstanceId,
            kindId: kindId,
            isPlanAllowed: isPlanAllowed
        )) {
            state.clearPendingKindSelection(timerInstanceId: timerInstanceId)
            state.resetTimer(timerInstanceId: timerInstanceId)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}

/// Resets the timer state (clears elapsed time).
struct ResetTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Reset Timer"
    static var description: IntentDescription = "Reset the activity timer"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Timer Instance ID")
    var timerInstanceId: String

    init() {}

    init(activityId: String, timerInstanceId: String) {
        self.activityId = activityId
        self.timerInstanceId = timerInstanceId
    }

    func perform() async throws -> some IntentResult {
        guard await WidgetPlanHelper.isWidgetAllowed() else {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
            return .result()
        }
        let state = TimerState()
        state.clearPendingKindSelection(timerInstanceId: timerInstanceId)
        state.resetTimer(timerInstanceId: timerInstanceId)
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerWidget")
        return .result()
    }
}
