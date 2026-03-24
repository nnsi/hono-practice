import Foundation

/// Manages timer state in UserDefaults shared via App Group.
/// iOS port of Android's TimerPreferences.kt.
/// Uses Activity ID as key (not widget ID, since WidgetKit doesn't have integer IDs).
struct TimerState {
    private let defaults: UserDefaults?

    init() {
        defaults = UserDefaults(suiteName: AppConfig.appGroupId)
    }

    private func key(_ activityId: String, _ field: String) -> String {
        "timer_\(activityId)_\(field)"
    }

    // MARK: - Config

    func saveConfig(activityId: String) {
        defaults?.set(activityId, forKey: "configured_activity_id")
    }

    func getConfiguredActivityId() -> String? {
        defaults?.string(forKey: "configured_activity_id")
    }

    // MARK: - Timer Control

    func startTimer(activityId: String) {
        let now = Date()
        defaults?.set(true, forKey: key(activityId, "isRunning"))
        defaults?.set(now.timeIntervalSince1970 * 1000, forKey: key(activityId, "startTimeMillis"))
        if getStartDateIso(activityId: activityId) == nil {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            defaults?.set(formatter.string(from: now), forKey: key(activityId, "startDateIso"))
        }
    }

    func stopTimer(activityId: String) {
        let startMs = defaults?.double(forKey: key(activityId, "startTimeMillis")) ?? 0
        let elapsed: Int64 = startMs > 0
            ? Int64(Date().timeIntervalSince1970 * 1000 - startMs)
            : 0
        let accumulated = defaults?.object(forKey: key(activityId, "accumulatedMillis")) as? Int64 ?? 0
        defaults?.set(accumulated + elapsed, forKey: key(activityId, "accumulatedMillis"))
        defaults?.set(false, forKey: key(activityId, "isRunning"))
        defaults?.set(Double(0), forKey: key(activityId, "startTimeMillis"))
    }

    func resetTimer(activityId: String) {
        defaults?.set(Int64(0), forKey: key(activityId, "accumulatedMillis"))
        defaults?.removeObject(forKey: key(activityId, "startDateIso"))
        defaults?.set(false, forKey: key(activityId, "isRunning"))
        defaults?.set(Double(0), forKey: key(activityId, "startTimeMillis"))
    }

    // MARK: - Queries

    func getElapsedMillis(activityId: String) -> Int64 {
        let accumulated = defaults?.object(forKey: key(activityId, "accumulatedMillis")) as? Int64 ?? 0
        guard isRunning(activityId: activityId) else { return accumulated }
        let startMs = defaults?.double(forKey: key(activityId, "startTimeMillis")) ?? 0
        let current: Int64 = startMs > 0
            ? Int64(Date().timeIntervalSince1970 * 1000 - startMs)
            : 0
        return accumulated + current
    }

    func isRunning(activityId: String) -> Bool {
        defaults?.bool(forKey: key(activityId, "isRunning")) ?? false
    }

    func getStartDateIso(activityId: String) -> String? {
        defaults?.string(forKey: key(activityId, "startDateIso"))
    }

    // MARK: - Pending Kind Selection

    func setPendingKindSelection(activityId: String) {
        defaults?.set(true, forKey: key(activityId, "pendingKindSelect"))
    }

    func clearPendingKindSelection(activityId: String) {
        defaults?.set(false, forKey: key(activityId, "pendingKindSelect"))
    }

    func hasPendingKindSelection(activityId: String) -> Bool {
        defaults?.bool(forKey: key(activityId, "pendingKindSelect")) ?? false
    }
}
