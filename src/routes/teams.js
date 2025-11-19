const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prismaClient');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function auth(req, res, next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).end();
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).end(); }
}
router.get('/', auth, async (req,res)=>{
  const teams = await prisma.team.findMany({ where: { ownerId: req.user.userId }});
  res.json(teams.map(t=> ({ id: t.id, name: t.name, pokemons: JSON.parse(t.pokemons), isPublic: t.isPublic })));
});
router.post('/', auth, async (req,res)=>{
  const { name, pokemons, isPublic } = req.body;
  const team = await prisma.team.create({
    data: { name, pokemons: JSON.stringify(pokemons||[]), ownerId: req.user.userId, isPublic: !!isPublic }
  });
  res.json({ id: team.id, name: team.name });
});
router.put('/:id', auth, async (req,res)=>{
  const id = parseInt(req.params.id);
  const { name, pokemons, isPublic } = req.body;
  const updated = await prisma.team.updateMany({
    where: { id, ownerId: req.user.userId },
    data: { name, pokemons: JSON.stringify(pokemons||[]), isPublic: !!isPublic }
  });
  res.json({ ok: true });
});
router.delete('/:id', auth, async (req,res)=>{
  const id = parseInt(req.params.id);
  await prisma.team.deleteMany({ where: { id, ownerId: req.user.userId }});
  res.json({ ok: true });
});
router.post('/:id/share', auth, async (req,res)=>{
  const id = parseInt(req.params.id);
  const team = await prisma.team.findUnique({ where: { id }});
  if(!team || team.ownerId !== req.user.userId) return res.status(403).end();
  const exists = await prisma.publicShare.findUnique({ where: { teamId: id }});
  if(!exists) await prisma.publicShare.create({ data: { teamId: id }});
  res.json({ ok: true });
});
router.get('/public/all', async (req,res)=>{
  const shares = await prisma.publicShare.findMany({ include: { team: true }});
  res.json(shares.map(s=> ({ id: s.team.id, name: s.team.name, pokemons: JSON.parse(s.team.pokemons), ownerId: s.team.ownerId })));
});
module.exports = router;
