import express, { application, Express, Handler } from "express";
import { v4 } from "uuid";
import { BackendClient } from "./databases";
import { TwilioClient } from "./twilio";
import { EmailClient } from "./email";
import { UserType } from "./types";
import { translateText } from "./ai_utils";

const mongodbClient = BackendClient.create();
const twilioClient = TwilioClient.create();
const emailClient = EmailClient.create();

const app = express();

// Use this as an authentication to ensure that the user is logged in.
const loginAuth: Handler = async (req, res, next) => {
  const token = req.headers.authorization;

  const resp = await mongodbClient.getUsersCol().findOne({ token });

  if (resp === null) {
    res.status(403).json({ error: "Unauthorized, please log in." });
    return;
  }

  next();
};

const convBodyToJson = express.json();

// currently unnecessary.
const buildAlreadyLoggedInHandler = (path: string): Handler => {
  return async (req, res, next) => {
    const token = req.headers.authorization;

    const resp = await mongodbClient.getUsersCol().findOne({ token });

    if (resp !== null) {
      res.redirect(path);
      return;
    }

    next();
  };
};

// This route doesn't need authentication
app.get("/api/public", function (req, res) {
  res.json({
    message: "Hello from a public endpoint! You don't need to be authenticated to see this.",
  });
});

// This route needs authentication
app.post("/api/login", convBodyToJson, async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // lazy.

  const body = req.body;

  const username = body.username;
  const password = body.password;

  const resp = await mongodbClient.getUsersCol().findOne({ username, password });

  if (resp === null) {
    res.status(403).json({ error: "Invalid username or password" });
    return;
  }

  res.status(200).json({ token: resp.token });
});

app.post("/api/register", convBodyToJson, async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // lazy.

  const body = req.body;
  const username = body.username;
  const password = body.password;

  if (username == null) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  if (password == null) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const email = body.email;

  const atIdx = email.indexOf("@");
  if (atIdx === -1) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  // handle email subdomain bypassing. (+ or .)
  if (email.indexOf(".") < atIdx || email.indexOf("+") !== -1) {
    res.status(400).json({ error: "Subdomains on emails are not allowed." });
    return;
  }

  const resp = await mongodbClient.getUsersCol().findOne({ $or: [{ username }, { email }] });

  if (resp !== null) {
    if (resp.username === username) {
      res.status(403).json({ error: "Username already exists" });
    } else {
      res.status(403).json({ error: "Email already used to register" });
    }
    return;
  }
  const uuid = v4();

  body.token = uuid;

  // TODO: JOI parsing of the body.
  await mongodbClient.getUsersCol().insertOne(body);

  res.status(200).json({ token: uuid });
});

app.post("/api/upload_report", loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization;

  // ten microseconds of potential overlap.
  const id = Date.now();

  // TODO: JOI parsing of the body.
  const body = req.body;
  body.owner = token;
  body.id = id;

  await mongodbClient.getReportsCol().insertOne(body);

  res.status(200).json({ id });
});

app.get("/api/get_report/:id", loginAuth, async function (req, res) {
  // get the report id from the query.
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id!" });
    return;
  }

  const report = await mongodbClient.getReportsCol().findOne({ id });

  if (report === null) {
    res.status(404).json({ error: "Report not found!" });
    return;
  }

  res.status(200).json(report);
});

app.get("/api/get_reports", async function (req, res) {


  // const slat = req.query.lat as string;
  // const slng = req.query.lng as string;

  // const lat = parseFloat(slat);
  // const lng = parseFloat(slng);

  // if (isNaN(lat) || isNaN(lng)) {
  //   res.status(400).json({ error: "Invalid lat or lng!" });
  //   return;
  // }


  const distance = req.query.distance as string;
  const distMiles = parseInt(distance);

  const age = req.query.age as string;
  const numAge = parseInt(age);

  const type = req.query.type as UserType | undefined;

  if (distance == null || isNaN(distMiles)) {
    res.status(400).json({ error: "Invalid distance!" });
    return;
  }

  if (age == null || isNaN(numAge)) {
    res.status(400).json({ error: "Invalid age!" });
    return;
  }

  if (type != null && type !== "CIVIL" && type !== "POLICE") {
    res.status(400).json({ error: "Invalid type!" });
    return;
  }


  // all values from getReportsCol() have lats and lngs.
  // our body has a lat and lng.

  // We need to retrieve all the reports within a certain distance of the body's lat and lng.
  // Approximate distance in miles. (1 degree of lat is 69 miles) (1 degree of lng is 69 miles at the equator, and 0 miles at the poles)

  // We need to filter the reports by distance within a threshhold, so calculate difference.

  let reports = await mongodbClient.getReportsCol().find({}).toArray();

  // filter reports

  // Improved precision and error handling
  // reports = reports.filter((report: any) => {
  //   if (!report.lat || !report.lng) {
  //     console.error("Missing lat or lng in report:", report);
  //     return false; // Skip reports with missing data
  //   }

  //   const lat1 = parseFloat(report.lat);
  //   const lon1 = parseFloat(report.lng);
  //   const lat2 = lat;
  //   const lon2 = lng;

  //   // More precise radius of the Earth in miles
  //   const R = 3958.8;

  //   const phi1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  //   const phi2 = (lat2 * Math.PI) / 180;
  //   const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  //   const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  //   const a =
  //     Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
  //     Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  //   const distance = R * c; // Distance in miles

  //   return distance <= distMiles;
  // });

  // filter reports by age relative to current time.
  // reports have the time in unix timestamp format, report.id

  // reports = reports.filter((report: any) => {
  //   const relAge = (Date.now() - report.id) / 1000 / 60 / 60 / 24; // age in days

  //   return relAge <= numAge;
  // });

  // filter reports by type

  // if (type != null) {
  //   reports = reports.filter((report: any) => report.type === type);
  // }

  res.status(200).json({ reports });
});

app.get("/api/get_self_reports", loginAuth, async function (req, res) {
  const owner = req.headers.authorization;

  const reports = await mongodbClient.getReportsCol().find({ owner });

  res.status(200).json(reports);
});

app.post("/api/edit_report/:id", loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id!" });
    return;
  }

  const report = await mongodbClient.getReportsCol().findOne({ id });

  if (report === null) {
    res.status(404).json({ error: "Report not found!" });
    return;
  }

  if (report.owner !== token) {
    res.status(403).json({ error: "Unauthorized!" });
    return;
  }

  // TODO: JOI parsing of the body.
  const body = req.body;

  await mongodbClient.getReportsCol().updateOne({ id }, { $set: body });

  res.status(200).json({});
});

app.post("/api/delete_report/:id", loginAuth, async function (req, res) {
  const token = req.headers.authorization;
  const id = req.params.id;

  const report = await mongodbClient.getReportsCol().findOne({ id });

  if (report === null) {
    res.status(404).json({ error: "Report not found!" });
    return;
  }

  if (report.owner !== token) {
    res.status(403).json({ error: "Unauthorized!" });
    return;
  }

  await mongodbClient.getReportsCol().deleteOne({ id });

  res.status(200).json({});
});

app.get("/api/get_sighting/:id", loginAuth, async function (req, res) {
  const id = req.params.id;

  const report = await mongodbClient.getSightingsCol().findOne({ id });

  if (report === null) {
    res.status(404).json({ error: "Sighting not found!" });
    return;
  }

  res.status(200).json(report);
});

app.post("/api/upload_sighting", loginAuth, convBodyToJson, async function (req, res) {
  const token = req.headers.authorization;

  // ten microseconds of potential overlap.
  const id = Date.now();

  // TODO: JOI parsing of the body.
  const body = req.body;
  body.owner = token;
  body.id = id;

  await mongodbClient.getSightingsCol().insertOne(body);

  res.status(200).json({ id });

  identOwnerIdOfReport(body.report_id)
    .then(identOwnerContactFromId)
    .then(async (owner) => {
      if (owner === null) {
        return;
      }

      const translatedData = await translateText(body.data, "en"); // for now, just translate to english.

      emailClient.sendEmail(owner.email, `Sighting Report summary:\n\n${translatedData}`, `Your report has been sighted!`).catch((err) => {
        console.error("failed to send email", err);
      });
      twilioClient.sendSms(owner.phone, `Your report has been sighted!\n\nSummary: ${translatedData}`).catch((err) => {
        console.error("failed to send sms", err);
      });
    })
    .catch((err) => {
      console.error(err); // silently fail.
    });
});

app.post('/api/msg_check', async (req, res) => {


  const data = 'Quincy là chú khỉ béo lái xe đạp điện'
  const translatedData = await translateText(data, "en"); // for now, just translate to english.

  await emailClient.sendEmail('roccoahching@gmail.com', translatedData, 'test')
  await twilioClient.sendSms('+17705960938', translatedData)
})

const identOwnerIdOfReport = async (report_id: number) => {
  const report = await mongodbClient.getReportsCol().findOne({ id: report_id });

  if (report === null) {
    return null;
  }

  return report.owner;
};

const identOwnerContactFromId = async (owner_token: string) => {
  const owner = await mongodbClient.getUsersCol().findOne({ token: owner_token });

  if (owner === null) {
    return null;
  }

  return owner;
};

// await new Promise((resolve, reject)=>setTimeout(resolve, 1000))
app.listen(8080, function () {
  console.log("Listening on http://localhost:8080");
});

export default app;
