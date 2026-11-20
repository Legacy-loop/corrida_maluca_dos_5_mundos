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
