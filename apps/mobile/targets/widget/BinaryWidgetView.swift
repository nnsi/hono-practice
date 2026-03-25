import SwiftUI
import WidgetKit

struct BinaryWidgetView: View {
    let entry: BinaryEntry

    var body: some View {
        if entry.isProLocked {
            ProLockedView()
        } else {
            binaryContent
        }
    }

    private var binaryContent: some View {
        VStack(spacing: 8) {
            activityLabel
            if entry.kinds.count >= 2, let activityId = entry.activityId {
                kindButtons(activityId: activityId)
            } else {
                Text("種類が未設定")
                    .font(.caption)
                    .foregroundColor(.gray)
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

    private func kindButtons(activityId: String) -> some View {
        HStack(spacing: 10) {
            ForEach(entry.kinds.prefix(2)) { kind in
                Button(intent: RecordBinaryIntent(
                    activityId: activityId, kindId: kind.id
                )) {
                    Text(kind.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(kindColor(kind.color))
                        .cornerRadius(10)
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private func kindColor(_ hex: String?) -> Color {
        guard let hex else { return Color(hex: "#4CAF50") }
        return Color(hex: hex)
    }
}
