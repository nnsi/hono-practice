import type { UpdateActivityRequest } from "@dtos/request/UpdateActivityRequest";
import { Ionicons } from "@expo/vector-icons";
import type {
  ActivityEditActions,
  ActivityEditIconProps,
} from "@packages/frontend-shared/hooks/feature/useActivityEdit";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { IconTypeSelector } from "./IconTypeSelector";

export type ActivityEditDialogViewProps = {
  open: boolean;
  form: UseFormReturn<UpdateActivityRequest>;
  kindFields: { id?: string; name: string; color?: string }[];
  isPending: boolean;
  iconProps: ActivityEditIconProps;
  actions: ActivityEditActions;
  onClose: () => void;
};

export function ActivityEditDialogView({
  open,
  form,
  kindFields,
  isPending,
  iconProps,
  actions,
  onClose,
}: ActivityEditDialogViewProps) {
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-blue-600 text-base">キャンセル</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">アクティビティ編集</Text>
            <TouchableOpacity onPress={actions.onSubmit} disabled={isPending}>
              <Text
                className={`text-base ${isPending ? "text-gray-400" : "text-blue-600"}`}
              >
                更新
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className="text-sm text-gray-600 mb-1">名前</Text>
              <Controller
                control={form.control}
                name="activity.name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="名前"
                  />
                )}
              />
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">単位</Text>
              <Controller
                control={form.control}
                name="activity.quantityUnit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="単位"
                  />
                )}
              />
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">アイコン</Text>
              <IconTypeSelector
                value={iconProps.value}
                onChange={iconProps.onChange}
                disabled={isPending}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-base">合算統計を表示</Text>
              <Controller
                control={form.control}
                name="activity.showCombinedStats"
                render={({ field: { onChange, value } }) => (
                  <Switch onValueChange={onChange} value={value} />
                )}
              />
            </View>

            <View>
              <Text className="text-base font-semibold mb-2">
                種類（kinds）
              </Text>
              {kindFields.map((field, index) => (
                <View
                  key={field.id ?? index}
                  className="flex-row items-center mb-2"
                >
                  <Controller
                    control={form.control}
                    name={`kinds.${index}.name`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="bg-gray-100 p-3 rounded-lg text-base flex-1"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="種類名"
                      />
                    )}
                  />
                  <TouchableOpacity
                    className="ml-2 p-3"
                    onPress={() => actions.onRemoveKind(index)}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                className="bg-gray-100 p-3 rounded-lg flex-row items-center justify-center mt-2"
                onPress={actions.onAddKind}
              >
                <Ionicons name="add-circle-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">種類を追加</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-red-50 border border-red-200 p-4 rounded-lg mt-8"
              onPress={actions.onDelete}
            >
              <Text className="text-red-600 text-center font-medium">
                アクティビティを削除
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
