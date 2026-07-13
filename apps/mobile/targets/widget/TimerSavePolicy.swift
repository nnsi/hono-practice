enum TimerSavePolicy {
    /// Run destructive timer cleanup only after the database write completed.
    /// Returning the decision keeps the failure branch directly testable.
    @discardableResult
    static func performOnSuccess<Failure: Error>(
        _ result: Result<Void, Failure>,
        action: () -> Void
    ) -> Bool {
        switch result {
        case .success:
            action()
            return true
        case .failure:
            return false
        }
    }
}
