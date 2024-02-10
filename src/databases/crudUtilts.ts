/** @format */

import { UserType } from "../types"

/**
 * @class
 */
export class LegalAuthorityUserPrompt {
  public type: 'POLICE'
  public firstName: String
  public lastName: String
  public badgeNumber: String
  public county: String

  /**
   * @param {String} firstName
   * @param {String} lastName
   * @param {String} badgeNumber
   * @param {String} county
   */
  constructor (firstName: String, lastName: String, badgeNumber: String, county: String) {
    /**
     * @type {String} firstName
     */
    this.firstName = firstName

    /**
     * @type {String} lastName
     */
    this.lastName = lastName

    /**
     * @type {String} badgeNumber
     */
    this.badgeNumber = badgeNumber

    /**
     * @type {String} county
     */
    this.county = county

    /**
     * @type {'POLICE'} type
     */
    this.type = 'POLICE'
  }
}

/**
 * @class
 */
export class CivilianUserPrompt {
  public type: 'CIVIL'
  public firstName: String
  public lastName: String
  public email: String
  public phoneNumber: String
  public address: String

  /**
   * @param {String} firstName
   * @param {String} lastName
   * @param {String} email
   * @param {String} phoneNumber
   * @param {String} address
   */
  constructor (firstName: String, lastName: String, email: String, phoneNumber: String, address: String) {
    /**
     * @type {String} firstName
     */
    this.firstName = firstName

    /**
     * @type {String} lastName
     */
    this.lastName = lastName

    /**
     * @type {String} email
     */
    this.email = email

    /**
     * @type {String} phoneNumber
     */
    this.phoneNumber = phoneNumber

    /**
     * @type {String} address
     */
    this.address = address

    /**
     * @type {'CIVIL'} type
     */
    this.type = 'CIVIL'
  }
}

/**
 * @class
 */
export class ReportPrompt {
  public type: UserType
  public radiusMiles: Number
  public firstName: String
  public lastName: String
  public age: Number
  public height: Number
  public weight: Number
  public date: Date
  public description: String

  /**
   * @param {'CIVIL' | 'POLICE'} type
   * @param {Number} radiusMiles
   * @param {String} firstName
   * @param {String} lastName
   * @param {Number} age
   * @param {Number} height
   * @param {Number} weight
   * @param {Date} date
   * @param {String} description
   */
  constructor (
    type: 'CIVIL' | 'POLICE',
    radiusMiles: Number,
    firstName: String,
    lastName: String,
    age: Number,
    height: Number,
    weight: Number,
    date: Date,
    description: String
  ) {
    /**
     * @type {'CIVIL' | 'POLICE'} type
     */

    this.type = type

    /**
     * @type {Number} distanceMiles
     */

    this.radiusMiles = radiusMiles

    /**
     * @type {String} firstName
     */
    this.firstName = firstName

    /**
     * @type {String} lastName
     */
    this.lastName = lastName

    /**
     * @type {Number} age
     */
    this.age = age

    /**
     * @type {Number} height
     */

    this.height = height

    /**
     * @type {Number} weight
     */
    this.weight = weight

    /**
     * @type {Date} date
     */
    this.date = date

    /**
     * @type {String} description
     */
    this.description = description
  }
}
