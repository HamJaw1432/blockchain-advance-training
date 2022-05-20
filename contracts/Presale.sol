// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";

contract GeneralPresaleService is AccessControl{
    using Counters for Counters.Counter;
    Counters.Counter public _PresaleCount;

    uint public usageFeeBIP;
    address public adminAddress;

    struct Presale {
        address user;
        uint start_timestamp;
        uint end_timestamp;
        uint price;
        uint amountSold;
        uint amount;
        address tokenAddresses;
    }

    mapping(uint => Presale) public Presales;

    constructor(uint24 _usageFeeBIP) {
        adminAddress = msg.sender;
        usageFeeBIP = _usageFeeBIP; 
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier isOwner(){
        require(msg.sender == adminAddress, "Caller is not the admin.");
        _;
    }

    function changeUsageFee (uint24 _newUsageFeeBIP) public isOwner {
        usageFeeBIP = _newUsageFeeBIP; 
    }
    
    function startPresale(uint[] memory _start_timestamps, uint[] memory _end_timestamps, uint[] memory _prices, uint[] memory _amounts, address[] memory _tokenAddresses) public {
        require((_start_timestamps.length == _end_timestamps.length && _end_timestamps.length == _prices.length && _prices.length == _amounts.length && _amounts.length == _tokenAddresses.length), "All list should be the same size");     

        for (uint i=0; i<_start_timestamps.length; i++) {
            Presales[_PresaleCount.current()].user = msg.sender;
            Presales[_PresaleCount.current()].start_timestamp = _start_timestamps[i];
            Presales[_PresaleCount.current()].end_timestamp = _end_timestamps[i];
            Presales[_PresaleCount.current()].price = _prices[i];
            IERC20(_tokenAddresses[i]).transferFrom(msg.sender, address(this), _amounts[i]);
            Presales[_PresaleCount.current()].amount = _amounts[i];
            Presales[_PresaleCount.current()].amountSold = 0;
            Presales[_PresaleCount.current()].tokenAddresses = _tokenAddresses[i];
            _PresaleCount.increment();
        }
    }

    function buy(uint presaleID, uint amountToBuy) public payable {
        require(Presales[presaleID].amount >= amountToBuy, "There is not that much left.");
        require((msg.value == (Presales[presaleID].price * amountToBuy)), "Wrong amount of eth was sent");
        require(block.timestamp < Presales[presaleID].end_timestamp, "Presale done.");
        require(block.timestamp > Presales[presaleID].start_timestamp, "Presale needs to start.");

        Presales[presaleID].amount = Presales[presaleID].amount - amountToBuy;
        Presales[presaleID].amountSold = Presales[presaleID].amountSold + amountToBuy;

        IERC20(Presales[presaleID].tokenAddresses).approve(address(this), amountToBuy);
        IERC20(Presales[presaleID].tokenAddresses).transferFrom(address(this), msg.sender, amountToBuy);

    }

    function withdraw(uint presaleID) public {
        require(Presales[presaleID].user == msg.sender, "Not the owner of the presale.");

        IERC20(Presales[presaleID].tokenAddresses).approve(address(this), Presales[presaleID].amount);
        IERC20(Presales[presaleID].tokenAddresses).transferFrom(address(this), Presales[presaleID].user, Presales[presaleID].amount);

        Presales[presaleID].amount = 0;
    }

    function endPresale(uint presaleID) public {
        require(block.timestamp > Presales[presaleID].end_timestamp, "Presale not done.");
        IERC20(Presales[presaleID].tokenAddresses).transferFrom(Presales[presaleID].user, address(this), Presales[presaleID].amountSold);
        IUniswapV2Router01(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D).addLiquidityETH{value: (Presales[presaleID].amountSold * Presales[presaleID].price)}(
                    Presales[presaleID].tokenAddresses,
                    Presales[presaleID].amountSold,
                    Presales[presaleID].amountSold, 
                    (Presales[presaleID].amountSold * Presales[presaleID].price), 
                    address(this), 
                    block.timestamp
                );

    }

}