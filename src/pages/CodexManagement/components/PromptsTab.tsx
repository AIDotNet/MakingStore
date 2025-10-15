import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, ChevronDown, Store } from 'lucide-react';
import { CustomPrompt } from '../../../types/customPrompt';
import { AddPromptDialog } from '@/components/AddPromptDialog';
import { PromptStoreDialog } from '@/components/PromptStoreDialog';

interface PromptsTabProps {
  prompts: CustomPrompt[];
  onPromptsChange: (prompts: CustomPrompt[]) => void;
}

const PromptsTab: React.FC<PromptsTabProps> = ({
  prompts,
  onPromptsChange
}) => {
  const [isLoadingPrompts] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPromptStoreDialog, setShowPromptStoreDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [deletePromptDialogOpen, setDeletePromptDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<CustomPrompt | null>(null);

  // 加载提示词的内部函数


  // 处理函数
  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setShowPromptDialog(true);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleDeletePrompt = (prompt: CustomPrompt) => {
    setPromptToDelete(prompt);
    setDeletePromptDialogOpen(true);
  };

  const handleSavePrompt = async (promptData: {
    name: string;
    description: string;
    content: string;
    category: string;
    scope: 'user' | 'project';
  }) => {
    try {
      if (editingPrompt) {
        // 编辑现有提示词
        const updatedPrompt: CustomPrompt = {
          ...editingPrompt,
          ...promptData,
          updatedAt: new Date(),
        };
        const updatedPrompts = prompts.map(p => 
          p.id === editingPrompt.id ? updatedPrompt : p
        );
        onPromptsChange(updatedPrompts);
        
        // 保存到后端
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_custom_prompts', { prompts: updatedPrompts });
      } else {
        // 创建新提示词
        const newPrompt: CustomPrompt = {
          id: Date.now().toString(),
          ...promptData,
          createdAt: new Date(),
          updatedAt: new Date(),
          filePath: `${promptData.name}.md`,
          allowedTools: [],
          arguments: [],
        };
        const updatedPrompts = [...prompts, newPrompt];
        onPromptsChange(updatedPrompts);
        
        // 保存到后端
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_custom_prompts', { prompts: updatedPrompts });
      }
      
      setShowPromptDialog(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('保存提示词失败:', error);
      throw error;
    }
  };

  const handleInstallFromStore = async (onlinePrompt: any, content: string) => {
    try {
      const newPrompt: CustomPrompt = {
        id: Date.now().toString(),
        name: onlinePrompt.name,
        description: onlinePrompt.description,
        content: content,
        category: onlinePrompt.category || 'general',
        scope: 'user' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: `${onlinePrompt.name}.md`,
        allowedTools: [],
        arguments: [],
      };
      
      const updatedPrompts = [...prompts, newPrompt];
      onPromptsChange(updatedPrompts);
      
      // 保存到后端
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_custom_prompts', { prompts: updatedPrompts });
      
      setShowPromptStoreDialog(false);
    } catch (error) {
      console.error('安装提示词失败:', error);
      throw error;
    }
  };

  const handleOpenPromptStore = () => {
    setShowPromptStoreDialog(true);
  };

  const confirmDeletePrompt = async () => {
    if (!promptToDelete) return;

    try {
      const updatedPrompts = prompts.filter(p => p.id !== promptToDelete.id);
      onPromptsChange(updatedPrompts);
      
      // 保存到后端
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_custom_prompts', { prompts: updatedPrompts });
      
      setDeletePromptDialogOpen(false);
      setPromptToDelete(null);
    } catch (error) {
      console.error('删除提示词失败:', error);
      throw error;
    }
  };
  return (
    <div className="p-6 space-y-6">
      {/* 头部操作 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">自定义提示词管理</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenPromptStore}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <Store className="h-4 w-4 mr-2" />
            提示词商店
          </Button>
          <Button
            onClick={handleCreatePrompt}
            size="sm"
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建提示词
          </Button>
        </div>
      </div>

      {/* 提示词列表 */}
      <div>
        {isLoadingPrompts ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-3">
              <Spinner className="h-6 w-6 mx-auto" />
              <p className="text-sm text-muted-foreground">加载提示词中...</p>
            </div>
          </div>
        ) : prompts.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-sm text-muted-foreground">暂无自定义提示词，创建第一个开始使用</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {prompt.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {prompt.description || '无描述'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditPrompt(prompt)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeletePrompt(prompt)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-2">
                    {prompt.category && (
                      <Badge variant="outline" className="text-xs">
                        {prompt.category}
                      </Badge>
                    )}
                    <Badge 
                      variant={prompt.scope === 'user' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {prompt.scope === 'user' ? '用户' : '项目'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {prompt.content.substring(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 添加/编辑提示词对话框 */}
      <AddPromptDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        onSave={handleSavePrompt}
        editingPrompt={editingPrompt}
      />

      {/* 提示词商店对话框 */}
      <PromptStoreDialog
        open={showPromptStoreDialog}
        onOpenChange={setShowPromptStoreDialog}
        onInstall={handleInstallFromStore}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deletePromptDialogOpen} onOpenChange={setDeletePromptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除提示词 "{promptToDelete?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePrompt} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromptsTab;