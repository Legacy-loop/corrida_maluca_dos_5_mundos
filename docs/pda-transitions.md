# PDA do Rally dos 5 Mundos

O estado inicial é `q0` e a pilha inicial é `[Z0]`. O último elemento do array é o topo.
Na rota clássica, a lista de portais é `A,L,N,X,T`. No modo Desafio, a lista
é definida pela fase selecionada: cada portal `r[i]` só pode remover `r[i]`
do topo e avança de `q[i]` para `q[i+1]`. Depois do último portal, `f` aceita
somente com `Z0` no topo. Assim, a mesma implementação gera estados
`q0…qN` para rotas de tamanhos diferentes.

## Coleta

Em `q0`, cada símbolo minúsculo empilha seu correspondente:

```text
δ(q0, t, γ) = (q0, Tγ)
δ(q0, x, γ) = (q0, Xγ)
δ(q0, n, γ) = (q0, Nγ)
δ(q0, l, γ) = (q0, Lγ)
δ(q0, a, γ) = (q0, Aγ)
```

## Utilização

```text
δ(q0, A, A) = (q1, ε)
δ(q1, L, L) = (q2, ε)
δ(q2, N, N) = (q3, ε)
δ(q3, X, X) = (q4, ε)
δ(q4, T, T) = (q5, ε)
δ(q5, f, Z0) = (q6, Z0)
```

Uma entrada é rejeitada quando não existe transição para o estado e topo atuais. A execução é aceita somente em `q6`, com `Z0` como único elemento da pilha e após o processamento de `f`.
