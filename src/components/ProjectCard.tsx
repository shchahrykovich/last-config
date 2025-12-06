"use client";

import React, { useState } from 'react';
import { Card, Typography } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { lcColors } from '@/lib/theme';

const { Title, Text } = Typography;

interface ProjectCardProps {
  name: string;
  createdAt: string;
  onClick: () => void;
}

export default function ProjectCard({ name, createdAt, onClick }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '100%',
        cursor: 'pointer',
        border: `1px solid ${isHovered ? lcColors.borderPrimary : lcColors.borderSecondary}`,
        backgroundColor: isHovered ? lcColors.bgBase : lcColors.bgBase,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 4px 12px rgba(0, 0, 0, 0.08)'
          : '0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      bodyStyle={{
        padding: '20px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '6px',
          backgroundColor: lcColors.bgHover,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.2s',
          ...(isHovered && {
            backgroundColor: lcColors.bgActive,
          })
        }}>
          <ProjectOutlined style={{
            fontSize: '20px',
            color: lcColors.textSecondary,
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title
            level={5}
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: lcColors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Title>
        </div>
      </div>

      <Text
        type="secondary"
        style={{
          fontSize: '13px',
          color: lcColors.textTertiary,
        }}
      >
        Created {new Date(createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>
    </Card>
  );
}
