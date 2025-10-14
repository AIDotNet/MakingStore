import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomPrompt } from '@/types/customPrompt';

interface PromptFormData {
  name: string;
  description: string;
  content: string;
  category: string;
  scope: 'user' | 'project';
}

interface AddPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (promptData: PromptFormData) => Promise<void>;
  editingPrompt?: CustomPrompt | null;
  error?: string;
}

export const AddPromptDialog: React.FC<AddPromptDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  editingPrompt,
  error
}) => {
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    description: '',
    content: '',
    category: '',
    scope: 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当编辑提示词时，填充表单数据
  useEffect(() => {
    if (editingPrompt) {
      setFormData({
        name: editingPrompt.name,
        description: editingPrompt.description || '',
        content: editingPrompt.content,
        category: editingPrompt.category || '',
        scope: editingPrompt.scope
      });
    } else {
      // 重置表单
      setFormData({
        name: '',
        description: '',
        content: '',
        category: '',
        scope: 'user'
      });
    }
  }, [editingPrompt, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('保存提示词失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPrompt ? '编辑提示词' : '添加新提示词'}
          </DialogTitle>
          <DialogDescription>
            {editingPrompt ? '修改现有提示词的信息和内容' : '创建一个新的自定义提示词'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">提示词名称 *</Label>
              <Input
                id="prompt-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入提示词名称（不含斜杠）"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-category">分类</Label>
              <Input
                id="prompt-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="输入提示词分类（可选）"
                className="h-9"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prompt-description">描述</Label>
            <Input
              id="prompt-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="输入提示词描述"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-scope">作用域</Label>
            <Select
              value={formData.scope}
              onValueChange={(value: 'user' | 'project') => 
                setFormData(prev => ({ ...prev, scope: value }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">用户级</SelectItem>
                <SelectItem value="project">项目级</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-content">提示词内容 *</Label>
            <Textarea
              id="prompt-content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="输入提示词的 Markdown 内容..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim() || !formData.content.trim()}
          >
            {isSubmitting ? '保存中...' : (editingPrompt ? '更新提示词' : '创建提示词')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};