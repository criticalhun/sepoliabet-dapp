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
        bool winningOutcome; // true = YES, false = NO
        mapping(address => uint256) yesBets;
        mapping(address => uint256) noBets;
        mapping(address => bool) claimed;
    }

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    address public owner;

    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

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
        require(!m.resolved, "Market resolved");
        require(msg.value > 0, "No ETH sent");

        if (_outcome) {
            m.totalYesAmount += msg.value;
            m.yesBets[msg.sender] += msg.value;
        } else {
            m.totalNoAmount += msg.value;
            m.noBets[msg.sender] += msg.value;
        }
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

        uint256 userBet;
        if (m.winningOutcome) {
            userBet = m.yesBets[msg.sender];
        } else {
            userBet = m.noBets[msg.sender];
        }
        require(userBet > 0, "No winning bet");

        uint256 winningPool;
        if (m.winningOutcome) {
            winningPool = m.totalYesAmount;
        } else {
            winningPool = m.totalNoAmount;
        }

        uint256 totalPool = m.totalYesAmount + m.totalNoAmount;
        uint256 reward = (userBet * totalPool) / winningPool;
        m.claimed[msg.sender] = true;
        (bool sent, ) = msg.sender.call{value: reward}("");
        require(sent, "ETH transfer failed");
        emit WinningsClaimed(_marketId, msg.sender, reward);
    }

    // Segédfüggvény egy adott felhasználó tétjének lekéréséhez
    function getUserBet(uint256 _marketId, address _user, bool _outcome) external view returns (uint256) {
        Market storage m = markets[_marketId];
        if (_outcome) {
            return m.yesBets[_user];
        } else {
            return m.noBets[_user];
        }
    }
}
