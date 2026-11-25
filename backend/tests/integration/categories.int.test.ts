import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { prisma, resetDb, seedUserAndCategory } from './helpers/db'

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await resetDb()
})

// Contrato API03 (aplica a RN02): DELETE /api/categories/:id
describe('DELETE /api/categories/:id (API03)', () => {
  it('exclui uma categoria sem tarefas, responde 200 e remove do banco', async () => {
    // Arrange
    const categoria = await prisma.category.create({ data: { name: 'estudo' } })

    // Act
    const res = await request(app).delete(`/api/categories/${categoria.id}`)

    // Assert: resposta
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Assert: efeito no banco
    expect(await prisma.category.findUnique({ where: { id: categoria.id } })).toBeNull()
  })

  it('recusa excluir uma categoria com uma tarefa, responde 400 e mantém categoria e tarefa', async () => {
    // Arrange: uma tarefa é o valor-limite da RN02
    const { user, category } = await seedUserAndCategory()
    const tarefa = await prisma.task.create({
      data: { title: 'Prova', userId: user.id, categoryId: category.id }
    })

    // Act
    const res = await request(app).delete(`/api/categories/${category.id}`)

    // Assert: resposta
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)

    // Assert: nada foi apagado
    expect(await prisma.category.findUnique({ where: { id: category.id } })).not.toBeNull()
    expect(await prisma.task.findUnique({ where: { id: tarefa.id } })).not.toBeNull()
  })

  // DEFEITO (API03): para id inexistente a API responde 500 em vez de 404.
  it.fails('responde 404 para uma categoria inexistente', async () => {
    // Arrange
    await prisma.category.create({ data: { name: 'estudo' } })

    // Act
    const res = await request(app).delete('/api/categories/inexistente')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(await prisma.category.count()).toBe(1)
  })
})

// Contrato API04 (aplica a RN03): POST /api/categories
describe('POST /api/categories (API04)', () => {
  it('cria uma categoria com nome inédito, responde 201 e grava no banco', async () => {
    // Act
    const res = await request(app).post('/api/categories').send({ name: 'Estudo' })

    // Assert
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(await prisma.category.count()).toBe(1)
  })

  it('cria uma categoria com nome diferente de uma já existente', async () => {
    // Arrange
    await prisma.category.create({ data: { name: 'trabalho' } })

    // Act
    const res = await request(app).post('/api/categories').send({ name: 'Estudo' })

    // Assert
    expect(res.status).toBe(201)
    expect(await prisma.category.count()).toBe(2)
  })

  it('responde 409 e não cria categoria quando o nome já existe idêntico', async () => {
    // Arrange
    await prisma.category.create({ data: { name: 'trabalho' } })

    // Act
    const res = await request(app).post('/api/categories').send({ name: 'trabalho' })

    // Assert
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(await prisma.category.count()).toBe(1)
  })

  // DEFEITO (API04/RN03): a API não normaliza o nome antes de comparar; nomes que
  // só diferem em caixa ou espaços são aceitos com 201 e geram duplicata no banco.
  it.fails.each([
    { existente: ' trabalho ', novo: 'Trabalho', caso: 'exemplo da especificação' },
    { existente: 'trabalho da faculdade', novo: '  Trabalho   da\tFaculdade ', caso: 'espaços internos e caixa' },
  ])(
    'responde 409 e não cria categoria quando o nome normalizado já existe ($caso)',
    async ({ existente, novo }) => {
      // Arrange
      await prisma.category.create({ data: { name: existente } })

      // Act
      const res = await request(app).post('/api/categories').send({ name: novo })

      // Assert
      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(await prisma.category.count()).toBe(1)
    },
  )
})
