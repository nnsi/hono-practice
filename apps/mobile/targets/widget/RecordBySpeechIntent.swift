import AppIntents

/// Siri App Intent for voice-based activity recording.
/// Accepts speech text via Siri dictation, sends it to the backend API,
/// and returns a confirmation dialog with the recorded activity name.
struct RecordBySpeechIntent: AppIntent {
    static var title: LocalizedStringResource = "Record Activity by Voice"
    static var description = IntentDescription(
        "Record an activity using voice input"
    )

    @Parameter(title: "What did you do?")
    var speechText: String

    static var parameterSummary: some ParameterSummary {
        Summary("Record \(\.$speechText)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let apiKey = VoiceApiKeyHelper.getApiKey() else {
            return .result(dialog: IntentDialog(
                "APIキーが設定されていません。アプリでProプランにアップグレードしてください。"
            ))
        }

        guard let backendUrl = VoiceApiKeyHelper.getBackendUrl() else {
            return .result(dialog: IntentDialog(
                "サーバーURLが設定されていません。"
            ))
        }

        do {
            let result = try await VoiceRecordApi.recordFromSpeech(
                speechText: speechText,
                apiKey: apiKey,
                backendUrl: backendUrl
            )
            let kindSuffix = result.kindName.map { " (\($0))" } ?? ""
            return .result(dialog: IntentDialog(
                "「\(result.activityName)\(kindSuffix)」を記録しました。"
            ))
        } catch let error as VoiceRecordError {
            switch error {
            case .serverError(let code):
                return .result(dialog: IntentDialog(
                    "記録に失敗しました。サーバーエラー(\(code))が発生しました。"
                ))
            case .invalidResponse:
                return .result(dialog: IntentDialog(
                    "記録に失敗しました。サーバーからの応答が不正です。"
                ))
            case .networkError:
                return .result(dialog: IntentDialog(
                    "記録に失敗しました。ネットワーク接続を確認してください。"
                ))
            }
        } catch {
            return .result(dialog: IntentDialog(
                "記録に失敗しました: \(error.localizedDescription)"
            ))
        }
    }
}
