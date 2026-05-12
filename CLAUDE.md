# Money Track - 项目规则

## 构建规则（必须遵守）

**构建非常耗时，不要自动构建！只在用户明确要求"构建"时才执行，或者主动询问用户是否需要构建。**

**用户说"构建"= 构建 Android APK（`build/money-track.apk`）。不需要单独构建 JS Bundle。**

流程：
1. 修改代码
2. `npx tsc --noEmit` 类型检查通过（每次修改后必须执行）
3. 只有用户明确说"构建"或确认需要构建时，才执行 APK 打包

构建命令：
```bash
# 用户说"构建"时执行这个（每次都要先 nvm use）
source ~/.nvm/nvm.sh && nvm use 20.19.4
export ANDROID_HOME="/Users/yuanyu/Library/Android/sdk"
npm run build:android
```

产物：`build/money-track.apk`

### Android APK 构建说明（重要！）

**不要使用 EAS Build**（需要 Expo 账户登录），正确的本地构建方式：

```bash
# 一键构建（推荐）
npm run build:android
```

底层流程：
1. `npx expo prebuild --platform android --clean` — 生成 android 原生目录
2. `./android/gradlew -p android assembleRelease` — Gradle 编译 APK
3. 把 APK 移动到 `build/money-track.apk`
4. 删除 `android/` 目录（中间产物，不需要保留）

环境要求：
- Node.js >= 20.19.4（`nvm use 20.19.4`）
- ANDROID_HOME="/Users/yuanyu/Library/Android/sdk"
- JDK（系统已有 OpenJDK 20）
- Android SDK: platforms;android-34, build-tools;34.0.0, platform-tools

产物目录 `build/` 已在 `.gitignore` 中忽略。用户从此目录直接复制安装包即可。

## 开发规范

- TypeScript 严格模式，所有代码必须通过 `npx tsc --noEmit`
- 使用 `@/` 路径别名引用 `src/` 下模块
- 数据库操作必须通过 Repository 层，禁止在 UI 层直接操作 DB
- 所有实体写操作必须同时写 entity 表和 change_log（原子事务）
- 组件和 Store 按功能模块组织，遵循单一职责
- 使用 Zod 做系统边界（用户输入、导入、同步）的运行时校验
- Node.js 版本要求 >= 20.19.4（react-native 0.81.5 依赖）

## Git 提交规范

- feat: 新功能
- fix: Bug 修复
- refactor: 重构
- docs: 文档
- chore: 构建/配置变更

## 同步规则

同步流程：分享项目 → 对方扫码 → 自动创建项目（如不存在） → 双向增量同步
- 同步基于局域网 HTTP，QR 码包含项目完整元信息
- 对方扫码后如果本地没有该项目，自动创建相同项目
- 后续同步仅传输增量（change_log delta）
- 冲突解决：DELETE > UPDATE，字段级 LWW
