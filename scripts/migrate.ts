import { migrateDb } from "../src/lib/db";

const total = migrateDb();
console.log(`数据库迁移完成，共 ${total} 个迁移文件。`);
