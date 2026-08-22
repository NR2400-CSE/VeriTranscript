// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AcademicCredentialRegistry {
    address public universityAdmin;

    struct Credential {
        bool isValid;
        address student;
        string ipfsURI;
        string studentName;
        string degreeName;
        uint256 issueTimestamp;
    }

    mapping(bytes32 => Credential) public credentials;

    event CredentialIssued(
        bytes32 indexed docHash,
        address indexed student,
        string ipfsURI,
        string studentName,
        string degreeName,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == universityAdmin, "Unauthorized: Only issuing university can perform this");
        _;
    }

    constructor() {
        universityAdmin = msg.sender;
    }

    function issueCredential(
        bytes32 _docHash,
        address _student,
        string calldata _ipfsURI,
        string calldata _studentName,
        string calldata _degreeName
    ) external onlyAdmin {
        require(!credentials[_docHash].isValid, "Credential already exists");
        credentials[_docHash] = Credential(true, _student, _ipfsURI, _studentName, _degreeName, block.timestamp);
        emit CredentialIssued(_docHash, _student, _ipfsURI, _studentName, _degreeName, block.timestamp);
    }

    function verifyCredential(bytes32 _docHash) external view returns (Credential memory) {
        require(credentials[_docHash].isValid, "Credential not found or revoked");
        return credentials[_docHash];
    }
}