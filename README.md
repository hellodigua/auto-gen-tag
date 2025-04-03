# auto-gen-tag

auto-gen-tag 是一个 node 脚本，它的作用是自动创建 tag，原理是通过查询特定规则的 tag 标签，查询到最近的 git tag 标签，然后创建一个更新的标签。

## 项目背景

在现代软件开发中，Git 标签对于版本管理至关重要。手动创建和管理标签可能会导致错误或不一致。auto-gen-tag 旨在自动化这一过程，确保标签的一致性和正确性，特别适合以下场景：

- 持续集成/持续部署(CI/CD)环境
- 需要频繁发布版本的项目
- 多人协作的开发团队
- 需要严格版本控制的项目

## 安装

```bash
npm i -g auto-gen-tag
```

## 使用方法

### 基本命令

```bash
# 查询最近的所有tag
gt list

# 创建一个最新tag
gt new

# 创建一个最新tag并推送
gt push
```

### 命令详解

#### gt list

列出仓库中的所有标签，按时间顺序排序。

```bash
gt list [options]
```

选项：

- `-n, --number <n>`: 显示最近 n 个标签（默认：10）
- `-p, --pattern <pattern>`: 按指定模式过滤标签
- `-v, --verbose`: 显示详细信息，包括提交信息和日期

#### gt new

根据定义的规则，创建一个新的标签。

```bash
gt new [options]
```

选项：

- `-t, --type <type>`: 指定标签类型（major/minor/patch）
- `-p, --prefix <prefix>`: 设置标签前缀
- `-m, --message <message>`: 添加标签消息
- `--no-verify`: 跳过标签验证

#### gt push

创建一个新标签并推送到远程仓库。

```bash
gt push [options]
```

选项：

- 包含 `gt new` 的所有选项
- `-r, --remote <remote>`: 指定远程仓库（默认：origin）

### 标签规则说明

auto-gen-tag 支持多种标签生成规则：

1. **语义化版本**

   - 遵循 [Semantic Versioning](https://semver.org/) 规范
   - 示例：v1.0.0 → v1.0.1 → v1.1.0 → v2.0.0

2. **日期版本**

   - 基于日期的版本号格式
   - 示例：v20230401 → v20230402

3. **递增数字**

   - 简单的数字递增
   - 示例：v1 → v2 → v3

4. **自定义格式**
   - 通过配置文件定义您自己的格式

## 配置选项

auto-gen-tag 可以通过以下方式进行配置：

### 配置文件

在项目根目录创建 `.gentagrc` 或 `.gentagrc.json` 文件：

```json
{
  "tagPattern": "v${major}.${minor}.${patch}",
  "initialTag": "v0.1.0",
  "branchPolicy": {
    "main": "minor",
    "release/*": "patch",
    "develop": "prerelease"
  },
  "commitMessagePattern": "^(feat|fix|chore|docs|style|refactor|perf|test)"
}
```

### 环境变量

您也可以通过环境变量配置：

```
GENTAG_PATTERN=v${major}.${minor}.${patch}
GENTAG_INITIAL=v0.1.0
```

## 集成示例

### GitHub Actions 集成

```yaml
name: Auto Tag

on:
  push:
    branches: [main]

jobs:
  auto-tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
        with:
          node-version: "16"
      - run: npm i -g auto-gen-tag
      - run: gt push
```

### GitLab CI 集成

```yaml
auto-tag:
  stage: deploy
  script:
    - npm i -g auto-gen-tag
    - gt push
  only:
    - main
```

## 故障排除

### 常见问题

1. **命令 'gt' 未找到**

   - 确保全局安装了 auto-gen-tag
   - 检查 PATH 环境变量

2. **权限错误**

   - 确保您有足够的 Git 仓库权限
   - 在 CI/CD 环境中，确保设置了正确的访问令牌

3. **标签冲突**
   - 使用 `gt list` 检查现有标签
   - 使用 `-f, --force` 选项覆盖现有标签

## 贡献指南

欢迎通过以下方式贡献：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 版本历史

- 1.0.0: 初始版本

## 许可证

本项目采用 [MIT 许可证](LICENSE) 进行许可。

## 作者

[您的名字]

---

如果您发现这个项目有用，别忘了给它点个 ⭐！
