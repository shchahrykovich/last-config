"use client";

import React, { useState, useEffect } from "react";
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
    KeyOutlined,
    UserOutlined,
    FlagOutlined
} from "@ant-design/icons";
import AppNewVersionNotifier from "@/components/AppNewVersionNotifier";

interface MenuItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    path?: string;
    children?: MenuItem[];
}

const getProjectMenuItems = (projectId: string | null): MenuItem[] => {
    const baseMenuItem: MenuItem = {
        key: '1',
        icon: <ProjectOutlined />,
        label: 'Projects',
        path: '/',
    };

    const usersMenuItem: MenuItem = {
        key: '2',
        icon: <UserOutlined />,
        label: 'Users',
        path: '/users',
    };

    if (!projectId) {
        return [baseMenuItem, usersMenuItem];
    }

    return [
        {
            ...baseMenuItem,
            children: [
                {
                    key: '1-1',
                    icon: <HomeOutlined />,
                    label: 'Overview',
                    path: `/projects/${projectId}`,
                },
                {
                    key: '1-2',
                    icon: <FlagOutlined />,
                    label: 'Feature Flags',
                    path: `/projects/${projectId}/feature-flags`,
                },
                {
                    key: '1-4',
                    icon: <SettingOutlined />,
                    label: 'Config',
                    path: `/projects/${projectId}/config`,
                },
                {
                    key: '1-5',
                    icon: <DatabaseOutlined />,
                    label: 'Prompts',
                    path: `/projects/${projectId}/prompts`,
                },
                {
                    key: '1-3',
                    icon: <KeyOutlined />,
                    label: 'API Keys',
                    path: `/projects/${projectId}/api-keys`,
                },
            ],
        },
        usersMenuItem,
    ];
};

interface AppMenuProps {
    collapsed: boolean;
}

export default function AppMenu({ collapsed }: AppMenuProps) {
    const router = useRouter();
    const pathname = usePathname();

    // Extract project ID from pathname if present
    const getProjectIdFromPath = (): string | null => {
        const match = pathname.match(/^\/projects\/([^\/]+)/);
        return match ? match[1] : null;
    };

    const projectId = getProjectIdFromPath();
    const menuItems = getProjectMenuItems(projectId);

    // Auto-open Projects submenu when inside a project
    const [openKeys, setOpenKeys] = useState<string[]>(projectId ? ['1'] : []);

    // Update openKeys when pathname changes
    useEffect(() => {
        setOpenKeys(projectId ? ['1'] : []);
    }, [projectId]);

    const getAllMenuItems = (items: MenuItem[]): MenuItem[] => {
        const allItems: MenuItem[] = [];
        items.forEach(item => {
            allItems.push(item);
            if (item.children) {
                allItems.push(...getAllMenuItems(item.children));
            }
        });
        return allItems;
    };

    const getSelectedKey = () => {
        const allItems = getAllMenuItems(menuItems);

        const exactMatch = allItems.find(item => item.path === pathname);
        if (exactMatch) {
            return exactMatch.key;
        }

        const sortedItems = [...allItems].sort((a, b) => {
            const aLength = a.path?.length || 0;
            const bLength = b.path?.length || 0;
            return bLength - aLength;
        });

        const pathMatch = sortedItems.find(item => {
            if (!item.path) return false;
            if (item.path === '/') {
                return pathname === '/';
            }
            return pathname.startsWith(item.path + '/') || pathname === item.path;
        });

        return pathMatch ? pathMatch.key : '1';
    };

    const handleMenuClick = (key: string) => {
        const allItems = getAllMenuItems(menuItems);
        const menuItem = allItems.find(item => item.key === key);
        if (menuItem?.path) {
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

    const buildMenuItems = (items: MenuItem[]): any[] => {
        return items.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: item.children ? buildMenuItems(item.children) : undefined,
        }));
    };

    return (
        <>
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '8px 12px'
            }}>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[getSelectedKey()]}
                    openKeys={openKeys}
                    onOpenChange={setOpenKeys}
                    items={buildMenuItems(menuItems)}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{
                        borderRight: 0,
                        height: '100%',
                        backgroundColor: 'transparent'
                    }}
                />
            </div>

            <div style={{
                flexShrink: 0,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {!collapsed ? (
                    <>
                        <Button
                            type="text"
                            danger
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                padding: '0 12px',
                                fontSize: '14px'
                            }}
                        >
                            Logout
                        </Button>
                        <AppNewVersionNotifier />
                    </>
                ) : (
                    <Button
                        type="text"
                        danger
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                        style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '16px',
                            padding: 0
                        }}
                        title="Logout"
                    />
                )}
            </div>
        </>
    );
}
