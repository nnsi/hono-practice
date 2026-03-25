import AppIntents
import WidgetKit

/// Records a binary activity log with the selected kind.
struct RecordBinaryIntent: AppIntent {
    static var title: LocalizedStringResource = "Record Binary"
    static var description: IntentDescription = "Record a binary activity with selected kind"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Kind ID")
    var kindId: String

    init() {}

    init(activityId: String, kindId: String) {
        self.activityId = activityId
        self.kindId = kindId
    }

    func perform() async throws -> some IntentResult {
        await SimpleLogHelper.saveLog(
            activityId: activityId, kindId: kindId, quantity: 1
        )
        WidgetCenter.shared.reloadTimelines(ofKind: "BinaryWidget")
        return .result()
    }
}
