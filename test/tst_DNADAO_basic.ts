import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { DNAERC20 } from "../typechain-types/contracts/DNAERC20";
import { DNADAO_basic } from "../typechain-types/contracts/DNADAO_basic";

describe("DAO Contract", function () {

    async function deployDAOFixture() {
        const [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        
        const token: DNAERC20 = await hre.ethers.deployContract("DNAERC20", ["DnA Token", "DNA", ethers.parseEther("1000"), 1])
        const dao: DNADAO_basic = await hre.ethers.deployContract("DNADAO_basic", [token.getAddress(), ethers.parseEther("1")]);

        await token.connect(addr1).buyDNA({value: ethers.parseEther("10")});
        await token.connect(addr2).buyDNA({value: ethers.parseEther("10")});
        
        const title = "Test Proposal";
        const description = "This is a test proposal";

        return { dao, token, owner, addr1, addr2, addr3, addrs, title, description };
    }

    it("Should allow users to buy shares", async function () {
        const { dao, token, addr1 } = await loadFixture(deployDAOFixture);
        
        expect(await token.balanceOf(addr1)).to.equal(ethers.parseEther("10"));
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        expect(await dao.shares(addr1.address)).to.equal(10);
    });

    it("Should allow members to propose decisions", async function () {
        const { dao, token, addr1, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, ethers.getAddress("0x0000000000000000000000000000000000000000"), ethers.parseEther("0"));
        
        const proposals = await dao.getProposals();
        expect(proposals.length).to.equal(1);
        expect(proposals[0].title).to.equal("Test Proposal");
    });

    it("Should allow members to propose decisions with transfer option", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        
        const proposals = await dao.getProposals();
        expect(proposals[0].recipient).to.equal(addr2.address);
    });

    it("Should allow members to vote on proposals", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));

        let proposals = await dao.getProposals();

        await dao.connect(addr1).voteProposal(0, true, false);

        proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(10);
    });

    it("Should allow members to support, contest or abstain on proposals", async function () {
        const { dao, token, addr1, addr2, addr3, title, description } = await loadFixture(deployDAOFixture);
        
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        await token.connect(addr3).buyDNA({value: ethers.parseEther("3")});
        await token.connect(addr3).approve(dao.getAddress(), ethers.parseEther("3"));
        await dao.connect(addr3).buyShares(3);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));

        let proposals = await dao.getProposals();

        await dao.connect(addr1).voteProposal(0, true, false); //Support
        await dao.connect(addr2).voteProposal(0, false, false); //Contest
        await dao.connect(addr3).voteProposal(0, false, true); //Abstain

        proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(10);
        expect(proposals[0].voteCountCon).to.equal(5);
        expect(proposals[0].voteCountAbstain).to.equal(3);

        await dao.executeProposal(0);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;
        expect(proposals[0].approved).to.be.true;
    });

    it("Should allow vote delegation and execute proposal with transfer", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        expect(await dao.shares(addr1.address)).to.equal(10);
        expect(await dao.shares(addr2.address)).to.equal(5);

        await dao.connect(addr2).delegateMember(addr1.address);
        
        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));

        let proposals = await dao.getProposals();
        
        await dao.connect(addr1).voteProposal(0, true, false);

        proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(15); // addr2's votes are delegated to addr1

        await dao.executeProposal(0);

        proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("6")); // 5 initial + 1 from proposal
    });

    it("Should allow vote delegation and revoke delegation", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);

        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        expect(await dao.shares(addr1.address)).to.equal(10);
        expect(await dao.shares(addr2.address)).to.equal(5);

        // ------ First Proposal - Delegate Test ------
        await dao.connect(addr2).delegateMember(addr1.address);
        await dao.connect(addr1).createProposal(title, description, ethers.getAddress("0x0000000000000000000000000000000000000000"), ethers.parseEther("0"));
        
        await dao.connect(addr1).voteProposal(0, true, false);

        let proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(15); // addr2's votes are delegated to addr1
        
        // ------ Second Proposal - Revoke Test ------
        await dao.connect(addr2).revokeDelegation(addr1.address);
        const title2 = "Test Proposal 2";
        const description2 = "This is a new test proposal";
        await dao.connect(addr1).createProposal(title2, description2, ethers.getAddress("0x0000000000000000000000000000000000000000"), ethers.parseEther("0"));
        await dao.connect(addr1).voteProposal(1, true, false);

        proposals = await dao.getProposals();
        expect(proposals[1].voteCountPro).to.equal(10); // addr2's votes are no more delegated to addr1
    });


    it("Should execute proposals with majority vote", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));

        await dao.connect(addr1).voteProposal(0, true, false);

        await dao.executeProposal(0);

        let proposals = await dao.getProposals();
        expect(proposals[0].approved).to.be.true;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("11"));
    });

    it("Should not execute proposals with minority vote", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));


        await dao.connect(addr1).voteProposal(0, false, false);
        await dao.executeProposal(0);

        let proposals = await dao.getProposals();
        expect(proposals[0].approved).to.be.false;
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("10"));
    });

    it("Should not allow execute if sender is not the owner", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        await expect(dao.connect(addr1).executeProposal(0)).to.be.revertedWith("Sender must be the owner");
    });

    it("Should not allow execute already executed proposals", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        await dao.connect(addr1).voteProposal(0, true, false);
        await dao.executeProposal(0);

        let proposals = await dao.getProposals();
        expect(proposals[0].executed).to.be.true;

        await expect(dao.executeProposal(0)).to.be.revertedWith("Proposal already executed");
    });

    it("Should not allow delegation if address is not owned by a member", async function () {
        const { dao, token, addr1, addr3 } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await expect(dao.connect(addr1).delegateMember(addr3.address)).to.be.revertedWith("Address not owned by a member");
    });

    it("Should not allow vote if delegate member already voted", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);
        await token.connect(addr2).approve(dao.getAddress(), ethers.parseEther("5"));
        await dao.connect(addr2).buyShares(5);

        expect(await dao.shares(addr1.address)).to.equal(10);
        expect(await dao.shares(addr2.address)).to.equal(5);

        await dao.connect(addr2).delegateMember(addr1.address);

        await dao.connect(addr1).createProposal(title, description, ethers.getAddress("0x0000000000000000000000000000000000000000"), ethers.parseEther("0"));
        await dao.connect(addr1).voteProposal(0, true, false);

        let proposals = await dao.getProposals();
        expect(proposals[0].voteCountPro).to.equal(15); //voteCountPro contains addr1 and addr2 votes
        
        await expect(dao.connect(addr2).voteProposal(0, true, false)).to.be.revertedWith("Already voted");

        await dao.connect(addr2).revokeDelegation(addr1.address);
        await expect(dao.connect(addr2).voteProposal(0, true, false)).to.be.revertedWith("Already voted");
    });

    it("Should not allow vote if no shares are owned", async function () {
        const { dao, token, addr1, addr2, title, description } = await loadFixture(deployDAOFixture);
        await token.connect(addr1).approve(dao.getAddress(), ethers.parseEther("10"));
        await dao.connect(addr1).buyShares(10);

        await dao.connect(addr1).createProposal(title, description, addr2.address, ethers.parseEther("1"));
        await expect(dao.connect(addr2).voteProposal(0, true, false)).to.be.revertedWith("Sender must be a member");
    });

    it("Should end the sale when called by owner", async function () {
        const { dao } = await loadFixture(deployDAOFixture);
        await dao.disableSale();
        expect(await dao.saleEnabled()).to.be.false;
    });

    it("Should not end the sale when not called by owner", async function () {
        const { dao, addr1 } = await loadFixture(deployDAOFixture);
        await expect(dao.connect(addr1).disableSale()).to.be.revertedWith("Sender must be the owner");
        expect(await dao.saleEnabled()).to.be.true;
    });
});
