import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null);

  // Streaming için yeni state'ler
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingComplete, setStreamingComplete] = useState(false);

  const sessionRef = useRef(null);
  const scrollViewRef = useRef(null);
  const streamingMessageId = useRef(null);

  // Model dosyalarının yolları
  const MODEL_PATHS = {
    android: {
      model: `${RNFS.DocumentDirectoryPath}/model.onnx`,
      vocab: `${RNFS.DocumentDirectoryPath}/vocab.json`,
      config: `${RNFS.DocumentDirectoryPath}/config.json`,
    },
    ios: {
      model: `${RNFS.DocumentDirectoryPath}/model.onnx`,
      vocab: `${RNFS.DocumentDirectoryPath}/vocab.json`,
      config: `${RNFS.DocumentDirectoryPath}/config.json`,
    },
  };

  const getModelPath = () => {
    return Platform.OS === 'android' ? MODEL_PATHS.android : MODEL_PATHS.ios;
  };

  // Model dosyasını assets'ten kopyala
  const copyModelFromAssets = async () => {
    try {
      const paths = getModelPath();
      const modelExists = await RNFS.exists(paths.model);
      if (!modelExists) {
        console.log('Model dosyası bulunamadı, mock model oluşturuluyor...');
        console.warn('UYARI: Gerçek model bulunamadı, test modu aktif');
        setModelLoaded(false);
        setModelLoadError(
          'Model dosyası bulunamadı. Lütfen model.onnx dosyasını android/app/src/main/assets/ klasörüne koyun.',
        );
        return false;
      } else {
        console.log('Model dosyası zaten mevcut');
      }
      return true;
    } catch (error) {
      console.error('Model kopyalama hatası:', error);
      throw new Error(`Model kopyalanamadı: ${error.message}`);
    }
  };

  // ONNX modelini yükle
  const loadModel = async () => {
    try {
      setIsLoading(true);
      setModelLoadError(null);
      console.log('Model yükleme başlıyor...');

      await copyModelFromAssets();
      const paths = getModelPath();

      const modelExists = await RNFS.exists(paths.model);
      if (!modelExists) {
        throw new Error(`Model dosyası bulunamadı: ${paths.model}`);
      }

      const modelStat = await RNFS.stat(paths.model);
      console.log('Model dosya boyutu:', modelStat.size);

      if (modelStat.size === 0) {
        throw new Error('Model dosyası boş!');
      }

      console.log('ONNX oturumu oluşturuluyor...');

      try {
        let session;

        try {
          console.log('Model dosya yolu ile yükleniyor...');
          session = await ort.InferenceSession.create(paths.model, {
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'disabled',
            enableCpuMemArena: false,
            enableMemPattern: false,
            executionMode: 'sequential',
            logSeverityLevel: 0,
            interOpNumThreads: 1,
            intraOpNumThreads: 1,
            sessionOptions: {
              enableProfiling: false,
              enableGraphCapture: false,
            },
          });
        } catch (pathError) {
          console.log(
            'Dosya yolu ile yükleme başarısız, alternatif yöntem deneniyor...',
          );

          const CHUNK_SIZE = 10 * 1024 * 1024;
          const modelStat = await RNFS.stat(paths.model);
          const fileSize = modelStat.size;

          console.log(
            `Model ${Math.ceil(fileSize / CHUNK_SIZE)} chunk'ta okunacak...`,
          );

          let modelData = '';
          for (let offset = 0; offset < fileSize; offset += CHUNK_SIZE) {
            const length = Math.min(CHUNK_SIZE, fileSize - offset);
            const chunk = await RNFS.read(
              paths.model,
              length,
              offset,
              'base64',
            );
            modelData += chunk;
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          const binaryString = atob(modelData);
          const modelBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            modelBuffer[i] = binaryString.charCodeAt(i);
          }

          modelData = null;
          binaryString = null;

          session = await ort.InferenceSession.create(modelBuffer, {
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'disabled',
            enableCpuMemArena: false,
            enableMemPattern: false,
            executionMode: 'sequential',
            logSeverityLevel: 0,
            interOpNumThreads: 1,
            intraOpNumThreads: 1,
          });
        }

        sessionRef.current = session;

        console.log('Model başarıyla yüklendi!');
        console.log('Input names:', sessionRef.current.inputNames);
        console.log('Output names:', sessionRef.current.outputNames);

        setModelLoaded(true);
      } catch (ortError) {
        console.error('ONNX Runtime hatası:', ortError);
        throw new Error(`ONNX Runtime hatası: ${ortError.message}`);
      }
    } catch (error) {
      console.error('Model yükleme hatası:', error);
      setModelLoadError(error.message);
      Alert.alert('Model Yükleme Hatası', error.message, [
        { text: 'Tekrar Dene', onPress: loadModel },
        { text: 'İptal', style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // GPT-2 Tokenizer
  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);

  // Vocab dosyasını yükle
  const loadVocab = async () => {
    try {
      const paths = getModelPath();
      const vocabExists = await RNFS.exists(paths.vocab);
      if (!vocabExists) {
        console.log('Vocab dosyası bulunamadı, kopyalanıyor...');
        if (Platform.OS === 'android') {
          try {
            const vocabContent = await RNFS.readFileAssets(
              'vocab.json',
              'utf8',
            );
            await RNFS.writeFile(paths.vocab, vocabContent, 'utf8');
            console.log('Vocab dosyası kopyalandı');
          } catch (readError) {
            console.log(
              'readFileAssets başarısız, copyFileAssets deneniyor...',
            );
            try {
              await RNFS.copyFileAssets('vocab.json', paths.vocab);
              console.log('Vocab dosyası copyFileAssets ile kopyalandı');
            } catch (copyError) {
              console.error('Vocab kopyalama hatası:', copyError);
              console.log('Default vocab oluşturuluyor...');
              const defaultVocab = {
                '<|endoftext|>': 0,
                the: 1,
                a: 2,
                is: 3,
                to: 4,
                of: 5,
                and: 6,
                in: 7,
                that: 8,
                it: 9,
                '<unk>': 10,
              };
              await RNFS.writeFile(
                paths.vocab,
                JSON.stringify(defaultVocab),
                'utf8',
              );
              console.log('Default vocab oluşturuldu');
            }
          }
        } else {
          const bundlePath = `${RNFS.MainBundlePath}/vocab.json`;
          await RNFS.copyFile(bundlePath, paths.vocab);
        }
      }

      const vocabContent = await RNFS.readFile(paths.vocab, 'utf8');
      const vocabData = JSON.parse(vocabContent);

      const reverse = {};
      for (const [token, id] of Object.entries(vocabData)) {
        reverse[id] = token;
      }

      setVocab(vocabData);
      setReverseVocab(reverse);
      console.log(
        'Vocab yüklendi, kelime sayısı:',
        Object.keys(vocabData).length,
      );
    } catch (error) {
      console.error('Vocab yükleme hatası:', error);

      const fallbackVocab = {};
      for (let i = 0; i < 50000; i++) {
        fallbackVocab[i] = `token_${i}`;
      }
      setReverseVocab(fallbackVocab);
      console.log('Fallback vocab oluşturuldu');
    }
  };

  useEffect(() => {
    loadModel().then(() => {
      loadVocab();
    });

    return () => {
      if (sessionRef.current) {
        sessionRef.current.release?.();
      }
    };
  }, []);

  // GPT-2 style tokenizer
  const tokenize = async text => {
    try {
      if (!vocab) {
        console.warn('Vocab henüz yüklenmedi');
        return [50256];
      }

      let processedText = text.trim();
      if (!processedText) {
        return [50256];
      }

      const tokens = [];
      const words = processedText.split(' ');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;

        const prefix = i === 0 ? '' : 'Ġ';

        let remainingWord = word;
        let wordTokenized = false;

        if (vocab[prefix + remainingWord] !== undefined) {
          tokens.push(vocab[prefix + remainingWord]);
          wordTokenized = true;
        } else if (vocab[prefix + remainingWord.toLowerCase()] !== undefined) {
          tokens.push(vocab[prefix + remainingWord.toLowerCase()]);
          wordTokenized = true;
        }

        if (!wordTokenized && remainingWord) {
          if (prefix && i > 0) {
            if (vocab['Ġ'] !== undefined) {
              tokens.push(vocab['Ġ']);
            }
          }

          let pos = 0;
          while (pos < remainingWord.length) {
            let found = false;

            for (
              let len = Math.min(15, remainingWord.length - pos);
              len > 0;
              len--
            ) {
              const substr = remainingWord.substr(pos, len);

              const variations = [
                substr,
                substr.toLowerCase(),
                'Ġ' + substr,
                'Ġ' + substr.toLowerCase(),
              ];

              for (const variant of variations) {
                if (vocab[variant] !== undefined) {
                  tokens.push(vocab[variant]);
                  pos += len;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }

            if (!found) {
              const char = remainingWord[pos];
              const charVariants = [char, char.toLowerCase(), 'Ġ' + char];

              let charFound = false;
              for (const variant of charVariants) {
                if (vocab[variant] !== undefined) {
                  tokens.push(vocab[variant]);
                  charFound = true;
                  break;
                }
              }

              if (!charFound) {
                if (vocab['the'] !== undefined) {
                  tokens.push(vocab['the']);
                }
              }
              pos++;
            }
          }
        }
      }

      if (vocab['<|endoftext|>'] !== undefined) {
        tokens.unshift(vocab['<|endoftext|>']);
      }

      console.log('Input text:', processedText);
      console.log(
        'Tokens:',
        tokens.slice(0, 20).map(id => `${id}:${reverseVocab?.[id]}`),
      );
      console.log('Total tokens:', tokens.length);

      return tokens;
    } catch (error) {
      console.error('Tokenize hatası:', error);
      return [50256];
    }
  };

  // Streaming token decoder
  const decodeAndAppendToken = tokenId => {
    if (!reverseVocab) return '';

    let token = reverseVocab[tokenId] || `[${tokenId}]`;

    // GPT-2 special character handling
    token = token
      .replace(/Ġ/g, ' ')
      .replace(/Ċ/g, '\n')
      .replace(/ĉ/g, '\t')
      .replace(/Ģ/g, '')
      .replace(/â/g, '')
      .replace(/Ī/g, '')
      .replace(/ľ/g, '"')
      .replace(/Ŀ/g, '"')
      .replace(/ŉ/g, "'")
      .replace(/<\|endoftext\|>/g, '');

    return token;
  };

  // Streaming text generation
  const generateStreamingResponse = async prompt => {
    if (!sessionRef.current) {
      console.log('Model yüklü değil, mock response döndürülüyor');

      // Mock streaming for testing
      const mockResponse = 'Model henüz yüklenmedi. Bu bir test mesajıdır.';
      const words = mockResponse.split(' ');

      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const currentText = words.slice(0, i + 1).join(' ');
        setCurrentStreamingMessage(currentText);
      }

      setStreamingComplete(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsStreaming(false);
      return mockResponse;
    }

    try {
      console.log('Generating streaming response for:', prompt);

      let processedPrompt = prompt || 'The weather today is';

      const promptEnhancements = {
        Hi: 'Hello! How are you doing today? I am',
        Hello: 'Hello there! Nice to meet you. My name is',
        Test: 'This is a test message. The model should',
        How: 'How to make a simple sandwich? First,',
        What: 'What is the meaning of life? The answer is',
      };

      if (processedPrompt.length < 5) {
        for (const [key, value] of Object.entries(promptEnhancements)) {
          if (processedPrompt.toLowerCase().startsWith(key.toLowerCase())) {
            processedPrompt = value;
            break;
          }
        }
      }

      console.log('Using prompt:', processedPrompt);

      const testTokens = await tokenize(processedPrompt);
      let currentInputIds = testTokens.slice(0, 100);

      console.log('Initial input tokens:', currentInputIds);

      // Generation parameters
      const maxNewTokens = 30;
      const temperature = 0.7;
      const topK = 50;
      const topP = 0.9;
      const repetitionPenalty = 1.3;
      const eosTokenId = vocab?.['<|endoftext|>'] || 50256;

      let generatedTokens = [];
      let pastKeyValues = null;
      let pastLength = 0;
      let recentTokens = [...currentInputIds];

      // Initialize streaming
      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      for (let step = 0; step < maxNewTokens; step++) {
        console.log(`Generation step ${step + 1}/${maxNewTokens}`);

        const inputForStep =
          step === 0
            ? currentInputIds
            : [currentInputIds[currentInputIds.length - 1]];

        const inputTensor = new ort.Tensor(
          'int64',
          new BigInt64Array(inputForStep.map(id => BigInt(id))),
          [1, inputForStep.length],
        );

        const totalLength = pastLength + inputForStep.length;
        const attentionMask = new ort.Tensor(
          'int64',
          new BigInt64Array(new Array(totalLength).fill(1).map(v => BigInt(v))),
          [1, totalLength],
        );

        const positionIds = new ort.Tensor(
          'int64',
          new BigInt64Array(
            Array.from({ length: inputForStep.length }, (_, i) =>
              BigInt(pastLength + i),
            ),
          ),
          [1, inputForStep.length],
        );

        const feeds = {
          input_ids: inputTensor,
          attention_mask: attentionMask,
          position_ids: positionIds,
        };

        if (pastKeyValues && step > 0) {
          for (let i = 0; i < 6; i++) {
            feeds[`past_key_values.${i}.key`] = pastKeyValues[`key_${i}`];
            feeds[`past_key_values.${i}.value`] = pastKeyValues[`value_${i}`];
          }
        } else {
          for (let i = 0; i < 6; i++) {
            const emptyPastKey = new ort.Tensor(
              'float32',
              new Float32Array(1 * 12 * 0 * 64),
              [1, 12, 0, 64],
            );
            const emptyPastValue = new ort.Tensor(
              'float32',
              new Float32Array(1 * 12 * 0 * 64),
              [1, 12, 0, 64],
            );
            feeds[`past_key_values.${i}.key`] = emptyPastKey;
            feeds[`past_key_values.${i}.value`] = emptyPastValue;
          }
        }

        const results = await sessionRef.current.run(feeds);

        const logits = results.logits;
        if (!logits || !logits.data) {
          throw new Error('Model did not return valid logits');
        }

        const vocabSize = logits.dims[2];
        const logitsData = logits.data;

        const startIdx = logitsData.length - vocabSize;
        const lastTokenLogits = new Float32Array(vocabSize);
        for (let i = 0; i < vocabSize; i++) {
          lastTokenLogits[i] = logitsData[startIdx + i];
        }

        // Enhanced repetition penalty
        const recentTokenCount = {};
        const recentWindow = recentTokens.slice(-20);

        for (const token of recentWindow) {
          recentTokenCount[token] = (recentTokenCount[token] || 0) + 1;
        }

        for (const [tokenId, count] of Object.entries(recentTokenCount)) {
          if (count > 1) {
            const penalty = Math.pow(repetitionPenalty, count);
            const id = parseInt(tokenId);
            if (lastTokenLogits[id] > 0) {
              lastTokenLogits[id] /= penalty;
            } else {
              lastTokenLogits[id] *= penalty;
            }
          }
        }

        // Special handling for problematic tokens
        const problematicTokens = [257];
        for (const tokenId of problematicTokens) {
          const countInRecent = recentWindow.filter(t => t === tokenId).length;
          if (countInRecent >= 2) {
            lastTokenLogits[tokenId] = lastTokenLogits[tokenId] - 10.0;
          }
        }

        // Temperature scaling
        const scaledLogits = lastTokenLogits.map(l => l / temperature);

        // Normalize logits
        const maxLogit = Math.max(...scaledLogits);
        const normalizedLogits = scaledLogits.map(l => l - maxLogit);

        // Compute probabilities
        const expLogits = normalizedLogits.map(l => Math.exp(Math.min(l, 20)));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);

        if (!sumExp || isNaN(sumExp) || sumExp === 0) {
          console.warn('Invalid probability sum, using greedy selection');
          const maxIdx = scaledLogits.indexOf(Math.max(...scaledLogits));
          recentTokens.push(maxIdx);
          generatedTokens.push(maxIdx);
        } else {
          const probs = expLogits.map(e => e / sumExp);

          const probsWithIndex = [];
          for (let i = 0; i < probs.length; i++) {
            if (!isNaN(probs[i]) && probs[i] > 0) {
              probsWithIndex.push({ prob: probs[i], index: i });
            }
          }

          probsWithIndex.sort((a, b) => b.prob - a.prob);

          let filteredProbs = probsWithIndex.slice(0, topK);

          let cumSum = 0;
          let cutoffIndex = filteredProbs.length;
          for (let i = 0; i < filteredProbs.length; i++) {
            cumSum += filteredProbs[i].prob;
            if (cumSum > topP) {
              cutoffIndex = i + 1;
              break;
            }
          }
          filteredProbs = filteredProbs.slice(0, cutoffIndex);

          const filteredSum = filteredProbs.reduce(
            (sum, item) => sum + item.prob,
            0,
          );
          filteredProbs = filteredProbs.map(item => ({
            ...item,
            prob: item.prob / filteredSum,
          }));

          const random = Math.random();
          let cumProb = 0;
          let nextTokenId = filteredProbs[0].index;

          for (const item of filteredProbs) {
            cumProb += item.prob;
            if (random < cumProb) {
              nextTokenId = item.index;
              break;
            }
          }

          console.log(
            `Generated token: ${nextTokenId} (${
              reverseVocab?.[nextTokenId] || 'unknown'
            })`,
          );

          recentTokens.push(nextTokenId);
          generatedTokens.push(nextTokenId);

          if (recentTokens.length > 50) {
            recentTokens = recentTokens.slice(-40);
          }
        }

        // Streaming update - decode ALL tokens from beginning each time
        const allDecodedTokens = generatedTokens.map(id => {
          let token = reverseVocab[id] || `[${id}]`;
          return token
            .replace(/Ġ/g, ' ')
            .replace(/Ċ/g, '\n')
            .replace(/ĉ/g, '\t')
            .replace(/Ģ/g, '')
            .replace(/â/g, '')
            .replace(/Ī/g, '')
            .replace(/ľ/g, '"')
            .replace(/Ŀ/g, '"')
            .replace(/ŉ/g, "'")
            .replace(/<\|endoftext\|>/g, '');
        });

        const fullText = allDecodedTokens.join('').trim().replace(/\s+/g, ' ');
        setCurrentStreamingMessage(fullText);

        console.log(`Streaming update - Step ${step + 1}: "${fullText}"`);

        // Update for next iteration
        if (step === 0) {
          pastLength = currentInputIds.length;
          currentInputIds.push(generatedTokens[generatedTokens.length - 1]);
        } else {
          pastLength += 1;
          currentInputIds = [generatedTokens[generatedTokens.length - 1]];
        }

        // Update past key values
        pastKeyValues = {};
        for (let i = 0; i < 6; i++) {
          pastKeyValues[`key_${i}`] = results[`present.${i}.key`];
          pastKeyValues[`value_${i}`] = results[`present.${i}.value`];
        }

        // Early stopping for repetitive patterns
        if (generatedTokens.length >= 5) {
          const lastFive = generatedTokens.slice(-5);
          const isRepeating = lastFive.every(token => token === lastFive[0]);
          if (isRepeating) {
            console.log('Detected repetitive pattern, stopping generation');
            break;
          }
        }

        // Stop if EOS token is generated
        if (generatedTokens[generatedTokens.length - 1] === eosTokenId) {
          console.log('EOS token generated, stopping');
          break;
        }

        if (generatedTokens.length >= maxNewTokens) {
          console.log('Max tokens reached');
          break;
        }

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final cleanup and completion
      setStreamingComplete(true);

      // Get the current streaming message for final processing
      let finalResponse = '';

      // Re-decode all tokens one more time for final response
      if (reverseVocab && generatedTokens.length > 0) {
        const finalDecodedTokens = generatedTokens.map(id => {
          let token = reverseVocab[id] || `[${id}]`;
          return token
            .replace(/Ġ/g, ' ')
            .replace(/Ċ/g, '\n')
            .replace(/ĉ/g, '\t')
            .replace(/Ģ/g, '')
            .replace(/â/g, '')
            .replace(/Ī/g, '')
            .replace(/ľ/g, '"')
            .replace(/Ŀ/g, '"')
            .replace(/ŉ/g, "'")
            .replace(/<\|endoftext\|>/g, '');
        });

        finalResponse = finalDecodedTokens.join('').trim().replace(/\s+/g, ' ');

        // Apply final post-processing
        finalResponse = finalResponse
          .replace(/(\b\w+\b)(\s+\1\b){3,}/g, '$1')
          .replace(/(.)\1{5,}/g, '$1');
      }

      // Update streaming message with final version
      if (finalResponse && finalResponse.length > 0) {
        setCurrentStreamingMessage(finalResponse);
        console.log('Final streaming response:', finalResponse);
      } else {
        finalResponse = 'Model kısa yanıt üretti.';
        setCurrentStreamingMessage(finalResponse);
        console.log('Empty response, using fallback');
      }

      // Wait a moment before stopping streaming indicator
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsStreaming(false);

      return finalResponse;
    } catch (error) {
      console.error('Generation error:', error);
      setStreamingComplete(true);
      setIsStreaming(false);
      return 'Üzgünüm, yanıt oluştururken bir hata oluştu: ' + error.message;
    }
  };

  // Mesaj gönder
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Uyarı', 'Model henüz yüklenmedi. Lütfen bekleyin.');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');

    // Create temporary streaming message
    streamingMessageId.current = (Date.now() + 1).toString();

    try {
      const response = await generateStreamingResponse(currentInput);

      // Replace streaming message with final message
      const aiMessage = {
        id: streamingMessageId.current,
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentStreamingMessage('');
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      Alert.alert('Hata', 'Yanıt oluşturulurken bir hata oluştu.');
      setIsStreaming(false);
      setCurrentStreamingMessage('');
    }
  };

  // Mesaj komponenti
  const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  // Streaming mesaj komponenti
  const StreamingMessage = () => {
    if (!isStreaming) return null;

    return (
      <View
        style={[styles.messageBubble, styles.aiBubble, styles.streamingBubble]}
      >
        <Text style={styles.messageText}>
          {currentStreamingMessage}
          {!streamingComplete && <Text style={styles.cursor}>▊</Text>}
        </Text>
        {streamingComplete && (
          <View style={styles.streamingComplete}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.completingText}>Tamamlanıyor...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DistilGPT2 Chat</Text>
        <View style={styles.statusContainer}>
          {modelLoaded ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, styles.statusDotActive]} />
              <Text style={styles.statusText}>Model Hazır</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.statusIndicator}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.statusText}>Model Yükleniyor...</Text>
            </View>
          ) : modelLoadError ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, styles.statusDotError]} />
              <Text style={styles.statusText}>Hata</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Model yükleme hatası */}
      {modelLoadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Hata: {modelLoadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadModel}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mesajlar */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.length === 0 && modelLoaded && !isStreaming && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Merhaba! Size nasıl yardımcı olabilirim?
            </Text>
          </View>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming mesajı göster */}
        <StreamingMessage />
      </ScrollView>

      {/* Input alanı */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor="#999"
          multiline
          maxHeight={100}
          editable={modelLoaded && !isLoading && !isStreaming}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || !modelLoaded || isLoading || isStreaming) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={
            !inputText.trim() || !modelLoaded || isLoading || isStreaming
          }
        >
          <Text style={styles.sendButtonText}>
            {isStreaming ? 'Üretiyor...' : 'Gönder'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusDotError: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 12,
    borderRadius: 15,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  streamingBubble: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  userText: {
    color: 'white',
  },
  cursor: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  streamingComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Chat;
