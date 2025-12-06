"use client";

import React, { useState, useEffect } from 'react';
import { Typography, Space, Select, Spin, Button, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const { Text, Title } = Typography;

type Language = 'curl' | 'typescript';

interface CodeExample {
    curl: string;
    typescript: string;
}

interface Example {
    title: string;
    key: string;
    code: CodeExample;
}

const ConfigApiExamples = () => {
    const params = useParams();
    const projectId = params.id as string;
    const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl');
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const domain = typeof window !== 'undefined' ? window.location.origin : '';

    const handleCopy = async (code: string, key: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedKey(key);
            message.success('Code copied to clipboard');
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (error) {
            message.error('Failed to copy code');
        }
    };

    useEffect(() => {
        const fetchPublicKey = async () => {
            try {
                const response = await fetch(`/api/projects/${projectId}/api-keys`);
                if (response.ok) {
                    const data = await response.json();
                    const firstPublicKey = data.apiKeys?.find((key: any) => key.type === 'public');
                    if (firstPublicKey) {
                        setPublicKey(`pk_${firstPublicKey.public}`);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch API keys:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicKey();
    }, [projectId]);

    const examples: Example[] = [
        {
            title: 'Get config (secret)',
            key: 'getConfig',
            code: {
                curl: `curl -X GET ${domain}/api/v1/config \\
  -H "Authorization: sk_{public}_{private}"`,
                typescript: `const res = await fetch("${domain}/api/v1/config", {
  headers: {
    Authorization: "sk_{public}_{private}",
  },
});`
            }
        },
        {
            title: `Get public config${!publicKey ? ' (Create a public API key first)' : ''}`,
            key: 'getPublicConfig',
            code: {
                curl: `curl -X GET ${domain}/api/v1/public/config \\
  -H "Authorization: ${publicKey || 'pk_{public}'}"`,
                typescript: `const res = await fetch("${domain}/api/v1/config/public", {
  headers: {
    Authorization: "${publicKey || 'pk_{public}'}",
  },
});`
            }
        }
    ];

    const languageOptions = [
        { label: 'cURL', value: 'curl' as const },
        { label: 'TypeScript', value: 'typescript' as const },
    ];

    const boxStyle = {
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#fafbfc'
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f6f7f9',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8
    };

    const codeStyle = {
        margin: 0,
        padding: '12px 16px',
        overflowX: 'auto' as const,
        fontSize: 12
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" tip="Loading examples..." />
            </div>
        );
    }

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {examples.map((example) => (
                <div key={example.key}>
                    <Title level={4}>{example.title}</Title>
                    <div style={boxStyle}>
                        <div style={headerStyle}>
                            <Select
                                value={selectedLanguage}
                                onChange={setSelectedLanguage}
                                size="small"
                                style={{ width: 120 }}
                                options={languageOptions}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Text type="secondary">Example request</Text>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={copiedKey === example.key ? <CheckOutlined /> : <CopyOutlined />}
                                    onClick={() => handleCopy(example.code[selectedLanguage], example.key)}
                                    style={{ color: copiedKey === example.key ? '#52c41a' : undefined }}
                                />
                            </div>
                        </div>
                        <pre style={codeStyle}>
                            {example.code[selectedLanguage]}
                        </pre>
                    </div>
                </div>
            ))}
        </Space>
    );
};

export default ConfigApiExamples;
