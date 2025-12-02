"use client";

import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, List, message, Modal, Spin, Typography, Empty } from 'antd';
import AppLayout from "@/components/AppLayout";
import { HomeOutlined, PlusOutlined, ProjectOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import type {
    ProjectDtoSerialized,
    CreateProjectRequest,
    GetProjectsResponseSerialized,
    CreateProjectResponseSerialized,
    ErrorResponse
} from '@/app/api/projects/dto';

const { Title, Text } = Typography;

const Home = () => {
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectDtoSerialized[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm<CreateProjectRequest>();

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/projects');

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetProjectsResponseSerialized = await response.json();
            setProjects(data.projects);
        } catch (error) {
            message.error('Failed to load projects');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreateProject = async (values: CreateProjectRequest) => {
        try {
            setCreating(true);
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create project');
            }

            const data: CreateProjectResponseSerialized = await response.json();
            message.success(data.message);
            setProjects([data.project, ...projects]);
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create project');
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    return (
        <AppLayout title="Projects" icon={<ProjectOutlined />}>
            <div style={{ maxWidth: '1200px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">Manage your projects</Text>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={showModal}
                    >
                        New Project
                    </Button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <Spin size="large" tip="Loading projects..." />
                    </div>
                ) : (
                    <List
                        grid={{
                            gutter: 16,
                            xs: 1,
                            sm: 2,
                            md: 2,
                            lg: 3,
                            xl: 3,
                            xxl: 4,
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No projects yet"
                                >
                                    <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                                        Create your first project
                                    </Button>
                                </Empty>
                            )
                        }}
                        dataSource={projects}
                        renderItem={(project) => (
                            <List.Item>
                                <Card
                                    hoverable
                                    style={{ height: '100%', cursor: 'pointer' }}
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                        <ProjectOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
                                        <Title level={5} style={{ margin: 0 }}>{project.name}</Title>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Created {new Date(project.createdAt).toLocaleDateString()}
                                    </Text>
                                </Card>
                            </List.Item>
                        )}
                    />
                )}

                <Modal
                    title="Create New Project"
                    open={isModalOpen}
                    onCancel={handleCancel}
                    footer={null}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreateProject}
                        style={{ marginTop: '24px' }}
                    >
                        <Form.Item
                            label="Project Name"
                            name="name"
                            rules={[
                                { required: true, message: 'Please enter a project name' },
                                { max: 255, message: 'Project name must be less than 255 characters' }
                            ]}
                        >
                            <Input
                                placeholder="Enter project name"
                                autoFocus
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={creating}>
                                    Create Project
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </AppLayout>
    );
};

export default Home;
