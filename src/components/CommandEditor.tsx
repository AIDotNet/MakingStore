import React, { useState, useEffect } from 'react';
import { SlashCommand, CommandArgument } from '../types/slashCommand';

interface CommandEditorProps {
  command: SlashCommand | null;
  isCreating: boolean;
  categories: string[];
  onSave: (command: Omit<SlashCommand, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const CommandEditor: React.FC<CommandEditorProps> = ({
  command,
  isCreating,
  categories,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'project' as 'project' | 'user',
    category: '',
    filePath: '',
    allowedTools: [] as string[],
    arguments: [] as CommandArgument[],
  });

  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (command && !isCreating) {
      setFormData({
        name: command.name,
        description: command.description,
        content: command.content,
        scope: command.scope,
        category: command.category || '',
        filePath: command.filePath,
        allowedTools: command.allowedTools || [],
        arguments: command.arguments || [],
      });
    } else {
      // 重置为默认值
      setFormData({
        name: '',
        description: '',
        content: '',
        scope: 'project',
        category: '',
        filePath: '',
        allowedTools: [],
        arguments: [],
      });
    }
    setErrors({});
  }, [command, isCreating]);

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '命令名称不能为空';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = '命令名称只能包含字母、数字、下划线和连字符';
    }

    if (!formData.description.trim()) {
      newErrors.description = '命令描述不能为空';
    }

    if (!formData.content.trim()) {
      newErrors.content = '命令内容不能为空';
    }

    if (!formData.filePath.trim()) {
      newErrors.filePath = '文件路径不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const category = showNewCategory && newCategory.trim() 
      ? newCategory.trim() 
      : formData.category;

    onSave({
      ...formData,
      category: category || undefined,
    });
  };

  // 添加参数
  const addArgument = () => {
    setFormData(prev => ({
      ...prev,
      arguments: [
        ...prev.arguments,
        {
          name: '',
          type: 'string',
          required: false,
          description: '',
        }
      ]
    }));
  };

  // 更新参数
  const updateArgument = (index: number, updates: Partial<CommandArgument>) => {
    setFormData(prev => ({
      ...prev,
      arguments: prev.arguments.map((arg, i) => 
        i === index ? { ...arg, ...updates } : arg
      )
    }));
  };

  // 删除参数
  const removeArgument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      arguments: prev.arguments.filter((_, i) => i !== index)
    }));
  };

  // 添加允许的工具
  const addAllowedTool = (tool: string) => {
    if (tool && !formData.allowedTools.includes(tool)) {
      setFormData(prev => ({
        ...prev,
        allowedTools: [...prev.allowedTools, tool]
      }));
    }
  };

  // 移除允许的工具
  const removeAllowedTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      allowedTools: prev.allowedTools.filter(t => t !== tool)
    }));
  };

  const commonTools = [
    'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebFetch', 'WebSearch'
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isCreating ? '创建新命令' : '编辑命令'}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="command-form"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        <form id="command-form" onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                命令名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例如: create-component"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                作用域 *
              </label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as 'project' | 'user' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="project">项目级</option>
                <option value="user">用户级</option>
              </select>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述 *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="简短描述这个命令的功能"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类
            </label>
            <div className="flex items-center space-x-2">
              {!showNewCategory ? (
                <>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">选择分类</option>
                    {categories?.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    新建
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="输入新分类名称"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategory('');
                    }}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    取消
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 文件路径 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              文件路径 *
            </label>
            <input
              type="text"
              value={formData.filePath}
              onChange={(e) => setFormData(prev => ({ ...prev, filePath: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                errors.filePath ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="例如: ~/.config/claude/commands/create-component.md"
            />
            {errors.filePath && (
              <p className="mt-1 text-sm text-red-600">{errors.filePath}</p>
            )}
          </div>

          {/* 允许的工具 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              允许的工具
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.allowedTools.map(tool => (
                  <span
                    key={tool}
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeAllowedTool(tool)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {commonTools.filter(tool => !formData.allowedTools.includes(tool)).map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => addAllowedTool(tool)}
                    className="px-2 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    + {tool}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 参数定义 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                参数定义
              </label>
              <button
                type="button"
                onClick={addArgument}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                + 添加参数
              </button>
            </div>
            <div className="space-y-3">
              {formData.arguments.map((arg, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={arg.name}
                      onChange={(e) => updateArgument(index, { name: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder="参数名"
                    />
                    <select
                      value={arg.type}
                      onChange={(e) => updateArgument(index, { type: e.target.value as any })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="string">字符串</option>
                      <option value="number">数字</option>
                      <option value="boolean">布尔值</option>
                    </select>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={arg.required}
                        onChange={(e) => updateArgument(index, { required: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">必需</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeArgument(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                  <input
                    type="text"
                    value={arg.description || ''}
                    onChange={(e) => updateArgument(index, { description: e.target.value })}
                    className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="参数描述"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 命令内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              命令内容 * (Markdown格式)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`---
description: 命令描述
allowedTools: [Bash, Read, Edit]
---

# 命令标题

命令的详细说明和使用方法。

## 参数
- $1: 第一个参数
- $2: 第二个参数

## 示例
\`\`\`bash
echo "Hello $1"
\`\`\``}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};