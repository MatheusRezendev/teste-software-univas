import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import Users from '../../src/components/Users'
import { server } from '../msw/server'

const novoUsuario = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@email.com',
  createdAt: '2026-11-01T10:00:00.000Z',
  tasks: []
}

async function abrirEPreencherFormulario() {
  const user = userEvent.setup()
  render(<Users />)
  await user.click(await screen.findByRole('button', { name: 'Adicionar Usuário' }))
  await user.type(screen.getByLabelText(/^nome/i), 'Ana Souza')
  await user.type(screen.getByLabelText(/^email/i), 'ana@email.com')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
}

describe('Users + API — criação de usuário (RF08 / RF09 / API01)', () => {
  // Sem globals do Vitest, o Testing Library não desmonta o componente sozinho
  afterEach(() => cleanup())

  it('envia os dados digitados, fecha o formulário e exibe o novo usuário na lista recarregada (RF08)', async () => {
    // Arrange: a lista começa vazia e passa a ter o usuário depois do POST
    let usuarios: (typeof novoUsuario)[] = []
    let corpoRecebido: unknown
    server.use(
      http.get('*/api/users', () =>
        HttpResponse.json({ success: true, count: usuarios.length, data: usuarios })
      ),
      http.post('*/api/users', async ({ request }) => {
        corpoRecebido = await request.json()
        usuarios = [novoUsuario]
        return HttpResponse.json(
          { success: true, data: { id: 'u1', name: 'Ana Souza', email: 'ana@email.com' } },
          { status: 201 }
        )
      })
    )

    // Act
    await abrirEPreencherFormulario()

    // Assert: a lista recarregada mostra o novo usuário
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@email.com')).toBeInTheDocument()

    // Assert: o corpo enviado é o que foi digitado
    expect(corpoRecebido).toEqual({ name: 'Ana Souza', email: 'ana@email.com' })

    // Assert: o formulário foi fechado
    expect(screen.queryByLabelText(/^nome/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument()
  })

  describe('quando a API responde 409 (RF09)', () => {
    beforeEach(() => {
      server.use(
        http.get('*/api/users', () => HttpResponse.json({ success: true, count: 0, data: [] })),
        http.post('*/api/users', () =>
          HttpResponse.json({ success: false, error: 'email already registered' }, { status: 409 })
        )
      )
    })

    // DEFEITO (RF09): com 409 a tela exibe "Erro ao salvar usuário", e não
    // "Email já cadastrado" como define a especificação.
    it.fails('exibe a mensagem "Email já cadastrado"', async () => {
      // Act
      await abrirEPreencherFormulario()

      // Assert
      expect(await screen.findByText('Email já cadastrado')).toBeInTheDocument()
    })

    it('mantém o formulário aberto com os dados digitados', async () => {
      // Act
      await abrirEPreencherFormulario()

      // Assert: espera a tela reagir ao 409 (qualquer mensagem de erro) antes de
      // verificar o formulário, para não passar antes da resposta chegar
      expect(await screen.findByText(/erro|já cadastrado/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^nome/i)).toHaveValue('Ana Souza')
      expect(screen.getByLabelText(/^email/i)).toHaveValue('ana@email.com')
      expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
    })
  })
})
