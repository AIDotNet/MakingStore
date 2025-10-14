import { invoke } from '@tauri-apps/api/core';

/**
 * 资源管理器类，用于管理和访问外部可执行文件
 */
export class ResourceManager {
  /**
   * 获取可执行文件的完整路径
   * @param exeName 可执行文件名（包含扩展名）
   * @returns 可执行文件的完整路径
   */
  static async getExecutablePath(exeName: string): Promise<string> {
    try {
      return await invoke<string>('get_executable_path', { exeName });
    } catch (error) {
      throw new Error(`Failed to get executable path for ${exeName}: ${error}`);
    }
  }

  /**
   * 检查可执行文件是否存在
   * @param exeName 可执行文件名
   * @returns 是否存在
   */
  static async checkExecutableExists(exeName: string): Promise<boolean> {
    try {
      return await invoke<boolean>('check_executable_exists', { exeName });
    } catch (error) {
      console.error(`Failed to check executable existence for ${exeName}:`, error);
      return false;
    }
  }

  /**
   * 执行外部工具
   * @param exeName 可执行文件名
   * @param args 命令行参数
   * @returns 执行结果的标准输出
   */
  static async executeExternalTool(exeName: string, args: string[] = []): Promise<string> {
    try {
      return await invoke<string>('execute_external_tool', { exeName, args });
    } catch (error) {
      throw new Error(`Failed to execute ${exeName}: ${error}`);
    }
  }

  /**
   * 获取当前平台的可执行文件名
   * @param baseName 基础文件名（不含扩展名）
   * @returns 带有平台特定扩展名的文件名
   */
  static getPlatformExecutableName(baseName: string): string {
    // 在 Windows 上添加 .exe 扩展名
    if (navigator.platform.toLowerCase().includes('win')) {
      return baseName.endsWith('.exe') ? baseName : `${baseName}.exe`;
    }
    return baseName;
  }

  /**
   * 批量检查多个可执行文件的存在性
   * @param exeNames 可执行文件名数组
   * @returns 存在性检查结果的映射
   */
  static async checkMultipleExecutables(exeNames: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      exeNames.map(async (exeName) => {
        results[exeName] = await this.checkExecutableExists(exeName);
      })
    );

    return results;
  }

  /**
   * 获取资源目录的建议结构信息
   */
  static getResourceDirectoryInfo(): {
    structure: string;
    platforms: string[];
    examples: string[];
  } {
    return {
      structure: `
resources/
├── bin/
│   ├── windows/    # Windows .exe 文件
│   ├── macos/      # macOS 可执行文件
│   └── linux/      # Linux 可执行文件
├── data/           # 数据文件
└── assets/         # 其他资源文件
      `.trim(),
      platforms: ['windows', 'macos', 'linux'],
      examples: [
        'tool.exe (Windows)',
        'tool (macOS/Linux)',
        'converter.exe',
        'helper-script'
      ]
    };
  }
}

/**
 * 资源管理器的便捷函数
 */
export const resourceManager = {
  /**
   * 快速执行工具并获取结果
   */
  async runTool(toolName: string, args: string[] = []): Promise<string> {
    const platformName = ResourceManager.getPlatformExecutableName(toolName);
    const exists = await ResourceManager.checkExecutableExists(platformName);
    
    if (!exists) {
      throw new Error(`Tool '${platformName}' not found in resources`);
    }

    return await ResourceManager.executeExternalTool(platformName, args);
  },

  /**
   * 获取工具信息
   */
  async getToolInfo(toolName: string): Promise<{
    name: string;
    exists: boolean;
    path?: string;
  }> {
    const platformName = ResourceManager.getPlatformExecutableName(toolName);
    const exists = await ResourceManager.checkExecutableExists(platformName);
    
    const info: any = {
      name: platformName,
      exists
    };

    if (exists) {
      try {
        info.path = await ResourceManager.getExecutablePath(platformName);
      } catch (error) {
        console.warn(`Could not get path for ${platformName}:`, error);
      }
    }

    return info;
  }
};

export default ResourceManager;