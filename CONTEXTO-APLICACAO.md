# Contexto da Aplicação

## 1. Visão geral

**Corrida Maluca — Rally dos 5 Mundos** é um jogo educativo feito com HTML,
CSS e JavaScript puro sobre **Autômatos com Pilha (PDA)**. Não possui backend,
framework ou dependência de runtime. O `index.html` pode ser aberto via
`file://` e publicado em GitHub Pages.

O jogador coleta cinco equipamentos, que executam `PUSH`, e os instala na
ordem inversa, que executa `POP`. Essa regra é **LIFO (Last In, First Out)**.
Na aba **Jogar**, o objetivo aparece em uma única faixa de HUD e a pilha tem
seu próprio painel. Uma gaveta opcional contém os detalhes técnicos. A aba
**Laboratório** preserva o simulador e a referência formal do PDA.

## 2. Arquitetura

Scripts clássicos com `defer`, carregados em ordem de dependência. Cada
arquivo registra sua API em `window.CM`; `js/pda.js` também exporta a classe
via CommonJS para testes Node.

```text
Trabalho_LFM2/
├── index.html
├── README.md
├── CONTEXTO-APLICACAO.md
├── css/
│   └── style.css
├── docs/
│   ├── corrida-maluca-pda.jff
│   ├── pda-transitions.md
│   ├── challenge-levels.md
│   ├── circuits.md
├── tests/
│   ├── challenge.test.js
│   ├── maps.test.js
│   └── pda.test.js
└── js/
    ├── challenge.js
    ├── constants.js
    ├── game.js
    ├── main.js
    ├── maps.js
    ├── pda.js
    ├── player.js
    ├── renderer.js
    ├── sequenceSimulator.js
    └── ui.js
```

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da interface, telas e scripts clássicos diferidos |
| `css/style.css` | Design system, layouts, estados, animação e responsividade |
| `js/constants.js` | Equipamentos, mundos, dimensões e versão |
| `js/challenge.js` | Três fases, mapas de rota e validação/solução de planos |
| `js/pda.js` | Lógica pura, snapshots, restauração e export CommonJS |
| `js/maps.js` | Mapas por tema, rotas configuráveis e validação de colisão/alcançabilidade |
| `js/guidance.js` | Projeção, arco acumulado e cálculo independente do guia do carro |
| `js/player.js` | Teclas, deslocamento por eixo, deslizamento e desencarceramento |
| `js/renderer.js` | Canvas HiDPI, camada estática em cache, overlays, carro, itens e guia |
| `js/ui.js` | HUD, pilha do jogo, histórico, mensagens e feedback |
| `js/game.js` | Estados, coleta, missões, corrida, áudio e finais |
| `js/sequenceSimulator.js` | Simulador independente com modos, execução e undo |
| `js/main.js` | Abas, coachmarks, teclado global, touch, debug e ciclo de animação |
| `tests/*.test.js` | Testes sem dependências externas para PDA, mapas e fases |

`js/app.js` foi removido: não existe implementação paralela. O jogo e o
simulador criam instâncias separadas da mesma `CM.PDA`.

## 3. Modelo formal do PDA

Estado inicial `q0`; pilha inicial `[Z0]`; topo é o último item do array.
`PDA` recebe uma rota de símbolos opcional. A rota clássica permanece
`A,L,N,X,T`; no desafio, o vetor selecionado define a sequência de portais e
os estados `q0…qN`, encerrando em `q(N+1)`.

| Entrada | Ação |
|---|---|
| `t`, `x`, `n`, `l`, `a` em `q0` | Empilha `T`, `X`, `N`, `L`, `A` |
| `A` com topo `A`, em `q0` | Remove `A`; vai para `q1` |
| `L` com topo `L`, em `q1` | Remove `L`; vai para `q2` |
| `N` com topo `N`, em `q2` | Remove `N`; vai para `q3` |
| `X` com topo `X`, em `q3` | Remove `X`; vai para `q4` |
| `T` com topo `T`, em `q4` | Remove `T`; vai para `q5` |
| `f` com topo `Z0`, em `q5` | Aceita em `q6`; conserva `Z0` |

A sequência aceita da rota clássica é `txnlaALNXTf`, com resultado `q6` e
pilha `[Z0]`.
Símbolos não contemplados pela transição atual levam a `rejected`. Após
aceitação ou rejeição, novas entradas não alteram a configuração até reset.
O fim de uma fita antes de `q6` é reportado como `incomplete`.

## 4. Fases do desafio

`js/challenge.js` define três níveis. Cada fase informa a rota de mundos,
portais e estoque. Antes da corrida, a pessoa escolhe uma sequência ordenada
de equipamentos; a checagem de plano identifica portal incorreto, pilha vazia
ou equipamento sobrando na chegada. O jogo usa o plano para montar os itens
na garagem, e os erros na corrida encerram a partida com o portal e topo
esperados. O progresso desbloqueado usa `localStorage` protegido; `?unlockAll=1`
fica disponível para testes. A rota difícil pode ser consultada durante a
partida. O Laboratório aceita cada rota e mostra a mesma tabela/diagrama
dinâmicos do PDA.

## 5. Mapas e colisões

`js/maps.js` descreve seis circuitos por tema e monta as rotas clássicas e de
desafio. Cada mapa tem geometria regular, barreiras e aberturas próprias, caminho de waypoints,
spawn, portão e, no mundo final, chegada. O terceiro Rally reutiliza o Deserto
espelhado verticalmente. A garagem comporta até oito equipamentos.
`validateMap(map)` valida métricas de percurso, obstáculos, folga segura,
alvos e alcançabilidade por busca BFS em grade. Comprimentos e tempos
estimados estão em [docs/circuits.md](docs/circuits.md).

O guia não usa índice de waypoint: `js/guidance.js` projeta o carro e o alvo
na polilinha pelo comprimento de arco, produzindo chevrons ancorados no mundo
e uma seta curta suavizada. O cenário estático é pintado uma vez em cache por
tema, variante e DPR; a cada frame o renderer combina essa camada com itens,
portal, guia e carro. `?debug=1&overlay=1` desenha grade, colisores e waypoints.

O jogador move um eixo por vez para permitir deslizamento junto às paredes.
Uma etapa de resolução de penetração desloca o carro para uma posição livre
antes de continuar o movimento. Canvas usa resolução de desenho ajustada ao
`devicePixelRatio`.

## 6. Estados e regras de jogo

Estados da partida: `MENU → PLAYING → PAUSED → TRANSITION → WON | LOST`.
As terminações bloqueiam controles e mostram um modal. A transição de mundo
ocorre somente depois do `POP` confirmado; o símbolo final `f` é processado
uma única vez, ao cruzar a chegada (ou usar o botão de ação perto dela).

No modo **Guiado**, a coleta fora de ordem é recusada com aviso amigável e o
próximo item pulsa no mapa. No modo **Desafio**, o plano escolhido define a
ordem numerada dos itens coletáveis; os portais avaliam o topo da pilha e uma
ordem inválida encerra a fase com explicação do equipamento esperado.

O modo **Guiado** inicia por padrão. O menu **Desafio** fica disponível após
a primeira vitória e permite escolher entre as fases desbloqueadas.
Vencer o Rally maluco abre a tela de campeã com troféu SVG acessível, resumo
das três fases e ações para repetir, voltar ao jogo ou abrir o Laboratório.
O sinalizador de conclusão persiste com acesso protegido a `localStorage`;
confete e fanfarra respeitam a preferência por movimento reduzido.
O coachmark da primeira partida avança com movimento, coleta e instalação;
tem opção de pular, pode ser refeito pelo botão `?` e aceita `?tutorial=1`.
Seu sinalizador de conclusão usa `localStorage` protegido por `try/catch`, sem
ser requisito para a partida.

Reset por botão ou tecla `R` limpa pilha, jogador, itens, etapa, histórico,
toasts e overlays; quando há progresso, pede confirmação. `P` pausa/retoma,
`T` abre os detalhes técnicos e `Esc` fecha gavetas ou pula o tutorial.
WASD/setas são escutados na janela, exceto durante digitação ou em telas
modais; não dependem do foco do canvas. Desfoque da janela e ocultação da aba
limpam as teclas pressionadas. O botão **USAR** aparece próximo ao portão; em
telas móveis, o D-pad e a ação ficam juntos. O toque no `i` central do D-pad
abre ou fecha a gaveta técnica sem adicionar outro controle visível.

## 7. Simulador

O simulador instancia a mesma classe `PDA` que a corrida, sem compartilhar
seu estado. A interface principal contém a sequência e os controles de
execução/passo a passo, cinco chips de exemplo e o teclado de símbolos. Em modo
sequência, os símbolos montam a fita. Em modo ao vivo, cada botão de símbolo
executa imediatamente e atualiza estado, pilha, ponteiro, resultado e
histórico. **Opções avançadas** contém rota, velocidade, avançar, voltar por
snapshots, reiniciar, editar e limpar.

O diagrama SVG e a tabela formal são gerados a partir da rota escolhida, ficam
em sub-abas mutuamente exclusivas e destacam o estado e a transição aplicada.
As sequências de exemplo clássicas ficam ocultas ao usar rota de desafio.
Resultado é `ACEITA`, `REJEITADA` ou `INCOMPLETA`, com a mensagem do PDA.

## 8. Acessibilidade e visual

O CSS usa variáveis de cor, tipografia de sistema com fallback, foco visível,
estados de botão e `prefers-reduced-motion`. A corrida e o laboratório são
abas separadas. A tela de jogo tem HUD, mapa e pilha; detalhes formais ficam
na gaveta técnica ou no laboratório. Layouts adaptam-se a telas de 390px,
768px e 1280px; controles touch aparecem em telas estreitas ou com ponteiro
coarse. Um botão controla bips opcionais de WebAudio; nenhum áudio externo é
carregado.

Cada mundo possui paleta e cenário próprios: garagem, dunas, pântano,
montanhas nevadas, autódromo e vulcão.
As capturas de cada circuito em 1280×720 e da celebração em três tamanhos
estão em `docs/screenshots/`.

## 9. Diagnóstico

Abra `index.html?debug=1` para exibir versão, módulos registrados, posição do
jogador, estado do jogo/PDA, última tecla e FPS. `window.onerror` e rejeições
não tratadas mostram um banner visível, além da saída padrão do console.

## 10. Verificação

Os testes Node não precisam de dependências externas:

```powershell
npm test
npm run test:e2e
```

O E2E usa Playwright como dependência somente de desenvolvimento e abre o
arquivo por `file://`. Ele cobre primeira visita e persistência do tutorial,
progressão por ações reais até a vitória, foco do teclado após cliques,
controles visíveis, fases do desafio, laboratório com rota clássica e
personalizada e larguras responsivas. O README contém também o checklist de
testes manuais no navegador.
