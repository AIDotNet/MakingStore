import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Search, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface OnlinePrompt {
  name: string;
  description: string;
  category: string;
  prompt: string;
  displayName: string;
}

interface PromptStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (prompt: OnlinePrompt, content: string) => Promise<void>;
}

interface Categories {
  name: string;
  description: string;
}

export const PromptStoreDialog: React.FC<PromptStoreDialogProps> = ({
  open,
  onOpenChange,
  onInstall
}) => {
  const [prompts, setPrompts] = useState<OnlinePrompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<OnlinePrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installingPrompts, setInstallingPrompts] = useState<Set<string>>(new Set());
  const [installedPrompts, setInstalledPrompts] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Categories[]>([]);

  // 获取在线提示词列表
  const fetchPrompts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://raw.githubusercontent.com/AIDotNet/MakingStore.Hubs/refs/heads/master/codex/prompts.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
      setCategories(data.categories || []);
      setFilteredPrompts(data.prompts || []);
    } catch (err) {
      console.error('获取提示词列表失败:', err);
      setError('无法获取提示词列表，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 安装提示词
  const handleInstallPrompt = async (prompt: OnlinePrompt) => {
    if (installingPrompts.has(prompt.prompt) || installedPrompts.has(prompt.prompt)) {
      return;
    }

    setInstallingPrompts(prev => new Set(prev).add(prompt.prompt));
    
    try {
      // 获取提示词内容
      const contentUrl = `https://raw.githubusercontent.com/AIDotNet/MakingStore.Hubs/refs/heads/master/codex/prompts/${prompt.prompt}`;
      const response = await fetch(contentUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      
      // 调用安装回调
      await onInstall(prompt, content);
      
      // 标记为已安装
      setInstalledPrompts(prev => new Set(prev).add(prompt.prompt));
      
    } catch (err) {
      console.error('安装提示词失败:', err);
      setError(`安装 "${prompt.displayName}" 失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setInstallingPrompts(prev => {
        const newSet = new Set(prev);
        newSet.delete(prompt.prompt);
        return newSet;
      });
    }
  };

  // 搜索和过滤
  useEffect(() => {
    let filtered = prompts;

    // 按分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }

    // 按搜索词过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(term) ||
        prompt.displayName.toLowerCase().includes(term) ||
        prompt.description.toLowerCase().includes(term) ||
        prompt.category.toLowerCase().includes(term)
      );
    }

    setFilteredPrompts(filtered);
  }, [prompts, searchTerm, selectedCategory]);

  // 当对话框打开时获取提示词列表
  useEffect(() => {
    if (open && prompts.length === 0) {
      fetchPrompts();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            提示词商店
          </DialogTitle>
          <DialogDescription>
            从在线商店浏览和安装提示词模板
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索提示词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">所有分类</option>
            {categories.map(category => (
              <option key={category.name} value={category.name}>{category.name}</option>
            ))}
          </select>
          <Button
            onClick={fetchPrompts}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 提示词列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {prompts.length === 0 ? '暂无可用的提示词' : '没有找到匹配的提示词'}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPrompts.map((prompt) => {
                const isInstalling = installingPrompts.has(prompt.prompt);
                const isInstalled = installedPrompts.has(prompt.prompt);
                
                return (
                  <Card key={prompt.prompt} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{prompt.displayName}</CardTitle>
                          <CardDescription className="mt-1">
                            {prompt.description}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleInstallPrompt(prompt)}
                          disabled={isInstalling || isInstalled}
                          size="sm"
                          variant={isInstalled ? "secondary" : "default"}
                        >
                          {isInstalling ? (
                            <>
                              <Spinner className="h-4 w-4 mr-2" />
                              安装中...
                            </>
                          ) : isInstalled ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              已安装
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              安装
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>分类: {prompt.category}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};