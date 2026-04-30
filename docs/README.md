# Money Track - 旅行记账应用

> 完全离线、跨平台（iOS + Android）的旅行费用追踪应用。支持多人独立记账、局域网同步合并数据。

## 技术栈

| 技术 | 用途 |
|------|------|
| Expo SDK 54 | 跨平台框架 |
| React Native | UI 渲染 |
| TypeScript | 类型安全 |
| Expo Router | 文件路由导航 |
| expo-sqlite | 本地 SQLite 数据库 |
| Zustand | 轻量状态管理 |
| Zod | 运行时输入校验 |
| react-native-qrcode-svg | QR 码生成 |
| expo-camera | QR 码扫描 |
| victory-native | 图表报表 |
| papaparse | CSV 解析/生成 |

## 项目结构

```
money-track/
├── app/                              # Expo Router 文件路由
│   ├── _layout.tsx                   # 根布局（初始化 DB/Device）
│   ├── index.tsx                     # 首页 - 项目列表
│   ├── project/
│   │   ├── create.tsx                # 新建项目
│   │   └── [id]/                     # 项目详情（Tab 导航）
│   │       ├── _layout.tsx           # Tab 布局
│   │       ├── expenses.tsx          # 支出列表
│   │       ├── reports.tsx           # 报表图表
│   │       ├── sync.tsx              # 同步入口
│   │       └── settings.tsx          # 项目设置
│   ├── expense/
│   │   ├── create.tsx                # 新增支出
│   │   └── [id].tsx                  # 支出详情/编辑
│   └── sync/
│       ├── host.tsx                  # 主机端 - 生成 QR 码
│       └── join.tsx                  # 客户端 - 扫码加入
│
├── src/
│   ├── types/index.ts                # 领域模型类型定义
│   ├── constants/
│   │   ├── index.ts                  # 业务常量
│   │   └── theme.ts                  # 设计令牌（颜色/间距/字号）
│   ├── utils/
│   │   ├── index.ts                  # 通用工具函数
│   │   └── validation.ts            # Zod 校验 Schema
│   ├── database/
│   │   ├── index.ts                  # DB 初始化（WAL 模式 + 迁移）
│   │   ├── migrations/index.ts       # 版本化 SQL 迁移
│   │   └── repositories/            # 数据访问层
│   │       ├── base.repository.ts    # 抽象基类
│   │       ├── project.repository.ts
│   │       ├── expense.repository.ts
│   │       ├── category.repository.ts
│   │       └── device.repository.ts
│   ├── stores/                       # Zustand 状态管理
│   │   ├── project.store.ts
│   │   ├── expense.store.ts
│   │   └── category.store.ts
│   ├── services/
│   │   ├── sync/
│   │   │   ├── index.ts             # 同步协议编排器
│   │   │   └── merge-engine.ts      # 冲突解决引擎
│   │   ├── export/index.ts          # JSON/CSV 导入导出
│   │   └── currency/index.ts        # 汇率管理服务
│   ├── components/
│   │   ├── ui/                       # 通用 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── LoadingScreen.tsx
│   │   └── forms/                    # 表单专用组件
│   │       ├── CurrencyPicker.tsx
│   │       ├── ColorPicker.tsx
│   │       └── CategoryPicker.tsx
│   └── hooks/
│       └── useAppInit.ts            # 应用初始化 Hook
│
├── assets/                           # 静态资源
├── build/                            # 构建产物（.gitignore）
├── CLAUDE.md                         # 项目规则
├── app.json                          # Expo 配置
├── babel.config.js                   # Babel + 路径别名
├── tsconfig.json                     # TypeScript 配置
└── package.json
```

## 数据库设计

### 表结构

共 9 张表，所有业务实体使用 UUID 主键、软删除、版本号：

| 表名 | 职责 |
|------|------|
| `device` | 设备身份标识（首次启动生成 UUID） |
| `projects` | 旅行项目（名称/预算/基准货币/日期范围） |
| `categories` | 支出分类（全局默认 + 项目自定义） |
| `expenses` | 核心记录（金额/货币/汇率/分类/付款人） |
| `expense_photos` | 照片附件元数据 |
| `currency_rates` | 项目内记录的汇率 |
| `change_log` | 追加写入的变更日志（同步增量计算） |
| `sync_vectors` | 每设备每实体类型的版本向量 |
| `sync_sessions` | 同步会话历史记录 |

### 迁移机制

- `schema_migrations` 表追踪已应用版本
- 迁移按 version 号顺序执行
- 每个迁移在事务中运行，保证原子性
- WAL 模式提升并发读写性能

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│  UI Layer (app/ screens + components)   │
├─────────────────────────────────────────┤
│  State Layer (Zustand stores)           │
├─────────────────────────────────────────┤
│  Service Layer (sync/export/currency)   │
├─────────────────────────────────────────┤
│  Data Access Layer (repositories)       │
├─────────────────────────────────────────┤
│  Database Layer (expo-sqlite + WAL)     │
└─────────────────────────────────────────┘
```

### 离线优先原则

所有写操作通过事务原子性地完成两件事：
1. 更新实体表
2. 追加写入 `change_log`

这使得同步时只需比较 change_log 增量，无需全量对比。

### 同步协议

```
Host                              Guest
  │                                 │
  │  1. 启动 HTTP Server            │
  │  2. 生成 QR (IP+Port+Token)     │
  │                                 │
  │ ◄──── 3. 扫码连接 ─────────────  │
  │                                 │
  │ ────── 4. Handshake ──────────► │
  │ ◄───── 5. Handshake ACK ──────  │
  │                                 │
  │ ────── 6. Negotiate ──────────► │
  │ ◄───── 7. Vectors + Deltas ──── │
  │                                 │
  │ ────── 8. Push Deltas ────────► │
  │ ◄───── 9. Push ACK ────────────  │
  │                                 │
  │ ──── 10. Confirm ────────────►  │
  └─────────────────────────────────┘
```

### 冲突解决策略（MergeEngine）

| 场景 | 策略 |
|------|------|
| DELETE vs UPDATE | **DELETE 永远优先** |
| 并发 UPDATE | 字段级合并，每个字段取最后写入时间戳较新者 |
| INSERT 冲突 | 版本号高者优先 |
| 版本相同 | 时间戳更晚者胜出 |

## 功能模块

### 项目管理
- 创建/编辑/删除旅行项目
- 设置基准货币、预算上限、日期范围
- 项目颜色标识
- 预算进度条可视化

### 支出记录
- 新增/编辑/删除支出
- 多货币支持（18 种常用货币）
- 手动输入汇率，自动换算基准金额
- 10 个默认分类（交通/住宿/餐饮/购物...）
- 按日期/分类/金额/关键词筛选

### 报表统计
- 总支出/日均/分类数概览
- 分类占比柱状图
- 每日支出趋势图（最近 14 天）
- 预算使用百分比 + 剩余金额

### 数据导入导出
- JSON 全量备份（保留所有关系和 UUID）
- CSV 导出（扁平化表格，可用 Excel 打开）
- 系统分享功能集成
- 文件选择器导入

### 局域网同步
- QR 码配对（含 IP/端口/一次性 Token）
- HTTP 协议数据交换
- 增量同步（仅传输对方没有的变更）
- 冲突自动解决
- 照片按哈希去重

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 类型检查
npm run typecheck

# 构建打包（每次代码修改后执行）
npx expo export --output-dir build/web

# iOS 模拟器
npm run ios

# Android 模拟器
npm run android
```

## 默认分类

| 图标 | 名称 | 颜色 |
|------|------|------|
| 🚗 car | 交通 | #3B82F6 |
| 🛏 bed | 住宿 | #8B5CF6 |
| 🍽 restaurant | 餐饮 | #EF4444 |
| 🛒 cart | 购物 | #F59E0B |
| 📷 camera | 景点 | #10B981 |
| 🎮 game-controller | 娱乐 | #EC4899 |
| 📶 wifi | 通讯 | #06B6D4 |
| 💊 medkit | 医疗 | #F43F5E |
| 📄 document-text | 签证 | #6366F1 |
| ⋯ ellipsis-horizontal | 其他 | #6B7280 |

## 支持的货币

CNY, USD, EUR, GBP, JPY, KRW, THB, SGD, HKD, TWD, AUD, CAD, MYR, VND, IDR, PHP, NZD, CHF

## 设计令牌

- 主色: `#4F46E5` (Indigo)
- 背景: `#F9FAFB`
- 卡片: `#FFFFFF`
- 文字: `#111827` / `#6B7280` / `#9CA3AF`
- 成功: `#10B981`
- 警告: `#F59E0B`
- 错误: `#EF4444`
- 圆角: 6/10/14/20px
- 间距: 4/8/12/16/20/24/32px
