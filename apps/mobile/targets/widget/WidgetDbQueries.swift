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

    func hasActivityLogForToday(
        _ activityId: String,
        kindId: String?
    ) -> Result<Bool, WidgetDbError> {
        guard let db = openDatabase() else { return .failure(.databaseUnavailable) }
        defer { sqlite3_close(db) }
        let today = Self.todayDateString()
        let sql = """
            SELECT COUNT(*) FROM activity_logs \
            WHERE activity_id = ? \
            AND ((? IS NULL AND activity_kind_id IS NULL) OR activity_kind_id = ?) \
            AND date = ? AND deleted_at IS NULL
            """
        var stmt: OpaquePointer?
        let prepareStatus = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
        guard prepareStatus == SQLITE_OK, let stmt else {
            return .failure(.prepareFailed(prepareStatus))
        }
        defer { sqlite3_finalize(stmt) }
        let bindStatuses = [
            bindText(stmt, 1, activityId),
            bindOptionalText(stmt, 2, kindId),
            bindOptionalText(stmt, 3, kindId),
            bindText(stmt, 4, today),
        ]
        if let failedStatus = bindStatuses.first(where: { $0 != SQLITE_OK }) {
            return .failure(.bindFailed(failedStatus))
        }
        let stepStatus = sqlite3_step(stmt)
        guard stepStatus == SQLITE_ROW else { return .failure(.stepFailed(stepStatus)) }
        return .success(sqlite3_column_int(stmt, 0) > 0)
    }

    func softDeleteTodayLog(
        _ activityId: String,
        kindId: String?
    ) -> Result<Void, WidgetDbError> {
        guard let db = openDatabase() else { return .failure(.databaseUnavailable) }
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
            AND ((? IS NULL AND activity_kind_id IS NULL) OR activity_kind_id = ?) \
            AND date = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)
            """
        var stmt: OpaquePointer?
        let prepareStatus = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
        guard prepareStatus == SQLITE_OK, let stmt else {
            return .failure(.prepareFailed(prepareStatus))
        }
        defer { sqlite3_finalize(stmt) }
        let bindStatuses = [
            bindText(stmt, 1, now),
            bindText(stmt, 2, now),
            bindText(stmt, 3, activityId),
            bindOptionalText(stmt, 4, kindId),
            bindOptionalText(stmt, 5, kindId),
            bindText(stmt, 6, today),
        ]
        if let failedStatus = bindStatuses.first(where: { $0 != SQLITE_OK }) {
            return .failure(.bindFailed(failedStatus))
        }
        let stepStatus = sqlite3_step(stmt)
        guard stepStatus == SQLITE_DONE else { return .failure(.stepFailed(stepStatus)) }
        guard sqlite3_changes(db) == 1 else { return .failure(.noMatchingRow) }
        return .success(())
    }
}
