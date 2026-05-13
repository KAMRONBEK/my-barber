/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve('./base.js')],
  env: {
    node: true,
    browser: false,
  },
};
