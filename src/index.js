const simpleGit = require("simple-git");
const semver = require("semver");
const chalk = require("chalk");
const { cosmiconfig } = require("cosmiconfig");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

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
 * 将标签模式转换为正则表达式
 * @param {string} pattern 标签模式
 * @returns {RegExp} 正则表达式
 */
function patternToRegex(pattern) {
  // 检查是否是日期格式
  if (pattern.includes("${YYYYMMDD}")) {
    return new RegExp(
      "^" +
        pattern
          .replace(/\${YYYYMMDD}/g, "\\d{8}") // 简化日期匹配
          .replace(/\./g, "\\.")
          .replace(/\-/g, "\\-") +
        "$"
    );
  }

  // 检查是否是简单数字格式
  if (pattern.includes("${n}")) {
    return new RegExp(
      "^" +
        pattern
          .replace(/\${n}/g, "\\d{1,5}") // 限制数字长度，避免匹配到日期
          .replace(/\./g, "\\.")
          .replace(/\-/g, "\\-") +
        "$"
    );
  }

  // 语义化版本格式
  return new RegExp(
    "^" +
      pattern
        .replace(/\${major}/g, "\\d+")
        .replace(/\${minor}/g, "\\d+")
        .replace(/\${patch}/g, "\\d+")
        .replace(/\${subPatch}/g, "\\d+")
        .replace(/\./g, "\\.")
        .replace(/\-/g, "\\-") +
      "$"
  );
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

    const regexPattern = patternToRegex(pattern);

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
      const cleanA = a.replace(/^[^\d]+/, ""); // 移除版本号前的前缀
      const cleanB = b.replace(/^[^\d]+/, "");
      const semverA = semver.valid(semver.clean(cleanA));
      const semverB = semver.valid(semver.clean(cleanB));

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
    let cleaned;

    if (currentVersion) {
      // 提取版本号部分（移除前缀）
      const versionMatch = currentVersion.match(/\d+\.\d+\.\d+/);
      cleaned = versionMatch ? versionMatch[0] : initialVersion;
    } else {
      cleaned = initialVersion;
    }

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
 * 检查标签是否存在
 * @param {string} tag 标签名
 * @returns {Promise<boolean>} 是否存在
 */
async function isTagExists(tag) {
  try {
    const tags = await git.tags();
    return tags.all.includes(tag);
  } catch (error) {
    return false;
  }
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
  const latestTag = await getLatestTag(tagPattern);
  console.log(
    `${latestTag ? `当前标签: ${chalk.blue(latestTag)}` : "没有找到匹配的标签"}`
  );

  // 增加版本
  let versionValues = incrementVersion(latestTag, versionType, tagPattern);
  let newTag = parseTagPattern(tagPattern, versionValues);

  // 如果标签已存在，继续递增版本直到找到可用的标签
  let attempts = 0;
  const maxAttempts = 100; // 防止无限循环
  while ((await isTagExists(newTag)) && attempts < maxAttempts) {
    versionValues = incrementVersion(newTag, versionType, tagPattern);
    newTag = parseTagPattern(tagPattern, versionValues);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("无法生成唯一的标签，请检查版本规则");
  }

  console.log(`新标签: ${chalk.green(newTag)}`);

  try {
    // 创建标签
    await git.addTag(newTag);
    console.log(chalk.green(`标签 ${newTag} 创建成功！`));

    // 如果配置了自动推送，则只推送新创建的标签
    if (config.autoPush) {
      console.log("正在推送标签...");
      try {
        await git.push(["origin", `refs/tags/${newTag}`]);
        console.log(chalk.green("标签推送成功！"));
      } catch (error) {
        console.error(chalk.red(`推送标签失败: ${error.message}`));
        console.log(
          chalk.yellow(
            `你可以稍后使用 git push origin refs/tags/${newTag} 手动推送此标签。`
          )
        );
      }
    } else {
      console.log(
        chalk.yellow(
          `标签已创建但未推送。使用 git push origin refs/tags/${newTag} 手动推送。`
        )
      );
    }
  } catch (error) {
    throw new Error(`创建标签失败: ${error.message}`);
  }
}

/**
 * 获取指定环境的标签列表
 * @param {string} env 环境名称
 * @param {object} config 配置对象
 * @returns {string[]} 标签列表
 */
function getTagsByEnv(env, config) {
  const pattern = config.tagPattern[env];
  if (!pattern) {
    return [];
  }
  const regex = patternToRegex(pattern);
  const allTags = execSync("git tag", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);
  return allTags.filter((tag) => regex.test(tag));
}

/**
 * 列出标签
 * @param {object} options 选项
 * @param {object} config 配置对象
 */
function listTags(options, config) {
  const pattern = options.pattern;
  if (pattern) {
    // 如果指定了模式，则按模式匹配
    const env = Object.keys(config.tagPattern).find((key) => key === pattern);
    if (!env) {
      console.log(`匹配模式 "${pattern}" 的标签:`);
      console.log("  没有找到标签");
      return;
    }
    const tags = getTagsByEnv(env, config);
    console.log(`环境 "${env}" 的标签 (模式: ${config.tagPattern[env]}):`);
    if (tags.length === 0) {
      console.log("  没有找到标签");
    } else {
      tags.forEach((tag) => {
        if (options.verbose) {
          const info = execSync(`git show ${tag} --format="%ai %an" -s`, {
            encoding: "utf-8",
          }).trim();
          console.log(`  ${tag} (${info})`);
        } else {
          console.log(`  ${tag}`);
        }
      });
    }
    return;
  }

  // 如果没有指定模式，则列出所有环境的标签
  Object.keys(config.tagPattern).forEach((env) => {
    const tags = getTagsByEnv(env, config);
    if (tags.length > 0) {
      console.log(`\n环境 "${env}" 的标签 (模式: ${config.tagPattern[env]}):`);
      tags.forEach((tag) => {
        if (options.verbose) {
          const info = execSync(`git show ${tag} --format="%ai %an" -s`, {
            encoding: "utf-8",
          }).trim();
          console.log(`  ${tag} (${info})`);
        } else {
          console.log(`  ${tag}`);
        }
      });
    }
  });
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

/**
 * 获取最新创建的标签
 * @returns {Promise<string|null>} 最新创建的标签或 null
 */
async function getLatestCreatedTag() {
  try {
    // 获取所有标签及其创建时间
    const tagsOutput = execSync(
      'git for-each-ref --sort=-creatordate --format="%(refname:short)" refs/tags/',
      {
        encoding: "utf-8",
      }
    ).trim();

    const tags = tagsOutput.split("\n").filter(Boolean);
    return tags.length > 0 ? tags[0] : null;
  } catch (error) {
    console.error(`获取最新标签时出错: ${error.message}`);
    return null;
  }
}

/**
 * 删除本地和远程的Git标签
 * @param {string|null} tagName 要删除的标签名称，如果为null则删除最新创建的标签
 * @param {Object} config 配置
 */
async function removeTag(tagName, config) {
  // 检查是否是 Git 仓库
  if (!(await isGitRepo())) {
    throw new Error("当前目录不是 Git 仓库");
  }

  // 如果未提供标签名，则尝试获取最新创建的标签
  let targetTag = tagName;
  if (!targetTag) {
    targetTag = await getLatestCreatedTag();
    if (!targetTag) {
      throw new Error("未找到可删除的标签");
    }
    console.log(`将删除最新创建的标签: ${chalk.blue(targetTag)}`);
  }

  // 检查标签是否存在
  if (!(await isTagExists(targetTag))) {
    throw new Error(`标签 "${targetTag}" 不存在`);
  }

  try {
    // 删除本地标签
    await git.tag(["-d", targetTag]);
    console.log(chalk.green(`本地标签 ${targetTag} 已成功删除`));

    // 如果配置了自动推送，则同时删除远程标签
    if (config.autoPush) {
      console.log("正在删除远程标签...");
      try {
        await git.push(["origin", `:refs/tags/${targetTag}`]);
        console.log(chalk.green(`远程标签 ${targetTag} 已成功删除`));
      } catch (error) {
        console.error(chalk.red(`删除远程标签失败: ${error.message}`));
        console.log(
          chalk.yellow(
            `你可以稍后使用 git push origin :refs/tags/${targetTag} 手动删除远程标签。`
          )
        );
      }
    } else {
      console.log(
        chalk.yellow(
          `已删除本地标签，但未删除远程标签。使用 git push origin :refs/tags/${targetTag} 手动删除远程标签。`
        )
      );
    }
  } catch (error) {
    throw new Error(`删除标签失败: ${error.message}`);
  }
}

module.exports = {
  createTag,
  listTags,
  loadConfig,
  removeTag,
  getLatestCreatedTag,
};
