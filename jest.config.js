module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // 如果你使用了 babel，可以添加如下配置
    // 或者仅针对 TypeScript 使用 ts-jest 转换器
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.(t|j)sx?$': 'babel-jest',
    },
    // 添加对 node_modules 中某些库的转换支持（如果需要）
    transformIgnorePatterns: [
        'node_modules/(?!(@vue/reactivity))'
    ],
    // 其他可能需要的配置项...
    moduleNameMapper: {
        '^@mini-vue/(.*)$': '<rootDir>/packages/$1/src',
    },
};