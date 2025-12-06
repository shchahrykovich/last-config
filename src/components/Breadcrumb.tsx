"use client";

import React from 'react';
import Link from 'next/link';
import { HomeOutlined } from '@ant-design/icons';
import { lcColors } from '@/lib/theme';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
      <></>
    // <nav
    //   style={{
    //     display: 'flex',
    //     alignItems: 'center',
    //     gap: '8px',
    //     marginBottom: '24px',
    //     fontSize: '13px',
    //   }}
    //   aria-label="Breadcrumb"
    // >
    //   <Link
    //     href="/"
    //     style={{
    //       color: lcColors.textTertiary,
    //       textDecoration: 'none',
    //       display: 'flex',
    //       alignItems: 'center',
    //       transition: 'color 0.2s',
    //     }}
    //     onMouseEnter={(e) => {
    //       e.currentTarget.style.color = lcColors.textPrimary;
    //     }}
    //     onMouseLeave={(e) => {
    //       e.currentTarget.style.color = lcColors.textTertiary;
    //     }}
    //   >
    //     <HomeOutlined style={{ fontSize: '14px' }} />
    //   </Link>
    //
    //   {items.map((item, index) => (
    //     <React.Fragment key={index}>
    //       <span style={{ color: lcColors.textTertiary }}>/</span>
    //       {item.href ? (
    //         <Link
    //           href={item.href}
    //           style={{
    //             color: lcColors.textTertiary,
    //             textDecoration: 'none',
    //             display: 'flex',
    //             alignItems: 'center',
    //             gap: '6px',
    //             transition: 'color 0.2s',
    //           }}
    //           onMouseEnter={(e) => {
    //             e.currentTarget.style.color = lcColors.textPrimary;
    //           }}
    //           onMouseLeave={(e) => {
    //             e.currentTarget.style.color = lcColors.textTertiary;
    //           }}
    //         >
    //           {item.icon}
    //           {item.label}
    //         </Link>
    //       ) : (
    //         <span
    //           style={{
    //             color: lcColors.textPrimary,
    //             fontWeight: 500,
    //             display: 'flex',
    //             alignItems: 'center',
    //             gap: '6px',
    //           }}
    //         >
    //           {item.icon}
    //           {item.label}
    //         </span>
    //       )}
    //     </React.Fragment>
    //   ))}
    // </nav>
  );
}
