# Fases do modo Desafio

Cada fase começa na garagem. A pessoa monta uma lista de itens na ordem em que
vai coletá-los; essa ordem define a pilha e precisa corresponder à sequência
exigida pelos portais, do último item coletado ao primeiro. Após o último
portal, a pilha deve conter somente `Z0` para cruzar a linha de chegada.

| Fase | Rota de portais | Estoque | Plano que aceita |
|---|---|---|---|
| Aquecimento | A → L → N | N, L, A | N → L → A |
| Corrida de verdade | L → X → N → T | T, N, X, L, A | T → N → X → L |
| Rally maluco | A → T → A → N → X → L | L, X, N, N, A, A, T, T | L → X → N → A → T → A |

O plano vencedor é a rota reversa. Estoque adicional pode ser escolhido como
distrator; se sobrar equipamento após o último portal, a chegada é rejeitada.
As peças duplicadas da fase difícil são instâncias distintas, embora usem o
mesmo símbolo do PDA.
Cada mundo da rota usa um circuito com barreiras e waypoints próprios. Quando
o Deserto aparece pela segunda vez no Rally maluco, a pista é espelhada
verticalmente para manter o tema e oferecer uma variante visual diferente.
Veja [docs/circuits.md](circuits.md) para os desenhos e métricas.

## Resultados possíveis

- **Portal incorreto:** mostra o mundo/portal esperado e o equipamento no topo.
- **Pilha vazia:** informa que faltava um item antes do portal.
- **Sobra na chegada:** identifica a peça que permaneceu no topo.
- **ACEITA:** os portais foram concluídos na ordem correta e a pilha voltou a
  conter apenas `Z0`.

O Laboratório permite selecionar a rota clássica ou qualquer fase em
**Opções avançadas**. Sua tabela e seu diagrama são regenerados para os estados
e transições dessa rota. A rota e o plano tentado são carregados pelo botão
**Ver no Laboratório** na tela de resultado.

Para abrir diretamente todas as fases durante testes, use
`index.html?unlockAll=1`.

Ao vencer o Rally maluco, aparece a tela de campeã: um troféu vetorial com
nome acessível, estatísticas das três fases e ações para repetir o desafio,
voltar ao jogo ou estudar o plano no Laboratório. A conquista fica salva e
surge como insígnia na seleção de fases; confete e fanfarra são desativados
com a preferência por movimento reduzido.
