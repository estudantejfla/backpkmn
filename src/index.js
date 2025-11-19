require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
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
    if (!username || !password) return res.status(400).json({ error: "missing" });

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: "username_taken" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashed }
    });

    const token = createToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: "invalid" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "invalid" });

    const token = createToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch {
    res.status(500).json({ error: "server" });
  }
});

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "token_missing" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "token_invalid" });
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
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/teams", auth, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { ownerId: req.user.id }
    });
    res.json(teams);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.put("/api/teams/:id", auth, async (req, res) => {
  try {
    const { name, pokemons } = req.body;

    const team = await prisma.team.update({
      where: { id: Number(req.params.id), ownerId: req.user.id },
      data: {
        name,
        pokemons: JSON.stringify(pokemons)
      }
    });

    res.json(team);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.delete("/api/teams/:id", auth, async (req, res) => {
  try {
    await prisma.team.delete({
      where: { id: Number(req.params.id), ownerId: req.user.id }
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.patch("/api/teams/:id/public", auth, async (req, res) => {
  try {
    const team = await prisma.team.update({
      where: { id: Number(req.params.id), ownerId: req.user.id },
      data: { isPublic: true }
    });
    res.json(team);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.patch("/api/teams/:id/private", auth, async (req, res) => {
  try {
    const team = await prisma.team.update({
      where: { id: Number(req.params.id), ownerId: req.user.id },
      data: { isPublic: false }
    });
    res.json(team);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/public", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: { isPublic: true },
      include: { owner: { select: { username: true } } }
    });
    res.json(teams);
  } catch {
    res.status(500).json({ error: "server" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
  console.log("DB:", process.env.DATABASE_URL);
});
