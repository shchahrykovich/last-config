"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, Form, Input, message, Spin, Typography, Space } from 'antd';
import AppLayout from "@/components/AppLayout";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import type {
    PromptDtoSerialized,
    GetPromptByIdResponseSerialized,
    UpdatePromptRequest,
    UpdatePromptResponseSerialized,
} from '@/app/api/projects/[id]/prompts/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

const { Title } = Typography;
const { TextArea } = Input;

interface FormValues {
    name: string;
    body: {
        message: string;
        model?: string;
    };
}

const PromptEditPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const promptId = params.promptId as string;

    const [prompt, setPrompt] = useState<PromptDtoSerialized | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm<FormValues>();
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

            form.setFieldsValue({
                name: data.prompt.name,
                body: {
                    message: parsedBody.message || '',
                    model: parsedModel,
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
        fetchPrompt();
    }, [projectId, promptId]);

    const handleSave = async (values: FormValues) => {
        try {
            setSaving(true);

            const sanitizedBody = {
                message: values.body.message,
                model: values.body.model?.trim() ? values.body.model.trim() : undefined,
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
            <AppLayout title="Edit Prompt" icon={<EditOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading prompt..." />
                </div>
            </AppLayout>
        );
    }

    if (!prompt) {
        return (
            <AppLayout title="Edit Prompt" icon={<EditOutlined />}>
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Typography.Text type="secondary">Prompt not found</Typography.Text>
                    </div>
                </Card>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Edit Prompt" icon={<EditOutlined />}>
            <div style={{ maxWidth: '900px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card>
                        <Title level={4} style={{ marginBottom: '24px' }}>
                            {prompt.name} ({prompt.id})
                        </Title>

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
                                label="Message"
                                name={['body', 'message']}
                                rules={[
                                    { required: true, message: 'Please enter the prompt message' },
                                ]}
                            >
                                <TextArea
                                    rows={12}
                                    placeholder="Enter your prompt message"
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
