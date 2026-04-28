import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono, Roboto_Slab, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const robotoSlabHeading = Roboto_Slab({subsets:['latin'],variable:'--font-heading'});

const sourceSans3 = Source_Sans_3({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "L-20 Control",
  description: "Zoom L-20 Control Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", sourceSans3.variable, robotoSlabHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider enableSystem attribute="class" defaultTheme="dark">
          <div className="md:px-6 pb-3 lg:px-20 lg:max-w-420 lg:mx-auto">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
