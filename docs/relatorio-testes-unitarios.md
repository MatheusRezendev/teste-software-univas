# Relatório — Testes unitários com IA generativa

**Aluno(s):** Matheus Reginato Rezende
**Ferramenta de IA utilizada:** Claude Code
**Unidade testada:** `backend/src/utils/taskRules.ts` — RN01 (`canTransition`) e `backend/src/utils/normalize.ts` — RN03 (`normalizeName`)

## 1. Tabela de casos (elaborada antes de usar a IA)

Os valores esperados vêm de `docs/especificacao.md`, não da implementação.

### RN01 — `canTransition(from, to)`

| # | Entrada (from → to) | Resultado esperado | Técnica | Regra |
|---|---------------------|--------------------|---------|-------|
| 1 | PENDING → IN_PROGRESS | true | partição (transição permitida) | RN01 |
| 2 | PENDING → CANCELLED | true | partição (cancelar antes de iniciar) | RN01 |
| 3 | PENDING → COMPLETED | false | inválido (pula etapa) | RN01 |
| 4 | PENDING → PENDING | false | inválido (mesmo status) | RN01 |
| 5 | IN_PROGRESS → COMPLETED | true | partição | RN01 |
| 6 | IN_PROGRESS → CANCELLED | true | partição | RN01 |
| 7 | IN_PROGRESS → PENDING | false | inválido (volta atrás) | RN01 |
| 8 | IN_PROGRESS → IN_PROGRESS | false | inválido (mesmo status) | RN01 |
| 9–12 | COMPLETED → cada um dos 4 status | false | inválido (status final) | RN01 |
| 13–16 | CANCELLED → cada um dos 4 status | false | inválido (status final) | RN01 |

### RN03 — `normalizeName(name)`

| # | Entrada | Resultado esperado | Técnica | Regra |
|---|---------|--------------------|---------|-------|
| 1 | `"  Ana  "` | `"ana"` | partição (trim) | RN03.1 |
| 2 | `"\t\nAna\n\t"` | `"ana"` | partição (trim de tab/quebra de linha) | RN03.1 |
| 3 | `"ANA MARIA"` | `"ana maria"` | partição (minúsculas) | RN03.3 |
| 4 | `"Ana Maria"` | `"ana maria"` | valor-limite (1 espaço, nada a colapsar) | RN03.2 |
| 5 | `"Ana  Maria"` | `"ana maria"` | valor-limite (2 espaços) | RN03.2 |
| 6 | `"Ana     Maria"` | `"ana maria"` | partição (vários espaços) | RN03.2 |
| 7 | `"Ana\tMaria"` | `"ana maria"` | partição (tabulação) | RN03.2 |
| 8 | `"Ana\nMaria"` | `"ana maria"` | partição (quebra de linha) | RN03.2 |
| 9 | `"Ana \t\n Maria"` | `"ana maria"` | partição (mistura de espaços em branco) | RN03.2 |
| 10 | `"  Trabalho   da  Faculdade "` | `"trabalho da faculdade"` | exemplo da especificação | RN03 |
| 11 | `""` | `""` | valor-limite (vazio) | RN03 |
| 12 | `" \t\n "` | `""` | valor-limite (só espaços em branco) | RN03 |
| 13 | `"Trabalho   da Faculdade"` vs `"  trabalho da\tFACULDADE "` | mesmo resultado | duplicidade | RN03 |
| 14 | `"Trabalho"` vs `"Estudo"` | resultados diferentes | duplicidade (negativo) | RN03 |

## 2. Prompt utilizado

```
Contexto: funções canTransition (backend/src/utils/taskRules.ts, regra RN01) e
normalizeName (backend/src/utils/normalize.ts, regra RN03) de docs/especificacao.md.
Use a implementação apenas para conhecer a assinatura das funções.

Tarefa: escreva testes unitários em backend/tests/unit/taskRules.test.ts e
backend/tests/unit/normalize.test.ts.

Casos obrigatóriosvalidei: as tabelas da seção 1 deste relatório.

Restrições: siga o AGENTS.md. Não altere src/. Se um teste que segue a
especificação falhar, não o ajuste: marque com it.fails e um comentário com a regra violada.

Saída: execute npm test e liste cada teste com o caso da tabela que ele verifica.
```

## 3. Revisão do teste gerado

| Problema encontrado no teste gerado | Ajuste solicitado ou realizado |
|-------------------------------------|--------------------------------|
| O agente leu a implementação de `canTransition` e `normalizeName` ao inspecionar os arquivos (risco de teste-espelho). | Valores esperados conferidos contra `docs/especificacao.md`; nenhum foi copiado do código. Foi isso que expôs o defeito de `PENDING → CANCELLED`. |
| O caso `PENDING → CANCELLED` (falha pela especificação) não pode ficar dentro do `it.each`, pois `it.fails` se aplicaria à tabela inteira. | Caso isolado em um `it.fails` próprio, com comentário da regra violada (RN01); valor esperado mantido (`true`), sem ajuste para passar. |
| Os nomes dos testes de tabela (`... retorna true/false`) descrevem o resultado, não o comportamento esperado em português como pede o `AGENTS.md`. | Não ajustado: os nomes de `taskRules.test.ts` seguem a tabela da especificação e estão rastreáveis a cada caso. Candidato a reescrita se o professor exigir. |
| Os 6 mutantes sobreviventes em `taskRules.ts:5` poderiam sugerir testes faltando. | Analisados: guard redundante (mutantes equivalentes), nenhum caso novo necessário. |

## 4. Resultados

- Testes criados: 33 (RN01: 15 + 1 `it.fails`; RN03: 14; RN02 já existente: 3 — total do projeto) | aprovados: 32 | reprovados: 0 (1 falha esperada, `it.fails`)
- Cobertura de linhas da unidade: 100 % (`src/utils`: 6/6 linhas, 13/13 branches)
- Score de mutação (backend): 87,23 % total — `categoryRules.ts` 100 %, `normalize.ts` 100 %, `taskRules.ts` 83,78 % (31 mortos, 6 sobreviventes)

**Mutantes sobreviventes (6, todos em `taskRules.ts:5`):** o guard
`if (from === 'COMPLETED' || from === 'CANCELLED') return false` é redundante: sem ele, as
linhas seguintes já retornam `false` para esses status. Remover ou alterar o guard não muda
nenhum resultado observável, logo são **mutantes equivalentes** e nenhum caso novo os mata.

## 5. Defeitos encontrados (divergências entre especificação e código)

| Regra | Comportamento especificado | Comportamento observado | Teste que evidencia |
|-------|----------------------------|-------------------------|---------------------|
| RN01 | `PENDING → CANCELLED` é permitido ("uma tarefa pendente pode ser cancelada antes de ser iniciada") | `canTransition('PENDING', 'CANCELLED')` retorna `false` | `taskRules.test.ts` › `it.fails('permite cancelar uma tarefa pendente (PENDING -> CANCELLED)')` |

---

# Parte 2 — Testes de integração com IA generativa

**Unidades testadas:** backend API03, API04 e API05 (+ API02, caso criado pela sabotagem);
frontend RF08 e RF09 (componente `Users`).

## 1. Tabela de casos (a partir de `docs/especificacao.md`)

### Backend (Supertest + PostgreSQL de teste `teste_software_test_db`)

| # | Estado inicial | Requisição | Resposta esperada | Efeito no banco | Regra |
|---|----------------|------------|-------------------|-----------------|-------|
| 1 | categoria sem tarefas | `DELETE /api/categories/:id` | 200 | categoria removida | API03 |
| 2 | categoria com 1 tarefa (valor-limite) | `DELETE /api/categories/:id` | 400 | categoria e tarefa mantidas | API03 / RN02 |
| 3 | 1 categoria qualquer | `DELETE /api/categories/inexistente` | 404 | nenhum (count = 1) | API03 |
| 4 | banco vazio | `POST /api/categories` `{name:"Estudo"}` | 201 | categoria criada (count = 1) | API04 |
| 5 | existe `trabalho` | `POST` `{name:"Estudo"}` | 201 | count = 2 | API04 |
| 6 | existe `trabalho` | `POST` `{name:"trabalho"}` | 409 | nenhuma criada (count = 1) | API04 |
| 7 | existe `" trabalho "` | `POST` `{name:"Trabalho"}` | 409 | nenhuma criada (count = 1) | API04 / RN03 |
| 8 | existe `trabalho da faculdade` | `POST` `{name:"  Trabalho   da\tFaculdade "}` | 409 | nenhuma criada (count = 1) | API04 / RN03 |
| 9–12 | tarefa em `PENDING`, `IN_PROGRESS`, `IN_PROGRESS`, `PENDING` | `PUT /api/tasks/:id` com `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `CANCELLED` | 200 | novo status gravado | API05 / RN01 |
| 13–16 | tarefa em `COMPLETED`, `CANCELLED`, `PENDING`, `IN_PROGRESS` | `PUT` com `PENDING`, `IN_PROGRESS`, `COMPLETED`, `PENDING` | 400 | tarefa inalterada (status e `updatedAt`) | API05 / RN04 |
| 17 | banco vazio | `PUT /api/tasks/inexistente` | 404 | nenhum | API05 |
| 18 | Ana com 1 tarefa, Bruno sem tarefas | `GET /api/users` | 200, `count` 2, `tasks` com 1 item / `[]` | nenhum | API02 (novo, sabotagem S3) |

### Frontend (Testing Library + MSW)

| # | Estado inicial (handler MSW) | Ação do usuário | Resultado esperado | Requisição verificada | Regra |
|---|------------------------------|-----------------|--------------------|-----------------------|-------|
| 1 | `GET` vazio; após `POST` (201) passa a devolver o novo usuário | Adicionar Usuário → Nome, Email → Criar | formulário fechado; lista recarregada mostra o usuário | corpo do `POST` = `{name, email}` digitados | RF08 / API01 |
| 2 | `POST` responde 409 | idem | mensagem "Email já cadastrado" | — | RF09 |
| 3 | `POST` responde 409 | idem | formulário aberto com Nome e Email preenchidos | — | RF09 |

## 2. Prompts utilizados

```
Contexto: rotas DELETE /api/categories/:id, POST /api/categories e PUT /api/tasks/:id,
contratos API03, API04 e API05 e regras RN01–RN04 de docs/especificacao.md.
Tarefa: escreva testes de integração em backend/tests/integration/categories.int.test.ts
e backend/tests/integration/tasks.int.test.ts.
Casos obrigatórios (definidos por mim): tabela "Backend" da seção 1 (casos 1–17).
Restrições: siga o AGENTS.md (seção Testes de integração). Use request(app) e os helpers
de helpers/db.ts. Não use vi.mock. Não altere src/.
Saída: execute npm run test:integration e relacione cada teste a uma linha da tabela.
```

```
Contexto: componente Users (frontend/src/components/Users.tsx), requisitos RF08 e RF09
e contrato API01 de docs/especificacao.md.
Tarefa: escreva testes de integração em frontend/tests/integration/Users.create.int.test.tsx.
Casos obrigatórios (definidos por mim): tabela "Frontend" da seção 1.
Restrições: siga o AGENTS.md (seção Testes de integração). Simule a API com MSW no
formato do contrato ({ success, data }); não use vi.spyOn(api). Verifique o corpo do POST.
Não altere src/.
Saída: execute npm run test:integration e relacione cada teste a uma linha da tabela.
```

## 3. Revisão do teste gerado

| Problema encontrado no teste gerado | Ajuste solicitado ou realizado |
|-------------------------------------|--------------------------------|
| Frontend: `getByLabelText('Nome')` não encontrava o campo, pois o rótulo é `"Nome:"` (com dois-pontos). | Localizador trocado por `/^nome/i` e `/^email/i`. Só o localizador mudou, nenhuma asserção. |
| Frontend: sem `globals` no Vitest, o Testing Library não desmontava o componente entre testes e o render do RF08 vazava para o RF09. | `afterEach(() => cleanup())` no arquivo de teste. |
| Frontend: o teste do RF09 verificava mensagem e formulário juntos; com a mensagem errada (defeito), a verificação do formulário nem rodava. | Separado em dois testes: mensagem (`it.fails`) e formulário aberto (passa). O segundo espera a tela reagir ao 409 antes de verificar, para não passar antes da resposta. |
| Backend: `PENDING → CANCELLED` foi escrito como `it.fails` supondo o defeito da unidade `canTransition`, mas a API não aplica a RN01 e aceitou a transição. | Movido para a tabela de transições aceitas (teste normal). Defeito real registrado na seção 5. |
| Frontend: o handler de 409 do MSW poderia ter a mensagem da especificação no corpo e esconder o defeito do RF09. | Corpo do 409 usa uma mensagem neutra (`email already registered`) no formato do contrato, para que só o componente produza "Email já cadastrado". |
| Teste novo de API02 falhou sem sabotagem (`seedUserAndCategory` não importado). | Import corrigido; reexecutado sem sabotagem (passa) e com S3 (falha). |

## 4. Resultados

- Backend (`npm run test:integration`): 20 testes, 12 aprovados, 8 falhas esperadas (`it.fails`), 0 reprovados.
- Frontend (`npm run test:integration`): 4 testes, 3 aprovados, 1 falha esperada (`it.fails`), 0 reprovados.
- Testes unitários do backend continuam passando (`npm test`: 32 aprovados, 1 falha esperada).

### Sabotagem controlada (uma por vez, desfeita com `git restore src/`)

| # | Sabotagem | Arquivo | Regra | Detectada? | Teste que falhou |
|---|-----------|---------|-------|------------|------------------|
| S1 | Remover a checagem `canDeleteCategory` | `categoryController.ts` | API03 | Sim | `recusa excluir uma categoria com uma tarefa, responde 400 e mantém categoria e tarefa` |
| S2 | Trocar 409 por 400 | `userController.ts` | API01 | Sim | `responde 409 ao repetir um email já cadastrado` |
| S3 | Remover `include: { tasks }` de `getUsers` | `userController.ts` | API02 | **Não** na 1ª rodada → novo caso 18. Sim após o caso novo | `GET /api/users (API02) › responde 200 com count e cada usuário com sua lista tasks` |
| S4 | Remover `fetchUsers()` após salvar | `Users.tsx` | RF08 | Sim | `envia os dados digitados, fecha o formulário e exibe o novo usuário na lista recarregada (RF08)` |

## 5. Defeitos encontrados (divergências entre especificação e código)

| Regra | Comportamento especificado | Comportamento observado | Teste que evidencia |
|-------|----------------------------|-------------------------|---------------------|
| API03 | Categoria inexistente: `404` | `500` | `categories.int.test.ts` › `it.fails('responde 404 para uma categoria inexistente')` |
| API04 / RN03 | Nome que coincide após normalização: `409`, nenhuma categoria criada | `201` e categoria duplicada gravada (só nomes idênticos dão 409) | `categories.int.test.ts` › `it.fails.each(... nome normalizado já existe ...)` (2 casos) |
| API05 / RN04 | Transição proibida pela RN01: `400`, tarefa inalterada | `200` e o novo status é gravado (ex.: `COMPLETED → PENDING`) | `tasks.int.test.ts` › `it.fails.each('recusa $de -> $para ...')` (4 casos) |
| API05 | Tarefa inexistente: `404` | `500` | `tasks.int.test.ts` › `it.fails('responde 404 para uma tarefa inexistente')` |
| RF09 | 409 ao criar usuário exibe "Email já cadastrado" | exibe "Erro ao salvar usuário" | `Users.create.int.test.tsx` › `it.fails('exibe a mensagem "Email já cadastrado"')` |

Observação: na API, `PENDING → CANCELLED` é aceito (como a especificação manda), ao contrário da
unidade `canTransition`. Pelo comportamento observado, a API não aplica a RN01, o que esconde esse defeito da unidade e
expõe o defeito mais grave da RN04.
