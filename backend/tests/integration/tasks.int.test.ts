import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prisma, resetDb, seedUserAndCategory } from './helpers/db'

type Status = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

async function criarTarefa(status: Status) {
  const { user, category } = await seedUserAndCategory()
  return prisma.task.create({
    data: { title: 'Prova', status, userId: user.id, categoryId: category.id }
  })
}

// Contrato API05 (aplica a RN01 e a RN04): PUT /api/tasks/:id
describe('PUT /api/tasks/:id (API05)', () => {
  beforeEach(async () => {
    await resetDb()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it.each<{ de: Status; para: Status }>([
    { de: 'PENDING', para: 'IN_PROGRESS' },
    { de: 'IN_PROGRESS', para: 'COMPLETED' },
    { de: 'IN_PROGRESS', para: 'CANCELLED' },
    { de: 'PENDING', para: 'CANCELLED' },
  ])('aceita $de -> $para, responde 200 e grava o novo status', async ({ de, para }) => {
    // Arrange
    const tarefa = await criarTarefa(de)

    // Act
    const res = await request(app).put(`/api/tasks/${tarefa.id}`).send({ status: para })

    // Assert: resposta
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Assert: efeito no banco
    const noBanco = await prisma.task.findUnique({ where: { id: tarefa.id } })
    expect(noBanco?.status).toBe(para)
  })

  // DEFEITO (API05/RN04): a API não aplica a RN01; transições proibidas são
  // aceitas com 200 e o novo status é gravado no banco.
  it.fails.each<{ de: Status; para: Status }>([
    { de: 'COMPLETED', para: 'PENDING' },
    { de: 'CANCELLED', para: 'IN_PROGRESS' },
    { de: 'PENDING', para: 'COMPLETED' },
    { de: 'IN_PROGRESS', para: 'PENDING' },
  ])('recusa $de -> $para, responde 400 e mantém a tarefa inalterada', async ({ de, para }) => {
    // Arrange
    const tarefa = await criarTarefa(de)

    // Act
    const res = await request(app).put(`/api/tasks/${tarefa.id}`).send({ status: para })

    // Assert: resposta
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)

    // Assert: a tarefa no banco não mudou
    const noBanco = await prisma.task.findUnique({ where: { id: tarefa.id } })
    expect(noBanco?.status).toBe(de)
    expect(noBanco?.updatedAt).toEqual(tarefa.updatedAt)
  })

  // DEFEITO (API05): para id inexistente a API responde 500 em vez de 404.
  it.fails('responde 404 para uma tarefa inexistente', async () => {
    // Act
    const res = await request(app).put('/api/tasks/inexistente').send({ status: 'IN_PROGRESS' })

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})
