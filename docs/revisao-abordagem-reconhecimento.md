# Revisao da abordagem de reconhecimento do WSpeak

Data: 2026-06-26.

## Conclusao

O reconhecedor local atual nao esta adequado para piloto controlado.

Ele validou partes importantes da infraestrutura, como permissao de microfone, captura PCM no Android, persistencia local e fluxo de treino. Porem, os testes com fala inteligivel e palavras comuns mostraram que a associacao entre fala do usuario e palavra comum ainda falha. Ajustar apenas limiar, margem ou pesos de features nao resolve a raiz do problema.

## Por que a abordagem atual falhou

### 1. Similaridade acustica simples nao equivale a reconhecimento de fala

O algoritmo atual compara features leves:

- duracao;
- energia;
- amplitude;
- cruzamentos por zero;
- envelopes temporais.

Essas features ajudam a dizer se dois sinais parecem parecidos em nivel acustico geral, mas nao identificam com confianca fonemas, silabas, substituicoes, omissoes, distorcoes ou padroes fonologicos.

Na pratica, palavras diferentes podem ter envelopes parecidos, e a mesma palavra pode variar muito entre repeticoes.

### 2. O app nao modela o padrao fonologico individual

O requisito central do WSpeak e aprender o padrao fonologico da pessoa. O prototipo atual aprende apenas uma assinatura acustica superficial por palavra.

Isso nao responde perguntas essenciais:

- quais sons sao omitidos?
- quais sons sao substituidos?
- quais posicoes da palavra sao mais afetadas?
- o erro e consistente ou variavel?
- a dificuldade aparece so em palavra isolada ou tambem em fala conectada?
- uma pessoa familiar entende melhor que uma pessoa desconhecida?

### 3. A quantidade de amostras e baixa para reconhecimento robusto

Tres a cinco amostras podem ser suficientes para uma primeira triagem ou configuracao guiada, mas nao sao suficientes para calibrar reconhecimento automatico confiavel em fala com grande variabilidade.

Para reconhecimento personalizado, o app precisa separar:

- amostras de treino;
- amostras de validacao;
- amostras de teste;
- exemplos contrastivos entre palavras parecidas.

### 4. Falta dado negativo e matriz de confusao

Treinar apenas exemplos positivos de cada palavra nao mostra ao app quando uma palavra nao e aquela palavra.

O WSpeak precisa registrar confusoes como:

- fala esperada: `pao`, app escolheu: `casa`;
- fala esperada: `casa`, app ficou entre: `casa` e `pao`;
- fala esperada: palavra fora da lista, app escolheu palavra treinada.

Sem matriz de confusao, o app nao consegue calibrar confianca de forma clinicamente util.

## Referencias metodologicas

A revisao foi alinhada com principios gerais de avaliacao fonoaudiologica descritos pela ASHA:

- avaliacao de fala deve considerar sons em palavra isolada e fala conectada;
- devem ser observados tipos de erro como omissoes, substituicoes, adicoes, distorcoes, erros em silabas e consistencia entre repeticoes;
- inteligibilidade e perfil comunicativo precisam considerar contexto linguistico, dialeto, interlocutores familiares e nao familiares;
- fonoaudiologos sao centrais na avaliacao, diagnostico, planejamento e intervencao em transtornos dos sons da fala.

Referencias:

- ASHA Practice Portal: Speech Sound Disorders - Articulation and Phonology.
- ASHA Practice Portal: Dysarthria in Adults.

## Nova direcao recomendada

### Fase A - Transformar o app em coletor fonoaudiologico estruturado

Antes de tentar reconhecer automaticamente, o WSpeak deve coletar dados melhores.

Requisitos:

- criar sessoes de avaliacao por palavra;
- coletar no minimo 8 a 12 amostras por palavra para pesquisa/piloto;
- manter 3 amostras como minimo de interface, mas nao como criterio de reconhecimento confiavel;
- gravar exemplos em palavra isolada;
- gravar exemplos em frase curta;
- permitir marcar se a palavra foi compreendida por pessoa familiar;
- permitir marcar se a palavra foi compreendida por pessoa desconhecida;
- registrar palavra esperada e palavra percebida.

### Fase B - Incluir anotacao humana/fonoaudiologica

O app deve permitir que um responsavel, cuidador ou fonoaudiologo marque:

- palavra alvo;
- o que foi entendido;
- nivel de inteligibilidade;
- erro percebido;
- observacoes;
- se houve ajuda visual, repeticao ou contexto.

Campos sugeridos:

- `targetWord`;
- `perceivedWord`;
- `listenerType`: familiar, desconhecido, fonoaudiologo;
- `intelligibilityRating`: 0 a 5;
- `errorType`: omissao, substituicao, distorcao, adicao, inconsistente, nao classificado;
- `notes`.

### Fase C - Mudar o reconhecimento para ranking assistivo

Em vez de devolver uma palavra unica, o app deve mostrar ranking:

1. palavra mais provavel;
2. segunda opcao;
3. botao para confirmar;
4. botao para corrigir.

O app so deve falar automaticamente quando:

- houver historico suficiente daquela palavra;
- a palavra tiver baixa confusao com outras;
- a pessoa ou responsavel tiver confirmado resultados anteriores;
- a confianca for alta e consistente.

### Fase D - Avaliar modelo acustico/fonetico real

Opcoes tecnicas:

1. **Modelo local com embeddings de audio**
   - Usar um modelo leve para extrair embeddings mais robustos que features manuais.
   - Exige runtime nativo ou ONNX/TFLite em dev build.

2. **Reconhecimento fonetico/ASR adaptado**
   - Usar ASR ou modelo fonetico para gerar hipoteses e comparar com vocabulário restrito.
   - Precisa avaliar suporte a portugues brasileiro e fala atipica.

3. **Backend opcional e consentido**
   - Permite modelos melhores, mas muda privacidade e exige politica clara.
   - Nao deve ser ativado sem consentimento explicito.

4. **Abordagem hibrida**
   - Local para coleta, privacidade e uso basico.
   - Exportacao consentida para avaliacao/modelo futuro.

## Mudancas de produto recomendadas

### Alterar promessa

Antes:

> Tradutor de fala ininteligivel.

Agora, ate validacao clinica/tecnica:

> Ferramenta de treino e coleta personalizada para ajudar a construir um tradutor de fala.

### Alterar comunicacao no app

O modo `Comunicar` deve ser tratado como experimental enquanto a nova abordagem nao estiver validada.

Texto sugerido:

> O reconhecimento ainda esta em teste. Confirme a palavra antes de mostrar ou falar.

### Alterar criterio de pronto

Nao usar apenas `3 amostras prontas` como criterio de reconhecimento.

Novo criterio minimo para piloto:

- 8 a 12 amostras por palavra;
- pelo menos 3 repeticoes em outro momento;
- teste com palavra diferente;
- registro de confusoes;
- confirmacao humana.

## Decisao tecnica

O comparador atual por features simples deve ser mantido apenas como baseline tecnico e ferramenta diagnostica.

Ele nao deve ser o mecanismo principal de reconhecimento para piloto com usuarios reais.

## Proximo passo

Implementar uma etapa de **avaliacao guiada** antes do modo de comunicacao:

1. escolher palavra;
2. gravar varias amostras em sessoes diferentes;
3. pedir confirmacao humana do que foi entendido;
4. montar matriz de confusao;
5. liberar comunicacao apenas para palavras com desempenho confirmado.
