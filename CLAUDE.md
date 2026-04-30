# Money Track - 项目规则

## 构建规则

**每次代码修改后，必须执行构建打包，生成安装包放在项目 `build/` 目录下。**

```bash
# 构建 Android APK（放在 build/ 目录）
npx eas build --platform android --profile local --local --output build/money-track.apk

# 构建 iOS 安装包（模拟器用，放在 build/ 目录）
npx eas build --platform ios --profile local --local --output build/money-track.tar.gz

# 如果只需要 JS Bundle（快速验证）
npx expo export --output-dir build/bundle --platform ios
```

构建产物：
- Android: `build/money-track.apk`
- iOS: `build/money-track.tar.gz`（模拟器）或 `build/money-track.ipa`（真机）

构建产物目录 `build/` 已在 `.gitignore` 中忽略，不纳入版本控制。

## 开发规范

- TypeScript 严格模式，所有代码必须通过 `npx tsc --noEmit`
- 使用 `@/` 路径别名引用 `src/` 下模块
- 数据库操作必须通过 Repository 层，禁止在 UI 层直接操作 DB
- 所有实体写操作必须同时写 entity 表和 change_log（原子事务）
- 组件和 Store 按功能模块组织，遵循单一职责
- 使用 Zod 做系统边界（用户输入、导入、同步）的运行时校验
- Node.js 版本要求 >= 20（Expo SDK 54 依赖）

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
