const { getLatestTag, getAllTags, createTag, pushTag } = require("./utils/git");
const { generateNextTag } = require("./utils/tagGenerator");
const { loadConfig } = require("./utils/config");

module.exports = {
  getLatestTag,
  getAllTags,
  createTag,
  pushTag,
  generateNextTag,
  loadConfig,
};
