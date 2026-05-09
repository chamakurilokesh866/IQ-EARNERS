import { redirect } from "next/navigation"

export default function AdminSettingsAliasPage() {
  redirect("/more/admin-dashboard?tab=Settings")
}
