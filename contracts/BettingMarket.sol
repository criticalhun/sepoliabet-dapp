// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BettingMarket {
    struct Market {
        address creator;
        string question;
        uint256 endTime;
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        bool resolved;
        bool winningOutcome;
        mapping(address => uint256) yesBets;
        mapping(address => uint256) noBets;
        mapping(address => bool) claimed;
    }

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    address public owner;
    uint256 public platformFee = 200; // 2% (200 basis points / 10000)
    uint256 public accumulatedFees;

    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 gross, uint256 fee, uint256 net);
    event FeesWithdrawn(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function createMarket(string memory _question, uint256 _endTime) external returns (uint256) {
        require(_endTime > block.timestamp, "End time in the past");
        marketCount++;
        Market storage m = markets[marketCount];
        m.creator = msg.sender;
        m.question = _question;
        m.endTime = _endTime;
        emit MarketCreated(marketCount, _question, _endTime);
        return marketCount;
    }

    function placeBet(uint256 _marketId, bool _outcome) external payable {
        Market storage m = markets[_marketId];
        require(block.timestamp < m.endTime, "Market closed");
        require(!m.resolved, "Already resolved");
        require(msg.value > 0, "No ETH sent");
        if (_outcome) { m.totalYesAmount += msg.value; m.yesBets[msg.sender] += msg.value; }
        else           { m.totalNoAmount  += msg.value; m.noBets[msg.sender]  += msg.value; }
        emit BetPlaced(_marketId, msg.sender, _outcome, msg.value);
    }

    function resolveMarket(uint256 _marketId, bool _winningOutcome) external onlyOwner {
        Market storage m = markets[_marketId];
        require(!m.resolved, "Already resolved");
        m.resolved = true;
        m.winningOutcome = _winningOutcome;
        emit MarketResolved(_marketId, _winningOutcome);
    }

    function claimWinnings(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.resolved, "Not resolved");
        require(!m.claimed[msg.sender], "Already claimed");

        uint256 userBet    = m.winningOutcome ? m.yesBets[msg.sender] : m.noBets[msg.sender];
        require(userBet > 0, "No winning bet");

        uint256 winPool    = m.winningOutcome ? m.totalYesAmount : m.totalNoAmount;
        uint256 totalPool  = m.totalYesAmount + m.totalNoAmount;
        uint256 gross      = (userBet * totalPool) / winPool;
        uint256 fee        = (gross * platformFee) / 10000;
        uint256 net        = gross - fee;

        accumulatedFees   += fee;
        m.claimed[msg.sender] = true;

        (bool sent, ) = msg.sender.call{value: net}("");
        require(sent, "Transfer failed");
        emit WinningsClaimed(_marketId, msg.sender, gross, fee, net);
    }

    // ---- Owner functions ----
    function withdrawFees() external onlyOwner {
        uint256 amt = accumulatedFees;
        require(amt > 0, "Nothing to withdraw");
        accumulatedFees = 0;
        (bool sent, ) = owner.call{value: amt}("");
        require(sent, "Withdraw failed");
        emit FeesWithdrawn(amt);
    }

    function setFee(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "Max 5%");
        platformFee = _bps;
    }

    // ---- View functions ----
    function getUserBet(uint256 _marketId, address _user, bool _outcome) external view returns (uint256) {
        return _outcome ? markets[_marketId].yesBets[_user] : markets[_marketId].noBets[_user];
    }

    function getExpectedPayout(uint256 _marketId, bool _outcome, uint256 _amount)
        external view returns (uint256 gross, uint256 fee, uint256 net, uint256 multiplierX100)
    {
        Market storage m = markets[_marketId];
        uint256 newYes = m.totalYesAmount + (_outcome ? _amount : 0);
        uint256 newNo  = m.totalNoAmount  + (_outcome ? 0 : _amount);
        uint256 newTotal = newYes + newNo;
        uint256 winPool  = _outcome ? newYes : newNo;
        if (winPool == 0) return (0, 0, 0, 100);
        gross          = (_amount * newTotal) / winPool;
        fee            = (gross * platformFee) / 10000;
        net            = gross - fee;
        multiplierX100 = (net * 100) / _amount;
    }
}
