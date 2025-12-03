"use client";

import AppLayout from "@/components/AppLayout";
import React from "react";

interface ProjectLayoutProps {
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
}

export default function ProjectLayout({children, title, icon}: ProjectLayoutProps) {
    return (<AppLayout children={children} title={title} icon={icon}/>)
}
