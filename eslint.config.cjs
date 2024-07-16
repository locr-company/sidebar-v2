const globals = require("globals");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [{
    ignores: ["**/*.min.js", "**/*.cjs"],
}, ...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        ecmaVersion: 2018,
        sourceType: "script",
    },

    rules: {
        "no-unused-vars": ["error", {
            args: "none",
        }],
    },
}, {
    files: ["**/gulpfile.js"],

    languageOptions: {
        globals: {
            ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
            ...globals.node,
        },
    },
}];