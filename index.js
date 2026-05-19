const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { verify } = require("node:crypto");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

const run = async () => {
  try {
    await client.connect();
    const database = client.db("idea_vault");
    const ideasCollection = database.collection("ideas");

    app.get("/ideas", async (req, res) => {
      const { search } = req.query;
      let ideas;
      if (search) {
        ideas = await ideasCollection.find({
          title: {
            $regex: search,
            $options: "i",
          }
        })
      }
      else {
        ideas = await ideasCollection.find();
      }
      const result = await ideas.toArray();
      res.json(result);
    });

    app.get("/ideas/:ideasId", async (req, res) => {
      const ideasId = req.params.ideasId;
      const query = {
        _id: new ObjectId(ideasId),
      };
      const result = await ideasCollection.findOne(query);
      res.json(result);
    });

    app.post("/ideas", verifyToken, async (req, res) => {
      const ideaData = req.body;
      const insertedIdea = await ideasCollection.insertOne(ideaData);
      res.json(insertedIdea);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Idea Vault Server!");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
