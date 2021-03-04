// The object 'Contracts' will be injected here, which contains all data for all contracts, keyed on contract name:
// Contracts['DoubleAuction'] = {
//  abi: [],
//  address: "0x..",
//  endpoint: "http://...."
// }

// Creates an instance of the smart contract, passing it as a property,
// which allows web3.js to interact with it.
function DoubleAuction(Contract) {
    this.web3 = null;
    this.instance = null;
    this.Contract = Contract;
}

// Initializes the `DoubleAuction` object and creates an instance of the web3.js library,
DoubleAuction.prototype.init = function() {
    // Creates a new Web3 instance using a provider
    // Learn more: https://web3js.readthedocs.io/en/v1.2.0/web3.html
    this.web3 = new Web3(
        (window.web3 && window.web3.currentProvider) ||
            new Web3.providers.HttpProvider(this.Contract.endpoint)
    );

    // Creates the contract interface using the web3.js contract object
    // Learn more: https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html#new-contract
    var contract_interface = this.web3.eth.contract(this.Contract.abi);

    // Defines the address of the contract instance
    this.instance = this.Contract.address
        ? contract_interface.at(this.Contract.address)
        : { createDoubleAuctions: () => {} };
};

// Displays the token balance of an address, triggered by the "Check balance" button
DoubleAuction.prototype.showAddressBalance = function(hash, cb) {
    var that = this;

    // Gets form input value
    var address = $("#balance-address").val();

    // Validates address using utility function
    if (!isValidAddress(address)) {
        console.log("Invalid address");
        return;
    }
    
};

// 获取自己的账户余额
DoubleAuction.prototype.getMyBalance = function(cb) {
    this.instance.getMyBalance(function(error, result) {
        cb(error, result);
    });
};

// Returns the token balance (from the contract) of the given address
DoubleAuction.prototype.getBalance = function(address, cb) {
    this.instance.balances(address, function(error, result) {
        cb(error, result);
    });
};

// 获取买家成交价
DoubleAuction.prototype.purchaseTransactionPrice = function(cb) {
    this.instance.purchaseTransactionPrice(function(error, result) {
        cb(error, result);
    });
};

// 获取卖家成交价
DoubleAuction.prototype.saleTransactionPrice = function(cb) {
    this.instance.saleTransactionPrice(function(error, result) {
        cb(error, result);
    });
};



// Sends tokens to another address, triggered by the "Mint" button
DoubleAuction.prototype.createDoubleAuctions = function() {
    var that = this;
    var isSale = $("input[name='bidIsSale']:checked").val();
    var blindedBid = $("#blindedBid").val();
    if ("true" === isSale) {
        isSale = true;
    } else {
        isSale = false;
    }
    

    // Validates address using utility function
    // if (!isValidAddress(blindedBid)) {
    //     console.log("Invalid address");
    //     return;
    // }


    // Calls the public `bid` function from the smart contract
    this.instance.bid(
        blindedBid,
        isSale,
        {
            from: window.web3.eth.accounts[0],
            gas: 100000,
            gasPrice: 100000,
            gasLimit: 100000
        },
        function(error, txHash) {
            if (error) {
                console.log(error);
            }
            // If success, wait for confirmation of transaction,
            // then clear form values
            else {
                that.waitForReceipt(txHash, function(receipt) {
                    if (receipt.status) {
                        $("#amount").val("");
                        $("#secret").val("");
                        alert("报价绑定成功!");
                    } else {
                        console.log("error");
                    }
                });
            }
        }
    );
    

};

// Waits for receipt of transaction
DoubleAuction.prototype.waitForReceipt = function(hash, cb) {
    var that = this;

    // Checks for transaction receipt using web3.js library method
    this.web3.eth.getTransactionReceipt(hash, function(err, receipt) {
        if (err) {
            error(err);
        }
        if (receipt !== null) {
            // Transaction went through
            if (cb) {
                cb(receipt);
            }
        } else {
            // Try again in 2 second
            window.setTimeout(function() {
                that.waitForReceipt(hash, cb);
            }, 10000);
        }
    });
};

// Binds functions to the buttons defined in app.html
DoubleAuction.prototype.bindButtons = function() {
    var that = this;

    $(document).on("click", "#button-create", function() {
        that.createTokens();
    });

    $(document).on("click", "#button-bid", function() {
        that.createDoubleAuctions();
    });

    $(document).on("click", "#button-encrypt", function() {
        // Gets form input values
        var amount = $("#bidAmount").val();
        if (!isValidAmount(amount)) {
            alert("无效报价");
            return;
        }
        var secret = $("#bidSecret").val();
        if (secret === null || secret === "" || secret === undefined) {
            alert("请输入加密密码");
            return;
        }
        that.instance.encrypt(
            amount,
            secret,
            function(error, result) {
                if (error) {
                    console.log(error);
                }
                // If success, wait for confirmation of transaction,
                // then clear form values
                else {
                    $("#blindedBid").val(result);
                    $("#button-bid").removeClass("hidden");
                    alert("加密报价成功！");
                }
            }
        );
    });

    $(document).on("click", "#button-reveal", function() {
        // Gets form input values
        var amount = $("#revealAmount").val();
        if (!isValidAmount(amount)) {
            alert("无效报价");
            return;
        }
        var secret = $("#revealSecret").val();
        if (secret === null || secret === "" || secret === undefined) {
            alert("请输入加密密码");
            return;
        }
        var isSale = $("input[name='revealIsSale']:checked").val();
        var value = 0;
        if ("true" === isSale) {
            isSale = true;
        } else {
            isSale = false;
            value = amount;
        }
        
        that.instance.reveal(
            amount,
            secret,
            isSale,
            {
                from: window.web3.eth.accounts[0],
                to: that.instance,
                value: value,
                nonce: 40,
                gas: 3000000,
                gasPrice: 100000,
                gasLimit: 100000
            },
            function(error, txHash) {
                if (error) {
                    console.log(error);
                }
                // If success, wait for confirmation of transaction,
                // then clear form values
                else {
                    that.waitForReceipt(txHash, function(receipt) {
                        if (receipt.status) {
                            alert("揭晓成功!");
                        } else {
                            alert(that.instance);
                            alert("揭晓失败!");
                        }
                    });
                }
            }
        );
    });

    $(document).on("click", "#button-check", function() {
        that.showAddressBalance();
    });
};

// Removes the welcome content, and display the main content.
// Called once a contract has been deployed
DoubleAuction.prototype.updateDisplayContent = function() {
    this.hideWelcomeContent();
    this.showMainContent();
};

// Checks if the contract has been deployed.
// A contract will not have its address set until it has been deployed
DoubleAuction.prototype.hasContractDeployed = function() {
    return this.instance && this.instance.address;
};

DoubleAuction.prototype.hideWelcomeContent = function() {
    $("#welcome-container").addClass("hidden");
};

DoubleAuction.prototype.showMainContent = function() {
    $("#main-container").removeClass("hidden");
};

// Creates the instance of the `DoubleAuction` object
DoubleAuction.prototype.onReady = function() {
    this.init();
    if (this.hasContractDeployed()) {
        this.updateDisplayContent();
        this.bindButtons();
        // 隐藏报价按钮
        $("#button-bid").addClass("hidden");
        // 隐藏div
        hideDiv();
        this.updateDisplay();
        
    }
};

// 添加余额
DoubleAuction.prototype.createTokens = function() {
    var that = this;

    // Gets form input values
    var address = $("#create-address").val();
    var amount = $("#create-amount").val();
    console.log(amount);

    // Validates address using utility function
    if (!isValidAddress(address)) {
        console.log("Invalid address");
        return;
    }

    // Validate amount using utility function
    if (!isValidAmount(amount)) {
        console.log("Invalid amount");
        return;
    }

    // Calls the public `mint` function from the smart contract
    this.instance.mint(
        address,
        amount,
        {
            from: window.web3.eth.accounts[0],
            gas: 100000,
            gasPrice: 100000,
            gasLimit: 100000
        },
        function(error, txHash) {
            if (error) {
                console.log(error);
            }
            // If success, wait for confirmation of transaction,
            // then clear form values
            else {
                that.waitForReceipt(txHash, function(receipt) {
                    if (receipt.status) {
                        alert("添加成功");
                    } else {
                        console.log("error");
                    }
                });
            }
        }
    );
};

DoubleAuction.prototype.updateDisplay = function() {
    var that = this;
    // 显示地址
    $("#address").text(window.web3.eth.accounts[0]);

    // 显示余额
    // that.getMyBalance(function(error, balance) {
    //     if (error) {
    //         console.log(error);
    //     } else {
    //         $("#balance").text(balance);
    //     }
    // });
    // Gets the value stored within the `balances` mapping of the contract
    that.getBalance(window.web3.eth.accounts[0], function(error, balance) {
        if (error) {
            console.log(error);
        } else {
            console.log(balance.toNumber());
            $("#balance").text(balance.toNumber());
        }
    });

    // 根据条件显示div
    that.displayDiv();

    // 显示买家成交价
    that.purchaseTransactionPrice(function(error, result) {
        if (error) {
            console.log(error);
        } else {
            $("#purchaseTransactionPrice").text(result);
        }
    });

    // 显示卖家成交价
    that.saleTransactionPrice(function(error, result) {
        if (error) {
            console.log(error);
        } else {
            $("#saleTransactionPrice").text(result);
        }
    });

    // 定时刷新
    setTimeout(function() {
        that.updateDisplay();
    }, 1000);
};

DoubleAuction.prototype.displayDiv = function() {
    var that = this;
    that.instance.biddingEnd(function(error, biddingEnd) {
        if (error) {
            console.log(error);
        } else {
            if (biddingEnd > now()) {
                // 显示报价div
                $("#bid").removeClass("hidden");
            } else {
                // 隐藏报价div
                $("#bid").addClass("hidden");
                that.instance.revealEnd(function(error, revealEnd) {
                    if (error) {
                        console.log(error);
                    } else {
                        if (revealEnd > now()) {
                            // 显示揭晓div
                            $("#reveal").removeClass("hidden");
                        } else {
                            // 隐藏揭晓div
                            $("#reveal").addClass("hidden");
                            // 显示成交价div
                            $("#transactionPrice").removeClass("hidden");
                        }
                    }
                });
            }
        }
    });
};

// Checks if it has the basic requirements of an address
function isValidAddress(address) {
    return /^(0x)?[0-9a-f]{40}$/i.test(address);
}

// 获取秒级的时间戳
function now() {
    return new Date().getTime()/1000;
}

// Basic validation of amount. Bigger than 0 and typeof number
function isValidAmount(amount) {
    return amount > 0 && typeof Number(amount) == "number";
}

// 隐藏div
function hideDiv() {
    // 隐藏报价div
    $("#bid").addClass("hidden");
    // 隐藏揭晓div
    $("#reveal").addClass("hidden");
    // 隐藏成交价div
    $("#transactionPrice").addClass("hidden");
}

if (typeof Contracts === "undefined") var Contracts = { DoubleAuction: { abi: [] } };
var token = new DoubleAuction(Contracts["DoubleAuction"]);

$(document).ready(function() {
    token.onReady();
});
