import { Button } from "../../components/ui/button";
import { debugResourceManager } from "../../lib/debugResourceManager";

const Dashboard = () => {
  const handleDebugResourceManager = async () => {
    console.log('🔧 开始资源管理器诊断...');
    try {
      await debugResourceManager();
    } catch (error) {
      console.error('诊断过程中出错:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">仪表盘</h1>
      <p className="text-muted-foreground">欢迎来到 MakingStore 管理系统</p>
      
      <div className="mt-6 p-4 border rounded-lg bg-muted/50">
        <h2 className="text-lg font-semibold mb-2">调试工具</h2>
        <p className="text-sm text-muted-foreground mb-3">
          如果遇到"未找到可执行文件"错误，点击下面的按钮进行诊断
        </p>
        <Button onClick={handleDebugResourceManager} variant="outline">
          🔍 诊断资源管理器
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          诊断结果将显示在浏览器控制台中（按 F12 查看）
        </p>
      </div>
    </div>
  );
};

export default Dashboard;