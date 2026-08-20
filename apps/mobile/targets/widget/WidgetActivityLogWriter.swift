import SQLite3

extension WidgetDbHelper {
    func insertActivityLog(
        id: String, activityId: String, activityKindId: String?,
        quantity: Double, memo: String, date: String,
        syncStatus: String, createdAt: String, updatedAt: String
    ) -> Result<Void, WidgetDbError> {
        guard let db = openDatabase() else { return .failure(.databaseUnavailable) }
        defer { sqlite3_close(db) }
        let sql = """
            INSERT INTO activity_logs \
            (id, activity_id, activity_kind_id, quantity, memo, date, time, task_id, \
            sync_status, deleted_at, created_at, updated_at) \
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?)
            """
        var statement: OpaquePointer?
        let prepareStatus = sqlite3_prepare_v2(db, sql, -1, &statement, nil)
        guard prepareStatus == SQLITE_OK, let statement else {
            return .failure(.prepareFailed(prepareStatus))
        }
        defer { sqlite3_finalize(statement) }
        let bindStatuses = [
            bindText(statement, 1, id),
            bindText(statement, 2, activityId),
            bindOptionalText(statement, 3, activityKindId),
            sqlite3_bind_double(statement, 4, quantity),
            bindText(statement, 5, memo),
            bindText(statement, 6, date),
            bindText(statement, 7, syncStatus),
            bindText(statement, 8, createdAt),
            bindText(statement, 9, updatedAt),
        ]
        if let failedStatus = bindStatuses.first(where: { $0 != SQLITE_OK }) {
            return .failure(.bindFailed(failedStatus))
        }
        let stepStatus = sqlite3_step(statement)
        guard stepStatus == SQLITE_DONE else {
            return .failure(.stepFailed(stepStatus))
        }
        return .success(())
    }
}
