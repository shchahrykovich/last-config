"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, List, message, Modal, Form, Input, Typography, Space, Spin, Empty, Tag } from 'antd';
import AppLayout from "@/components/AppLayout";
import { FileTextOutlined, PlusOutlined, EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type {
    PromptDtoSerialized,
    GetPromptsResponseSerialized,
    CreatePromptRequest,
    CreatePromptResponseSerialized,
} from '@/app/api/projects/[id]/prompts/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PromptsPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [prompts, setPrompts] = useState<PromptDtoSerialized[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm<CreatePromptRequest>();

    const fetchPrompts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectId}/prompts`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetPromptsResponseSerialized = await response.json();
            setPrompts(data.prompts);
        } catch (error) {
            message.error('Failed to load prompts');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, [projectId]);

    const handleCreatePrompt = async (values: CreatePromptRequest) => {
        try {
            setCreating(true);

            const response = await fetch(`/api/projects/${projectId}/prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: values.name,
                    body: values.body,
                }),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create prompt');
            }

            const data: CreatePromptResponseSerialized = await response.json();
            message.success(data.message);
            setPrompts([data.prompt, ...prompts]);
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create prompt');
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

    const getMessagePreview = (bodyString: string): string => {
        try {
            const body = JSON.parse(bodyString);
            const message = body.message || '';
            return message.length > 150 ? message.substring(0, 150) + '...' : message;
        } catch (e) {
            return 'Invalid format';
        }
    };

    if (loading) {
        return (
            <AppLayout title="Prompts" icon={<FileTextOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading prompts..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Prompts" icon={<FileTextOutlined />}>
            <div style={{ maxWidth: '1200px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showModal}
                        >
                            New Prompt
                        </Button>
                    </div>

                    <List
                        grid={{
                            gutter: 16,
                            xs: 1,
                            sm: 1,
                            md: 2,
                            lg: 2,
                            xl: 3,
                            xxl: 3,
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No prompts yet"
                                >
                                    <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                                        Create your first prompt
                                    </Button>
                                </Empty>
                            )
                        }}
                        dataSource={prompts}
                        renderItem={(prompt) => (
                            <List.Item>
                                <Card
                                    hoverable
                                    style={{ height: '100%' }}
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            onClick={() => router.push(`/projects/${projectId}/prompts/${prompt.id}/edit`)}
                                        >
                                            Edit
                                        </Button>
                                    ]}
                                >
                                    <div style={{ marginBottom: '12px' }}>
                                        <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                                            <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                            {prompt.name}
                                        </Title>
                                    </div>
                                    <Paragraph
                                        type="secondary"
                                        ellipsis={{ rows: 3 }}
                                        style={{ fontSize: '12px', marginBottom: '12px' }}
                                    >
                                        {getMessagePreview(prompt.body)}
                                    </Paragraph>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Created {new Date(prompt.createdAt).toLocaleDateString()}
                                    </Text>
                                </Card>
                            </List.Item>
                        )}
                    />
                </Space>

                <Modal
                    title="Create New Prompt"
                    open={isModalOpen}
                    onCancel={handleCancel}
                    footer={null}
                    width={700}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreatePrompt}
                        style={{ marginTop: '24px' }}
                    >
                        <Form.Item
                            label="Prompt Name"
                            name="name"
                            rules={[
                                { required: true, message: 'Please enter a prompt name' },
                                { max: 255, message: 'Prompt name must be less than 255 characters' }
                            ]}
                        >
                            <Input placeholder="Enter prompt name" autoFocus />
                        </Form.Item>

                        <Form.Item
                            label="Message"
                            name={['body', 'message']}
                            rules={[
                                { required: true, message: 'Please enter the prompt message' },
                            ]}
                        >
                            <TextArea
                                rows={8}
                                placeholder="Enter your prompt message"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={creating}>
                                    Create Prompt
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </AppLayout>
    );
};

export default PromptsPage;
