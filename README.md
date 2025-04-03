# auto-gen-tag

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

`auto-gen-tag` 是一个专注于自动创建和管理 Git 标签 的工具，用于简化发版操作流程。它通过识别最近的 Git 标签，并根据配置规则智能递增版本号，从而生成新的标签。

## 📦 安装

```bash
npm i -g auto-gen-tag
```

## 🚀 快速开始

### 基本使用

无需配置，直接运行：

```bash
gt
```

这将使用默认规则（`v${major}.${minor}.${patch}`）找到最新标签并递增补丁版本号。

### 命令语法

```bash
gt [配置模式] [版本类型]
```

- **配置模式**：对应配置文件中 `tagPattern` 的键名（如 `default`、`test`）
- **版本类型**：指定要递增的版本部分（`major`、`minor`、`patch`）

### 配置文件

在项目根目录创建 `.gentagrc` 或 `.gentagrc.json` 文件：

```json
{
  "tagPattern": {
    "default": "v${major}.${minor}.${patch}",
    "test": "test-${major}.${minor}.${patch}",
    "prod": "release-${major}.${minor}.${patch}",
    "daily": "v${YYYYMMDD}",
    "simple": "v${n}"
  },
  "autoPush": true
}
```

### 环境变量

也可以通过环境变量配置：

```bash
export GENTAG_PATTERN="v${major}.${minor}.${patch}"
export GENTAG_INITIAL="v0.1.0"
export GENTAG_AUTO_PUSH=false
```

### 示例

```bash
# 使用默认模式，递增补丁版本（v0.1.0 -> v0.1.1）
gt

# 使用测试环境，递增补丁版本（test-v0.1.0 -> test-v0.1.1）
gt test

# 使用生产环境，递增次要版本（release-v0.1.0 -> release-v0.2.0）
gt prod minor

# 使用日期版本（v20230401 -> v20230402）
gt daily

# 使用递增数字版本（v1 -> v2）
gt simple

# 查看最近10个标签
gt list -n 10

# 查看包含"test"的标签
gt list -p "test"

# 显示标签详细信息
gt list -v

# 删除标签 test-0.1.3（包括远程标签）
gt rm test-0.1.3

# 删除最近创建的标签
gt rm
```

## 其他命令选项

### gt list

用于查看最近创建的标签

```bash
gt list [选项]
```

选项：

- `-n, --number <n>`: 显示最近 n 个标签（默认：10）
- `-p, --pattern <pattern>`: 按指定模式过滤标签
- `-v, --verbose`: 显示详细信息，包括提交信息和日期

### gt rm

用于删除本地和远程的 Git 标签

```bash
gt rm [标签名称]
```

- 如果提供`标签名称`，则删除指定的标签
- 如果不提供参数，则自动删除最近创建的标签

示例：

```bash
# 删除标签 test-0.1.3
gt rm test-0.1.3

# 删除最近创建的标签
gt rm
```

该命令将：

1. 删除本地标签
2. 若配置文件中 `autoPush` 为 `true`，则同时删除远程标签

## 💡 最佳实践

- **CI/CD 集成**：在构建流程中添加 `gt` 命令自动生成发布标签
- **环境分离**：为测试和生产环境使用不同的标签前缀
- **版本策略**：制定清晰的版本递增策略，何时递增主版本、次版本和补丁版本

## Windows 系统使用说明

如果遇到类似以下错误：

```
gt : 无法加载文件，因为在此系统上禁止运行脚本。
```

有两种解决方法：

1. **临时解决方案**：使用 CMD 命令行（而非 PowerShell）运行 `gt` 命令

2. **永久解决方案**：以管理员身份运行 PowerShell，执行以下命令放宽执行策略：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## 📝 版本历史

- **1.0.0**: 初始版本
