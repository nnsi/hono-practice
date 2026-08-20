/// Application-level failures from widget save operations.
///
/// Plan denial is not a persistence concern, so it is represented separately
/// from database failures while still preserving the underlying DB error.
enum WidgetSaveError: Error {
    case planNotAllowed
    case database(WidgetDbError)
}
