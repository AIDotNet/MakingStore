import React, { useState, useEffect } from 'react';
import { SlashCommand, CommandSearchOptions } from '../types/slashCommand';
import { slashCommandDB } from '../lib/slashCommandDB';
import { fileSystemManager } from '../lib/fileSystem';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { CommandList } from './CommandList';
import { ImportExportPanel } from './ImportExportPanel';
import { CommandEditor } from './CommandEditor';
import { CommandPreview } from './CommandPreview';

interface SlashCommandManagerProps {
  className?: string;
}

export const SlashCommandManager: React.FC<SlashCommandManagerProps> = ({ className }) => {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
  const [editingCommand, setEditingCommand] = useState<SlashCommand | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchOptions, setSearchOptions] = useState<CommandSearchOptions>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化数据库并加载命令
  useEffect(() => {
    initializeDB();
  }, []);

  // 搜索和过滤命令
  useEffect(() => {
    filterCommands();
  }, [commands, searchOptions, selectedCategory]);

  const initializeDB = async () => {
    try {
      await slashCommandDB.init();
      
      // 从文件系统加载命令
      const fileCommands = await fileSystemManager.loadAllCommands();
      
      // 将文件系统中的命令同步到数据库
      for (const command of fileCommands) {
        const existing = await slashCommandDB.getCommand(command.id);
        if (!existing) {
          await slashCommandDB.addCommand(command);
        }
      }
      
      await loadCommands();
      await loadCategories();
    } catch (err) {
      setError(`初始化数据库失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCommands = async () => {
    try {
      const allCommands = await slashCommandDB.getAllCommands();
      setCommands(allCommands);
    } catch (err) {
      setError(`加载命令失败: ${(err as Error).message}`);
    }
  };

  const loadCategories = async () => {
    try {
      const allCommands = await slashCommandDB.getAllCommands();
      const uniqueCategories = Array.from(
        new Set(allCommands.map(cmd => cmd.category).filter(Boolean))
      );
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const filterCommands = async () => {
    try {
      let filtered = commands;

      // 应用分类过滤
      if (selectedCategory !== undefined) {
        if (selectedCategory === '') {
          // 显示无分类的命令
          filtered = filtered.filter(cmd => !cmd.category);
        } else {
          // 显示指定分类的命令
          filtered = filtered.filter(cmd => cmd.category === selectedCategory);
        }
      }

      // 应用搜索过滤
      if (searchOptions.query || searchOptions.scope || searchOptions.sortBy) {
        // 先从数据库获取所有命令，然后应用搜索选项
        const searchResults = await slashCommandDB.searchCommands(searchOptions);
        // 与已过滤的命令取交集
        filtered = filtered.filter(cmd => 
          searchResults.some(result => result.id === cmd.id)
        );
      }

      setFilteredCommands(filtered);
    } catch (err) {
      console.error('过滤命令失败:', err);
      setFilteredCommands(commands);
    }
  };

  // 处理命令选择
  const handleSelectCommand = (command: SlashCommand) => {
    setSelectedCommand(command);
    setEditingCommand(null);
    setIsCreating(false);
  };

  // 处理创建新命令
  const handleCreateCommand = () => {
    setIsCreating(true);
    setEditingCommand(null);
    setSelectedCommand(null);
  };

  // 处理编辑命令
  const handleEditCommand = (command: SlashCommand) => {
    setEditingCommand(command);
    setIsCreating(false);
    setSelectedCommand(null);
  };

  // 处理保存命令
  const handleSaveCommand = async (command: Omit<SlashCommand, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let savedCommand: SlashCommand;
      
      if (isCreating) {
        savedCommand = await slashCommandDB.addCommand(command);
      } else if (editingCommand) {
        savedCommand = await slashCommandDB.updateCommand(editingCommand.id, command);
      } else {
        return;
      }
      
      // 同步到文件系统
      await fileSystemManager.saveCommandToFile(savedCommand);
      
      await loadCommands();
      await loadCategories();
      setIsCreating(false);
      setEditingCommand(null);
    } catch (err) {
      setError(`保存命令失败: ${(err as Error).message}`);
    }
  };

  // 处理删除命令
  const handleDeleteCommand = async (commandId: string) => {
    if (!confirm('确定要删除这个命令吗？')) return;
    
    try {
      const command = commands.find(cmd => cmd.id === commandId);
      await slashCommandDB.deleteCommand(commandId);
      // 从文件系统删除
      if (command) {
        await fileSystemManager.deleteCommandFile(command);
      }
      await loadCommands();
      await loadCategories();
      
      if (selectedCommand?.id === commandId) {
        setSelectedCommand(null);
      }
      if (editingCommand?.id === commandId) {
        setEditingCommand(null);
      }
    } catch (err) {
      setError(`删除命令失败: ${(err as Error).message}`);
    }
  };

  // 处理导入
  const handleImport = async (data: CommandExport) => {
    try {
      for (const command of data.commands) {
        const { id, createdAt, updatedAt, ...commandData } = command;
        await slashCommandDB.addCommand(commandData);
      }
      
      await loadCommands();
      await loadCategories();
    } catch (err) {
      throw new Error(`导入失败: ${(err as Error).message}`);
    }
  };

  // 处理导出
  const handleExport = async (commandIds?: string[]): Promise<CommandExport> => {
    try {
      const commandsToExport = commandIds 
        ? commands.filter(cmd => commandIds.includes(cmd.id))
        : commands;
        
      return {
        version: '1.0',
        exportDate: new Date(),
        commands: commandsToExport
      };
    } catch (err) {
      throw new Error(`导出失败: ${(err as Error).message}`);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingCommand(null);
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
          <button
            onClick={() => {
              setError(null);
              initializeDB();
            }}
            className="ml-2 underline hover:no-underline"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* 左侧面板 */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 搜索和过滤 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <SearchBar
            searchOptions={searchOptions}
            onSearchChange={setSearchOptions}
          />
          
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          
          <button
            onClick={handleCreateCommand}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新建命令
          </button>
        </div>

        {/* 命令列表 */}
        <div className="flex-1 overflow-y-auto">
          <CommandList
            commands={filteredCommands}
            selectedCommand={selectedCommand}
            onSelectCommand={handleSelectCommand}
            onEditCommand={handleEditCommand}
            onDeleteCommand={handleDeleteCommand}
          />
        </div>

        {/* 导入导出面板 */}
        <ImportExportPanel
          commands={commands}
          onImport={handleImport}
          onExport={handleExport}
        />
      </div>

      {/* 右侧面板 */}
      <div className="flex-1 flex flex-col">
        {isCreating || editingCommand ? (
          <CommandEditor
            command={editingCommand}
            onSave={handleSaveCommand}
            onCancel={() => {
              setIsCreating(false);
              setEditingCommand(null);
            }}
          />
        ) : selectedCommand ? (
          <CommandPreview
            command={selectedCommand}
            onEdit={() => handleEditCommand(selectedCommand)}
            onDelete={() => handleDeleteCommand(selectedCommand.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">⚡</div>
              <div className="text-xl mb-2">Codex 斜杠命令管理</div>
              <div className="text-sm">选择一个命令查看详情，或创建新的命令</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};