import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, Plus, Trash2, RefreshCw,  Home, Terminal, Globe, CheckCircle, Edit, ChevronDown, Store } from 'lucide-react';
import { tauriFileSystemManager } from '../../lib/tauriFileSystem';
import { CustomPrompt } from '../../types/customPrompt';
import { open } from '@tauri-apps/plugin-dialog';
import { AddPromptDialog } from '@/components/AddPromptDialog';
import { PromptStoreDialog } from '@/components/PromptStoreDialog';

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

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
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('');
  
  // 启动方式配置
  const [launchMode, setLaunchMode] = useState<string>('normal');
  
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // 创建项目弹窗状态
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState<boolean>(false);
  
  // 自定义提示词状态
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPromptStoreDialog, setShowPromptStoreDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [deletePromptDialogOpen, setDeletePromptDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<CustomPrompt | null>(null);

  useEffect(() => {
    checkCodexInstallation();
    initializeTauriFileSystem();
    loadLaunchModeConfig();
  }, []);

  // 保存启动方式配置到 localStorage
  useEffect(() => {
    localStorage.setItem('codex-launch-mode', launchMode);
  }, [launchMode]);

  const loadLaunchModeConfig = () => {
    const savedLaunchMode = localStorage.getItem('codex-launch-mode');
    if (savedLaunchMode && (savedLaunchMode === 'normal' || savedLaunchMode === 'bypass')) {
      setLaunchMode(savedLaunchMode);
    }
  };

  const initializeTauriFileSystem = async () => {
    try {
      await tauriFileSystemManager.init();
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
      const config = await tauriFileSystemManager.readClaudeConfig();
      if (config) {
        setProjects(config.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const loadedPrompts = await tauriFileSystemManager.loadCodexPrompts();
      setPrompts(loadedPrompts);
    } catch (error) {
      console.error('加载提示词失败:', error);
      setError(`加载提示词失败: ${error}`);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择项目目录'
      });
      
      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      setError('选择目录失败');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !selectedPath) {
      setError('请输入项目名称并选择工作目录');
      return;
    }

    try {
      const config = await tauriFileSystemManager.readClaudeConfig();
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: newProjectName.trim(),
        path: selectedPath,
        createdAt: new Date().toISOString()
      };

      const updatedConfig = {
        ...config,
        projects: [...(config?.projects || []), newProject]
      };

      await tauriFileSystemManager.writeClaudeConfig({
        ...updatedConfig,
        settings: updatedConfig.settings ?? {},
        version: updatedConfig.version ?? '1.0.0'
      });
      await loadProjects();
      
      // 重置表单并关闭弹窗
      setNewProjectName('');
      setSelectedPath('');
      setCreateProjectDialogOpen(false);
      setError('');
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('创建项目失败');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const config = await tauriFileSystemManager.readClaudeConfig();
      if (config) {
        const updatedConfig = {
          ...config,
          projects: (config.projects || []).filter(p => p.id !== projectToDelete.id)
        };
        await tauriFileSystemManager.writeClaudeConfig(updatedConfig);
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError('删除项目失败');
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleOpenInTerminal = async (project: Project) => {
    try {
      // 使用新的 Tauri 命令在终端中打开项目，传递启动方式
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_project_in_terminal', { 
        path: project.path, 
        launch_mode: launchMode 
      });
    } catch (error) {
      console.error('Failed to open project in terminal:', error);
      setError('在终端中打开项目失败');
    }
  };

  // 提示词管理函数
  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setShowPromptDialog(true);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleSavePrompt = async (promptData: {
    name: string;
    description: string;
    content: string;
    category: string;
    scope: 'user' | 'project';
  }) => {
    try {
      const promptPayload: Partial<CustomPrompt> = {
        name: promptData.name.trim(),
        description: promptData.description.trim(),
        content: promptData.content.trim(),
        category: promptData.category.trim() || undefined,
        scope: promptData.scope,
        updatedAt: new Date()
      };

      if (editingPrompt) {
        // 更新现有提示词
        await tauriFileSystemManager.saveCodexPrompt({
          ...editingPrompt,
          ...promptPayload
        });
      } else {
        // 创建新提示词
        const newPrompt: CustomPrompt = {
          id: `prompt-${Date.now()}`,
          filePath: `${promptData.name}.md`,
          allowedTools: [],
          arguments: [],
          createdAt: new Date().toISOString(),
          ...promptPayload
        } as CustomPrompt;
        
        await tauriFileSystemManager.saveCodexPrompt(newPrompt);
      }

      // 重新加载提示词列表
      await loadPrompts();
      
      // 重置状态
      setEditingPrompt(null);
      setError('');
    } catch (error) {
      console.error('保存提示词失败:', error);
      setError(`保存提示词失败: ${error}`);
      throw error; // 重新抛出错误，让弹窗组件处理
    }
  };

  // 从商店安装提示词
  const handleInstallFromStore = async (onlinePrompt: any, content: string) => {
    try {
      const newPrompt: CustomPrompt = {
        id: `prompt-${Date.now()}`,
        name: onlinePrompt.name,
        description: onlinePrompt.description,
        content: content,
        category: onlinePrompt.category,
        scope: 'user' as const,
        filePath: `${onlinePrompt.name}.md`,
        allowedTools: [],
        arguments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await tauriFileSystemManager.saveCodexPrompt(newPrompt);
      
      // 重新加载提示词列表
      await loadPrompts();
      
      setError('');
    } catch (error) {
      console.error('安装提示词失败:', error);
      setError(`安装提示词失败: ${error}`);
      throw error;
    }
  };

  // 打开商店对话框
  const handleOpenPromptStore = () => {
    setShowPromptStoreDialog(true);
  };

   const handleDeletePrompt = (prompt: CustomPrompt) => {
     setPromptToDelete(prompt);
     setDeletePromptDialogOpen(true);
   };

   const confirmDeletePrompt = async () => {
     if (!promptToDelete) return;

     try {
       await tauriFileSystemManager.deleteCodexPrompt(promptToDelete);
       await loadPrompts();
       setDeletePromptDialogOpen(false);
       setPromptToDelete(null);
     } catch (error) {
       console.error('删除提示词失败:', error);
       setError(`删除提示词失败: ${error}`);
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
                <Globe className="h-3 w-3" />
                渠道管理
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="home" className="p-6 space-y-6">
            {/* 快速状态卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">当前版本</p>
                      <p className="text-lg font-bold">{version}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      已安装
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">项目数量</p>
                      <p className="text-lg font-bold">{projects.length}</p>
                    </div>
                    <Folder className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">自定义命令</p>
                      <p className="text-lg font-bold">{prompts.length}</p>
                    </div>
                    <Terminal className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 快速操作 */}
            <div>
              <h3 className="text-base font-semibold mb-4">快速操作</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setActiveTab('projects')}
                >
                  <Folder className="h-6 w-6" />
                  <span className="text-sm">管理项目</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setActiveTab('prompts')}
                >
                  <Terminal className="h-6 w-6" />
                  <span className="text-sm">自定义提示词</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setActiveTab('channels')}
                >
                  <Globe className="h-6 w-6" />
                  <span className="text-sm">渠道管理</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={handleUpdate}
                  disabled={updating}
                >
                  <RefreshCw className="h-6 w-6" />
                  <span className="text-sm">检查更新</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="p-6 space-y-6">
            {/* 创建新项目按钮 */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">项目管理</h3>
              <Button
                onClick={() => setCreateProjectDialogOpen(true)}
                className="h-9"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建项目
              </Button>
            </div>

            {/* 现有项目 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">现有项目</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="launch-mode" className="text-sm font-medium">启动方式:</Label>
                  <Select value={launchMode} onValueChange={setLaunchMode}>
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">
                        <div className="flex flex-col">
                          <span>普通模式</span>
                          <span className="text-xs text-muted-foreground">codex</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bypass">
                        <div className="flex flex-col">
                          <span>绕过审批模式</span>
                          <span className="text-xs text-muted-foreground">codex --dangerously-bypass-approvals-and-sandbox</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {projects.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">暂无项目，创建第一个项目开始使用</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <h4 className="font-semibold text-base truncate">{project.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1 truncate" title={project.path}>
                              {project.path}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              创建于: {new Date(project.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenInTerminal(project)}
                              className="h-8 px-3"
                              title="在终端中打开项目"
                            >
                              <Terminal className="h-3 w-3 mr-1" />
                              终端
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="删除项目"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold">自定义提示词管理</h3>
                <p className="text-sm text-muted-foreground mt-1">管理您的自定义 Codex 提示词</p>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      添加提示词
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCreatePrompt}>
                      <Plus className="h-4 w-4 mr-2" />
                      自定义提示词
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenPromptStore}>
                      <Store className="h-4 w-4 mr-2" />
                      从商店安装
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={loadPrompts}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
            </div>

            {/* 添加提示词弹窗 */}
            <AddPromptDialog
              open={showPromptDialog}
              onOpenChange={setShowPromptDialog}
              onSave={handleSavePrompt}
              editingPrompt={editingPrompt}
              error={error}
            />

            {/* 提示词商店弹窗 */}
            <PromptStoreDialog
              open={showPromptStoreDialog}
              onOpenChange={setShowPromptStoreDialog}
              onInstall={handleInstallFromStore}
            />

            {isLoadingPrompts ? (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Spinner className="h-6 w-6 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">加载提示词中...</p>
                  </div>
                </CardContent>
              </Card>
            ) : prompts.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">暂无自定义提示词</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      提示词文件应放置在 ~/.codex/prompts/ 目录下
                    </p>
                    <Button onClick={handleCreatePrompt} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      创建第一个提示词
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">/{prompt.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {prompt.scope === 'user' ? '用户级' : '项目级'}
                            </Badge>
                          </div>
                          {prompt.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {prompt.description}
                            </p>
                          )}
                          {prompt.category && (
                            <Badge variant="secondary" className="text-xs">
                              {prompt.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPrompt(prompt)}
                            className="h-7 w-7 p-0"
                            title="编辑提示词"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrompt(prompt)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="删除提示词"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {prompt.updatedAt && (
                        <p className="text-xs text-muted-foreground">
                          更新于: {new Date(prompt.updatedAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="channels" className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold">渠道管理</h3>
              <p className="text-sm text-muted-foreground mt-1">管理您的 AI 服务渠道配置</p>
            </div>

            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">渠道管理功能正在开发中...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除项目 "{projectToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 创建项目弹窗 */}
      <AlertDialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>创建新项目</AlertDialogTitle>
            <AlertDialogDescription>
              请输入项目信息并选择工作目录
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-project-name" className="text-sm">项目名称</Label>
              <Input
                id="dialog-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="输入项目名称"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-project-path" className="text-sm">工作目录</Label>
              <div className="flex">
                <Input
                  id="dialog-project-path"
                  value={selectedPath}
                  readOnly
                  placeholder="选择工作目录"
                  className="rounded-r-none h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectDirectory}
                  className="rounded-l-none border-l-0 h-9 px-3"
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCreateProjectDialogOpen(false);
              setNewProjectName('');
              setSelectedPath('');
              setError('');
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || !selectedPath}
            >
              创建项目
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除提示词确认对话框 */}
      <AlertDialog open={deletePromptDialogOpen} onOpenChange={setDeletePromptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除提示词</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除提示词 "/{promptToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletePromptDialogOpen(false);
              setPromptToDelete(null);
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePrompt}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CodexManagement;