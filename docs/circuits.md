# Circuitos dos seis mundos

Cada mundo tem um conjunto próprio de cinco barreiras e aberturas em posições
diferentes; o Pântano tem seis. O caminho de navegação faz curvas ortogonais
pelas aberturas e chega ao portão. O Deserto da terceira fase do Rally maluco
é a versão espelhada verticalmente do primeiro Deserto.

Os comprimentos abaixo são a soma dos segmentos do caminho guiado (waypoints),
em pixels do mapa de 900×560. A duração é arredondada para cima a 205 px/s,
velocidade de referência do carro; é uma estimativa de percurso, não um limite
de tempo.

## Garagem

```text
S ────┐    ┌────┐    ┌─── G
      └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 155 / 405 px, alternados | 12 waypoints | 5 | 1.945 px | 10 s |

## Deserto

```text
S ──┐    ┌────┐    ┌─── G
    └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 155 / 405 px, alternados | 12 waypoints | 5 | 2.075 px | 11 s |

## Pântano

```text
S ───┐   ┌───┐   ┌─── G
     └───┘   └───┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 155 / 405 px, alternados | 14 waypoints | 6 | 2.080 px | 11 s |

## Neve

```text
S ──┐    ┌────┐    ┌─── G
    └────┘    └────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 160 / 400 px, alternados | 12 waypoints | 5 | 2.020 px | 10 s |

## Autódromo

```text
S ───┐     ┌───┐     ┌── G
     └─────┘   └─────┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 150 / 410 px, alternados | 12 waypoints | 5 | 1.990 px | 10 s |

## Vulcão

```text
S ─────┐   ┌─────┐   ┌─ G
       └───┘     └───┘
```

| Aberturas por barreira (y) | Caminho | Barreiras | Comprimento | Duração estimada |
|---|---:|---:|---:|---:|
| 160 / 400 px, alternados | 12 waypoints | 5 | 1.795 px | 9 s |

## Validação de segurança

Os testes verificam que cada tema tem um layout exclusivo, que há um desvio
mensurável em relação ao caminho direto, que o percurso permanece dentro da
faixa de duração definida, que as curvas têm pelo menos 60°, e que portões,
itens e waypoints podem ser alcançados com folga de colisão. Também verificam
o espelhamento do Deserto repetido e movimentos em subpassos para que o carro
não atravesse barreiras quando a taxa de quadros cai.
