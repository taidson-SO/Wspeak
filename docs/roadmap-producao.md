# Roadmap para producao do WSpeak

Este documento consolida o estado atual do WSpeak e organiza o caminho ate uma versao publicavel. A referencia tecnica do projeto neste ciclo e Expo SDK 56, conforme a documentacao versionada em https://docs.expo.dev/versions/v56.0.0/.

O requisito de produto central e apoiar pessoas com fala ininteligivel para desconhecidos. O app deve aprender o padrao fonologico individual do usuario, oferecer treinamento e exercicio em portugues brasileiro, e atuar como tradutor em comunicacao com terceiros. O detalhamento esta em `docs/requisitos-produto.md`.

Nota: apos os testes de reconhecimento, o novo caminho de produto foi separado em `docs/roadmap-novo-escopo.md`. Este documento permanece como historico do ciclo de producao original.

## Consolidado do que ja foi realizado

### Produto

- MVP mobile estruturado em Expo/React Native.
- Tela inicial com acesso aos fluxos principais.
- Fluxo de treinamento de palavras com selecao de palavra, gravacao de amostras e conclusao quando ha pelo menos 3 amostras prontas para comparacao.
- Fluxo de comunicacao com gravacao de fala e exibicao do resultado de reconhecimento.
- Sintese de voz local com `expo-speech` quando uma palavra e reconhecida por comparacao real.
- Persistencia local de palavras treinadas, amostras e datas com AsyncStorage.
- Remocao local de arquivos de amostra ao apagar um registro.
- Escopo de produto atualizado para tres modos: treinamento, exercicio e comunicacao.
- Modo de exercicio criado para praticar palavras treinadas com feedback simples e apoio por voz sintetica.
- Modo de comunicacao refinado com resultado grande para terceiros, repeticao de voz e mensagens menos tecnicas.
- Fluxo inicial simplificado com proximo passo destacado e atalhos para treinar primeiro quando exercicio ou comunicacao ainda nao estao liberados.
- Revisao inicial de acessibilidade e linguagem aplicada: textos visiveis simplificados, estados sem jargoes tecnicos, botoes com rotulos acessiveis e selecoes comunicadas por texto e estado de acessibilidade.
- Tela de dados e privacidade criada para explicar armazenamento local e apagar treino, palavras personalizadas e arquivos de audio associados.
- Configuracao inicial de build interna Android adicionada com package identifier, splash, permissao de microfone e perfil EAS `preview`.

### Reconhecimento local

- Camada de analise local criada em `src/features/communication/services/audioAnalysis/`.
- Extracao de features preparada para buffers PCM reais.
- Comparacao local por similaridade entre features da fala atual e features das amostras treinadas.
- Resultado `unsupported_audio` preservado como estado honesto quando o audio gravado nao entrega sinal analisavel.
- Amostras antigas sem `features` continuam compativeis, mas nao entram na comparacao real.

### Experimento PCM

- Experimento isolado de captura PCM em tempo real via `expo-audio` criado para Android.
- Treinamento tenta capturar PCM em paralelo com a gravacao atual.
- Comunicacao tenta capturar PCM em tempo real e volta para a gravacao atual quando a captura nao esta disponivel.
- O fluxo ja diferencia amostras com analise real de amostras salvas sem analise real.
- A validacao em dispositivo Android real confirmou buffers PCM validos e comparacao real ponta a ponta.

### Arquitetura atual

- Codigo organizado por features: `home`, `training`, `communication` e `words`.
- Componentes compartilhados basicos em `src/shared/components`.
- Servicos compartilhados para gravacao e armazenamento local.
- Reconhecimento sem backend e sem chave de API.
- Documentacao tecnica inicial em `docs/reconhecimento-local.md`.
- Teste manual de cleanup de gravacao e captura documentado em `docs/testes-manuais.md`.
- Limite de 5 amostras por palavra aplicado no fluxo de treinamento e no servico de persistencia.
- Vocabulario personalizado persistido localmente para palavras definidas pelo usuario.
- Limiar inicial de confianca aplicado para impedir voz automatica em resultados incertos.
- Validacao PCM em Android preparada com logs controlados de `AudioStream`.
- Algoritmo local evoluido com normalizacao de volume, descarte de silencio, envelopes temporais e pontuacao por melhor amostra, media e consistencia.
- Treinamento em Android ajustado para priorizar captura analisavel e evitar abrir gravacao comum em paralelo com captura PCM.
- Revisao de abordagem documentada: o reconhecedor por features simples foi reclassificado como baseline tecnico insuficiente para piloto.

## Pendencias antes de qualquer build de producao

Estas pendencias devem ser tratadas antes de uma distribuicao publica, porque afetam confiabilidade, privacidade percebida e repeticao dos fluxos principais.

1. Encerrar gravacao/captura ao sair da tela de treinamento.
   - Risco atual: tocar em `Voltar` durante a gravacao pode deixar o gravador ou a captura PCM ativos.
   - Impacto: tentativas futuras de gravacao podem falhar e o microfone pode permanecer ocupado ate reiniciar o app.

2. Encerrar gravacao/captura ao sair da tela de comunicacao.
   - Risco atual: o cleanup principal acontece no `handleStop`, mas a navegacao de volta pode desmontar a tela sem finalizar a sessao.
   - Impacto: mesmo risco de captura ativa e bloqueio de novas gravacoes.

3. Bloquear gravacao quando a palavra ja atingiu 5 amostras.
   - Risco atual: a interface mostra o limite, mas o caminho de gravacao ainda pode adicionar novas amostras.
   - Impacto: o produto descumpre a regra anunciada de 3 a 5 amostras por palavra.

4. Ampliar validacao do experimento PCM em Android real.
   - Estado atual: permissao, inicio, eventos de buffer, taxa de amostragem, parada e features reais foram confirmados em um dispositivo.
   - Pendente: testar mais dispositivos, duracoes longas, memoria e palavras diferentes para estimar falso positivo.

5. Definir comportamento de plataformas sem PCM.
   - Android pode seguir com o experimento se validado.
   - iOS e web precisam de fallback declarado, WAV/PCM alternativo ou mensagem de indisponibilidade clara.

6. Refinar gestao de palavras definidas pelo usuario.
   - Estado atual: o vocabulario combina sugestoes iniciais e palavras personalizadas persistidas localmente.
   - Risco atual: a remocao de palavra personalizada com amostras preserva os dados treinados para evitar perda acidental, mas ainda precisa de uma decisao de produto para limpeza ou restauracao desses dados.
   - Impacto: o app ja atende ao cadastro local de palavras, mas ainda precisa amadurecer a gestao completa do ciclo de vida dos dados.

7. Validar e refinar o modo de exercicio.
   - Estado atual: existe fluxo separado para pratica com palavra esperada, palavra identificada, confianca, feedback simples e apoio por voz sintetica.
   - Risco atual: o feedback e o limiar ainda nao foram validados com usuarios reais.
   - Impacto: o app cobre o fluxo basico, mas ainda precisa confirmar se a experiencia e adequada para uso terapeutico/educacional.

8. Revisar acessibilidade em dispositivo real.
   - Estado atual: textos principais foram simplificados e os controles principais receberam rotulos/estados acessiveis.
   - Pendente: testar com leitor de tela, fonte ampliada do sistema, modo alto contraste e telas pequenas antes de producao.
   - Impacto: a interface esta mais clara, mas ainda precisa de validacao com tecnologias assistivas reais.

9. Redesenhar metodologia de reconhecimento.
   - Estado atual: captura PCM e comparador local funcionam como infraestrutura, mas nao reconhecem fala com qualidade suficiente.
   - Pendente: implementar coleta fonoaudiologica estruturada, anotacao humana, matriz de confusao e criterio de liberacao por palavra.
   - Impacto: o app nao deve seguir para piloto como tradutor automatico ate essa etapa ser resolvida.

## Roadmap

### Fase 0 - Estabilizacao do MVP local

Objetivo: garantir que os fluxos existentes nao vazem recursos e respeitem as regras do produto.

- Adicionar cleanup de gravacao e PCM no unmount das telas de treinamento e comunicacao.
- Fazer o botao `Voltar` parar a sessao ativa antes de navegar.
- Centralizar uma funcao idempotente de parada para gravacao normal e PCM.
- Impedir `handleRecord` quando `samples.length >= 5`.
- Desabilitar o controle de gravacao no componente visual quando o limite for atingido.
- Adicionar teste manual documentado para sair da tela durante gravacao.
- Rodar verificacao TypeScript/build depois dos ajustes.

Marco de saida:

- Nenhuma navegacao deixa microfone ocupado.
- Uma palavra nunca passa de 5 amostras pelo fluxo normal.
- O app continua funcional depois de gravar, voltar e entrar novamente em treinamento/comunicacao.

### Fase 1 - Validacao tecnica do reconhecimento real

Objetivo: provar que existe comparacao real ponta a ponta, pelo menos em Android.

Estado em 2026-06-27: a infraestrutura PCM Android foi revalidada em dispositivo fisico `moto_g35_5G`. `audioStreamBuffer` entregou `ArrayBuffer` alinhado para `Float32Array`, com `sampleRate` 48000, 1 canal, amostras finitas e `outOfRangeSampleCount` 0. A qualidade do reconhecimento por features simples foi considerada insuficiente para piloto; o novo caminho esta em `docs/roadmap-novo-escopo.md`.

- Testar `AudioStream` em Android fisico com Expo SDK 56.
- Medir se `audioStreamBuffer` entrega dados no formato esperado pelo conversor atual.
- Confirmar se `Float32Array(buffer.data)` representa corretamente as amostras capturadas.
- Ajustar normalizacao de amplitude, duracao minima e descarte de silencio.
- Registrar logs temporarios de duracao, sample rate, canais, quantidade de samples e status da analise.
- Treinar 3 a 5 amostras da mesma palavra e validar comunicacao com `mode: real_comparison`.
- Testar palavras diferentes para estimar falsos positivos.

Marco de saida:

- Pelo menos um dispositivo Android reconhece palavras treinadas localmente usando features reais.
- O app ainda retorna `unsupported_audio` quando o sinal analisavel nao esta disponivel.

### Fase 2 - Qualidade do algoritmo local

Objetivo: substituir a comparacao inicial por uma metodologia validavel de reconhecimento personalizado.

- Implementar avaliacao guiada com mais amostras por palavra.
- Separar amostras de treino, validacao e teste.
- Registrar o que uma pessoa familiar ou desconhecida entendeu.
- Criar matriz de confusao por palavra.
- Exigir confirmacao humana antes de liberar voz automatica.
- Avaliar embeddings acusticos, modelo fonetico, ASR adaptado ou backend consentido.
- Manter features simples apenas como baseline tecnico.

Marco de saida:

- O app mede confusoes reais por palavra.
- O reconhecimento so fala automaticamente palavras com desempenho confirmado.
- Existe decisao tecnica sobre modelo local, hibrido ou backend consentido.

### Fase 2.5 - Refinamento do modo de exercicio

Objetivo: refinar o fluxo de pratica em portugues brasileiro para comparar a fala do usuario com as palavras comuns identificadas.

Estado em 2026-06-27: o modo `Exercitar` esta separado da comunicacao, reutiliza palavras com 3 amostras prontas, mostra palavra esperada, identificada, confianca e feedback simples. A voz do resultado so fica disponivel quando o reconhecimento tem confianca suficiente. As tentativas agora sao registradas localmente como resumo de evolucao por palavra e apagadas em `Dados e privacidade`.

- Validar a tela de exercicio separada do modo comunicacao.
- Reaproveitar palavras treinadas e features reais quando disponiveis.
- Mostrar palavra esperada, palavra identificada, confianca e feedback simples.
- Reproduzir a palavra comum com `expo-speech` como apoio auditivo.
- Tratar resultado incerto sem feedback punitivo.
- Registrar tentativas locais para acompanhar evolucao, se isso continuar alinhado a privacidade do produto.

Marco de saida:

- Usuario consegue praticar uma palavra treinada e receber feedback acessivel.
- O modo de exercicio nao fala nem valida uma palavra quando a confianca estiver baixa.

### Fase 3 - UX de acessibilidade e confiabilidade

Objetivo: deixar o app previsivel para uso real por pessoas com dificuldade de fala.

Estado em 2026-06-27: os fluxos de treinamento, avaliacao, exercicio e comunicacao passaram a bloquear toques repetidos durante preparo, gravacao, salvamento e reconhecimento. Os componentes de gravacao mostram estado textual consistente com area visual propria. Mensagens de microfone foram simplificadas para orientar permissao. Ainda falta teste real com leitor de tela, fonte ampliada do sistema, tela pequena e permissao negada em Android fisico.

- Revisar textos de erro e status para linguagem simples.
- Adicionar estados claros para: sem permissao, sem treino, treino insuficiente, audio nao analisavel e baixa confianca.
- Evitar que uma gravacao seja iniciada duas vezes por toques rapidos.
- Adicionar feedback visual consistente enquanto grava e enquanto reconhece.
- Revisar tamanho de toque, contraste, legibilidade e uso com uma mao.
- Testar leitor de tela, fonte ampliada do sistema e telas pequenas.
- Refinar o fluxo de limpeza de dados locais com testes em dispositivos reais e leitor de tela.
- Considerar exportacao/importacao local dos dados treinados para backup futuro.

Marco de saida:

- Usuario entende o que fazer quando o app nao reconhece.
- Fluxos principais resistem a toques repetidos, permissao negada e navegacao durante gravacao.

### Fase 4 - Preparacao de build e distribuicao

Objetivo: preparar uma build instalavel com configuracao correta.

- Revisar `app.json`: nome, slug, icon, splash, bundle/package identifiers e permissoes.
- Definir politica de privacidade explicando que audio e treino ficam locais no dispositivo.
- Configurar EAS Build se a distribuicao for por APK/AAB/TestFlight.
- Criar builds internas para Android primeiro.
- Testar em dispositivos fisicos de perfis diferentes.
- Definir versao, changelog e criterio de rollback.
- Preparar lista de verificacao de loja, caso a publicacao seja Play Store/App Store.

Marco de saida:

- Build interna instalavel.
- Politica de privacidade coerente com o comportamento local.
- Checklist de release repetivel.

Estado atual:

- `app.json` revisado para Android interno.
- `eas.json` criado com perfil `preview` para APK.
- Checklist de build interna documentado em `docs/build-interna.md`.
- Politica de privacidade para piloto interno documentada em `docs/politica-privacidade.md`.
- Checklist repetivel de release, changelog e rollback documentado em `docs/release-checklist.md`.
- Relatorio final de prontidao documentado em `docs/relatorio-final-producao.md`.
- Geracao remota da build e instalacao fisica ainda dependem de login no EAS e execucao em dispositivo real.

### Fase 5 - Piloto controlado

Objetivo: validar utilidade real antes de ampliar escopo.

- Nao iniciar piloto como tradutor automatico antes da revisao metodologica de reconhecimento.
- Selecionar um grupo pequeno de usuarios/testadores.
- Definir conjunto inicial de palavras prioritarias.
- Coletar feedback sem enviar audio sensivel para servidor.
- Medir manualmente: taxa de reconhecimento, casos incertos, falhas de permissao e abandono no treinamento.
- Ajustar algoritmo e UX com base no uso real.

Marco de saida:

- Evidencia pratica de que o treinamento personalizado funciona para o publico alvo.
- Lista priorizada de melhorias para uma versao publica.

## Criterios minimos para producao

- Gravacao sempre finaliza ao parar, sair da tela ou ocorrer erro recuperavel.
- O app nunca deixa duas capturas simultaneas ativas.
- O limite de 5 amostras por palavra e aplicado no estado e no servico.
- Comunicacao nao fala uma palavra quando a confianca estiver abaixo do limiar definido.
- Permissao de microfone negada tem tratamento compreensivel.
- Dados locais podem ser apagados pelo usuario.
- Build interna foi testada em dispositivo fisico.
- Politica de privacidade cobre audio, armazenamento local e ausencia de backend.

## Decisao tecnica aberta

O principal ponto de decisao mudou. A origem do sinal analisavel foi parcialmente validada no Android, mas a qualidade do reconhecimento nao foi suficiente. A decisao central agora e a metodologia de reconhecimento:

- manter features simples apenas como baseline;
- implementar coleta/anotacao fonoaudiologica estruturada;
- avaliar modelo local com embeddings;
- avaliar ASR/fonetica para portugues brasileiro;
- ou adotar backend opcional com consentimento e politica de privacidade propria.

Enquanto essa decisao nao estiver fechada, o app deve continuar sendo claro: existe infraestrutura de captura e comparacao, mas o reconhecimento automatico ainda nao esta pronto para uso como tradutor confiavel.
