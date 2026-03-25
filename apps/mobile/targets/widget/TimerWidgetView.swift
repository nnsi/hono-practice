import SwiftUI
import WidgetKit

private let maxInlineKinds = 4

struct TimerWidgetView: View {
    let entry: TimerEntry

    var body: some View {
        if entry.isProLocked {
            ProLockedView()
        } else {
            VStack(spacing: 8) {
                activityLabel
                timerDisplay
                    .overlay(alignment: .trailing) {
                        if entry.hasPendingKindSelect {
                            Button(intent: ResetTimerIntent()) {
                                Image(systemName: "xmark")
                                    .font(.caption2)
                                    .foregroundColor(.white)
                                    .padding(5)
                                    .background(Color.red.opacity(0.8))
                                    .cornerRadius(6)
                            }
                        }
                    }
                controlButtons
            }
            .containerBackground(Color(hex: "#1A1A2E"), for: .widget)
        }
    }

    private var activityLabel: some View {
        Text("\(entry.activityEmoji) \(entry.activityName)")
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
    }

    @ViewBuilder
    private var timerDisplay: some View {
        if entry.isRunning, let startDate = entry.timerStartDate {
            Text(startDate, style: .timer)
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .foregroundColor(Color(hex: "#4CAF50"))
                .monospacedDigit()
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        } else {
            Text(TimeConversion.formatElapsedTime(entry.elapsedMs))
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .monospacedDigit()
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private var controlButtons: some View {
        if entry.hasPendingKindSelect, let activityId = entry.activityId {
            pendingKindButtons(activityId: activityId)
        } else if entry.isRunning {
            HStack(spacing: 8) {
                Button(intent: PauseTimerIntent()) {
                    buttonLabel("一時停止", systemImage: "pause.fill", bg: Color.orange.opacity(0.8))
                }
                Button(intent: StopTimerIntent()) {
                    buttonLabel("記録する", systemImage: "checkmark", bg: Color.red.opacity(0.8))
                }
            }
        } else if entry.elapsedMs > 0 {
            HStack(spacing: 8) {
                Button(intent: StartTimerIntent()) {
                    buttonLabel("再開", systemImage: "play.fill", bg: Color(hex: "#4CAF50"))
                }
                Button(intent: StopTimerIntent()) {
                    buttonLabel("記録する", systemImage: "checkmark", bg: Color.red.opacity(0.8))
                }
            }
        } else {
            Button(intent: StartTimerIntent()) {
                buttonLabel("スタート", systemImage: "play.fill", bg: Color(hex: "#4CAF50"))
            }
        }
    }

    @ViewBuilder
    private func pendingKindButtons(activityId: String) -> some View {
        if entry.kinds.count <= maxInlineKinds {
            // Inline kind buttons
            HStack(spacing: 6) {
                ForEach(entry.kinds, id: \.id) { kind in
                    Button(intent: SaveWithKindIntent(kindId: kind.id)) {
                        Text(kind.name)
                            .font(.caption2)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(kindColor(kind.color))
                            .cornerRadius(6)
                    }
                }
            }
        } else {
            // Too many kinds: deep link to app
            Link(destination: URL(string: "actiko://widget/kind-select?activityId=\(activityId)") ?? URL(string: "actiko://")!) {
                buttonLabel("種類を選択", systemImage: "tag", bg: Color(hex: "#4CAF50"))
            }
        }
    }

    private func buttonLabel(_ title: String, systemImage: String, bg: Color) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption)
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(bg)
            .cornerRadius(8)
    }

    private func kindColor(_ hex: String?) -> Color {
        guard let hex else { return Color(hex: "#4CAF50") }
        return Color(hex: hex)
    }
}
