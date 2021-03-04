pragma solidity ^0.5.10;

contract DoubleAuction {

    // A `mapping` is essentially a hash table data structure.
    // This `mapping` assigns an unsigned integer (the token balance) to an address (the token holder).
    // Learn more: https://solidity.readthedocs.io/en/v0.5.10/types.html#mapping-types
    mapping (address => uint) public balances;

    
    // Events allow for logging of activity on the blockchain.
    // Ethereum clients can listen for events in order to react to contract state changes.
    // Learn more: https://solidity.readthedocs.io/en/v0.5.10/contracts.html#events
    event Transfer(address from, address to, uint amount);

    // 报价结构体
    struct Bid {
        bytes32 blindedBid;
        bool hasReveal;
        bool isSale;
        uint value;
        address payable bider;
    }
    

    // 合约创建者
    address private owner;
    // 拍卖结束时间
    uint public biddingEnd;
    // 揭晓截止时间
    uint public revealEnd;
    // 拍卖被结束标志
    bool public ended = true;
    // 买家与卖家的报价映射
    mapping(address => Bid) public bids;
    // 买家报价数组
    Bid[] public purchaseArr;
    // 卖家报价数组
    Bid[] public saleArr;
    // 买家成交价
    uint public purchaseTransactionPrice;
    // 卖家成交价
    uint public saleTransactionPrice;

    modifier onlyBefore(uint _time) { require(now < _time, "已超过执行时间"); _; }
    modifier onlyAfter(uint _time) { require(now > _time, "未到执行时间"); _; }

    constructor(
        uint _biddingTime,
        uint _revealTime
    ) public {
        owner = msg.sender;
        biddingEnd = now + _biddingTime;
        revealEnd = biddingEnd + _revealTime;
    }
    

    // 报价
    function bid(bytes32 _blindedBid, bool _isSale)
        public
        onlyBefore(biddingEnd)
    {
         bids[msg.sender] = Bid({
            blindedBid: _blindedBid,
            hasReveal: false,
            isSale: _isSale,
            value: 0,
            bider: msg.sender
        });
    }
    

    // 揭晓    
    function reveal(
        uint _value,
        string memory _secret,
        bool _isSale
    )
        payable
        public
        onlyAfter(biddingEnd)
        onlyBefore(revealEnd)
    {
        require((bids[msg.sender]).isSale == _isSale, "揭晓身份不匹配");
        require((bids[msg.sender]).blindedBid == encrypt(_value, _secret), "揭晓信息不匹配");
        require((bids[msg.sender]).hasReveal == false, "已揭晓,无需重复揭晓");
        (bids[msg.sender]).value = _value;
        (bids[msg.sender]).hasReveal = true;
        if(_isSale) {
            require(msg.value == 0, "卖家揭晓无需消费以太币");
            saleArr.push(bids[msg.sender]);
        }else {
            require(msg.value == _value, "消费额必须与报价相等");
            purchaseArr.push(bids[msg.sender]);
        }
    }
    


    // 结束拍卖并达成交易
    function auctionEnd()
        public
        onlyAfter(revealEnd)
    {
        require(!ended, "拍卖已结束");
        Bid[] memory purchaseSortArr;
        Bid[] memory saleSortArr;
        if (purchaseArr.length > 0 && saleArr.length > 0) {
            purchaseSortArr = sortBid(purchaseArr);
            saleSortArr = sortBid(saleArr);
        }
        uint saleArrLength = saleSortArr.length;
        
        // 得出买家与卖家的成交价
        uint i;
        for(i=0; i<purchaseSortArr.length; i++) {
            if (purchaseSortArr[i].value >= saleSortArr[saleArrLength-i-1].value && i < saleArrLength) {
                continue;
            } else {
                if (i > 0) {
                    purchaseTransactionPrice = purchaseSortArr[i-1].value;
                    saleTransactionPrice = saleSortArr[saleArrLength-i].value;
                }
                break;
            }
        }
        // 交易匹配成功，卖家获得成交价，退回买家报价比成交价多出的部分
        for(uint j=0; j<i; j++) {
            saleSortArr[saleArrLength-j-1].bider.transfer(saleTransactionPrice);
            purchaseSortArr[j].bider.transfer(purchaseSortArr[j].value - purchaseTransactionPrice);
        }
        // 交易匹配失败，退回买家报价金额
        for(; i<purchaseSortArr.length; i++) {
            purchaseSortArr[i].bider.transfer(purchaseSortArr[i].value);
        }
        ended = true;
    }
    
    // 对报价进行排序
    function sortBid(Bid[] memory arr) pure internal returns(Bid[] memory) {
        uint len = arr.length;
        for(uint i = 0; i < len - 1; i++) {
            for(uint j = 0; j < len - 1 - i; j++) {
                if(arr[j].value < arr[j+1].value) {
                    Bid memory temp = arr[j+1];
                    arr[j+1] = arr[j];
                    arr[j] = temp;
                }
            }
        }
        return arr;
    }

    // Creates an amount of new tokens and sends them to an address.
    function mint(address receiver, uint amount) public {
        // `require` is a control structure used to enforce certain conditions.
        // If a `require` statement evaluates to `false`, an exception is triggered,
        // which reverts all changes made to the state during the current call.
        // Learn more: https://solidity.readthedocs.io/en/v0.5.10/control-structures.html#error-handling-assert-require-revert-and-exceptions

        // Only the contract owner can call this function
        require(msg.sender == owner, "You are not the owner.");

        // Ensures a maximum amount of tokens
        require(amount < 1e60, "Maximum issuance succeeded");

        // Increases the balance of `receiver` by `amount`
        balances[receiver] += amount;
    }

    // Sends an amount of existing tokens from any caller to an address.
    function transfer(address receiver, uint amount) public {
        // The sender must have enough tokens to send
        require(amount <= balances[msg.sender], "Insufficient balance.");

        // Adjusts token balances of the two addresses
        balances[msg.sender] -= amount;
        balances[receiver] += amount;

        // Emits the event defined earlier
        emit Transfer(msg.sender, receiver, amount);
    }

    function getMyBalance() public view returns(uint) {
        return msg.sender.balance;
    }

    function encrypt(uint _value, string memory _secret) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(_value, _secret));
    }
}
