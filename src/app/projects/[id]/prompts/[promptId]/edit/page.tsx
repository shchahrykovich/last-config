"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, Form, Input, message, Spin, Typography, Space } from 'antd';
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { EditOutlined, SaveOutlined, FileTextOutlined, ProjectOutlined } from "@ant-design/icons";
import type {
    PromptDtoSerialized,
    GetPromptByIdResponseSerialized,
    UpdatePromptRequest,
    UpdatePromptResponseSerialized,
} from '@/app/api/projects/[id]/prompts/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';
import type { GetProjectByIdResponseSerialized } from '@/app/api/projects/dto';

const { Title } = Typography;
const { TextArea } = Input;

interface FormValues {
    name: string;
    body: {
        systemMessage?: string;
        userMessage: string;
        model?: string;
        responseSchema?: string;
    };
}

const PromptEditPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const promptId = params.promptId as string;

    const [prompt, setPrompt] = useState<PromptDtoSerialized | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm<FormValues>();

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

    const fetchPrompt = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectId}/prompts/${promptId}`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetPromptByIdResponseSerialized = await response.json();
            setPrompt(data.prompt);

            // Parse the body JSON
            const parsedBody = JSON.parse(data.prompt.body);
            const parsedModel = typeof parsedBody.model === 'string' ? parsedBody.model : undefined;
            const parsedResponseSchema = typeof parsedBody.responseSchema === 'string' ? parsedBody.responseSchema : undefined;

            // Support both old (message) and new (userMessage/systemMessage) formats
            const parsedSystemMessage = typeof parsedBody.systemMessage === 'string' ? parsedBody.systemMessage : undefined;
            const parsedUserMessage = typeof parsedBody.userMessage === 'string' ? parsedBody.userMessage : (parsedBody.message || '');

            form.setFieldsValue({
                name: data.prompt.name,
                body: {
                    systemMessage: parsedSystemMessage,
                    userMessage: parsedUserMessage,
                    model: parsedModel,
                    responseSchema: parsedResponseSchema,
                },
            });
        } catch (error) {
            message.error('Failed to load prompt');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
        fetchPrompt();
    }, [projectId, promptId]);

    const handleSave = async (values: FormValues) => {
        try {
            setSaving(true);

            const sanitizedBody = {
                systemMessage: values.body.systemMessage?.trim() ? values.body.systemMessage.trim() : undefined,
                userMessage: values.body.userMessage,
                model: values.body.model?.trim() ? values.body.model.trim() : undefined,
                responseSchema: values.body.responseSchema?.trim() ? values.body.responseSchema.trim() : undefined,
            };

            const updateData: UpdatePromptRequest = {
                name: values.name,
                body: sanitizedBody,
            };

            const response = await fetch(`/api/projects/${projectId}/prompts/${promptId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to update prompt');
            }

            const data: UpdatePromptResponseSerialized = await response.json();
            message.success(data.message);
            router.push(`/projects/${projectId}/prompts`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to update prompt');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading prompt..." />
                </div>
            </AppLayout>
        );
    }

    if (!prompt) {
        return (
            <AppLayout>
                <PageHeader
                    title="Edit Prompt"
                    subtitle="Modify your prompt"
                    icon={<EditOutlined />}
                    breadcrumb={
                        <Breadcrumb
                            items={[
                                { label: 'Projects', href: '/' },
                                { label: projectName || 'Loading...', href: `/projects/${projectId}`, icon: <ProjectOutlined /> },
                                { label: 'Prompts', href: `/projects/${projectId}/prompts`, icon: <FileTextOutlined /> },
                                { label: 'Edit' }
                            ]}
                        />
                    }
                />
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Typography.Text type="secondary">Prompt not found</Typography.Text>
                    </div>
                </Card>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader
                title="Edit Prompt"
                subtitle={`Editing: ${prompt.name}`}
                icon={<EditOutlined />}
                breadcrumb={
                    <Breadcrumb
                        items={[
                            { label: 'Projects', href: '/' },
                            { label: projectName || 'Loading...', href: `/projects/${projectId}`, icon: <ProjectOutlined /> },
                            { label: 'Prompts', href: `/projects/${projectId}/prompts`, icon: <FileTextOutlined /> },
                            { label: prompt.name }
                        ]}
                    />
                }
            />

            <div style={{ maxWidth: '900px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                        >
                            <Form.Item
                                label="Prompt Name"
                                name="name"
                                rules={[
                                    { required: true, message: 'Please enter a prompt name' },
                                    { max: 255, message: 'Prompt name must be less than 255 characters' }
                                ]}
                            >
                                <Input placeholder="Enter prompt name" />
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
                                    rows={12}
                                    placeholder="Enter user message"
                                />
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SaveOutlined />}
                                        loading={saving}
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/projects/${projectId}/prompts`)}
                                    >
                                        Cancel
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </Card>
                </Space>
            </div>
        </AppLayout>
    );
};

export default PromptEditPage;
