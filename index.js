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
    // await client.connect();
    const database = client.db("idea_vault");
    const ideasCollection = database.collection("ideas");

    app.get("/trending-ideas", async (req, res) => {
      // Implementation for trending ideas
      // sort base on comments and likes
      const trendingIdeas = await ideasCollection
        .find({})
        .sort({ comments: -1, likes: -1 })
        .limit(6)
        .toArray();
      res.json(trendingIdeas);
    });

    app.get("/ideas", async (req, res) => {
      const { search, category } = req.query;

      if (!search && !category) {
        const ideas = await ideasCollection.find({});
        const result = await ideas.toArray();
        return res.json(result);
      }
      const ideas = await ideasCollection.find({
        $or: [
          {
            title: {
              $regex: search == "" ? "NOTGIVEN" : search,
              $options: "i",
            },
          },
          {
            category: {
              $regex: category == "" ? "NOTGIVEN" : category,
              $options: "i",
            },
          },
        ],
      });
      const result = await ideas.toArray();

      res.json(result);
    });

    app.get("/ideas/:ideasId", verifyToken, async (req, res) => {
      const ideasId = req.params.ideasId;
      const query = {
        _id: new ObjectId(ideasId),
      };
      const result = await ideasCollection.findOne(query);
      res.json(result);
    });

    app.patch("/ideas/:ideasId", verifyToken, async (req, res) => {
      const ideasId = req.params.ideasId;
      const filter = {
        _id: new ObjectId(ideasId),
      };
      const updatedIdea = req.body;
      const updateDoc = {
        $set: updatedIdea,
      };
      const result = await ideasCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    app.delete("/ideas/:ideasId", async (req, res) => {
      const ideasId = req.params.ideasId;
      const query = {
        _id: new ObjectId(ideasId),
      };
      const deleteIdea = await ideasCollection.deleteOne(query);
      res.json(deleteIdea);
    });

    app.get("/my-ideas/:userId", verifyToken, async (req, res) => {
      const userId = req.params.userId;
      const query = {
        "userInfo.id": userId,
      };
      const result = await ideasCollection.find(query).toArray();
      res.json(result);
    });

    app.post("/ideas", verifyToken, async (req, res) => {
      const ideaData = req.body;
      const insertedIdea = await ideasCollection.insertOne(ideaData);
      res.json(insertedIdea);
    });

    // await client.db("admin").command({ ping: 1 });
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
