import { dbEvents } from "../db/dbEvents";
import { reloadWidgetTimelines } from "./widgetTimeline";

const WIDGET_SOURCE_TABLES = ["activities", "activity_kinds"];

export function startWidgetTimelineSubscription(): () => void {
  return dbEvents.subscribe(WIDGET_SOURCE_TABLES, reloadWidgetTimelines);
}
