"use client";

import React from 'react';
import { Button } from 'antd';
import { lcColors } from '@/lib/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '48px',
            color: lcColors.textTertiary,
            marginBottom: '16px',
            opacity: 0.6,
          }}
        >
          {icon}
        </div>
      )}

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: lcColors.textPrimary,
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontSize: '14px',
            color: lcColors.textSecondary,
            margin: '0 0 24px 0',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <Button
          type="primary"
          icon={action.icon}
          onClick={action.onClick}
          size="large"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
