import Foundation

/// Time unit conversion utilities.
/// iOS port of Android's TimeConversion.kt.
enum TimeUnitType {
    case hour, minute, second
}

enum TimeConversion {
    static func getTimeUnitType(_ quantityUnit: String?) -> TimeUnitType? {
        guard let unit = quantityUnit?.lowercased() else { return nil }
        if unit.contains("時") || unit.contains("hour") { return .hour }
        if unit.contains("分") || unit.contains("min") { return .minute }
        if unit.contains("秒") || unit.contains("sec") { return .second }
        return nil
    }

    static func convertSecondsToUnit(_ seconds: Int64, _ unitType: TimeUnitType?) -> Double {
        switch unitType {
        case .hour:
            return (Double(seconds) / 3600.0 * 100).rounded() / 100.0
        case .minute:
            return (Double(seconds) / 60.0 * 10).rounded() / 10.0
        case .second:
            return Double(seconds)
        case nil:
            return Double(seconds)
        }
    }

    static func generateTimeMemo(startTime: Date, endTime: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return "\(formatter.string(from: startTime)) - \(formatter.string(from: endTime))"
    }

    static func formatElapsedTime(_ elapsedMs: Int64) -> String {
        let totalSeconds = elapsedMs / 1000
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
