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
                    key: '1-3',
                    icon: <KeyOutlined />,
                    label: 'API Keys',
                    path: `/projects/${projectId}/api-keys`,
                },
                {
                    key: '1-4',
                    icon: <DatabaseOutlined />,
                    label: 'Prompts',
                    path: `/projects/${projectId}/prompts`,
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
                paddingBottom: '8px'
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
