import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, Save, RefreshCw } from 'lucide-react';
import { tauriFileSystemManager } from '../../../lib/tauriFileSystem';
import { useTheme } from 'next-themes';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';

interface HomeTabProps {
}

const HomeTab: React.FC<HomeTabProps> = () => {
  const { resolvedTheme } = useTheme();
  const mdEditorRef = useRef<any>(null);
  const [agentContent, setAgentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 加载 AGENT.md 文件内容
  const loadAgentFile = async () => {
    try {
      setIsLoading(true);
      const content = await tauriFileSystemManager.readAgentFile();
      setAgentContent(content);
    } catch (error) {
      console.error('Failed to load agent file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存 AGENT.md 文件
  const saveAgentFile = async () => {
    try {
      setIsSaving(true);
      await tauriFileSystemManager.saveAgentFile(agentContent);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save agent file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 组件挂载时加载文件
  useEffect(() => {
    loadAgentFile();
  }, []);

  // md-editor-rt 通过 theme 属性直接控制主题，不需要手动设置 data-color-mode
  // useEffect(() => {
  //   if (theme && mdEditorRef.current) {
  //     const colorMode = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'auto';
  //     // 直接在 MDEditor 容器上设置 data-color-mode
  //     const editorContainer = mdEditorRef.current;
  //     if (editorContainer) {
  //       editorContainer.setAttribute('data-color-mode', colorMode);
  //     }
  //   }
  // }, [theme]);

  return (
    <div className="p-6 space-y-6">
      {/* AGENT.md 编辑器 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <h2 className="text-lg font-semibold">~/.codex/AGENT.md</h2>
          </div>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                最后保存: {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              onClick={loadAgentFile}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              onClick={saveAgentFile}
              size="sm"
              disabled={isSaving || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-96 border rounded-lg">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>加载中...</span>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden h-[calc(100vh-300px)]" ref={mdEditorRef}>
              <MdEditor
                value={agentContent}
                preview={false}
                onChange={setAgentContent}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                style={{ height: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeTab;