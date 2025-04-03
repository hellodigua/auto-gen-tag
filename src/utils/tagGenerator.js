const semver = require("semver");
const { getCurrentBranch } = require("./git");

/**
 * 从标签中提取语义化版本号
 * @param {string} tag 标签名
 * @returns {Object|null} 提取的版本信息或null
 */
function extractSemverInfo(tag) {
  if (!tag) return null;

  // 提取版本号（移除前缀）
  let version = tag;
  const prefixMatch = tag.match(/^[^0-9]*/);
  const prefix = prefixMatch ? prefixMatch[0] : "";

  if (prefix) {
    version = tag.substring(prefix.length);
  }

  // 尝试解析semver
  const parsed = semver.parse(version);
  if (!parsed) return null;

  return {
    prefix,
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    prerelease: parsed.prerelease.length > 0 ? parsed.prerelease.join(".") : "",
    build: parsed.build.length > 0 ? parsed.build.join(".") : "",
  };
}

/**
 * 从标签中提取日期版本信息
 * @param {string} tag 标签名
 * @returns {Object|null} 提取的版本信息或null
 */
function extractDateVersionInfo(tag) {
  if (!tag) return null;

  // 匹配类似 v20230401 格式的标签
  const match = tag.match(/^([^0-9]*)(\d{8})$/);
  if (!match) return null;

  const prefix = match[1];
  const dateStr = match[2];

  return {
    prefix,
    dateStr,
  };
}

/**
 * 从标签中提取数字版本信息
 * @param {string} tag 标签名
 * @returns {Object|null} 提取的版本信息或null
 */
function extractNumberInfo(tag) {
  if (!tag) return null;

  // 匹配类似 v1, v2, v3 格式的标签
  const match = tag.match(/^([^0-9]*)(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const number = parseInt(match[2], 10);

  return {
    prefix,
    number,
  };
}

/**
 * 生成下一个语义化版本标签
 * @param {string} currentTag 当前标签
 * @param {string} type 更新类型 (major/minor/patch/prerelease)
 * @param {string} prefix 标签前缀
 * @returns {string} 新标签
 */
function generateNextSemverTag(currentTag, type = "patch", prefix = "v") {
  const versionInfo = extractSemverInfo(currentTag);

  let newVersion;
  if (!versionInfo) {
    // 如果没有现有标签或无法解析，则使用初始版本
    newVersion = "0.1.0";
  } else {
    const currentVersion = `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`;
    const tagPrefix = prefix || versionInfo.prefix;

    switch (type) {
      case "major":
        newVersion = semver.inc(currentVersion, "major");
        break;
      case "minor":
        newVersion = semver.inc(currentVersion, "minor");
        break;
      case "prerelease":
        newVersion = semver.inc(currentVersion, "prerelease", "alpha");
        break;
      case "patch":
      default:
        newVersion = semver.inc(currentVersion, "patch");
        break;
    }

    return `${tagPrefix}${newVersion}`;
  }

  return `${prefix}${newVersion}`;
}

/**
 * 生成下一个日期版本标签
 * @param {string} currentTag 当前标签
 * @param {string} prefix 标签前缀
 * @returns {string} 新标签
 */
function generateNextDateTag(currentTag, prefix = "v") {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const dateStr = `${year}${month}${day}`;

  const versionInfo = extractDateVersionInfo(currentTag);
  const tagPrefix = versionInfo ? versionInfo.prefix : prefix;

  return `${tagPrefix}${dateStr}`;
}

/**
 * 生成下一个数字版本标签
 * @param {string} currentTag 当前标签
 * @param {string} prefix 标签前缀
 * @returns {string} 新标签
 */
function generateNextNumberTag(currentTag, prefix = "v") {
  const versionInfo = extractNumberInfo(currentTag);

  if (!versionInfo) {
    return `${prefix}1`;
  }

  const nextNumber = versionInfo.number + 1;
  const tagPrefix = prefix || versionInfo.prefix;

  return `${tagPrefix}${nextNumber}`;
}

/**
 * 根据标签模板生成标签
 * @param {Object} versionInfo 版本信息
 * @param {string} template 标签模板
 * @returns {string} 生成的标签
 */
function generateTagFromTemplate(versionInfo, template) {
  if (!versionInfo) return template;

  let result = template;

  for (const [key, value] of Object.entries(versionInfo)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }

  return result;
}

/**
 * 根据配置和当前分支确定版本类型
 * @param {Object} config 配置对象
 * @returns {Promise<string>} 版本类型
 */
async function determineVersionType(config) {
  if (!config.branchPolicy) return "patch";

  const currentBranch = await getCurrentBranch();
  if (!currentBranch) return "patch";

  // 直接匹配
  if (config.branchPolicy[currentBranch]) {
    return config.branchPolicy[currentBranch];
  }

  // 通配符匹配
  for (const [branchPattern, type] of Object.entries(config.branchPolicy)) {
    if (branchPattern.includes("*")) {
      const regex = new RegExp(`^${branchPattern.replace("*", ".*")}$`);
      if (regex.test(currentBranch)) {
        return type;
      }
    }
  }

  return "patch";
}

/**
 * 生成下一个标签
 * @param {string} currentTag 当前标签
 * @param {Object} config 配置
 * @param {Object} options 选项
 * @returns {Promise<string>} 新标签
 */
async function generateNextTag(currentTag, config = {}, options = {}) {
  const tagPattern =
    options.pattern || config.tagPattern || "v${major}.${minor}.${patch}";
  const prefix = options.prefix || "";
  const type = options.type || (await determineVersionType(config));

  // 检测当前标签类型
  if (extractSemverInfo(currentTag)) {
    // 如果是语义化版本
    const nextTag = generateNextSemverTag(currentTag, type, prefix);

    // 如果有模板，则应用模板
    if (tagPattern && tagPattern !== "v${major}.${minor}.${patch}") {
      const versionInfo = extractSemverInfo(nextTag);
      return generateTagFromTemplate(versionInfo, tagPattern);
    }

    return nextTag;
  } else if (extractDateVersionInfo(currentTag)) {
    // 如果是日期版本
    return generateNextDateTag(currentTag, prefix);
  } else if (extractNumberInfo(currentTag)) {
    // 如果是数字版本
    return generateNextNumberTag(currentTag, prefix);
  } else {
    // 如果无法识别或没有现有标签，则使用默认的语义化版本
    const initialTag = config.initialTag || "v0.1.0";
    return initialTag;
  }
}

module.exports = {
  generateNextTag,
  extractSemverInfo,
  extractDateVersionInfo,
  extractNumberInfo,
  generateNextSemverTag,
  generateNextDateTag,
  generateNextNumberTag,
};
