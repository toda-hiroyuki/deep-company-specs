import "./globals.css";

export const metadata = {
  title: "DeepExperience",
  description: "Discover and book unique tours with local guides",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
