import type {Metadata} from "next";
import "./globals.css";
import {AntdRegistry} from '@ant-design/nextjs-registry';
import {SessionProvider} from "next-auth/react";
import {ConfigProvider} from 'antd';
import {lcTheme} from '@/lib/theme';

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
                <AntdRegistry>
                    <ConfigProvider theme={lcTheme}>
                        {children}
                    </ConfigProvider>
                </AntdRegistry>
            </SessionProvider>
        </body>
        </html>
    );
}
