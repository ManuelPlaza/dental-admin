import Sidebar from "./Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 fade-in">{children}</div>
      </main>
    </div>
  );
}
