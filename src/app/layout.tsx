import type {Metadata} from "next";
import "./globals.css";
import {AntdRegistry} from '@ant-design/nextjs-registry';
import {SessionProvider} from "next-auth/react";

export const metadata: Metadata = {
    title: "Last Config App",
    description: "Last Config App",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head>
            <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
        </head>
        <body>
            <SessionProvider>
                <AntdRegistry>{children}</AntdRegistry>
            </SessionProvider>
        </body>
        </html>
    );
}
