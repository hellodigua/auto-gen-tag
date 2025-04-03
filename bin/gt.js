#!/usr/bin/env node

const { program } = require("commander");
const packageJson = require("../package.json");
const { listCommand } = require("../src/commands/list");
const { newCommand } = require("../src/commands/new");
const { pushCommand } = require("../src/commands/push");

// 设置版本号和描述
program
  .version(packageJson.version)
  .description("Auto Git Tag Tool - 自动创建和管理Git标签");

// 注册命令
listCommand(program);
newCommand(program);
pushCommand(program);

// 处理未知命令
program.on("command:*", () => {
  console.error("错误: 无效的命令 %s", program.args.join(" "));
  console.log("可用命令: list, new, push");
  console.log("使用 --help 查看帮助信息");
  process.exit(1);
});

// 如果没有提供任何命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
