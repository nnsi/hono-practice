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
        await SimpleLogHelper.saveLog(activityId: activityId, kindId: kindId, quantity: Double(step))
        WidgetCenter.shared.reloadTimelines(ofKind: "CounterWidget")
        return .result()
    }
}
