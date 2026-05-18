const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

const run = async () => {
  try {
    await client.connect();
    const database = client.db("idea_vault");
    const ideasCollection = database.collection("ideas");

    app.get("/ideas", async (req, res) => {
      const cursor = ideasCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/ideas", async (req, res) => {
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
