import Foundation

extension WidgetDbHelper {
    /// Parse counter steps from recording_mode_config JSON.
    /// Format: {"mode":"counter","steps":[1,5,10]}; fallback: [1].
    static func parseCounterSteps(_ configJson: String?) -> [Int] {
        guard let json = configJson,
              let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let steps = object["steps"] as? [Any]
        else { return [1] }
        let intSteps = steps.compactMap { ($0 as? NSNumber)?.intValue }
            .filter { (1...1_000_000).contains($0) }
        var seen = Set<Int>()
        let uniqueSteps = intSteps.filter { seen.insert($0).inserted }
        return uniqueSteps.isEmpty ? [1] : Array(uniqueSteps.prefix(3))
    }

    static func todayDateString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
