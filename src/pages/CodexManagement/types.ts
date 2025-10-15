export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  launchMode?: string; // 启动方式：'normal' | 'bypass'
  environmentVariables?: string; // 环境变量，每行一个，格式：KEY=VALUE
}