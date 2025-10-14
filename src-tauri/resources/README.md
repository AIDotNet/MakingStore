# Resources 目录

这个目录用于存放需要与 Tauri 应用程序一起打包的外部文件，包括可执行文件（.exe）。

## 目录结构建议

```
resources/
├── bin/                    # 可执行文件目录
│   ├── windows/           # Windows 平台的可执行文件
│   │   ├── tool1.exe
│   │   └── tool2.exe
│   ├── macos/             # macOS 平台的可执行文件
│   │   ├── tool1
│   │   └── tool2
│   └── linux/             # Linux 平台的可执行文件
│       ├── tool1
│       └── tool2
├── data/                  # 数据文件
│   ├── config.json
│   └── templates/
└── assets/                # 其他资源文件
    ├── images/
    └── docs/
```

## 使用方法

1. 将你的可执行文件放入相应的平台目录中
2. 在 Rust 代码中使用 `app.path().resolve()` 来获取资源路径
3. 在 JavaScript 中使用 `@tauri-apps/api/path` 的 `resolveResource` 函数

## 示例代码

### Rust 中访问资源

```rust
use tauri::Manager;

#[tauri::command]
async fn run_external_tool(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle
        .path()
        .resolve("bin/windows/tool1.exe", tauri::api::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve resource: {}", e))?;
    
    // 执行外部程序
    let output = std::process::Command::new(&resource_path)
        .output()
        .map_err(|e| format!("Failed to execute: {}", e))?;
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

### JavaScript 中访问资源

```javascript
import { resolveResource } from '@tauri-apps/api/path';
import { Command } from '@tauri-apps/api/shell';

async function runExternalTool() {
    try {
        const resourcePath = await resolveResource('bin/windows/tool1.exe');
        const command = new Command('run-tool', [resourcePath]);
        const output = await command.execute();
        console.log(output.stdout);
    } catch (error) {
        console.error('Error running external tool:', error);
    }
}
```

## 注意事项

1. 确保可执行文件具有正确的权限
2. 不同平台的可执行文件需要分别编译和放置
3. 资源文件会增加应用程序的大小，请合理使用
4. 在开发模式下，资源文件路径可能与生产环境不同