# Testes manuais

## Fase 0 - Gravacao e captura

Objetivo: confirmar que nenhuma gravacao normal ou captura PCM fica ativa ao sair das telas.

### Treinamento

1. Abra o app.
2. Entre em `Treinar fala`.
3. Inicie uma gravacao.
4. Toque em `Voltar` antes de parar a gravacao.
5. Entre novamente em `Treinar fala`.
6. Inicie uma nova gravacao.
7. Pare a gravacao.

Resultado esperado: a segunda gravacao inicia normalmente, sem erro de microfone ocupado ou captura em andamento.

## Limite de amostras por palavra

Objetivo: confirmar que uma palavra nao passa de 5 amostras pelo fluxo normal.

1. Abra o app.
2. Entre em `Treinar fala`.
3. Escolha uma palavra.
4. Grave e salve 5 amostras.
5. Verifique se o botao `Gravar amostra` fica desabilitado.
6. Tente iniciar uma nova gravacao para a mesma palavra.
7. Apague uma amostra.
8. Verifique se o botao `Gravar amostra` fica disponivel novamente.

Resultado esperado: o app informa que o limite de 5 amostras foi atingido e nao permite salvar uma sexta amostra para a mesma palavra.

## Palavras personalizadas

Objetivo: confirmar que palavras criadas pelo usuario aparecem no treinamento depois de reabrir o app.

1. Abra o app.
2. Entre em `Treinar fala`.
3. Digite uma palavra curta em portugues brasileiro.
4. Toque em `Adicionar palavra`.
5. Verifique se a palavra aparece na lista e fica selecionada.
6. Grave uma amostra para essa palavra.
7. Feche e reabra o app.
8. Entre novamente em `Treinar fala`.
9. Verifique se a palavra personalizada continua na lista.
10. Selecione a palavra, toque em `Editar palavra`, altere o texto e salve.
11. Toque em `Remover palavra` e confirme.

Resultado esperado: a palavra pode ser adicionada, editada e removida da lista. Ao remover uma palavra com amostras, o app avisa que as amostras gravadas para ela tambem serao apagadas deste aparelho.

## Baixa confianca no reconhecimento

Objetivo: confirmar que o app nao fala automaticamente quando a comparacao real fica abaixo do limiar minimo.

1. Treine uma palavra com amostras que tenham analise real.
2. Entre em `Comunicar`.
3. Grave uma fala diferente da palavra treinada, mas com captura PCM ativa.
4. Observe o resultado.

Resultado esperado: se a confianca ficar abaixo do limiar, o app mostra a possivel palavra e a confianca, mas nao reproduz voz sintetica automaticamente. Esse estado deve ser diferente de `unsupported_audio`.

## Qualidade da comparacao local

Objetivo: observar se o algoritmo melhorado separa melhor palavras diferentes.

1. Escolha duas palavras com sons diferentes.
2. Grave de 3 a 5 amostras com analise real para cada palavra.
3. Entre em `Comunicar`.
4. Grave a primeira palavra treinada.
5. Observe palavra identificada, confianca e modo.
6. Grave a segunda palavra treinada.
7. Observe palavra identificada, confianca e modo.
8. Grave uma fala diferente das duas palavras.

Resultado esperado: palavras treinadas devem preferir a propria palavra. Falas diferentes devem cair em baixa confianca com mais frequencia do que em `Comparação real`.

## Modo de exercicio

Objetivo: confirmar que o usuario consegue praticar uma palavra treinada com feedback simples.

1. Treine uma palavra com pelo menos 3 amostras prontas para usar.
2. Volte para a tela inicial.
3. Toque em `Exercitar`.
4. Escolha a palavra treinada.
5. Toque em `Ouvir palavra comum`.
6. Grave uma tentativa da palavra.
7. Pare a gravacao.
8. Observe a palavra esperada, a palavra identificada, a confianca e o feedback.
9. Toque em `Ouvir resultado` quando houver reconhecimento com confianca.
10. Confira o bloco `Evolução local`.
11. Apague os dados em `Dados e privacidade` e volte ao exercício.

Resultado esperado: o app mostra feedback sem tom punitivo. Se nao houver treino suficiente, audio analisavel ou confianca, o app explica o estado sem reproduzir uma palavra automaticamente. O resumo de evolução registra tentativas no aparelho e volta ao estado vazio depois de apagar os dados locais.

## Avaliacao guiada local

Objetivo: confirmar que o app coleta amostras suficientes e registra o que uma pessoa entendeu.

1. Abra o app.
2. Entre em `Avaliar fala`.
3. Escolha uma palavra, como `casa`.
4. Grave uma amostra e toque em `Parar e salvar`.
5. Em `Resposta humana`, informe o que a pessoa entendeu.
6. Escolha quem escutou, nota de inteligibilidade e tipo de diferença observada.
7. Marque se usou contexto e se precisou repetir quando isso acontecer.
8. Toque em `Salvar resposta`.
9. Grave pelo menos mais uma amostra em que a palavra seja entendida de outro jeito.
10. Verifique `Confusões observadas`.
11. Saia da tela e entre novamente em `Avaliar fala`.

Resultado esperado: as amostras e respostas continuam salvas no aparelho. A lista de confusões mostra pares como `casa foi entendido como ...` quando a resposta humana difere da palavra alvo.

## Previsibilidade e acessibilidade

Objetivo: confirmar que os fluxos principais resistem a toques repetidos, permissao negada e uso com acessibilidade do sistema.

1. Abra `Treinar fala`, toque rapidamente varias vezes em `Gravar amostra` e observe o estado.
2. Repita o teste em `Avaliar fala`, `Exercitar` e `Comunicar`.
3. Durante uma gravacao, tente trocar de palavra, voltar e tocar novamente em gravar.
4. Negue a permissao de microfone no sistema e tente gravar em cada modo.
5. Ative fonte ampliada do sistema e verifique se textos e botoes continuam legiveis em tela pequena.
6. Ative leitor de tela e percorra botoes, campos, status de gravacao e confirmacao de apagar dados.
7. Em `Dados e privacidade`, acione `Apagar todos os dados locais`, cancele, depois confirme.

Resultado esperado: cada tela mostra `Preparando`, `Gravando`, `Salvando` ou `Tentando entender` sem iniciar duas gravacoes ao mesmo tempo. Quando a permissao de microfone esta bloqueada, o app explica que precisa da permissao. O leitor de tela encontra botoes e estados principais. A limpeza de dados exige confirmacao e volta ao estado inicial.

## Revalidacao do reconhecimento apos ajuste de captura

Objetivo: confirmar que o treinamento gera amostras prontas para comparacao e que a comunicacao usa essas amostras.

1. Apague os dados locais em `Dados e privacidade`.
2. Volte para a tela inicial.
3. Toque em `Começar pelo treino`.
4. Escolha uma palavra simples, como `casa`.
5. Grave 3 amostras.
6. Confirme que o texto do treino mostra `3/3 amostras prontas para usar`.
7. Toque em `Conversar agora`.
8. Grave a mesma palavra.
9. Observe se a palavra aparece grande em `Para mostrar`.
10. Grave uma palavra diferente.

Resultado esperado: a palavra treinada deve ser reconhecida com confianca suficiente em parte das tentativas. Palavra diferente deve tender a `Não tenho certeza` ou `Não entendi`, sem voz automatica em baixa confianca.

## Regressao: resultado nao pode ficar preso na primeira palavra

Objetivo: confirmar que a conversa nao fica repetindo sempre a primeira palavra reconhecida.

1. Apague os dados locais em `Dados e privacidade`.
2. Treine `casa` com 3 amostras prontas.
3. Treine `pão` com 3 amostras prontas.
4. Entre em `Conversar`.
5. Grave `casa` e observe o resultado.
6. Toque em `Repetir voz`.
7. Grave `pão`.
8. Grave `casa` novamente.
9. Grave `pão` novamente.

Resultado esperado: ao iniciar cada nova gravacao, o resultado anterior deve sumir. O app deve reconhecer quando a melhor palavra tiver confianca suficiente e margem aceitavel sobre a segunda opcao. Se ficar em duvida entre `casa` e `pão`, deve mostrar uma mensagem de duvida e manter `Repetir voz` desativado.

## Validacao tecnica PCM em Android

Objetivo: confirmar se `AudioStream` entrega PCM real e confiavel para extrair features.

1. Conecte um Android real com depuracao habilitada.
2. Rode o app no Android.
3. Abra os logs do app e filtre por `[WSpeak PCM]`.
4. Entre em `Treinar fala`.
5. Escolha ou crie uma palavra.
6. Grave 3 a 5 amostras falando a mesma palavra.
7. Confirme que aparecem logs `inicio`, `buffer` e `fim`.
8. Verifique se `sampleRate`, `channels`, `sampleCount`, `averageAmplitude` e `maxAmplitude` aparecem com valores coerentes.
9. Entre em `Comunicar`.
10. Grave a mesma palavra treinada.
11. Grave uma palavra diferente para observar falso positivo.

Resultado esperado: os buffers devem ser `ArrayBuffer` alinhados para `Float32Array`, com amostras finitas, amplitude maior que zero durante fala e sem contagem relevante fora do intervalo esperado.

Resultado observado neste ciclo:

- Android real conectado: `moto_g35_5G`.
- Treinamento salvou amostra com `Análise pronta`.
- Comunicacao reconheceu palavra treinada em `Comparação real` com 82% de confianca.
- Logs PCM confirmaram 48000 Hz, 1 canal, buffers de 19200 bytes, 4800 amostras float32 por buffer e `outOfRangeSampleCount` 0.
- Teste intencional de palavra diferente ainda pendente.

### Comunicacao

1. Abra o app com pelo menos uma palavra treinada.
2. Entre em `Comunicar`.
3. Inicie uma gravacao.
4. Toque em `Voltar` antes de parar a gravacao.
5. Entre novamente em `Comunicar`.
6. Inicie uma nova gravacao.
7. Pare a gravacao.

Resultado esperado: a segunda gravacao inicia normalmente, sem erro de microfone ocupado ou captura em andamento.

## Comunicacao com terceiros

Objetivo: confirmar que a tela de comunicacao funciona como tradutor simples para outra pessoa.

1. Abra o app sem palavras treinadas e entre em `Comunicar`.
2. Verifique se o app orienta a treinar uma palavra antes de comunicar.
3. Treine uma palavra com analise real.
4. Entre em `Comunicar`.
5. Grave a palavra treinada.
6. Verifique se a palavra reconhecida aparece grande em `Para mostrar`.
7. Confirme que a voz sintetica toca apenas quando ha confianca suficiente.
8. Toque em `Repetir voz`.
9. Grave uma fala diferente para observar baixa confianca ou `Não entendi`.

Resultado esperado: a tela deve ser simples de mostrar para outra pessoa, permitir repetir a voz do ultimo reconhecimento confiavel e evitar voz automatica quando o resultado for incerto.
