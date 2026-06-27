# Roadmap do novo escopo do WSpeak

Data: 2026-06-26.

Este roadmap substitui a ideia de seguir direto para um tradutor automatico. Os testes mostraram que o reconhecedor por features simples nao reconhece com qualidade suficiente. O novo escopo coloca o WSpeak primeiro como ferramenta de coleta, treino e avaliacao guiada para construir reconhecimento personalizado com base mais solida.

## Norte do produto

O WSpeak deve apoiar pessoas com fala de dificil compreensao para desconhecidos. Antes de prometer traducao automatica, o app precisa entender o padrao individual de fala por meio de coleta estruturada, confirmacao humana e dados de confusao entre palavras.

Promessa atual recomendada:

> Ferramenta de treino e coleta personalizada para ajudar a construir um tradutor de fala.

Promessa ainda bloqueada:

> Tradutor automatico confiavel de fala ininteligivel.

## Principios

- Nao falar automaticamente uma palavra sem desempenho confirmado.
- Nao tratar 3 amostras como treino confiavel; 3 amostras servem apenas como minimo inicial de uso.
- Separar treino, validacao e teste.
- Registrar o que foi dito, o que foi entendido e por quem.
- Usar confirmacao humana para calibrar reconhecimento.
- Manter privacidade local como padrao.
- Considerar fonoaudiologo, cuidador ou pessoa familiar como parte do fluxo de avaliacao.
- Tratar o comparador atual por features simples apenas como baseline tecnico.

## Fase 0 - Congelar promessa e proteger usuario

Objetivo: impedir que o app prometa reconhecimento automatico antes de validação.

Tarefas:

- Alterar textos visiveis que sugerem tradutor pronto.
- Marcar `Comunicar` como experimental.
- Exigir confirmacao antes de voz sintetica quando a palavra nao tiver desempenho confirmado.
- Mostrar ranking ou estado incerto em vez de palavra unica quando houver risco de confusao.
- Manter `Dados e privacidade` claro sobre armazenamento local.

Entregaveis:

- Textos revisados na interface.
- README e requisitos alinhados ao novo escopo.
- Checklist manual para confirmar que o app nao promete traducao automatica.

Marco de saida:

- Usuario entende que o reconhecimento ainda esta em construcao e que precisa confirmar resultados.

## Fase 1 - Avaliacao guiada

Objetivo: coletar dados com metodologia minima para entender o padrao individual.

Estado em 2026-06-27: primeiro recorte implementado em `src/features/assessment/`. O app ja cria sessoes locais por palavra, coleta ate 12 amostras, separa automaticamente em treino, validacao e teste, registra resposta humana e mostra confusoes observadas. Ainda faltam qualidade da amostra, prompts por frase curta e relatorio por palavra mais completo.

Tarefas:

- Criar modo `Avaliar` ou transformar `Treinar` em fluxo guiado.
- Criar sessoes por palavra.
- Coletar 8 a 12 amostras por palavra para pesquisa/piloto.
- Separar amostras por contexto:
  - palavra isolada;
  - frase curta;
  - repeticao em outro momento.
- Registrar qualidade da amostra:
  - muito baixa;
  - curta demais;
  - ruido;
  - boa para analise.
- Permitir pausar e continuar sessao depois.

Entregaveis:

- Tipos de dados para `AssessmentSession`, `AssessmentSample`, `HumanAnnotation` e `ConfusionRecord`.
- Persistencia local das sessoes.
- Tela simples de avaliacao guiada.
- Progresso por palavra e por contexto.

Marco de saida:

- O app coleta dados suficientes para avaliar uma palavra sem depender de reconhecimento automatico.

## Fase 2 - Anotacao humana e inteligibilidade

Objetivo: registrar o que uma pessoa entendeu, nao apenas o que o algoritmo calculou.

Estado em 2026-06-27: primeiro formulario de anotacao humana implementado. Ele registra tipo de ouvinte, palavra percebida, nota de 0 a 5, tipo de erro, contexto, repeticao e observacao livre. Ainda falta resumo por palavra com media de inteligibilidade e historico detalhado.

Tarefas:

- Permitir anotacao por tipo de ouvinte:
  - pessoa familiar;
  - pessoa desconhecida;
  - fonoaudiologo;
  - cuidador/responsavel.
- Registrar palavra alvo e palavra percebida.
- Registrar nota de inteligibilidade de 0 a 5.
- Registrar tipo de erro observado:
  - omissao;
  - substituicao;
  - distorcao;
  - adicao;
  - inconsistente;
  - nao classificado.
- Permitir observacoes livres.
- Marcar se houve contexto, pista visual ou repeticao.

Entregaveis:

- Modelo `HumanAnnotation`.
- Tela de anotacao simples.
- Resumo por palavra com inteligibilidade media.
- Historico de anotacoes.

Marco de saida:

- Cada palavra treinada tem dados humanos suficientes para saber se e compreensivel e para quem.

## Fase 3 - Matriz de confusao

Objetivo: descobrir quais palavras o app ou os ouvintes confundem.

Estado em 2026-06-27: primeira matriz simples implementada a partir das anotacoes humanas, agrupando pares `palavra alvo -> palavra entendida`. Ainda falta criterio de liberacao por palavra e testes contrastivos guiados.

Tarefas:

- Registrar tentativas em que a palavra esperada difere da palavra percebida.
- Criar matriz de confusao por usuario.
- Mostrar pares de alto risco, por exemplo `casa` vs `pao`.
- Criar testes contrastivos para palavras confundidas.
- Calcular status por palavra:
  - insuficiente;
  - em coleta;
  - alta confusao;
  - parcialmente confiavel;
  - confirmada.

Entregaveis:

- Modelo `ConfusionRecord`.
- Relatorio local por palavra.
- Lista de pares confundidos.
- Critério local de liberacao por palavra.

Marco de saida:

- O app sabe quais palavras nao deve falar automaticamente.

## Fase 4 - Comunicacao assistida, nao automatica

Objetivo: tornar a comunicacao util sem depender de reconhecimento perfeito.

Tarefas:

- Trocar resposta unica por ranking:
  - primeira hipotese;
  - segunda hipotese;
  - botao confirmar;
  - botao corrigir.
- Permitir que o usuario/cuidador escolha a palavra correta.
- Salvar correcao como dado de validacao.
- Falar por voz sintetica somente quando:
  - a palavra estiver confirmada;
  - houver baixa confusao;
  - houver historico suficiente;
  - o usuario confirmar ou ativar modo automatico.
- Manter botao grande para mostrar texto a terceiros.

Entregaveis:

- `CommunicationRanking`.
- Tela de comunicacao assistida.
- Fluxo de confirmar/corrigir.
- Dados de validacao alimentando a matriz de confusao.

Marco de saida:

- O modo comunicacao e util mesmo quando o app nao reconhece sozinho.

## Fase 5 - Escolha tecnica do reconhecedor

Objetivo: decidir se o reconhecimento sera local, hibrido ou com backend consentido.

Caminhos a avaliar:

1. Modelo local com embeddings de audio.
2. Modelo fonetico ou ASR adaptado ao portugues brasileiro.
3. Backend opcional com consentimento explicito.
4. Abordagem hibrida: coleta local e exportacao consentida para pesquisa/modelo.

Tarefas:

- Definir criterios de comparacao:
  - taxa de acerto por palavra;
  - taxa de falso positivo;
  - taxa de baixa confianca;
  - tempo de resposta;
  - privacidade;
  - custo;
  - suporte offline.
- Criar conjunto pequeno de avaliacao com dados consentidos.
- Comparar baseline atual com alternativas.
- Documentar decisao.

Entregaveis:

- Relatorio de decisao tecnica.
- Prototipo do caminho escolhido.
- Politica de privacidade revisada se houver backend/exportacao.

Marco de saida:

- Existe uma decisao clara sobre o motor de reconhecimento.

## Fase 6 - Piloto controlado

Objetivo: validar utilidade real com poucas pessoas e risco controlado.

Pre-requisitos:

- Avaliacao guiada funcionando.
- Anotacao humana funcionando.
- Matriz de confusao funcionando.
- Comunicacao assistida com confirmacao/correcao funcionando.
- Build interna instalada em Android fisico.
- Politica de privacidade adequada ao comportamento real.

Tarefas:

- Selecionar grupo pequeno.
- Definir palavras prioritarias por usuario.
- Coletar dados por sessoes.
- Medir:
  - palavras com desempenho confirmado;
  - palavras com alta confusao;
  - utilidade percebida;
  - esforço de treino;
  - erros criticos.
- Revisar UX com base no uso real.

Marco de saida:

- Evidencia pratica de utilidade ou decisao fundamentada de nova iteracao.

## Modelo de dados proposto

### AssessmentSession

- `id`
- `createdAt`
- `updatedAt`
- `participantAlias`
- `wordIds`
- `status`: em_andamento, concluida, pausada

### AssessmentSample

- `id`
- `sessionId`
- `wordId`
- `targetText`
- `context`: palavra_isolada, frase_curta, repeticao_livre
- `audioUri`
- `features`
- `qualityStatus`
- `createdAt`

### HumanAnnotation

- `id`
- `sampleId`
- `listenerType`
- `targetText`
- `perceivedText`
- `intelligibilityRating`
- `errorType`
- `usedContext`
- `neededRepetition`
- `notes`
- `createdAt`

### ConfusionRecord

- `id`
- `targetText`
- `perceivedText`
- `source`: humano, algoritmo
- `count`
- `lastSeenAt`

### WordReadiness

- `wordId`
- `sampleCount`
- `annotationCount`
- `confusionCount`
- `status`
- `canAutoSpeak`

## Primeira implementacao recomendada

Epic: **Avaliação Guiada Local**

Escopo inicial:

- Criar feature `assessment`.
- Criar tela `Avaliar`.
- Adicionar entrada na tela inicial: `Avaliar fala`.
- Criar sessoes locais com uma palavra por vez.
- Gravar 8 amostras por palavra.
- Permitir anotar `o que foi entendido`.
- Mostrar resumo simples:
  - amostras coletadas;
  - anotacoes feitas;
  - palavras confundidas.

Fora do escopo inicial:

- Novo modelo de IA.
- Backend.
- Exportacao de dados.
- Voz automatica baseada no novo fluxo.

## Criterios de pronto para o novo escopo

- O app coleta dados suficientes por palavra.
- O app registra confirmacao humana.
- O app mostra confusoes.
- O app nao fala automaticamente palavras sem confirmacao.
- O usuario entende que esta construindo um perfil de fala, nao usando um tradutor pronto.
- Os dados continuam locais, salvo decisao explicita futura.
