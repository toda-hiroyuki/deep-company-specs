import "./guest.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { FavoritesProvider } from "@/lib/favorites";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FavoritesProvider>
      <div className="guest-root min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </FavoritesProvider>
  );
}
