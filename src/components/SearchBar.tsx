import React from 'react';
import { CommandSearchOptions } from '../types/slashCommand';

interface SearchBarProps {
  searchOptions: CommandSearchOptions;
  onSearchChange: (options: CommandSearchOptions) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchOptions,
  onSearchChange,
}) => {
  const handleQueryChange = (query: string) => {
    onSearchChange({
      ...searchOptions,
      query: query || undefined,
    });
  };

  const handleScopeChange = (scope: 'project' | 'user' | 'all') => {
    onSearchChange({
      ...searchOptions,
      scope,
    });
  };

  const handleSortChange = (sortBy: 'name' | 'createdAt' | 'updatedAt', sortOrder: 'asc' | 'desc') => {
    onSearchChange({
      ...searchOptions,
      sortBy,
      sortOrder,
    });
  };

  return (
    <div className="space-y-3">
      {/* 搜索输入框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchOptions.query || ''}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          placeholder="搜索命令名称、描述或内容..."
        />
      </div>

      {/* 过滤选项 */}
      <div className="flex items-center space-x-2">
        {/* 作用域过滤 */}
        <select
          value={searchOptions.scope || 'all'}
          onChange={(e) => handleScopeChange(e.target.value as 'project' | 'user' | 'all')}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="all">全部</option>
          <option value="project">🏗️ 项目级</option>
          <option value="user">👤 用户级</option>
        </select>

        {/* 排序选项 */}
        <select
          value={`${searchOptions.sortBy || 'updatedAt'}-${searchOptions.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'createdAt' | 'updatedAt', 'asc' | 'desc'];
            handleSortChange(sortBy, sortOrder);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="updatedAt-desc">最近更新</option>
          <option value="updatedAt-asc">最早更新</option>
          <option value="createdAt-desc">最近创建</option>
          <option value="createdAt-asc">最早创建</option>
          <option value="name-asc">名称 A-Z</option>
          <option value="name-desc">名称 Z-A</option>
        </select>
      </div>

      {/* 搜索结果统计 */}
      {searchOptions.query && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          搜索 "{searchOptions.query}"
        </div>
      )}
    </div>
  );
};