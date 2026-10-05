# Evidências do roteiro

Este documento organiza as evidências técnicas do projeto para auxiliar o preenchimento
do relatório acadêmico. As afirmações devem ser conferidas após executar os testes no
ambiente com Node.js instalado.

## Fluxo principal implementado

1. O usuário realiza cadastro e login em `/api/auth`.
2. O login retorna um token JWT.
3. O usuário autenticado cria um pedido em `POST /api/pedidos`.
4. A API exige `canalPedido`, valida os itens, consulta o produto e verifica o estoque.
5. O pedido é persistido em SQLite; o estoque é reduzido e os pontos são registrados.
6. O pagamento pode ser registrado em `POST /api/pedidos/:id/pagamento-mock`.
7. Pagamento aprovado altera o pedido para `EM_PREPARO`.
8. Pagamento recusado altera o pedido para `CANCELADO`.

## Requisitos funcionais atendidos

| Código | Requisito | Evidência |
| --- | --- | --- |
| RF01 | Cadastro de usuário | `src/controllers/AuthController.js` |
| RF02 | Login com JWT | `src/controllers/AuthController.js` e `src/middleware/authMiddleware.js` |
| RF03 | Criação de pedido | `src/controllers/PedidoController.js` |
| RF04 | Validação de itens e cálculo do total | `src/controllers/PedidoController.js` |
| RF05 | Persistência em SQLite | `src/models/Pedido.js` e `init_db.js` |
| RF06 | Controle de estoque integrado ao pedido | `src/models/Pedido.js` |
| RF07 | Pontos de fidelidade | `src/models/Pedido.js` |
| RF08 | Canal de origem do pedido | coluna `pedidos.canalPedido` |
| RF09 | Filtro por canal | `GET /api/pedidos?canalPedido=TOTEM` |
| RF10 | Pagamento simulado | `POST /api/pedidos/:id/pagamento-mock` |

## Requisitos ainda pendentes

Os itens abaixo não devem ser declarados como implementados sem evidência adicional:

- documentação Swagger/OpenAPI;
- gestão de unidades e cardápio por unidade;
- logs/auditoria de ações sensíveis;
- regras de perfil/role além da autenticação por token.

## Cenários de teste planejados

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| T01 | Cadastro válido | `201` |
| T02 | Login válido | `200` e token JWT |
| T03 | Acesso sem token | `401` |
| T04 | Criação com itens válidos e canal | `201` |
| T05 | Criação sem `canalPedido` | `400` |
| T06 | Produto inexistente | `404` |
| T07 | Estoque insuficiente | `400` |
| T08 | Listagem filtrada por canal | `200` |
| T09 | Pagamento mock aprovado | `200` e pedido `EM_PREPARO` |
| T10 | Pagamento mock recusado | `200` e pedido `CANCELADO` |

## Declaração de uso de IA

O roteiro exige declaração de ferramentas e trechos aproveitados quando IA for utilizada.
Antes da entrega, registre a ferramenta utilizada, descreva quais sugestões foram aceitas
e revise todo o texto e código para garantir domínio e autoria das decisões.
