## 数据库概览（SQLite + Drizzle ORM）

### 位置与生命周期

- **数据库文件位置**：每个工作区一个 SQLite 文件，路径为  
  `(<workspaceRoot>)/.polypress/database.db`
- **创建时机**：主进程首次调用 `getWorkspaceDb(workspaceRoot)` 时
- **连接缓存**：同一个 `workspaceRoot` 会被缓存复用；退出/切换工作区时可调用 `closeAllWorkspaceDbs()`

### 初始化行为（当前实现）

初始化逻辑位于 `src/main/src/db/index.ts`：

- **PRAGMA**
  - `journal_mode = WAL`
  - `foreign_keys = ON`
- **Schema bootstrap**
  - 通过 `sqlite.exec(...)` 执行 `CREATE TABLE IF NOT EXISTS ...` / `CREATE INDEX IF NOT EXISTS ...`
  - 注意：Drizzle ORM 本身 **不会自动创建表**，所以需要 bootstrap 或迁移系统来保证 schema 存在

### 表结构

#### `publications`

用于记录某个文件在某个平台的发布状态（本地视角）。

- **主键**
  - `id`：`TEXT`，建议格式：`${platformId}::${encodeURIComponent(filePath)}`
- **字段**
  - `file_path`：`TEXT NOT NULL`，工作区内的绝对路径
  - `platform_id`：`TEXT NOT NULL`
  - `platform_name`：`TEXT NOT NULL`
  - `last_local_submitted_at`：`TEXT NOT NULL`，本地最近提交时间（ISO 字符串）
  - `metadata_json`：`TEXT NOT NULL`，预留 JSON（最小必要信息）
- **索引**
  - `publications_file_path_idx`：`file_path`
  - `publications_platform_id_idx`：`platform_id`

## Drizzle 迁移（推荐做法）

当前代码用 `CREATE TABLE IF NOT EXISTS` 做“最小可用”的启动保障；当 schema 需要演进（新增字段、重命名、数据回填）时，建议改为 **drizzle-kit 生成迁移 + 运行时执行迁移**。

### 1) 生成迁移（drizzle-kit）

drizzle-kit 需要一个 “schema TS 文件路径”。本项目目前把表定义写在 `src/main/src/db/index.ts` 里，也可以直接指向它。

建议新增/使用 `drizzle.config.ts`（放在仓库根目录）：

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/main/src/db/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
} satisfies Config;
```

然后生成迁移：

```bash
pnpm drizzle-kit generate --name "init"
```

生成的 SQL 迁移文件会落在 `./drizzle/` 目录。

### 2) 运行时执行迁移（Electron 主进程）

建议在创建 Drizzle `db` 后、开始业务读写前执行 migrator：

- 依赖：`drizzle-orm/better-sqlite3/migrator`
- 调用：`migrate(db, { migrationsFolder })`

示例（伪代码，路径按你的打包策略调整）：

```ts
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// db = drizzle(sqlite, { schema: { ... } })
migrate(db, { migrationsFolder: "drizzle" });
```

### 3) 与当前 bootstrap 的关系（重要）

- **短期**：可以同时保留 `PRAGMA` + `CREATE TABLE IF NOT EXISTS`，迁移负责增量演进
- **长期**：建议仅保留 `PRAGMA`，把所有 schema 变更都交给迁移（避免“表结构与迁移不一致”）

### 4) 迁移最佳实践

- **新增列**：优先 `ALTER TABLE ... ADD COLUMN ...`，并为旧数据提供默认值/回填步骤
- **修改/删除列**：SQLite 限制较多，通常需要 “新表 + 拷贝数据 + 重建索引” 的迁移
- **数据迁移**：把数据回填写进迁移 SQL，确保新旧版本可平滑升级
