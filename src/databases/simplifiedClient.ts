/** @format */

import { MongoClient, ServerApiVersion } from 'mongodb'
import { CivilianUserPrompt, ReportPrompt, LegalAuthorityUserPrompt } from './crudUtilts'
import { MONGODB_BACKEND_AUTH } from './constants'

/**
 * Simplified client for backend
 *
 * @class BackendClient
 */
export class BackendClient {
  public client: MongoClient
  private _db: string | null
  public currentDb: import('mongodb').Db

  /**
   * @param {import('mongodb').MongoClient} client
  */
  constructor (client: MongoClient) {
    /**
    * @type {import('mongodb').MongoClient}
    */
    this.client = client

    /**
		 * @type {string | null}
		 */
    this._db = null

    /**
		 * @type {import('mongodb').Db}
		 */
    this.currentDb = this.client.db()
  }

  /**
     * @returns {BackendClient}
     */
  static create () {
    const client = new MongoClient(MONGODB_BACKEND_AUTH, {
      serverApi: ServerApiVersion.v1
    })

    const ret = new BackendClient(client)
    ret.setDb('local-report-backend')
    return ret
  }

  async connect () {
    await this.client.connect()
  }

  /**
	 * @param {string | null} value
	 * @returns {void}
	 */
  set db (value: string | null) {
    this._db = value

    if (value == null) this.currentDb = this.client.db()
    else this.currentDb = this.client.db(value)
  }

  /**
	 * @param {string | null} value
	 * @returns {string | null}
	 */
  setDb (value: string | null) {
    const oldValue = this._db
    this.db = value
    return oldValue
  }

  /**
	 * @param {string} collectionName
	 */
  getCollection (collectionName: string) {
    const db = this.currentDb
    return db.collection(collectionName)
  }

  getReportsCol () {
    return this.currentDb.collection('reports')
  }

  getUsersCol () {
    return this.currentDb.collection('users')
  }

  getSightingsCol () {
    return this.currentDb.collection('sightings')
  }

  /**
	 * @param {import('./crudUtils.js').ReportPrompt} param
	 */
  async insertReport (param: ReportPrompt) {
    await this.getReportsCol().insertOne(param)
  }

  /**
	 * @param {import('./crudUtils.js').CivilianUserPrompt} param
	 */
  async insertCivilUser (param: CivilianUserPrompt) {
    await this.getUsersCol().insertOne(param)
  }

  /**
	 * @param {import('./crudUtils.js').LegalAuthorityUserPrompt} param
	 */
  async insertPoliceUser (param: LegalAuthorityUserPrompt) {
    await this.getUsersCol().insertOne(param)
  }
}
