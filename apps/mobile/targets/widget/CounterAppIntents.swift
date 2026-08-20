import AppIntents
import WidgetKit

/// Increments the counter for a specific activity by the given step amount.
struct IncrementCounterIntent: AppIntent {
    static var title: LocalizedStringResource = "Increment Counter"
    static var description: IntentDescription = "Add to the activity counter"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Kind ID")
    var kindId: String?

    @Parameter(title: "Step")
    var step: Int

    init() {}

    init(activityId: String, kindId: String?, step: Int) {
        self.activityId = activityId
        self.kindId = kindId
        self.step = step
    }

    func perform() async throws -> some IntentResult {
        let isPlanAllowed = await WidgetPlanHelper.isWidgetAllowed()
        guard isPlanAllowed else {
            WidgetCenter.shared.reloadTimelines(ofKind: "CounterWidget")
            return .result()
        }
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(activityId),
              WidgetDbHelper.parseCounterSteps(activity.recordingModeConfig).contains(step)
        else { return .result() }
        _ = await SimpleLogHelper.saveLog(
            activityId: activityId,
            kindId: kindId,
            quantity: Double(step),
            isPlanAllowed: isPlanAllowed
        )
        WidgetCenter.shared.reloadTimelines(ofKind: "CounterWidget")
        return .result()
    }
}
