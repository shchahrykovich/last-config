"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Button } from "antd";
import {
    HomeOutlined,
    ApiOutlined,
    BarChartOutlined,
    SettingOutlined,
    DatabaseOutlined,
    ProjectOutlined,
    LogoutOutlined,
    TeamOutlined,
    FolderOutlined,
    KeyOutlined
} from "@ant-design/icons";
import AppNewVersionNotifier from "@/components/AppNewVersionNotifier";

interface MenuItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    path: string;
}

const menuItems: MenuItem[] = [
    {
        key: '1',
        icon: <ProjectOutlined />,
        label: 'Projects',
        path: '/',
    },
];

interface AppMenuProps {
    collapsed: boolean;
}

export default function AppMenu({ collapsed }: AppMenuProps) {
    const router = useRouter();
    const pathname = usePathname();

    const getSelectedKey = () => {
        const exactMatch = menuItems.find(item => item.path === pathname);
        if (exactMatch) {
            return exactMatch.key;
        }

        const sortedItems = [...menuItems].sort((a, b) => b.path.length - a.path.length);
        const pathMatch = sortedItems.find(item => {
            if (item.path === '/') {
                return pathname === '/';
            }
            return pathname.startsWith(item.path + '/') || pathname === item.path;
        });

        return pathMatch ? pathMatch.key : '1';
    };

    const handleMenuClick = (key: string) => {
        const menuItem = menuItems.find(item => item.key === key);
        if (menuItem) {
            router.push(menuItem.path);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut({
                redirectTo: '/auth/signin',
                redirect: true
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            <div style={{
                flex: 1,
                overflow: 'auto',
                paddingBottom: '8px'
            }}>
                <Menu
                    theme="light"
                    selectedKeys={[getSelectedKey()]}
                    items={menuItems.map(item => ({
                        key: item.key,
                        icon: item.icon,
                        label: item.label,
                    }))}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{
                        borderRight: 0,
                        height: '100%'
                    }}
                />
            </div>

            <div style={{
                flexShrink: 0,
                backgroundColor: '#ffffff',
                borderTop: '1px solid #f0f0f0',
                padding: '16px'
            }}>
                {!collapsed ? (
                    <div>
                        <div>
                            <Button
                                type="primary"
                                danger
                                icon={<LogoutOutlined />}
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                size="large"
                            >
                                Logout
                            </Button>
                        </div>
                        <div>
                            <AppNewVersionNotifier />
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <Button
                            type="primary"
                            danger
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '18px'
                            }}
                            title="Logout"
                            size="large"
                        />
                    </div>
                )}
            </div>
        </>
    );
}
