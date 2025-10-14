// 自定义提示词类型定义
export interface CustomPrompt {
  id: string;
  name: string; // 提示词名称（不含斜杠）
  description: string;
  content: string; // Markdown内容
  scope: 'project' | 'user'; // 作用域：项目级或用户级
  category?: string; // 分类/命名空间
  filePath: string; // 文件路径
  allowedTools?: string[]; // 允许的工具
  arguments?: PromptArgument[]; // 参数定义
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptArgument {
  name: string; // 参数名称
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface CustomPromptTemplate {
  name: string;
  description: string;
  content: string;
  category: string;
  allowedTools?: string[];
  arguments?: PromptArgument[];
}

// 提示词分类
export interface PromptCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  prompts: CustomPrompt[];
}

// 导入导出格式
export interface PromptExport {
  version: string;
  exportDate: Date;
  prompts: CustomPrompt[];
}

// 搜索和过滤选项
export interface PromptSearchOptions {
  query?: string;
  scope?: 'project' | 'user' | 'all';
  category?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// 执行结果
export interface PromptExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}