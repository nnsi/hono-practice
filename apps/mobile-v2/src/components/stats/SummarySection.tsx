import { View, Text } from "react-native";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react-native";

type SummarySectionProps = {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  unit: string;
};

export function SummarySection({
  todayTotal,
  weekTotal,
  monthTotal,
  unit,
}: SummarySectionProps) {
  const cards = [
    {
      label: "今日",
      value: todayTotal,
      icon: Calendar,
      color: "#3b82f6",
      bgColor: "bg-blue-50",
    },
    {
      label: "今週",
      value: weekTotal,
      icon: CalendarDays,
      color: "#8b5cf6",
      bgColor: "bg-purple-50",
    },
    {
      label: "今月",
      value: monthTotal,
      icon: CalendarRange,
      color: "#10b981",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <View className="flex-row gap-2 mx-4 mb-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <View
            key={card.label}
            className={`flex-1 p-3 rounded-xl ${card.bgColor}`}
          >
            <View className="flex-row items-center mb-1">
              <Icon size={14} color={card.color} />
              <Text className="text-xs text-gray-500 ml-1">{card.label}</Text>
            </View>
            <Text className="text-xl font-bold text-gray-800">
              {card.value}
            </Text>
            {unit ? (
              <Text className="text-xs text-gray-400">{unit}</Text>
            ) : (
              <Text className="text-xs text-gray-400">回</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
