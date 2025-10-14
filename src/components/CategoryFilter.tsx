import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory?: string;
  onCategoryChange: (category?: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        分类过滤
      </label>
      <div className="flex flex-wrap gap-2">
        {/* 全部分类按钮 */}
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            !selectedCategory
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          全部
        </button>

        {/* 分类按钮 */}
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}

        {/* 无分类按钮 */}
        {categories.length > 0 && (
          <button
            onClick={() => onCategoryChange('')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            无分类
          </button>
        )}
      </div>

      {/* 分类统计 */}
      {categories.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          共 {categories.length} 个分类
        </div>
      )}
    </div>
  );
};