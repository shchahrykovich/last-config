"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, List, message, Modal, Form, Input, Space, Spin, Empty, Tag, Popconfirm, Typography } from 'antd';
import AppLayout from "@/components/AppLayout";
import { UserOutlined, PlusOutlined, DeleteOutlined, EditOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import type {
    GetUsersResponseSerialized,
    CreateUserResponseSerialized,
    UpdateUserResponseSerialized,
    UserDtoSerialized,
} from '@/app/api/users/dto';
import type { ErrorResponse } from '@/app/api/shared-dto';

const { Title, Text } = Typography;

interface CreateUserFormData {
    email: string;
    password: string;
    name?: string;
}

interface UpdateUserFormData {
    email?: string;
    name?: string;
    password?: string;
}

const UsersPage = () => {
    const router = useRouter();

    const [users, setUsers] = useState<UserDtoSerialized[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserDtoSerialized | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [createForm] = Form.useForm<CreateUserFormData>();
    const [editForm] = Form.useForm<UpdateUserFormData>();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/users`);

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error);
            }

            const data: GetUsersResponseSerialized = await response.json();
            setUsers(data.users);
        } catch (error) {
            message.error('Failed to load users');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (values: CreateUserFormData) => {
        try {
            setSubmitting(true);

            const response = await fetch(`/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }

            const data: CreateUserResponseSerialized = await response.json();
            message.success(data.message);

            setUsers([...users, data.user]);
            setIsCreateModalOpen(false);
            createForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to create user');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (values: UpdateUserFormData) => {
        if (!editingUser) return;

        try {
            setSubmitting(true);

            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to update user');
            }

            const data: UpdateUserResponseSerialized = await response.json();
            message.success(data.message);

            setUsers(users.map(u => u.id === editingUser.id ? data.user : u));
            setIsEditModalOpen(false);
            setEditingUser(null);
            editForm.resetFields();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to update user');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error: ErrorResponse = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }

            message.success('User deleted successfully');
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Failed to delete user');
            console.error(error);
        }
    };

    const handleOpenEditModal = (user: UserDtoSerialized) => {
        setEditingUser(user);
        editForm.setFieldsValue({
            email: user.email,
            name: user.name || '',
            password: '', // Don't pre-fill password
        });
        setIsEditModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        createForm.resetFields();
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
        editForm.resetFields();
    };

    if (loading) {
        return (
            <AppLayout title="Users" icon={<UserOutlined />}>
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Loading users..." />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Users" icon={<UserOutlined />}>
            <div style={{ maxWidth: '1200px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Add User
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
                                    description="No users yet"
                                >
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        Add your first user
                                    </Button>
                                </Empty>
                            )
                        }}
                        dataSource={users}
                        renderItem={(user) => (
                            <List.Item>
                                <Card
                                    style={{ height: '100%' }}
                                    actions={[
                                        <Button
                                            key="edit"
                                            type="text"
                                            icon={<EditOutlined />}
                                            onClick={() => handleOpenEditModal(user)}
                                        >
                                            Edit
                                        </Button>,
                                        <Popconfirm
                                            key="delete"
                                            title="Delete User"
                                            description="Are you sure you want to delete this user? This action cannot be undone."
                                            onConfirm={() => handleDeleteUser(user.id)}
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
                                            <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                            {user.name || 'Unnamed User'}
                                        </Title>
                                        {user.emailVerified && <Tag color="green">Verified</Tag>}
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                            <MailOutlined style={{ marginRight: '4px' }} />
                                            Email:
                                        </Text>
                                        <Text style={{ fontSize: '13px', wordBreak: 'break-all' }}>
                                            {user.email}
                                        </Text>
                                    </div>
                                </Card>
                            </List.Item>
                        )}
                    />
                </Space>

                {/* Create User Modal */}
                <Modal
                    title="Add New User"
                    open={isCreateModalOpen}
                    onCancel={handleCloseCreateModal}
                    footer={null}
                    width={500}
                >
                    <Form
                        form={createForm}
                        layout="vertical"
                        onFinish={handleCreateUser}
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter an email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="user@example.com"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            name="password"
                            rules={[
                                { required: true, message: 'Please enter a password' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Enter password"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Name (Optional)"
                            name="name"
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="John Doe"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCloseCreateModal}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={submitting}>
                                    Create User
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Edit User Modal */}
                <Modal
                    title="Edit User"
                    open={isEditModalOpen}
                    onCancel={handleCloseEditModal}
                    footer={null}
                    width={500}
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleUpdateUser}
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="user@example.com"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Name"
                            name="name"
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="John Doe"
                            />
                        </Form.Item>

                        <Form.Item
                            label="New Password (Optional)"
                            name="password"
                            rules={[
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                            help="Leave empty to keep current password"
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Enter new password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCloseEditModal}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={submitting}>
                                    Update User
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </AppLayout>
    );
};

export default UsersPage;
