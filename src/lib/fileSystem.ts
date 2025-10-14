import { readTextFile, writeTextFile, exists, readDir, mkdir } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import type { CustomPrompt, PromptExport } from '../types/customPrompt';

export interface CodexConfig {
  prompts: CustomPrompt[];
  lastModified: string;
}

export class FileSystemManager {
  private static instance: FileSystemManager;

  static getInstance(): FileSystemManager {
    if (!FileSystemManager.instance) {
      FileSystemManager.instance = new FileSystemManager();
    }
    return FileSystemManager.instance;
  }

  /**
   * 获取用户级别的Claude Code路径
   */
  private async getClaudeCodePath(): Promise<string> {
    try {
      const { homeDir } = await import('@tauri-apps/api/path');
      const home = await homeDir();
      return `${home}/.claude_code`;
    } catch (error) {
      console.error('Failed to get home directory:', error);
      throw error;
    }
  }

  /**
   * 获取项目级别的Claude Code路径
   */
  private async getProjectClaudeCodePath(): Promise<string> {
    return './.claude_code';
  }

  /**
   * 读取指定目录下的所有.md文件
   */
  async readPromptsFromDirectory(dirPath: string): Promise<CustomPrompt[]> {
    try {
      const dirExists = await exists(dirPath);
      if (!dirExists) {
        return [];
      }

      const entries = await readDir(dirPath);
      const prompts: CustomPrompt[] = [];

      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith('.md')) {
          try {
            const filePath = `${dirPath}/${entry.name}`;
            const content = await readTextFile(filePath);
            const prompt = this.parseMarkdownPrompt(content, entry.name, dirPath);
            if (prompt) {
              prompts.push(prompt);
            }
          } catch (error) {
            console.warn(`Failed to read prompt file ${entry.name}:`, error);
          }
        } else if (entry.isDirectory) {
          // 递归读取子目录
          const subPrompts = await this.readPromptsFromDirectory(`${dirPath}/${entry.name}`);
          prompts.push(...subPrompts);
        }
      }

      return prompts;
    } catch (error) {
      console.error('Failed to read prompts from directory:', error);
      return [];
    }
  }

  /**
   * 解析Markdown格式的提示词文件
   */
  private parseMarkdownPrompt(content: string, fileName: string, dirPath: string): CustomPrompt | null {
    try {
      const lines = content.split('\n');
      let frontmatterEnd = -1;
      let frontmatter: any = {};

      // 解析frontmatter
      if (lines[0] === '---') {
        for (let i = 1; i < lines.length; i++) {
          if (lines[i] === '---') {
            frontmatterEnd = i;
            break;
          }
        }

        if (frontmatterEnd > 0) {
          const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n');
          // 简单解析YAML frontmatter
          frontmatterContent.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
              frontmatter[key] = value;
            }
          });
        }
      }

      // 获取内容部分
      const contentStart = frontmatterEnd > 0 ? frontmatterEnd + 1 : 0;
      const promptContent = lines.slice(contentStart).join('\n').trim();

      // 从文件名提取提示词名（去除.md扩展名）
      const promptName = fileName.replace(/\.md$/, '');

      const prompt: CustomPrompt = {
        id: `prompt-${promptName}-${Date.now()}`,
        name: promptName,
        description: frontmatter.description || `Prompt ${promptName}`,
        content: promptContent,
        scope: 'user',
        category: frontmatter.category || 'general',
        filePath: `${dirPath}/${fileName}`,
        allowedTools: frontmatter.tools ? frontmatter.tools.split(',').map((t: string) => t.trim()) : [],
        arguments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return prompt;
    } catch (error) {
      console.error('Failed to parse markdown prompt:', error);
      return null;
    }
  }

  /**
   * 生成Markdown格式的提示词文件
   */
  private generateMarkdownPrompt(prompt: CustomPrompt): string {
    const frontmatter = [
      '---',
      `description: "${prompt.description}"`,
      `category: "${prompt.category || 'general'}"`,
      prompt.allowedTools && prompt.allowedTools.length > 0 
        ? `tools: "${prompt.allowedTools.join(', ')}"` 
        : '',
      '---',
      ''
    ].filter(Boolean).join('\n');

    return frontmatter + prompt.content;
  }

  /**
   * 保存提示词到文件
   */
  async savePromptToFile(prompt: CustomPrompt): Promise<void> {
    try {
      const userPath = await this.getClaudeCodePath();
      const promptsDir = `${userPath}/prompts`;
      
      // 确保目录存在
      await mkdir(promptsDir, { recursive: true });

      const fileName = `${prompt.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`;
      const filePath = `${promptsDir}/${fileName}`;
      
      const content = this.generateMarkdownPrompt(prompt);
      await writeTextFile(filePath, content);
      
      console.log(`Prompt saved to: ${filePath}`);
    } catch (error) {
      console.error('Failed to save prompt to file:', error);
      throw error;
    }
  }

  /**
   * 加载用户级别的提示词
   */
  async loadUserPrompts(): Promise<CustomPrompt[]> {
    const userPath = await this.getClaudeCodePath();
    const promptsPath = `${userPath}/prompts`;
    return this.readPromptsFromDirectory(promptsPath);
  }

  /**
   * 加载项目级别的提示词
   */
  async loadProjectPrompts(): Promise<CustomPrompt[]> {
    const projectPath = await this.getProjectClaudeCodePath();
    const promptsPath = `${projectPath}/prompts`;
    return this.readPromptsFromDirectory(promptsPath);
  }

  /**
   * 加载所有提示词
   */
  async loadAllPrompts(): Promise<CustomPrompt[]> {
    const [userPrompts, projectPrompts] = await Promise.all([
      this.loadUserPrompts(),
      this.loadProjectPrompts()
    ]);

    return [...userPrompts, ...projectPrompts];
  }

  /**
   * 选择文件夹
   */
  async selectFolder(): Promise<string | null> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择文件夹'
      });

      return selected as string | null;
    } catch (error) {
      console.error('Failed to select folder:', error);
      return null;
    }
  }

  /**
   * 导出提示词到文件夹
   */
  async exportPromptsToFolder(prompts: CustomPrompt[], targetPath: string): Promise<void> {
    try {
      // 确保目标目录存在
      await mkdir(targetPath, { recursive: true });

      for (const prompt of prompts) {
        const fileName = `${prompt.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.md`;
        const filePath = `${targetPath}/${fileName}`;
        const content = this.generateMarkdownPrompt(prompt);
        await writeTextFile(filePath, content);
      }

      console.log(`Exported ${prompts.length} prompts to ${targetPath}`);
    } catch (error) {
      console.error('Failed to export prompts to folder:', error);
      throw error;
    }
  }

  /**
   * 从文件夹导入提示词
   */
  async importPromptsFromFolder(sourcePath: string): Promise<CustomPrompt[]> {
    try {
      return await this.readPromptsFromDirectory(sourcePath);
    } catch (error) {
      console.error('Failed to import prompts from folder:', error);
      throw error;
    }
  }

  /**
   * 删除提示词文件
   */
  async deletePromptFile(prompt: CustomPrompt): Promise<void> {
    try {
      if (prompt.filePath && await exists(prompt.filePath)) {
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(prompt.filePath);
        console.log(`Deleted prompt file: ${prompt.filePath}`);
      }
    } catch (error) {
      console.error('Failed to delete prompt file:', error);
      throw error;
    }
  }
}

export const fileSystemManager = FileSystemManager.getInstance();