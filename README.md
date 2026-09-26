# Raízes do Nordeste

## Backend da plataforma de gestão de pedidos

Este repositório contém o backend do projeto multidisciplinar **Raízes do Nordeste**, desenvolvido para apoiar a organização de pedidos de pequenos produtores e cooperativas.

A aplicação disponibiliza uma API RESTful para registrar pedidos, validar seus itens, calcular o valor total e persistir os dados em um banco SQLite. A solução foi estruturada com separação de responsabilidades para facilitar a manutenção, os testes e futuras integrações com aplicações web, totens de atendimento e dispositivos móveis.

## Escopo atual

Nesta versão, o sistema concentra-se no fluxo de **criação de pedidos**. Cada pedido possui um cliente e uma lista de itens, contendo produto, quantidade e preço unitário.

As funcionalidades de estoque, fidelização e outros canais de atendimento fazem parte da visão de evolução do projeto e poderão ser incorporadas em versões futuras.

## Objetivos

- Disponibilizar uma API simples e consistente para criação de pedidos.
- Separar apresentação, regras de negócio e persistência de dados.
- Validar informações recebidas antes da gravação no banco.
- Calcular o total do pedido a partir dos seus itens.
- Manter uma base preparada para testes e futuras expansões.

## Evolução da solução

### V1: estrutura inicial

A primeira versão concentrava a configuração do servidor, as rotas e a lógica de criação de pedidos em uma estrutura reduzida. Essa abordagem facilitava o primeiro protótipo, mas aumentava o acoplamento e dificultava a manutenção.

### V2: arquitetura modular

A versão atual separa as principais responsabilidades da aplicação:

- **Aplicação:** configura o Express e os middlewares.
- **Rotas:** define os caminhos públicos da API.
- **Controller:** valida a requisição e coordena o caso de uso.
- **Model:** realiza a persistência dos pedidos e itens no SQLite.
- **Testes:** verifica os principais comportamentos do endpoint.

## Tecnologias

| Tecnologia | Utilização |
| --- | --- |
| Node.js 20 LTS | Ambiente de execução JavaScript |
| Express.js | Servidor HTTP e organização das rotas |
| SQLite3 | Persistência local dos pedidos |
| Helmet | Proteção de cabeçalhos HTTP |
| CORS | Controle de acesso entre origens |
| Jest | Execução dos testes automatizados |
| Supertest | Testes de integração da API |
| GitHub Actions | Execução remota da instalação e dos testes |

## Organização do projeto

```text
.
├── src/
│   ├── app.js                         # Configuração do Express e middlewares
│   ├── server.js                      # Inicialização do servidor
│   ├── controllers/
│   │   └── PedidoController.js        # Validação e regra do caso de uso
│   ├── models/
│   │   └── Pedido.js                  # Persistência no SQLite
│   └── routes/
│       └── pedidoRoutes.js            # Rota de pedidos
├── tests/
│   └── pedido.test.js                 # Testes automatizados
├── init_db.js                         # Criação idempotente das tabelas
├── package.json                       # Dependências e comandos
├── database.sqlite                    # Banco local gerado pela aplicação
└── .github/workflows/tests.yml        # Pipeline de testes no GitHub
```

## Modelo de dados

O banco possui duas tabelas relacionadas:

### `pedidos`

Armazena o identificador do cliente, o valor total e a data de criação.

### `itens_pedido`

Armazena os produtos associados ao pedido, incluindo quantidade e preço unitário. A coluna `pedidoId` relaciona cada item ao seu pedido.

## Endpoint disponível

### Criar pedido

```http
POST /api/pedidos
Content-Type: application/json
```

#### Requisição

```json
{
  "clienteId": 123,
  "itens": [
    {
      "produto": "Feijão",
      "quantidade": 2,
      "precoUnitario": 5.99
    }
  ]
}
```

#### Resposta de sucesso `201 Created`

```json
{
  "id": 1,
  "total": 11.98
}
```

#### Validações

A API rejeita requisições que não possuam cliente, que tenham a lista de itens vazia ou que contenham produto, quantidade ou preço inválidos. Nesses casos, retorna `400 Bad Request` com uma mensagem de erro em JSON.

## Execução local

> O ambiente precisa ter Node.js 20 ou versão compatível instalado.

```bash
npm install
npm run init-db
npm start
```

Por padrão, o servidor é disponibilizado em:

```text
http://localhost:3000
```

A porta pode ser alterada pela variável de ambiente `PORT`.

## Testes

Para executar os testes automatizados:

```bash
npm test
```

Os cenários cobrem a criação bem-sucedida de um pedido, a ausência do identificador do cliente e a validação de quantidade inválida.

O projeto também possui uma rotina em **GitHub Actions**. A cada alteração enviada ao branch `main`, o GitHub instala as dependências, inicializa o banco e executa os testes automaticamente.

## Qualidade e segurança

- Separação entre rotas, controllers e models.
- Validação dos dados de entrada.
- Uso de consultas parametrizadas no SQLite.
- Helmet habilitado para proteção dos cabeçalhos HTTP.
- CORS configurado para permitir a integração com clientes externos.
- Testes automatizados executados no pipeline do GitHub.

## Próximas etapas

- Adicionar consulta e atualização de pedidos.
- Incorporar controle de estoque.
- Criar regras de fidelização de clientes.
- Avaliar a adoção de um ORM, como Prisma ou Sequelize.
- Expandir a cobertura de testes.
- Integrar a API a uma interface web, totens ou aplicativo móvel.

## Contexto acadêmico

Projeto desenvolvido na disciplina de Projeto Multidisciplinar: Engenharia de Software, do curso de Análise e Desenvolvimento de Sistemas da UNINTER.
