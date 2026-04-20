// app/layout.js
import { Inter } from "next/font/google";
import ClientLayout from "@/components/ClientLayout.";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Quality Management",
  description:
    "Connect out-of-the-box, customizable, AI-driven conversation intelligence from every interaction to drive automated QA and agent improvement workflows, whilst keeping customer experience at the heart of your contact center.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}