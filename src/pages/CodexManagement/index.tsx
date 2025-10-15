import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Folder, RefreshCw, Home, Terminal, Settings } from 'lucide-react';
import { tauriFileSystemManager } from '../../lib/tauriFileSystem';
import { projectsDB } from '../../lib/projectsDB';
import { CustomPrompt } from '../../types/customPrompt';
import { Project } from './types';
import HomeTab from './components/HomeTab';
import ProjectsTab from './components/ProjectsTab';
import PromptsTab from './components/PromptsTab';
import CodexConfigTab from './components/CodexConfigTab';

const CodexManagement: React.FC = () => {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [installing, setInstalling] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  
  // 项目管理状态
  const [projects, setProjects] = useState<Project[]>([]);
  
  // 自定义提示词状态
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);

  useEffect(() => {
    checkCodexInstallation();
    initializeTauriFileSystem();
  }, []);

  const initializeTauriFileSystem = async () => {
    try {
      await tauriFileSystemManager.init();
      await projectsDB.init();
    } catch (error) {
      console.error('Failed to initialize Tauri file system:', error);
    }
  };

  const checkCodexInstallation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const installed = await tauriFileSystemManager.checkCodexInstallation();
      setIsInstalled(installed);
      
      if (installed) {
        const versionInfo = await tauriFileSystemManager.getCodexVersion();
        setVersion(versionInfo || '未知版本');
        
        // 加载项目和提示词
        await loadProjects();
        await loadPrompts();
      }
    } catch (err) {
      setError(`检查安装状态失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError('');
    
    try {
      const result = await tauriFileSystemManager.installCodex();
      if (result.success) {
        await checkCodexInstallation();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`安装失败: ${(err as Error).message}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setError('');
    
    try {
      const result = await tauriFileSystemManager.updateCodex();
      if (result.success) {
        await checkCodexInstallation();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(`更新失败: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  };

  const loadProjects = async () => {
    try {
      const loadedProjects = await projectsDB.getAllProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('加载项目失败');
    }
  };

  const loadPrompts = async () => {
    try {
      const loadedPrompts = await tauriFileSystemManager.loadCodexPrompts();
      setPrompts(loadedPrompts);
    } catch (error) {
      console.error('加载提示词失败:', error);
      setError(`加载提示词失败: ${error}`);
    }
  };



  const handleCreateProject = async (name: string, path: string, launchMode?: string, environmentVariables?: string): Promise<void> => {
    if (!name.trim() || !path) {
      setError('请输入项目名称并选择工作目录');
      return;
    }

    try {
      const newProject: Project = {
        id: Date.now().toString(),
        name: name.trim(),
        path,
        createdAt: new Date().toISOString(),
        launchMode: launchMode || 'normal',
        environmentVariables: environmentVariables || undefined,
      };

      await projectsDB.saveProject(newProject);
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);

      setError('');
    } catch (error) {
      console.error('创建项目失败:', error);
      setError('创建项目失败，请重试');
    }
  };

  const handleUpdateProject = async (updatedProject: Project): Promise<void> => {
    try {
      await projectsDB.saveProject(updatedProject);
      const updatedProjects = projects.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);

      setError('');
    } catch (error) {
      console.error('更新项目失败:', error);
      setError('更新项目失败，请重试');
    }
  };

  const handleDeleteProject = async (project: Project): Promise<void> => {
    try {
      await projectsDB.deleteProject(project.id);
      const updatedProjects = projects.filter(p => p.id !== project.id);
      setProjects(updatedProjects);
    } catch (error) {
      console.error('删除项目失败:', error);
      setError('删除项目失败，请重试');
    }
  };

  const handleOpenInTerminal = async (project: Project): Promise<void> => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // 添加前端调试日志
      console.log('=== handleOpenInTerminal called ===');
      console.log('Project:', project);
      console.log('Environment Variables:', project.environmentVariables);
      console.log('Launch Mode:', project.launchMode);
      
      // 处理环境变量：如果为空字符串或undefined，则传递undefined
      const envVars = project.environmentVariables && project.environmentVariables.trim() 
        ? project.environmentVariables 
        : undefined;
      
      console.log('Processed Environment Variables:', envVars);
      
      debugger
      await invoke('open_project_in_terminal', { 
        path: project.path, 
        launchMode: project.launchMode,
        environmentVariables: envVars
      });
    } catch (error) {
      console.error('打开终端失败:', error);
      setError('打开终端失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-3">
          <Spinner className="h-6 w-6 mx-auto" />
          <p className="text-sm text-muted-foreground">检查 Codex 安装状态...</p>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="text-4xl mb-2">🔧</div>
            <CardTitle className="text-xl">Codex 未安装</CardTitle>
            <CardDescription className="text-sm">
              Codex 是一个强大的代码生成和管理工具。点击下面的按钮开始安装。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="w-full"
            >
              {installing ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  安装中...
                </>
              ) : (
                '安装 Codex'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <div className="border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">Codex 管理</h1>
            <Badge variant="secondary" className="text-xs">
              {version}
            </Badge>
          </div>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            variant="outline"
            size="sm"
            className="h-8"
          >
            {updating ? (
              <>
                <Spinner className="h-3 w-3 mr-2" />
                更新中...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                更新
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* 标签页导航和内容 */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger value="home" className="flex items-center gap-2 px-3 py-2">
                <Home className="h-3 w-3" />
                首页
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2 px-3 py-2">
                <Folder className="h-3 w-3" />
                项目管理
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2 px-3 py-2">
                <Terminal className="h-3 w-3" />
                自定义提示词管理
              </TabsTrigger>
              <TabsTrigger value="channels" className="flex items-center gap-2 px-3 py-2">
                <Settings className="h-3 w-3" />
                Codex配置管理
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="home" className="p-6 space-y-6">
            <HomeTab/>
          </TabsContent>

          <TabsContent value="projects" className="p-6 space-y-6">
            <ProjectsTab
              projects={projects}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onOpenInTerminal={handleOpenInTerminal}
              onUpdateProject={handleUpdateProject}
              error={error}
              setError={setError}
            />
          </TabsContent>

          <TabsContent value="prompts" className="p-6">
            <PromptsTab
              prompts={prompts}
              onPromptsChange={setPrompts}
            />
          </TabsContent>

          <TabsContent value="channels" className="p-6">
            <CodexConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CodexManagement;