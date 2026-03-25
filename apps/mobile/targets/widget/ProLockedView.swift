import SwiftUI
import WidgetKit

/// Shared view shown when a widget is locked behind the Pro plan.
struct ProLockedView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .font(.title2)
                .foregroundColor(.orange)
            Text("Proにアップグレード")
                .font(.caption)
                .foregroundColor(.white)
            Text("無料プランは1つまで")
                .font(.caption2)
                .foregroundColor(.gray)
            Text("余分を削除してください")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .containerBackground(Color(hex: "#1A1A2E"), for: .widget)
    }
}
