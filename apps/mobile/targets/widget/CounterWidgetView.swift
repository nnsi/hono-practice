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
        VStack(spacing: 8) {
            activityLabel
            countDisplay
            if entry.activityId != nil {
                incrementButton
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

    private var countDisplay: some View {
        Text("\(entry.todayCount)")
            .font(.system(size: 40, weight: .bold, design: .rounded))
            .foregroundColor(Color(hex: "#4CAF50"))
    }

    private var incrementButton: some View {
        Button(intent: IncrementCounterIntent(activityId: entry.activityId ?? "")) {
            Label("+1", systemImage: "plus")
                .font(.caption)
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(Color(hex: "#4CAF50"))
                .cornerRadius(8)
        }
    }

}
