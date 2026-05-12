# 记账本 (Money Track)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020)](https://expo.dev/)

企业级跨平台协作记账应用。离线优先，无需服务器，局域网扫码即可多人协作。

## 演示

<video src="docs/demo.mp4" controls width="300"></video>

演示视频展示了完整的使用流程：创建项目、添加账目、分类管理、多设备扫码同步等核心操作。

> 视频文件：[docs/demo.mp4](docs/demo.mp4)

## 核心功能

- **多项目管理** — 按旅行、活动或用途组织账本，每个项目独立预算与货币设置
- **局域网协作** — 扫码加入共享项目，基于 Change Log 的双向增量同步
- **多币种记账** — 18 种常用货币，自动汇率换算至项目基准货币
- **智能定位** — GPS 自动获取消费地点，也可手动输入
- **收据拍照** — 拍照附加到账目，哈希去重
- **自定义分类** — 全局默认分类 + 项目级自定义，支持增删改
- **CSV 导出** — 一键导出消费明细
- **完全离线** — 本地 SQLite 存储，零依赖云服务

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                          │
│   Expo Router (File-based) + React Native 0.81      │
├─────────────────────────────────────────────────────┤
│                  State Layer                         │
│   Zustand Stores (Project / Expense / Category)     │
├─────────────────────────────────────────────────────┤
│                 Service Layer                        │
│   Sync Orchestrator + Merge Engine (LWW + CRDT)     │
├─────────────────────────────────────────────────────┤
│                Database Layer                        │
│   Repository Pattern + Expo SQLite + Change Log     │
└─────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React Native 0.81 + Expo SDK 54 |
| 路由 | Expo Router 6 (文件系统路由) |
| 状态管理 | Zustand 5 |
| 数据库 | Expo SQLite (本地嵌入式) |
| 类型系统 | TypeScript 5.9 严格模式 |
| 校验 | Zod 4 (系统边界运行时校验) |
| 测试 | Jest 29 + ts-jest |
| 构建 | Expo Prebuild + Gradle (本地构建) |

### 同步协议

采用基于 HTTP 的局域网点对点同步方案：

1. **分享** — 主设备生成 QR 码，包含项目元信息 + 连接地址
2. **加入** — 对方扫码后自动创建项目副本并建立设备互信
3. **同步** — 基于 Change Log 的增量传输，仅同步上次之后的变更
4. **冲突解决** — DELETE > UPDATE 优先级，字段级 Last-Write-Wins

### 数据库设计

10 张核心表，采用事件溯源思想：

- 所有写操作同时写入实体表和 `change_log`（原子事务）
- 软删除模式 (`deleted_at`)，支持同步恢复
- 版本号 (`version`) 用于乐观并发控制
- `sync_vectors` 追踪每设备同步进度

## 项目结构

```
├── app/                    # 页面路由 (Expo Router)
│   ├── (tabs)/             #   底部 Tab 导航 (首页/个人)
│   ├── project/[id]/       #   项目详情 (账目/设置/报表)
│   ├── expense/            #   记账/编辑
│   └── sync/               #   同步 (主机/加入)
├── src/
│   ├── components/         # UI 组件 + 表单组件
│   ├── constants/          # 配置常量 + 设计系统
│   ├── database/           # 数据库层
│   │   ├── migrations/     #   Schema 迁移脚本
│   │   └── repositories/   #   仓储模式 CRUD
│   ├── hooks/              # 自定义 Hooks
│   ├── services/sync/      # 同步服务 (编排器 + 合并引擎)
│   ├── stores/             # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── docs/                   # 文档与演示素材
└── build/                  # 构建产物 (git ignored)
```

## 快速开始

### 环境要求

- Node.js >= 20.19.4
- Android SDK (platforms;android-34, build-tools;34.0.0)
- JDK (OpenJDK 20+)

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/baker-yuan/money-track.git
cd money-track

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 常用命令

```bash
npm start             # 启动 Expo Dev Server
npm run typecheck     # TypeScript 类型检查
npm test              # 运行测试
npm run test:watch    # 测试监听模式
npm run build:android # 构建 Android APK → build/money-track.apk
```

## 贡献指南

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feat/your-feature`)
3. 确保类型检查通过 (`npm run typecheck`)
4. 确保测试通过 (`npm test`)
5. 提交变更，遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
6. 发起 Pull Request

### 提交规范

| 前缀 | 说明 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `refactor:` | 重构 |
| `docs:` | 文档变更 |
| `chore:` | 构建/配置变更 |

### 代码规范

- TypeScript 严格模式，所有代码必须通过 `tsc --noEmit`
- 数据库操作通过 Repository 层，禁止 UI 直接操作 DB
- 写操作必须同时写 entity 表和 `change_log`（原子事务）
- 使用 Zod 做系统边界校验（用户输入、导入、同步数据）

## 开源组件

### 运行时依赖

| 组件 | 版本 | 说明 | 链接 |
|------|------|------|------|
| React | 19.1.0 | UI 框架 | [reactjs.org](https://react.dev/) |
| React Native | 0.81.5 | 跨平台移动框架 | [reactnative.dev](https://reactnative.dev/) |
| Expo | 54.0 | React Native 开发平台 | [expo.dev](https://expo.dev/) |
| Expo Router | 6.0 | 文件系统路由 | [docs.expo.dev/router](https://docs.expo.dev/router/introduction/) |
| Expo SQLite | 16.0 | 本地 SQLite 数据库 | [docs.expo.dev/versions/latest/sdk/sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| Expo Camera | 17.0 | 相机访问 | [docs.expo.dev/versions/latest/sdk/camera](https://docs.expo.dev/versions/latest/sdk/camera/) |
| Expo Location | 19.0 | GPS 定位服务 | [docs.expo.dev/versions/latest/sdk/location](https://docs.expo.dev/versions/latest/sdk/location/) |
| Expo Image Picker | 17.0 | 图片选择器 | [docs.expo.dev/versions/latest/sdk/imagepicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) |
| Expo File System | 19.0 | 文件读写 | [docs.expo.dev/versions/latest/sdk/filesystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) |
| Expo Network | 8.0 | 网络状态检测 | [docs.expo.dev/versions/latest/sdk/network](https://docs.expo.dev/versions/latest/sdk/network/) |
| Expo Crypto | 15.0 | 加密与 UUID 生成 | [docs.expo.dev/versions/latest/sdk/crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) |
| Zustand | 5.0 | 轻量状态管理 | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |
| Zod | 4.4 | 运行时类型校验 | [zod.dev](https://zod.dev/) |
| PapaParse | 5.5 | CSV 解析与导出 | [papaparse.com](https://www.papaparse.com/) |
| React Native QRCode SVG | 6.3 | QR 码生成 | [github.com/awesomejerry/react-native-qrcode-svg](https://github.com/awesomejerry/react-native-qrcode-svg) |
| React Native SVG | 15.12 | SVG 渲染 | [github.com/software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg) |
| React Native Screens | 4.16 | 原生导航容器 | [github.com/software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens) |
| React Native Gesture Handler | 2.28 | 手势处理 | [docs.swmansion.com/react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| React Native Safe Area Context | 5.6 | 安全区域适配 | [github.com/th3rdwave/react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) |

### 开发依赖

| 组件 | 版本 | 说明 | 链接 |
|------|------|------|------|
| TypeScript | 5.9 | 类型系统 | [typescriptlang.org](https://www.typescriptlang.org/) |
| Jest | 29.7 | 测试框架 | [jestjs.io](https://jestjs.io/) |
| ts-jest | 29.4 | Jest TypeScript 预处理 | [github.com/kulshekhar/ts-jest](https://github.com/kulshekhar/ts-jest) |
| Babel Plugin Module Resolver | 5.0 | 路径别名解析 | [github.com/tleuber/babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver) |

## 许可证

[MIT](LICENSE)
