import SwiftUI
import WidgetKit

struct CounterWidgetView: View {
    let entry: CounterEntry

    var body: some View {
        if entry.isProLocked {
            ProLockedView()
        } else {
            counterContent
        }
    }

    private var counterContent: some View {
        VStack(spacing: 4) {
            activityLabel
            if let kindName = entry.kindName {
                Text(kindName)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            countDisplay
            if let activityId = entry.activityId {
                stepButtons(activityId: activityId)
            }
        }
        .containerBackground(Color(hex: "#1A1A2E"), for: .widget)
    }

    private var activityLabel: some View {
        Text("\(entry.activityEmoji) \(entry.activityName)")
            .font(.subheadline)
            .foregroundColor(.white)
            .lineLimit(1)
    }

    private var countDisplay: some View {
        Text("\(entry.todayCount)")
            .font(.system(size: 32, weight: .bold, design: .rounded))
            .foregroundColor(Color(hex: "#4CAF50"))
    }

    private func stepButtons(activityId: String) -> some View {
        HStack(spacing: 4) {
            ForEach(entry.steps, id: \.self) { step in
                Button(intent: IncrementCounterIntent(
                    activityId: activityId, kindId: entry.kindId, step: step
                )) {
                    Text("+\(step)")
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(.horizontal, entry.steps.count == 1 ? 12 : 6)
                        .padding(.vertical, 4)
                        .background(Color(hex: "#4CAF50"))
                        .cornerRadius(6)
                }
            }
        }
    }
}
