# Money Track - 项目规则

## 构建规则

**每次代码修改后，必须执行构建打包，确保产物在项目 `build/` 目录下。**

```bash
# 导出为静态 bundle（web）
npx expo export --output-dir build/web

# 或者使用 EAS Build（本地）
npx eas build --platform all --local --output build/
```

构建产物目录 `build/` 已在 `.gitignore` 中忽略，不纳入版本控制。

## 开发规范

- TypeScript 严格模式，所有代码必须通过 `npx tsc --noEmit`
- 使用 `@/` 路径别名引用 `src/` 下模块
- 数据库操作必须通过 Repository 层，禁止在 UI 层直接操作 DB
- 所有实体写操作必须同时写 entity 表和 change_log（原子事务）
- 组件和 Store 按功能模块组织，遵循单一职责
- 使用 Zod 做系统边界（用户输入、导入、同步）的运行时校验

## Git 提交规范

- feat: 新功能
- fix: Bug 修复
- refactor: 重构
- docs: 文档
- chore: 构建/配置变更
