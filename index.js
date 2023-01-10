const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");



app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorizes access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qdmesio.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("employer-management");
    const userCollection = db.collection("user");
    const jobCollection = db.collection("job");

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find({});
      const user = await cursor.toArray();
      res.send({ status: true, data: user });
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.put("/userlogin", async (req, res) => {
      console.log(req.body.email);
      const token = jwt.sign({
        email: req.body.email,
      }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
      });
      const user = req.body.email;
      const filter = { email: user };
      const options = { upsert: true };
      const updateDoc = {
        $set: { email: user },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ token, result });
    });



    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      if (result?.email) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });


    app.patch('/apply', async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          applicants: {
            id: ObjectId(userId),
            email,
          },
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });


    app.patch('/close', async (req, res) => {
      const jobId = req.body.jobId;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          application: {
            state: 'Closed',
          },
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.patch('/query', async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const question = req.body.question;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          queries: {
            _id: new ObjectId(),
            id: ObjectId(userId),
            email,
            question: question,
            reply: [],
          },
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });


    app.patch('/chatquery', async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const question = req.body.question;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          chatQueries: {
            _id: new ObjectId(),
            id: ObjectId(userId),
            email,
            question: question,
            reply: [],
          },
        },
      };
      const result = await jobCollection.updateOne(filter, updateDoc);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.patch('/approval', async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const approval = req.body.approval;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          approvalState: {
            _id: new ObjectId(),
            id: ObjectId(userId),
            jobId,
            email,
            approval: approval,
          },
        },
      };
      const result = await jobCollection.updateOne(filter, updateDoc);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.patch('/reply', async (req, res) => {
      const userId = req.body.userId;
      const reply = req.body.reply;
      const filter = { "queries._id": ObjectId(userId) };

      const updateDoc = {
        $push: {
          "queries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user._id": ObjectId(userId) }]
      };
      const result = await jobCollection.updateOne(filter, updateDoc, arrayFilter);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.patch('/chatreply', async (req, res) => {
      const userId = req.body.userId;
      const reply = req.body.reply;
      const filter = { "chatQueries._id": ObjectId(userId) };

      const updateDoc = {
        $push: {
          "chatQueries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user._id": ObjectId(userId) }]
      };
      const result = await jobCollection.updateOne(filter, updateDoc, arrayFilter);
      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });

    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicants: { $elemMatch: { email: email } } };
      const cursor = jobCollection.find(query).project({ applicants: 0 });
      const result = await cursor.toArray();

      res.send({ status: true, data: result });
    });

    app.get("/jobs", verifyJWT, async (req, res) => {
      const cursor = jobCollection.find({});
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.findOne({ _id: ObjectId(id) });
      res.send({ status: true, data: result });
    });

    app.post("/job", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send({ status: true, data: result });
    });

  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});