# auto-gen-tag

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> 一个智能的 Git 标签自动生成工具，简化本地操作流程。

`auto-gen-tag` 是一个专注于自动创建和管理 Git 标签 的工具，用于。它通过识别最近的 Git 标签，并根据配置规则智能递增版本号，从而生成新的标签。

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

### 查看现有标签

```bash
gt list
```

## 配置

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

## 🛠️ 使用详解

### 命令语法

```bash
gt [配置模式] [版本类型]
```

- **配置模式**：对应配置文件中 `tagPattern` 的键名（如 `default`、`test`）
- **版本类型**：指定要递增的版本部分（`major`、`minor`、`patch`）

### 示例

```bash
# 使用默认模式，递增补丁版本
gt

# 使用测试环境，递增补丁版本
gt test

# 使用生产环境，递增次要版本
gt prod minor

# 查看最近10个标签
gt list -n 10

# 查看包含"test"的标签
gt list -p "test"

# 显示标签详细信息
gt list -v
```

### 版本规则详解

#### 语义化版本（SemVer）

格式：`v${major}.${minor}.${patch}`

- **major**：主版本号，不兼容的 API 修改
- **minor**：次版本号，向下兼容的功能性新增
- **patch**：补丁版本号，向下兼容的问题修正

示例演进：`v1.0.0` → `v1.0.1` → `v1.1.0` → `v2.0.0`

#### 日期版本

格式：`v${YYYYMMDD}`

示例演进：`v20230401` → `v20230402`

#### 递增数字

格式：`v${n}`

示例演进：`v1` → `v2` → `v3`

## 📋 命令选项

### gt list

```bash
gt list [选项]
```

选项：

- `-n, --number <n>`: 显示最近 n 个标签（默认：10）
- `-p, --pattern <pattern>`: 按指定模式过滤标签
- `-v, --verbose`: 显示详细信息，包括提交信息和日期

## 💡 最佳实践

- **CI/CD 集成**：在构建流程中添加 `gt` 命令自动生成发布标签
- **环境分离**：为测试和生产环境使用不同的标签前缀
- **版本策略**：制定清晰的版本递增策略，何时递增主版本、次版本和补丁版本

## 📝 版本历史

- **1.0.0**: 初始版本
