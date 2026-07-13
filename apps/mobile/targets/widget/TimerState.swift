import Foundation

/// Manages timer state in UserDefaults shared via App Group.
/// iOS port of Android's TimerPreferences.kt.
/// Uses the persisted Widget configuration instance ID as the key. Activity ID
/// is deliberately not part of the key because two Widgets may select the same
/// Activity and must still keep independent timers.
struct TimerState {
    private let defaults: UserDefaults?
    private let now: () -> Date

    init(
        defaults: UserDefaults? = UserDefaults(suiteName: AppConfig.appGroupId),
        now: @escaping () -> Date = Date.init
    ) {
        self.defaults = defaults
        self.now = now
    }

    private func key(_ timerInstanceId: String, _ field: String) -> String {
        "timer_\(timerInstanceId)_\(field)"
    }

    // MARK: - Timer Control

    func startTimer(timerInstanceId: String) {
        let currentDate = now()
        defaults?.set(true, forKey: key(timerInstanceId, "isRunning"))
        defaults?.set(
            currentDate.timeIntervalSince1970 * 1000,
            forKey: key(timerInstanceId, "startTimeMillis")
        )
        if getStartDateIso(timerInstanceId: timerInstanceId) == nil {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            defaults?.set(
                formatter.string(from: currentDate),
                forKey: key(timerInstanceId, "startDateIso")
            )
        }
    }

    func stopTimer(timerInstanceId: String) {
        let startMs = defaults?.double(forKey: key(timerInstanceId, "startTimeMillis")) ?? 0
        let elapsed: Int64 = startMs > 0
            ? Int64(now().timeIntervalSince1970 * 1000 - startMs)
            : 0
        let accumulated = defaults?.object(
            forKey: key(timerInstanceId, "accumulatedMillis")
        ) as? Int64 ?? 0
        defaults?.set(
            accumulated + elapsed,
            forKey: key(timerInstanceId, "accumulatedMillis")
        )
        defaults?.set(false, forKey: key(timerInstanceId, "isRunning"))
        defaults?.set(Double(0), forKey: key(timerInstanceId, "startTimeMillis"))
    }

    func resetTimer(timerInstanceId: String) {
        defaults?.set(Int64(0), forKey: key(timerInstanceId, "accumulatedMillis"))
        defaults?.removeObject(forKey: key(timerInstanceId, "startDateIso"))
        defaults?.set(false, forKey: key(timerInstanceId, "isRunning"))
        defaults?.set(Double(0), forKey: key(timerInstanceId, "startTimeMillis"))
    }

    // MARK: - Queries

    func getElapsedMillis(timerInstanceId: String) -> Int64 {
        let accumulated = defaults?.object(
            forKey: key(timerInstanceId, "accumulatedMillis")
        ) as? Int64 ?? 0
        guard isRunning(timerInstanceId: timerInstanceId) else { return accumulated }
        let startMs = defaults?.double(forKey: key(timerInstanceId, "startTimeMillis")) ?? 0
        let current: Int64 = startMs > 0
            ? Int64(now().timeIntervalSince1970 * 1000 - startMs)
            : 0
        return accumulated + current
    }

    func isRunning(timerInstanceId: String) -> Bool {
        defaults?.bool(forKey: key(timerInstanceId, "isRunning")) ?? false
    }

    func getStartDateIso(timerInstanceId: String) -> String? {
        defaults?.string(forKey: key(timerInstanceId, "startDateIso"))
    }

    // MARK: - Pending Kind Selection

    func setPendingKindSelection(timerInstanceId: String) {
        defaults?.set(true, forKey: key(timerInstanceId, "pendingKindSelect"))
    }

    func clearPendingKindSelection(timerInstanceId: String) {
        defaults?.set(false, forKey: key(timerInstanceId, "pendingKindSelect"))
    }

    func hasPendingKindSelection(timerInstanceId: String) -> Bool {
        defaults?.bool(forKey: key(timerInstanceId, "pendingKindSelect")) ?? false
    }
}
