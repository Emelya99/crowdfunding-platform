// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CrawdfundingBonusToken.sol";

// Создайте полностью функциональный и безопасный смарт-контракт для краудфандинга, 
// который позволит пользователям создавать кампании по сбору средств, вносить средства
// в эти кампании, а также снимать или возвращать средства на основе определённых условий.
// При успешной компании пользователи будут получать ERC-20 токены в виде дропа.
// Контракт должен быть дополнен исчерпывающими тестами для проверки его корректности и безопасности.

contract Crowdfunding {
    struct Project {
        uint projectId;
        string projectName;
        string projectDescription;
        mapping (address => uint) donateToAddress;
        address[] donors;
        uint fundGoal; // in wei
        uint balance; // in wei
        uint projectEndTime;
        address owner;
        bool isSuccess;
        bool isEnded;
    }
    struct ProjectView {
        uint projectId;
        string projectName;
        string projectDescription;
        address[] donors;
        uint fundGoal; // in wei
        uint balance; // in wei
        uint projectEndTime;
        address owner;
        bool isSuccess;
        bool isEnded;
    }
    
    address owner;
    address public tokenAddress;
    mapping(address => uint) public claimableTokens;
    Project[] public projects;
    uint dropRate = 1000;

    event Create (uint _projectId, string _projectName, string _projectDescription, uint _fundGoal, uint _projectEndTime, address _owner, uint _timestamp);
    event Donation (uint _projectId, address _donorAddress, uint _summ, uint _timestamp);
    event CampaignSuccess (uint _projectId, address _ownerAddress, uint _fundBalance, uint _timestamp);
    event Refund (uint _projectId, address _donorAddress, uint _refundSumm, uint _timestamp);
    event Withdraw (uint _projectId, uint _summ, address _owner, uint _timestamp);

    constructor (address _tokenAddress) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
    }

    modifier onlyExistProjects(uint _projectId) {
        require(_projectId < projects.length, "The project is not found!");
        _;
    }

    function createNewProject(string calldata _projectName, string calldata _projectDescription, uint _fundGoal, uint _durationInDays) external {
        require(0 < _fundGoal, "It should be more than 0 ETH!");
        require(0 < _durationInDays, "It should be more than 0 days!");
        projects.push();
        Project storage newProject = projects[projects.length - 1];

        uint id = projects.length - 1;
        uint endAt = block.timestamp + (_durationInDays * 1 days);

        newProject.projectId = id;
        newProject.projectName = _projectName;
        newProject.projectDescription = _projectDescription;
        newProject.donors;
        newProject.fundGoal = _fundGoal;
        newProject.balance = 0;
        newProject.projectEndTime = endAt;
        newProject.owner = msg.sender;
        newProject.isSuccess = false;
        newProject.isEnded = false;

        // Event
        emit Create (id, _projectName, _projectDescription, _fundGoal, endAt, msg.sender, block.timestamp);
    }

    function donation(uint _projectId) external payable onlyExistProjects(_projectId) {
        Project storage currentProject = projects[_projectId];
        require(!currentProject.isEnded, 'The project is ended!');

        uint remainingFundsNeeded = currentProject.fundGoal - currentProject.balance;
        uint amountToAdd;
        uint refundAmount;

        if (remainingFundsNeeded >= msg.value) {
            // Scenario: full or partial donation
            amountToAdd = msg.value;
        } else {
            // Scenario: donation exceeds the remaining amount
            amountToAdd = remainingFundsNeeded;
            refundAmount = msg.value - remainingFundsNeeded;
        }

        if (remainingFundsNeeded == msg.value || msg.value > remainingFundsNeeded) {
            currentProject.isEnded = true;
            currentProject.isSuccess = true;
        }

        // Updating project data
        _addDonationToProject(currentProject, msg.sender, amountToAdd);

        // We return any excess funds, if any
        if (refundAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
            require(success, "Refund failed!");
        }

        // Generating events
        emit Donation(_projectId, msg.sender, amountToAdd, block.timestamp);
        if (currentProject.isEnded) {
            emit CampaignSuccess (_projectId, currentProject.owner, currentProject.balance, block.timestamp);
        }
    }

    function withdrowFromProject(uint _projectId) external onlyExistProjects(_projectId) {
        Project storage currentProject = projects[_projectId];
        require(currentProject.owner == msg.sender, "You are not an owner!");
        require(currentProject.isSuccess == true, "The project is not completed!");

        (bool success, ) = payable(msg.sender).call{value: currentProject.balance}("");
        require(success, "Refund failed!");

        _calculateDrop(currentProject);

        // Event
        emit Withdraw(_projectId, currentProject.balance, currentProject.owner, block.timestamp);
    }

    function refundMoney(uint _projectId) external onlyExistProjects(_projectId) {
        Project storage currentProject = projects[_projectId];
        require(currentProject.donateToAddress[msg.sender] > 0, "You are not a donor!");
        require(currentProject.balance < currentProject.fundGoal, "Project goal was met!");
        require(currentProject.projectEndTime <= block.timestamp, "The time is not ended!");
        uint refundAmount = currentProject.donateToAddress[msg.sender];
        currentProject.balance -= refundAmount;
        currentProject.donateToAddress[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed!");
        emit Refund(_projectId, msg.sender, refundAmount, block.timestamp);
    }

    function closeProject(uint _projectId) external onlyExistProjects(_projectId) {
        Project storage currentProject = projects[_projectId];
        require(currentProject.owner == msg.sender, "You are not an owner!");
        require(currentProject.projectEndTime < block.timestamp, "The time is not ended!");
        currentProject.isEnded = true;
    }

    function getDonationAmount(uint _projectId) external view returns (uint) {
        Project storage currentProject = projects[_projectId];
        return currentProject.donateToAddress[msg.sender];
    }

    function getProjects() external view returns (ProjectView[] memory) {
        ProjectView[] memory projectViews = new ProjectView[](projects.length);
        for (uint i = 0; i < projects.length; i++) {
            Project storage project = projects[i];
            projectViews[i] = ProjectView({
                projectId: project.projectId,
                projectName: project.projectName,
                projectDescription: project.projectDescription,
                donors: project.donors,
                fundGoal: project.fundGoal,
                balance: project.balance,
                projectEndTime: project.projectEndTime,
                owner: project.owner,
                isSuccess: project.isSuccess,
                isEnded: project.isEnded
            });
        }
        return projectViews;
    }

    function claimTokens() external {
        uint amount = claimableTokens[msg.sender];
        require(amount > 0, "No tokens to claim!");

        claimableTokens[msg.sender] = 0;

        CrawdfundingBonusToken(tokenAddress).mint(msg.sender, amount);
    }

    function getDonors(uint _projectId) external view onlyExistProjects(_projectId) returns (address[] memory) {
        return projects[_projectId].donors;
    }

    function changeDropRate(uint _newRate) external {
        require(owner == msg.sender, "You are not an owner!");
        dropRate = _newRate;
    }

    function _addDonationToProject (Project storage _project, address _donor, uint _amount) internal {
        if (_project.donateToAddress[_donor] == 0) {
            _project.donors.push(_donor);
        }
        _project.balance += _amount;
        _project.donateToAddress[_donor] += _amount;
    }

   function _calculateDrop(Project storage _project) internal {
        for (uint i = 0; i < _project.donors.length; i++) {
            address donor = _project.donors[i];
            uint donationAmount = _project.donateToAddress[donor];

            uint rewardTokens = (donationAmount * dropRate) / 1 ether;
            claimableTokens[donor] += rewardTokens;
        }
    }
    
    receive() external payable {}
}