import SwiftUI
import WidgetKit

@main
struct ActikoWidgetBundle: WidgetBundle {
    var body: some Widget {
        TimerWidget()
        CounterWidget()
        CheckWidget()
        BinaryWidget()
    }
}
