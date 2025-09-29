# 数据库导出功能使用说明

## 功能概述
新增的导出功能允许导出数据库表的结构和数据，支持多种格式和灵活的字段选择。

## 使用方法

### 1. 命令行使用

#### 基础导出
```bash
# 导出整个表（JSON格式）
node db/initDB.js export Contract

# 导出特定表的前100条记录
node db/initDB.js export Contract --limit=100

# 导出为CSV格式
node db/initDB.js export Contract --format=csv

# 导出为SQL格式
node db/initDB.js export Token --format=sql
```

#### 字段控制
```bash
# 只包含特定字段
node db/initDB.js export Contract --include=Id,ContractAddress,SourceCode

# 排除特定字段
node db/initDB.js export Contract --exclude=Embedding,Embedding2

# 组合使用
node db/initDB.js export Contract --exclude=Embedding,Embedding2 --format=csv --limit=50
```

### 2. 编程方式使用

```javascript
const { exportTable, exportTables } = require('./db/initDB')

// 基础导出
const result = await exportTable('Contract')

// 高级选项
const result = await exportTable('Contract', {
    includeFields: ['Id', 'ContractAddress', 'SourceCode'], // 只包含这些字段
    excludeFields: ['Embedding', 'Embedding2'],              // 排除这些字段
    where: { Network: 'ethereum' },                          // 查询条件
    limit: 100,                                              // 限制记录数
    format: 'json'                                          // 导出格式
})

// 批量导出多个表
const results = await exportTables(['Contract', 'Token'], {
    format: 'csv',
    limit: 50
})
```

## 参数说明

### exportTable(tableName, options)

- **tableName**: 表名（必需）
- **options**: 导出选项对象（可选）
  - `includeFields`: 数组，指定包含的字段名
  - `excludeFields`: 数组，指定排除的字段名  
  - `where`: 对象，Sequelize查询条件
  - `limit`: 数字，限制导出记录数
  - `format`: 字符串，导出格式（'json', 'csv', 'sql'）

## 支持的表

基于当前Model.js定义的表：
- `Contract`: 合约表
- `Token`: 代币表
- `Vulnerability`: 漏洞表
- `Wallet`: 钱包表

## 导出格式

### JSON格式
包含完整的表结构、数据和元信息：
```json
{
  "structure": {
    "name": "contract",
    "fields": {...},
    "options": {...}
  },
  "data": [...],
  "meta": {
    "tableName": "Contract",
    "recordCount": 100,
    "exportTime": "2025-09-14T...",
    "fields": [...],
    "excludedFields": [...],
    "queryConditions": {...}
  }
}
```

### CSV格式
标准CSV格式，可用Excel等工具打开：
```csv
Id,ContractAddress,SourceCode
1,0x123...,contract code...
2,0x456...,contract code...
```

### SQL格式
标准INSERT语句：
```sql
-- Export for table: Contract
-- Export time: 2025-09-14T...
-- Record count: 100

INSERT INTO Contract (Id, ContractAddress, SourceCode) VALUES (1, '0x123...', 'contract code...');
INSERT INTO Contract (Id, ContractAddress, SourceCode) VALUES (2, '0x456...', 'contract code...');
```

## 使用示例

### 1. 导出以太坊合约的基本信息
```bash
node db/initDB.js export Contract --include=Id,ContractAddress,ContractName,Network --format=csv
```

### 2. 导出排除大字段的代币信息
```bash
node db/initDB.js export Token --exclude=Scams --format=json --limit=1000
```

### 3. 编程方式导出特定网络的合约
```javascript
const result = await exportTable('Contract', {
    where: { Network: 'ethereum' },
    excludeFields: ['Embedding', 'Embedding2', 'SourceCode'],
    format: 'csv',
    limit: 500
})
```

## 注意事项

1. **大数据量**: 导出大量数据时建议使用`limit`参数分批导出
2. **内存使用**: 大字段（如Embedding）会占用大量内存，建议使用`excludeFields`排除
3. **字段优先级**: 如果同时指定`includeFields`和`excludeFields`，会先应用包含字段，再排除指定字段
4. **SQL格式**: SQL格式的导出会自动处理引号转义和NULL值
