/*
 * Compile the smart contracts
 * Clean the smart contracts
 * Generate contract code trees
 */

const solc = require('solc')
const $ = require('./utils')
const $contract = require('./getContract')
const $code = require('./getCode')

const SOLCS = {} // solc version list

// select a proper compiler
function loadCompiler(version) {
    return new Promise((resolve, reject) => {
        console.log('Loading solc', version)
        if (!version) {
            console.log('Version unknown', version)
            resolve(solc.compile)
        } else if (SOLCS[version]) {
            console.log('Version existed', version)
            resolve(SOLCS[version].compile)
        } else {
            solc.loadRemoteVersion(version, (e, s) => {
                if (e) {
                    console.log('Version not found', version)
                    reject(e)
                } else {
                    SOLCS[version] = s
                    resolve(s.compile)
                }
            })
        }
    })
}

// use customize versions to compile
// compile string must be a multiple contracts object format
async function compile(contract) {
    const compile = await loadCompiler(contract.CompilerVersion)
    const sources = multiContracts(contract.SourceCode)
    const input = {
        language: 'Solidity',
        sources,
        settings: {
            optimizer: {
                runs: contract.Runs,
                enabled: contract.OptimizationUsed
            },
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    }
    const output = JSON.parse(compile(JSON.stringify(input)))
    if (output.errors) console.error(output.errors)

    const contracts = output.contracts
    const data = {
        ContractAddress: contract.ContractAddress
    }
    const opcode = {}
    const opcodeD = {} // OpCodeDeployed
    const bytecode = {}
    const bytecodeD = {} // ByteCodeDeployed
    const methodIdentifiers = {}
    const devdoc = {}
    const assembly = {}
    const abi = {}
    for (const i in contracts) // iterate files
        for (const j in contracts[i]) {
            console.log(i, j)
            const contract = contracts[i][j]
            devdoc[j] = contract.devdoc.methods
            for (const k in devdoc[j]) devdoc[j][k] = devdoc[j][k].details
            // contract class j
            bytecode[j] = contract.evm.bytecode.object
            opcode[j] = contract.evm.bytecode.opcodes
            bytecodeD[j] = contract.evm.deployedBytecode.object
            opcodeD[j] = contract.evm.deployedBytecode.opcodes
            methodIdentifiers[j] = contract.evm.methodIdentifiers
            assembly[j] = contract.evm.assembly
            abi[j] = contract.abi
        }
    data.ByteCode = JSON.stringify(bytecode)
    data.OpCode = JSON.stringify(opcode)
    data.DevDoc = JSON.stringify(devdoc)
    data.OpCodeDeployed = JSON.stringify(opcodeD)
    data.ByteCodeDeployed = JSON.stringify(bytecodeD)
    data.MethodIdentifiers = JSON.stringify(methodIdentifiers)
    data.ABI = JSON.stringify(abi)
    data.Assembly = JSON.stringify(assembly)
    return data
}

async function compileAll(start = 1, end) {
    try {
        const max = end || (await $contract.maxId())
        for (let i = start; i <= max; i++) {
            const contract = await $contract.getCodeById(i)
            if (!contract) continue
            console.log('Id', contract.Id)
            console.log('Address', contract.ContractAddress)
            const data = await compile(contract)
            await $code.upsert(data)
        }
    } catch (e) {
        console.error(e.message)
    }
}

async function clearCodeAll(start = 1, end) {
    console.log('Clear source code from table Contract and merge all the files')
    try {
        const max = end || (await $contract.maxId())
        for (let i = start; i <= max; i++) {
            const contract = await $contract.findOneByPk(i)
            if (!contract) continue
            console.log('Id', contract.Id)
            let type = 'solidity'
            if (contract.CompilerVersion.includes('vyper')) type = 'vyper'
            const SourceCode = clearCode(multiContracts(contract.SourceCode), type)
            const data = {
                ContractAddress: contract.ContractAddress,
                SourceCode
            }
            await $code.upsert(data)
        }
    } catch (e) {
        console.error(e)
    }
}

// from SourceCode to SourceCodeMap
async function codeMapAll(start = 1, end) {
    console.log('Code Tree Map All')
    try {
        const max = end || (await $code.maxId())
        for (let i = start; i <= max; i++) {
            const code = await $code.findOneByPk(i)
            if (!code) continue
            console.log('Code Id', code.Id)
            console.log('Address', code.ContractAddress)
            code.SourceCodeMap = JSON.stringify($.getCodeMap(code.SourceCode))
            const res = await code.save()
            console.log('Save', res.Id)
        }
    } catch (e) {
        console.error(e)
    }
}

function multiContracts(content) {
    let sources = {}
    // multiple files
    if (content[0] === '{') {
        // json input sources
        if (content[1] === '{') sources = JSON.parse(content.slice(1).slice(0, -1)).sources
        else sources = JSON.parse(content)
    }
    // single file to multiple files
    else sources['contract.sol'] = { content }
    return sources
}

function clearCode(sources, type = 'solidity') {
    // merge files
    let code = ''
    for (const i in sources) code += sources[i].content
    code = $.clearCode(code, type)
    return code
}

// sync with contract table
async function syncContract() {
    const max = await $code.maxId()
    for (let i = 1; i <= max; i++) {
        const code = await $code.findOneByPk(i, ['Id'])
        const contract = await $contract.findOneByPk(i, ['Id'])
        if (code && !contract) await code.destroy()
    }
}



if (process.argv[1].includes('updateCode')) {
    if (process.argv[2] == 'all') compileAll(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'tree') codeMapAll(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'embed') embedAll(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'clean') clearCodeAll(process.argv[3], process.argv[4])
    else if (process.argv[2] == 'sync-contract') syncContract()
}
