import AdminDashboard from "@/components/admin-dashboard";

export const metadata = {
  title: `Inventory | ${process.env.NEXT_PUBLIC_STORE_NAME || "Mama's Pantry"}`,
};

export default function AdminPage() {
  return <AdminDashboard />;
}
