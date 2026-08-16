import { redirect } from "next/navigation";

const AdminPersonnelPage = (): never => redirect("/admin/tasks?tab=personnel");

export default AdminPersonnelPage;
