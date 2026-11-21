# Circuitos dos seis mundos

Cada mundo tem um conjunto próprio de cinco barreiras e aberturas em posições
diferentes; o Pântano tem seis. O caminho de navegação faz curvas ortogonais
pelas aberturas e chega ao portão. O Deserto da terceira fase do Rally maluco
é a versão espelhada verticalmente do primeiro Deserto.

Os comprimentos abaixo são a soma dos segmentos do caminho guiado (waypoints),
em pixels do mapa de 960×560. A duração é arredondada para cima a 205 px/s,
velocidade de referência do carro; é uma estimativa de percurso, não um limite
de tempo.

## Garagem

```text
S ────┐    ┌────┐    ┌─── G
      └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 130, 430, 145, 415, 125 px | 17 waypoints | 5 | 2.115 px | 11 s |

## Deserto

```text
S ──┐    ┌────┐    ┌─── G
    └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 125, 430, 135, 420, 120 px | 17 waypoints | 5 | 2.290 px | 12 s |

## Pântano

```text
S ───┐   ┌───┐   ┌─── G
     └───┘   └───┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 145, 415, 145, 415, 145, 415 px | 20 waypoints | 6 | 2.190 px | 11 s |

## Neve

```text
S ──┐    ┌────┐    ┌─── G
    └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 125, 430, 145, 420, 120 px | 17 waypoints | 5 | 2.260 px | 12 s |

## Autódromo

```text
S ───┐     ┌───┐     ┌── G
     └─────┘   └─────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 145, 420, 125, 435, 155 px | 17 waypoints | 5 | 2.115 px | 11 s |

## Vulcão

```text
S ─────┐   ┌─────┐   ┌─ G
       └───┘     └───┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 420, 135, 410, 125, 430 px | 17 waypoints | 5 | 2.245 px | 11 s |

## Validação de segurança

Os testes verificam que cada tema tem um layout exclusivo, que há um desvio
mensurável em relação ao caminho direto, que o percurso permanece dentro da
faixa de duração definida, que as curvas têm pelo menos 60°, e que portões,
itens e waypoints podem ser alcançados com folga de colisão. Também verificam
o espelhamento do Deserto repetido e movimentos em subpassos para que o carro
não atravesse barreiras quando a taxa de quadros cai.
