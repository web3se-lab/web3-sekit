# Repair Integer Overflow/Underflow (IO)

## 1. Manual Overflow Checks (First choice)

Implement manual overflow and underflow checks in your functions.

```solidity
function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "Addition overflow");
    return c;
}

function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
    require(b <= a, "Subtraction underflow");
    uint256 c = a - b;
    return c;
}

function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
    if (a == 0) return 0;
    uint256 c = a * b;
    require(c / a == b, "Multiplication overflow");
    return c;
}

function safeDiv(uint256 a, uint256 b) public pure returns (uint256) {
    require(b > 0, "Division by zero");
    uint256 c = a / b;
    return c;
}
```

## 2. Using SafeMath Library (for Solidity < 0.8.0)

Use OpenZeppelin `SafeMath` for earlier versions of Solidity to provide built-in overflow checks.

```solidity
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract MyContract {
    using SafeMath for uint256;

    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a.add(b);
    }

    function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
        return a.sub(b);
    }

    function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
        return a.mul(b);
    }

    function safeDiv(uint256 a, uint256 b) public pure returns (uint256) {
        return a.div(b);
    }
}
```
