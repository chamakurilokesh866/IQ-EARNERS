import { redirect } from "next/navigation"

export default function DashboardSettingsAliasPage() {
  redirect("/more/admin-dashboard?tab=Settings")
}
