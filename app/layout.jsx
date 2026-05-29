import "./globals.css";

export const metadata = {
  title: "THE RETURN Editor",
  description: "A creator tool for syncing voiceover audio with faceless video slides.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
