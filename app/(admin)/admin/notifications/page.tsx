import {redirect} from "next/navigation";
import {notificationSession} from "@/server/services/notifications";
export default async function LegacyNotificationsPage(){await notificationSession();redirect("/notifications");}
