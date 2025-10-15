import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { Folder, Plus, Trash2, ChevronDown, Terminal, Edit, FileText, RefreshCw, Save } from 'lucide-react';
import { Project } from '../types';
import { open } from '@tauri-apps/plugin-dialog';
import { useTheme } from 'next-themes';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { tauriFileSystemManager } from '../../../lib/tauriFileSystem';

interface ProjectsTabProps {
  projects: Project[];
  onCreateProject: (name: string, path: string, launchMode?: string, environmentVariables?: string) => Promise<void>;
  onDeleteProject: (project: Project) => Promise<void>;
  onOpenInTerminal: (project: Project) => Promise<void>;
  onUpdateProject?: (project: Project) => Promise<void>;
  error: string;
  setError: (error: string) => void;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  onCreateProject,
  onDeleteProject,
  onOpenInTerminal,
  onUpdateProject,
  error,
  setError
}) => {
  const { resolvedTheme } = useTheme();
  const mdEditorRef = useRef<any>(null);
  
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [newProjectLaunchMode, setNewProjectLaunchMode] = useState<string>('normal');
  const [newProjectEnvironmentVariables, setNewProjectEnvironmentVariables] = useState<string>('');
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // 编辑项目状态
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectLaunchMode, setEditProjectLaunchMode] = useState<string>('normal');
  const [editProjectEnvironmentVariables, setEditProjectEnvironmentVariables] = useState<string>('');
  
  // AGENT.md 编辑状态
  const [agentEditorOpen, setAgentEditorOpen] = useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [agentContent, setAgentContent] = useState<string>('');
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      await onCreateProject(newProjectName.trim(), selectedPath, newProjectLaunchMode, newProjectEnvironmentVariables);
      
      // 重置表单并关闭弹窗
      setNewProjectName('');
      setSelectedPath('');
      setNewProjectLaunchMode('normal');
      setNewProjectEnvironmentVariables('');
      setCreateProjectDialogOpen(false);
      setError('');
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('创建项目失败');
    }
  };

  // 编辑项目功能
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectLaunchMode(project.launchMode || 'normal');
    setEditProjectEnvironmentVariables(project.environmentVariables || '');
    setEditProjectDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !onUpdateProject) return;

    try {
      const updatedProject = {
        ...editingProject,
        launchMode: editProjectLaunchMode,
        environmentVariables: editProjectEnvironmentVariables
      };
      await onUpdateProject(updatedProject);
      setEditProjectDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
      setError('更新项目失败');
    }
  };

  // AGENT.md 编辑功能
  const handleEditAgentFile = async (project: Project) => {
    setCurrentProject(project);
    setIsLoadingAgent(true);
    setAgentEditorOpen(true);

    try {
      const agentPath = `${project.path}/AGENT.md`;
      const content = await tauriFileSystemManager.readFile(agentPath);
      setAgentContent(content);
    } catch (error) {
      // 如果文件不存在，创建默认内容
      console.log('AGENT.md file not found, creating default content');
      setAgentContent(`# ${project.name} Agent Configuration

## Project Description
请在此处描述您的项目...

## Agent Instructions
请在此处添加 Agent 的具体指令...

## Development Guidelines
- 请遵循项目的编码规范
- 确保代码质量和可维护性
- 及时更新文档

## Notes
请在此处添加其他重要说明...
`);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  const handleSaveAgentFile = async () => {
    if (!currentProject) return;

    try {
      setIsSavingAgent(true);
      const agentPath = `${currentProject.path}/AGENT.md`;
      await tauriFileSystemManager.writeFile(agentPath, agentContent);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save agent file:', error);
      setError('保存 AGENT.md 文件失败');
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleLoadAgentFile = async () => {
    if (!currentProject) return;

    try {
      setIsLoadingAgent(true);
      const agentPath = `${currentProject.path}/AGENT.md`;
      const content = await tauriFileSystemManager.readFile(agentPath);
      setAgentContent(content);
    } catch (error) {
      console.error('Failed to load agent file:', error);
      setError('加载 AGENT.md 文件失败');
    } finally {
      setIsLoadingAgent(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await onDeleteProject(projectToDelete);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError('删除项目失败');
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
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
                        <h4 className="font-medium text-sm truncate">{project.name}</h4>
                        {project.launchMode && (
                          <Badge variant="secondary" className="text-xs">
                            {project.launchMode === 'bypass' ? '绕过' : '普通'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 break-all">{project.path}</p>
                      <Badge variant="outline" className="text-xs">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpenInTerminal(project)}>
                          <Terminal className="h-4 w-4 mr-2" />
                          在终端中打开
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑项目
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditAgentFile(project)}>
                          <FileText className="h-4 w-4 mr-2" />
                          编辑 AGENT.md
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProject(project)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 创建项目对话框 */}
      <AlertDialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>创建新项目</AlertDialogTitle>
            <AlertDialogDescription>
              为您的项目选择一个名称、工作目录和启动方式
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">项目名称</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="输入项目名称"
              />
            </div>
            <div>
              <Label htmlFor="project-path">工作目录</Label>
              <div className="flex gap-2">
                <Input
                  id="project-path"
                  value={selectedPath}
                  readOnly
                  placeholder="选择工作目录"
                />
                <Button onClick={handleSelectDirectory} variant="outline">
                  选择
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-project-launch-mode">启动方式</Label>
              <Select value={newProjectLaunchMode} onValueChange={setNewProjectLaunchMode}>
                <SelectTrigger>
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
            <div>
              <Label htmlFor="new-project-env-vars">环境变量（可选）</Label>
              <Textarea
                id="new-project-env-vars"
                value={newProjectEnvironmentVariables}
                onChange={(e) => setNewProjectEnvironmentVariables(e.target.value)}
                placeholder="每行一个环境变量，格式：KEY=VALUE&#10;例如：&#10;NODE_ENV=development&#10;PORT=3000"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                每行输入一个环境变量，格式为 KEY=VALUE
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateProject}>
              创建
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑项目对话框 */}
      <AlertDialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>编辑项目</AlertDialogTitle>
            <AlertDialogDescription>
              修改项目 "{editingProject?.name}" 的设置
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project-launch-mode">启动方式</Label>
              <Select value={editProjectLaunchMode} onValueChange={setEditProjectLaunchMode}>
                <SelectTrigger>
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
            <div>
              <Label htmlFor="edit-project-env-vars">环境变量（可选）</Label>
              <Textarea
                id="edit-project-env-vars"
                value={editProjectEnvironmentVariables}
                onChange={(e) => setEditProjectEnvironmentVariables(e.target.value)}
                placeholder="每行一个环境变量，格式：KEY=VALUE&#10;例如：&#10;NODE_ENV=development&#10;PORT=3000"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                每行输入一个环境变量，格式为 KEY=VALUE
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateProject}>
              保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AGENT.md 编辑器对话框 */}
      <AlertDialog open={agentEditorOpen} onOpenChange={setAgentEditorOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              编辑 AGENT.md - {currentProject?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              编辑项目的 Agent 配置文件
           </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {lastSaved && (
                  <Badge variant="outline" className="text-xs">
                    最后保存: {lastSaved.toLocaleTimeString()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleLoadAgentFile}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingAgent}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAgent ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
                <Button
                  onClick={handleSaveAgentFile}
                  size="sm"
                  disabled={isSavingAgent || isLoadingAgent}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingAgent ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden h-96" ref={mdEditorRef}>
              {isLoadingAgent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>加载中...</span>
                  </div>
                </div>
              ) : (
                <MdEditor
                  value={agentContent}
                  preview={false}
                  onChange={setAgentContent}
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  style={{ height: '100%' }}
                />
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>关闭</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目 "{projectToDelete?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsTab;