const chalk = require("chalk");
const { getAllTags } = require("../utils/git");
const { loadConfig } = require("../utils/config");

/**
 * 格式化输出标签信息
 * @param {Array} tags 标签列表
 * @param {boolean} verbose 是否显示详细信息
 */
async function displayTags(tags, verbose = false) {
  if (tags.length === 0) {
    console.log(chalk.yellow("没有找到标签"));
    return;
  }

  console.log(chalk.bold("最近的Git标签:"));

  for (const tag of tags) {
    console.log(chalk.green(`  ${tag}`));
  }

  console.log("\n共找到 " + chalk.cyan(tags.length) + " 个标签");
}

/**
 * list命令实现
 * @param {Object} program commander实例
 */
function listCommand(program) {
  program
    .command("list")
    .alias("ls")
    .description("列出存储库中的Git标签")
    .option("-n, --number <number>", "显示的标签数量", parseInt)
    .option("-p, --pattern <pattern>", "过滤标签的正则表达式模式")
    .option("-v, --verbose", "显示详细信息")
    .action(async (options) => {
      try {
        // 加载配置
        const config = await loadConfig(options);

        // 获取标签
        const tags = await getAllTags({
          number: options.number,
          pattern: options.pattern,
        });

        // 显示标签
        await displayTags(tags, options.verbose);
      } catch (error) {
        console.error(chalk.red("列出标签时出错:"), error.message);
        process.exit(1);
      }
    });
}

module.exports = {
  listCommand,
};
