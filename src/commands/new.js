const chalk = require("chalk");
const inquirer = require("inquirer");
const { getLatestTag, createTag } = require("../utils/git");
const { generateNextTag } = require("../utils/tagGenerator");
const { loadConfig } = require("../utils/config");

/**
 * 询问用户标签类型
 * @returns {Promise<Object>} 用户选择的选项
 */
async function promptTagType() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "选择要创建的标签类型:",
      choices: [
        { name: "补丁版本 (v1.0.0 -> v1.0.1)", value: "patch" },
        { name: "次要版本 (v1.0.0 -> v1.1.0)", value: "minor" },
        { name: "主要版本 (v1.0.0 -> v2.0.0)", value: "major" },
        { name: "预发布版本 (v1.0.0 -> v1.0.1-alpha.0)", value: "prerelease" },
      ],
      default: "patch",
    },
  ]);

  return answers;
}

/**
 * new命令实现
 * @param {Object} program commander实例
 */
function newCommand(program) {
  program
    .command("new")
    .description("创建一个新的Git标签")
    .option("-t, --type <type>", "标签类型 (major/minor/patch/prerelease)")
    .option("-p, --prefix <prefix>", "标签前缀")
    .option("-m, --message <message>", "标签消息")
    .option("--no-verify", "跳过标签验证")
    .option("-i, --interactive", "交互式模式", false)
    .action(async (options) => {
      try {
        // 加载配置
        const config = await loadConfig(options);

        // 如果是交互式模式，询问用户标签类型
        if (options.interactive && !options.type) {
          const answers = await promptTagType();
          options.type = answers.type;
        }

        // 获取最新标签
        const latestTag = await getLatestTag();
        console.log(chalk.blue(`最新的标签: ${latestTag || "没有找到标签"}`));

        // 生成新标签
        const newTag = await generateNextTag(latestTag, config, options);
        console.log(chalk.blue(`新标签将为: ${newTag}`));

        // 创建标签
        const tagOptions = {
          message: options.message,
          verify: options.verify,
        };

        const success = await createTag(newTag, tagOptions);

        if (success) {
          console.log(chalk.green(`标签 '${newTag}' 已成功创建`));
        }
      } catch (error) {
        console.error(chalk.red("创建标签时出错:"), error.message);
        process.exit(1);
      }
    });
}

module.exports = {
  newCommand,
};
