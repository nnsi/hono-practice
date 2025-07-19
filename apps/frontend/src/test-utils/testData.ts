import type {
  Activity,
  ActivityLog,
  GetActivityLogResponse,
  GetUserResponse,
  Goal,
  Task,
  User,
} from "@packages/types";

export const createMockUserResponse = (
  overrides?: Partial<GetUserResponse>,
): GetUserResponse => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test User",
  providers: ["email"],
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User =>
  ({
    id: "00000000-0000-4000-8000-000000000001" as any,
    email: "test@example.com",
    name: "Test User",
    googleId: null,
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
    ...overrides,
  }) as unknown as User;

export const createMockActivity = (overrides?: Partial<Activity>): Activity =>
  ({
    id: "00000000-0000-4000-8000-000000000002" as any,
    userId: "00000000-0000-4000-8000-000000000001" as any,
    name: "Test Activity",
    emoji: "🏃",
    unit: "分",
    defaultQuantity: 30,
    quantityType: "number",
    order: 1,
    isArchived: false,
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
    ...overrides,
  }) as unknown as Activity;

export const createMockActivityLog = (
  overrides?: Partial<ActivityLog>,
): ActivityLog =>
  ({
    id: "00000000-0000-4000-8000-000000000003" as any,
    userId: "00000000-0000-4000-8000-000000000001" as any,
    activityId: "00000000-0000-4000-8000-000000000002" as any,
    date: "2024-01-15",
    quantity: 30,
    memo: "Test memo",
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date("2024-01-15").toISOString(),
    ...overrides,
  }) as unknown as ActivityLog;

export const createMockGoal = (overrides?: Partial<Goal>): Goal =>
  ({
    id: "00000000-0000-4000-8000-000000000004" as any,
    userId: "00000000-0000-4000-8000-000000000001" as any,
    activityId: "00000000-0000-4000-8000-000000000002" as any,
    name: "Test Goal",
    targetQuantity: 150,
    targetPeriod: "week",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    isActive: true,
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
    ...overrides,
  }) as unknown as Goal;

export const createMockTask = (overrides?: Partial<Task>): Task =>
  ({
    id: "00000000-0000-4000-8000-000000000005" as any,
    userId: "00000000-0000-4000-8000-000000000001" as any,
    title: "Test Task",
    description: "Test task description",
    completed: false,
    order: 1,
    dueDate: new Date("2024-01-20").toISOString(),
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
    ...overrides,
  }) as unknown as Task;

export const createMockActivityLogResponse = (
  overrides?: Partial<GetActivityLogResponse>,
): GetActivityLogResponse => ({
  id: "00000000-0000-4000-8000-000000000003",
  date: "2024-01-15",
  quantity: 30,
  activity: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Test Activity",
    quantityUnit: "分",
    emoji: "🏃",
  },
  activityKind: null,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
  memo: "Test memo",
  ...overrides,
});
