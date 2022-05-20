const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Testing MOK Contract Deployent", function () {
  it("Testing MOK Contract Deployent", async function () {
    const accounts = await ethers.getSigners();
    const owner = accounts[0];

    const MOK = await ethers.getContractFactory("MOKToken");

    const MOKToken = await MOK.deploy(100000);

    const ownerBalance = await MOKToken.balanceOf(owner.address);
    expect(await MOKToken.totalSupply()).to.equal(ownerBalance);
  });
});


describe("Testing GeneralPresaleService Contract Deployent", function () {
  it("Testing GeneralPresaleService Contract Deployent", async function () {
    const GeneralPresaleService = await ethers.getContractFactory("GeneralPresaleService");
    const generalPresaleService = await GeneralPresaleService.deploy(3);
    await generalPresaleService.deployed();
    expect(await generalPresaleService.address != null);
  });
});

describe("GeneralPresaleService", function () {
  let MOK;
  let generalPresaleService;
  let accounts;


  beforeEach(async function () {
    accounts = await ethers.getSigners();

    let MOKToken = await ethers.getContractFactory("MOKToken");
    MOK = await MOKToken.deploy(100000);

    let GeneralPresaleService = await ethers.getContractFactory("GeneralPresaleService");
    generalPresaleService = await GeneralPresaleService.deploy(3);

    await MOK.connect(accounts[0]);
    await MOK.transfer(accounts[1].address, 100);
    await MOK.transfer(accounts[2].address, 100);
  });

  it("starting presale with one presales", async function () {
      await MOK.approve(generalPresaleService.address, 4);
      await generalPresaleService.startPresale([4], [4], [4], [4], [MOK.address]);
      await expect(await generalPresaleService._PresaleCount()).to.equal(1);
      await expect((await generalPresaleService.Presales(0))[0]).to.equal(accounts[0].address);
  });

  it("starting presale with two presales", async function () {
    await MOK.approve(generalPresaleService.address, 9);
    await generalPresaleService.startPresale([4,5], [4,5], [4,5], [4,5], [MOK.address, MOK.address]);
    await expect(await generalPresaleService._PresaleCount()).to.equal(2);
    await expect((await generalPresaleService.Presales(0))[0]).to.equal(accounts[0].address);
    await expect((await generalPresaleService.Presales(1))[0]).to.equal(accounts[0].address);
  });

  it("starting presale with different size list presales", async function () {
    await MOK.approve(generalPresaleService.address, 9);
    await expect(generalPresaleService.startPresale([4,5,6], [4,5], [4,5], [4,5], [MOK.address, MOK.address])).to.be.revertedWith("reverted with reason string 'All list should be the same size'");
  });

  it("buying 1", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);
    await generalPresaleService.connect(accounts[1]);
    await generalPresaleService.buy(0, 1, {
      value: 1
    });
    await expect((await generalPresaleService.Presales(0))[5]).to.equal(4);
  });

  it("buying 2", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);
    await generalPresaleService.connect(accounts[1]);
    await generalPresaleService.buy(0, 2, {
      value: 2
    });
    await expect((await generalPresaleService.Presales(0))[5]).to.equal(3);
  });

  it("buying more than in stock", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);
    await generalPresaleService.connect(accounts[1]);
    await expect(generalPresaleService.buy(0, 6, {
      value: 6
    })).to.be.revertedWith("reverted with reason string 'There is not that much left.'");
  });

  it("buying outside presale time", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [0], [1], [5], [MOK.address]);
    await generalPresaleService.connect(accounts[1]);
    await expect (generalPresaleService.buy(0, 1, {
      value: 1
    })).to.be.revertedWith("reverted with reason string 'Presale done.'");
  });

  it("buying outside presale time", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([10000000000], [10000000000], [1], [5], [MOK.address]);
    await generalPresaleService.connect(accounts[1]);
    await expect (generalPresaleService.buy(0, 1, {
      value: 1
    })).to.be.revertedWith("reverted with reason string 'Presale needs to start.'");
  });

  it("withdraw all tokens", async function () {
    let before = await MOK.balanceOf(accounts[0].address);
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);
    await generalPresaleService.withdraw(0);
    await expect (await MOK.balanceOf(accounts[0].address)).to.equal(before);
  });

  it("withdraw some tokens", async function () {
    let before = await MOK.balanceOf(accounts[0].address);
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);

    await generalPresaleService.connect(accounts[1]).buy(0, 1, {
      value: 1
    });

    await generalPresaleService.withdraw(0);
    await expect (await MOK.balanceOf(accounts[0].address)).to.equal(before - 1);
  });

  it("withdraw tokens from non-owner", async function () {
    await MOK.approve(generalPresaleService.address, 5);
    await generalPresaleService.startPresale([0], [10000000000], [1], [5], [MOK.address]);
    await expect (generalPresaleService.connect(accounts[1]).withdraw(0)).to.be.revertedWith("reverted with reason string 'Not the owner of the presale.'");;
  });

  it("change usageFeeBIP not admin", async function () {
    await expect (generalPresaleService.connect(accounts[1]).changeUsageFee(5)).to.be.revertedWith("reverted with reason string 'Caller is not the admin.'");;
  });

  it("change usageFeeBIP is admin", async function () {
    await generalPresaleService.changeUsageFee(5);
    await expect (await generalPresaleService.usageFeeBIP()).to.equal(5);;
  });

});
