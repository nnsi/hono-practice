import Foundation
import SQLite3

private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

enum WidgetDbError: Error {
    case databaseUnavailable
    case prepareFailed(Int32)
    case bindFailed(Int32)
    case stepFailed(Int32)
    case noMatchingRow
}

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
    static let supportedSchemaVersion = 12
    private let databasePathOverride: String?

    init(databasePath: String? = nil) {
        databasePathOverride = databasePath
    }

    private static var dbPath: String {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: AppConfig.appGroupId
        ) else { return "" }
        return container.appendingPathComponent("SQLite/actiko.db").path
    }

    func openDatabase() -> OpaquePointer? {
        let path = databasePathOverride ?? Self.dbPath
        guard FileManager.default.fileExists(atPath: path) else { return nil }
        var db: OpaquePointer?
        let openStatus = sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE, nil)
        guard openStatus == SQLITE_OK else {
            if let db { sqlite3_close(db) }
            return nil
        }
        sqlite3_exec(db, "PRAGMA journal_mode = WAL;", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA busy_timeout = 5000;", nil, nil, nil)
        return db
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

    @discardableResult
    func bindText(_ stmt: OpaquePointer, _ index: Int32, _ value: String) -> Int32 {
        sqlite3_bind_text(stmt, index, (value as NSString).utf8String, -1, sqliteTransient)
    }

    @discardableResult
    func bindOptionalText(_ stmt: OpaquePointer, _ index: Int32, _ value: String?) -> Int32 {
        if let value = value {
            return sqlite3_bind_text(
                stmt,
                index,
                (value as NSString).utf8String,
                -1,
                sqliteTransient
            )
        } else {
            return sqlite3_bind_null(stmt, index)
        }
    }
}
