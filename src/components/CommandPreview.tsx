import React from 'react';
import { SlashCommand } from '../types/slashCommand';

interface CommandPreviewProps {
  command: SlashCommand;
  onEdit: () => void;
  onDelete: () => void;
}

export const CommandPreview: React.FC<CommandPreviewProps> = ({
  command,
  onEdit,
  onDelete,
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getScopeLabel = (scope: 'project' | 'user') => {
    return scope === 'project' ? '项目级' : '用户级';
  };

  const getScopeIcon = (scope: 'project' | 'user') => {
    return scope === 'project' ? '🏗️' : '👤';
  };

  // 解析Markdown内容中的frontmatter
  const parseFrontmatter = (content: string) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      return {
        frontmatter: match[1],
        content: match[2],
      };
    }
    
    return {
      frontmatter: '',
      content: content,
    };
  };

  const { frontmatter, content } = parseFrontmatter(command.content);

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            /{command.name}
          </h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {getScopeIcon(command.scope)} {getScopeLabel(command.scope)}
          </span>
          {command.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              {command.category}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 基本信息 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  描述
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {command.description}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  文件路径
                </label>
                <p className="mt-1 text-gray-900 dark:text-white font-mono text-sm">
                  {command.filePath}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  创建时间
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {formatDate(command.createdAt)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  更新时间
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {formatDate(command.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* 允许的工具 */}
          {command.allowedTools && command.allowedTools.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                允许的工具
              </h3>
              <div className="flex flex-wrap gap-2">
                {command.allowedTools.map(tool => (
                  <span
                    key={tool}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 参数定义 */}
          {command.arguments && command.arguments.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                参数定义
              </h3>
              <div className="space-y-3">
                {command.arguments.map((arg, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        ${index + 1} ({arg.name})
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {arg.type}
                      </span>
                      {arg.required && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          必需
                        </span>
                      )}
                    </div>
                    {arg.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {arg.description}
                      </p>
                    )}
                    {arg.defaultValue && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        默认值: {arg.defaultValue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frontmatter */}
          {frontmatter && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Frontmatter
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-sm font-mono overflow-x-auto">
                <code className="text-gray-800 dark:text-gray-200">
                  {frontmatter}
                </code>
              </pre>
            </div>
          )}

          {/* 命令内容 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              命令内容
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                {content || command.content}
              </pre>
            </div>
          </div>

          {/* 使用示例 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              使用示例
            </h3>
            <div className="space-y-2">
              <div className="font-mono text-sm bg-white dark:bg-gray-900 rounded px-3 py-2 border border-blue-200 dark:border-blue-800">
                /{command.name}
                {command.arguments && command.arguments.length > 0 && (
                  <span className="text-gray-500">
                    {' '}
                    {command.arguments.map((arg, index) => (
                      <span key={index}>
                        {arg.required ? `<${arg.name}>` : `[${arg.name}]`}
                        {index < command.arguments!.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              {command.arguments && command.arguments.some(arg => !arg.required) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  注: &lt;&gt; 表示必需参数，[] 表示可选参数
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};