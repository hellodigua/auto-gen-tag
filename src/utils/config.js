const { cosmiconfig } = require("cosmiconfig");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// 默认配置
const defaultConfig = {
  tagPattern: "v${major}.${minor}.${patch}",
  initialTag: "v0.1.0",
  branchPolicy: {
    main: "minor",
    "release/*": "patch",
    develop: "prerelease",
  },
  commitMessagePattern: "^(feat|fix|chore|docs|style|refactor|perf|test)",
};

/**
 * 从.env文件加载环境变量
 */
function loadEnvVars() {
  // 尝试加载.env文件
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/**
 * 从环境变量中获取配置
 * @returns {Object} 从环境变量中提取的配置
 */
function getConfigFromEnv() {
  const config = {};

  if (process.env.GENTAG_PATTERN) {
    config.tagPattern = process.env.GENTAG_PATTERN;
  }

  if (process.env.GENTAG_INITIAL) {
    config.initialTag = process.env.GENTAG_INITIAL;
  }

  return config;
}

/**
 * 加载配置文件
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfigFile() {
  const explorer = cosmiconfig("gentag", {
    searchPlaces: [
      ".gentagrc",
      ".gentagrc.json",
      ".gentagrc.yaml",
      ".gentagrc.yml",
      ".gentagrc.js",
      "package.json",
    ],
    packageProp: "gentag",
  });

  try {
    const result = await explorer.search();
    return result ? result.config : {};
  } catch (error) {
    console.error("加载配置文件时出错:", error.message);
    return {};
  }
}

/**
 * 加载配置，优先级：
 * 1. 命令行参数
 * 2. 环境变量
 * 3. 配置文件
 * 4. 默认配置
 *
 * @param {Object} cliOptions 命令行选项
 * @returns {Promise<Object>} 合并后的配置
 */
async function loadConfig(cliOptions = {}) {
  loadEnvVars();

  const fileConfig = await loadConfigFile();
  const envConfig = getConfigFromEnv();

  // 合并配置，优先级从低到高
  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
    ...cliOptions,
  };
}

module.exports = {
  loadConfig,
  defaultConfig,
};
