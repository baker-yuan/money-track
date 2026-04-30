# Money Track - 项目规则

## 构建规则（必须遵守）

**每次代码修改完成后，必须自动执行构建打包。用户只需要从 `build/` 目录复制产物。**

流程：
1. 修改代码
2. `npx tsc --noEmit` 类型检查通过
3. 自动执行 `npm run build:bundle` 生成打包产物
4. 产物位置：`build/bundle/`（JS Bundle）或 `build/money-track.apk`（APK）

构建命令：
```bash
# 默认构建（JS Bundle，速度快）
npm run build:bundle

# 完整 Android APK（需要 Android SDK）
npm run build:android

# 完整 iOS 包（需要 Xcode）
npm run build:ios
```

产物目录 `build/` 已在 `.gitignore` 中忽略。用户从此目录直接复制安装包即可。

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
