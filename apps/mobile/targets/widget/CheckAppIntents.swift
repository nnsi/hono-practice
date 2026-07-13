import AppIntents
import WidgetKit

/// Toggles the check state for a specific activity.
/// If not done today, inserts a log with quantity=1 and optional kindId.
/// If already done, soft-deletes today's log(s).
struct ToggleCheckIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Check"
    static var description: IntentDescription = "Toggle the activity check for today"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Kind ID")
    var kindId: String?

    init() {}

    init(activityId: String, kindId: String?) {
        self.activityId = activityId
        self.kindId = kindId
    }

    func perform() async throws -> some IntentResult {
        let dbHelper = WidgetDbHelper()
        guard dbHelper.getActivityById(activityId) != nil else { return .result() }
        if let kindId, !dbHelper.isKindOwnedByActivity(activityId, kindId: kindId) {
            return .result()
        }
        guard case let .success(isDone) = dbHelper.hasActivityLogForToday(
            activityId,
            kindId: kindId
        ) else { return .result() }
        if isDone {
            _ = dbHelper.softDeleteTodayLog(activityId, kindId: kindId)
        } else {
            _ = await SimpleLogHelper.saveLog(
                activityId: activityId, kindId: kindId, quantity: 1
            )
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "CheckWidget")
        return .result()
    }
}
