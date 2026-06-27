# Requisitos de produto do WSpeak

Este documento registra o escopo funcional do WSpeak a partir dos requisitos atuais. O app e voltado para pessoas com fala ininteligivel para desconhecidos e deve funcionar em portugues brasileiro, com interface simples e altamente acessivel.

## Publico e problema

O WSpeak deve apoiar individuos cuja fala pode ser compreendida por pessoas proximas, mas e dificil ou ininteligivel para desconhecidos.

O app nao deve assumir uma pronuncia padrao como ponto de partida. O ponto central do produto e aprender o padrao fonologico individual da pessoa a partir de amostras gravadas localmente.

## Principios do produto

- O reconhecimento deve ser personalizado ao individuo.
- O treinamento deve comparar a fala do usuario com palavras definidas pelo proprio usuario ou por uma lista configuravel.
- O app deve deixar claro quando esta usando comparacao real e quando o audio ainda nao permite analise confiavel.
- O app nao deve prometer traducao automatica confiavel enquanto a metodologia de reconhecimento nao estiver validada.
- O app deve priorizar portugues brasileiro em textos, vocabulario, sintese de voz e fluxo de uso.
- A interface deve ser simples, com alta acessibilidade, poucos passos e controles grandes.
- O app deve preservar privacidade: audio, amostras e padroes ficam locais enquanto nao houver decisao explicita de backend.

## Modos obrigatorios

### 1. Modo de treinamento

Objetivo: estabelecer o padrao fonologico individual do usuario.

Requisitos:

- Permitir que o usuario defina ou selecione palavras em portugues brasileiro.
- Gravar amostras da fala ininteligivel do usuario para cada palavra.
- Associar cada amostra a uma palavra esperada.
- Extrair features reais quando houver PCM/WAV ou outro sinal analisavel.
- Permitir coleta estruturada com mais amostras por palavra para validacao.
- Registrar confirmacao humana do que foi entendido quando necessario.
- Apoiar anotacao de erros, confusoes e inteligibilidade.
- Manter estado honesto `unsupported_audio` quando o audio nao permitir comparacao local confiavel.
- Orientar a gravacao de 3 a 5 amostras por palavra.

### 2. Modo de exercicio

Objetivo: permitir que o individuo compare sua fala com o padrao comum das palavras identificadas.

Requisitos:

- Usar os padroes reconhecidos no treinamento para identificar a palavra provavel.
- Apresentar a palavra comum correspondente em portugues brasileiro.
- Permitir que o usuario pratique a emissao da palavra e veja feedback simples.
- Evitar feedback punitivo ou tecnico demais.
- Indicar baixa confianca quando o app nao tiver certeza suficiente.
- Opcionalmente reproduzir a palavra comum por sintese de voz para apoio auditivo.

### 3. Modo de comunicacao

Objetivo: funcionar como tradutor de fala ininteligivel em interacoes com terceiros.

Requisitos:

- Capturar a fala do usuario durante uma conversa.
- Comparar a fala atual com os padroes individuais treinados.
- Exibir a palavra ou frase reconhecida de forma clara para outra pessoa.
- Reproduzir por voz sintetica apenas quando houver confianca suficiente.
- Nao falar automaticamente quando o resultado for incerto.
- Exigir confirmacao ou validacao adicional para palavras com alto risco de confusao.
- Explicar de forma simples quando nao houver treino, permissao de microfone ou audio analisavel.

## Acessibilidade

Requisitos de interface:

- Portugues brasileiro em toda a interface.
- Textos curtos, diretos e sem jargao tecnico para o usuario final.
- Botoes grandes, com area de toque confortavel.
- Alto contraste e boa legibilidade.
- Fluxos com poucos passos.
- Feedback visual claro para gravando, salvando, reconhecendo, erro e resultado incerto.
- Tolerancia a toques repetidos e navegacao durante gravacao.
- Estados de erro compreensiveis para permissao negada, sem treinamento, treino insuficiente e audio nao analisavel.

## Implicacoes tecnicas

- O treinamento atual de palavras e base para o modo de treinamento fonologico.
- O modo de comunicacao atual e base para o tradutor com terceiros.
- O modo de exercicio existe como fluxo separado para pratica de palavras treinadas.
- A lista de palavras combina sugestoes iniciais com palavras definidas pelo usuario e persistidas localmente.
- A comparacao real continua dependente de captura PCM/WAV, decodificacao local ou outro caminho confiavel de sinal analisavel, mas sinal analisavel sozinho nao garante reconhecimento confiavel.
- Antes de producao, o app precisa revisar a metodologia de reconhecimento, validar o exercicio com usuarios reais, calibrar melhor a confianca e refinar gestao de dados locais.
