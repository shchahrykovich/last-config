"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Spin, message, Button, Typography, Space, Row, Col } from 'antd';
import AppLayout from "@/components/AppLayout";
import { ProjectOutlined, ArrowLeftOutlined, FileTextOutlined, KeyOutlined, RightOutlined } from "@ant-design/icons";
import type {
    ProjectDtoSerialized,
    GetProjectByIdResponseSerialized,
} from '@/app/api/projects/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

const { Title, Text } = Typography;

const ProjectDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectDtoSerialized | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectId}`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetProjectByIdResponseSerialized = await response.json();
            setProject(data.project);
        } catch (error) {
            message.error('Failed to load project');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    if (loading) {
        return (
            <AppLayout title="Project Details" icon={<ProjectOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading project..." />
                </div>
            </AppLayout>
        );
    }

    if (!project) {
        return (
            <AppLayout title="Project Details" icon={<ProjectOutlined />}>
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Text type="secondary">Project not found</Text>
                        <div style={{ marginTop: '16px' }}>
                            <Button
                                type="primary"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => router.push('/')}
                            >
                                Back to Projects
                            </Button>
                        </div>
                    </div>
                </Card>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Project Details" icon={<ProjectOutlined />}>
            <div style={{ maxWidth: '1200px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push('/')}
                    >
                        Back to Projects
                    </Button>

                    <Card>
                        <Title level={4} style={{ marginBottom: '24px' }}>
                            <ProjectOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
                            {project.name}
                        </Title>

                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="Project ID">
                                {project.id}
                            </Descriptions.Item>
                            <Descriptions.Item label="Project Name">
                                {project.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At">
                                {new Date(project.createdAt).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Updated At">
                                {new Date(project.updatedAt).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Space>
            </div>
        </AppLayout>
    );
};

export default ProjectDetailPage;
