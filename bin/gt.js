#!/usr/bin/env node

// 确保Windows系统下能正确执行
const isWindows = process.platform === "win32";

const { program } = require("commander");
const pkg = require("../package.json");
const { createTag, listTags, loadConfig, removeTag } = require("../src/index");

// 捕获Windows下可能出现的特定错误
process.on("uncaughtException", (err) => {
  if (isWindows && (err.code === "EPERM" || err.code === "EACCES")) {
    console.error(
      `错误: 没有足够的权限执行此操作。在Windows系统下，请尝试以管理员身份运行命令行。`
    );
    process.exit(1);
  }
  // 其他错误正常抛出
  console.error(`错误: ${err.message}`);
  process.exit(1);
});

// 加载配置
const config = loadConfig();

program.version(pkg.version).description("自动生成和管理Git标签的工具");

// 创建标签命令
program
  .command("create", { isDefault: true })
  .description("基于配置创建新的Git标签")
  .argument("[tagEnv]", "标签环境（如 default, test 等）", "default")
  .argument("[versionType]", "要递增的版本部分 (major, minor, patch)", "patch")
  .action(async (tagEnv, versionType) => {
    try {
      await createTag(tagEnv, versionType, config);
    } catch (error) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

// 列出标签命令
program
  .command("list")
  .description("列出仓库中的Git标签")
  .option("-n, --number <number>", "显示的标签数量", "10")
  .option("-p, --pattern <pattern>", "按模式过滤标签")
  .option("-v, --verbose", "显示详细信息")
  .action(async (options) => {
    try {
      await listTags(options, config);
    } catch (error) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

// 删除标签命令
program
  .command("rm")
  .description("删除本地和远程的Git标签")
  .argument("[tagName]", "要删除的标签名称，不提供则删除最新创建的标签")
  .action(async (tagName) => {
    try {
      await removeTag(tagName, config);
    } catch (error) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);
