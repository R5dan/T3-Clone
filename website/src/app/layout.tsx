import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

import { TRPCReactProvider } from "~/trpc/react";
import { ConvexClientProvider } from "./convex";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "T3 Clone",
  description: "A clone of t3.chat for the cloneathon",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {  
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            <AuthKitProvider>
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </AuthKitProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
