"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, List, message, Modal, Typography, Space, Spin, Empty, Tag, Popconfirm, Input } from 'antd';
import AppLayout from "@/components/AppLayout";
import { KeyOutlined, PlusOutlined, DeleteOutlined, ArrowLeftOutlined, CopyOutlined, EyeOutlined } from "@ant-design/icons";
import type {
    GetApiKeysResponseSerialized,
    CreateApiKeyResponseSerialized,
} from '@/app/api/projects/[id]/api-keys/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

const { Title, Text, Paragraph } = Typography;

interface ApiKeyDisplay {
    id: number;
    public: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

const ApiKeysPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [apiKeys, setApiKeys] = useState<ApiKeyDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [newApiKey, setNewApiKey] = useState<{ fullKey: string; public: string } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const fetchApiKeys = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectId}/api-keys`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetApiKeysResponseSerialized = await response.json();
            setApiKeys(data.apiKeys);
        } catch (error) {
            message.error('Failed to load API keys');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApiKeys();
    }, [projectId]);

    const handleCreateApiKey = async () => {
        try {
            setCreating(true);

            const response = await fetch(`/api/projects/${projectId}/api-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create API key');
            }

            const data: CreateApiKeyResponseSerialized = await response.json();
            message.success(data.message);

            // Add new key to list (without private part)
            setApiKeys([data.apiKey, ...apiKeys]);

            // Show the full key in modal
            setNewApiKey({
                fullKey: data.fullKey,
                public: data.apiKey.public,
            });
            setIsSuccessModalOpen(true);
            setCopySuccess(false);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create API key');
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteApiKey = async (apiKeyId: number) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/api-keys/${apiKeyId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to delete API key');
            }

            message.success('API key deleted successfully');
            setApiKeys(apiKeys.filter(key => key.id !== apiKeyId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete API key');
            console.error(error);
        }
    };

    const handleCopyToClipboard = () => {
        if (newApiKey) {
            navigator.clipboard.writeText(newApiKey.fullKey);
            setCopySuccess(true);
            message.success('API key copied to clipboard');
        }
    };

    const handleCloseSuccessModal = () => {
        setIsSuccessModalOpen(false);
        setNewApiKey(null);
        setCopySuccess(false);
    };

    if (loading) {
        return (
            <AppLayout title="API Keys" icon={<KeyOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading API keys..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="API Keys" icon={<KeyOutlined />}>
            <div style={{ maxWidth: '1200px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.push(`/projects/${projectId}`)}
                        >
                            Back to Project
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateApiKey}
                            loading={creating}
                        >
                            Generate New API Key
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
                                    description="No API keys yet"
                                >
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleCreateApiKey}
                                        loading={creating}
                                    >
                                        Generate your first API key
                                    </Button>
                                </Empty>
                            )
                        }}
                        dataSource={apiKeys}
                        renderItem={(apiKey) => (
                            <List.Item>
                                <Card
                                    style={{ height: '100%' }}
                                    actions={[
                                        <Popconfirm
                                            key="delete"
                                            title="Delete API Key"
                                            description="Are you sure you want to delete this API key? This action cannot be undone."
                                            onConfirm={() => handleDeleteApiKey(apiKey.id)}
                                            okText="Yes, delete"
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                            >
                                                Delete
                                            </Button>
                                        </Popconfirm>
                                    ]}
                                >
                                    <div style={{ marginBottom: '12px' }}>
                                        <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                                            <KeyOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                            API Key
                                        </Title>
                                        <Tag color="blue">{apiKey.type}</Tag>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                                            Public Key:
                                        </Text>
                                        <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                            sk_{apiKey.public}_••••••••
                                        </Text>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                                    </Text>
                                </Card>
                            </List.Item>
                        )}
                    />
                </Space>

                {/* Success Modal - Show full API key once */}
                <Modal
                    title={
                        <Space>
                            <EyeOutlined style={{ color: '#52c41a' }} />
                            <span>API Key Created Successfully</span>
                        </Space>
                    }
                    open={isSuccessModalOpen}
                    onCancel={handleCloseSuccessModal}
                    footer={[
                        <Button key="close" type="primary" onClick={handleCloseSuccessModal}>
                            I've saved my API key
                        </Button>
                    ]}
                    width={700}
                    closable={false}
                    maskClosable={false}
                >
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div style={{
                            padding: '16px',
                            background: '#fff7e6',
                            border: '1px solid #ffd666',
                            borderRadius: '4px'
                        }}>
                            <Space direction="vertical" size="small">
                                <Text strong style={{ color: '#fa8c16' }}>
                                    ⚠️ Important: Save this API key now
                                </Text>
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    For security reasons, you won't be able to view this key again.
                                    Make sure to copy it to a secure location.
                                </Text>
                            </Space>
                        </div>

                        <div>
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                Your API Key:
                            </Text>
                            <Input.TextArea
                                value={newApiKey?.fullKey}
                                readOnly
                                rows={3}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    background: '#f5f5f5'
                                }}
                            />
                        </div>

                        <Button
                            type="default"
                            icon={<CopyOutlined />}
                            onClick={handleCopyToClipboard}
                            block
                            size="large"
                        >
                            {copySuccess ? '✓ Copied to Clipboard' : 'Copy to Clipboard'}
                        </Button>

                        <div style={{
                            padding: '12px',
                            background: '#f0f0f0',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            <Text type="secondary">
                                <strong>How to use:</strong> Include this key in your API requests as a bearer token
                                or in your application's configuration file.
                            </Text>
                        </div>
                    </Space>
                </Modal>
            </div>
        </AppLayout>
    );
};

export default ApiKeysPage;
