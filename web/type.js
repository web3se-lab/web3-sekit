const vulnerability = {
    'block number dependency (BN)': 0,
    'dangerous delegatecall (DE)': 1,
    'ether frozen (EF)': 2,
    'ether strict equality (SE)': 3,
    'integer overflow (OF)': 4,
    'reentrancy (RE)': 5,
    'timestamp dependency (TP)': 6,
    'unchecked external call (UC)': 7
}
const intent = {
    fee: 0,
    disableTrading: 1,
    blacklist: 2,
    reflect: 3,
    maxTX: 4,
    mint: 5,
    honeypot: 6,
    reward: 7,
    rebase: 8,
    maxSell: 9
}

module.exports = { vulnerability, intent }
