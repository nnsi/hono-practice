import SwiftUI
import WidgetKit

struct CheckWidgetView: View {
    let entry: CheckEntry

    var body: some View {
        if entry.isProLocked {
            ProLockedView()
        } else {
            checkContent
        }
    }

    private var checkContent: some View {
        VStack(spacing: 8) {
            activityLabel
            if let kindName = entry.kindName {
                Text(kindName)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            checkmarkDisplay
            if let activityId = entry.activityId {
                toggleButton(activityId: activityId)
            }
        }
        .containerBackground(Color(hex: "#1A1A2E"), for: .widget)
    }

    private var activityLabel: some View {
        Text("\(entry.activityEmoji) \(entry.activityName)")
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
    }

    private var checkmarkDisplay: some View {
        Image(systemName: entry.isDoneToday ? "checkmark.circle.fill" : "circle")
            .font(.system(size: 40))
            .foregroundColor(
                entry.isDoneToday ? Color(hex: "#4CAF50") : .gray
            )
    }

    private func toggleButton(activityId: String) -> some View {
        Button(intent: ToggleCheckIntent(activityId: activityId, kindId: entry.kindId)) {
            Text(entry.isDoneToday ? "取り消す" : "完了")
                .font(.caption)
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(
                    entry.isDoneToday
                        ? Color.orange.opacity(0.8)
                        : Color(hex: "#4CAF50")
                )
                .cornerRadius(8)
        }
    }
}
