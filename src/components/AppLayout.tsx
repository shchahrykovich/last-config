"use client";

import React, { useState } from "react";
import {
    Layout,
    Typography,
} from "antd";
import Link from "next/link";
import AppMenu from "./AppMenu";
import { lcColors } from "@/lib/theme";

const { Sider, Content } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
}

export default function AppLayout({ children, title, icon }: AppLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: lcColors.bgPage }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                theme="light"
                style={{
                    backgroundColor: lcColors.bgSidebar,
                    borderRight: `1px solid ${lcColors.borderSecondary}`,
                    boxShadow: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 100
                }}
                width={240}
                collapsedWidth={64}
                trigger={null}
            >
                {/* Header */}
                <div style={{
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: collapsed ? '0 16px' : '0 20px',
                    flexShrink: 0,
                    borderBottom: `1px solid ${lcColors.borderSecondary}`,
                }}>
                    <Link href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: lcColors.textPrimary,
                        fontWeight: 600,
                        fontSize: collapsed ? '18px' : '16px',
                        transition: 'all 0.2s'
                    }}>
                        {collapsed ? 'LC' : 'Last Config'}
                    </Link>
                </div>

                <AppMenu collapsed={collapsed} />

                {/* Collapse toggle at bottom */}
                <div
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '0' : '0 20px',
                        cursor: 'pointer',
                        borderTop: `1px solid ${lcColors.borderSecondary}`,
                        color: lcColors.textTertiary,
                        fontSize: '12px',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = lcColors.bgHover;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {collapsed ? '→' : '← Collapse'}
                </div>
            </Sider>

            <Layout style={{
                marginLeft: collapsed ? 64 : 240,
                backgroundColor: lcColors.bgPage,
                transition: 'margin-left 0.2s'
            }}>
                <Content style={{
                    padding: '24px',
                    backgroundColor: lcColors.bgPage,
                    overflow: 'auto',
                    height: '100vh',
                    maxWidth: '1400px',
                    margin: '0 auto',
                    width: '100%'
                }}>
                    <div className="page-content">
                        {title && (
                            <div style={{
                                marginBottom: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                {icon && React.cloneElement(icon as React.ReactElement, {
                                    style: {
                                        fontSize: '28px',
                                        color: lcColors.textSecondary,
                                        flexShrink: 0
                                    }
                                })}
                                <Title
                                    level={1}
                                    style={{
                                        margin: 0,
                                        fontSize: '32px',
                                        fontWeight: 700,
                                        color: lcColors.textPrimary,
                                        letterSpacing: '-0.5px'
                                    }}
                                >
                                    {title}
                                </Title>
                            </div>
                        )}
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
