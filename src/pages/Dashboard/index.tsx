import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { projectsDB } from '@/lib/projectsDB';
import { customPromptDB } from '@/lib/customPromptDB';
import { Project } from '@/pages/CodexManagement/types';
import { CustomPrompt } from '@/types/customPrompt';
import {
  FolderIcon,
  FileTextIcon,
  ClockIcon,
  ArrowRightIcon,
  ActivityIcon,
  PackageIcon,
  CommandIcon,
  TrendingUpIcon
} from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  totalPrompts: number;
  recentProjects: Project[];
  recentPrompts: CustomPrompt[];
  promptsByCategory: Record<string, number>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalPrompts: 0,
    recentProjects: [],
    recentPrompts: [],
    promptsByCategory: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 初始化数据库
      await Promise.all([
        projectsDB.init(),
        customPromptDB.init()
      ]);

      // 获取所有项目和提示词
      const [projects, prompts] = await Promise.all([
        projectsDB.getAllProjects(),
        customPromptDB.getAllPrompts()
      ]);

      // 计算分类统计
      const promptsByCategory = prompts.reduce((acc, prompt) => {
        const category = prompt.category || '未分类';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 获取最近的项目（按创建时间排序）
      const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 获取最近的提示词（按更新时间排序）
      const sortedPrompts = [...prompts].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setStats({
        totalProjects: projects.length,
        totalPrompts: prompts.length,
        recentProjects: sortedProjects.slice(0, 5),
        recentPrompts: sortedPrompts.slice(0, 5),
        promptsByCategory
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 周前`;
    return d.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground mt-2">欢迎来到 MakingStore 管理系统</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              管理您的 Codex 项目
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">提示词总数</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrompts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              自定义提示词库
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">提示词分类</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.promptsByCategory).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              不同的分类类别
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">运行中</div>
            <p className="text-xs text-muted-foreground mt-1">
              所有服务正常
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CommandIcon className="h-5 w-5" />
            快速操作
          </CardTitle>
          <CardDescription>常用功能快捷入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigateTo('/codex')}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              管理项目
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigateTo('/codex')}
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              添加提示词
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigateTo('/mcp-management')}
            >
              <TrendingUpIcon className="h-4 w-4 mr-2" />
              MCP 服务
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigateTo('/settings')}
            >
              <ActivityIcon className="h-4 w-4 mr-2" />
              系统设置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 最近活动 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 最近项目 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              最近项目
            </CardTitle>
            <CardDescription>最近创建或更新的项目</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无项目</p>
                <Button
                  variant="link"
                  onClick={() => navigateTo('/codex')}
                  className="mt-2"
                >
                  创建第一个项目
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentProjects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => navigateTo('/codex')}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{project.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.createdAt)}
                      </span>
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近提示词 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              最近提示词
            </CardTitle>
            <CardDescription>最近创建或更新的提示词</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentPrompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无提示词</p>
                <Button
                  variant="link"
                  onClick={() => navigateTo('/codex')}
                  className="mt-2"
                >
                  创建第一个提示词
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => navigateTo('/codex')}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{prompt.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {prompt.category || '未分类'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(prompt.updatedAt)}
                      </span>
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 分类统计 */}
      {Object.keys(stats.promptsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>提示词分类统计</CardTitle>
            <CardDescription>按分类查看提示词分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {Object.entries(stats.promptsByCategory).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigateTo('/codex')}
                >
                  <span className="font-medium">{category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
