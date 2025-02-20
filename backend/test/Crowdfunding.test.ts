import { loadFixture, ethers, expect } from './setup';
import { Crowdfunding } from '../typechain-types';
import { Signer } from 'ethers';

async function createDefaultProject(payments: Crowdfunding, owner: Signer) {
  const tx = await payments
    .connect(owner)
    .createNewProject(
      'Test Project',
      'Test Description',
      ethers.parseEther('2'),
      2
    );
  await tx.wait();
  return await payments.projects(0);
}

describe('Crowdfunding', function () {
  // deploy
  async function deploy() {
    const [owner, donor1, donor2] = await ethers.getSigners();

    // Deploy CrowdfundingBonusToken
    const TokenFactory = await ethers.getContractFactory(
      'CrawdfundingBonusToken'
    );
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy Crowdfunding
    const CrowdfundingFactory = await ethers.getContractFactory('Crowdfunding');
    const payments = await CrowdfundingFactory.deploy(token.target);
    await payments.waitForDeployment();

    // Transfer ownership of token to Crowdfunding contract
    await token.transferOwnership(payments.target);

    return { owner, donor1, donor2, token, payments };
  }

  it('should be deployed', async function () {
    const { owner, donor1, payments } = await loadFixture(deploy);

    expect(payments.target).to.be.properAddress;
  });

  // Create a new project
  describe('createNewProject', function () {
    it('should block a project due to small amount of goal', async function () {
      const { owner, payments } = await loadFixture(deploy);

      // Attempt to create project with 0 goal funding
      await expect(
        payments
          .connect(owner)
          .createNewProject('Test Project', 'Test Description', 0, 30)
      ).to.be.revertedWith('It should be more than 0 ETH!');
    });

    it('should block a project due to small amount of days', async function () {
      const { owner, payments } = await loadFixture(deploy);

      // Attempt to create project with 0 duration days
      await expect(
        payments
          .connect(owner)
          .createNewProject(
            'Test Project',
            'Test Description',
            ethers.parseEther('2'),
            0
          )
      ).to.be.revertedWith('It should be more than 0 days!');
    });

    it('should create a new project correctly', async function () {
      const { owner, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      const tx = await payments
        .connect(owner)
        .createNewProject(
          'Test Project',
          'Test Description',
          ethers.parseEther('2'),
          2
        );
      await tx.wait();
      const project = await payments.projects(0);

      // Get information about the last block
      const lastBlock = await ethers.provider.getBlock('latest');

      // Сomparison
      expect(project.projectId).to.equal(0);
      expect(project.projectName).to.equal('Test Project');
      expect(project.projectDescription).to.equal('Test Description');
      expect(project.fundGoal).to.equal(ethers.parseEther('2'));
      expect(project.balance).to.equal(0);
      expect(project.projectEndTime).to.equal(
        lastBlock.timestamp + 2 * 24 * 60 * 60
      );
      expect(project.owner).to.equal(owner.address);
      expect(project.isSuccess).to.equal(false);
      expect(project.isEnded).to.equal(false);

      // Check Create Event
      await expect(tx)
        .to.emit(payments, 'Create')
        .withArgs(
          0,
          'Test Project',
          'Test Description',
          ethers.parseEther('2'),
          project.projectEndTime,
          project.owner,
          lastBlock.timestamp
        );
    });
  });

  // Donate Money
  describe('Donation', function () {
    it('Completes project when donation equals the funding goal', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project (Goal = 2 ETH)
      await createDefaultProject(payments, owner);

      // Donation equals the funding goal
      const txDonation = await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('2') });
      const receipt = await txDonation.wait();
      const currentBlock = await ethers.provider.getBlock(receipt.blockNumber);

      // Check project state
      const projectAfterDonation = await payments.projects(0);
      expect(projectAfterDonation.fundGoal).to.equal(
        projectAfterDonation.balance
      );
      expect(projectAfterDonation.isEnded).to.equal(true);
      expect(projectAfterDonation.isSuccess).to.equal(true);

      // Check CampaignSuccess Event
      await expect(txDonation)
        .to.emit(payments, 'CampaignSuccess')
        .withArgs(
          0,
          owner.address,
          projectAfterDonation.balance,
          currentBlock?.timestamp
        );

      // Check Donation Event
      await expect(txDonation)
        .to.emit(payments, 'Donation')
        .withArgs(
          0,
          donor1.address,
          ethers.parseEther('2'),
          currentBlock?.timestamp
        );
    });

    it('It should refund money and close the project', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project (Goal = 2 ETH)
      await createDefaultProject(payments, owner);

      // Get balance of donor1 before donation
      const balanceBeforeDonation = await ethers.provider.getBalance(
        donor1.address
      );

      // Donate 3 ETH to the project
      const tx = await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('3') });
      const receipt = await tx.wait();

      // Calculate gas used (BigInt arithmetic)
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Get balance of donor1 after donation
      const balanceAfterDonation = await ethers.provider.getBalance(
        donor1.address
      );

      // Calculate expected balance (BigInt arithmetic)
      const refundAmount = ethers.parseEther('1'); // Refunded 1 ETH
      const expectedBalance =
        balanceBeforeDonation - ethers.parseEther('3') + refundAmount - gasUsed;

      // Check balances
      expect(balanceAfterDonation).to.equal(expectedBalance);

      // Check project state
      const projectAfterDonation = await payments.projects(0);
      expect(projectAfterDonation.fundGoal).to.equal(
        projectAfterDonation.balance
      );
      expect(projectAfterDonation.isEnded).to.equal(true);
      expect(projectAfterDonation.isSuccess).to.equal(true);
    });

    it('It should add donation to balnce', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Donate 1 ETH to the project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Update project after donation
      const projectAfterDonation = await payments.projects(0);

      // Retrieve the donation record for donor1
      const donorContribution = await payments
        .connect(donor1)
        .getDonationAmount(0);

      // Сomparison
      expect(projectAfterDonation.balance).to.equal(ethers.parseEther('1'));
      expect(donorContribution).to.equal(ethers.parseEther('1'));
    });

    it('Block donation if a project is ended', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      const project = await createDefaultProject(payments, owner);

      // Get project information
      const projectEndTime = project.projectEndTime;

      // Change time for ending project
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        Number(projectEndTime) + 1,
      ]);
      await ethers.provider.send('evm_mine');
      await payments.closeProject(0);

      // Attempt to donate money in ended project
      await expect(
        payments.connect(donor1).donation(0, { value: ethers.parseEther('1') })
      ).to.be.revertedWith('The project is ended!');
    });

    it('Donate to unknown project', async function () {
      const { donor1, payments } = await loadFixture(deploy);

      // Attempt to donate money in not found project
      await expect(
        payments.connect(donor1).donation(0, { value: ethers.parseEther('1') })
      ).to.be.revertedWith('The project is not found!');
    });
  });

  // Withdraw Money
  describe('withdrowFromProject', function () {
    it('Shoud withdrow money for owner after success of the goal', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Get owner Balance before withdrow money
      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );

      // Donate 2 ETH to the project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('2') });

      // Get Receipt from withdrow func
      const tx = await payments.connect(owner).withdrowFromProject(0);
      const receipt = await tx.wait();

      // Calculate Gas Cost
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Сomparison
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      const expectedBalance =
        ownerBalanceBefore + ethers.parseEther('2') - gasUsed;
      expect(ownerBalance).to.equal(expectedBalance);

      // Get information about the last block
      const lastBlock = await ethers.provider.getBlock('latest');

      // Check Withdraw Event
      await expect(tx)
        .to.emit(payments, 'Withdraw')
        .withArgs(
          0,
          ethers.parseEther('2'),
          owner.address,
          lastBlock?.timestamp
        );
    });

    it('Should block withdrowing if the project is not ended', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Donate 1 ETH to the project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Attempt to withdraw money from not completed project
      await expect(
        payments.connect(owner).withdrowFromProject(0)
      ).to.be.revertedWith('The project is not completed!');
    });

    it('If random user try to withdraw money', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Donate 1 ETH to the project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Attempt to withdraw money if you are not the owner
      await expect(
        payments.connect(donor1).withdrowFromProject(0)
      ).to.be.revertedWith('You are not an owner!');
    });
  });

  // Refund Money
  describe('refundMoney', function () {
    it('Success refund and event', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      const project = await createDefaultProject(payments, owner);

      // Donate 1ETH to project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Get project information
      const projectEndTime = project.projectEndTime;

      // Change time for ending project
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        Number(projectEndTime) + 1,
      ]);
      await ethers.provider.send('evm_mine');
      await payments.closeProject(0);

      // Attempt to refund money
      const refundTx = await payments.connect(donor1).refundMoney(0);
      const projectAfterRefund = await payments.projects(0);
      const donation = await payments.connect(donor1).getDonationAmount(0);
      const lastBlock = await ethers.provider.getBlock('latest');

      // Сomparison
      expect(donation).to.equal(0);
      expect(projectAfterRefund.balance).to.equal(0);

      // Check Refund Event
      await expect(refundTx)
        .to.emit(payments, 'Refund')
        .withArgs(
          0,
          donor1.address,
          ethers.parseEther('1'),
          lastBlock?.timestamp
        );
    });

    it('Refund money before end time or not a donor', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Donate 1ETH to project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Attempt to refund money if time is not over
      await expect(payments.connect(donor1).refundMoney(0)).to.be.revertedWith(
        'The time is not ended!'
      );

      // Attempt to refund money for not a donor
      await expect(payments.connect(owner).refundMoney(0)).to.be.revertedWith(
        'You are not a donor!'
      );
    });

    it('Stop refunding if project has enough funds', async function () {
      const { owner, donor1, payments } = await loadFixture(deploy);

      // Create a new default project(Goal = 2ETH) and get the project
      await createDefaultProject(payments, owner);

      // Donate 2ETH to project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('2') });

      // Attempt to refund money if goal is reached
      await expect(payments.connect(donor1).refundMoney(0)).to.be.revertedWith(
        'Project goal was met!'
      );
    });
  });

  // Claim CBT tokens
  describe('Claim tokens', function () {
    it('Should claim tokens after withdrawing from owner', async function () {
      const { owner, donor1, donor2, payments, token } = await loadFixture(
        deploy
      );

      // Create a new default project (Goal = 2 ETH)
      await createDefaultProject(payments, owner);

      // Donate 1 ETH to project from donor1 and donor2
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('0.5') }); // 1 ETH Donation = 1000 CBT Drop
      await payments
        .connect(donor2)
        .donation(0, { value: ethers.parseEther('1.5') });

      // Withdraw funds by the owner
      await payments.connect(owner).withdrowFromProject(0);

      // Donor1 claims tokens
      await payments.connect(donor1).claimTokens();

      // Donor2 claims tokens
      await payments.connect(donor2).claimTokens();

      // Check final token balances
      const donor1FinalBalance = await token.balanceOf(donor1.address);
      const donor2FinalBalance = await token.balanceOf(donor2.address);

      // Validate token balances
      expect(donor1FinalBalance).to.equal(BigInt(500));
      expect(donor2FinalBalance).to.equal(BigInt(1500));
    });

    it('Should add donors to an array', async function () {
      const { owner, donor1, donor2, payments, token } = await loadFixture(
        deploy
      );

      // Create a new default project (Goal = 2 ETH)
      await createDefaultProject(payments, owner);

      // Donate 1 ETH to project from donor1 and donor2
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });
      await payments
        .connect(donor2)
        .donation(0, { value: ethers.parseEther('1') });

      const donors = await payments.getDonors(0);

      // Сomparison
      expect(donor1.address).to.equal(donors[0]);
      expect(donor2.address).to.equal(donors[1]);
    });

    it("Can't claim if 0 tokens to claim", async function () {
      const { donor1, payments } = await loadFixture(deploy);

      // Try to claim tokens
      await expect(payments.connect(donor1).claimTokens()).to.be.revertedWith(
        'No tokens to claim!'
      );
    });
  });

  // Another tests
  describe('Complicated cases', function () {
    it('Can create and donate in two projects', async function () {
      const { owner, donor1, donor2, payments } = await loadFixture(deploy);

      // Create two projects
      await payments
        .connect(owner)
        .createNewProject(
          'Test Project',
          'Test Description',
          ethers.parseEther('2'),
          2
        );
      await payments
        .connect(donor1)
        .createNewProject(
          'Test Project 2',
          'Test Description',
          ethers.parseEther('4'),
          4
        );

      const project_0 = await payments.projects(0);
      const project_1 = await payments.projects(1);

      // Test: Can I create two projects in the same time?
      expect(project_0.projectName).to.equal('Test Project');
      expect(project_1.projectName).to.equal('Test Project 2');

      // Donate to two projects
      await payments
        .connect(donor2)
        .donation(0, { value: ethers.parseEther('1') });
      await payments
        .connect(donor2)
        .donation(1, { value: ethers.parseEther('2') });

      const donor2DonationProject_0 = await payments
        .connect(donor2)
        .getDonationAmount(0);
      const donor2DonationProject_1 = await payments
        .connect(donor2)
        .getDonationAmount(1);

      // Test: Can I donate to two projects in the same time?
      expect(donor2DonationProject_0).to.equal(ethers.parseEther('1'));
      expect(donor2DonationProject_1).to.equal(ethers.parseEther('2'));

      // Another address donate to first project
      await payments
        .connect(donor1)
        .donation(0, { value: ethers.parseEther('1') });

      // Сomparison
      const projectAfter_0 = await payments.projects(0);
      expect(projectAfter_0.isSuccess).to.equal(true);
    });
  });
});
