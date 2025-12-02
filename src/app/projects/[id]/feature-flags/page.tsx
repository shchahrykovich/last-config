"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Table, message, Modal, Form, Input, Space, Spin, Popconfirm, Tag, Select, Switch } from 'antd';
import AppLayout from "@/components/AppLayout";
import { FlagOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import type {
    GetFeatureFlagsResponseSerialized,
    CreateFeatureFlagResponseSerialized,
    UpdateFeatureFlagResponseSerialized,
    FeatureFlagDtoSerialized,
} from '@/app/api/projects/[id]/feature-flags/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

interface CreateFeatureFlagFormData {
    name: string;
    description?: string;
    type: 'string' | 'number' | 'boolean';
    value?: string;
    userId?: string;
    userRole?: string;
    userAccountId?: string;
    isPublic?: boolean;
}

interface UpdateFeatureFlagFormData {
    name?: string;
    description?: string;
    type?: 'string' | 'number' | 'boolean';
    value?: string;
    userId?: string;
    userRole?: string;
    userAccountId?: string;
    isPublic?: boolean;
}

const FeatureFlagsPage = () => {
    const params = useParams();
    const projectId = params.id as string;

    const [featureFlags, setFeatureFlags] = useState<FeatureFlagDtoSerialized[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFlag, setEditingFlag] = useState<FeatureFlagDtoSerialized | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');

    const [createForm] = Form.useForm<CreateFeatureFlagFormData>();
    const [editForm] = Form.useForm<UpdateFeatureFlagFormData>();

    const fetchFeatureFlags = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectId}/feature-flags`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetFeatureFlagsResponseSerialized = await response.json();
            setFeatureFlags(data.featureFlags);
        } catch (error) {
            message.error('Failed to load feature flags');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeatureFlags();
    }, [projectId]);

    const handleCreateFeatureFlag = async (values: CreateFeatureFlagFormData) => {
        try {
            setSubmitting(true);

            const response = await fetch(`/api/projects/${projectId}/feature-flags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create feature flag');
            }

            const data: CreateFeatureFlagResponseSerialized = await response.json();
            message.success(data.message);

            setFeatureFlags([data.featureFlag, ...featureFlags]);
            setIsCreateModalOpen(false);
            createForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create feature flag');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateFeatureFlag = async (values: UpdateFeatureFlagFormData) => {
        if (!editingFlag) return;

        try {
            setSubmitting(true);

            const response = await fetch(`/api/projects/${projectId}/feature-flags/${editingFlag.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to update feature flag');
            }

            const data: UpdateFeatureFlagResponseSerialized = await response.json();
            message.success(data.message);

            setFeatureFlags(featureFlags.map(f => f.id === editingFlag.id ? data.featureFlag : f));
            setIsEditModalOpen(false);
            setEditingFlag(null);
            editForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to update feature flag');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFeatureFlag = async (featureFlagId: number) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/feature-flags/${featureFlagId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to delete feature flag');
            }

            message.success('Feature flag deleted successfully');
            setFeatureFlags(featureFlags.filter(f => f.id !== featureFlagId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete feature flag');
            console.error(error);
        }
    };

    const handleOpenEditModal = (flag: FeatureFlagDtoSerialized) => {
        setEditingFlag(flag);
        editForm.setFieldsValue({
            name: flag.name,
            description: flag.description || '',
            type: flag.type as 'string' | 'number' | 'boolean',
            value: flag.value,
            userId: flag.userId || '',
            userRole: flag.userRole || '',
            userAccountId: flag.userAccountId || '',
            isPublic: flag.isPublic || false,
        });
        setIsEditModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        createForm.resetFields();
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingFlag(null);
        editForm.resetFields();
    };

    const handleCopyFeatureFlag = (flag: FeatureFlagDtoSerialized) => {
        createForm.setFieldsValue({
            name: `${flag.name}`,
            description: flag.description || '',
            type: flag.type as 'string' | 'number' | 'boolean',
            value: flag.value,
            userId: flag.userId || '',
            userRole: flag.userRole || '',
            userAccountId: flag.userAccountId || '',
            isPublic: flag.isPublic || false,
        });
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

    const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
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
        onFilter: (value: string | number | boolean, record: FeatureFlagDtoSerialized) => {
            const recordValue = (record as any)[dataIndex];
            return recordValue
                ? recordValue.toString().toLowerCase().includes(value.toString().toLowerCase())
                : false;
        },
    });

    const columns: ColumnsType<FeatureFlagDtoSerialized> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            ...getColumnSearchProps('name', 'name'),
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text: string, record: FeatureFlagDtoSerialized) => (
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
            render: (text: string, record: FeatureFlagDtoSerialized) => {
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
            title: 'Public',
            dataIndex: 'isPublic',
            key: 'isPublic',
            width: 100,
            filters: [
                { text: 'Public', value: true },
                { text: 'Private', value: false },
            ],
            onFilter: (value, record) => record.isPublic === value,
            sorter: (a, b) => Number(a.isPublic) - Number(b.isPublic),
            render: (isPublic: boolean) => (
                <Tag color={isPublic ? 'green' : 'default'}>
                    {isPublic ? 'Public' : 'Private'}
                </Tag>
            ),
        },
        {
            title: 'User ID',
            dataIndex: 'userId',
            key: 'userId',
            ...getColumnSearchProps('userId', 'user ID'),
            sorter: (a, b) => {
                const aVal = a.userId || '';
                const bVal = b.userId || '';
                return aVal.localeCompare(bVal);
            },
            render: (text: string) => {
                if (!text) return <span style={{ color: '#999' }}>—</span>;
                const displayText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
                return <span title={text}>{displayText}</span>;
            },
        },
        {
            title: 'User Role',
            dataIndex: 'userRole',
            key: 'userRole',
            ...getColumnSearchProps('userRole', 'user role'),
            sorter: (a, b) => {
                const aVal = a.userRole || '';
                const bVal = b.userRole || '';
                return aVal.localeCompare(bVal);
            },
            render: (text: string) => {
                if (!text) return <span style={{ color: '#999' }}>—</span>;
                const displayText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
                return <span title={text}>{displayText}</span>;
            },
        },
        {
            title: 'User Account ID',
            dataIndex: 'userAccountId',
            key: 'userAccountId',
            ...getColumnSearchProps('userAccountId', 'account ID'),
            sorter: (a, b) => {
                const aVal = a.userAccountId || '';
                const bVal = b.userAccountId || '';
                return aVal.localeCompare(bVal);
            },
            render: (text: string) => {
                if (!text) return <span style={{ color: '#999' }}>—</span>;
                const displayText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
                return <span title={text}>{displayText}</span>;
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
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEditModal(record)}
                        size="small"
                    >
                        Edit
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyFeatureFlag(record)}
                        style={{ padding: '0 4px' }}
                        title="Duplicate feature flag"
                    >Copy</Button>
                    <Popconfirm
                        title="Delete Feature Flag"
                        description="Are you sure you want to delete this feature flag?"
                        onConfirm={() => handleDeleteFeatureFlag(record.id)}
                        okText="Yes, delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
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

    if (loading) {
        return (
            <AppLayout title="Feature Flags" icon={<FlagOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading feature flags..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Feature Flags" icon={<FlagOutlined />}>
            <div style={{ maxWidth: '1400px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Create Feature Flag
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={featureFlags}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} feature flags`,
                        }}
                        locale={{
                            emptyText: (
                                <div style={{ padding: '40px 0' }}>
                                    <p style={{ color: '#999', marginBottom: '16px' }}>No feature flags yet</p>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        Create your first feature flag
                                    </Button>
                                </div>
                            )
                        }}
                    />
                </Space>

                {/* Create Feature Flag Modal */}
                <Modal
                    title="Create Feature Flag"
                    open={isCreateModalOpen}
                    onCancel={handleCloseCreateModal}
                    footer={null}
                    width={600}
                >
                    <Form
                        form={createForm}
                        layout="vertical"
                        onFinish={handleCreateFeatureFlag}
                        initialValues={{ type: 'string', isPublic: false }}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g., enable_new_feature" />
                        </Form.Item>

                        <Form.Item
                            label="Description"
                            name="description"
                            help="Optional description for this feature flag"
                        >
                            <Input.TextArea
                                placeholder="Describe what this feature flag controls"
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
                            <Input placeholder="e.g., true, false, 123, or any string value" />
                        </Form.Item>

                        <Form.Item
                            label="Public"
                            name="isPublic"
                            help="Make this feature flag publicly accessible"
                            valuePropName="checked"
                            initialValue={false}
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            label="User ID (Optional)"
                            name="userId"
                            help="Target specific user by ID"
                        >
                            <Input
                                placeholder="Optional user ID"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        createForm.setFieldValue('userRole', '');
                                    }
                                }}
                            />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.userId !== currentValues.userId}>
                            {({ getFieldValue }) => (
                                <Form.Item
                                    label="User Role (Optional)"
                                    name="userRole"
                                    help="Target users by role (e.g., admin, user). Cannot be used with User ID."
                                    dependencies={['userId', 'userAccountId']}
                                    rules={[
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                const userId = getFieldValue('userId');
                                                if (userId && value) {
                                                    return Promise.reject(new Error('User Role cannot be used when User ID is specified'));
                                                }
                                                const userAccountId = getFieldValue('userAccountId');
                                                if (userAccountId && !value && !userId) {
                                                    return Promise.reject(new Error('User Role is required when User Account ID is provided'));
                                                }
                                                return Promise.resolve();
                                            },
                                        }),
                                    ]}
                                >
                                    <Input
                                        placeholder="Optional user role"
                                        disabled={!!getFieldValue('userId')}
                                    />
                                </Form.Item>
                            )}
                        </Form.Item>

                        <Form.Item
                            label="User Account ID (Optional)"
                            name="userAccountId"
                            help="Target specific account. Can be used with User ID or User Role."
                            dependencies={['userId', 'userRole']}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const userRole = getFieldValue('userRole');
                                        const userId = getFieldValue('userId');
                                        if (userRole && !value && !userId) {
                                            return Promise.reject(new Error('User Account ID is required when User Role is provided'));
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input placeholder="Optional account ID" />
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

                {/* Edit Feature Flag Modal */}
                <Modal
                    title="Edit Feature Flag"
                    open={isEditModalOpen}
                    onCancel={handleCloseEditModal}
                    footer={null}
                    width={600}
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleUpdateFeatureFlag}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: 'Please enter a name' }]}
                        >
                            <Input placeholder="e.g., enable_new_feature" />
                        </Form.Item>

                        <Form.Item
                            label="Description"
                            name="description"
                            help="Optional description for this feature flag"
                        >
                            <Input.TextArea
                                placeholder="Describe what this feature flag controls"
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
                            <Input placeholder="e.g., true, false, 123, or any string value" />
                        </Form.Item>

                        <Form.Item
                            label="Public"
                            name="isPublic"
                            help="Make this feature flag publicly accessible"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            label="User ID (Optional)"
                            name="userId"
                            help="Target specific user by ID"
                        >
                            <Input
                                placeholder="Optional user ID"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        editForm.setFieldValue('userRole', '');
                                    }
                                }}
                            />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.userId !== currentValues.userId}>
                            {({ getFieldValue }) => (
                                <Form.Item
                                    label="User Role (Optional)"
                                    name="userRole"
                                    help="Target users by role (e.g., admin, user). Cannot be used with User ID."
                                    dependencies={['userId', 'userAccountId']}
                                    rules={[
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                const userId = getFieldValue('userId');
                                                if (userId && value) {
                                                    return Promise.reject(new Error('User Role cannot be used when User ID is specified'));
                                                }
                                                const userAccountId = getFieldValue('userAccountId');
                                                if (userAccountId && !value && !userId) {
                                                    return Promise.reject(new Error('User Role is required when User Account ID is provided'));
                                                }
                                                return Promise.resolve();
                                            },
                                        }),
                                    ]}
                                >
                                    <Input
                                        placeholder="Optional user role"
                                        disabled={!!getFieldValue('userId')}
                                    />
                                </Form.Item>
                            )}
                        </Form.Item>

                        <Form.Item
                            label="User Account ID (Optional)"
                            name="userAccountId"
                            help="Target specific account. Can be used with User ID or User Role."
                            dependencies={['userId', 'userRole']}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const userRole = getFieldValue('userRole');
                                        const userId = getFieldValue('userId');
                                        if (userRole && !value && !userId) {
                                            return Promise.reject(new Error('User Account ID is required when User Role is provided'));
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input placeholder="Optional account ID" />
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

export default FeatureFlagsPage;
