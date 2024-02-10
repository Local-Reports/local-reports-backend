import express, { application, Express, Handler } from 'express'
import { v4 } from 'uuid'
import { BackendClient } from './databases'
import { TwilioClient } from './twilio'
import { EmailClient } from './email'

const mongodbClient = BackendClient.create()
const twilioClient = TwilioClient.create()
const emailClient = EmailClient.create()

const app = express()

// Use this as an authentication to ensure that the user is logged in.
const loginAuth: Handler = async (req, res, next) => {
  const token = req.headers.authorization

  const resp = await mongodbClient.getUsersCol().findOne({ token })

  if (resp === null) {
    res.status(403).json({})
    return
  }

  next()
}

const convBodyToJson = express.json()

// currently unnecessary.
const buildAlreadyLoggedInHandler = (path: string): Handler => {
  return async (req, res, next) => {
    const token = req.headers.authorization

    const resp = await mongodbClient.getUsersCol().findOne({ token })

    if (resp !== null) {
      res.redirect(path)
      return
    }

    next()
  }
}

// This route doesn't need authentication
app.get('/api/public', function (req, res) {
  res.json({
    message: "Hello from a public endpoint! You don't need to be authenticated to see this."
  })
})

// This route needs authentication
app.post('/api/login', convBodyToJson, async (req, res) => {
  const body = req.body

  const username = body.username
  const password = body.password

  const resp = await mongodbClient.getUsersCol().findOne({ username, password })

  if (resp === null) {
    res.status(403).json({})
    return
  }

  res.status(200).json({ token: resp.token })
})

app.post('/api/register', convBodyToJson, async (req, res) => {
  const body = req.body
  const username = body.username
  const password = body.password

  if (password == null) {
    res.status(400).json({ error: 'Password is required' })
    return
  }

  const email = body.email

  const atIdx = email.indexOf('@')
  if (atIdx === -1) {
    res.status(400).json({ error: 'Invalid email' })
    return
  }

  // handle email subdomain bypassing. (+ or .)
  if (email.indexOf('.') < atIdx || email.indexOf('+') !== -1) {
    res.status(400).json({ error: 'Subdomains on emails are not allowed.' })
    return
  }

  const resp = await mongodbClient.getUsersCol().findOne({ $or: [{ username }, { email }] })

  if (resp !== null) {
    if (resp.username === username) {
      res.status(403).json({ error: 'Username already exists' })
    } else {
      res.status(403).json({ error: 'Email already used to register' })
    }
    return
  }
  const uuid = v4()

  body.token = uuid

  // TODO: JOI parsing of the body.
  await mongodbClient.getUsersCol().insertOne(body)

  res.status(200).json({ token: uuid })
})

app.post('/api/upload_report', loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization

  // ten microseconds of potential overlap.
  const id = Date.now()

  // TODO: JOI parsing of the body.
  const body = req.body
  body.owner = token
  body.id = id

  await mongodbClient.getReportsCol().insertOne(body)

  res.status(200).json({ id })
})

app.get('/api/get_report/:id', loginAuth, async function (req, res) {
  // get the report id from the query.
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    res.status(400).json({})
    return
  }

  const report = await mongodbClient.getReportsCol().findOne({ id })

  if (report === null) {
    res.status(404).json({})
    return
  }

  res.status(200).json(report)
})

app.get('/api/get_reports', loginAuth, async function (req, res) {
  const owner = req.headers.authorization

  const reports = await mongodbClient.getReportsCol().find({ owner })

  res.status(200).json(reports)
})

app.post('/api/edit_report/:id', loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    res.status(400).json({})
    return
  }

  const report = await mongodbClient.getReportsCol().findOne({ id })

  if (report === null) {
    res.status(404).json({})
    return
  }

  if (report.owner !== token) {
    res.status(403).json({})
    return
  }

  // TODO: JOI parsing of the body.
  const body = req.body

  await mongodbClient.getReportsCol().updateOne({ id }, { $set: body })

  res.status(200).json({})
})

app.post('/api/delete_report/:id', loginAuth, async function (req, res) {
  const token = req.headers.authorization
  const id = req.params.id

  const report = await mongodbClient.getReportsCol().findOne({ id })

  if (report === null) {
    res.status(404).json({})
    return
  }

  if (report.owner !== token) {
    res.status(403).json({})
    return
  }

  await mongodbClient.getReportsCol().deleteOne({ id })

  res.status(200).json({})
})

app.get('/api/get_sighting/:id', loginAuth, async function (req, res) {
  const id = req.params.id

  const report = await mongodbClient.getSightingsCol().findOne({ id })

  if (report === null) {
    res.status(404).json({})
    return
  }

  res.status(200).json(report)

})

app.post('/api/upload_sighting', loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization

  // ten microseconds of potential overlap.
  const id = Date.now()

  // TODO: JOI parsing of the body.
  const body = req.body
  body.owner = token
  body.id = id

  await mongodbClient.getSightingsCol().insertOne(body)

  res.status(200).json({ id })

})

// await new Promise((resolve, reject)=>setTimeout(resolve, 1000))
app.listen(8080, function () {
  console.log('Listening on http://localhost:8080')
})

export default app
