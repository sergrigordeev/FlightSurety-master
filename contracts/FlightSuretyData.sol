//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FlightSuretyBase.sol";

contract FlightSuretyData is FlightSuretyBase {
    using SafeMath for uint256;
    event AirlineRegistered(address airlineAddress);
    event AirlineActivated(address airlineAddress);
    event InsuranceBought(
        bytes32 insuranceKey,
        address passager,
        address airline
    );
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    struct Insurance {
        address passager;
        address airline;
        uint256 premium;
        bool bought;
        bool paid;
    }

    struct Airline {
        uint256 balance;
        bool active;
        bool registered;
    }
    uint256 count;

    mapping(address => bool) private authorizedContracts;
    mapping(address => Airline) private airlines;
    mapping(bytes32 => Insurance) private insurances;
    mapping(address => uint256) private forPay;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() {
        setOwner(msg.sender);
        airlines[msg.sender].registered = true;
        airlines[msg.sender].active = true;
        count = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    modifier requireAuthorizedContract() {
        require(
            authorizedContracts[msg.sender],
            "Caller is not authorized contract"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeCaller(address caller)
        public
        requireContractOwner
        requireIsOperational
    {
        authorizedContracts[caller] = true;
    }

    function revokeAuthorization(address caller)
        public
        requireContractOwner
        requireIsOperational
    {
        authorizedContracts[caller] = false;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function getAirline(address airlineAddress)
        internal
        view
        returns (Airline storage)
    {
        return airlines[airlineAddress];
    }

    function airlineCount() public view returns (uint256) {
        return count;
    }

    function isAirline(address airlineAddress) external view returns (bool) {
        return getAirline(airlineAddress).active;
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */

    function registerAirline(address airlineAddress)
        external
        requireAuthorizedContract
        requireIsOperational
    {
        Airline storage airline = getAirline(airlineAddress);
        require(!airline.active, "airline already active");
        airline.registered = true;
        airline.active = false;
        emit AirlineRegistered(airlineAddress);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy(
        address airline,
        address passager,
        bytes32 flightKey
    ) external payable requireAuthorizedContract requireIsOperational {
        bytes32 insuranceKey = getInsurancetKey(passager, flightKey);
        require(
            !insurances[insuranceKey].bought,
            "insurence for this flight has been bought"
        );
        insurances[insuranceKey].passager = passager;
        insurances[insuranceKey].airline = airline;
        insurances[insuranceKey].premium = msg.value;
        insurances[insuranceKey].bought = true;

        emit InsuranceBought(insuranceKey, passager, airline);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(address passager, bytes32 flightKey)
        external
        requireAuthorizedContract
        requireIsOperational
    {
        bytes32 insuranceKey = getInsurancetKey(passager, flightKey);
        require(
            insurances[insuranceKey].bought,
            "insurence for this flight hasn't been bought"
        );
        require(
            !insurances[insuranceKey].paid,
            "insurence for this flight has been paid"
        );
        uint256 premium = insurances[insuranceKey].premium;
        forPay[passager] += premium.div(2).add(premium);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address passager)
        external
        requireAuthorizedContract
        requireIsOperational
    {
        uint256 value = forPay[passager];
        forPay[passager] = 0;
        payable(passager).transfer(value);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {
        Airline storage airline = getAirline(msg.sender);
        require(airline.registered, "only for registered airlines");
        require(!airline.active, "airline is active already");
        airline.active = true;
        airline.balance = msg.value;
        count = count + 1;
        emit AirlineActivated(msg.sender);
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        fund();
    }
}
