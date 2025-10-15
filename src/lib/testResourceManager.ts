import { ResourceManager } from './resourceManager';

/**
 * 资源管理器测试工具
 */
export class ResourceManagerTester {
  /**
   * 测试可执行文件路径解析
   */
  static async testExecutablePathResolution(): Promise<void> {
    console.log('🧪 开始测试资源管理器路径解析...');
    
    const testCases = [
      'MakingMcp.Web.exe',
      'nonexistent.exe',
      'test.exe'
    ];

    for (const exeName of testCases) {
      console.log(`\n📋 测试文件: ${exeName}`);
      
      try {
        // 测试路径获取
        const path = await ResourceManager.getExecutablePath(exeName);
        console.log(`✅ 路径解析成功: ${path}`);
        
        // 测试存在性检查
        const exists = await ResourceManager.checkExecutableExists(exeName);
        console.log(`📁 文件存在性: ${exists ? '✅ 存在' : '❌ 不存在'}`);
        
        // 如果文件存在，尝试执行测试
        if (exists && exeName === 'MakingMcp.Web.exe') {
          try {
            console.log('🚀 尝试执行测试...');
            const result = await ResourceManager.executeExternalTool(exeName, ['--help']);
            console.log('✅ 执行成功:', result.substring(0, 100) + '...');
          } catch (execError) {
            console.log('⚠️ 执行失败:', execError);
          }
        }
        
      } catch (error) {
        console.error(`❌ 测试失败 (${exeName}):`, error);
      }
    }
    
    console.log('\n🎯 测试完成！');
  }

  /**
   * 比较修复前后的路径解析
   */
  static async comparePathResolution(): Promise<void> {
    console.log('🔍 比较路径解析结果...');
    
    try {
      const exeName = 'MakingMcp.Web.exe';
      const path = await ResourceManager.getExecutablePath(exeName);
      
      console.log('📍 当前解析路径:', path);
      
      // 检查路径特征
      if (path.includes('target\\debug\\resources\\bin') || path.includes('target/debug/resources/bin')) {
        console.log('✅ 路径修复成功：使用了正确的 resources/bin 路径');
      } else if (path.includes('target\\debug\\bin') || path.includes('target/debug/bin')) {
        console.log('⚠️ 路径可能仍有问题：使用了旧的 bin 路径');
      } else {
        console.log('ℹ️ 路径格式未知，可能是生产环境路径');
      }
      
      // 检查文件实际存在性
      const exists = await ResourceManager.checkExecutableExists(exeName);
      console.log('📁 文件存在性:', exists ? '✅ 存在' : '❌ 不存在');
      
    } catch (error) {
      console.error('❌ 路径比较失败:', error);
    }
  }

  /**
   * 运行完整的资源管理器测试套件
   */
  static async runFullTestSuite(): Promise<void> {
    console.log('🧪 开始完整的资源管理器测试套件...');
    console.log('================================================');
    
    await this.testExecutablePathResolution();
    
    console.log('\n================================================');
    
    await this.comparePathResolution();
    
    console.log('\n================================================');
    console.log('🎉 所有测试完成！');
  }
}

/**
 * 快速测试函数，可在控制台中直接调用
 */
export const testResourceManager = async (): Promise<void> => {
  await ResourceManagerTester.runFullTestSuite();
};

export default ResourceManagerTester;