/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve('./base.js'), 'next/core-web-vitals'],
  env: {
    browser: true,
  },
  settings: {
    react: { version: 'detect' },
  },
};
