"use client";

import React from 'react';
import { Typography } from 'antd';
import { lcColors } from '@/lib/theme';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {breadcrumb}

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '24px',
      }}>
        <div style={{ flex: 1 }}>
          {title && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: subtitle ? '8px' : 0,
            }}>
              {icon && React.cloneElement(icon as React.ReactElement, {
                style: {
                  fontSize: '20px',
                  color: lcColors.textSecondary,
                  flexShrink: 0
                }
              })}
              <Title
                level={1}
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: lcColors.textPrimary,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Title>
            </div>
          )}

          {subtitle && (
            <Text
              type="secondary"
              style={{
                fontSize: '14px',
                color: lcColors.textSecondary,
                display: 'block',
                marginTop: '4px',
              }}
            >
              {subtitle}
            </Text>
          )}
        </div>

        {actions && (
          <div style={{ flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: lcColors.borderSecondary,
        marginTop: '12px',
      }} />
    </div>
  );
}
