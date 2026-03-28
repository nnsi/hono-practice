import Foundation
import SQLite3

struct ActivityRow {
    let id: String
    let name: String
    let emoji: String
    let quantityUnit: String
    let recordingMode: String
    let recordingModeConfig: String?
}

struct KindRow {
    let id: String
    let name: String
    let color: String?
}

/// SQLite access to the shared actiko.db via App Group container.
/// iOS port of Android's WidgetDbHelper.kt.
struct WidgetDbHelper {
    private static var dbPath: String {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: AppConfig.appGroupId
        ) else { return "" }
        return container.appendingPathComponent("SQLite/actiko.db").path
    }

    func openDatabase() -> OpaquePointer? {
        let path = Self.dbPath
        guard FileManager.default.fileExists(atPath: path) else { return nil }
        var db: OpaquePointer?
        guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
            return nil
        }
        sqlite3_exec(db, "PRAGMA journal_mode = WAL;", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA busy_timeout = 5000;", nil, nil, nil)
        return db
    }

    func getTimerActivities() -> [ActivityRow] {
        getActivitiesByMode("timer")
    }

    func getActivitiesByMode(_ mode: String) -> [ActivityRow] {
        guard let db = openDatabase() else { return [] }
        defer { sqlite3_close(db) }
        let sql = """
            SELECT id, name, emoji, quantity_unit, recording_mode, recording_mode_config FROM activities \
            WHERE recording_mode = ? AND deleted_at IS NULL \
            AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current') \
            ORDER BY order_index
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return [] }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, mode)
        var results: [ActivityRow] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            results.append(readActivityRow(stmt))
        }
        return results
    }

    func getActivityById(_ id: String) -> ActivityRow? {
        guard let db = openDatabase() else { return nil }
        defer { sqlite3_close(db) }
        let sql = """
            SELECT id, name, emoji, quantity_unit, recording_mode, recording_mode_config FROM activities \
            WHERE id = ? AND deleted_at IS NULL \
            AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current')
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return nil }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, id)
        guard sqlite3_step(stmt) == SQLITE_ROW else { return nil }
        return readActivityRow(stmt)
    }

    func getActivityKinds(_ activityId: String) -> [KindRow] {
        guard let db = openDatabase() else { return [] }
        defer { sqlite3_close(db) }
        let sql = """
            SELECT id, name, color FROM activity_kinds \
            WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return [] }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, activityId)
        var results: [KindRow] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            results.append(KindRow(
                id: columnText(stmt, 0),
                name: columnText(stmt, 1),
                color: columnOptionalText(stmt, 2)
            ))
        }
        return results
    }

    func insertActivityLog(
        id: String, activityId: String, activityKindId: String?,
        quantity: Double, memo: String, date: String,
        syncStatus: String, createdAt: String, updatedAt: String
    ) {
        guard let db = openDatabase() else { return }
        defer { sqlite3_close(db) }
        let sql = """
            INSERT INTO activity_logs \
            (id, activity_id, activity_kind_id, quantity, memo, date, time, task_id, \
            sync_status, deleted_at, created_at, updated_at) \
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?)
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, id)
        bindText(stmt, 2, activityId)
        bindOptionalText(stmt, 3, activityKindId)
        sqlite3_bind_double(stmt, 4, quantity)
        bindText(stmt, 5, memo)
        bindText(stmt, 6, date)
        bindText(stmt, 7, syncStatus)
        bindText(stmt, 8, createdAt)
        bindText(stmt, 9, updatedAt)
        sqlite3_step(stmt)
    }

    func getPlan() -> String {
        guard let db = openDatabase() else { return "free" }
        defer { sqlite3_close(db) }
        let sql = "SELECT plan FROM auth_state WHERE id = 'current'"
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return "free" }
        defer { sqlite3_finalize(stmt) }
        guard sqlite3_step(stmt) == SQLITE_ROW else { return "free" }
        return columnOptionalText(stmt, 0) ?? "free"
    }

    // MARK: - Config Parsing

    /// Parse counter steps from recording_mode_config JSON.
    /// Format: {"mode":"counter","steps":[1,5,10]}
    /// Falls back to [1] if parsing fails.
    static func parseCounterSteps(_ configJson: String?) -> [Int] {
        guard let json = configJson,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let steps = obj["steps"] as? [Any]
        else { return [1] }
        let intSteps = steps.compactMap { ($0 as? NSNumber)?.intValue }.filter { $0 > 0 }
        return intSteps.isEmpty ? [1] : intSteps
    }

    // MARK: - Helpers

    static func todayDateString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    func readActivityRow(_ stmt: OpaquePointer) -> ActivityRow {
        ActivityRow(
            id: columnText(stmt, 0),
            name: columnText(stmt, 1),
            emoji: columnOptionalText(stmt, 2) ?? "",
            quantityUnit: columnOptionalText(stmt, 3) ?? "",
            recordingMode: columnOptionalText(stmt, 4) ?? "timer",
            recordingModeConfig: columnOptionalText(stmt, 5)
        )
    }

    func columnText(_ stmt: OpaquePointer, _ index: Int32) -> String {
        if let cStr = sqlite3_column_text(stmt, index) {
            return String(cString: cStr)
        }
        return ""
    }

    func columnOptionalText(_ stmt: OpaquePointer, _ index: Int32) -> String? {
        if sqlite3_column_type(stmt, index) == SQLITE_NULL { return nil }
        if let cStr = sqlite3_column_text(stmt, index) {
            return String(cString: cStr)
        }
        return nil
    }

    func bindText(_ stmt: OpaquePointer, _ index: Int32, _ value: String) {
        sqlite3_bind_text(stmt, index, (value as NSString).utf8String, -1, nil)
    }

    func bindOptionalText(_ stmt: OpaquePointer, _ index: Int32, _ value: String?) {
        if let value = value {
            sqlite3_bind_text(stmt, index, (value as NSString).utf8String, -1, nil)
        } else {
            sqlite3_bind_null(stmt, index)
        }
    }
}
