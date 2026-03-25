import AppIntents
import WidgetKit

/// Increments the counter for a specific activity by 1.
struct IncrementCounterIntent: AppIntent {
    static var title: LocalizedStringResource = "Increment Counter"
    static var description: IntentDescription = "Add 1 to the activity counter"

    @Parameter(title: "Activity ID")
    var activityId: String

    init() {}

    init(activityId: String) {
        self.activityId = activityId
    }

    func perform() async throws -> some IntentResult {
        SimpleLogHelper.saveLog(activityId: activityId, kindId: nil, quantity: 1)
        WidgetCenter.shared.reloadTimelines(ofKind: "CounterWidget")
        return .result()
    }
}
