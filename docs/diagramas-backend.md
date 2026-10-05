# Diagramas do back-end

Os diagramas abaixo representam a implementação atual do repositório. Eles descrevem
componentes de servidor, persistência SQLite e comunicação HTTP da API; não representam
telas ou componentes de front-end.

## Diagrama de componentes

![Diagrama de componentes do back-end](./diagramas/componentes.png)

O fluxo passa pelas rotas Express, pelo middleware JWT, pelos controllers e pelos
modelos responsáveis pelas regras de negócio e pelas transações no SQLite.

## Diagrama entidade-relacionamento

![Diagrama entidade-relacionamento do SQLite](./diagramas/der.png)

O modelo apresenta as tabelas de usuários, pedidos, itens, pagamentos, produtos,
movimentações de estoque e fidelidade criadas em `init_db.js`.

## Diagrama de sequência da API de pedidos

![Diagrama de sequência da API](./diagramas/sequencia.png)

O fluxo mostra a criação autenticada do pedido e o registro posterior do pagamento
mock, com mudança para `EM_PREPARO` quando aprovado ou `CANCELADO` quando recusado.
