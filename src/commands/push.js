const chalk = require("chalk");
const { getLatestTag, createTag, pushTag } = require("../utils/git");
const { generateNextTag } = require("../utils/tagGenerator");
const { loadConfig } = require("../utils/config");

/**
 * push命令实现
 * @param {Object} program commander实例
 */
function pushCommand(program) {
  program
    .command("push")
    .description("创建一个新的Git标签并推送到远程")
    .option("-t, --type <type>", "标签类型 (major/minor/patch/prerelease)")
    .option("-p, --prefix <prefix>", "标签前缀")
    .option("-m, --message <message>", "标签消息")
    .option("--no-verify", "跳过标签验证")
    .option("-r, --remote <remote>", "远程仓库名称", "origin")
    .action(async (options) => {
      try {
        // 加载配置
        const config = await loadConfig(options);

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

        const createSuccess = await createTag(newTag, tagOptions);

        if (createSuccess) {
          console.log(chalk.green(`标签 '${newTag}' 已成功创建`));

          // 推送标签
          const pushSuccess = await pushTag(newTag, {
            remote: options.remote,
          });

          if (pushSuccess) {
            console.log(
              chalk.green(`标签 '${newTag}' 已成功推送到 ${options.remote}`)
            );
          }
        }
      } catch (error) {
        console.error(chalk.red("创建或推送标签时出错:"), error.message);
        process.exit(1);
      }
    });
}

module.exports = {
  pushCommand,
};
