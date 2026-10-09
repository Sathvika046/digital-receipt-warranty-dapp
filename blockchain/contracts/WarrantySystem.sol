// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WarrantySystem is Ownable {
    struct Warranty {
        uint256 warrantyId;
        string productName;
        string productSerialNumber;
        string receiptNumber;
        string customerName;
        string sellerName;
        address customer;
        address seller;
        uint256 purchaseDate;
        uint256 warrantyExpiry;
        bool exists;
    }

    uint256 public nextWarrantyId = 1;

    mapping(uint256 => Warranty) private warranties;

    mapping(string => uint256) private serialToWarrantyId;

    event WarrantyRegistered(
        uint256 indexed warrantyId,
        string productSerialNumber,
        string customerName,
        string sellerName,
        address indexed customer,
        address indexed seller,
        uint256 warrantyExpiry
    );

    constructor() Ownable(msg.sender) {}

    // Small local helper so we don't need OpenZeppelin's Strings
    // (newer versions use the cancun-only `mcopy` opcode, which Ganache lacks).
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function registerWarranty(
        string memory _productName,
        string memory _receiptNumber,
        string memory _customerName,
        string memory _sellerName,
        address _customer,
        uint256 _purchaseDate,
        uint256 _warrantyExpiry
    ) public onlyOwner returns (uint256) {
        require(
            bytes(_productName).length > 0,
            "Product name is required"
        );

        require(
            bytes(_receiptNumber).length > 0,
            "Receipt number is required"
        );

        require(
            bytes(_customerName).length > 0,
            "Customer name is required"
        );

        require(
            bytes(_sellerName).length > 0,
            "Seller name is required"
        );

        require(
            _customer != address(0),
            "Invalid customer address"
        );

        require(
            _warrantyExpiry > _purchaseDate,
            "Invalid warranty dates"
        );

        uint256 warrantyId = nextWarrantyId;

        // Automatically generate the product serial number.
        // Example: WC-1, WC-2, WC-3...
        string memory generatedSerial =
            string.concat("WC-", _toString(warrantyId));

        warranties[warrantyId] = Warranty({
            warrantyId: warrantyId,
            productName: _productName,
            productSerialNumber: generatedSerial,
            receiptNumber: _receiptNumber,
            customerName: _customerName,
            sellerName: _sellerName,
            customer: _customer,
            seller: msg.sender,
            purchaseDate: _purchaseDate,
            warrantyExpiry: _warrantyExpiry,
            exists: true
        });

        serialToWarrantyId[generatedSerial] = warrantyId;

        nextWarrantyId++;

        emit WarrantyRegistered(
            warrantyId,
            generatedSerial,
            _customerName,
            _sellerName,
            _customer,
            msg.sender,
            _warrantyExpiry
        );

        return warrantyId;
    }

    function getWarranty(
        uint256 _warrantyId
    )
        public
        view
        returns (
            uint256 warrantyId,
            string memory productName,
            string memory productSerialNumber,
            string memory receiptNumber,
            string memory customerName,
            string memory sellerName,
            address customer,
            address seller,
            uint256 purchaseDate,
            uint256 warrantyExpiry,
            bool exists
        )
    {
        require(
            warranties[_warrantyId].exists,
            "Warranty does not exist"
        );

        Warranty memory warranty = warranties[_warrantyId];

        return (
            warranty.warrantyId,
            warranty.productName,
            warranty.productSerialNumber,
            warranty.receiptNumber,
            warranty.customerName,
            warranty.sellerName,
            warranty.customer,
            warranty.seller,
            warranty.purchaseDate,
            warranty.warrantyExpiry,
            warranty.exists
        );
    }

    function getWarrantyBySerialNumber(
        string memory _serialNumber
    )
        public
        view
        returns (
            uint256 warrantyId,
            string memory productName,
            string memory productSerialNumber,
            string memory receiptNumber,
            string memory customerName,
            string memory sellerName,
            address customer,
            address seller,
            uint256 purchaseDate,
            uint256 warrantyExpiry,
            bool exists
        )
    {
        uint256 id = serialToWarrantyId[_serialNumber];

        require(
            id != 0,
            "Product not registered"
        );

        Warranty memory warranty = warranties[id];

        return (
            warranty.warrantyId,
            warranty.productName,
            warranty.productSerialNumber,
            warranty.receiptNumber,
            warranty.customerName,
            warranty.sellerName,
            warranty.customer,
            warranty.seller,
            warranty.purchaseDate,
            warranty.warrantyExpiry,
            warranty.exists
        );
    }

    function isWarrantyValid(
        uint256 _warrantyId
    )
        public
        view
        returns (bool)
    {
        require(
            warranties[_warrantyId].exists,
            "Warranty does not exist"
        );

        return block.timestamp <= warranties[_warrantyId].warrantyExpiry;
    }

    function getRemainingWarrantyDays(
        uint256 _warrantyId
    )
        public
        view
        returns (uint256)
    {
        require(
            warranties[_warrantyId].exists,
            "Warranty does not exist"
        );

        if (
            block.timestamp >=
            warranties[_warrantyId].warrantyExpiry
        ) {
            return 0;
        }

        return (
            warranties[_warrantyId].warrantyExpiry -
            block.timestamp
        ) / 1 days;
    }

    function warrantyExists(
        uint256 _warrantyId
    )
        public
        view
        returns (bool)
    {
        return warranties[_warrantyId].exists;
    }
}