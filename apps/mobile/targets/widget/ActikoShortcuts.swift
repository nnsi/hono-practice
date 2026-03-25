import AppIntents

/// Provides app shortcuts for Siri, Shortcuts app, and Action Button.
struct ActikoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RecordBySpeechIntent(),
            phrases: [
                "Record with \(.applicationName)",
                "\(.applicationName) で記録",
                "\(.applicationName) に記録して"
            ],
            shortTitle: "Voice Record",
            systemImageName: "mic"
        )
    }
}
