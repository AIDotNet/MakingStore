import React, { useState, useRef } from 'react';
import { SlashCommand, CommandExport } from '../types/slashCommand';
import { fileSystemManager } from '../lib/fileSystem';

interface ImportExportPanelProps {
  commands: SlashCommand[];
  onImport: (data: CommandExport) => Promise<void>;
  onExport: (commandIds?: string[]) => Promise<CommandExport>;
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  commands,
  onImport,
  onExport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件导入
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      
      // 尝试解析JSON格式
      let importData: CommandExport;
      try {
        importData = JSON.parse(text);
      } catch {
        // 如果不是JSON，尝试解析为单个Markdown文件
        const fileName = file.name.replace(/\.md$/, '');
        importData = {
          version: '1.0',
          exportDate: new Date(),
          commands: [{
            id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: fileName,
            description: `从 ${file.name} 导入的命令`,
            content: text,
            scope: 'user' as const,
            filePath: `~/.config/claude/commands/${file.name}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]
        };
      }

      await onImport(importData);
      setImportResult(`成功导入 ${importData.commands.length} 个命令`);
    } catch (error) {
      setImportResult(`导入失败: ${(error as Error).message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理导出
  const handleExport = async (format: 'json' | 'markdown') => {
    setExporting(true);
    
    try {
      const exportData = await onExport(
        selectedCommands.length > 0 ? selectedCommands : undefined
      );

      if (format === 'json') {
        // 导出为JSON文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slash-commands-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // 导出到文件夹
        const handleExportToFolder = async () => {
          try {
            setExportStatus('exporting');
            
            const selectedFolder = await fileSystemManager.selectFolder();
            if (!selectedFolder) {
              setExportStatus('idle');
              return;
            }
            
            const commandsToExport = selectedCommands.length > 0 
              ? commands.filter(cmd => selectedCommands.includes(cmd.id))
              : commands;
            
            await fileSystemManager.exportCommandsToFolder(commandsToExport, selectedFolder);
            
            setExportStatus('success');
            setTimeout(() => setExportStatus('idle'), 3000);
          } catch (error) {
            console.error('Export to folder failed:', error);
            setExportStatus('error');
            setTimeout(() => setExportStatus('idle'), 3000);
          }
        };

        // 从文件夹导入
        const handleImportFromFolder = async () => {
          try {
            setImportStatus('importing');
            
            const selectedFolder = await fileSystemManager.selectFolder();
            if (!selectedFolder) {
              setImportStatus('idle');
              return;
            }
            
            const importedCommands = await fileSystemManager.importCommandsFromFolder(selectedFolder);
            
            if (importedCommands.length > 0) {
              onImport(importedCommands);
              setImportStatus('success');
              setTimeout(() => setImportStatus('idle'), 3000);
            } else {
              setImportStatus('error');
              setTimeout(() => setImportStatus('idle'), 3000);
            }
          } catch (error) {
            console.error('Import from folder failed:', error);
            setImportStatus('error');
            setTimeout(() => setImportStatus('idle'), 3000);
          }
        };

        // 导出为Markdown文件（ZIP格式）
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        
        exportData.commands.forEach(command => {
          const fileName = `${command.name}.md`;
          zip.file(fileName, command.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slash-commands-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  // 切换命令选择
  const toggleCommandSelection = (commandId: string) => {
    setSelectedCommands(prev => 
      prev.includes(commandId)
        ? prev.filter(id => id !== commandId)
        : [...prev, commandId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCommands.length === commands.length) {
      setSelectedCommands([]);
    } else {
      setSelectedCommands(commands.map(cmd => cmd.id));
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
      >
        <span>导入/导出</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 导入区域 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导入命令
            </h4>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {importing ? '导入中...' : '选择文件 (JSON/Markdown)'}
              </button>
              {importResult && (
                <div className={`text-sm p-2 rounded ${
                  importResult.includes('成功') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {importResult}
                </div>
              )}
            </div>
          </div>

          {/* 导出区域 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出命令
            </h4>
            
            {/* 命令选择 */}
            {commands.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    选择要导出的命令
                  </span>
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {selectedCommands.length === commands.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {commands.map(command => (
                    <label key={command.id} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCommands.includes(command.id)}
                        onChange={() => toggleCommandSelection(command.id)}
                        className="mr-2"
                      />
                      <span className="truncate">/{command.name}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  已选择 {selectedCommands.length} / {commands.length} 个命令
                  {selectedCommands.length === 0 && ' (将导出全部)'}
                </div>
              </div>
            )}

            {/* 导出按钮 */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('json')}
                disabled={exporting || commands.length === 0}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {exporting ? '导出中...' : 'JSON格式'}
              </button>
              <button
                onClick={() => handleExport('markdown')}
                disabled={exporting || commands.length === 0}
                className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {exporting ? '导出中...' : 'Markdown'}
              </button>
              <button
                onClick={handleExportToFolder}
                disabled={exporting || commands.length === 0}
                className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {exporting ? '导出中...' : '导出到文件夹'}
              </button>
            </div>
            
            <div className="flex space-x-2 mt-2">
              <button
                onClick={handleImportFromFolder}
                disabled={importing}
                className="flex-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {importing ? '导入中...' : '从文件夹导入'}
              </button>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>• JSON格式：包含完整的命令数据，可重新导入</div>
            <div>• Markdown格式：导出为ZIP文件，包含各个命令的.md文件</div>
            <div>• 支持导入单个.md文件或完整的JSON数据</div>
          </div>
        </div>
      )}
    </div>
  );
};