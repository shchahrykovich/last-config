"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Button,
    message,
    Modal,
    Form,
    Input,
    Typography,
    Space,
    Spin,
    Empty,
    Table,
    Popconfirm,
} from 'antd';
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import Breadcrumb from "@/components/Breadcrumb";
import HelpDrawerTitle from '@/components/HelpDrawerTitle';
import PromptsApiExamples from '@/components/PromptsApiExamples';
import { FileTextOutlined, PlusOutlined, EditOutlined, ProjectOutlined } from "@ant-design/icons";
import type {
    PromptDtoSerialized,
    GetPromptsResponseSerialized,
    CreatePromptRequest,
    CreatePromptResponseSerialized,
} from '@/app/api/projects/[id]/prompts/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';
import type { GetProjectByIdResponseSerialized } from '@/app/api/projects/dto';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;

const PromptsPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [prompts, setPrompts] = useState<PromptDtoSerialized[]>([]);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm<CreatePromptRequest>();
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            if (response.ok) {
                const data: GetProjectByIdResponseSerialized = await response.json();
                setProjectName(data.project.name);
            }
        } catch (error) {
            console.error('Failed to load project name:', error);
        }
    };

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
        fetchProject();
        fetchPrompts();
    }, [projectId]);

    const handleCreatePrompt = async (values: CreatePromptRequest) => {
        try {
            setCreating(true);
            const sanitizedBody = {
                systemMessage: values.body.systemMessage?.trim() ? values.body.systemMessage.trim() : undefined,
                userMessage: values.body.userMessage,
                model: values.body.model?.trim() ? values.body.model.trim() : undefined,
                responseSchema: values.body.responseSchema?.trim() ? values.body.responseSchema.trim() : undefined,
            };

            const response = await fetch(`/api/projects/${projectId}/prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: values.name,
                    body: sanitizedBody,
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

    const parseBody = (bodyString: string): { systemMessage?: string; userMessage?: string; message?: string; model?: string } => {
        try {
            return JSON.parse(bodyString);
        } catch {
            return {};
        }
    };

    const getMessagePreview = (bodyString: string): string => {
        const body = parseBody(bodyString);
        // Support both new (userMessage/systemMessage) and old (message) formats
        const message = body.userMessage || body.message || '';
        const systemMessage = body.systemMessage || '';

        // Combine system and user messages for preview
        const combinedMessage = systemMessage
            ? `[System] ${systemMessage}\n[User] ${message}`
            : message;

        return combinedMessage.length > 150 ? combinedMessage.substring(0, 150) + '...' : combinedMessage;
    };

    const handleDeletePrompt = async (promptId: number) => {
        try {
            setDeletingId(promptId);
            const response = await fetch(`/api/projects/${projectId}/prompts/${promptId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to delete prompt');
            }

            const data = await response.json() as { message?: string };
            message.success(data.message || 'Prompt deleted');
            setPrompts((prev) => prev.filter((prompt) => prompt.id !== promptId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete prompt');
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    };

    const columns = [
        {
            title: 'Id',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (_: string, prompt: PromptDtoSerialized) => (
                <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{prompt.name}</Text>
                </Space>
            ),
        },
        {
            title: 'Message Preview',
            dataIndex: 'body',
            key: 'body',
            render: (body: string) => (
                <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ margin: 0 }}
                >
                    {getMessagePreview(body)}
                </Paragraph>
            ),
        },
        {
            title: 'Model',
            dataIndex: 'body',
            key: 'model',
            width: 180,
            render: (body: string) => {
                const parsed = parseBody(body);
                return parsed.model ? <Text>{parsed.model}</Text> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (value: string) => (
                <Text type="secondary">{new Date(value).toLocaleDateString()}</Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: unknown, prompt: PromptDtoSerialized) => (
                <Space size="middle">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/projects/${projectId}/prompts/${prompt.id}/edit`)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete prompt"
                        description="Are you sure you want to delete this prompt?"
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, loading: deletingId === prompt.id }}
                        onConfirm={() => handleDeletePrompt(prompt.id)}
                    >
                        <Button type="link" danger>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (loading) {
        return (
            <AppLayout>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading prompts..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader
                title="Prompts"
                subtitle="Manage and version your prompts"
                icon={<FileTextOutlined />}
                breadcrumb={
                    <Breadcrumb
                        items={[
                            { label: 'Projects', href: '/' },
                            { label: projectName || 'Loading...', href: `/projects/${projectId}`, icon: <ProjectOutlined /> },
                            { label: 'Prompts' }
                        ]}
                    />
                }
                actions={
                    <Space>
                        <HelpDrawerTitle
                            title=""
                            helpTitle="Prompt requests"
                            helpContent={<PromptsApiExamples />}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showModal}
                            size="large"
                        >
                            New Prompt
                        </Button>
                    </Space>
                }
            />

            <div style={{ maxWidth: '1200px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>

                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={prompts}
                        pagination={false}
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
                            label="Model"
                            name={['body', 'model']}
                        >
                            <Input
                                allowClear
                                placeholder="Enter a model name"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Response Schema"
                            name={['body', 'responseSchema']}
                        >
                            <TextArea
                                allowClear
                                rows={4}
                                placeholder="Enter response schema (JSON)"
                            />
                        </Form.Item>

                        <Form.Item
                            label="System Message"
                            name={['body', 'systemMessage']}
                        >
                            <TextArea
                                allowClear
                                rows={4}
                                placeholder="Enter system message (optional)"
                            />
                        </Form.Item>

                        <Form.Item
                            label="User Message"
                            name={['body', 'userMessage']}
                            rules={[
                                { required: true, message: 'Please enter the user message' },
                            ]}
                        >
                            <TextArea
                                rows={8}
                                placeholder="Enter user message"
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
