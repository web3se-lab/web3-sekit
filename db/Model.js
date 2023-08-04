// define database table models

const { DataTypes } = require('sequelize')

module.exports = {
    Contract: {
        name: 'contract',
        table: {
            Id: { type: DataTypes.INTEGER(11), primaryKey: true, autoIncrement: true },
            TxHash: DataTypes.STRING,
            Network: DataTypes.STRING,
            ContractAddress: { type: DataTypes.STRING, unique: true },
            SourceCode: DataTypes.TEXT('medium'),
            ABI: DataTypes.TEXT,
            ContractName: DataTypes.STRING,
            CompilerVersion: DataTypes.STRING,
            OptimizationUsed: DataTypes.BOOLEAN,
            Runs: DataTypes.INTEGER(11),
            ConstructorArguments: DataTypes.TEXT,
            EVMVersion: DataTypes.STRING,
            Library: DataTypes.TEXT,
            LicenseType: DataTypes.STRING,
            Proxy: DataTypes.STRING,
            Implementation: DataTypes.STRING,
            SwarmSource: DataTypes.STRING,
            Creator: DataTypes.STRING,
            ContractType: DataTypes.STRING,
            Embedding: DataTypes.TEXT('long'),
            EmbeddingMax: DataTypes.TEXT('long'),
            TokenIds: DataTypes.TEXT('long')
        },
        options: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [
                {
                    name: 'contract_network_index',
                    method: 'BTREE',
                    fields: ['Network']
                },
                {
                    name: 'creator_index',
                    method: 'BTREE',
                    fields: ['Creator']
                },
                {
                    name: 'compiler_version_index',
                    method: 'BTREE',
                    fields: ['CompilerVersion']
                }
            ]
        }
    },
    Token: {
        name: 'token',
        table: {
            Id: { type: DataTypes.INTEGER(11), primaryKey: true, autoIncrement: true },
            ContractAddress: { type: DataTypes.STRING, unique: true },
            Holders: DataTypes.INTEGER(11).UNSIGNED,
            Transfers: DataTypes.INTEGER(11).UNSIGNED,
            Supply: DataTypes.DOUBLE,
            Decimals: DataTypes.INTEGER(11).UNSIGNED,
            IsHoneypot: DataTypes.BOOLEAN,
            Error: DataTypes.STRING,
            MaxTxAmount: DataTypes.DOUBLE,
            MaxTxAmountBNB: DataTypes.DECIMAL(65, 18),
            BuyTax: DataTypes.INTEGER(11),
            SellTax: DataTypes.INTEGER(11),
            BuyGas: DataTypes.INTEGER(11).UNSIGNED,
            SellGas: DataTypes.INTEGER(11).UNSIGNED,
            BNBLP: DataTypes.DECIMAL(65, 18),
            BUSDLP: DataTypes.DECIMAL(65, 18),
            TokenType: DataTypes.STRING,
            Price: DataTypes.DECIMAL(65, 2),
            BNB: DataTypes.DECIMAL(65, 18),
            Market: DataTypes.DOUBLE,
            // LOW=1, MEDIUM=2, HIGH=3
            Risk: { type: DataTypes.INTEGER(11).UNSIGNED, defaultValue: 0 },
            Scams: DataTypes.TEXT,
            IsProxy: DataTypes.BOOLEAN
        },
        options: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [
                {
                    name: 'token_type_index',
                    method: 'BTREE',
                    fields: ['TokenType']
                }
            ]
        }
    }
}
