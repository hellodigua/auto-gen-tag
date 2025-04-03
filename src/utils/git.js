const simpleGit = require("simple-git");
const chalk = require("chalk");

/**
 * 获取Git实例
 * @param {string} baseDir 工作目录
 * @returns {Object} Simple Git实例
 */
function getGit(baseDir = process.cwd()) {
  return simpleGit({ baseDir, binary: "git" });
}

/**
 * 获取所有标签
 * @param {Object} options 选项
 * @returns {Promise<Array>} 标签列表
 */
async function getAllTags(options = {}) {
  const git = getGit();

  try {
    const result = await git.tags();
    let tags = result.all || [];

    // 如果指定了过滤模式，则过滤标签
    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      tags = tags.filter((tag) => regex.test(tag));
    }

    // 按照时间排序（最新的在前）
    if (tags.length > 0) {
      const tagDetails = await Promise.all(
        tags.map(async (tag) => {
          try {
            const showResult = await git.show([tag, "--format=%ai", "--quiet"]);
            const date = showResult.trim().split("\n")[0];
            return {
              name: tag,
              date: new Date(date),
            };
          } catch (err) {
            return {
              name: tag,
              date: new Date(0), // 默认值
            };
          }
        })
      );

      tagDetails.sort((a, b) => b.date - a.date);
      tags = tagDetails.map((tag) => tag.name);
    }

    // 如果指定了数量限制，则截取指定数量
    if (options.number && options.number > 0) {
      tags = tags.slice(0, options.number);
    }

    return tags;
  } catch (error) {
    console.error(chalk.red("获取标签失败:"), error.message);
    return [];
  }
}

/**
 * 获取最新的标签
 * @param {Object} options 选项
 * @returns {Promise<string|null>} 最新标签或null
 */
async function getLatestTag(options = {}) {
  const tags = await getAllTags(options);
  return tags.length > 0 ? tags[0] : null;
}

/**
 * 获取当前分支名
 * @returns {Promise<string>} 当前分支名
 */
async function getCurrentBranch() {
  const git = getGit();
  try {
    const result = await git.branch();
    return result.current;
  } catch (error) {
    console.error(chalk.red("获取当前分支失败:"), error.message);
    return "";
  }
}

/**
 * 创建标签
 * @param {string} tagName 标签名
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 是否成功
 */
async function createTag(tagName, options = {}) {
  const git = getGit();
  try {
    const tagOptions = [];
    if (options.message) {
      tagOptions.push("-m", options.message);
    }

    await git.tag([...tagOptions, tagName]);
    console.log(chalk.green(`标签 '${tagName}' 创建成功`));
    return true;
  } catch (error) {
    console.error(chalk.red(`创建标签 '${tagName}' 失败:`), error.message);
    return false;
  }
}

/**
 * 推送标签到远程
 * @param {string} tagName 标签名
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 是否成功
 */
async function pushTag(tagName, options = {}) {
  const git = getGit();
  const remote = options.remote || "origin";

  try {
    await git.push(remote, tagName);
    console.log(chalk.green(`标签 '${tagName}' 已推送到 ${remote}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`推送标签 '${tagName}' 失败:`), error.message);
    return false;
  }
}

module.exports = {
  getGit,
  getAllTags,
  getLatestTag,
  getCurrentBranch,
  createTag,
  pushTag,
};
