"use client";

import React, { useState } from 'react';
import { Button, Drawer, Space, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface HelpDrawerTitleProps {
    title: string;
    icon?: React.ReactNode;
    helpTitle?: string;
    helpContent: React.ReactNode;
    drawerWidth?: number;
    placement?: 'left' | 'right';
}

const { Title } = Typography;

const HelpDrawerTitle = ({
    title,
    icon,
    helpTitle,
    helpContent,
    drawerWidth = 620,
    placement = 'right',
}: HelpDrawerTitleProps) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Space align="center" size="middle">
                <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && React.cloneElement(icon as React.ReactElement, {
                        style: {
                            ...(icon as React.ReactElement).props?.style,
                            marginRight: 8,
                            color: '#1890ff',
                        },
                    })}
                    {title}
                </Title>
                <Tooltip title="Learn more">
                    <Button
                        type="text"
                        icon={<QuestionCircleOutlined />}
                        aria-label="Open help drawer"
                        onClick={() => setOpen(true)}
                    />
                </Tooltip>
            </Space>
            <Drawer
                title={helpTitle ?? title}
                open={open}
                onClose={() => setOpen(false)}
                placement={placement}
                size={drawerWidth}
            >
                {helpContent}
            </Drawer>
        </>
    );
};

export default HelpDrawerTitle;
