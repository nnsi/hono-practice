import Foundation
import SQLite3

/// Counter / Check / Binary widget DB queries.
extension WidgetDbHelper {
    func getActivityLogCountForToday(_ activityId: String) -> Int {
        guard let db = openDatabase() else { return 0 }
        defer { sqlite3_close(db) }
        let today = Self.todayDateString()
        let sql = """
            SELECT COALESCE(SUM(quantity), 0) FROM activity_logs \
            WHERE activity_id = ? AND date = ? AND deleted_at IS NULL
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return 0 }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, activityId)
        bindText(stmt, 2, today)
        guard sqlite3_step(stmt) == SQLITE_ROW else { return 0 }
        return Int(sqlite3_column_int(stmt, 0))
    }

    func hasActivityLogForToday(_ activityId: String) -> Bool {
        guard let db = openDatabase() else { return false }
        defer { sqlite3_close(db) }
        let today = Self.todayDateString()
        let sql = """
            SELECT COUNT(*) FROM activity_logs \
            WHERE activity_id = ? AND date = ? AND deleted_at IS NULL
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return false }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, activityId)
        bindText(stmt, 2, today)
        guard sqlite3_step(stmt) == SQLITE_ROW else { return false }
        return sqlite3_column_int(stmt, 0) > 0
    }

    func softDeleteTodayLog(_ activityId: String) {
        guard let db = openDatabase() else { return }
        defer { sqlite3_close(db) }
        let today = Self.todayDateString()
        let utcFormatter = ISO8601DateFormatter()
        utcFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = utcFormatter.string(from: Date())
        // LIMIT 1: only delete the most recent log, not all logs for today
        let sql = """
            UPDATE activity_logs SET deleted_at = ?, sync_status = 'pending', \
            updated_at = ? \
            WHERE id = (SELECT id FROM activity_logs WHERE activity_id = ? \
            AND date = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)
            """
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK,
              let stmt else { return }
        defer { sqlite3_finalize(stmt) }
        bindText(stmt, 1, now)
        bindText(stmt, 2, now)
        bindText(stmt, 3, activityId)
        bindText(stmt, 4, today)
        sqlite3_step(stmt)
    }
}
