import React from 'react';
import { SlashCommand } from '../types/slashCommand';

interface CommandListProps {
  commands: SlashCommand[];
  selectedCommand: SlashCommand | null;
  onCommandSelect: (command: SlashCommand) => void;
  onEditCommand: (command: SlashCommand) => void;
  onDeleteCommand: (command: SlashCommand) => void;
}

export const CommandList: React.FC<CommandListProps> = ({
  commands,
  selectedCommand,
  onCommandSelect,
  onEditCommand,
  onDeleteCommand,
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScopeIcon = (scope: 'project' | 'user') => {
    return scope === 'project' ? '🏗️' : '👤';
  };

  const getScopeLabel = (scope: 'project' | 'user') => {
    return scope === 'project' ? '项目' : '用户';
  };

  if (commands.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-lg mb-2">没有找到命令</div>
        <div className="text-sm">尝试调整搜索条件或创建新命令</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {commands.map((command) => (
        <div
          key={command.id}
          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedCommand?.id === command.id
              ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
              : ''
          }`}
          onClick={() => onCommandSelect(command)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 命令名称和作用域 */}
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  /{command.name}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  title={getScopeLabel(command.scope)}
                >
                  {getScopeIcon(command.scope)}
                </span>
                {command.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {command.category}
                  </span>
                )}
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                {command.description}
              </p>

              {/* 参数信息 */}
              {command.arguments && command.arguments.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {command.arguments.map((arg, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                        arg.required
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {arg.name}
                      {arg.required && '*'}
                    </span>
                  ))}
                </div>
              )}

              {/* 更新时间 */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                更新于 {formatDate(command.updatedAt)}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCommand(command);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="编辑命令"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCommand(command);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="删除命令"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};