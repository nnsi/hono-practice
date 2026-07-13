import Foundation
import SQLite3

private func require(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        fatalError(message)
    }
}

private func execute(_ db: OpaquePointer?, _ sql: String) {
    var error: UnsafeMutablePointer<CChar>?
    let status = sqlite3_exec(db, sql, nil, nil, &error)
    if status != SQLITE_OK {
        let message = error.map { String(cString: $0) } ?? "unknown SQLite error"
        sqlite3_free(error)
        fatalError(message)
    }
}

private func testTimerInstancesAreIndependent() {
    let suite = "actiko-widget-test-\(UUID().uuidString)"
    guard let defaults = UserDefaults(suiteName: suite) else {
        fatalError("Unable to create isolated UserDefaults")
    }
    defaults.removePersistentDomain(forName: suite)
    defer { defaults.removePersistentDomain(forName: suite) }

    var currentDate = Date(timeIntervalSince1970: 1_700_000_000)
    let state = TimerState(defaults: defaults, now: { currentDate })

    state.startTimer(timerInstanceId: "widget-a")
    currentDate.addTimeInterval(5)
    require(state.isRunning(timerInstanceId: "widget-a"), "widget-a must run")
    require(!state.isRunning(timerInstanceId: "widget-b"), "widget-b must remain idle")
    require(state.getElapsedMillis(timerInstanceId: "widget-a") == 5_000, "widget-a elapsed")
    require(state.getElapsedMillis(timerInstanceId: "widget-b") == 0, "widget-b elapsed")

    state.stopTimer(timerInstanceId: "widget-a")
    state.setPendingKindSelection(timerInstanceId: "widget-a")
    state.startTimer(timerInstanceId: "widget-b")
    currentDate.addTimeInterval(3)

    require(state.getElapsedMillis(timerInstanceId: "widget-a") == 5_000, "widget-a preserved")
    require(state.getElapsedMillis(timerInstanceId: "widget-b") == 3_000, "widget-b independent")
    require(state.hasPendingKindSelection(timerInstanceId: "widget-a"), "widget-a pending")
    require(!state.hasPendingKindSelection(timerInstanceId: "widget-b"), "widget-b pending")

    state.resetTimer(timerInstanceId: "widget-a")
    require(state.getElapsedMillis(timerInstanceId: "widget-a") == 0, "widget-a reset")
    require(state.getElapsedMillis(timerInstanceId: "widget-b") == 3_000, "widget-b survives reset")
}

private func makeConstraintFailureDatabase() -> String {
    let path = FileManager.default.temporaryDirectory
        .appendingPathComponent("actiko-widget-\(UUID().uuidString).sqlite")
        .path
    var db: OpaquePointer?
    require(sqlite3_open(path, &db) == SQLITE_OK, "open temporary database")
    defer { sqlite3_close(db) }
    execute(db, """
        CREATE TABLE auth_state (id TEXT PRIMARY KEY, user_id TEXT, plan TEXT);
        CREATE TABLE activities (
          id TEXT PRIMARY KEY, name TEXT, emoji TEXT, quantity_unit TEXT,
          recording_mode TEXT, recording_mode_config TEXT, deleted_at TEXT,
          user_id TEXT, order_index INTEGER
        );
        CREATE TABLE activity_kinds (
          id TEXT PRIMARY KEY, name TEXT, color TEXT, activity_id TEXT,
          deleted_at TEXT, order_index INTEGER
        );
        CREATE TABLE activity_logs (
          id TEXT PRIMARY KEY, activity_id TEXT, activity_kind_id TEXT,
          quantity REAL CHECK (quantity < 0), memo TEXT, date TEXT, time TEXT,
          task_id TEXT, sync_status TEXT, deleted_at TEXT, created_at TEXT,
          updated_at TEXT
        );
        INSERT INTO auth_state VALUES ('current', 'user-a', 'premium');
        INSERT INTO activities VALUES (
          'activity-a', 'Focus', 'F', 'second', 'timer', NULL, NULL, 'user-a', 0
        );
        INSERT INTO activities VALUES (
          'activity-b', 'Other', 'O', 'second', 'timer', NULL, NULL, 'user-a', 1
        );
        INSERT INTO activity_kinds VALUES ('kind-a', 'Deep', NULL, 'activity-a', NULL, 0);
        INSERT INTO activity_kinds VALUES ('kind-b', 'Other', NULL, 'activity-b', NULL, 0);
        """)
    return path
}

private func testKindOwnershipAndWriteFailurePreserveTimer() {
    let databasePath = makeConstraintFailureDatabase()
    defer { try? FileManager.default.removeItem(atPath: databasePath) }
    let dbHelper = WidgetDbHelper(databasePath: databasePath)

    require(dbHelper.isKindOwnedByActivity("activity-a", kindId: "kind-a"), "owned kind")
    require(!dbHelper.isKindOwnedByActivity("activity-a", kindId: "kind-b"), "foreign kind")

    let suite = "actiko-widget-save-test-\(UUID().uuidString)"
    guard let defaults = UserDefaults(suiteName: suite) else {
        fatalError("Unable to create save test UserDefaults")
    }
    defaults.removePersistentDomain(forName: suite)
    defer { defaults.removePersistentDomain(forName: suite) }
    var currentDate = Date(timeIntervalSince1970: 1_700_000_000)
    let state = TimerState(defaults: defaults, now: { currentDate })
    state.startTimer(timerInstanceId: "widget-a")
    currentDate.addTimeInterval(10)
    state.stopTimer(timerInstanceId: "widget-a")

    let result = SaveLogHelper.saveLog(
        activityId: "activity-a",
        timerInstanceId: "widget-a",
        kindId: "kind-a",
        state: state,
        dbHelper: dbHelper,
        now: currentDate,
        logId: "log-a"
    )
    var resetCalled = false
    let saved = TimerSavePolicy.performOnSuccess(result) {
        resetCalled = true
        state.resetTimer(timerInstanceId: "widget-a")
    }

    require(!saved, "constraint failure must be returned")
    require(!resetCalled, "failed write must not reset")
    require(state.getElapsedMillis(timerInstanceId: "widget-a") == 10_000, "elapsed preserved")

    let foreignKindResult = SaveLogHelper.saveLog(
        activityId: "activity-a",
        timerInstanceId: "widget-a",
        kindId: "kind-b",
        state: state,
        dbHelper: dbHelper,
        now: currentDate,
        logId: "log-b"
    )
    if case .failure(.noMatchingRow) = foreignKindResult {
        // Expected: the kind belongs to another Activity.
    } else {
        fatalError("foreign kind must be rejected")
    }
}

@main
private struct WidgetNativeTests {
    static func main() {
        testTimerInstancesAreIndependent()
        testKindOwnershipAndWriteFailurePreserveTimer()
        print("Widget Swift native tests: PASS")
    }
}
