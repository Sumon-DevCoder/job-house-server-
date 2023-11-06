const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// middlewares
const logger = (req, res, next) => {
  console.log("mylogger = ", req.host, req.originalUrl);
  next();
};

const verrifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "token not found" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized user" });
    }

    console.log("decoded =", decoded);
    req.user = decoded;
    next();
  });
};

//connect mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@job-house.p1cwnsp.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const dbConnect = async () => {
  try {
    client.connect();
    console.log("DB Connected Successfully✅");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

const jobsCollection = client.db("jobHouse").collection("jobs");
const reviewCollection = client.db("jobHouse").collection("customerReviews");
const jobAppliesCollection = client.db("jobHouse").collection("jobApplies");

// jwt auth apis route
app.post("/jwt", (req, res) => {
  const user = req.body;
  console.log("user of token email", user);

  // create token
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRECT, {
    expiresIn: "24h",
  });

  // store token
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true });
});

app.post("/logout", (req, res) => {
  //get user
  const user = req.body;
  console.log("logout user =", user);
  //clean cookie in client
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});

// jobs apis route
app.get("/jobs", async (req, res) => {
  const cursor = jobsCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobsByEmail", logger, verrifyToken, async (req, res) => {
  console.log("loggedUser = ", req.query?.email);
  console.log("tokenUser = ", req.user?.email);

  if (req.query?.email !== req.user?.email) {
    res.status(403).send({ message: "forbidden access" });
  }

  let query = {};
  if (req.query?.email) {
    query = { email: req.query?.email };
  }
  const result = await jobsCollection.find(query).toArray();
  res.send(result);
});

app.delete("/jobsByEmail/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.deleteOne(query);
  res.send(result);
});

app.put("/jobsByEmail/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.deleteOne(query);
  res.send(result);
});

// udpate myjobs post
app.put("/jobsById/:id", async (req, res) => {
  const id = req.params.id;
  const item = req.body;
  const filter = { _id: new ObjectId(id) };
  const updateJobsPost = {
    $set: {
      postedBy: item.postedBy,
      email: item.email,
      jobTitle: item.jobTitle,
      category: item.category,
      description: item.description,
      imgUrl: item.imgUrl,
      location: item.location,
      salaryRange: item.salaryRange,
      jobPostingDate: item.jobPostingDate,
      applicationDeadline: item.applicationDeadline,
      applicantsNumber: item.applicantsNumber,
    },
  };
  const result = await jobsCollection.updateOne(filter, updateJobsPost);
  res.send(result);
});

app.post("/jobs", async (req, res) => {
  const addJobInfo = req.body;
  const result = await jobsCollection.insertOne(addJobInfo);
  res.send(result);
});

app.get("/jobsById/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  console.log(query);
  const result = await jobsCollection.findOne(query);
  res.send(result);
});

// jobApplicant
app.patch("/jobApplicant/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedNumber = req.body;
  console.log("applicantInfo", updatedNumber);

  const updateDoc = {
    $inc: {
      quantity: 1,
    },
  };
  const result = await jobsCollection.updateOne(filter, updateDoc);
  res.send(result);
});

app.get("/jobByCategory/:category", async (req, res) => {
  const category = req.params.category;
  const query = { category: category };
  const cursor = jobsCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobByTitle/:jobTitle", async (req, res) => {
  const jobTitle = req.params.jobTitle;
  const query = { jobTitle: jobTitle };
  const cursor = jobsCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

// jobApplies apis route
app.post("/jobApplies", async (req, res) => {
  const jobAppliesInfo = req.body;
  console.log("myyyyy", jobAppliesInfo);
  const result = await jobAppliesCollection.insertOne(jobAppliesInfo);
  res.send(result);
});

app.get("/jobAppliesByEmail/:category", async (req, res) => {
  const category = req.params.category;
  const query = { category: category };
  const cursor = jobAppliesCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobAppliesByEmail", async (req, res) => {
  let query = {};
  if (req.query?.email) {
    query = { email: req.query?.email };
  }
  const result = await jobAppliesCollection.find(query).toArray();
  res.send(result);
});

// reviews apis route
app.get("/customerReviews", async (req, res) => {
  const cursor = reviewCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

// home apis route
app.get("/", (req, res) => {
  res.send("server is running...");
});

app.listen(port, () => {
  console.log(`server is running successfully at http://${port}`);
});
