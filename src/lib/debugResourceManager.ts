import { ResourceManager } from './resourceManager';

/**
 * 资源管理器调试工具
 */
export class ResourceManagerDebugger {
  /**
   * 全面诊断资源管理器问题
   */
  static async diagnoseResourceManager(): Promise<{
    platform: string;
    executableName: string;
    exists: boolean;
    path?: string;
    error?: string;
    suggestions: string[];
    rawPath?: string;
  }> {
    const executableName = 'MakingMcp.Web.exe';
    const platformName = ResourceManager.getPlatformExecutableName(executableName);
    
    console.log('🔍 开始诊断资源管理器...');
    console.log(`平台: ${navigator.platform}`);
    console.log(`原始文件名: ${executableName}`);
    console.log(`平台特定文件名: ${platformName}`);

    let result : any = {
      platform: navigator.platform,
      executableName: platformName,
      exists: false,
      suggestions: [] as string[]
    };

    try {
      // 检查文件是否存在
      console.log('📁 检查文件存在性...');
      result.exists = await ResourceManager.checkExecutableExists(platformName);
      console.log(`文件存在: ${result.exists}`);

      if (result.exists) {
        // 尝试获取路径
        console.log('📍 获取文件路径...');
        try {
          result.path = await ResourceManager.getExecutablePath(platformName);
          console.log(`文件路径: ${result.path}`);
        } catch (pathError) {
          console.error('获取路径失败:', pathError);
          result.error = `获取路径失败: ${pathError}`;
          result.suggestions.push('路径解析失败，可能是 Tauri 配置问题');
        }
      } else {
        // 尝试直接调用 Tauri 命令获取更多信息
        console.log('🔧 尝试直接获取路径信息...');
        try {
          result.rawPath = await ResourceManager.getExecutablePath(platformName);
          console.log(`原始路径: ${result.rawPath}`);
          
          // 检查路径是否指向错误的位置
          if (result.rawPath && (result.rawPath.includes('target\\debug\\bin\\') || result.rawPath.includes('target/debug/bin/'))) {
            result.suggestions.push('🔍 发现路径解析问题：Tauri 在开发模式下应该查找 target/debug/resources/bin/ 而不是 target/debug/bin/');
            result.suggestions.push('📁 实际文件位置应该在：target/debug/resources/bin/windows/');
            result.suggestions.push('⚙️ 这是 Tauri 资源路径解析的已知问题，需要修复资源管理器代码');
          } else {
            result.suggestions.push('文件路径可以解析但检查存在性失败，可能是权限或开发环境问题');
          }
        } catch (rawError) {
          console.error('直接路径获取也失败:', rawError);
          result.error = `路径解析失败: ${rawError}`;
          result.suggestions.push('Tauri 资源解析完全失败，可能需要重新构建应用');
        }
        
        result.suggestions.push('文件不存在，请检查文件是否正确放置在 resources/bin/windows/ 目录中');
        result.suggestions.push('如果文件存在，尝试重新构建 Tauri 应用');
        result.suggestions.push('在开发模式下，资源可能需要重新启动 dev 服务器才能生效');
      }

    } catch (error) {
      console.error('诊断过程中出错:', error);
      result.error = `诊断失败: ${error}`;
      result.suggestions.push('Tauri 命令调用失败，请检查应用是否正确启动');
    }

    return result;
  }

  /**
   * 测试执行可执行文件
   */
  static async testExecution(): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    const executableName = 'MakingMcp.Web.exe';
    const platformName = ResourceManager.getPlatformExecutableName(executableName);

    console.log('🚀 测试执行可执行文件...');

    try {
      // 首先检查文件是否存在
      const exists = await ResourceManager.checkExecutableExists(platformName);
      if (!exists) {
        return {
          success: false,
          error: '文件不存在，无法执行'
        };
      }

      // 尝试执行（使用 --help 参数，大多数程序都支持）
      const output = await ResourceManager.executeExternalTool(platformName, ['--help']);
      
      return {
        success: true,
        output: output.substring(0, 500) // 限制输出长度
      };

    } catch (error) {
      console.error('执行失败:', error);
      return {
        success: false,
        error: `执行失败: ${error}`
      };
    }
  }

  /**
   * 批量检查多个可能的文件名
   */
  static async checkAlternativeNames(): Promise<Record<string, boolean>> {
    const alternatives = [
      'MakingMcp.Web.exe',
      'makingmcp.web.exe',
      'MakingMcp.Web',
      'makingmcp.web'
    ];

    console.log('🔄 检查替代文件名...');
    
    const results = await ResourceManager.checkMultipleExecutables(alternatives);
    
    for (const [name, exists] of Object.entries(results)) {
      console.log(`${name}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    }

    return results;
  }

  /**
   * 运行完整诊断
   */
  static async runFullDiagnosis(): Promise<void> {
    console.log('🏥 开始完整诊断...');
    console.log('='.repeat(50));

    // 1. 基础诊断
    const diagnosis = await ResourceManagerDebugger.diagnoseResourceManager();
    console.log('📊 诊断结果:', diagnosis);

    // 2. 检查替代文件名
    const alternatives = await ResourceManagerDebugger.checkAlternativeNames();
    
    // 3. 如果文件存在，测试执行
    if (diagnosis.exists) {
      const execution = await ResourceManagerDebugger.testExecution();
      console.log('🎯 执行测试:', execution);
    }

    // 4. 输出建议
    console.log('💡 建议:');
    diagnosis.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    // 5. 额外建议
    console.log('\n🔧 额外排查步骤:');
    console.log('1. 重新构建 Tauri 应用: npm run tauri build 或 npm run tauri dev');
    console.log('2. 检查 tauri.conf.json 中的资源配置');
    console.log('3. 确认文件权限是否正确');
    console.log('4. 在开发模式下，资源路径可能与生产环境不同');

    console.log('='.repeat(50));
  }
}

// 导出便捷函数
export const debugResourceManager = ResourceManagerDebugger.runFullDiagnosis;