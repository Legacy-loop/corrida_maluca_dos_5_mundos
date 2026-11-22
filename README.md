# Corrida Maluca — Rally dos 5 Mundos

Jogo educativo em HTML, CSS e JavaScript puro sobre Autômatos com Pilha (PDA).
Não precisa de servidor nem de dependências em tempo de execução: abra
`index.html` diretamente no navegador (`file://`) ou publique a pasta no
GitHub Pages. O jogo e o laboratório usam a mesma classe `PDA`, em instâncias
independentes.

## Jogar

Na aba **Jogar**, a tela inicial mostra o objetivo e o botão **JOGAR**. Na
primeira partida, o tutorial acompanha ações reais: dirigir, coletar itens e
instalá-los. Use **Pular tutorial**, **Esc** ou o botão **?** para interromper
ou refazer a orientação. A missão atual aparece uma vez no HUD; a pilha fica ao
lado do mapa, e **Detalhes técnicos** abre o estado e o histórico (também com
**T**).

- **WASD ou setas:** dirigir em qualquer parte da página, sem focar o mapa.
- **E ou Espaço:** usar equipamento no portão / cruzar a chegada.
- **P:** pausar; **R:** reiniciar (pede confirmação quando há progresso).
- **Esc:** fechar gavetas ou pular o tutorial.
- Em telas pequenas, use o D-pad; toque no **i** central para abrir os
  detalhes técnicos. **USAR** aparece perto do portão.
- O modo guiado é padrão. Depois da primeira vitória, **Desafio** fica
  disponível no menu; escolha uma fase, monte o plano de coleta e consulte a
  rota durante a corrida quando precisar.
- O guia amarelo aponta continuamente para o próximo item ou portão, sem travar
  em curvas. Em `?debug=1&overlay=1`, waypoints e colisores ficam visíveis.

## Laboratório do PDA

Na aba **Laboratório**, a linha principal executa ou percorre sequências passo
a passo. Cinco exemplos carregam sequências aceitas, rejeitadas, incompletas e
fora de ordem. Os símbolos podem ser digitados ou adicionados pelo teclado na
tela. **Opções avançadas** contém modo ao vivo, velocidade, avançar, voltar,
apagar e limpar. A tabela de transições e o diagrama ficam em sub-abas.

Sequência aceita da rota clássica: `txnlaALNXTf` (resultado `q6`, pilha
`[Z0]`). No modo Desafio, selecione uma fase no controle **Rota** em
**Opções avançadas** para carregar a tabela e o diagrama correspondentes.
**Ver no Laboratório** na tela de resultado também abre a fase e o plano
tentado.

## Testes locais

Node.js 18 ou superior (os dois primeiros testes não precisam de dependências):

```powershell
npm test
```

Os testes verificam rotas do PDA, planos válidos e inválidos, metadados de
falha, mensagens, snapshots e alcançabilidade dos mapas clássicos e de desafio.
Os mapas são circuitos distintos, com caminho guiado, duração estimada,
barreiras e folga de colisão medidas. Veja [docs/circuits.md](docs/circuits.md).
Também são verificadas a projeção do guia, os chevrons ancorados e a estabilidade
da camada estática da pista.

Para instalar a dependência de desenvolvimento Playwright e executar o E2E
em Chromium:

```powershell
npm install
npx playwright install chromium
npm run test:e2e
```

O E2E abre o `index.html` por `file://` e verifica o coachmark por ações reais,
persistência e opção `?tutorial=1`, corrida completa, controles por teclado
após clicar em botões, limites de controles visíveis, laboratório, seleção de
rota e larguras responsivas.

### Checklist manual no navegador

1. Abra `index.html` por duplo clique e confirme que a tela inicial aparece
   sem banner de erro nem erros no console.
2. Inicie o jogo, clique em um botão de interface, segure `D` e confirme que o
   carro se move. Repita com setas e em cada mundo.
3. Na garagem, colete os cinco itens guiados; a pilha deve mostrar `[Z0,T,X,N,L,A]`.
4. Use o portão e as passagens; conclua a corrida em `q6` com `Z0` no topo.
   Confirme que só aparece um resultado final, sem notificações repetidas.
5. No laboratório, use cada botão de símbolo em modo ao vivo e veja pilha e
   estado mudarem imediatamente. Em modo sequência, digite `aA` e confirme os
   caracteres no campo.
6. Teste **Passo a passo**, **Avançar 1**, **Voltar**, **Reiniciar** e os cinco
   exemplos. A sequência correta precisa mostrar `ACEITA`; exemplos inválidos
   devem explicar a rejeição e sequências curtas devem mostrar `INCOMPLETA`.
7. Teste os atalhos com foco no campo de entrada: digite `aA` e confirme que
   `A` não reinicia o jogo. Teste **T** e **Esc** e redimensione para 390px,
   768px e 1280px.
8. Abra `index.html?debug=1` e confira versão, módulos, posição, PDA, última
   tecla e FPS. Em uma janela de teste, causar um erro JavaScript deve mostrar
   um banner visível.

## Capturas antes/depois

Imagens de viewport em `docs/screenshots/`:

| Tamanho | Antes | Depois |
|---|---|---|
| 1280×720 | `before-1280x720.png` | `after-1280x720.png` |
| 768×1024 | `before-768x1024.png` | `after-768x1024.png` |
| 390×844 | `before-390x844.png` | `after-390x844.png` |

O modo Desafio também tem capturas de briefing, derrota e vitória:

| Tamanho | Briefing | Game over | Vitória |
|---|---|---|---|
| 1280×720 | [briefing](docs/screenshots/challenge-briefing-1280x720.png) | [game over](docs/screenshots/challenge-game-over-1280x720.png) | [vitória](docs/screenshots/challenge-victory-1280x720.png) |
| 768×1024 | [briefing](docs/screenshots/challenge-briefing-768x1024.png) | [game over](docs/screenshots/challenge-game-over-768x1024.png) | [vitória](docs/screenshots/challenge-victory-768x1024.png) |
| 390×844 | [briefing](docs/screenshots/challenge-briefing-390x844.png) | [game over](docs/screenshots/challenge-game-over-390x844.png) | [vitória](docs/screenshots/challenge-victory-390x844.png) |

As seis pistas e a tela de campeã também têm capturas:

| Pista / tela | Captura |
|---|---|
| Garagem | [1280×720](docs/screenshots/circuit-garage-1280x720.png) |
| Deserto | [1280×720](docs/screenshots/circuit-desert-1280x720.png) |
| Pântano | [1280×720](docs/screenshots/circuit-swamp-1280x720.png) |
| Neve | [1280×720](docs/screenshots/circuit-snow-1280x720.png) |
| Autódromo | [1280×720](docs/screenshots/circuit-track-1280x720.png) |
| Vulcão | [1280×720](docs/screenshots/circuit-volcano-1280x720.png) |
| Tela de campeã | [1280×720](docs/screenshots/champion-1280x720.png) · [768×1024](docs/screenshots/champion-768x1024.png) · [390×844](docs/screenshots/champion-390x844.png) |

## Publicar no GitHub Pages

1. Envie esta pasta mantendo `index.html` na raiz do repositório.
2. Em **Settings > Pages**, selecione a branch principal e a pasta `/root`.
3. Acesse a URL fornecida pelo GitHub.

Veja [docs/pda-transitions.md](docs/pda-transitions.md) para a tabela formal
das transições e [CONTEXTO-APLICACAO.md](CONTEXTO-APLICACAO.md) para a
arquitetura e os detalhes da aplicação.
