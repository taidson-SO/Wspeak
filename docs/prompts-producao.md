# Prompts por etapa ate producao

Este documento organiza o caminho do WSpeak ate producao em prompts executaveis. Cada prompt deve ser usado como uma tarefa independente, mantendo o contexto dos requisitos em `docs/requisitos-produto.md`, do reconhecimento local em `docs/reconhecimento-local.md` e do roadmap em `docs/roadmap-producao.md`.

Antes de qualquer alteracao de codigo, leia a documentacao versionada do Expo SDK 56 em https://docs.expo.dev/versions/v56.0.0/.

## Prompt 0 - Diagnostico inicial

```text
Verifique o estado atual do projeto WSpeak.

Leia AGENTS.md, README.md, docs/requisitos-produto.md, docs/reconhecimento-local.md e docs/roadmap-producao.md. Depois inspecione package.json, app.json e a estrutura de src/.

Entregue um diagnostico curto com:
- objetivo atual do app;
- estrutura principal do codigo;
- requisitos funcionais;
- pendencias tecnicas;
- riscos antes de producao;
- comandos de verificacao disponiveis.

Nao altere codigo nesta etapa.
```

## Prompt 1 - Estabilizar gravacao e captura

```text
Implemente a Fase 0 do roadmap do WSpeak.

Antes de alterar codigo, leia a documentacao versionada do Expo SDK 56 em https://docs.expo.dev/versions/v56.0.0/, especialmente as partes relacionadas a expo-audio.

Objetivo:
garantir que nenhuma gravacao normal ou captura PCM continue ativa ao parar, voltar, desmontar tela ou ocorrer erro.

Tarefas:
- criar funcoes idempotentes de parada para gravacao normal e captura PCM;
- aplicar cleanup no unmount da tela de treinamento;
- aplicar cleanup no unmount da tela de comunicacao;
- fazer o botao Voltar parar qualquer sessao ativa antes de navegar;
- evitar duas capturas simultaneas;
- manter mensagens em portugues brasileiro;
- preservar o fallback honesto para unsupported_audio.

Validacao:
- rodar TypeScript;
- documentar teste manual: iniciar gravacao, voltar, entrar de novo e gravar novamente.
```

## Prompt 2 - Aplicar limite de amostras

```text
Implemente a regra de 3 a 5 amostras por palavra no WSpeak.

Contexto:
o app orienta o usuario a gravar de 3 a 5 amostras por palavra, mas o limite precisa ser aplicado no fluxo real e no servico, nao apenas na interface.

Tarefas:
- impedir iniciar gravacao quando a palavra selecionada ja tiver 5 amostras;
- desabilitar o controle visual de gravacao quando o limite for atingido;
- impedir speechTrainer.addSample de persistir mais de 5 amostras para a mesma palavra;
- exibir mensagem simples em portugues brasileiro quando o limite for atingido;
- manter compatibilidade com amostras existentes.

Validacao:
- rodar TypeScript;
- revisar manualmente o fluxo de treinamento;
- confirmar que nenhuma palavra passa de 5 amostras pelo caminho normal.
```

## Prompt 3 - Palavras definidas pelo usuario

```text
Evolua o modo de treinamento para permitir palavras definidas pelo usuario.

Objetivo:
o usuario deve poder criar, editar e remover palavras em portugues brasileiro, alem de usar palavras iniciais sugeridas.

Tarefas:
- revisar os tipos atuais de Word e TrainedWord;
- criar persistencia local para vocabulario personalizado;
- manter uma lista inicial simples de palavras sugeridas;
- permitir adicionar palavra com texto curto;
- validar palavra vazia, duplicada ou longa demais;
- permitir remover palavra sem apagar amostras por acidente sem confirmacao;
- atualizar a tela de treinamento para selecionar palavras criadas pelo usuario;
- manter interface simples e acessivel.

Validacao:
- rodar TypeScript;
- testar manualmente adicionar palavra, treinar, sair e reabrir app;
- atualizar docs se o modelo de dados mudar.
```

## Prompt 4 - Limiar de confianca

```text
Adicione limiar minimo de confianca ao reconhecimento do WSpeak.

Objetivo:
o app nao deve falar automaticamente uma palavra quando a confianca estiver baixa.

Tarefas:
- definir um limiar inicial conservador para real_comparison;
- adicionar modo/estado de resultado incerto se necessario;
- ajustar personalizedSpeechRecognizer para retornar mensagem clara quando a melhor comparacao for fraca;
- ajustar CommunicationScreen para so chamar expo-speech quando houver confianca suficiente;
- exibir a confianca de forma simples para o usuario;
- manter unsupported_audio separado de baixa confianca.

Validacao:
- rodar TypeScript;
- testar manualmente cenario sem treino, treino sem features, comparacao real e baixa confianca simulada se necessario.
```

## Prompt 5 - Validar PCM em Android real

```text
Prepare e execute a validacao tecnica da captura PCM em Android real.

Antes de alterar codigo, leia a documentacao versionada do Expo SDK 56 sobre expo-audio e AudioStream.

Objetivo:
confirmar se o experimento PCM atual entrega dados confiaveis para features reais.

Tarefas:
- adicionar logs temporarios e controlados de sampleRate, channels, duracao, quantidade de samples e amplitude;
- confirmar se audioStreamBuffer entrega ArrayBuffer no formato esperado;
- validar se Float32Array(buffer.data) representa corretamente as amostras;
- testar treinamento com 3 a 5 amostras de uma palavra;
- testar comunicacao com a mesma palavra;
- testar palavra diferente para observar falso positivo;
- remover ou proteger logs antes de finalizar a etapa.

Entrega:
- registrar resultado em docs/reconhecimento-local.md;
- indicar se AudioStream segue como caminho principal Android, se precisa ajuste, ou se deve ser substituido.
```

## Prompt 6 - Melhorar features e comparacao local

```text
Melhore a qualidade do algoritmo local de reconhecimento do WSpeak.

Objetivo:
sair da comparacao inicial por features simples para um comportamento mais utilizavel, mantendo tudo local.

Tarefas:
- revisar audioFeatureExtractor e audioSimilarity;
- normalizar duracao e volume das amostras;
- descartar silencio inicial/final quando possivel;
- comparar por palavra usando melhor amostra, media e variacao entre amostras;
- avaliar novas features leves, como envelope de energia, segmentos temporais e cruzamentos por zero por janela;
- manter codigo simples e sem backend;
- preservar retorno unsupported_audio quando nao houver sinal analisavel.

Validacao:
- criar pequenos testes unitarios para comparacao de features, se a estrutura de teste for adicionada;
- rodar TypeScript;
- documentar limites conhecidos do algoritmo.
```

## Prompt 7 - Criar modo de exercicio

```text
Crie o modo de exercicio do WSpeak.

Objetivo:
permitir que o individuo pratique palavras em portugues brasileiro e compare sua fala com a palavra comum identificada, sem transformar o feedback em julgamento punitivo.

Tarefas:
- adicionar uma terceira entrada na tela inicial: Treinar, Exercitar, Comunicar;
- criar feature exercise com tela, componentes e tipos proprios;
- permitir escolher uma palavra treinada;
- gravar uma tentativa do usuario;
- reutilizar o recognizer local e o limiar de confianca;
- mostrar palavra esperada, palavra identificada e feedback simples;
- reproduzir a palavra comum com expo-speech como apoio auditivo;
- tratar sem treino, treino insuficiente, audio nao analisavel e baixa confianca;
- manter interface simples, acessivel e em portugues brasileiro.

Validacao:
- rodar TypeScript;
- testar manualmente exercicio com e sem palavras treinadas;
- atualizar README e roadmap.
```

## Prompt 8 - Refinar modo de comunicacao

```text
Refine o modo de comunicacao para uso com terceiros.

Objetivo:
o app deve funcionar como tradutor de fala ininteligivel para desconhecidos durante uma conversa.

Tarefas:
- tornar o resultado reconhecido grande e facil de mostrar para outra pessoa;
- falar por sintese de voz apenas quando houver confianca suficiente;
- permitir repetir a voz sintetica do ultimo resultado reconhecido;
- deixar claro quando o app nao entendeu;
- reduzir texto tecnico na tela de comunicacao;
- garantir botoes grandes e fluxo de poucos passos;
- evitar toques duplicados durante gravacao/reconhecimento.

Validacao:
- rodar TypeScript;
- testar manualmente sem treino, com treino sem PCM, com resultado incerto e com resultado real.
```

## Prompt 9 - Acessibilidade e portugues brasileiro

```text
Revise a acessibilidade e a linguagem do WSpeak.

Objetivo:
deixar a interface simples, clara, em portugues brasileiro e adequada para pessoas com dificuldade de fala.

Tarefas:
- revisar todos os textos visiveis;
- trocar jargoes tecnicos por mensagens simples;
- manter detalhes tecnicos apenas em docs/logs;
- revisar contraste, tamanhos de fonte e area de toque;
- garantir feedback claro para gravando, salvando, reconhecendo, erro, baixa confianca e sucesso;
- revisar estados vazios;
- revisar navegacao com poucos passos;
- garantir que a UI nao dependa apenas de cor para comunicar estado.

Validacao:
- rodar TypeScript;
- fazer teste manual em tela pequena;
- registrar ajustes restantes em docs/roadmap-producao.md.
```

## Prompt 10 - Privacidade e gestao de dados locais

```text
Implemente gestao clara dos dados locais do WSpeak.

Objetivo:
o usuario deve entender que audio e treinamento ficam no dispositivo e deve poder apagar seus dados.

Tarefas:
- criar tela ou secao simples de dados/privacidade;
- explicar em portugues brasileiro que amostras e padroes ficam locais;
- adicionar acao para apagar todos os dados locais com confirmacao;
- apagar registros do AsyncStorage;
- apagar arquivos de audio associados, quando existirem;
- evitar exclusao acidental;
- atualizar README com comportamento de privacidade.

Validacao:
- rodar TypeScript;
- testar manualmente apagar dados e reiniciar app;
- confirmar que treinamento e comunicacao voltam ao estado sem dados.
```

## Prompt 11 - Preparar build interna

```text
Prepare o WSpeak para uma build interna.

Antes de alterar configuracoes, leia a documentacao versionada do Expo SDK 56 e a documentacao atual de EAS Build, se for usar EAS.

Objetivo:
gerar uma build instalavel para teste controlado, inicialmente Android.

Tarefas:
- revisar app.json: nome, slug, icones, splash, permissoes, package identifier e textos de permissao;
- confirmar permissao de microfone;
- configurar EAS Build se for o caminho escolhido;
- criar checklist de build interna;
- documentar comandos de build;
- nao publicar em loja nesta etapa.

Validacao:
- rodar TypeScript;
- rodar build interna ou documentar bloqueio;
- testar instalacao em dispositivo fisico.
```

## Prompt 12 - Checklist de producao

```text
Monte e execute o checklist final de producao do WSpeak.

Objetivo:
confirmar se o app esta pronto para piloto ou publicacao controlada.

Verificar:
- gravacao finaliza ao parar, voltar, desmontar tela e ocorrer erro;
- nao existem duas capturas simultaneas;
- limite de 5 amostras e aplicado na UI e no servico;
- palavras podem ser definidas pelo usuario;
- modo de exercicio existe e tem feedback acessivel;
- modo de comunicacao funciona como tradutor para terceiros;
- baixa confianca nao aciona voz sintetica automaticamente;
- permissao negada tem mensagem clara;
- usuario pode apagar dados locais;
- politica de privacidade cobre audio, armazenamento local e ausencia de backend;
- build interna foi testada em Android fisico;
- documentacao esta atualizada.

Entrega:
- gerar relatorio final com pronto/bloqueado para cada item;
- listar bugs criticos restantes;
- recomendar proxima decisao: piloto controlado, nova iteracao tecnica ou preparacao de loja.
```
