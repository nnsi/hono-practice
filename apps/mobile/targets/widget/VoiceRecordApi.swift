import Foundation

/// Result returned from the voice recording API.
struct VoiceRecordResult {
    let activityName: String
    let kindName: String?
}

/// Error types for voice recording API calls.
enum VoiceRecordError: Error, LocalizedError {
    case serverError(statusCode: Int)
    case invalidResponse
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .serverError(let code):
            return "Server error (status \(code))"
        case .invalidResponse:
            return "Invalid server response"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

/// HTTP client for the voice recording API endpoint.
enum VoiceRecordApi {
    static func recordFromSpeech(
        speechText: String,
        apiKey: String,
        backendUrl: String
    ) async throws -> VoiceRecordResult {
        let endpoint = "\(backendUrl)/api/v1/ai/activity-logs/from-speech"
        guard let url = URL(string: endpoint),
              url.scheme == "https" else {
            throw VoiceRecordError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        let body = SpeechRequestBody(speechText: speechText)
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw VoiceRecordError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw VoiceRecordError.invalidResponse
        }
        guard httpResponse.statusCode == 200 else {
            throw VoiceRecordError.serverError(statusCode: httpResponse.statusCode)
        }

        let decoded = try JSONDecoder().decode(VoiceRecordResponse.self, from: data)
        return VoiceRecordResult(
            activityName: decoded.interpretation.detectedActivityName,
            kindName: decoded.interpretation.detectedKindName
        )
    }
}

// MARK: - Request / Response models

private struct SpeechRequestBody: Encodable {
    let speechText: String
}

struct VoiceRecordResponse: Decodable {
    let interpretation: Interpretation

    struct Interpretation: Decodable {
        let detectedActivityName: String
        let detectedKindName: String?
    }
}
