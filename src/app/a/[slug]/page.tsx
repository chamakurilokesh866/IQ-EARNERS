"use client"

import dynamic from "next/dynamic"

const AdminDashboard = dynamic(() => import("../../more/admin-dashboard/page"), { ssr: false })

export default function AdminEncodedPage() {
  return <AdminDashboard />
}
