import Foundation
import SQLite3

extension WidgetDbHelper {
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
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { return [] }
        defer { sqlite3_finalize(statement) }
        bindText(statement, 1, mode)
        var results: [ActivityRow] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            results.append(readActivityRow(statement))
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
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { return nil }
        defer { sqlite3_finalize(statement) }
        bindText(statement, 1, id)
        guard sqlite3_step(statement) == SQLITE_ROW else { return nil }
        return readActivityRow(statement)
    }

    func getActivityKinds(_ activityId: String) -> [KindRow] {
        guard let db = openDatabase() else { return [] }
        defer { sqlite3_close(db) }
        let sql = """
            SELECT id, name, color FROM activity_kinds \
            WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { return [] }
        defer { sqlite3_finalize(statement) }
        bindText(statement, 1, activityId)
        var results: [KindRow] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            results.append(KindRow(
                id: columnText(statement, 0),
                name: columnText(statement, 1),
                color: columnOptionalText(statement, 2)
            ))
        }
        return results
    }

    func isKindOwnedByActivity(_ activityId: String, kindId: String) -> Bool {
        guard let db = openDatabase() else { return false }
        defer { sqlite3_close(db) }
        let sql = """
            SELECT COUNT(*) FROM activity_kinds \
            WHERE id = ? AND activity_id = ? AND deleted_at IS NULL
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { return false }
        defer { sqlite3_finalize(statement) }
        guard bindText(statement, 1, kindId) == SQLITE_OK,
              bindText(statement, 2, activityId) == SQLITE_OK,
              sqlite3_step(statement) == SQLITE_ROW
        else { return false }
        return sqlite3_column_int(statement, 0) == 1
    }

    func getPlan() -> String {
        guard let db = openDatabase() else { return "free" }
        defer { sqlite3_close(db) }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(
            db,
            "SELECT plan FROM auth_state WHERE id = 'current'",
            -1,
            &statement,
            nil
        ) == SQLITE_OK, let statement else { return "free" }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_step(statement) == SQLITE_ROW else { return "free" }
        return columnOptionalText(statement, 0) ?? "free"
    }
}
