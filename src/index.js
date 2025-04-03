const simpleGit = require("simple-git");
const semver = require("semver");
const chalk = require("chalk");
const { cosmiconfig } = require("cosmiconfig");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// 加载环境变量
dotenv.config();

// Git 实例
const git = simpleGit();

// 默认配置
const defaultConfig = {
  tagPattern: {
    default: process.env.GENTAG_PATTERN || "v${major}.${minor}.${patch}",
  },
  autoPush: process.env.GENTAG_AUTO_PUSH !== "false",
};

// 缓存的配置
let cachedConfig = null;

/**
 * 加载配置文件
 * 优先从 .gentagrc 或 .gentagrc.json 文件加载
 * 如果没有配置文件，则使用默认配置
 */
function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // 读取 .gentagrc 或 .gentagrc.json 文件
    let configPath = path.resolve(".gentagrc");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      cachedConfig = { ...defaultConfig, ...config };
      return cachedConfig;
    }

    configPath = path.resolve(".gentagrc.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      cachedConfig = { ...defaultConfig, ...config };
      return cachedConfig;
    }

    // 如果没有找到配置文件，使用默认配置
    cachedConfig = defaultConfig;
    return cachedConfig;
  } catch (error) {
    console.warn(`警告: 加载配置时出错 - ${error.message}`);
    cachedConfig = defaultConfig;
    return defaultConfig;
  }
}

/**
 * 检查仓库是否是 Git 仓库
 */
async function isGitRepo() {
  try {
    await git.checkIsRepo();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取指定模式的最新标签
 * @param {string} pattern 标签模式
 * @returns {Promise<string|null>} 最新标签或 null
 */
async function getLatestTag(pattern) {
  try {
    // 获取所有标签
    const tags = await git.tags();

    if (!tags.all.length) {
      return null;
    }

    // 将模式转换为正则表达式
    const patternRegex = pattern
      .replace(/\${major}/g, "(\\d+)")
      .replace(/\${minor}/g, "(\\d+)")
      .replace(/\${patch}/g, "(\\d+)")
      .replace(/\${subPatch}/g, "(\\d+)")
      .replace(/\${YYYYMMDD}/g, "(\\d{8})")
      .replace(/\${n}/g, "(\\d+)")
      .replace(/\./g, "\\.")
      .replace(/\-/g, "\\-");

    const regexPattern = new RegExp(`^${patternRegex}$`);

    // 过滤符合模式的标签
    const filteredTags = tags.all.filter((tag) => {
      return regexPattern.test(tag);
    });

    if (!filteredTags.length) {
      return null;
    }

    // 按语义化版本排序
    filteredTags.sort((a, b) => {
      // 尝试作为语义化版本排序
      const semverA = semver.valid(semver.clean(a));
      const semverB = semver.valid(semver.clean(b));

      if (semverA && semverB) {
        return semver.compare(semverB, semverA);
      }

      // 如果不是有效的语义化版本，按字母顺序排序
      return b.localeCompare(a);
    });

    return filteredTags[0];
  } catch (error) {
    console.error(`获取标签时出错: ${error.message}`);
    return null;
  }
}

/**
 * 解析标签模式中的变量
 * @param {string} tagPattern 标签模式
 * @param {Object} values 变量值
 * @returns {string} 解析后的标签
 */
function parseTagPattern(tagPattern, values) {
  return tagPattern.replace(/\${(.*?)}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * 增加版本号
 * @param {string} currentVersion 当前版本
 * @param {string} type 增加类型 (major, minor, patch)
 * @returns {Object} 新版本信息
 */
function incrementVersion(currentVersion, type, pattern) {
  // 检查版本模式
  if (
    pattern.includes("${major}") &&
    pattern.includes("${minor}") &&
    pattern.includes("${patch}")
  ) {
    // 语义化版本
    const initialVersion = process.env.GENTAG_INITIAL || "0.1.0";
    const cleaned = currentVersion
      ? semver.valid(semver.clean(currentVersion))
      : initialVersion;
    const newVersion = semver.inc(cleaned, type);
    const [major, minor, patch] = newVersion.split(".");

    return {
      major,
      minor,
      patch,
      fullVersion: newVersion,
    };
  } else if (pattern.includes("${YYYYMMDD}")) {
    // 日期版本
    const now = new Date();
    const YYYYMMDD = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;

    return {
      YYYYMMDD,
      fullVersion: YYYYMMDD,
    };
  } else if (pattern.includes("${n}")) {
    // 数字递增版本
    let n = 1;
    if (currentVersion) {
      const match = currentVersion.match(/(\d+)$/);
      if (match) {
        n = parseInt(match[1], 10) + 1;
      }
    }

    return {
      n,
      fullVersion: String(n),
    };
  }

  // 默认返回当前日期时间作为版本
  return {
    timestamp: Date.now(),
    fullVersion: Date.now().toString(),
  };
}

/**
 * 创建新标签
 * @param {string} tagEnv 标签环境
 * @param {string} versionType 版本类型
 * @param {Object} config 配置
 */
async function createTag(tagEnv = "default", versionType = "patch", config) {
  // 检查是否是 Git 仓库
  if (!(await isGitRepo())) {
    throw new Error("当前目录不是 Git 仓库");
  }

  // 获取标签模式
  const tagPattern = config.tagPattern[tagEnv];
  if (!tagPattern) {
    throw new Error(`未找到环境 "${tagEnv}" 的标签模式，请检查配置`);
  }

  // 获取最新标签
  const latestTag = await getLatestTag(tagPattern.replace(/\${.*?}/g, ".*"));

  // 增加版本
  const versionValues = incrementVersion(latestTag, versionType, tagPattern);

  // 生成新标签
  const newTag = parseTagPattern(tagPattern, versionValues);

  console.log(
    `${latestTag ? `当前标签: ${chalk.blue(latestTag)}` : "没有找到匹配的标签"}`
  );
  console.log(`新标签: ${chalk.green(newTag)}`);

  try {
    // 创建标签
    await git.addTag(newTag);
    console.log(chalk.green(`标签 ${newTag} 创建成功！`));

    // 如果配置了自动推送，则推送标签
    if (config.autoPush) {
      console.log("正在推送标签...");
      await git.pushTags();
      console.log(chalk.green("标签推送成功！"));
    } else {
      console.log(
        chalk.yellow("标签已创建但未推送。使用 git push --tags 手动推送。")
      );
    }
  } catch (error) {
    throw new Error(`创建标签失败: ${error.message}`);
  }
}

/**
 * 列出标签
 * @param {Object} options 选项
 * @param {Object} config 配置
 */
async function listTags(options, config) {
  // 检查是否是 Git 仓库
  if (!(await isGitRepo())) {
    throw new Error("当前目录不是 Git 仓库");
  }

  const limit = parseInt(options.number, 10) || 10;
  const pattern = options.pattern;
  const verbose = options.verbose;

  try {
    // 获取所有标签
    const tags = await git.tags();

    if (!tags.all.length) {
      console.log(chalk.yellow("仓库中没有标签"));
      return;
    }

    // 根据配置的标签模式分组
    const envPatterns = Object.entries(config.tagPattern);
    const groupedTags = {};

    // 对于每种环境类型，找到匹配的标签
    for (const [env, pattern] of envPatterns) {
      // 将模式转换为正则表达式
      const patternRegex = pattern
        .replace(/\${major}/g, "(\\d+)")
        .replace(/\${minor}/g, "(\\d+)")
        .replace(/\${patch}/g, "(\\d+)")
        .replace(/\${subPatch}/g, "(\\d+)")
        .replace(/\${YYYYMMDD}/g, "(\\d{8})")
        .replace(/\${n}/g, "(\\d+)")
        .replace(/\./g, "\\.")
        .replace(/\-/g, "\\-");

      const regexPattern = new RegExp(`^${patternRegex}$`);

      const matchingTags = tags.all.filter((tag) => {
        return regexPattern.test(tag);
      });

      // 按时间排序
      matchingTags.sort((a, b) => {
        // 尝试作为语义化版本排序
        const semverA = semver.valid(semver.clean(a));
        const semverB = semver.valid(semver.clean(b));

        if (semverA && semverB) {
          return semver.compare(semverB, semverA);
        }

        // 如果不是有效的语义化版本，按字母顺序排序
        return b.localeCompare(a);
      });

      groupedTags[env] = matchingTags.slice(0, limit);
    }

    // 如果指定了模式，只显示匹配的标签
    if (pattern) {
      const filteredTags = tags.all.filter((tag) => tag.includes(pattern));
      filteredTags.sort((a, b) => b.localeCompare(a));

      console.log(chalk.bold(`匹配模式 "${pattern}" 的标签:`));
      await displayTags(filteredTags.slice(0, limit), verbose);
      return;
    }

    // 显示各环境的标签
    for (const [env, envTags] of Object.entries(groupedTags)) {
      if (envTags.length) {
        console.log(
          chalk.bold(
            `\n环境 "${env}" 的标签 (模式: ${config.tagPattern[env]}):`
          )
        );
        await displayTags(envTags, verbose);
      }
    }
  } catch (error) {
    throw new Error(`列出标签失败: ${error.message}`);
  }
}

/**
 * 显示标签详情
 * @param {Array} tags 标签数组
 * @param {boolean} verbose 是否显示详细信息
 */
async function displayTags(tags, verbose) {
  if (!tags.length) {
    console.log(chalk.yellow("  没有找到标签"));
    return;
  }

  for (const tag of tags) {
    if (verbose) {
      try {
        // 获取标签详情
        const tagInfo = await git.show(["--quiet", tag]);
        const lines = tagInfo.split("\n");
        const date =
          lines.find((line) => line.startsWith("Date:")) || "未知日期";
        const message =
          lines.find(
            (line) =>
              line.trim() &&
              !line.startsWith("commit") &&
              !line.startsWith("tag") &&
              !line.startsWith("Tagger") &&
              !line.startsWith("Date:")
          ) || "无提交信息";

        console.log(
          `  ${chalk.green(tag)} - ${date.trim()} - ${message.trim()}`
        );
      } catch (error) {
        console.log(`  ${chalk.green(tag)} - 无法获取详情`);
      }
    } else {
      console.log(`  ${chalk.green(tag)}`);
    }
  }
}

module.exports = {
  createTag,
  listTags,
  loadConfig,
};
