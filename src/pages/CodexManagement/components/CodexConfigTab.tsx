import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, RefreshCw } from 'lucide-react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { tauriFileSystemManager } from '../../../lib/tauriFileSystem';
import { mkdir, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const CodexConfigTab: React.FC = () => {
  const [configContent, setConfigContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [configPath, setConfigPath] = useState<string>('');
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  // 获取当前用户目录下的config.toml路径
  const getConfigPath = async (): Promise<string> => {
    try {
      // 获取用户主目录
      const homeDir = await tauriFileSystemManager.getHomePath();
      return `${homeDir}/.codex/config.toml`;
    } catch (err) {
      console.error('获取用户目录失败:', err);
      // 回退到默认路径
      return 'C:/Users/' + (process.env.USERNAME || 'User') + '/.codex/config.toml';
    }
  };

  // 加载配置文件
  const loadConfig = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const path = await getConfigPath();
      setConfigPath(path);
      
      // 检查文件是否存在
      const fileExists = await exists(path);
      
      if (!fileExists) {
        // 如果文件不存在，创建默认配置
        const defaultConfig = `# Codex 配置文件
# 这是一个示例配置文件，请根据需要修改

model = "gpt-5-codex"
sandbox_mode = "danger-full-access"
network_access = true
approval_policy = "never"
windows_wsl_setup_acknowledged = true
experimental_use_rmcp_client = true

[shell_environment_policy]
inherit = "all"
ignore_default_excludes = false

`;
        
        // 确保目录存在
        const dirPath = path.substring(0, path.lastIndexOf('/'));
        await mkdir(dirPath, { recursive: true });
        
        // 创建默认配置文件
        await writeTextFile(path, defaultConfig);
        setConfigContent(defaultConfig);
      } else {
        // 读取现有配置文件
        const content = await readTextFile(path);
        setConfigContent(content);
      }
    } catch (err) {
      console.error('加载配置文件失败:', err);
      setError(`加载配置文件失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置文件
  const saveConfig = async () => {
    if (!configPath) return;
    
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await writeTextFile(configPath, configContent);
      setSuccessMessage('配置文件保存成功！');
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('保存配置文件失败:', err);
      setError(`保存配置文件失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 配置TOML语法高亮
  useEffect(() => {
    if (monaco) {
      // 注册TOML语言
      monaco.languages.register({ id: 'toml' });
      
      // 定义TOML语法规则
      monaco.languages.setMonarchTokensProvider('toml', {
        tokenizer: {
          root: [
            // 注释
            [/#.*$/, 'comment'],
            
            // 表头 - 需要在字符串之前匹配
            [/^\s*\[[^\]]+\]/, 'type'],
            
            // 字符串
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            
            // 数字
            [/\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?/, 'number.date'],
            [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/\d+/, 'number'],
            
            // 布尔值
            [/\b(true|false)\b/, 'constant.language.boolean'],
            
            // 键名 - 在等号前的标识符
            [/[a-zA-Z_][a-zA-Z0-9_-]*(?=\s*=)/, 'variable.name'],
            
            // 操作符
            [/=/, 'operator'],
            [/[\[\],{}]/, 'delimiter'],
            
            // 空白字符
            [/\s+/, ''],
          ]
        }
      });
      
      // 设置TOML语言配置
      monaco.languages.setLanguageConfiguration('toml', {
        comments: {
          lineComment: '#'
        },
        brackets: [
          ['[', ']'],
          ['{', '}']
        ],
        autoClosingPairs: [
          { open: '[', close: ']' },
          { open: '{', close: '}' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        surroundingPairs: [
          { open: '[', close: ']' },
          { open: '{', close: '}' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ]
      });

      // 定义TOML主题颜色
      monaco.editor.defineTheme('toml-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'number.float', foreground: 'B5CEA8' },
          { token: 'number.date', foreground: 'DCDCAA' },
          { token: 'constant.language.boolean', foreground: '569CD6' },
          { token: 'variable.name', foreground: '9CDCFE' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'operator', foreground: 'D4D4D4' },
          { token: 'delimiter', foreground: 'D4D4D4' }
        ],
        colors: {}
      });

      // 定义TOML浅色主题
      monaco.editor.defineTheme('toml-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000' },
          { token: 'string', foreground: 'A31515' },
          { token: 'number', foreground: '098658' },
          { token: 'number.float', foreground: '098658' },
          { token: 'number.date', foreground: '795E26' },
          { token: 'constant.language.boolean', foreground: '0000FF' },
          { token: 'variable.name', foreground: '001080' },
          { token: 'type', foreground: '267F99' },
          { token: 'operator', foreground: '000000' },
          { token: 'delimiter', foreground: '000000' }
        ],
        colors: {}
      });
    }
  }, [monaco]);

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 监听主题变化，更新Monaco编辑器主题
  useEffect(() => {
    if (editorRef.current && monaco) {
      // 处理 system 主题模式：检查系统实际主题
      let actualTheme = resolvedTheme;
      if (resolvedTheme === 'system') {
        // 检查系统是否为暗色模式
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      const newTheme = actualTheme === 'dark' ? 'toml-dark' : 'toml-light';
      monaco.editor.setTheme(newTheme);
    }
  }, [resolvedTheme, monaco]);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Codex配置管理</h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadConfig}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          
          <Button
            onClick={saveConfig}
            size="sm"
            disabled={isSaving || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 成功消息 */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>加载配置文件中...</span>
              </div>
            </div>
          ) : (
            <div className="border rounded-b-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
              <Editor
                height="100%"
                language="toml"
                value={configContent}
                onChange={(value) => setConfigContent(value || '')}
                theme={(() => {
                  // 处理 system 主题模式：检查系统实际主题
                  let actualTheme = resolvedTheme;
                  if (resolvedTheme === 'system') {
                    // 检查系统是否为暗色模式
                    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  return actualTheme === 'dark' ? 'toml-dark' : 'toml-light';
                })()}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                }}
              />
            </div>
          )}

    </div>
  );
};

export default CodexConfigTab;