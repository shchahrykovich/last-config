"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Table, message, Modal, Form, Input, Space, Spin, Popconfirm, Tag, Select, Tabs } from 'antd';
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import Breadcrumb from "@/components/Breadcrumb";
import HelpDrawerTitle from '@/components/HelpDrawerTitle';
import ConfigApiExamples from '@/components/ConfigApiExamples';
import { SettingOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined, SearchOutlined, ProjectOutlined } from "@ant-design/icons";
import type { ColumnsType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import type {
    GetConfigsResponseSerialized,
    CreateConfigResponseSerialized,
    UpdateConfigResponseSerialized,
    ConfigDtoSerialized,
} from '@/app/api/projects/[id]/config/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';
import type { GetProjectByIdResponseSerialized } from '@/app/api/projects/dto';

interface CreateConfigFormData {
    name: string;
    description?: string;
    type: 'string' | 'number' | 'boolean';
    value?: string;
}

interface UpdateConfigFormData {
    name?: string;
    description?: string;
    type?: 'string' | 'number' | 'boolean';
    value?: string;
}

const ConfigPage = () => {
    const params = useParams();
    const projectId = params.id as string;

    const [publicConfigs, setPublicConfigs] = useState<ConfigDtoSerialized[]>([]);
    const [secretConfigs, setSecretConfigs] = useState<ConfigDtoSerialized[]>([]);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ConfigDtoSerialized | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');
    const [activeTab, setActiveTab] = useState('secret');

    const [createForm] = Form.useForm<CreateConfigFormData>();
    const [editForm] = Form.useForm<UpdateConfigFormData>();

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

    const fetchConfigs = async () => {
        try {
            setLoading(true);

            // Fetch public configs
            const publicResponse = await fetch(`/api/projects/${projectId}/config?isPublic=true`);
            if (!publicResponse.ok) {
                const error: ErrorResponse = await publicResponse.json();
                throw new Error(error.error);
            }
            const publicData: GetConfigsResponseSerialized = await publicResponse.json();
            setPublicConfigs(publicData.configs);

            // Fetch secret configs
            const secretResponse = await fetch(`/api/projects/${projectId}/config?isPublic=false`);
            if (!secretResponse.ok) {
                const error: ErrorResponse = await secretResponse.json();
                throw new Error(error.error);
            }
            const secretData: GetConfigsResponseSerialized = await secretResponse.json();
            setSecretConfigs(secretData.configs);
        } catch (error) {
            message.error('Failed to load configs');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
        fetchConfigs();
    }, [projectId]);

    const handleCreateConfig = async (values: CreateConfigFormData) => {
        try {
            setSubmitting(true);

            const isPublic = activeTab === 'public';
            const response = await fetch(`/api/projects/${projectId}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...values, isPublic }),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create config');
            }

            const data: CreateConfigResponseSerialized = await response.json();
            message.success(data.message);

            if (isPublic) {
                setPublicConfigs([data.config, ...publicConfigs]);
            } else {
                setSecretConfigs([data.config, ...secretConfigs]);
            }

            setIsCreateModalOpen(false);
            createForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create config');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateConfig = async (values: UpdateConfigFormData) => {
        if (!editingConfig) return;

        try {
            setSubmitting(true);

            const response = await fetch(`/api/projects/${projectId}/config/${editingConfig.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to update config');
            }

            const data: UpdateConfigResponseSerialized = await response.json();
            message.success(data.message);

            if (editingConfig.isPublic) {
                setPublicConfigs(publicConfigs.map(c => c.id === editingConfig.id ? data.config : c));
            } else {
                setSecretConfigs(secretConfigs.map(c => c.id === editingConfig.id ? data.config : c));
            }

            setIsEditModalOpen(false);
            setEditingConfig(null);
            editForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to update config');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfig = async (config: ConfigDtoSerialized) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/config/${config.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to delete config');
            }

            message.success('Config deleted successfully');

            if (config.isPublic) {
                setPublicConfigs(publicConfigs.filter(c => c.id !== config.id));
            } else {
                setSecretConfigs(secretConfigs.filter(c => c.id !== config.id));
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete config');
            console.error(error);
        }
    };

    const handleOpenEditModal = (config: ConfigDtoSerialized) => {
        setEditingConfig(config);
        editForm.setFieldsValue({
            name: config.name,
            description: config.description || '',
            type: config.type as 'string' | 'number' | 'boolean',
            value: config.value,
        });
        setIsEditModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        createForm.resetFields();
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingConfig(null);
        editForm.resetFields();
    };

    const handleCopyConfig = (config: ConfigDtoSerialized) => {
        createForm.setFieldsValue({
            name: `${config.name}`,
            description: config.description || '',
            type: config.type as 'string' | 'number' | 'boolean',
            value: config.value,
        });
        setActiveTab(config.isPublic ? 'public' : 'secret');
        setIsCreateModalOpen(true);
    };

    const handleSearch = (
        selectedKeys: string[],
        confirm: FilterDropdownProps['confirm'],
        dataIndex: string,
    ) => {
        confirm();
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    };

    const handleReset = (clearFilters: () => void, confirm: FilterDropdownProps['confirm']) => {
        clearFilters();
        setSearchText('');
        confirm();
    };

    const getColumnSearchProps = (dataIndex: string, placeholder: string): ColumnsType<ConfigDtoSerialized>[number] => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    placeholder={`Search ${placeholder}`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Search
                    </Button>
                    <Button
                        onClick={() => clearFilters && handleReset(clearFilters, confirm)}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
        ),
        onFilter: (value: any, record: ConfigDtoSerialized): boolean => {
            const recordValue = (record as any)[dataIndex];
            return recordValue
                ? recordValue.toString().toLowerCase().includes(value.toString().toLowerCase())
                : false;
        },
    });

    const columns: ColumnsType<ConfigDtoSerialized> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            ...getColumnSearchProps('name', 'name'),
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text: string, record: ConfigDtoSerialized) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{text}</strong>
                    </div>
                    {record.description && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            {record.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            filters: [
                { text: 'String', value: 'string' },
                { text: 'Number', value: 'number' },
                { text: 'Boolean', value: 'boolean' },
            ],
            onFilter: (value, record) => record.type === value,
            sorter: (a, b) => a.type.localeCompare(b.type),
            render: (text: string) => {
                const colors: Record<string, string> = {
                    string: 'blue',
                    number: 'purple',
                    boolean: 'orange',
                };
                return <Tag color={colors[text] || 'default'}>{text}</Tag>;
            },
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            ...getColumnSearchProps('value', 'value'),
            sorter: (a, b) => {
                const aVal = a.value || '';
                const bVal = b.value || '';
                return aVal.localeCompare(bVal);
            },
            render: (text: string, record: ConfigDtoSerialized) => {
                if (!text) {
                    return <span style={{ color: '#999' }}>empty</span>;
                }
                if (record.type === 'boolean') {
                    return <Tag color={text === 'true' ? 'green' : 'red'}>{text}</Tag>;
                }
                const displayText = text.length > 50 ? `${text.substring(0, 50)}...` : text;
                return <code title={text}>{displayText}</code>;
            },
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            render: (text: string) => new Date(text).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEditModal(record)}
                        size="small"
                    >
                        Edit
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyConfig(record)}
                        style={{ padding: '0 4px' }}
                        title="Duplicate config"
                    >Copy</Button>
                    <Popconfirm
                        title="Delete Config"
                        description="Are you sure you want to delete this config?"
                        onConfirm={() => handleDeleteConfig(record)}
                        okText="Yes, delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const renderTable = (configs: ConfigDtoSerialized[], type: string) => (
        <Table
            columns={columns}
            dataSource={configs}
            rowKey="id"
            pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} configs`,
            }}
            locale={{
                emptyText: (
                    <div style={{ padding: '40px 0' }}>
                        <p style={{ color: '#999', marginBottom: '16px' }}>No {type} configs yet</p>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Create your first {type} config
                        </Button>
                    </div>
                )
            }}
        />
    );

    if (loading) {
        return (
            <AppLayout>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading configs..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader
                title="Config"
                subtitle="Manage configuration values for your project"
                icon={<SettingOutlined />}
                breadcrumb={
                    <Breadcrumb
                        items={[
                            { label: 'Projects', href: '/' },
                            { label: projectName || 'Loading...', href: `/projects/${projectId}`, icon: <ProjectOutlined /> },
                            { label: 'Config' }
                        ]}
                    />
                }
                actions={
                    <Space>
                        <HelpDrawerTitle
                            title=""
                            helpTitle="Config API"
                            helpContent={<ConfigApiExamples />}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                            size="large"
                        >
                            Create Config
                        </Button>
                    </Space>
                }
            />

            <div style={{ maxWidth: '1400px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>

                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            {
                                key: 'secret',
                                label: `Secret (${secretConfigs.length})`,
                                children: renderTable(secretConfigs, 'secret'),
                            },
                            {
                                key: 'public',
                                label: `Public (${publicConfigs.length})`,
                                children: renderTable(publicConfigs, 'public'),
                            },
                        ]}
                    />
                </Space>

                {/* Create Config Modal */}
                <Modal
                    title={`Create ${activeTab === 'public' ? 'Public' : 'Secret'} Config`}
                    open={isCreateModalOpen}
                    onCancel={handleCloseCreateModal}
                    footer={null}
                    width={600}
                >
                    <Form
                        form={createForm}
                        layout="vertical"
                        onFinish={handleCreateConfig}
                        initialValues={{ type: 'string' }}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g., api_endpoint" />
                        </Form.Item>

                        <Form.Item
                            label="Description"
                            name="description"
                            help="Optional description for this config"
                        >
                            <Input.TextArea
                                placeholder="Describe what this config is for"
                                rows={2}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Type"
                            name="type"
                            rules={[{ required: true, message: 'Please select a type' }]}
                        >
                            <Select placeholder="Select type">
                                <Select.Option value="string">String</Select.Option>
                                <Select.Option value="number">Number</Select.Option>
                                <Select.Option value="boolean">Boolean</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Value"
                            name="value"
                            help="Value can be empty"
                        >
                            <Input placeholder="e.g., https://api.example.com" />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCloseCreateModal}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={submitting}>
                                    Create
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Edit Config Modal */}
                <Modal
                    title="Edit Config"
                    open={isEditModalOpen}
                    onCancel={handleCloseEditModal}
                    footer={null}
                    width={600}
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleUpdateConfig}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g., api_endpoint" />
                        </Form.Item>

                        <Form.Item
                            label="Description"
                            name="description"
                            help="Optional description for this config"
                        >
                            <Input.TextArea
                                placeholder="Describe what this config is for"
                                rows={2}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Type"
                            name="type"
                            rules={[{ required: true, message: 'Please select a type' }]}
                        >
                            <Select placeholder="Select type">
                                <Select.Option value="string">String</Select.Option>
                                <Select.Option value="number">Number</Select.Option>
                                <Select.Option value="boolean">Boolean</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Value"
                            name="value"
                            help="Value can be empty"
                        >
                            <Input placeholder="e.g., https://api.example.com" />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCloseEditModal}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={submitting}>
                                    Update
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </AppLayout>
    );
};

export default ConfigPage;
