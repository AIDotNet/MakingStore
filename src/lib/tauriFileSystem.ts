import {
  readTextFile,
  writeTextFile,
  exists,
  readDir,
  mkdir,
  remove,
} from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import type { CustomPrompt } from "../types/customPrompt";

export interface CodexConfig {
  version: string;
  prompts: CustomPrompt[];
  lastModified: string;
}

export interface ClaudeConfig {
  version: string;
  projects: Array<{
    id: string;
    name: string;
    path: string;
    createdAt: string;
  }>;
  settings: Record<string, any>;
}

class TauriFileSystemManager {
  private homePath: string | null = null;

  async init(): Promise<void> {
    try {
      this.homePath = await homeDir();
    } catch (error) {
      console.error("Failed to get home directory:", error);
      throw error;
    }
  }

  /**
   * 获取用户主目录路径
   */
  async getHomePath(): Promise<string> {
    if (!this.homePath) {
      await this.init();
    }
    return this.homePath!;
  }

  /**
   * 检查.claude目录是否存在
   */
  async checkClaudeDirectory(): Promise<boolean> {
    try {
      const homePath = await this.getHomePath();
      const claudePath = `${homePath}/.claude`;
      return await exists(claudePath);
    } catch (error) {
      console.error("Failed to check .claude directory:", error);
      return false;
    }
  }

  /**
   * 检查.codex目录是否存在
   */
  async checkCodexDirectory(): Promise<boolean> {
    try {
      const homePath = await this.getHomePath();
      const codexPath = `${homePath}/.codex`;
      return await exists(codexPath);
    } catch (error) {
      console.error("Failed to check .codex directory:", error);
      return false;
    }
  }

  /**
   * 创建.claude目录
   */
  async createClaudeDirectory(): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const claudePath = `${homePath}/.claude`;
      await mkdir(claudePath, { recursive: true });

      // 创建子目录
      await mkdir(`${claudePath}/projects`, { recursive: true });
      await mkdir(`${claudePath}/settings`, { recursive: true });

      // 创建默认配置文件
      const defaultConfig: ClaudeConfig = {
        version: "1.0.0",
        projects: [],
        settings: {},
      };

      await writeTextFile(
        `${claudePath}/config.json`,
        JSON.stringify(defaultConfig, null, 2)
      );
    } catch (error) {
      console.error("Failed to create .claude directory:", error);
      throw error;
    }
  }

  /**
   * 创建.codex目录
   */
  async createCodexDirectory(): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const codexPath = `${homePath}/.codex`;
      await mkdir(codexPath, { recursive: true });

      // 创建子目录
      await mkdir(`${codexPath}/prompts`, { recursive: true });
      await mkdir(`${codexPath}/templates`, { recursive: true });

      // 创建默认配置文件
      const defaultConfig: CodexConfig = {
        version: "1.0.0",
        prompts: [],
        lastModified: new Date().toISOString(),
      };

      await writeTextFile(
        `${codexPath}/config.json`,
        JSON.stringify(defaultConfig, null, 2)
      );
    } catch (error) {
      console.error("Failed to create .codex directory:", error);
      throw error;
    }
  }

  /**
   * 读取Claude配置
   */
  async readClaudeConfig(): Promise<ClaudeConfig | null> {
    try {
      const homePath = await this.getHomePath();
      const configPath = `${homePath}/.claude/config.json`;

      if (!(await exists(configPath))) {
        return null;
      }

      const content = await readTextFile(configPath);
      return JSON.parse(content) as ClaudeConfig;
    } catch (error) {
      console.error("Failed to read Claude config:", error);
      return null;
    }
  }

  /**
   * 写入Claude配置
   */
  async writeClaudeConfig(config: ClaudeConfig): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const configPath = `${homePath}/.claude/config.json`;
      await writeTextFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Failed to write Claude config:", error);
      throw error;
    }
  }

  /**
   * 读取Codex配置
   */
  async readCodexConfig(): Promise<CodexConfig | null> {
    try {
      const homePath = await this.getHomePath();
      const configPath = `${homePath}/.codex/config.json`;

      if (!(await exists(configPath))) {
        return null;
      }

      const content = await readTextFile(configPath);
      return JSON.parse(content) as CodexConfig;
    } catch (error) {
      console.error("Failed to read Codex config:", error);
      return null;
    }
  }

  /**
   * 写入Codex配置
   */
  async writeCodexConfig(config: CodexConfig): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const configPath = `${homePath}/.codex/config.json`;
      config.lastModified = new Date().toISOString();
      await writeTextFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Failed to write Codex config:", error);
      throw error;
    }
  }

  /**
   * 加载Codex提示
   */
  async loadCodexPrompts(): Promise<CustomPrompt[]> {
    try {
      const homePath = await this.getHomePath();
      const promptsPath = `${homePath}/.codex/prompts`;

      if (!(await exists(promptsPath))) {
        return [];
      }

      const entries = await readDir(promptsPath);
      const prompts: CustomPrompt[] = [];

      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          try {
            const filePath = `${promptsPath}/${entry.name}`;
            const content = await readTextFile(filePath);
            const prompt = this.parseMarkdownPrompt(
              content,
              entry.name,
              promptsPath
            );
            if (prompt) {
              prompts.push(prompt);
            }
          } catch (error) {
            console.error(`Failed to load prompt ${entry.name}:`, error);
          }
        }
      }

      return prompts;
    } catch (error) {
      console.error("Failed to load Codex prompts:", error);
      return [];
    }
  }

  /**
   * 保存Codex提示
   */
  async saveCodexPrompt(prompt: CustomPrompt): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const promptsPath = `${homePath}/.codex/prompts`;

      // 确保目录存在
      if (!(await exists(promptsPath))) {
        await mkdir(promptsPath, { recursive: true });
      }

      const filePath = `${promptsPath}/${prompt.name}.md`;
      const content = this.generateMarkdownPrompt(prompt);
      await writeTextFile(filePath, content);

      // 更新配置文件
      let config = await this.readCodexConfig();

      // 如果配置文件不存在或为空，创建默认配置
      if (!config) {
        config = {
          version: "1.0.0",
          prompts: [],
          lastModified: new Date().toISOString(),
        };
      }

      // 确保 prompts 数组存在
      if (!config.prompts) {
        config.prompts = [];
      }

      const existingIndex = config.prompts.findIndex((p) => p.id === prompt.id);
      if (existingIndex >= 0) {
        config.prompts[existingIndex] = prompt;
      } else {
        config.prompts.push(prompt);
      }

      await this.writeCodexConfig(config);
    } catch (error) {
      console.error("Failed to save Codex prompt:", error);
      throw error;
    }
  }

  /**
   * 删除Codex提示
   */
  async deleteCodexPrompt(prompt: CustomPrompt): Promise<void> {
    try {
      const homePath = await this.getHomePath();
      const promptsPath = `${homePath}/.codex/prompts`;
      const filePath = `${promptsPath}/${prompt.name}.md`;

      // 删除文件
      if (await exists(filePath)) {
        await remove(filePath);
      }

      // 更新配置
      const config = await this.readCodexConfig();
      if (config) {
        config.prompts = config.prompts.filter((p) => p.id !== prompt.id);
        config.lastModified = new Date().toISOString();
        await this.writeCodexConfig(config);
      }
    } catch (error) {
      console.error("Failed to delete Codex prompt:", error);
      throw error;
    }
  }

  /**
   * 解析Markdown格式的命令文件
   */
  private parseMarkdownPrompt(
    content: string,
    filename: string,
    basePath: string
  ): CustomPrompt | null {
    try {
      const lines = content.split("\n");
      let frontmatterEnd = -1;
      let frontmatter: any = {};

      // 解析frontmatter
      if (lines[0] === "---") {
        for (let i = 1; i < lines.length; i++) {
          if (lines[i] === "---") {
            frontmatterEnd = i;
            break;
          }
        }

        if (frontmatterEnd > 0) {
          const frontmatterContent = lines.slice(1, frontmatterEnd).join("\n");
          try {
            // 简单的YAML解析（仅支持基本的key: value格式）
            frontmatterContent.split("\n").forEach((line) => {
              const match = line.match(/^(\w+):\s*(.+)$/);
              if (match) {
                const [, key, value] = match;
                frontmatter[key] = value.replace(/^["']|["']$/g, ""); // 移除引号
              }
            });
          } catch (error) {
            console.warn("Failed to parse frontmatter:", error);
          }
        }
      }

      // 获取命令内容（去除frontmatter）
      const commandContent =
        frontmatterEnd > 0
          ? lines
              .slice(frontmatterEnd + 1)
              .join("\n")
              .trim()
          : content.trim();

      // 从文件名提取命令名（去除.md扩展名）
      const commandName = filename.replace(/\.md$/, "");

      const prompt: CustomPrompt = {
        id: `codex-${commandName}-${Date.now()}`,
        name: commandName,
        description: frontmatter.description || `Prompt ${commandName}`,
        content: commandContent,
        scope: "user",
        category: frontmatter.category || "general",
        filePath: `${basePath}/${filename}`,
        allowedTools: frontmatter.tools
          ? frontmatter.tools.split(",").map((t: string) => t.trim())
          : [],
        arguments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return prompt;
    } catch (error) {
      console.error("Failed to parse markdown command:", error);
      return null;
    }
  }

  /**
   * 生成Markdown格式的提示文件
   */
  private generateMarkdownPrompt(prompt: CustomPrompt): string {
    const frontmatter = [
      "---",
      `description: "${prompt.description}"`,
      `category: "${prompt.category || "general"}"`,
      prompt.allowedTools && prompt.allowedTools.length > 0
        ? `tools: "${prompt.allowedTools.join(", ")}"`
        : "",
      "---",
      "",
    ]
      .filter(Boolean)
      .join("\n");

    return frontmatter + "\n" + prompt.content;
  }

  /**
   * 检查Codex是否已安装
   */
  async checkCodexInstallation(): Promise<boolean> {
    try {
      const result = (await invoke("execute_command", {
        command: "codex",
        args: ["--version"],
      })) as string;

      return result.trim().length > 0;
    } catch (error) {
      console.error("Failed to check Codex installation:", error);
      return false;
    }
  }

  /**
   * 安装Codex
   */
  async installCodex(): Promise<{ success: boolean; message: string }> {
    try {
      await invoke("execute_command", {
        command: "npm",
        args: ["install", "-g", "@anthropic-ai/codex"],
      });

      // 如果没有抛出异常，说明安装成功
      return { success: true, message: "Codex安装成功" };
    } catch (error) {
      console.error("Failed to install Codex:", error);
      return {
        success: false,
        message: `安装失败: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 更新Codex
   */
  async updateCodex(): Promise<{ success: boolean; message: string }> {
    try {
      (await invoke("execute_command", {
        command: "npm",
        args: ["update", "-g", "@anthropic-ai/codex"],
      })) as string;

      // 如果没有抛出异常，说明更新成功
      return { success: true, message: "Codex更新成功" };
    } catch (error) {
      console.error("Failed to update Codex:", error);
      return {
        success: false,
        message: `更新失败: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 获取Codex版本
   */
  async getCodexVersion(): Promise<string | null> {
    try {
      const result = (await invoke("execute_command", {
        command: "codex",
        args: ["--version"],
      })) as string;

      if (result && result.trim().length > 0) {
        return result.trim();
      }
      return null;
    } catch (error) {
      console.error("Failed to get Codex version:", error);
      return null;
    }
  }
}

export const tauriFileSystemManager = new TauriFileSystemManager();
