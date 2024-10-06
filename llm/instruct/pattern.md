# Pattern

### 1 Reentrancy (RE)

Reentrancy vulnerability is considered as an invocation to call.value that can call back to itself through a chain of calls. That is, the invocation of call.value is successfully re-entered to perform unexpected repeat money transfers. Specifically, we design two patterns to expose the reentrancy vulnerability. The first pattern _CALLValueInvocation_ checks if there exists an invocation to call.value in the contract. The second pattern _RepeatedCallValue_ concerns whether a specific function with _call.value_ invocation is called repeatedly during fuzzing. IR-Fuzz reports that a function has a reentrancy vulnerability if it fulfills the combined pattern: _CALLValueInvocation_ ∧ _RepeatedCallValue_.

### 2 Timestamp Dependency (TP)

The timestamp dependency vulnerability exists when a function uses the block timestamp as a condition to conduct critical operations (e.g., transfer Ether). Specifically, we define three patterns that are related to timestamp dependency. First, the pattern _TSInvocation_ checks whether there exists an invocation to the block.timestamp (i.e., instruction TIMESTAMP) in the contract code. Then, the pattern _TSContaminate_ checks if block.timestamp may contaminate the triggering condition of a critical operation e.g., money transfer (namely whether TIMESTAMP contaminates instruction JUMPI or is read by subsequent compare instructions e.g., LT, GT, EQ ). The third pattern _TSRandom_ checks if block.timestamp (i.e., TIMESTAMP) is used as a random number seed. IR-Fuzz reports that a function has a timestamp dependency vulnerability if it fulfills the combined pattern: _TSInvocation_ ∨ (_TSContaminate_ ∧ _TSRandom_).

### 3 Block Number Dependency (BN)

The block number dependency vulnerability exists when a function uses the block number (i.e., block.number) as a condition in a branch statement. An attacker may exploit the block number to achieve malicious behaviors. Specifically, we design two patterns to expose this vulnerability. First, the pattern *BNInvocatio*n checks if there exists an invocation to the block.number (i.e., instruction NUMBER) in the contract code. The second pattern is _BNContaminate_ which checks whether NUMBER contaminates instruction JUMPI or is read by subsequent compare instructions (e.g., LT, GT, EQ). IR-Fuzz reports that a function has a block number dependency vulnerability if it fulfills the combined pattern: _BNInvocation_ ∧ _BNContaminate_.

### 4 Dangerous Delegatecall (DE)

The delegatecall is designed for invoking library contracts. It endows a caller with the ability to put the code of the callee contract into the current execution environment of the caller contract. If an attacker manipulates the argument of delegatecall, he/she may control the contract and execute arbitrary code. In particular, we design three patterns to reveal this vulnerability. The first pattern _DGInvocation_ checks if there is an invocation to delegatecall (i.e., instruction DELEGATECALL) in the contract code. The second pattern is _DGCallConstraint_, which checks whether there is a constraint (e.g., Modifier) to the caller of the function with a delegatecall. The third pattern _DGParameter_ checks if the argument of delegatecall is included in the function. IR-Fuzz reports that a function has a delegatecall vulnerability if it fulfills the combined pattern: _DGInvocation_ ∧ ¬*DGCallConstraint* ∧ _DGParameter_.

### 5 Ether Frozen (EF)

Smart contracts can receive and send Ether to other addresses via delegatecall. However, they may contain no functions to transfer Ether, while purely relying on the code of other contracts to send Ether using delegatecall. When the callee contract uses suicide or self-destruct to perform Ether transfer operations, the calling contract has no way to send Ether and all its Ether will be frozen. An attack that exploits the Ether frozen vulnerability in the Parity Multisig Wallet contract led to freezing $280 million worth of Ether1. Particularly, we design two patterns to handle this vulnerability. The first pattern _DGInvocation_ checks if there exists an invocation to delegatecall (i.e., instruction DELEGATECALL) to send Ether during execution. The second pattern _FETransfer_ checks if there exist transfer instructions (e.g., CALL, CALLCODE, SUICIDE) within the contract itself. IR-Fuzz reports that a function has an Ether frozen vulnerability if it fulfills the combined pattern: _DGInvocation_ ∧ ¬*FETransfer*.

### 6 Unchecked External Call (UC)

A contract that calls an external contract or a set of external contracts will form an external contract call-chain. When the return value of a call in the call-chain is unchecked, which indicates an exception is thrown, the first external call in the call-chain will not find this exception and handle it. Particularly, we design three patterns to expose the unchecked external call vulnerability. First, the pattern _ExternalCall_ checks whether there is an invocation (or a chain of calls) to external contracts. Second, the pattern _ExceptionConsistency_ checks if the exception instruction (i.e., INVALID) occurs in every invocation of the call-chain. Third, the pattern _ReturnCondtion_ checks whether the return value of external calls exists in the branch conditional statement. To summarize, IR-Fuzz reports that a function has an unchecked call return value vulnerability if it fulfills the combined pattern: _ExternalCall_ ∧ (_ExceptionConsistency_ ∧ ¬*ReturnCondtion*).

### 7 Integer Overflow/Underflow (OF)

The integer overflow vulnerability exists when an arithmetic operation attempts to create a numeric value that is outside the range of the integer type. For example, if a number is stored in 'uint256' type, this means that the number is stored as a 256-bits unsigned number ranging from 0 to 2^256 - 1. When we try to create a value that is either larger than 2^256 or lower than 0, the integer overflow vulnerability will occur. In such scenario, Ethereum Virtual Machine (EVM) will truncate the overflow bits. Therefore, we design a pattern _OFStackTruncate_, which checks whether the variable arithmetic operations (e.g., instructions ADD, MUL or SUB) are truncated on the EVM stack. IR-Fuzz reports that a function has an integer overflow vulnerability if it fulfills the pattern: _OFStackTruncate_.

### 8 Dangerous Ether Strict Equality (DE)

The dangerous Ether strict equality vulnerability exists when Ether balance is treated as the conditions of branch statements. The variable this.balance will record all received Ether. However, a contract can also obtain Ether by pre-storing Ether or using selfdestruct for Ether transfer, making the amount stored in the variable this.balance inconsistent with the total amount of Ether sent by users. There is a risk in using this.balance as a condition of the branch statement. Specifically, we design two patterns to expose the dangerous Ether strict equality vulnerability. The first pattern _EDInvocation_ checks whether the invocation of instruction BALANCE is corresponding to the variable this.balance in the contract code. The second pattern _EDContaminate_ checks if the invocation to instruction BALANCE is followed by the conditional jump instruction JUMPI or compare instructions (e.g., LT, GT, EQ). IR-Fuzz reports that a function has a dangerous Ether strict equality vulnerability if it fulfills the combined pattern: _EDInvocation_ ∧ _EDContaminate_.