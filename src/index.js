require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Missing fields" });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "username_taken" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashed }
    });

    const token = createToken(user);

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "invalid_credentials" });

    const token = createToken(user);

    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "no_token" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.post("/api/teams", auth, async (req, res) => {
  try {
    const { name, pokemons, isPublic } = req.body;

    const team = await prisma.team.create({
      data: {
        name,
        pokemons: JSON.stringify(pokemons),
        isPublic: !!isPublic,
        ownerId: req.user.id
      }
    });

    res.json(team);
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/teams", auth, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { ownerId: req.user.id }
    });

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/public", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { isPublic: true }
    });

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
  console.log("DATABASE:", process.env.DATABASE_URL);
});
