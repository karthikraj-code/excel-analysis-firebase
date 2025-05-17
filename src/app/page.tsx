import { AppHeader } from "@/components/layout/app-header";
import { DataLensDashboard } from "@/components/dashboard/data-lens-dashboard";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <DataLensDashboard />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Data Lens. All rights reserved.
      </footer>
    </div>
  );
}
