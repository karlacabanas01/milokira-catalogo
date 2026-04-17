import { ReactNode } from "react";
import AdminGuard from "./components/AdminGuard";

export default function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
